import calendar
from datetime import date, datetime, time

from sqlalchemy import desc

from app.models import (
    Guiche,
    LogAuditoria,
    Senha,
    StatusSenha,
    TipoSenha,
    Usuario,
)
from app.services.atendimento_service import executar_rotinas_automaticas
from app.services.senha_service import ErroNegocio

TIPOS_ORDENADOS = (TipoSenha.SP.value, TipoSenha.SE.value, TipoSenha.SG.value)
STATUS_EM_ABERTO = (
    StatusSenha.EMITIDA.value,
    StatusSenha.AGUARDANDO.value,
    StatusSenha.CHAMADA.value,
    StatusSenha.CHAMADA_NOVAMENTE.value,
    StatusSenha.EM_ATENDIMENTO.value,
)


def resolver_periodo(
    periodo: str | None = None,
    data_str: str | None = None,
    mes_str: str | None = None,
) -> dict:
    tipo_periodo = (periodo or "diario").strip().lower()
    if tipo_periodo not in ("diario", "mensal"):
        raise ErroNegocio(
            "Parâmetro 'periodo' inválido. Utilize 'diario' ou 'mensal'.",
            status_code=400,
        )

    hoje = date.today()

    if tipo_periodo == "diario":
        if data_str:
            try:
                data_ref = date.fromisoformat(data_str.strip())
            except ValueError:
                raise ErroNegocio(
                    "Parâmetro 'data' inválido. Utilize o formato YYYY-MM-DD.",
                    status_code=400,
                )
        else:
            data_ref = hoje

        return {
            "tipo": "diario",
            "referencia": data_ref.isoformat(),
            "data_inicio": data_ref,
            "data_fim": data_ref,
        }

    referencia_mes = (mes_str or "").strip()
    if not referencia_mes and data_str:
        referencia_mes = data_str.strip()[:7]
    if not referencia_mes:
        referencia_mes = hoje.strftime("%Y-%m")

    try:
        partes = referencia_mes.split("-")
        if len(partes) != 2:
            raise ValueError
        ano = int(partes[0])
        mes = int(partes[1])
        ultimo_dia = calendar.monthrange(ano, mes)[1]
        data_inicio = date(ano, mes, 1)
        data_fim = date(ano, mes, ultimo_dia)
    except (ValueError, calendar.IllegalMonthError):
        raise ErroNegocio(
            "Parâmetro 'mes' inválido. Utilize o formato YYYY-MM.",
            status_code=400,
        )

    return {
        "tipo": "mensal",
        "referencia": f"{ano:04d}-{mes:02d}",
        "data_inicio": data_inicio,
        "data_fim": data_fim,
    }


def _serializar_filtro(filtro: dict) -> dict:
    return {
        "periodo": filtro["tipo"],
        "referencia": filtro["referencia"],
        "data_inicio": filtro["data_inicio"].isoformat(),
        "data_fim": filtro["data_fim"].isoformat(),
    }


def _formatar_segundos(segundos: float | int | None) -> str | None:
    if segundos is None:
        return None
    total = max(0, int(round(segundos)))
    horas, resto = divmod(total, 3600)
    minutos, segs = divmod(resto, 60)
    if horas > 0:
        return f"{horas:02d}:{minutos:02d}:{segs:02d}"
    return f"{minutos:02d}:{segs:02d}"


def _calcular_percentual(parte: int, total: int) -> float:
    if total <= 0:
        return 0.0
    return round((parte / total) * 100, 2)


def _buscar_senhas_periodo(filtro: dict) -> list[Senha]:
    return (
        Senha.query.filter(
            Senha.data_referencia >= filtro["data_inicio"],
            Senha.data_referencia <= filtro["data_fim"],
        )
        .order_by(Senha.emitida_em.asc(), Senha.id.asc())
        .all()
    )


