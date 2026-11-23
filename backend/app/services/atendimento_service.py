from datetime import date, datetime, timedelta

from flask import current_app
from sqlalchemy import func

from app import db
from app.models import (
    ControleFila,
    Guiche,
    LogAuditoria,
    Senha,
    StatusSenha,
    TipoSenha,
    Usuario,
)
from app.services.senha_service import ErroNegocio, _obter_ou_criar_trava_fila
from app.utils.expediente import obter_status_expediente
from app.utils.maquina_estados import validar_transicao

STATUS_ATIVOS = (
    StatusSenha.CHAMADA.value,
    StatusSenha.CHAMADA_NOVAMENTE.value,
    StatusSenha.EM_ATENDIMENTO.value,
)


def _obter_ordem_prioridades(ultima_prioridade: str | None) -> list[str]:
    if ultima_prioridade == TipoSenha.SP.value:
        return [TipoSenha.SE.value, TipoSenha.SG.value, TipoSenha.SP.value]
    return [TipoSenha.SP.value, TipoSenha.SE.value, TipoSenha.SG.value]


def _garantir_transicao(status_atual: str, status_destino: str) -> None:
    valida, erro_msg = validar_transicao(status_atual, status_destino)
    if not valida:
        raise ErroNegocio(erro_msg or "Transição de estado não permitida.", status_code=400)


def _buscar_senha_para_transicao(senha_id: int, usuario: Usuario) -> Senha:
    senha = (
        db.session.query(Senha)
        .filter_by(id=senha_id)
        .with_for_update()
        .first()
    )
    if not senha:
        raise ErroNegocio("Senha não encontrada.", status_code=404)

    if senha.atendente_id != usuario.id and not usuario.eh_gestor:
        raise ErroNegocio(
            "Esta senha está vinculada a outro atendente.",
            status_code=403,
        )

    return senha


def processar_abandonos_automaticos() -> list[str]:
    limite_segundos = int(current_app.config.get("TEMPO_LIMITE_ABANDONO_SEGUNDOS", 120))
    agora = datetime.now()
    corte = agora - timedelta(seconds=limite_segundos)
    hoje = agora.date()

    try:
        senhas_expiradas = (
            db.session.query(Senha)
            .filter(
                Senha.data_referencia == hoje,
                Senha.status == StatusSenha.CHAMADA_NOVAMENTE.value,
                Senha.segunda_chamada_em.is_not(None),
                Senha.segunda_chamada_em <= corte,
            )
            .with_for_update()
            .all()
        )

        if not senhas_expiradas:
            return []

        codigos = []
        for senha in senhas_expiradas:
            status_anterior = senha.status
            _garantir_transicao(status_anterior, StatusSenha.NAO_COMPARECEU.value)

            senha.status = StatusSenha.NAO_COMPARECEU.value
            senha.fim_atendimento_em = agora
            codigos.append(senha.codigo)

            db.session.add(
                LogAuditoria(
                    senha_id=senha.id,
                    atendente_id=senha.atendente_id,
                    guiche_id=senha.guiche_id,
                    status_anterior=status_anterior,
                    status_novo=senha.status,
                    acao="ABANDONO_AUTOMATICO",
                    detalhes=(
                        f"Senha {senha.codigo} marcada automaticamente como NÃO_COMPARECEU "
                        f"após {limite_segundos}s sem comparecimento na 2ª chamada."
                    ),
                )
            )

        db.session.commit()
        return codigos
    except Exception:
        db.session.rollback()
        raise


