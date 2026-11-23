from flask import Blueprint, jsonify, request

from app.services import (
    ErroNegocio,
    gerar_relatorio_auditoria,
    gerar_relatorio_desempenho,
    gerar_relatorio_detalhado,
    gerar_relatorio_quantitativo,
    gerar_relatorio_tempo_medio,
)
from app.utils.auth import gestor_obrigatorio

relatorio_bp = Blueprint("relatorios", __name__, url_prefix="/api/relatorios")


def _erro_resposta(erro: ErroNegocio):
    return jsonify({"erro": erro.mensagem, **erro.extras}), erro.status_code


def _parse_int_opcional(nome_param: str) -> int | None:
    valor = request.args.get(nome_param)
    if valor is None or valor.strip() == "":
        return None
    try:
        return int(valor)
    except ValueError:
        raise ErroNegocio(
            f"Parâmetro '{nome_param}' deve ser um número inteiro.",
            status_code=400,
        )


@relatorio_bp.get("/quantitativo")
@gestor_obrigatorio
def relatorio_quantitativo():
    try:
        resultado = gerar_relatorio_quantitativo(
            periodo=request.args.get("periodo"),
            data_str=request.args.get("data"),
            mes_str=request.args.get("mes"),
        )
    except ErroNegocio as erro:
        return _erro_resposta(erro)

    return jsonify(resultado), 200


@relatorio_bp.get("/detalhado")
@gestor_obrigatorio
def relatorio_detalhado():
    try:
        resultado = gerar_relatorio_detalhado(
            periodo=request.args.get("periodo"),
            data_str=request.args.get("data"),
            mes_str=request.args.get("mes"),
            tipo_filtro=request.args.get("tipo"),
            status_filtro=request.args.get("status"),
        )
    except ErroNegocio as erro:
        return _erro_resposta(erro)

    return jsonify(resultado), 200


@relatorio_bp.get("/tempo-medio")
@gestor_obrigatorio
def relatorio_tempo_medio():
    try:
        resultado = gerar_relatorio_tempo_medio(
            periodo=request.args.get("periodo"),
            data_str=request.args.get("data"),
            mes_str=request.args.get("mes"),
        )
    except ErroNegocio as erro:
        return _erro_resposta(erro)

    return jsonify(resultado), 200


@relatorio_bp.get("/auditoria")
@gestor_obrigatorio
def relatorio_auditoria():
    try:
        atendente_id = _parse_int_opcional("atendente_id")
        guiche_id = _parse_int_opcional("guiche_id")
        resultado = gerar_relatorio_auditoria(
            periodo=request.args.get("periodo"),
            data_str=request.args.get("data"),
            mes_str=request.args.get("mes"),
            acao=request.args.get("acao"),
            senha_codigo=request.args.get("senha_codigo"),
            atendente_id=atendente_id,
            guiche_id=guiche_id,
        )
    except ErroNegocio as erro:
        return _erro_resposta(erro)

    return jsonify(resultado), 200


@relatorio_bp.get("/desempenho")
@gestor_obrigatorio
def relatorio_desempenho():
    try:
        resultado = gerar_relatorio_desempenho(
            periodo=request.args.get("periodo"),
            data_str=request.args.get("data"),
            mes_str=request.args.get("mes"),
        )
    except ErroNegocio as erro:
        return _erro_resposta(erro)

    return jsonify(resultado), 200