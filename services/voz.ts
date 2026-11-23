import type { ChamadoPainel } from '../types'

export function vozDisponivel(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window
}

/** Texto falado: prioridade, número sequencial e guichê. 2ª chamada começa com "Última chamada." */
export function montarTextoAnuncio(c: ChamadoPainel): string {
  const numero = c.codigo.match(/(\d+)$/)?.[1]
  const sequencial = numero ? String(Number(numero)) : c.codigo
  const guiche = c.guiche_numero !== null ? `guichê ${c.guiche_numero}` : 'o guichê indicado'
  const base = `Senha ${c.prioridade_label.toLowerCase()}, número ${sequencial}, ${guiche}.`
  return c.eh_segunda_chamada ? `Última chamada. ${base}` : base
}

export function anunciar(c: ChamadoPainel): void {
  if (!vozDisponivel()) return
  const fala = new SpeechSynthesisUtterance(montarTextoAnuncio(c))
  fala.lang = 'pt-BR'
  fala.rate = 0.9
  window.speechSynthesis.speak(fala)
}
