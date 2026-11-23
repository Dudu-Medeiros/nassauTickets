from flask import Flask, jsonify
from flask_cors import CORS
from flask_jwt_extended import JWTManager
from flask_migrate import Migrate
from flask_sqlalchemy import SQLAlchemy

from app.config import Config

db = SQLAlchemy()
migrate = Migrate()
jwt = JWTManager()


def create_app() -> Flask:
    app = Flask(__name__)
    app.config.from_object(Config)

    CORS(app)
    db.init_app(app)
    migrate.init_app(app, db)
    jwt.init_app(app)

    @jwt.unauthorized_loader
    def token_ausente(_motivo):
        return jsonify({"erro": "Token de autenticação não informado."}), 401

    @jwt.invalid_token_loader
    def token_invalido(_motivo):
        return jsonify({"erro": "Token de autenticação inválido."}), 401

    @jwt.expired_token_loader
    def token_expirado(_jwt_header, _jwt_payload):
        return jsonify({"erro": "Sessão expirada. Faça login novamente."}), 401

    from app import models  # noqa: F401
    from app.routes import (
        atendimento_bp,
        auth_bp,
        guiche_bp,
        health_bp,
        painel_bp,
        senha_bp,
        usuario_bp,
    )

    app.register_blueprint(health_bp)
    app.register_blueprint(auth_bp)
    app.register_blueprint(usuario_bp)
    app.register_blueprint(guiche_bp)
    app.register_blueprint(senha_bp)
    app.register_blueprint(atendimento_bp)
    app.register_blueprint(painel_bp)

    return app