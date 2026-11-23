from datetime import datetime

from flask import Blueprint, jsonify
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError

from app import db

health_bp = Blueprint("health", __name__)


@health_bp.get("/health")
@health_bp.get("/api/health")
def verificar_saude():
    try:
        db.session.execute(text("SELECT 1"))
        return jsonify(
            {
                "status": "ok",
                "service": "nassauTickets-api",
                "database": "ok",
                "timestamp": datetime.now().isoformat(),
            }
        ), 200
    except SQLAlchemyError:
        db.session.rollback()
        return jsonify(
            {
                "status": "error",
                "service": "nassauTickets-api",
                "database": "unavailable",
                "timestamp": datetime.now().isoformat(),
            }
        ), 503