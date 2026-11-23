from datetime import date, datetime

from sqlalchemy import desc, func

from app.models import Senha, TipoSenha
from app.services.atendimento_service import executar_rotinas_automaticas

ROTULOS_PRIORIDADE = {
    TipoSenha.SP.value: "Prioritária",
    TipoSenha.SE.value: "Exames",
    TipoSenha.SG.value: "Geral",
}


def _serializar_chamado_painel(senha: Senha) -> dict:
    eh_segunda_chamada = senha.segunda_chamada_em is not None
    momento_chamada = senha.segunda_chamada_em or senha.primeira_chamada_em

    return {
        "id": senha.id,
        "codigo": senha.codigo,
        "tipo": senha.tipo,
        "prioridade_label": ROTULOS_PRIORIDADE.get(senha.tipo, senha.tipo),
        "status": senha.status,
        "guiche_numero": senha.guiche.numero if senha.guiche else None,
        "guiche_nome": senha.guiche.nome if senha.guiche else None,
        "numero_chamada": 2 if eh_segunda_chamada else 1,
        "eh_segunda_chamada": eh_segunda_chamada,
        "rotulo_chamada": "2ª CHAMADA" if eh_segunda_chamada else "1ª CHAMADA",
        "chamada_em": momento_chamada.isoformat() if momento_chamada else None,
    }


def obter_ultimos_chamados_painel() -> dict:
    executar_rotinas_automaticas()

    hoje = date.today()
    momento_ultima_chamada = func.coalesce(
        Senha.segunda_chamada_em,
        Senha.primeira_chamada_em,
    )

    ultimas_senhas = (
        Senha.query.filter(
            Senha.data_referencia == hoje,
            Senha.primeira_chamada_em.is_not(None),
        )
        .order_by(desc(momento_ultima_chamada), desc(Senha.id))
        .limit(5)
        .all()
    )

    chamados = [_serializar_chamado_painel(senha) for senha in ultimas_senhas]

    return {
        "chamada_atual": chamados[0] if chamados else None,
        "chamados": chamados,
        "total": len(chamados),
        "atualizado_em": datetime.now().isoformat(),
    }