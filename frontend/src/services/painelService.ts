import type { RespostaPainelChamados } from '../types'
import { api } from './api'

const CACHE_PAINEL_KEY = 'nassautickets:painel_cache_v1'
const MAX_CHAMADOS = 5

export interface CachePainel {
  dados: RespostaPainelChamados
  salvoEm: string
}

function sanitizarResposta(
  dados: RespostaPainelChamados,
): RespostaPainelChamados {
  const chamadosLimitados = Array.isArray(dados.chamados)
    ? dados.chamados.slice(0, MAX_CHAMADOS)
    : []

  return {
    chamada_atual: dados.chamada_atual ?? chamadosLimitados[0] ?? null,
    chamados: chamadosLimitados,
    total: chamadosLimitados.length,
    atualizado_em: dados.atualizado_em || new Date().toISOString(),
  }
}

export async function obterUltimosChamados(): Promise<RespostaPainelChamados> {
  const { data } = await api.get<RespostaPainelChamados>('/painel/chamados', {
    timeout: 6000,
  })
  const sanitizado = sanitizarResposta(data)
  salvarCachePainel(sanitizado)
  return sanitizado
}

export function salvarCachePainel(dados: RespostaPainelChamados): void {
  try {
    const payload: CachePainel = {
      dados: sanitizarResposta(dados),
      salvoEm: new Date().toISOString(),
    }
    localStorage.setItem(CACHE_PAINEL_KEY, JSON.stringify(payload))
  } catch {
    // storage indisponivel no navegador
  }
}

export function lerCachePainel(): CachePainel | null {
  try {
    const bruto = localStorage.getItem(CACHE_PAINEL_KEY)
    if (!bruto) return null
    const parsed = JSON.parse(bruto) as Partial<CachePainel>
    if (!parsed || !parsed.dados || !Array.isArray(parsed.dados.chamados)) {
      return null
    }
    return {
      dados: sanitizarResposta(parsed.dados),
      salvoEm: parsed.salvoEm || parsed.dados.atualizado_em,
    }
  } catch {
    return null
  }
}