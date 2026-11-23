import type { ChamadoPainel, PainelChamados } from '../types'
import { api } from './api'

const CHAVE_CACHE = 'nassautickets:painel-cache'

export async function obterChamados(): Promise<PainelChamados> {
  const { data } = await api.get<PainelChamados>('/painel/chamados')
  return data
}

/** Guarda os últimos chamados para exibir se a API/banco cair. */
export function salvarCache(painel: PainelChamados): void {
  try {
    localStorage.setItem(CHAVE_CACHE, JSON.stringify(painel))
  } catch {
    /* armazenamento indisponível */
  }
}

export function lerCache(): PainelChamados | null {
  try {
    const bruto = localStorage.getItem(CHAVE_CACHE)
    if (!bruto) return null
    const dados = JSON.parse(bruto) as PainelChamados
    return Array.isArray(dados.chamados) ? dados : null
  } catch {
    return null
  }
}

/** Identifica uma chamada específica (a mesma senha pode ser chamada 2 vezes). */
export function chaveChamada(c: ChamadoPainel): string {
  return `${c.id}:${c.numero_chamada}:${c.chamada_em ?? ''}`
}