def processar_encerramento_automatico_expediente() -> dict:
    status_expediente = obter_status_expediente()
    if status_expediente["modo_demo"] or not status_expediente["apos_fim_expediente"]:
        return {"executado": False, "total_descartadas": 0, "codigos_descartados": []}

    hoje = date.today()
    try:
        senhas_pendentes = (
            db.session.query(Senha)
            .filter(
                Senha.data_referencia == hoje,
                Senha.status == StatusSenha.AGUARDANDO.value,
                Senha.descartada_fim_expediente.is_(False),
            )
            .with_for_update()
            .all()
        )

        if not senhas_pendentes:
            return {"executado": True, "total_descartadas": 0, "codigos_descartados": []}

        controle = _obter_ou_criar_trava_fila(hoje)
        codigos = []
        for senha in senhas_pendentes:
            senha.descartada_fim_expediente = True
            codigos.append(senha.codigo)
            db.session.add(
                LogAuditoria(
                    senha_id=senha.id,
                    status_anterior=senha.status,
                    status_novo=senha.status,
                    acao="DESCARTE_AUTOMATICO_17H",
                    detalhes=(
                        f"Senha {senha.codigo} descartada automaticamente após "
                        f"o fim do expediente ({status_expediente['expediente_fim']})."
                    ),
                )
            )

        controle.ultima_prioridade_chamada = None
        controle.data_referencia = hoje
        db.session.commit()

        return {
            "executado": True,
            "total_descartadas": len(codigos),
            "codigos_descartados": codigos,
        }
    except Exception:
        db.session.rollback()
        raise


def executar_rotinas_automaticas() -> dict:
    abandonos = processar_abandonos_automaticos()
    encerramento = processar_encerramento_automatico_expediente()
    return {
        "abandonos_automaticos": abandonos,
        "total_abandonos_automaticos": len(abandonos),
        "encerramento_automatico_expediente": encerramento,
    }


def chamar_proxima_senha(atendente: Usuario, guiche_id: int) -> Senha:
    processar_abandonos_automaticos()

    status_expediente = obter_status_expediente()
    if not status_expediente["aberto"]:
        encerramento = processar_encerramento_automatico_expediente()
        raise ErroNegocio(
            (
                "Fora do expediente de atendimento "
                f"({status_expediente['expediente_inicio']} às {status_expediente['expediente_fim']})."
            ),
            status_code=403,
            extras={
                "expediente": status_expediente,
                "encerramento_automatico": encerramento,
            },
        )

    guiche = db.session.get(Guiche, guiche_id)
    if not guiche or not guiche.ativo:
        raise ErroNegocio("Guichê inválido ou inativo.", status_code=400)

    agora = datetime.now()
    hoje = agora.date()

    try:
        controle = _obter_ou_criar_trava_fila(hoje)
        if controle.data_referencia != hoje:
            controle.data_referencia = hoje
            controle.ultima_prioridade_chamada = None

        ativa_atendente = Senha.query.filter(
            Senha.data_referencia == hoje,
            Senha.atendente_id == atendente.id,
            Senha.status.in_(STATUS_ATIVOS),
        ).first()
        if ativa_atendente:
            raise ErroNegocio(
                f"Finalize ou encerre a senha {ativa_atendente.codigo} antes de chamar a próxima.",
                status_code=409,
                extras={"senha_ativa": ativa_atendente.to_dict()},
            )

        ativa_guiche = Senha.query.filter(
            Senha.data_referencia == hoje,
            Senha.guiche_id == guiche.id,
            Senha.status.in_(STATUS_ATIVOS),
        ).first()
        if ativa_guiche:
            raise ErroNegocio(
                f"O {guiche.nome} já possui a senha {ativa_guiche.codigo} em andamento.",
                status_code=409,
                extras={"senha_ativa": ativa_guiche.to_dict()},
            )

        ordem = _obter_ordem_prioridades(controle.ultima_prioridade_chamada)
        senha_escolhida = None

        for tipo_candidato in ordem:
            senha_escolhida = (
                db.session.query(Senha)
                .filter(
                    Senha.data_referencia == hoje,
                    Senha.tipo == tipo_candidato,
                    Senha.status == StatusSenha.AGUARDANDO.value,
                    Senha.descartada_fim_expediente.is_(False),
                )
                .order_by(Senha.emitida_em.asc(), Senha.id.asc())
                .with_for_update()
                .first()
            )
            if senha_escolhida:
                break

        if not senha_escolhida:
            raise ErroNegocio("Não há senhas aguardando na fila.", status_code=404)

        status_anterior = senha_escolhida.status
        _garantir_transicao(status_anterior, StatusSenha.CHAMADA.value)

        senha_escolhida.status = StatusSenha.CHAMADA.value
        senha_escolhida.primeira_chamada_em = agora
        senha_escolhida.guiche_id = guiche.id
        senha_escolhida.atendente_id = atendente.id

        controle.ultima_prioridade_chamada = senha_escolhida.tipo
        controle.data_referencia = hoje

        db.session.add(
            LogAuditoria(
                senha_id=senha_escolhida.id,
                atendente_id=atendente.id,
                guiche_id=guiche.id,
                status_anterior=status_anterior,
                status_novo=senha_escolhida.status,
                acao="PRIMEIRA_CHAMADA",
                detalhes=f"Senha {senha_escolhida.codigo} chamada no {guiche.nome}.",
            )
        )

        db.session.commit()
        return senha_escolhida
    except Exception:
        db.session.rollback()
        raise


