const CHAVE_TOKEN = 'nassautickets:token'

export const tokenStorage = {
  get(): string | null {
    try {
      return localStorage.getItem(CHAVE_TOKEN)
    } catch {
      return null
    }
  },
  set(token: string): void {
    try {
      localStorage.setItem(CHAVE_TOKEN, token)
    } catch {
      /* armazenamento indisponível */
    }
  },
  clear(): void {
    try {
      localStorage.removeItem(CHAVE_TOKEN)
    } catch {
      /* armazenamento indisponível */
    }
  },
}
