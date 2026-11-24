import argparse
import random
import sys
import threading
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import date, datetime, timedelta

import requests
from sqlalchemy import func

from app import create_app, db
from app.models import (
    Guiche,
    LogAuditoria,
    Senha,
    StatusSenha,
    TipoSenha,
    Usuario,
)

HOST_URL = "http://127.0.0.1:5000"
BASE_URL = f"{HOST_URL}/api"


def _json_seguro(resp: requests.Response):
    try:
        return resp.json()
    except ValueError:
        return {"raw": resp.text}


def obter_token_login(email: str, senha: str) -> str:
    try:
        resp = requests.post(
            f"{BASE_URL}/auth/login",
            json={"email": email, "senha": senha},
            timeout=10,
        )
        if resp.status_code == 200:
            return resp.json()["access_token"]
        raise RuntimeError(f"Falha ao autenticar {email} ({resp.status_code}): {resp.text}")
    except requests.RequestException as e:
        print(f"[ERRO] Não foi possível conectar à API em {BASE_URL}: {e}", flush=True)
        print("Certifique-se de que o backend está rodando ('python run.py').", flush=True)
        sys.exit(1)


def executar_teste_concorrencia(total_senhas: int = 12, threads_por_operador: int = 3):
    print("\n[1/3] TESTE DE CONCORRÊNCIA HTTP (LOCK TRANSACIONAL)", flush=True)

    token_gestor = obter_token_login("gestor@nassautickets.com", "gestor123")
    token_atendente = obter_token_login("ana@nassautickets.com", "atendente123")

    headers_gestor = {"Authorization": f"Bearer {token_gestor}"}
    headers_atendente = {"Authorization": f"Bearer {token_atendente}"}

    resp_guiches = requests.get(
        f"{BASE_URL}/guiches",
        params={"ativo": "true"},
        headers=headers_gestor,
        timeout=10,
    )
    if resp_guiches.status_code != 200:
        print(f"[ERRO] Falha ao listar guichês ({resp_guiches.status_code}): {resp_guiches.text}", flush=True)
        sys.exit(1)

    guiches = resp_guiches.json()
    if len(guiches) < 2:
        print("[!] Menos de 2 guichês ativos encontrados. Cadastrando guichês auxiliares...", flush=True)
        for num in range(1, 4):
            requests.post(
                f"{BASE_URL}/guiches",
                json={"numero": num, "nome": f"Guichê {num:02d}"},
                headers=headers_gestor,
                timeout=10,
            )
        resp_guiches = requests.get(
            f"{BASE_URL}/guiches",
            params={"ativo": "true"},
            headers=headers_gestor,
            timeout=10,
        )
        guiches = resp_guiches.json()

    guiche_ids = [g["id"] for g in guiches[:3]]
    print(f"[*] Guichês ativos utilizados: {guiche_ids}", flush=True)

    print(f"[*] Emitindo {total_senhas} senhas para formar fila de teste...", flush=True)
    tipos = [TipoSenha.SP.value, TipoSenha.SE.value, TipoSenha.SG.value]
    codigos_emitidos = []
    for i in range(total_senhas):
        tipo = tipos[i % len(tipos)]
        r = requests.post(f"{BASE_URL}/senhas", json={"tipo": tipo}, timeout=10)
        if r.status_code == 201:
            codigos_emitidos.append(r.json()["codigo"])

    print(f"[+] {len(codigos_emitidos)} senhas emitidas.", flush=True)

    operadores = [
        ("Ana", headers_atendente, guiche_ids[0]),
        ("Gestor", headers_gestor, guiche_ids[1 % len(guiche_ids)]),
    ]
    tarefas = []
    for nome_op, headers_op, gid in operadores:
        for t in range(threads_por_operador):
            tarefas.append((f"{nome_op}-T{t + 1}", headers_op, gid))

    total_threads = len(tarefas)
    print(f"[*] Disparando {total_threads} chamadas simultâneas sincronizadas por barreira...", flush=True)
    barreira = threading.Barrier(total_threads)
    resultados = []

    def tarefa_chamar(rotulo: str, headers_op: dict, gid: int):
        barreira.wait()
        t_inicio = time.time()
        try:
            res = requests.post(
                f"{BASE_URL}/atendimento/chamar",
                json={"guiche_id": gid},
                headers=headers_op,
                timeout=15,
            )
            latencia = round((time.time() - t_inicio) * 1000, 2)
            return {
                "rotulo": rotulo,
                "headers": headers_op,
                "guiche_id": gid,
                "status": res.status_code,
                "body": _json_seguro(res),
                "latencia_ms": latencia,
            }
        except Exception as ex:
            return {"rotulo": rotulo, "erro": str(ex)}

    with ThreadPoolExecutor(max_workers=total_threads) as executor:
        futuros = [executor.submit(tarefa_chamar, r, h, g) for r, h, g in tarefas]
        for fut in as_completed(futuros):
            resultados.append(fut.result())

    chamadas_sucesso = []
    chamadas_bloqueadas = []

    for r in sorted(resultados, key=lambda x: x["rotulo"]):
        if "erro" in r:
            print(f"  [{r['rotulo']}] Erro: {r['erro']}", flush=True)
            continue

        status = r["status"]
        if status == 200:
            senha = r["body"]
            chamadas_sucesso.append((senha, r["headers"]))
            print(
                f"  [{r['rotulo']}] 200 OK -> {senha['codigo']} no Guichê {r['guiche_id']} ({r['latencia_ms']}ms)",
                flush=True,
            )
        elif status == 409:
            chamadas_bloqueadas.append(r["body"].get("erro"))
            print(
                f"  [{r['rotulo']}] 409 CONFLICT -> {r['body'].get('erro')} ({r['latencia_ms']}ms)",
                flush=True,
            )
        else:
            print(f"  [{r['rotulo']}] HTTP {status}: {r['body']}", flush=True)

    codigos_chamados = [s["codigo"] for s, _ in chamadas_sucesso]
    if len(set(codigos_chamados)) == len(codigos_chamados):
        print("[SUCESSO] Lock validado: nenhuma senha duplicada entre chamadas concorrentes.", flush=True)
    else:
        print(f"[FALHA] Duplicidade detectada: {codigos_chamados}", flush=True)

    print(
        f"[*] Aceitas: {len(chamadas_sucesso)} | Bloqueadas pela trava (409): {len(chamadas_bloqueadas)}",
        flush=True,
    )

    if chamadas_sucesso:
        print("[*] Encerrando senhas abertas pelo teste de concorrência para liberar os guichês...", flush=True)
        for senha, headers_op in chamadas_sucesso:
            sid = senha["id"]
            requests.post(f"{BASE_URL}/atendimento/senhas/{sid}/iniciar", headers=headers_op, timeout=10)
            requests.post(f"{BASE_URL}/atendimento/senhas/{sid}/finalizar", headers=headers_op, timeout=10)
        print("[+] Guichês liberados.", flush=True)


