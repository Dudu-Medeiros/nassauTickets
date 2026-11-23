from flask import Blueprint, g, jsonify, request

from app.services import (
    ErroNegocio,
    chamar_proxima_senha,
    encerrar_expediente,
    finalizar_atendimento,
    iniciar_atendimento,
    marcar_nao_compareceu,
    obter_resumo_atendimento,
    rechamar_senha,
)
from app.utils.auth import atendente_obrigatorio, gestor_obrigatorio

atendimento_bp = Blueprint("atendimento", __name__, url_prefix="/api/atendimento")


def _erro_resposta(erro: ErroNegocio):
    return jsonify({"erro": erro.mensagem, **erro.extras}), erro.status_code


@atendimento_bp.get("/atual")
@atendente_obrigatorio
def resumo_atual():
    return jsonify(obter_resumo_atendimento(g.usuario_atual)), 200


@atendimento_bp.post("/chamar")
@atendente_obrigatorio
def chamar_proxima():
    dados = request.get_json(silent=True) or {}
    guiche_id = dados.get("guiche_id")

    try:
        guiche_id = int(guiche_id)
    except (TypeError, ValueError):
        return jsonify({"erro": "Informe um guiche_id inteiro válido."}), 400

    try:
        senha = chamar_proxima_senha(g.usuario_atual, guiche_id)
    except ErroNegocio as erro:
        return _erro_resposta(erro)

    return jsonify(senha.to_dict()), 200


@atendimento_bp.post("/senhas/<int:senha_id>/rechamar")
@atendente_obrigatorio
def rechamar(senha_id: int):
    try:
        senha = rechamar_senha(senha_id, g.usuario_atual)
    except ErroNegocio as erro:
        return _erro_resposta(erro)

    return jsonify(senha.to_dict()), 200


@atendimento_bp.post("/senhas/<int:senha_id>/iniciar")
@atendente_obrigatorio
def iniciar(senha_id: int):
    try:
        senha = iniciar_atendimento(senha_id, g.usuario_atual)
    except ErroNegocio as erro:
        return _erro_resposta(erro)

    return jsonify(senha.to_dict()), 200


@atendimento_bp.post("/senhas/<int:senha_id>/finalizar")
@atendente_obrigatorio
def finalizar(senha_id: int):
    try:
        senha = finalizar_atendimento(senha_id, g.usuario_atual)
    except ErroNegocio as erro:
        return _erro_resposta(erro)

    return jsonify(senha.to_dict()), 200


@atendimento_bp.post("/senhas/<int:senha_id>/nao-compareceu")
@atendente_obrigatorio
def nao_compareceu(senha_id: int):
    try:
        senha = marcar_nao_compareceu(senha_id, g.usuario_atual)
    except ErroNegocio as erro:
        return _erro_resposta(erro)

    return jsonify(senha.to_dict()), 200


@atendimento_bp.post("/encerrar-expediente")
@gestor_obrigatorio
def fechar_expediente():
    resultado = encerrar_expediente(g.usuario_atual)
    return jsonify(resultado), 200