def _resumir_bloco_quantitativo(senhas: list[Senha]) -> dict:
    emitidas = len(senhas)
    atendidas = sum(1 for s in senhas if s.status == StatusSenha.ATENDIDA.value)
    nao_compareceu = sum(
        1 for s in senhas if s.status == StatusSenha.NAO_COMPARECEU.value
    )
    descartadas = sum(
        1
        for s in senhas
        if s.status == StatusSenha.AGUARDANDO.value and s.descartada_fim_expediente
    )
    em_aberto = sum(
        1
        for s in senhas
        if s.status in STATUS_EM_ABERTO and not s.descartada_fim_expediente
    )

    return {
        "emitidas": emitidas,
        "atendidas": atendidas,
        "nao_compareceu": nao_compareceu,
        "descartadas_fim_expediente": descartadas,
        "em_aberto": em_aberto,
        "taxa_atendimento_percentual": _calcular_percentual(atendidas, emitidas),
        "taxa_nao_comparecimento_percentual": _calcular_percentual(
            nao_compareceu, emitidas
        ),
    }


def _calcular_metricas_tm(senhas: list[Senha]) -> dict:
    atendidas = [s for s in senhas if s.status == StatusSenha.ATENDIDA.value]
    tempos_atendimento = [
        s.tempo_atendimento_segundos
        for s in atendidas
        if s.tempo_atendimento_segundos is not None
    ]
    tempos_espera = [
        max(0, int((s.inicio_atendimento_em - s.emitida_em).total_seconds()))
        for s in atendidas
        if s.inicio_atendimento_em and s.emitida_em
    ]

    tm_segundos = (
        round(sum(tempos_atendimento) / len(tempos_atendimento), 2)
        if tempos_atendimento
        else None
    )
    tme_segundos = (
        round(sum(tempos_espera) / len(tempos_espera), 2)
        if tempos_espera
        else None
    )

    return {
        "total_atendidas": len(atendidas),
        "tm_segundos": tm_segundos,
        "tm_minutos": round(tm_segundos / 60, 2) if tm_segundos is not None else None,
        "tm_formatado": _formatar_segundos(tm_segundos),
        "menor_tempo_segundos": min(tempos_atendimento) if tempos_atendimento else None,
        "maior_tempo_segundos": max(tempos_atendimento) if tempos_atendimento else None,
        "tme_segundos": tme_segundos,
        "tme_minutos": round(tme_segundos / 60, 2) if tme_segundos is not None else None,
        "tme_formatado": _formatar_segundos(tme_segundos),
    }


def gerar_relatorio_quantitativo(
    periodo: str | None = None,
    data_str: str | None = None,
    mes_str: str | None = None,
) -> dict:
    executar_rotinas_automaticas()
    filtro = resolver_periodo(periodo, data_str, mes_str)
    senhas = _buscar_senhas_periodo(filtro)

    por_prioridade = {
        tipo: _resumir_bloco_quantitativo([s for s in senhas if s.tipo == tipo])
        for tipo in TIPOS_ORDENADOS
    }

    return {
        "filtro": _serializar_filtro(filtro),
        "geral": _resumir_bloco_quantitativo(senhas),
        "por_prioridade": por_prioridade,
        "gerado_em": datetime.now().isoformat(),
    }