def popular_massa_relatorios(total_atendimentos: int = 60, taxa_abandono: float = 0.05):
    print("\n[2/3] POPULANDO BASE COM VARIAÇÃO DE TM E TAXA DE ABANDONO (5%)", flush=True)

    app = create_app()
    with app.app_context():
        atendentes = Usuario.query.filter_by(ativo=True).all()
        guiches = Guiche.query.filter_by(ativo=True).all()

        if not atendentes or not guiches:
            print("[ERRO] É necessário ter ao menos 1 usuário ativo e 1 guichê ativo. Rode o seed primeiro.", flush=True)
            return

        hoje = date.today()
        dias_retroativos = [hoje - timedelta(days=d) for d in range(5, -1, -1)]

        existentes = (
            db.session.query(
                Senha.data_referencia,
                Senha.tipo,
                func.max(Senha.sequencial),
            )
            .filter(Senha.data_referencia.in_(dias_retroativos))
            .group_by(Senha.data_referencia, Senha.tipo)
            .all()
        )
        sequenciais = {(d, t): (m or 0) for d, t, m in existentes}

        total_abandonos_alvo = max(1, round(total_atendimentos * taxa_abandono))
        indices_abandono = set(random.sample(range(1, total_atendimentos + 1), total_abandonos_alvo))

        abandonos_criados = 0
        total_criadas = 0

        print(
            f"[*] Gerando {total_atendimentos} atendimentos ({total_abandonos_alvo} abandonos = {round((total_abandonos_alvo / total_atendimentos) * 100, 1)}%)...",
            flush=True,
        )

        for idx in range(1, total_atendimentos + 1):
            dia = random.choice(dias_retroativos)
            tipo = random.choices(
                [TipoSenha.SP.value, TipoSenha.SE.value, TipoSenha.SG.value],
                weights=[0.35, 0.25, 0.40],
            )[0]

            chave_seq = (dia, tipo)
            sequenciais[chave_seq] = sequenciais.get(chave_seq, 0) + 1
            seq = sequenciais[chave_seq]

            hora_emissao = random.randint(7, 16)
            minuto_emissao = random.randint(0, 59)
            segundo_emissao = random.randint(0, 59)
            dt_emissao = datetime.combine(dia, datetime.min.time()).replace(
                hour=hora_emissao,
                minute=minuto_emissao,
                second=segundo_emissao,
            )

            codigo = f"{dia.strftime('%y%m%d')}-{tipo}{seq:03d}"
            atendente = random.choice(atendentes)
            guiche = random.choice(guiches)

            tempo_espera_segundos = random.randint(180, 1080)
            dt_chamada1 = dt_emissao + timedelta(seconds=tempo_espera_segundos)

            if idx in indices_abandono:
                dt_chamada2 = dt_chamada1 + timedelta(seconds=random.randint(45, 90))
                dt_fim = dt_chamada2 + timedelta(seconds=120)

                senha = Senha(
                    codigo=codigo,
                    tipo=tipo,
                    sequencial=seq,
                    data_referencia=dia,
                    status=StatusSenha.NAO_COMPARECEU.value,
                    descartada_fim_expediente=False,
                    emitida_em=dt_emissao,
                    primeira_chamada_em=dt_chamada1,
                    segunda_chamada_em=dt_chamada2,
                    inicio_atendimento_em=None,
                    fim_atendimento_em=dt_fim,
                    tempo_atendimento_segundos=None,
                    guiche_id=guiche.id,
                    atendente_id=atendente.id,
                )
                db.session.add(senha)
                db.session.flush()

                db.session.add_all(
                    [
                        LogAuditoria(
                            senha_id=senha.id,
                            status_anterior=None,
                            status_novo=StatusSenha.EMITIDA.value,
                            acao="EMISSAO",
                            detalhes=f"Senha {codigo} emitida no totem.",
                            criado_em=dt_emissao,
                        ),
                        LogAuditoria(
                            senha_id=senha.id,
                            status_anterior=StatusSenha.EMITIDA.value,
                            status_novo=StatusSenha.AGUARDANDO.value,
                            acao="ENTRADA_FILA",
                            detalhes=f"Senha {codigo} disponibilizada na fila.",
                            criado_em=dt_emissao,
                        ),
                        LogAuditoria(
                            senha_id=senha.id,
                            atendente_id=atendente.id,
                            guiche_id=guiche.id,
                            status_anterior=StatusSenha.AGUARDANDO.value,
                            status_novo=StatusSenha.CHAMADA.value,
                            acao="PRIMEIRA_CHAMADA",
                            detalhes=f"Chamada no {guiche.nome}.",
                            criado_em=dt_chamada1,
                        ),
                        LogAuditoria(
                            senha_id=senha.id,
                            atendente_id=atendente.id,
                            guiche_id=guiche.id,
                            status_anterior=StatusSenha.CHAMADA.value,
                            status_novo=StatusSenha.CHAMADA_NOVAMENTE.value,
                            acao="SEGUNDA_CHAMADA",
                            detalhes=f"2ª chamada da senha {codigo}.",
                            criado_em=dt_chamada2,
                        ),
                        LogAuditoria(
                            senha_id=senha.id,
                            atendente_id=atendente.id,
                            guiche_id=guiche.id,
                            status_anterior=StatusSenha.CHAMADA_NOVAMENTE.value,
                            status_novo=StatusSenha.NAO_COMPARECEU.value,
                            acao="ABANDONO_AUTOMATICO",
                            detalhes="Marcada como NÃO_COMPARECEU após timeout da 2ª chamada.",
                            criado_em=dt_fim,
                        ),
                    ]
                )
                abandonos_criados += 1
            else:
                if tipo == TipoSenha.SE.value:
                    tm_segundos = 60 if random.random() < 0.95 else 300
                elif tipo == TipoSenha.SG.value:
                    tm_segundos = random.randint(120, 480)
                else:
                    tm_segundos = random.randint(600, 1200)

                dt_inicio = dt_chamada1 + timedelta(seconds=random.randint(15, 60))
                dt_fim = dt_inicio + timedelta(seconds=tm_segundos)

                senha = Senha(
                    codigo=codigo,
                    tipo=tipo,
                    sequencial=seq,
                    data_referencia=dia,
                    status=StatusSenha.ATENDIDA.value,
                    descartada_fim_expediente=False,
                    emitida_em=dt_emissao,
                    primeira_chamada_em=dt_chamada1,
                    segunda_chamada_em=None,
                    inicio_atendimento_em=dt_inicio,
                    fim_atendimento_em=dt_fim,
                    tempo_atendimento_segundos=tm_segundos,
                    guiche_id=guiche.id,
                    atendente_id=atendente.id,
                )
                db.session.add(senha)
                db.session.flush()

                db.session.add_all(
                    [
                        LogAuditoria(
                            senha_id=senha.id,
                            status_anterior=None,
                            status_novo=StatusSenha.EMITIDA.value,
                            acao="EMISSAO",
                            detalhes=f"Senha {codigo} emitida no totem.",
                            criado_em=dt_emissao,
                        ),
                        LogAuditoria(
                            senha_id=senha.id,
                            status_anterior=StatusSenha.EMITIDA.value,
                            status_novo=StatusSenha.AGUARDANDO.value,
                            acao="ENTRADA_FILA",
                            detalhes=f"Senha {codigo} disponibilizada na fila.",
                            criado_em=dt_emissao,
                        ),
                        LogAuditoria(
                            senha_id=senha.id,
                            atendente_id=atendente.id,
                            guiche_id=guiche.id,
                            status_anterior=StatusSenha.AGUARDANDO.value,
                            status_novo=StatusSenha.CHAMADA.value,
                            acao="PRIMEIRA_CHAMADA",
                            detalhes=f"Chamada no {guiche.nome}.",
                            criado_em=dt_chamada1,
                        ),
                        LogAuditoria(
                            senha_id=senha.id,
                            atendente_id=atendente.id,
                            guiche_id=guiche.id,
                            status_anterior=StatusSenha.CHAMADA.value,
                            status_novo=StatusSenha.EM_ATENDIMENTO.value,
                            acao="INICIO_ATENDIMENTO",
                            detalhes=f"Atendimento iniciado para a senha {codigo}.",
                            criado_em=dt_inicio,
                        ),
                        LogAuditoria(
                            senha_id=senha.id,
                            atendente_id=atendente.id,
                            guiche_id=guiche.id,
                            status_anterior=StatusSenha.EM_ATENDIMENTO.value,
                            status_novo=StatusSenha.ATENDIDA.value,
                            acao="FINALIZACAO_ATENDIMENTO",
                            detalhes=f"Senha {codigo} finalizada em {tm_segundos}s.",
                            criado_em=dt_fim,
                        ),
                    ]
                )

            total_criadas += 1

        db.session.commit()
        taxa_real = round((abandonos_criados / total_criadas) * 100, 2)
        print(f"[+] {total_criadas} atendimentos inseridos com trilha de auditoria.", flush=True)
        print(
            f"[+] Atendidas: {total_criadas - abandonos_criados} | Abandonos: {abandonos_criados} ({taxa_real}%)",
            flush=True,
        )


