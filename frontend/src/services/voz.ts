import { STATUS_SENHA, type ChamadoPainel } from '../types'

export function ttsSuportado(): boolean {
  return (
    typeof window !== 'undefined' &&
    'speechSynthesis' in window &&
    'SpeechSynthesisUtterance' in window
  )
}

function extrairSequencial(codigo: string): string {
  const sufixo = codigo.includes('-') ? codigo.split('-')[1] : codigo
  const digitos = sufixo.replace(/\D/g, '')
  if (!digitos) return codigo
  return String(Number(digitos))
}

function obterVozPtBr(): SpeechSynthesisVoice | null {
  if (!ttsSuportado()) return null
  const vozes = window.speechSynthesis.getVoices()
  if (!vozes.length) return null

  return (
    vozes.find((v) => v.lang.toLowerCase() === 'pt-br') ??
    vozes.find((v) => v.lang.toLowerCase().startsWith('pt')) ??
    null
  )
}

export function montarTextoAnuncio(chamado: ChamadoPainel): string {
  const ehUltimaChamada =
    chamado.eh_segunda_chamada ||
    chamado.status === STATUS_SENHA.CHAMADA_NOVAMENTE

  const prefixo = ehUltimaChamada ? 'Última chamada. ' : ''
  const sequencial = extrairSequencial(chamado.codigo)
  const destino =
    chamado.guiche_numero !== null
      ? `Guichê ${chamado.guiche_numero}`
      : chamado.guiche_nome || 'recepção'

  return `${prefixo}Senha ${chamado.prioridade_label}, número ${sequencial}. Comparecer ao ${destino}.`
}

export function pararAnuncio(): void {
  if (!ttsSuportado()) return
  window.speechSynthesis.cancel()
}

export function falarTexto(texto: string): boolean {
  if (!ttsSuportado()) return false

  try {
    window.speechSynthesis.cancel()
    const utterance = new SpeechSynthesisUtterance(texto)
    utterance.lang = 'pt-BR'
    utterance.rate = 0.96
    utterance.pitch = 1

    const voz = obterVozPtBr()
    if (voz) {
      utterance.voice = voz
    }

    window.speechSynthesis.speak(utterance)
    return true
  } catch {
    return false
  }
}

export function anunciarChamado(chamado: ChamadoPainel): boolean {
  return falarTexto(montarTextoAnuncio(chamado))
}