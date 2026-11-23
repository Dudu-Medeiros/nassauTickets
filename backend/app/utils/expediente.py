from datetime import datetime, time

from flask import current_app


def _parse_horario(horario_str: str) -> time:
    hora, minuto = horario_str.strip().split(":")
    return time(int(hora), int(minuto))


def obter_status_expediente(agora: datetime | None = None) -> dict:
    momento = agora or datetime.now()
    inicio_str = current_app.config.get("EXPEDIENTE_INICIO", "07:00")
    fim_str = current_app.config.get("EXPEDIENTE_FIM", "17:00")
    modo_demo = bool(current_app.config.get("MODO_DEMO_SEM_EXPEDIENTE", False))

    inicio = _parse_horario(inicio_str)
    fim = _parse_horario(fim_str)
    dentro_horario = inicio <= momento.time() <= fim

    return {
        "aberto": True if modo_demo else dentro_horario,
        "dentro_horario_oficial": dentro_horario,
        "modo_demo": modo_demo,
        "expediente_inicio": inicio_str,
        "expediente_fim": fim_str,
        "horario_atual": momento.strftime("%H:%M:%S"),
    }