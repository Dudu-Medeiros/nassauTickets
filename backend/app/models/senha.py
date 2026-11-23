from datetime import datetime

from app import db
from app.models.enums import StatusSenha


class Senha(db.Model):
    __tablename__ = "senhas"

    id = db.Column(db.Integer, primary_key=True)
    codigo = db.Column(db.String(20), unique=True, nullable=False, index=True)
    tipo = db.Column(db.String(2), nullable=False, index=True)
    sequencial = db.Column(db.Integer, nullable=False)
    data_referencia = db.Column(db.Date, nullable=False, index=True)
    status = db.Column(
        db.String(30),
        default=StatusSenha.AGUARDANDO.value,
        nullable=False,
        index=True,
    )

    emitida_em = db.Column(db.DateTime, default=datetime.now, nullable=False)
    primeira_chamada_em = db.Column(db.DateTime, nullable=True)
    segunda_chamada_em = db.Column(db.DateTime, nullable=True)
    inicio_atendimento_em = db.Column(db.DateTime, nullable=True)
    fim_atendimento_em = db.Column(db.DateTime, nullable=True)
    tempo_atendimento_segundos = db.Column(db.Integer, nullable=True)
    descartada_fim_expediente = db.Column(db.Boolean, default=False, nullable=False)

    guiche_id = db.Column(db.Integer, db.ForeignKey("guiches.id"), nullable=True)
    atendente_id = db.Column(db.Integer, db.ForeignKey("usuarios.id"), nullable=True)

    guiche = db.relationship("Guiche", lazy="joined")
    atendente = db.relationship("Usuario", lazy="joined")

    __table_args__ = (
        db.UniqueConstraint(
            "data_referencia",
            "tipo",
            "sequencial",
            name="uq_senha_dia_tipo_sequencial",
        ),
    )

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "codigo": self.codigo,
            "tipo": self.tipo,
            "sequencial": self.sequencial,
            "data_referencia": self.data_referencia.isoformat(),
            "status": self.status,
            "emitida_em": self.emitida_em.isoformat() if self.emitida_em else None,
            "primeira_chamada_em": (
                self.primeira_chamada_em.isoformat()
                if self.primeira_chamada_em
                else None
            ),
            "segunda_chamada_em": (
                self.segunda_chamada_em.isoformat()
                if self.segunda_chamada_em
                else None
            ),
            "inicio_atendimento_em": (
                self.inicio_atendimento_em.isoformat()
                if self.inicio_atendimento_em
                else None
            ),
            "fim_atendimento_em": (
                self.fim_atendimento_em.isoformat()
                if self.fim_atendimento_em
                else None
            ),
            "tempo_atendimento_segundos": self.tempo_atendimento_segundos,
            "descartada_fim_expediente": self.descartada_fim_expediente,
            "guiche_id": self.guiche_id,
            "guiche_nome": self.guiche.nome if self.guiche else None,
            "guiche_numero": self.guiche.numero if self.guiche else None,
            "atendente_id": self.atendente_id,
            "atendente_nome": self.atendente.nome if self.atendente else None,
        }