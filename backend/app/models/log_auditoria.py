
from datetime import datetime

from app import db


class LogAuditoria(db.Model):
    __tablename__ = "logs_auditoria"

    id = db.Column(db.Integer, primary_key=True)
    senha_id = db.Column(db.Integer, db.ForeignKey("senhas.id"), nullable=True, index=True)
    atendente_id = db.Column(db.Integer, db.ForeignKey("usuarios.id"), nullable=True)
    guiche_id = db.Column(db.Integer, db.ForeignKey("guiches.id"), nullable=True)
    status_anterior = db.Column(db.String(30), nullable=True)
    status_novo = db.Column(db.String(30), nullable=True)
    acao = db.Column(db.String(60), nullable=False)
    detalhes = db.Column(db.String(255), nullable=True)
    criado_em = db.Column(db.DateTime, default=datetime.now, nullable=False)

    senha = db.relationship("Senha", lazy="joined")
    atendente = db.relationship("Usuario", lazy="joined")
    guiche = db.relationship("Guiche", lazy="joined")

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "senha_id": self.senha_id,
            "senha_codigo": self.senha.codigo if self.senha else None,
            "atendente_id": self.atendente_id,
            "atendente_nome": self.atendente.nome if self.atendente else None,
            "guiche_id": self.guiche_id,
            "guiche_nome": self.guiche.nome if self.guiche else None,
            "status_anterior": self.status_anterior,
            "status_novo": self.status_novo,
            "acao": self.acao,
            "detalhes": self.detalhes,
            "criado_em": self.criado_em.isoformat(),
        }