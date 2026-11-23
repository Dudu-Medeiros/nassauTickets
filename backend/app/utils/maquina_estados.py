from app.models.enums import StatusSenha

TRANSICOES_PERMITIDAS: dict[str, tuple[str, ...]] = {
    StatusSenha.EMITIDA.value: (StatusSenha.AGUARDANDO.value,),
    StatusSenha.AGUARDANDO.value: (StatusSenha.CHAMADA.value,),
    StatusSenha.CHAMADA.value: (
        StatusSenha.CHAMADA_NOVAMENTE.value,
        StatusSenha.EM_ATENDIMENTO.value,
    ),
    StatusSenha.CHAMADA_NOVAMENTE.value: (
        StatusSenha.EM_ATENDIMENTO.value,
        StatusSenha.NAO_COMPARECEU.value,
    ),
    StatusSenha.EM_ATENDIMENTO.value: (StatusSenha.ATENDIDA.value,),
    StatusSenha.ATENDIDA.value: (),
    StatusSenha.NAO_COMPARECEU.value: (),
}


def validar_transicao(status_atual: str, status_destino: str) -> tuple[bool, str | None]:
    permitidos = TRANSICOES_PERMITIDAS.get(status_atual, ())
    if status_destino in permitidos:
        return True, None

    if not permitidos:
        return (
            False,
            f"O status {status_atual} é final e não permite transição para {status_destino}.",
        )

    if (
        status_atual == StatusSenha.CHAMADA.value
        and status_destino == StatusSenha.NAO_COMPARECEU.value
    ):
        return False, "Realize a 2ª chamada antes de registrar NÃO_COMPARECEU."

    if (
        status_atual == StatusSenha.CHAMADA_NOVAMENTE.value
        and status_destino == StatusSenha.CHAMADA_NOVAMENTE.value
    ):
        return (
            False,
            "A 2ª chamada já foi realizada. Inicie o atendimento ou aguarde/registre ausência.",
        )

    opcoes = ", ".join(permitidos)
    return (
        False,
        f"Transição inválida de {status_atual} para {status_destino}. Permitidos: {opcoes}.",
    )


def obter_mapa_transicoes() -> dict[str, list[str]]:
    return {origem: list(destinos) for origem, destinos in TRANSICOES_PERMITIDAS.items()}