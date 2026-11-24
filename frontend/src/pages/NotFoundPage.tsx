import { Link } from 'react-router-dom'
import { PageShell } from '../components/layout/PageShell'
import { Card } from '../components/ui'

export default function NotFoundPage() {
  return (
    <PageShell
      titulo="Página não encontrada"
      subtitulo="O endereço informado não existe no sistema."
      maxWidthClass="max-w-lg"
    >
      <Card>
        <div className="space-y-4">
          <p className="text-sm text-slate-300">
            Verifique o endereço ou retorne ao Totem de Autoatendimento.
          </p>
          <Link
            to="/"
            className="inline-flex items-center rounded-xl bg-sky-500 px-4 py-2.5 text-sm font-semibold text-slate-950 hover:bg-sky-400 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300"
          >
            Voltar ao início
          </Link>
        </div>
      </Card>
    </PageShell>
  )
}