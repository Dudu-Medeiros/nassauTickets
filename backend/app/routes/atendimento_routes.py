import random
import time

from flask import Blueprint, current_app, g, jsonify, request
from sqlalchemy.exc import OperationalError

from app import db
from app.services import (
    ErroNegocio,
    chamar_proxima_senha,
    encerrar_expediente,
    executar_rotinas_automaticas,
    finalizar_atendimento,
    iniciar_atendimento,
    marcar_nao_compareceu,
    obter_resumo_atendimento,
    rechamar_senha,
)
from app.utils.auth import atendente_obrigatorio, gestor_obrigatorio
from app.utils.maquina_estados import obter_mapa_transicoes

atendimento_bp = Blueprint("atendimento", __name__, url_prefix="/api/atendimento")

CODIGOS_LOCK_MYSQL = {1205, 1213}


def _erro_resposta(erro: ErroNegocio):
    return jsonify({"erro": erro.mensagem, **erro.extras}), erro.status_code


def _eh_erro_deadlock(erro: OperationalError) -> bool:
    orig = getattr(erro, "orig", None)
    args = getattr(orig, "args", ())
    return bool(args and args[0] in CODIGOS_LOCK_MYSQL)


@atendimento_bp.get("/estados")
@atendente_obrigatorio
def listar_regras_estados():
    return jsonify(
        {
            "transicoes_permitidas": obter_mapa_transicoes(),
            "tempo_limite_abandono_segundos": int(
                current_app.config.get("TEMPO_LIMITE_ABANDONO_SEGUNDOS", 120)
            ),
        }
    ), 200


@atendimento_bp.post("/rotinas")
@atendente_obrigatorio
def rodar_rotinas():
    return jsonify(executar_rotinas_automaticas()), 200


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

    max_tentativas = 5
    senha = None

    for tentativa in range(max_tentativas):
        try:
            senha = chamar_proxima_senha(g.usuario_atual, guiche_id)
            break
        except ErroNegocio as erro:
            return _erro_resposta(erro)
        except OperationalError as erro:
            db.session.rollback()
            if _eh_erro_deadlock(erro) and tentativa < max_tentativas - 1:
                time.sleep(random.uniform(0.03, 0.12))
                continue
            return jsonify(
                {"erro": "Concorrência temporária na fila. Tente novamente."}
            ), 409

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