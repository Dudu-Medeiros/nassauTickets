from flask import Blueprint, jsonify, request

from app import db
from app.models import Guiche
from app.utils.auth import atendente_obrigatorio, gestor_obrigatorio

guiche_bp = Blueprint("guiches", __name__, url_prefix="/api/guiches")


@guiche_bp.get("")
@atendente_obrigatorio
def listar_guiches():
    apenas_ativos = request.args.get("ativo")
    query = Guiche.query

    if apenas_ativos is not None:
        valor = apenas_ativos.strip().lower()
        if valor in ("true", "1"):
            query = query.filter_by(ativo=True)
        elif valor in ("false", "0"):
            query = query.filter_by(ativo=False)

    guiches = query.order_by(Guiche.numero.asc()).all()
    return jsonify([g_item.to_dict() for g_item in guiches]), 200


@guiche_bp.get("/<int:guiche_id>")
@atendente_obrigatorio
def obter_guiche(guiche_id: int):
    guiche = db.session.get(Guiche, guiche_id)
    if not guiche:
        return jsonify({"erro": "Guichê não encontrado."}), 404
    return jsonify(guiche.to_dict()), 200


@guiche_bp.post("")
@gestor_obrigatorio
def criar_guiche():
    dados = request.get_json(silent=True) or {}
    numero = dados.get("numero")

    try:
        numero = int(numero)
    except (TypeError, ValueError):
        return jsonify({"erro": "Informe um número inteiro válido para o guichê."}), 400

    if numero <= 0:
        return jsonify({"erro": "O número do guichê deve ser maior que zero."}), 400

    if Guiche.query.filter_by(numero=numero).first():
        return jsonify({"erro": "Já existe um guichê com este número."}), 409

    nome = (dados.get("nome") or f"Guichê {numero:02d}").strip()
    guiche = Guiche(numero=numero, nome=nome, ativo=True)

    db.session.add(guiche)
    db.session.commit()

    return jsonify(guiche.to_dict()), 201


@guiche_bp.put("/<int:guiche_id>")
@gestor_obrigatorio
def atualizar_guiche(guiche_id: int):
    guiche = db.session.get(Guiche, guiche_id)
    if not guiche:
        return jsonify({"erro": "Guichê não encontrado."}), 404

    dados = request.get_json(silent=True) or {}

    if "numero" in dados:
        try:
            numero = int(dados.get("numero"))
        except (TypeError, ValueError):
            return jsonify({"erro": "Número do guichê inválido."}), 400

        if numero <= 0:
            return jsonify({"erro": "O número do guichê deve ser maior que zero."}), 400

        existente = Guiche.query.filter(
            Guiche.numero == numero,
            Guiche.id != guiche.id,
        ).first()
        if existente:
            return jsonify({"erro": "Já existe outro guichê com este número."}), 409
        guiche.numero = numero

    if "nome" in dados:
        nome = (dados.get("nome") or "").strip()
        if not nome:
            return jsonify({"erro": "O nome do guichê não pode ficar vazio."}), 400
        guiche.nome = nome

    if "ativo" in dados:
        guiche.ativo = bool(dados.get("ativo"))

    db.session.commit()
    return jsonify(guiche.to_dict()), 200


@guiche_bp.delete("/<int:guiche_id>")
@gestor_obrigatorio
def desativar_guiche(guiche_id: int):
    guiche = db.session.get(Guiche, guiche_id)
    if not guiche:
        return jsonify({"erro": "Guichê não encontrado."}), 404

    guiche.ativo = False
    db.session.commit()

    return jsonify({"mensagem": "Guichê desativado com sucesso.", "guiche": guiche.to_dict()}), 200