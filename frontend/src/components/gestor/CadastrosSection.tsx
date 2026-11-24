import { Edit3, Plus, Power, UserPlus, X } from 'lucide-react'
import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { useAuth } from '../../hooks/useAuth'
import { extrairMensagemErro } from '../../services/api'
import {
  atualizarGuiche,
  atualizarUsuario,
  criarGuiche,
  criarUsuario,
  desativarGuiche,
  desativarUsuario,
  listarTodosGuiches,
  listarUsuarios,
} from '../../services/gestorService'
import type { Guiche, Usuario } from '../../types'
import { Alert, Badge, Button, Card, Input, Spinner } from '../ui'

interface FeedbackCadastro {
  variant: 'success' | 'error'
  mensagem: string
}

export function CadastrosSection() {
  const { usuario: usuarioLogado } = useAuth()

  const [usuarios, setUsuarios] = useState<Usuario[]>([])
  const [guiches, setGuiches] = useState<Guiche[]>([])
  const [carregando, setCarregando] = useState(true)
  const [feedbackUsuario, setFeedbackUsuario] =
    useState<FeedbackCadastro | null>(null)
  const [feedbackGuiche, setFeedbackGuiche] =
    useState<FeedbackCadastro | null>(null)

  const [editandoUsuarioId, setEditandoUsuarioId] = useState<number | null>(
    null,
  )
  const [nomeUsuario, setNomeUsuario] = useState('')
  const [emailUsuario, setEmailUsuario] = useState('')
  const [senhaUsuario, setSenhaUsuario] = useState('')
  const [salvandoUsuario, setSalvandoUsuario] = useState(false)

  const [editandoGuicheId, setEditandoGuicheId] = useState<number | null>(null)
  const [numeroGuiche, setNumeroGuiche] = useState('')
  const [nomeGuiche, setNomeGuiche] = useState('')
  const [salvandoGuiche, setSalvandoGuiche] = useState(false)

  const [processandoItem, setProcessandoItem] = useState<string | null>(null)

  const carregarCadastros = useCallback(async () => {
    setCarregando(true)
    try {
      const [listaUsuarios, listaGuiches] = await Promise.all([
        listarUsuarios(),
        listarTodosGuiches(),
      ])
      setUsuarios(listaUsuarios)
      setGuiches(listaGuiches)
    } catch (erro) {
      const mensagem = extrairMensagemErro(
        erro,
        'Falha ao carregar atendentes e guichês.',
      )
      setFeedbackUsuario({ variant: 'error', mensagem })
    } finally {
      setCarregando(false)
    }
  }, [])

  useEffect(() => {
    void carregarCadastros()
  }, [carregarCadastros])

  const limparFormUsuario = () => {
    setEditandoUsuarioId(null)
    setNomeUsuario('')
    setEmailUsuario('')
    setSenhaUsuario('')
  }

  const iniciarEdicaoUsuario = (u: Usuario) => {
    setFeedbackUsuario(null)
    setEditandoUsuarioId(u.id)
    setNomeUsuario(u.nome)
    setEmailUsuario(u.email)
    setSenhaUsuario('')
  }

  const handleSalvarUsuario = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setFeedbackUsuario(null)

    const nomeLimpo = nomeUsuario.trim()
    const emailLimpo = emailUsuario.trim().toLowerCase()

    if (!nomeLimpo || !emailLimpo) {
      setFeedbackUsuario({
        variant: 'error',
        mensagem: 'Preencha o nome e o e-mail do atendente.',
      })
      return
    }

    if (editandoUsuarioId === null && senhaUsuario.length < 6) {
      setFeedbackUsuario({
        variant: 'error',
        mensagem: 'A senha inicial deve ter no mínimo 6 caracteres.',
      })
      return
    }

    if (
      editandoUsuarioId !== null &&
      senhaUsuario.length > 0 &&
      senhaUsuario.length < 6
    ) {
      setFeedbackUsuario({
        variant: 'error',
        mensagem: 'A nova senha deve ter no mínimo 6 caracteres.',
      })
      return
    }

    setSalvandoUsuario(true)
    try {
      if (editandoUsuarioId === null) {
        await criarUsuario({
          nome: nomeLimpo,
          email: emailLimpo,
          senha: senhaUsuario,
          eh_gestor: false,
        })
        setFeedbackUsuario({
          variant: 'success',
          mensagem: `Atendente ${nomeLimpo} cadastrado com sucesso.`,
        })
      } else {
        await atualizarUsuario(editandoUsuarioId, {
          nome: nomeLimpo,
          email: emailLimpo,
          ...(senhaUsuario ? { senha: senhaUsuario } : {}),
        })
        setFeedbackUsuario({
          variant: 'success',
          mensagem: `Dados de ${nomeLimpo} atualizados com sucesso.`,
        })
      }

      limparFormUsuario()
      await carregarCadastros()
    } catch (erro) {
      setFeedbackUsuario({
        variant: 'error',
        mensagem: extrairMensagemErro(erro, 'Não foi possível salvar o usuário.'),
      })
    } finally {
      setSalvandoUsuario(false)
    }
  }

  const handleAlternarStatusUsuario = async (u: Usuario) => {
    setFeedbackUsuario(null)
    setProcessandoItem(`usuario-${u.id}`)

    try {
      if (u.ativo) {
        await desativarUsuario(u.id)
        setFeedbackUsuario({
          variant: 'success',
          mensagem: `Usuário ${u.nome} desativado.`,
        })
      } else {
        await atualizarUsuario(u.id, { ativo: true })
        setFeedbackUsuario({
          variant: 'success',
          mensagem: `Usuário ${u.nome} reativado.`,
        })
      }
      await carregarCadastros()
    } catch (erro) {
      setFeedbackUsuario({
        variant: 'error',
        mensagem: extrairMensagemErro(
          erro,
          'Não foi possível alterar o status do usuário.',
        ),
      })
    } finally {
      setProcessandoItem(null)
    }
  }

  const limparFormGuiche = () => {
    setEditandoGuicheId(null)
    setNumeroGuiche('')
    setNomeGuiche('')
  }

  const iniciarEdicaoGuiche = (g: Guiche) => {
    setFeedbackGuiche(null)
    setEditandoGuicheId(g.id)
    setNumeroGuiche(String(g.numero))
    setNomeGuiche(g.nome)
  }

  const handleSalvarGuiche = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setFeedbackGuiche(null)

    const numero = Number(numeroGuiche)
    if (!Number.isInteger(numero) || numero <= 0) {
      setFeedbackGuiche({
        variant: 'error',
        mensagem: 'Informe um número inteiro maior que zero para o guichê.',
      })
      return
    }

    setSalvandoGuiche(true)
    try {
      const nomeLimpo = nomeGuiche.trim()

      if (editandoGuicheId === null) {
        await criarGuiche({
          numero,
          ...(nomeLimpo ? { nome: nomeLimpo } : {}),
        })
        setFeedbackGuiche({
          variant: 'success',
          mensagem: `Guichê ${numero} cadastrado com sucesso.`,
        })
      } else {
        await atualizarGuiche(editandoGuicheId, {
          numero,
          nome: nomeLimpo || `Guichê ${String(numero).padStart(2, '0')}`,
        })
        setFeedbackGuiche({
          variant: 'success',
          mensagem: `Guichê ${numero} atualizado com sucesso.`,
        })
      }

      limparFormGuiche()
      await carregarCadastros()
    } catch (erro) {
      setFeedbackGuiche({
        variant: 'error',
        mensagem: extrairMensagemErro(erro, 'Não foi possível salvar o guichê.'),
      })
    } finally {
      setSalvandoGuiche(false)
    }
  }

  const handleAlternarStatusGuiche = async (g: Guiche) => {
    setFeedbackGuiche(null)
    setProcessandoItem(`guiche-${g.id}`)

    try {
      if (g.ativo) {
        await desativarGuiche(g.id)
        setFeedbackGuiche({
          variant: 'success',
          mensagem: `${g.nome} desativado.`,
        })
      } else {
        await atualizarGuiche(g.id, { ativo: true })
        setFeedbackGuiche({
          variant: 'success',
          mensagem: `${g.nome} reativado.`,
        })
      }
      await carregarCadastros()
    } catch (erro) {
      setFeedbackGuiche({
        variant: 'error',
        mensagem: extrairMensagemErro(
          erro,
          'Não foi possível alterar o status do guichê.',
        ),
      })
    } finally {
      setProcessandoItem(null)
    }
  }

  if (carregando) {
    return (
      <Card>
        <div className="py-10 flex justify-center">
          <Spinner tamanho="md" rotulo="Carregando cadastros..." />
        </div>
      </Card>
    )
  }

  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-start">
      <Card
        titulo="Gestão de Atendentes (AA)"
        subtitulo="Cadastre, edite ou desative atendentes. O sistema mantém exatamente 1 Gestor ativo."
      >
        <div className="space-y-5">
          {feedbackUsuario && (
            <Alert variant={feedbackUsuario.variant}>
              {feedbackUsuario.mensagem}
            </Alert>
          )}

          <form
            onSubmit={(e) => void handleSalvarUsuario(e)}
            className="rounded-xl border border-slate-800 bg-slate-950/70 p-4 space-y-3.5"
          >
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-semibold text-white">
                {editandoUsuarioId === null
                  ? 'Novo Atendente'
                  : 'Editar Atendente'}
              </p>
              {editandoUsuarioId !== null && (
                <Button variant="ghost" size="sm" onClick={limparFormUsuario}>
                  <X aria-hidden="true" className="h-4 w-4" />
                  <span>Cancelar</span>
                </Button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input
                label="Nome completo"
                value={nomeUsuario}
                onChange={(e) => setNomeUsuario(e.target.value)}
                placeholder="Ex: Carlos Lima"
                required
              />
              <Input
                label="E-mail"
                type="email"
                value={emailUsuario}
                onChange={(e) => setEmailUsuario(e.target.value)}
                placeholder="carlos@nassautickets.com"
                required
              />
            </div>

            <Input
              label={
                editandoUsuarioId === null
                  ? 'Senha inicial'
                  : 'Nova senha (opcional)'
              }
              type="password"
              value={senhaUsuario}
              onChange={(e) => setSenhaUsuario(e.target.value)}
              placeholder={
                editandoUsuarioId === null
                  ? 'Mínimo de 6 caracteres'
                  : 'Deixe em branco para manter a atual'
              }
              required={editandoUsuarioId === null}
            />

            <Button
              type="submit"
              variant="primary"
              size="sm"
              className="w-full sm:w-auto"
              carregando={salvandoUsuario}
              textoCarregando="Salvando..."
            >
              <UserPlus aria-hidden="true" className="h-4 w-4" />
              <span>
                {editandoUsuarioId === null
                  ? 'Cadastrar Atendente'
                  : 'Salvar Alterações'}
              </span>
            </Button>
          </form>

          <ul className="divide-y divide-slate-800 rounded-xl border border-slate-800 bg-slate-950/40 overflow-hidden">
            {usuarios.map((u) => {
              const ehProprioUsuario = u.id === usuarioLogado?.id
              const ocupando = processandoItem === `usuario-${u.id}`

              return (
                <li
                  key={u.id}
                  className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-3.5 transition-colors duration-150 hover:bg-slate-800/35"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium text-slate-100">
                        {u.nome}
                      </span>
                      <Badge tone={u.eh_gestor ? 'violet' : 'sky'}>
                        {u.eh_gestor ? 'Gestor' : 'Atendente'}
                      </Badge>
                      <Badge tone={u.ativo ? 'emerald' : 'neutral'}>
                        {u.ativo ? 'Ativo' : 'Inativo'}
                      </Badge>
                    </div>
                    <p className="mt-1 text-xs text-slate-400 truncate">
                      {u.email}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      variant="secondary"
                      size="sm"
                      className="flex-1 sm:flex-initial"
                      onClick={() => iniciarEdicaoUsuario(u)}
                      aria-label={`Editar ${u.nome}`}
                    >
                      <Edit3 aria-hidden="true" className="h-3.5 w-3.5" />
                      <span>Editar</span>
                    </Button>

                    {!ehProprioUsuario && !u.eh_gestor && (
                      <Button
                        variant={u.ativo ? 'danger' : 'success'}
                        size="sm"
                        className="flex-1 sm:flex-initial"
                        carregando={ocupando}
                        onClick={() => void handleAlternarStatusUsuario(u)}
                      >
                        <Power aria-hidden="true" className="h-3.5 w-3.5" />
                        <span>{u.ativo ? 'Desativar' : 'Reativar'}</span>
                      </Button>
                    )}
                  </div>
                </li>
              )
            })}
          </ul>
        </div>
      </Card>

      <Card
        titulo="Gestão de Guichês"
        subtitulo="Adicione, renomeie ou desative guichês universais disponíveis para os atendentes."
      >
        <div className="space-y-5">
          {feedbackGuiche && (
            <Alert variant={feedbackGuiche.variant}>
              {feedbackGuiche.mensagem}
            </Alert>
          )}

          <form
            onSubmit={(e) => void handleSalvarGuiche(e)}
            className="rounded-xl border border-slate-800 bg-slate-950/70 p-4 space-y-3.5"
          >
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-semibold text-white">
                {editandoGuicheId === null ? 'Novo Guichê' : 'Editar Guichê'}
              </p>
              {editandoGuicheId !== null && (
                <Button variant="ghost" size="sm" onClick={limparFormGuiche}>
                  <X aria-hidden="true" className="h-4 w-4" />
                  <span>Cancelar</span>
                </Button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input
                label="Número do guichê"
                type="number"
                min={1}
                value={numeroGuiche}
                onChange={(e) => setNumeroGuiche(e.target.value)}
                placeholder="Ex: 4"
                required
              />
              <Input
                label="Nome de exibição (opcional)"
                value={nomeGuiche}
                onChange={(e) => setNomeGuiche(e.target.value)}
                placeholder="Ex: Guichê 04"
              />
            </div>

            <Button
              type="submit"
              variant="primary"
              size="sm"
              className="w-full sm:w-auto"
              carregando={salvandoGuiche}
              textoCarregando="Salvando..."
            >
              <Plus aria-hidden="true" className="h-4 w-4" />
              <span>
                {editandoGuicheId === null
                  ? 'Cadastrar Guichê'
                  : 'Salvar Alterações'}
              </span>
            </Button>
          </form>

          <ul className="divide-y divide-slate-800 rounded-xl border border-slate-800 bg-slate-950/40 overflow-hidden">
            {guiches.map((g) => {
              const ocupando = processandoItem === `guiche-${g.id}`

              return (
                <li
                  key={g.id}
                  className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-3.5 transition-colors duration-150 hover:bg-slate-800/35"
                >
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium text-slate-100">
                        {g.nome}
                      </span>
                      <Badge tone={g.ativo ? 'emerald' : 'neutral'}>
                        {g.ativo ? 'Ativo' : 'Inativo'}
                      </Badge>
                    </div>
                    <p className="mt-1 text-xs text-slate-400 tabular-nums">
                      Número: {String(g.numero).padStart(2, '0')}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      variant="secondary"
                      size="sm"
                      className="flex-1 sm:flex-initial"
                      onClick={() => iniciarEdicaoGuiche(g)}
                      aria-label={`Editar ${g.nome}`}
                    >
                      <Edit3 aria-hidden="true" className="h-3.5 w-3.5" />
                      <span>Editar</span>
                    </Button>
                    <Button
                      variant={g.ativo ? 'danger' : 'success'}
                      size="sm"
                      className="flex-1 sm:flex-initial"
                      carregando={ocupando}
                      onClick={() => void handleAlternarStatusGuiche(g)}
                    >
                      <Power aria-hidden="true" className="h-3.5 w-3.5" />
                      <span>{g.ativo ? 'Desativar' : 'Reativar'}</span>
                    </Button>
                  </div>
                </li>
              )
            })}
          </ul>
        </div>
      </Card>
    </div>
  )
}