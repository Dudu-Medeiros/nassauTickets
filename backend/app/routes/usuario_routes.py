from flask import Blueprint, g, jsonify, request

from app import db
from app.models import Usuario
from app.utils.auth import gestor_obrigatorio

usuario_bp = Blueprint("usuarios", __name__, url_prefix="/api/usuarios")


def _existe_outro_gestor_ativo(ignorar_id: int | None = None) -> bool:
    query = Usuario.query.filter_by(eh_gestor=True, ativo=True)
    if ignorar_id is not None:
        query = query.filter(Usuario.id != ignorar_id)
    return query.first() is not None


@usuario_bp.get("")
@gestor_obrigatorio
def listar_usuarios():
    usuarios = Usuario.query.order_by(Usuario.eh_gestor.desc(), Usuario.nome.asc()).all()
    return jsonify([u.to_dict() for u in usuarios]), 200


@usuario_bp.get("/<int:usuario_id>")
@gestor_obrigatorio
def obter_usuario(usuario_id: int):
    usuario = db.session.get(Usuario, usuario_id)
    if not usuario:
        return jsonify({"erro": "Usuário não encontrado."}), 404
    return jsonify(usuario.to_dict()), 200


@usuario_bp.post("")
@gestor_obrigatorio
def criar_usuario():
    dados = request.get_json(silent=True) or {}
    nome = (dados.get("nome") or "").strip()
    email = (dados.get("email") or "").strip().lower()
    senha = dados.get("senha") or ""
    eh_gestor = bool(dados.get("eh_gestor", False))

    if not nome or not email or not senha:
        return jsonify({"erro": "Nome, e-mail e senha são obrigatórios."}), 400

    if len(senha) < 6:
        return jsonify({"erro": "A senha deve ter pelo menos 6 caracteres."}), 400

    if Usuario.query.filter_by(email=email).first():
        return jsonify({"erro": "Já existe um usuário com este e-mail."}), 409

    if eh_gestor and _existe_outro_gestor_ativo():
        return jsonify({"erro": "Já existe um Gestor ativo no sistema."}), 409

    usuario = Usuario(nome=nome, email=email, eh_gestor=eh_gestor, ativo=True)
    usuario.definir_senha(senha)

    db.session.add(usuario)
    db.session.commit()

    return jsonify(usuario.to_dict()), 201


@usuario_bp.put("/<int:usuario_id>")
@gestor_obrigatorio
def atualizar_usuario(usuario_id: int):
    usuario = db.session.get(Usuario, usuario_id)
    if not usuario:
        return jsonify({"erro": "Usuário não encontrado."}), 404

    dados = request.get_json(silent=True) or {}

    if "nome" in dados:
        nome = (dados.get("nome") or "").strip()
        if not nome:
            return jsonify({"erro": "O nome não pode ficar vazio."}), 400
        usuario.nome = nome

    if "email" in dados:
        email = (dados.get("email") or "").strip().lower()
        if not email:
            return jsonify({"erro": "O e-mail não pode ficar vazio."}), 400
        existente = Usuario.query.filter(
            Usuario.email == email,
            Usuario.id != usuario.id,
        ).first()
        if existente:
            return jsonify({"erro": "Já existe outro usuário com este e-mail."}), 409
        usuario.email = email

    if "senha" in dados and dados.get("senha"):
        senha = str(dados.get("senha"))
        if len(senha) < 6:
            return jsonify({"erro": "A senha deve ter pelo menos 6 caracteres."}), 400
        usuario.definir_senha(senha)

    novo_eh_gestor = bool(dados.get("eh_gestor", usuario.eh_gestor))
    novo_ativo = bool(dados.get("ativo", usuario.ativo))

    if novo_eh_gestor and novo_ativo and _existe_outro_gestor_ativo(ignorar_id=usuario.id):
        return jsonify({"erro": "Já existe outro Gestor ativo no sistema."}), 409

    if usuario.eh_gestor and usuario.ativo and (not novo_eh_gestor or not novo_ativo):
        if not _existe_outro_gestor_ativo(ignorar_id=usuario.id):
            return jsonify(
                {"erro": "Não é permitido desativar ou remover o único Gestor ativo."}
            ), 400

    usuario.eh_gestor = novo_eh_gestor
    usuario.ativo = novo_ativo

    db.session.commit()
    return jsonify(usuario.to_dict()), 200


@usuario_bp.delete("/<int:usuario_id>")
@gestor_obrigatorio
def desativar_usuario(usuario_id: int):
    usuario = db.session.get(Usuario, usuario_id)
    if not usuario:
        return jsonify({"erro": "Usuário não encontrado."}), 404

    if usuario.id == g.usuario_atual.id:
        return jsonify({"erro": "Você não pode desativar o próprio usuário."}), 400

    if usuario.eh_gestor and not _existe_outro_gestor_ativo(ignorar_id=usuario.id):
        return jsonify({"erro": "Não é permitido desativar o único Gestor ativo."}), 400

    usuario.ativo = False
    db.session.commit()

    return jsonify({"mensagem": "Usuário desativado com sucesso.", "usuario": usuario.to_dict()}), 200