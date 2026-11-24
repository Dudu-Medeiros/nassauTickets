function escaparCelulaCsv(valor: unknown): string {
  if (valor === null || valor === undefined) return ''
  const texto = String(valor)
  if (
    texto.includes(';') ||
    texto.includes('"') ||
    texto.includes('\n') ||
    texto.includes('\r')
  ) {
    return `"${texto.replace(/"/g, '""')}"`
  }
  return texto
}

function dispararDownload(blob: Blob, nomeArquivo: string): void {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = nomeArquivo
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

export function exportarCsv(
  nomeArquivo: string,
  cabecalhos: string[],
  linhas: Array<Array<unknown>>,
): void {
  const linhasCsv = [
    cabecalhos.map(escaparCelulaCsv).join(';'),
    ...linhas.map((linha) => linha.map(escaparCelulaCsv).join(';')),
  ]
  const conteudo = `\uFEFF${linhasCsv.join('\r\n')}`
  const blob = new Blob([conteudo], { type: 'text/csv;charset=utf-8;' })
  const nomeFinal = nomeArquivo.endsWith('.csv')
    ? nomeArquivo
    : `${nomeArquivo}.csv`
  dispararDownload(blob, nomeFinal)
}

export function exportarJson(nomeArquivo: string, dados: unknown): void {
  const conteudo = JSON.stringify(dados, null, 2)
  const blob = new Blob([conteudo], {
    type: 'application/json;charset=utf-8;',
  })
  const nomeFinal = nomeArquivo.endsWith('.json')
    ? nomeArquivo
    : `${nomeArquivo}.json`
  dispararDownload(blob, nomeFinal)
}