import { Card } from '../components/ui'

export default function NotFoundPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 p-6 text-slate-100">
      <Card className="w-full max-w-md text-center">
        <h1 className="text-2xl font-semibold tracking-tight">Página não encontrada</h1>
        <p className="mt-2 text-sm text-slate-300">O endereço acessado não existe.</p>
      </Card>
    </main>
  )
}