def rechamar_senha(senha_id: int, usuario: Usuario) -> Senha:
    processar_abandonos_automaticos()

    try:
        senha = _buscar_senha_para_transicao(senha_id, usuario)
        status_anterior = senha.status
        _garantir_transicao(status_anterior, StatusSenha.CHAMADA_NOVAMENTE.value)

        agora = datetime.now()
        senha.status = StatusSenha.CHAMADA_NOVAMENTE.value
        senha.segunda_chamada_em = agora

        db.session.add(
            LogAuditoria(
                senha_id=senha.id,
                atendente_id=usuario.id,
                guiche_id=senha.guiche_id,
                status_anterior=status_anterior,
                status_novo=senha.status,
                acao="SEGUNDA_CHAMADA",
                detalhes=f"2ª chamada da senha {senha.codigo}.",
            )
        )

        db.session.commit()
        return senha
    except Exception:
        db.session.rollback()
        raise


def iniciar_atendimento(senha_id: int, usuario: Usuario) -> Senha:
    processar_abandonos_automaticos()

    try:
        senha = _buscar_senha_para_transicao(senha_id, usuario)
        status_anterior = senha.status
        _garantir_transicao(status_anterior, StatusSenha.EM_ATENDIMENTO.value)

        agora = datetime.now()
        senha.status = StatusSenha.EM_ATENDIMENTO.value
        senha.inicio_atendimento_em = agora

        db.session.add(
            LogAuditoria(
                senha_id=senha.id,
                atendente_id=usuario.id,
                guiche_id=senha.guiche_id,
                status_anterior=status_anterior,
                status_novo=senha.status,
                acao="INICIO_ATENDIMENTO",
                detalhes=f"Atendimento iniciado para a senha {senha.codigo}.",
            )
        )

        db.session.commit()
        return senha
    except Exception:
        db.session.rollback()
        raise


def finalizar_atendimento(senha_id: int, usuario: Usuario) -> Senha:
    try:
        senha = _buscar_senha_para_transicao(senha_id, usuario)
        status_anterior = senha.status
        _garantir_transicao(status_anterior, StatusSenha.ATENDIDA.value)

        agora = datetime.now()
        duracao = (
            max(0, int((agora - senha.inicio_atendimento_em).total_seconds()))
            if senha.inicio_atendimento_em
            else 0
        )

        senha.status = StatusSenha.ATENDIDA.value
        senha.fim_atendimento_em = agora
        senha.tempo_atendimento_segundos = duracao

        db.session.add(
            LogAuditoria(
                senha_id=senha.id,
                atendente_id=usuario.id,
                guiche_id=senha.guiche_id,
                status_anterior=status_anterior,
                status_novo=senha.status,
                acao="FINALIZACAO_ATENDIMENTO",
                detalhes=f"Senha {senha.codigo} finalizada em {duracao}s.",
            )
        )

        db.session.commit()
        return senha
    except Exception:
        db.session.rollback()
        raise


def marcar_nao_compareceu(senha_id: int, usuario: Usuario) -> Senha:
    processar_abandonos_automaticos()

    try:
        senha = _buscar_senha_para_transicao(senha_id, usuario)
        status_anterior = senha.status
        _garantir_transicao(status_anterior, StatusSenha.NAO_COMPARECEU.value)

        agora = datetime.now()
        senha.status = StatusSenha.NAO_COMPARECEU.value
        senha.fim_atendimento_em = agora

        db.session.add(
            LogAuditoria(
                senha_id=senha.id,
                atendente_id=usuario.id,
                guiche_id=senha.guiche_id,
                status_anterior=status_anterior,
                status_novo=senha.status,
                acao="NAO_COMPARECEU",
                detalhes=f"Paciente da senha {senha.codigo} não compareceu após 2ª chamada.",
            )
        )

        db.session.commit()
        return senha
    except Exception:
        db.session.rollback()
        raise