def testar_resiliencia_saude():
    print("\n[3/3] VERIFICAÇÃO DE RESILIÊNCIA E HEALTHCHECK", flush=True)

    urls = [
        f"{HOST_URL}/health",
        f"{BASE_URL}/health",
        f"{BASE_URL}/painel/chamados",
    ]

    for url in urls:
        try:
            r = requests.get(url, timeout=5)
            body = _json_seguro(r)
            resumo = body if "chamados" not in body else {"total_chamados": body["total"]}
            print(f"  [*] GET {url} -> {r.status_code} | {resumo}", flush=True)
        except requests.RequestException as e:
            print(f"  [!] GET {url} -> FALHA DE CONEXÃO: {e}", flush=True)

    print("\nSimulação de queda do banco/API:", flush=True)
    print("  1. Abra http://localhost:5173/painel no navegador.", flush=True)
    print("  2. Pare o Flask (Ctrl + C) ou o serviço MySQL80.", flush=True)
    print("  3. Em até 5s o Painel entra em 'Modo contingência' mantendo as 5 últimas chamadas.", flush=True)
    print("  4. Suba o serviço novamente e confirme o retorno automático para 'Online'.", flush=True)


def main():
    parser = argparse.ArgumentParser(description="Script de Simulação e Concorrência — nassauTickets")
    parser.add_argument("--concorrencia", action="store_true", help="Executa teste de chamadas simultâneas com lock")
    parser.add_argument("--popular", action="store_true", help="Popula base com variação de TM e 5% de abandono")
    parser.add_argument("--resiliencia", action="store_true", help="Verifica healthchecks e orienta teste de queda")
    parser.add_argument("--tudo", action="store_true", help="Executa todas as rotinas em sequência")
    parser.add_argument("--qtd", type=int, default=60, help="Quantidade de atendimentos para gerar (padrão: 60)")

    args = parser.parse_args()

    if not (args.concorrencia or args.popular or args.resiliencia or args.tudo):
        parser.print_help()
        print("\nExemplo: python simular_cenario.py --tudo")
        return

    if args.tudo or args.concorrencia:
        executar_teste_concorrencia()

    if args.tudo or args.popular:
        popular_massa_relatorios(total_atendimentos=args.qtd)

    if args.tudo or args.resiliencia:
        testar_resiliencia_saude()


if __name__ == "__main__":
    main()