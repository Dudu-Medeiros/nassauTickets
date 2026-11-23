from flask import Blueprint, jsonify

from app.services import obter_ultimos_chamados_painel

painel_bp = Blueprint("painel", __name__, url_prefix="/api/painel")


@painel_bp.get("/chamados")
def listar_ultimos_chamados():
    return jsonify(obter_ultimos_chamados_painel()), 200