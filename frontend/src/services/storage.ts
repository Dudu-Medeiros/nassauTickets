const TOKEN_KEY = 'nassautickets:access_token'

export function obterToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY)
  } catch {
    return null
  }
}

export function salvarToken(token: string): void {
  try {
    localStorage.setItem(TOKEN_KEY, token)
  } catch {
    // storage indisponivel no navegador
  }
}

export function removerToken(): void {
  try {
    localStorage.removeItem(TOKEN_KEY)
  } catch {
    // storage indisponivel no navegador
  }
}