from datetime import date

from app import create_app, db
from app.models import ControleFila, Guiche, Usuario


def seed() -> None:
    app = create_app()
    with app.app_context():
        usuarios_iniciais = [
            ("Gestor Laboratório", "gestor@nassautickets.com", "gestor123", True),
            ("Atendente Ana", "ana@nassautickets.com", "atendente123", False),
            ("Atendente Carlos", "carlos@nassautickets.com", "atendente123", False),
        ]

        for nome, email, senha, eh_gestor in usuarios_iniciais:
            if not Usuario.query.filter_by(email=email).first():
                usuario = Usuario(nome=nome, email=email, eh_gestor=eh_gestor)
                usuario.definir_senha(senha)
                db.session.add(usuario)

        for numero in range(1, 4):
            if not Guiche.query.filter_by(numero=numero).first():
                db.session.add(Guiche(numero=numero, nome=f"Guichê {numero:02d}"))

        if not db.session.get(ControleFila, 1):
            db.session.add(
                ControleFila(
                    id=1,
                    data_referencia=date.today(),
                    ultima_prioridade_chamada=None,
                )
            )

        db.session.commit()
        print("Seed executado com sucesso.")


if __name__ == "__main__":
    seed()