from enum import Enum


class TipoSenha(str, Enum):
    SP = "SP"
    SE = "SE"
    SG = "SG"


class StatusSenha(str, Enum):
    EMITIDA = "EMITIDA"
    AGUARDANDO = "AGUARDANDO"
    CHAMADA = "CHAMADA"
    CHAMADA_NOVAMENTE = "CHAMADA NOVAMENTE"
    EM_ATENDIMENTO = "EM_ATENDIMENTO"
    ATENDIDA = "ATENDIDA"
    NAO_COMPARECEU = "NÃO_COMPARECEU"