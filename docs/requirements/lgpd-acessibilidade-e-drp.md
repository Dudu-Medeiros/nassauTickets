# Adequação à LGPD, Acessibilidade (WCAG 2.1 AA) e Plano de Recuperação de Desastres (DRP)

Este documento consolida as diretrizes de conformidade legal, inclusão digital e continuidade operacional adotadas no **nassauTickets**.

---

## 1. Adequação à LGPD (Lei nº 13.709/2018)

O projeto adota o princípio de **Privacy by Design** e **Minimização de Dados** (Art. 6º, inciso III da LGPD) como eixo central da arquitetura.

### 1.1 Anonimização Total dos Pacientes (AC)
* **Zero dados pessoais ou sensíveis de saúde:** O Totem de Autoatendimento é 100% anônimo. Não há coleta de nome, CPF, RG, telefone, e-mail, data de nascimento, tipo de exame ou prontuário.
* **Identificação puramente transacional:** O paciente é referenciado exclusivamente por um código alfanumérico temporário (`YYMMDD-PPSQ`) e por uma categoria genérica de fila (`SP`, `SE`, `SG`).
* **Exibição segura no Painel TV:** O painel público nunca exibe nomes de pacientes nem antecipa senhas em espera, mitigando exposição indevida em ambiente de recepção hospitalar/laboratorial.

### 1.2 Tratamento de Dados de Colaboradores (AA e Gestor)
Os únicos dados pessoais armazenados referem-se aos operadores internos do laboratório (`usuarios`): `nome` e `email` corporativo.

| Aspecto LGPD | Medida Implementada |
| :--- | :--- |
| **Base Legal (Art. 7º)** | Execução de contrato de trabalho (inciso V) e legítimo interesse para auditoria operacional e controle de produtividade (inciso IX). |
| **Segurança da Informação (Art. 46)** | Senhas protegidas por hash criptográfico (`Werkzeug`), sessões assinadas com JWT (`Flask-JWT-Extended`) com expiração configurável e variáveis sensíveis isoladas em `.env` fora do versionamento. |
| **Controle de Acesso (Least Privilege)** | Separação rigorosa entre rotas públicas, rotas de atendente (`@atendente_obrigatorio`) e rotas gerenciais (`@gestor_obrigatorio`), com validação de usuário ativo a cada requisição. |
| **Rastreabilidade e Prestação de Contas** | Toda ação crítica gera registro imutável em `logs_auditoria` com autor, timestamp e transição de estado. |
| **Retenção e Desativação** | Colaboradores desligados são desativados logicamente (`ativo = false`), revogando imediatamente o acesso ao sistema (`401`) sem corromper o histórico estatístico de atendimentos. |

---

## 2. Diretrizes de Acessibilidade (WCAG 2.1 — Nível AA)

A interface em React + Tailwind CSS foi construída observando os 4 princípios do WCAG (Perceptível, Operável, Compreensível e Robusto).

### 2.1 Perceptível
* **Alto Contraste:** Paleta escura (`slate-950` / `slate-900`) combinada com tipografia clara (`slate-100` / `white`) e badges de alto contraste (`amber-300`, `sky-300`, `emerald-300`, `rose-300`), atendendo taxa mínima de 4.5:1 para texto normal e 3:1 para texto ampliado.
* **Redundância Visual e Sonora:** Nenhuma informação depende exclusivamente de cor. Categorias exibem sigla + rótulo (`SP — Prioritária`), estados exibem badges textuais e o Painel TV combina destaque visual pulsante com síntese de voz em português (**Web Speech API — `pt-BR`**), anunciando prioridade, número, guichê e o prefixo **"Última chamada"** em `CHAMADA NOVAMENTE`.

### 2.2 Operável
* **Navegação Integral por Teclado:** Todos os botões, abas, filtros, seletores de guichê e links são alcançáveis via `Tab` / `Shift+Tab` com indicador de foco visível (`focus-visible:ring-2`).
* **Skip Links:** Todas as páginas incluem o link *"Pular para o conteúdo principal"* (ou *"Pular para o painel de chamados"*) acessível ao pressionar `Tab` no carregamento da página.
* **Alvos de Toque Amplos:** No Totem (`TotemPage.tsx`), os 3 cartões de emissão ocupam área generosa para facilitar o toque por idosos e pessoas com mobilidade reduzida.

