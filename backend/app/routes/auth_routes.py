from flask import Blueprint, g, jsonify, request
from flask_jwt_extended import create_access_token

from app.models import Usuario
from app.utils.auth import atendente_obrigatorio

auth_bp = Blueprint("auth", __name__, url_prefix="/api/auth")


@auth_bp.post("/login")
def login():
    dados = request.get_json(silent=True) or {}
    email = (dados.get("email") or "").strip().lower()
    senha = dados.get("senha") or ""

    if not email or not senha:
        return jsonify({"erro": "Informe e-mail e senha."}), 400

    usuario = Usuario.query.filter_by(email=email).first()
    if not usuario or not usuario.verificar_senha(senha):
        return jsonify({"erro": "Credenciais inválidas."}), 401

    if not usuario.ativo:
        return jsonify({"erro": "Usuário desativado. Procure o Gestor."}), 403

    token = create_access_token(
        identity=str(usuario.id),
        additional_claims={"eh_gestor": usuario.eh_gestor},
    )

    return jsonify({"access_token": token, "usuario": usuario.to_dict()}), 200


@auth_bp.get("/me")
@atendente_obrigatorio
def me():
    return jsonify({"usuario": g.usuario_atual.to_dict()}), 200