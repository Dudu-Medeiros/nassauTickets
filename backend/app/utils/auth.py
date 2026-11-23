from functools import wraps

from flask import g, jsonify
from flask_jwt_extended import get_jwt_identity, verify_jwt_in_request

from app import db
from app.models import Usuario


def _carregar_usuario_autenticado() -> Usuario | None:
    identidade = get_jwt_identity()
    if identidade is None:
        return None
    try:
        usuario_id = int(identidade)
    except (TypeError, ValueError):
        return None
    return db.session.get(Usuario, usuario_id)


def atendente_obrigatorio(fn):
    @wraps(fn)
    def wrapper(*args, **kwargs):
        verify_jwt_in_request()
        usuario = _carregar_usuario_autenticado()

        if not usuario or not usuario.ativo:
            return jsonify({"erro": "Usuário inativo ou não encontrado."}), 401

        g.usuario_atual = usuario
        return fn(*args, **kwargs)

    return wrapper


def gestor_obrigatorio(fn):
    @wraps(fn)
    def wrapper(*args, **kwargs):
        verify_jwt_in_request()
        usuario = _carregar_usuario_autenticado()

        if not usuario or not usuario.ativo:
            return jsonify({"erro": "Usuário inativo ou não encontrado."}), 401

        if not usuario.eh_gestor:
            return jsonify({"erro": "Acesso restrito ao Gestor."}), 403

        g.usuario_atual = usuario
        return fn(*args, **kwargs)

    return wrapper