def encerrar_expediente(gestor: Usuario) -> dict:
    hoje = date.today()

    try:
        controle = _obter_ou_criar_trava_fila(hoje)

        senhas_pendentes = (
            db.session.query(Senha)
            .filter(
                Senha.data_referencia == hoje,
                Senha.status == StatusSenha.AGUARDANDO.value,
                Senha.descartada_fim_expediente.is_(False),
            )
            .with_for_update()
            .all()
        )

        codigos_descartados = []
        for senha in senhas_pendentes:
            senha.descartada_fim_expediente = True
            codigos_descartados.append(senha.codigo)
            db.session.add(
                LogAuditoria(
                    senha_id=senha.id,
                    atendente_id=gestor.id,
                    status_anterior=senha.status,
                    status_novo=senha.status,
                    acao="DESCARTE_FIM_EXPEDIENTE",
                    detalhes=f"Senha {senha.codigo} descartada no encerramento do expediente.",
                )
            )

        em_atendimento = Senha.query.filter(
            Senha.data_referencia == hoje,
            Senha.status == StatusSenha.EM_ATENDIMENTO.value,
        ).all()

        chamadas_em_aberto = Senha.query.filter(
            Senha.data_referencia == hoje,
            Senha.status.in_(
                (StatusSenha.CHAMADA.value, StatusSenha.CHAMADA_NOVAMENTE.value)
            ),
        ).all()

        controle.ultima_prioridade_chamada = None
        controle.data_referencia = hoje
        db.session.commit()

        return {
            "mensagem": "Expediente encerrado. Atendimentos em curso foram mantidos e a fila pendente foi descartada.",
            "total_descartadas": len(codigos_descartados),
            "codigos_descartados": codigos_descartados,
            "total_em_atendimento_mantidas": len(em_atendimento),
            "codigos_em_atendimento_mantidas": [s.codigo for s in em_atendimento],
            "total_chamadas_em_aberto": len(chamadas_em_aberto),
            "codigos_chamadas_em_aberto": [s.codigo for s in chamadas_em_aberto],
        }
    except Exception:
        db.session.rollback()
        raise


def obter_resumo_atendimento(usuario: Usuario) -> dict:
    rotinas = executar_rotinas_automaticas()
    hoje = date.today()

    senha_atual = Senha.query.filter(
        Senha.data_referencia == hoje,
        Senha.atendente_id == usuario.id,
        Senha.status.in_(STATUS_ATIVOS),
    ).first()

    contagens = (
        db.session.query(Senha.tipo, func.count(Senha.id))
        .filter(
            Senha.data_referencia == hoje,
            Senha.status == StatusSenha.AGUARDANDO.value,
            Senha.descartada_fim_expediente.is_(False),
        )
        .group_by(Senha.tipo)
        .all()
    )

    fila = {"SP": 0, "SE": 0, "SG": 0}
    for tipo, total in contagens:
        if tipo in fila:
            fila[tipo] = total
    fila["total"] = sum(fila.values())

    controle = db.session.get(ControleFila, 1)
    ultima_prioridade = (
        controle.ultima_prioridade_chamada
        if controle and controle.data_referencia == hoje
        else None
    )

    return {
        "senha_atual": senha_atual.to_dict() if senha_atual else None,
        "fila_aguardando": fila,
        "ultima_prioridade_chamada": ultima_prioridade,
        "proxima_ordem_prioridade": _obter_ordem_prioridades(ultima_prioridade),
        "tempo_limite_abandono_segundos": int(
            current_app.config.get("TEMPO_LIMITE_ABANDONO_SEGUNDOS", 120)
        ),
        "expediente": obter_status_expediente(),
        "rotinas_executadas": rotinas,
    }