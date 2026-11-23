import os
from datetime import timedelta
from dotenv import load_dotenv

load_dotenv()


def _parse_bool(valor: str | None, padrao: bool = False) -> bool:
    if valor is None:
        return padrao
    return valor.strip().lower() in ("true", "1", "sim", "yes")


class Config:
    SECRET_KEY = os.getenv("SECRET_KEY", "dev-secret-key")
    JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", "dev-jwt-secret-key")
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(hours=10)
    SQLALCHEMY_DATABASE_URI = os.getenv(
        "DATABASE_URL",
        "mysql+pymysql://root:root@localhost:3306/nassautickets",
    )
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SQLALCHEMY_ENGINE_OPTIONS = {
        "pool_pre_ping": True,
        "pool_recycle": 280,
    }
    EXPEDIENTE_INICIO = os.getenv("EXPEDIENTE_INICIO", "07:00")
    EXPEDIENTE_FIM = os.getenv("EXPEDIENTE_FIM", "17:00")
    MODO_DEMO_SEM_EXPEDIENTE = _parse_bool(
        os.getenv("MODO_DEMO_SEM_EXPEDIENTE"), padrao=False
    )