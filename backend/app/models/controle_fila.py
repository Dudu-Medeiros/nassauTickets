from datetime import date, datetime

from app import db


class ControleFila(db.Model):
    __tablename__ = "controle_fila"

    id = db.Column(db.Integer, primary_key=True)
    data_referencia = db.Column(db.Date, default=date.today, nullable=False)
    ultima_prioridade_chamada = db.Column(db.String(2), nullable=True)
    atualizado_em = db.Column(
        db.DateTime,
        default=datetime.now,
        onupdate=datetime.now,
        nullable=False,
    )