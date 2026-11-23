from datetime import datetime

from sqlalchemy import func

from app import db
from app.models import ControleFila, LogAuditoria, Senha, StatusSenha, TipoSenha
from app.utils.expediente import obter_status_expediente
from app.utils.maquina_estados import validar_transicao


class ErroNegocio(Exception):
    def __init__(self, mensagem: str, status_code: int = 400, extras: dict | None = None):
        super().__init__(mensagem)
        self.mensagem = mensagem
        self.status_code = status_code
        self.extras = extras or {}


def _obter_ou_criar_trava_fila(hoje) -> ControleFila:
    controle = (
        db.session.query(ControleFila)
        .filter_by(id=1)
        .with_for_update()
        .first()
    )
    if not controle:
        controle = ControleFila(
            id=1,
            data_referencia=hoje,
            ultima_prioridade_chamada=None,
        )
        db.session.add(controle)
        db.session.flush()
    return controle


def emitir_senha(tipo_informado: str) -> Senha:
    status_expediente = obter_status_expediente()
    if not status_expediente["aberto"]:
        raise ErroNegocio(
            (
                "Fora do expediente de atendimento "
                f"({status_expediente['expediente_inicio']} às {status_expediente['expediente_fim']})."
            ),
            status_code=403,
            extras={"expediente": status_expediente},
        )

    tipo_normalizado = (tipo_informado or "").strip().upper()
    tipos_validos = {t.value for t in TipoSenha}
    if tipo_normalizado not in tipos_validos:
        raise ErroNegocio(
            "Tipo de senha inválido. Utilize SP, SE ou SG.",
            status_code=400,
        )

    agora = datetime.now()
    hoje = agora.date()

    try:
        _obter_ou_criar_trava_fila(hoje)

        ultimo_sequencial = (
            db.session.query(func.max(Senha.sequencial))
            .filter(
                Senha.data_referencia == hoje,
                Senha.tipo == tipo_normalizado,
            )
            .scalar()
        )
        proximo_sequencial = (ultimo_sequencial or 0) + 1
        codigo = f"{hoje.strftime('%y%m%d')}-{tipo_normalizado}{proximo_sequencial:03d}"

        senha = Senha(
            codigo=codigo,
            tipo=tipo_normalizado,
            sequencial=proximo_sequencial,
            data_referencia=hoje,
            status=StatusSenha.EMITIDA.value,
            emitida_em=agora,
        )
        db.session.add(senha)
        db.session.flush()

        db.session.add(
            LogAuditoria(
                senha_id=senha.id,
                status_anterior=None,
                status_novo=StatusSenha.EMITIDA.value,
                acao="EMISSAO",
                detalhes=f"Senha {codigo} emitida no totem.",
            )
        )

        valida, erro_msg = validar_transicao(senha.status, StatusSenha.AGUARDANDO.value)
        if not valida:
            raise ErroNegocio(erro_msg or "Transição inválida.", status_code=400)

        senha.status = StatusSenha.AGUARDANDO.value
        db.session.add(
            LogAuditoria(
                senha_id=senha.id,
                status_anterior=StatusSenha.EMITIDA.value,
                status_novo=StatusSenha.AGUARDANDO.value,
                acao="ENTRADA_FILA",
                detalhes=f"Senha {codigo} disponibilizada na fila de espera.",
            )
        )

        db.session.commit()
        return senha
    except Exception:
        db.session.rollback()
        raise