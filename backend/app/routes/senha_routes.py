from flask import Blueprint, jsonify, request

from app.models import LogAuditoria, Senha
from app.services import ErroNegocio, emitir_senha
from app.utils.expediente import obter_status_expediente

senha_bp = Blueprint("senhas", __name__, url_prefix="/api/senhas")


@senha_bp.get("/expediente")
def status_expediente():
    return jsonify(obter_status_expediente()), 200


@senha_bp.post("")
def criar_senha():
    dados = request.get_json(silent=True) or {}
    tipo = dados.get("tipo")

    try:
        senha = emitir_senha(tipo)
    except ErroNegocio as erro:
        resposta = {"erro": erro.mensagem, **erro.extras}
        return jsonify(resposta), erro.status_code

    return jsonify(senha.to_dict()), 201


@senha_bp.get("/<string:codigo>")
def consultar_senha(codigo: str):
    senha = Senha.query.filter_by(codigo=codigo.strip().upper()).first()
    if not senha:
        return jsonify({"erro": "Senha não encontrada."}), 404

    logs = (
        LogAuditoria.query.filter_by(senha_id=senha.id)
        .order_by(LogAuditoria.id.asc())
        .all()
    )

    return jsonify(
        {
            "senha": senha.to_dict(),
            "historico": [log.to_dict() for log in logs],
        }
    ), 200