def gerar_relatorio_detalhado(
    periodo: str | None = None,
    data_str: str | None = None,
    mes_str: str | None = None,
    tipo_filtro: str | None = None,
    status_filtro: str | None = None,
) -> dict:
    executar_rotinas_automaticas()
    filtro = resolver_periodo(periodo, data_str, mes_str)
    senhas = _buscar_senhas_periodo(filtro)

    if tipo_filtro:
        tipo_norm = tipo_filtro.strip().upper()
        if tipo_norm not in TIPOS_ORDENADOS:
            raise ErroNegocio(
                "Parâmetro 'tipo' inválido. Utilize SP, SE ou SG.",
                status_code=400,
            )
        senhas = [s for s in senhas if s.tipo == tipo_norm]

    if status_filtro:
        status_norm = status_filtro.strip().upper()
        status_validos = {st.value for st in StatusSenha}
        if status_norm not in status_validos:
            raise ErroNegocio(
                "Parâmetro 'status' inválido.",
                status_code=400,
            )
        senhas = [s for s in senhas if s.status == status_norm]

    itens = []
    for senha in senhas:
        foi_atendida = senha.status == StatusSenha.ATENDIDA.value
        itens.append(
            {
                "id": senha.id,
                "codigo": senha.codigo,
                "tipo": senha.tipo,
                "data_referencia": senha.data_referencia.isoformat(),
                "status": senha.status,
                "descartada_fim_expediente": senha.descartada_fim_expediente,
                "emitida_em": senha.emitida_em.isoformat() if senha.emitida_em else None,
                "primeira_chamada_em": (
                    senha.primeira_chamada_em.isoformat()
                    if senha.primeira_chamada_em
                    else None
                ),
                "segunda_chamada_em": (
                    senha.segunda_chamada_em.isoformat()
                    if senha.segunda_chamada_em
                    else None
                ),
                "inicio_atendimento_em": (
                    senha.inicio_atendimento_em.isoformat()
                    if foi_atendida and senha.inicio_atendimento_em
                    else None
                ),
                "fim_atendimento_em": (
                    senha.fim_atendimento_em.isoformat()
                    if foi_atendida and senha.fim_atendimento_em
                    else None
                ),
                "tempo_atendimento_segundos": (
                    senha.tempo_atendimento_segundos if foi_atendida else None
                ),
                "tempo_atendimento_formatado": (
                    _formatar_segundos(senha.tempo_atendimento_segundos)
                    if foi_atendida
                    else None
                ),
                "guiche_id": senha.guiche_id if foi_atendida else None,
                "guiche_numero": (
                    senha.guiche.numero if foi_atendida and senha.guiche else None
                ),
                "guiche_nome": (
                    senha.guiche.nome if foi_atendida and senha.guiche else None
                ),
                "atendente_id": senha.atendente_id if foi_atendida else None,
                "atendente_nome": (
                    senha.atendente.nome if foi_atendida and senha.atendente else None
                ),
            }
        )

    return {
        "filtro": _serializar_filtro(filtro),
        "total": len(itens),
        "itens": itens,
        "gerado_em": datetime.now().isoformat(),
    }


def gerar_relatorio_tempo_medio(
    periodo: str | None = None,
    data_str: str | None = None,
    mes_str: str | None = None,
) -> dict:
    executar_rotinas_automaticas()
    filtro = resolver_periodo(periodo, data_str, mes_str)
    senhas = _buscar_senhas_periodo(filtro)

    por_prioridade = {
        tipo: _calcular_metricas_tm([s for s in senhas if s.tipo == tipo])
        for tipo in TIPOS_ORDENADOS
    }

    return {
        "filtro": _serializar_filtro(filtro),
        "geral": _calcular_metricas_tm(senhas),
        "por_prioridade": por_prioridade,
        "gerado_em": datetime.now().isoformat(),
    }


def gerar_relatorio_auditoria(
    periodo: str | None = None,
    data_str: str | None = None,
    mes_str: str | None = None,
    acao: str | None = None,
    senha_codigo: str | None = None,
    atendente_id: int | None = None,
    guiche_id: int | None = None,
) -> dict:
    executar_rotinas_automaticas()
    filtro = resolver_periodo(periodo, data_str, mes_str)

    inicio_dt = datetime.combine(filtro["data_inicio"], time.min)
    fim_dt = datetime.combine(filtro["data_fim"], time.max)

    query = LogAuditoria.query.filter(
        LogAuditoria.criado_em >= inicio_dt,
        LogAuditoria.criado_em <= fim_dt,
    )

    if acao:
        query = query.filter(LogAuditoria.acao == acao.strip().upper())

    if atendente_id is not None:
        query = query.filter(LogAuditoria.atendente_id == atendente_id)

    if guiche_id is not None:
        query = query.filter(LogAuditoria.guiche_id == guiche_id)

    if senha_codigo:
        codigo_norm = senha_codigo.strip().upper()
        query = query.join(Senha, LogAuditoria.senha_id == Senha.id).filter(
            Senha.codigo == codigo_norm
        )

    logs = query.order_by(desc(LogAuditoria.criado_em), desc(LogAuditoria.id)).all()

    resumo_por_acao: dict[str, int] = {}
    for log in logs:
        resumo_por_acao[log.acao] = resumo_por_acao.get(log.acao, 0) + 1

    return {
        "filtro": _serializar_filtro(filtro),
        "total_eventos": len(logs),
        "resumo_por_acao": resumo_por_acao,
        "eventos": [log.to_dict() for log in logs],
        "gerado_em": datetime.now().isoformat(),
    }


