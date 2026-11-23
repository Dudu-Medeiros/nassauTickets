from datetime import datetime

from app import db


class Guiche(db.Model):
    __tablename__ = "guiches"

    id = db.Column(db.Integer, primary_key=True)
    numero = db.Column(db.Integer, unique=True, nullable=False)
    nome = db.Column(db.String(60), nullable=False)
    ativo = db.Column(db.Boolean, default=True, nullable=False)
    criado_em = db.Column(db.DateTime, default=datetime.now, nullable=False)

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "numero": self.numero,
            "nome": self.nome,
            "ativo": self.ativo,
            "criado_em": self.criado_em.isoformat(),
        }