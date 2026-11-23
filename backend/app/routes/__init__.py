from app.routes.atendimento_routes import atendimento_bp
from app.routes.auth_routes import auth_bp
from app.routes.guiche_routes import guiche_bp
from app.routes.health_routes import health_bp
from app.routes.painel_routes import painel_bp
from app.routes.relatorio_routes import relatorio_bp
from app.routes.senha_routes import senha_bp
from app.routes.usuario_routes import usuario_bp

__all__ = [
    "atendimento_bp",
    "auth_bp",
    "guiche_bp",
    "health_bp",
    "painel_bp",
    "relatorio_bp",
    "senha_bp",
    "usuario_bp",
]