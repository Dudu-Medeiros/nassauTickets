import { useCallback, useEffect, useRef, useState } from 'react'
import { Volume2, VolumeX, WifiOff } from 'lucide-react'
import { Alert, Button } from '../components/ui'
import { anunciar, vozDisponivel } from '../services/voz'
import { chaveChamada, lerCache, obterChamados, salvarCache } from '../services/painelService'
import type { ChamadoPainel, PainelChamados } from '../types'

const INTERVALO_MS = 3000
const INTERVALO_RECONEXAO_MS = 5000

function CartaoChamada({ chamada }: { chamada: ChamadoPainel }) {
  return (
    <div className={`flex items-center justify-between rounded-lg border px-4 py-3 ${chamada.eh_segunda_chamada ? 'border-amber-400' : 'border-slate-700'} bg-slate-900`}>
      <div>
        <p className="font-mono text-2xl font-bold">{chamada.codigo}</p>
        <p className="text-sm text-slate-300">
          {chamada.prioridade_label} · {chamada.rotulo_chamada}
        </p>
      </div>
      <p className="text-xl font-semibold">Guichê {chamada.guiche_numero ?? '—'}</p>
    </div>
  )
}

export default function PainelPage() {
  const [painel, setPainel] = useState<PainelChamados | null>(() => lerCache())
  const [offline, setOffline] = useState(false)
  const [audioAtivo, setAudioAtivo] = useState(false)
  const ultimaChaveRef = useRef<string | null>(null)
  const primeiraCargaRef = useRef(true)
  const audioAtivoRef = useRef(false)

  useEffect(() => {
    audioAtivoRef.current = audioAtivo
  }, [audioAtivo])

  const atualizar = useCallback(async () => {
    try {
      const dados = await obterChamados()
      setPainel(dados)
      setOffline(false)
      salvarCache(dados)

      const atual = dados.chamada_atual
      const chave = atual ? chaveChamada(atual) : null
      // Não anuncia o que já estava no painel ao abrir/recarregar a tela.
      if (!primeiraCargaRef.current && atual && chave !== ultimaChaveRef.current && audioAtivoRef.current) {
        anunciar(atual)
      }
      primeiraCargaRef.current = false
      ultimaChaveRef.current = chave
    } catch {
      setOffline(true) // mantém o último estado/cache na tela e tenta de novo
    }
  }, [])

  // Polling normal; em modo offline tenta reconectar em intervalo próprio.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void atualizar()
    const id = setInterval(atualizar, offline ? INTERVALO_RECONEXAO_MS : INTERVALO_MS)
    return () => clearInterval(id)
  }, [atualizar, offline])

  function alternarAudio() {
    // navegadores só liberam áudio após um gesto do usuário
    if (!audioAtivo && painel?.chamada_atual) window.speechSynthesis?.cancel()
    setAudioAtivo((v) => !v)
  }

  const atual = painel?.chamada_atual ?? null
  const anteriores = (painel?.chamados ?? []).filter((c) => !atual || chaveChamada(c) !== chaveChamada(atual))

  return (
    <main className="flex min-h-screen flex-col gap-6 bg-slate-950 p-8 text-slate-100">
      <header className="flex items-center justify-between gap-4">
        <h1 className="text-3xl font-bold tracking-tight">Painel de Chamados</h1>
        {vozDisponivel() && (
          <Button variante="secondary" onClick={alternarAudio} aria-pressed={audioAtivo}>
            {audioAtivo ? <Volume2 className="size-5" aria-hidden="true" /> : <VolumeX className="size-5" aria-hidden="true" />}
            {audioAtivo ? 'Áudio ativado' : 'Ativar áudio'}
          </Button>
        )}
      </header>

      {offline && (
        <Alert tipo="erro">
          <span className="inline-flex items-center gap-2 font-medium">
            <WifiOff className="size-4" aria-hidden="true" />
            Sem conexão com o sistema.
          </span>{' '}
          Exibindo as últimas chamadas conhecidas. Tentando reconectar automaticamente…
        </Alert>
      )}

      <section aria-label="Chamada atual" aria-live="polite" className="rounded-2xl border-2 border-sky-400 bg-slate-900 p-10 text-center">
        {atual ? (
          <>
            <p className="text-xl text-slate-300">
              {atual.rotulo_chamada} · {atual.prioridade_label}
            </p>
            <p className="my-4 font-mono text-8xl font-bold tracking-wider">{atual.codigo}</p>
            <p className="text-4xl font-semibold">Guichê {atual.guiche_numero ?? '—'}</p>
            {atual.eh_segunda_chamada && <p className="mt-3 text-2xl font-semibold text-amber-300">Última chamada</p>}
          </>
        ) : (
          <p className="text-3xl text-slate-300">Aguardando as primeiras chamadas</p>
        )}
      </section>

      <section aria-label="Últimas chamadas" className="flex flex-col gap-3">
        <h2 className="text-xl font-semibold">Últimas chamadas</h2>
        {anteriores.length === 0 ? (
          <p className="text-slate-300">Nenhuma chamada anterior.</p>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2">
            {anteriores.map((c) => (
              <li key={chaveChamada(c)}>
                <CartaoChamada chamada={c} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  )
}
