from datetime import datetime
from werkzeug.security import check_password_hash, generate_password_hash

from app import db


class Usuario(db.Model):
    __tablename__ = "usuarios"

    id = db.Column(db.Integer, primary_key=True)
    nome = db.Column(db.String(120), nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False, index=True)
    senha_hash = db.Column(db.String(255), nullable=False)
    eh_gestor = db.Column(db.Boolean, default=False, nullable=False)
    ativo = db.Column(db.Boolean, default=True, nullable=False)
    criado_em = db.Column(db.DateTime, default=datetime.now, nullable=False)

    def definir_senha(self, senha_plana: str) -> None:
        self.senha_hash = generate_password_hash(senha_plana)

    def verificar_senha(self, senha_plana: str) -> bool:
        return check_password_hash(self.senha_hash, senha_plana)

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "nome": self.nome,
            "email": self.email,
            "eh_gestor": self.eh_gestor,
            "ativo": self.ativo,
            "criado_em": self.criado_em.isoformat(),
        }