def _resumir_desempenho_grupo(senhas_grupo: list[Senha]) -> dict:
    total_chamadas = len(senhas_grupo)
    atendidas = [s for s in senhas_grupo if s.status == StatusSenha.ATENDIDA.value]
    nao_compareceu = sum(
        1 for s in senhas_grupo if s.status == StatusSenha.NAO_COMPARECEU.value
    )
    em_andamento = sum(
        1
        for s in senhas_grupo
        if s.status
        in (
            StatusSenha.CHAMADA.value,
            StatusSenha.CHAMADA_NOVAMENTE.value,
            StatusSenha.EM_ATENDIMENTO.value,
        )
    )
    metricas_tm = _calcular_metricas_tm(senhas_grupo)
    por_tipo_atendidas = {
        tipo: sum(1 for s in atendidas if s.tipo == tipo)
        for tipo in TIPOS_ORDENADOS
    }

    return {
        "total_chamadas": total_chamadas,
        "atendidas": len(atendidas),
        "nao_compareceu": nao_compareceu,
        "em_andamento": em_andamento,
        "taxa_conclusao_percentual": _calcular_percentual(
            len(atendidas), total_chamadas
        ),
        "tm_segundos": metricas_tm["tm_segundos"],
        "tm_minutos": metricas_tm["tm_minutos"],
        "tm_formatado": metricas_tm["tm_formatado"],
        "por_tipo_atendidas": por_tipo_atendidas,
    }


def gerar_relatorio_desempenho(
    periodo: str | None = None,
    data_str: str | None = None,
    mes_str: str | None = None,
) -> dict:
    executar_rotinas_automaticas()
    filtro = resolver_periodo(periodo, data_str, mes_str)
    senhas = _buscar_senhas_periodo(filtro)

    usuarios = Usuario.query.order_by(Usuario.nome.asc()).all()
    guiches = Guiche.query.order_by(Guiche.numero.asc()).all()

    por_atendente = []
    for usuario in usuarios:
        senhas_usuario = [s for s in senhas if s.atendente_id == usuario.id]
        if not usuario.ativo and not senhas_usuario:
            continue
        por_atendente.append(
            {
                "atendente_id": usuario.id,
                "atendente_nome": usuario.nome,
                "email": usuario.email,
                "eh_gestor": usuario.eh_gestor,
                "ativo": usuario.ativo,
                **_resumir_desempenho_grupo(senhas_usuario),
            }
        )
    por_atendente.sort(
        key=lambda item: (-item["atendidas"], item["atendente_nome"].lower())
    )

    por_guiche = []
    for guiche in guiches:
        senhas_guiche = [s for s in senhas if s.guiche_id == guiche.id]
        if not guiche.ativo and not senhas_guiche:
            continue
        por_guiche.append(
            {
                "guiche_id": guiche.id,
                "guiche_numero": guiche.numero,
                "guiche_nome": guiche.nome,
                "ativo": guiche.ativo,
                **_resumir_desempenho_grupo(senhas_guiche),
            }
        )
    por_guiche.sort(key=lambda item: (-item["atendidas"], item["guiche_numero"]))

    return {
        "filtro": _serializar_filtro(filtro),
        "por_atendente": por_atendente,
        "por_guiche": por_guiche,
        "gerado_em": datetime.now().isoformat(),
    }