### 2.3 Compreensível
* **Formulários Rotulados e Validação Clara:** Todos os inputs vinculam `<label htmlFor>` via `useId()`, exibem mensagens de erro associadas por `aria-describedby` e marcam estados inválidos com `aria-invalid="true"`.
* **Feedback de Estado e Prevenção de Erros:** Botões em processamento exibem estado `disabled` + `aria-busy="true"` com texto de carregamento; operações destrutivas (encerramento de expediente) exigem confirmação explícita em dois passos; o posto de guichê trava durante atendimento ativo.

### 2.4 Robusto (Semântica e Leitores de Tela)
* Uso de landmarks HTML5 (`<header>`, `<nav>`, `<main>`, `<section>`, `<aside>`, `<footer>`).
* Regiões dinâmicas anotadas com `role="alert"` / `aria-live="assertive"` (erros críticos e chamada atual no Painel TV) e `role="status"` / `aria-live="polite"` (carregamento e comprovante de senha).
* Controles compostos estruturados com `role="tablist"` / `role="tab"` / `aria-selected` (Painel Gestor) e `role="radiogroup"` / `role="radio"` / `aria-checked` (seleção de guichê).

---

## 3. Plano de Recuperação de Desastres (DRP)

O plano cobre falhas de conectividade, indisponibilidade da API Flask, queda do serviço MySQL 8.0 e disputas de concorrência em horário de pico.

### 3.1 Objetivos de Continuidade
* **RPO (Recovery Point Objective):** Próximo a zero para dados confirmados (transações ACID no InnoDB + persistência imediata em disco a cada emissão/transição). Em caso de perda total do host, depende da janela de backup diário configurado.
* **RTO (Recovery Time Objective):** Inferior a 5 segundos para reconexão automática após reinício da API/MySQL; até 15 minutos em cenário de restauração de dump em servidor substituto.

### 3.2 Monitoramento de Disponibilidade
* Os endpoints `GET /health` e `GET /api/health` executam `SELECT 1` diretamente contra o MySQL:
  * **HTTP `200 OK`:** API e banco operacionais (`{"status": "ok", "database": "ok"}`).
  * **HTTP `503 Service Unavailable`:** API no ar, porém banco inacessível (`{"status": "error", "database": "unavailable"}`).

### 3.3 Contingência no Front-end (Modo Degradado Seguro)
* **Painel TV (`/painel`):**
  1. A cada resposta bem-sucedida, as 5 últimas chamadas são gravadas em `localStorage` (`nassautickets:painel_cache_v1`).
  2. Em caso de timeout ou queda da API/banco, o painel **não limpa a tela nem exibe página de erro**: ativa o **Modo Contingência**, mantém visíveis as últimas 5 chamadas (mesmo após recarregar a página com `F5`), exibe banner âmbar com timestamp da última sincronização e contador de tentativas, e dispara reconexão automática a cada 5 segundos (além do botão manual **Reconectar agora**).
  3. Assim que a API responde novamente, o painel volta automaticamente para o selo verde **Online**.
* **Totem de Autoatendimento (`/`):**
  1. Verifica disponibilidade do expediente a cada 15 segundos.
  2. Se a API ficar offline, exibe o alerta *"Sistema temporariamente indisponível"* orientando procurar a recepção, bloqueia cliques em falso e oferece botão **Tentar reconectar**.

### 3.4 Integridade sob Concorrência e Quedas Parciais
* Emissões e chamadas utilizam transação atômica com bloqueio pessimista (`SELECT ... FOR UPDATE`) sobre a linha de controle em `controle_fila`.
* Em caso de deadlock (`MySQL 1213`) ou timeout de lock (`MySQL 1205`), o back-end executa `db.session.rollback()`, aguarda backoff aleatório (`30ms` a `120ms`) e reexecuta automaticamente até 5 vezes antes de responder `409 Conflict`.

### 3.5 Rotina de Backup e Restauração do MySQL 8.0

**Backup lógico diário (após encerramento às 17h):**
```powershell
mysqldump -u root -p --single-transaction --routines --triggers nassautickets > backup_nassautickets_YYYYMMDD.sql
```

**Procedimento de restauração em incidente:**
```powershell
mysql -u root -p -e "CREATE DATABASE IF NOT EXISTS nassautickets CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
mysql -u root -p nassautickets < backup_nassautickets_YYYYMMDD.sql
```

### 3.6 Validação do Plano de Resiliência
A validação automatizada e guiada está implementada em `backend/simular_cenario.py`:
1. `python simular_cenario.py --concorrencia`: comprova integridade do lock e retry sob requisições simultâneas.
2. `python simular_cenario.py --resiliencia`: testa `/health`, `/api/health` e `/api/painel/chamados` e orienta o teste de queda controlada (parando o Flask ou o serviço `MySQL80` com `/painel` aberto).