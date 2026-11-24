# Engenharia de Requisitos e Regras de Negócio — nassauTickets

Este documento especifica os Requisitos Funcionais (RF), Requisitos Não Funcionais (RNF), Regras de Negócio (RN) e Casos de Uso (UC) implementados no sistema **nassauTickets** para controle de filas e atendimento em um Laboratório de Análises Clínicas.

---

## 1. Atores e Siglas do Sistema

| Sigla | Termo | Descrição |
| :--- | :--- | :--- |
| **AC** | Agente Cliente (Paciente) | Usuário anônimo que utiliza o Totem para retirar senhas e acompanha as chamadas no Painel TV. |
| **AA** | Agente Atendente | Colaborador autenticado que opera um guichê universal, chama senhas e conduz o atendimento. |
| **Gestor** | AA com Perfil de Gestor | Único atendente com permissão adicional (`eh_gestor = true`) responsável por cadastros, relatórios, auditoria e encerramento de expediente. |
| **AS** | Agente Sistema | Ente computacional (API Flask + MySQL 8.0) que executa as regras de negócio, priorização, rotinas automáticas (abandono após 120s e descarte às 17h), atualização do painel e auditoria. |
| **SA** | Serviço de Atendimento | Execução completa do atendimento ao cliente no guichê, cuja duração compõe o Tempo Médio (**TM**). |

---

## 2. Requisitos Funcionais (RF)

| Código | Requisito Funcional | Módulo |
| :--- | :--- | :--- |
| **RF01** | Permitir emissão pública e anônima de senhas nas categorias Prioritária (`SP`), Exames (`SE`) e Geral (`SG`), exibindo comprovante com código `YYMMDD-PPSQ` e opção de impressão. | Totem (AC) |
| **RF02** | Bloquear automaticamente a emissão de novas senhas fora do horário oficial de expediente (`07:00` às `17:00`) com mensagem orientativa ao paciente. | Totem / AS |
| **RF03** | Exibir em painel público (Painel TV) o destaque da última chamada e a lista estrita das **5 últimas senhas chamadas**, exibindo código, prioridade, guichê, status atual e indicador de 1ª ou 2ª chamada. | Painel TV |
| **RF04** | Anunciar automaticamente as chamadas por voz via Web Speech API (`pt-BR`) informando prioridade, número sequencial e guichê, adicionando o prefixo **"Última chamada"** em caso de 2ª chamada. | Painel TV |
| **RF05** | Autenticar atendentes e gestor via e-mail e senha com emissão de token JWT (`Bearer`), redirecionando automaticamente o Gestor para `/gestor` e o Atendente para `/atendente`. | Autenticação |
| **RF06** | Permitir ao Gestor cadastrar, listar, editar, desativar e reativar atendentes (AA) e guichês universais. | Painel Gestor |
| **RF07** | Permitir ao Atendente selecionar e fixar seu guichê de operação, bloqueando a troca enquanto houver senha ativa em atendimento ou chamada. | Terminal AA |
| **RF08** | Permitir ao Atendente executar o ciclo de atendimento: **Chamar Próximo**, **Chamar Novamente** (2ª chamada), **Iniciar Atendimento**, **Finalizar Atendimento** e **Não Compareceu**. | Terminal AA |
| **RF09** | Exibir no Terminal do Atendente o cronômetro de atendimento em tempo real (`EM_ATENDIMENTO`), contagem regressiva para abandono na 2ª chamada e o resumo da fila aguardando. | Terminal AA |
| **RF10** | Selecionar automaticamente a próxima senha seguindo o ciclo alternado de priorização `[SP] → [SE | SG]` com controle transacional de concorrência. | Motor de Fila (AS) |
| **RF11** | Executar o encerramento do expediente (automático a partir das `17:00` ou manual pelo Gestor), descartando senhas em `AGUARDANDO` e preservando senhas em `EM_ATENDIMENTO`. | Motor de Fila / Gestor |
| **RF12** | Disponibilizar ao Gestor relatórios com filtros **diário** e **mensal**: Quantitativo (geral e por prioridade), Tempo Médio (TM e TME), Detalhado, Trilha de Auditoria e Desempenho por Atendente/Guichê. | Painel Gestor |
| **RF13** | Permitir exportação dos relatórios gerenciais nos formatos **CSV** (UTF-8 com BOM, compatível com Excel PT-BR) e **JSON**. | Painel Gestor |
| **RF14** | Registrar trilha de auditoria imutável para todas as emissões, mudanças de estado, abandonos automáticos e encerramentos de expediente. | AS / Auditoria |
| **RF15** | Disponibilizar endpoints de monitoramento de saúde (`/health` e `/api/health`) validando conectividade real com o banco de dados MySQL. | Infraestrutura |

---

## 3. Requisitos Não Funcionais (RNF)

| Código | Categoria | Requisito Não Funcional |
| :--- | :--- | :--- |
| **RNF01** | Segurança | Senhas de colaboradores devem ser armazenadas exclusivamente como hash criptográfico (`Werkzeug`). Endpoints restritos devem validar assinatura JWT e perfil (`@atendente_obrigatorio` / `@gestor_obrigatorio`). |
| **RNF02** | Concorrência | A seleção da próxima senha deve utilizar bloqueio pessimista em banco de dados (`SELECT ... FOR UPDATE`) com tratamento automático de retry para deadlocks (`MySQL 1213 / 1205`), garantindo zero duplicidade de chamada. |
| **RNF03** | Disponibilidade / DRP | Em caso de falha de comunicação com a API ou queda do banco de dados, o Painel TV deve ativar modo de contingência exibindo as 5 últimas chamadas armazenadas em `localStorage`, com reconexão automática a cada 5 segundos. |
| **RNF04** | Privacidade (LGPD) | O sistema não deve coletar nem armazenar dados pessoais identificáveis de pacientes (nome, CPF, telefone ou dados clínicos) na emissão de senhas. |
| **RNF05** | Acessibilidade | As interfaces devem seguir diretrizes WCAG 2.1 Nível AA: contraste adequado em tema escuro, navegação integral via teclado, *skip links*, foco visível e atributos ARIA (`role`, `aria-live`, `aria-invalid`, `aria-busy`). |
| **RNF06** | Desempenho | O tempo de resposta das rotas de emissão, chamada e painel deve permanecer inferior a 500 ms em operação normal, com atualização automática periódica (3s no Painel TV, 5s no Terminal AA). |
| **RNF07** | Integridade | Exclusões de atendentes e guichês devem ser lógicas (`ativo = false`), preservando chaves estrangeiras, métricas históricas e integridade da auditoria. |
| **RNF08** | Portabilidade | Back-end compatível com Python 3.11+ / MySQL 8.0 e Front-end compatível com navegadores modernos (Chrome, Edge, Firefox) em desktop, totem touch e telas de TV Full HD. |

---

## 4. Regras de Negócio (RN)

- **RN01 — Codificação e Reinício Diário de Senhas:** Toda senha segue estritamente o padrão `YYMMDD-PPSQ` (ano com 2 dígitos, mês, dia, sigla da prioridade e sequencial de 3 dígitos com zero à esquerda, ex.: `261124-SP001`). O contador sequencial reinicia em `001` a cada dia por categoria (`SP`, `SE`, `SG`).
- **RN02 — Ciclo de Priorização Alternado:** O motor de chamada alterna entre uma senha prioritária (`SP`) e uma senha não prioritária (`SE` com precedência sobre `SG`), respeitando o fluxo `[SP] → [SE | SG] → [SP] → [SE | SG]` e ordem cronológica (FIFO) dentro da mesma categoria. Caso a fila da vez esteja vazia, o AS avança automaticamente para a próxima categoria disponível.
- **RN03 — Máquina de Estados (7 Estados):** Toda senha percorre exclusivamente transições válidas entre os estados `EMITIDA`, `AGUARDANDO`, `CHAMADA`, `CHAMADA NOVAMENTE`, `EM_ATENDIMENTO`, `ATENDIDA` e `NÃO_COMPARECEU`. Ao ser emitida, transita atomicamente de `EMITIDA` para `AGUARDANDO`.
- **RN04 — Abandono Automático (120s) e Taxa Histórica de 5%:** Se o AC não comparecer na 1ª chamada, o AA aciona a 2ª chamada (`CHAMADA NOVAMENTE`). Decorridos 120 segundos (`TEMPO_LIMITE_ABANDONO_SEGUNDOS`) sem início do SA (ou mediante marcação manual), o AS altera o estado para `NÃO_COMPARECEU` e descarta o atendimento sem execução do SA. Conforme dados históricos da especificação, aproximadamente **5%** das senhas emitidas resultam em abandono/não atendimento, comportamento reproduzido no script de simulação (`backend/simular_cenario.py`).
- **RN05 — Limite Estrito do Painel TV:** O endpoint `/api/painel/chamados` retorna exclusivamente as **5 últimas senhas efetivamente chamadas no dia**, ordenadas pelo timestamp mais recente entre 1ª e 2ª chamada. A próxima senha da fila de espera nunca é exposta publicamente.
- **RN06 — Guichês Universais e Exclusividade de Atendimento:** Qualquer guichê atende qualquer tipo de senha (`SP`, `SE` ou `SG`). Cada AA autenticado e cada guichê ativo podem manter no máximo **1 senha aberta** (`CHAMADA`, `CHAMADA NOVAMENTE` ou `EM_ATENDIMENTO`) por vez; tentativas simultâneas retornam HTTP `409 Conflict`.
- **RN07 — Janela de Expediente (07h–17h):** A emissão e novas chamadas ocorrem das `07:00` às `17:00` (podendo ser flexibilizadas via `MODO_DEMO_SEM_EXPEDIENTE=true` em ambiente de demonstração).
- **RN08 — Encerramento às 17h com Preservação:** No encerramento do expediente, todas as senhas ainda em `AGUARDANDO` recebem marcação `descartada_fim_expediente = true` e saem da fila, enquanto atendimentos já em `EM_ATENDIMENTO` permanecem abertos para conclusão e encerramento pelo AA.
- **RN09 — Gestor Único:** O sistema permite apenas **1 usuário ativo** com perfil adicional de Gestor (`eh_gestor = true`), bloqueando a criação de um segundo gestor ativo ou a autodesativação do gestor logado.
- **RN10 — Relatório Detalhado de Não Atendidas:** No relatório detalhado, senhas cujo estado final não seja `ATENDIDA` retornam obrigatoriamente `null` (campos em branco) para início/fim do atendimento, duração, guichê e atendente.
- **RN11 — Cálculo e Referências de Tempo Médio (TM e TME):** O Tempo Médio de Atendimento (**TM**) considera exclusivamente a média de `tempo_atendimento_segundos` das senhas `ATENDIDA`, enquanto o **TME** mede a espera entre `emitida_em` e `inicio_atendimento_em`. Os parâmetros de referência especificados pelo laboratório (aplicados no simulador) são:
  - **SP (Prioritária):** TM de 15 minutos, variando ± 5 minutos em distribuição igual (10 a 20 min).
  - **SE (Retirada de Exames):** prioridade operacional especial com TM inferior a 2 minutos — 1 minuto para 95% dos SA e 5 minutos para 5% dos SA.
  - **SG (Geral):** TM de 5 minutos, variando ± 3 minutos em distribuição igual (2 a 8 min).
- **RN12 — Auditoria Imutável:** Todos os eventos do ciclo de vida (incluindo AA, guichê, senha, 1ª chamada, 2ª chamada, início e finalização) são gravados em `logs_auditoria` sem endpoints de edição ou exclusão.

---

## 5. Especificação dos Casos de Uso (UC)

### UC01 — Emitir Senha no Totem
- **Ator Principal:** Agente Cliente (AC).
- **Pré-condições:** API disponível e dentro do horário de expediente (`07:00`–`17:00`).
- **Fluxo Principal:**
  1. O AC acessa a tela inicial (`/`) e seleciona a categoria desejada (`SP`, `SE` ou `SG`).
  2. O AS valida o expediente, calcula o próximo sequencial sob lock transacional, cria a senha (`EMITIDA → AGUARDANDO`) e grava a auditoria.
  3. O Totem exibe o comprovante com o código `YYMMDD-PPSQ`, data/hora e opção de impressão, retornando automaticamente à tela inicial após 15 segundos.
- **Fluxos Alternativos / Exceção:**
  - **E1 (Fora do expediente):** O Totem exibe aviso de expediente encerrado e desabilita os botões de emissão.
  - **E2 (API indisponível):** O Totem exibe alerta de indisponibilidade temporária com botão de reconexão.

### UC02 — Acompanhar Chamadas no Painel TV
- **Ator Principal:** Agente Cliente (AC).
- **Pré-condições:** Navegador aberto em `/painel`.
- **Fluxo Principal:**
  1. O Painel consulta `/api/painel/chamados` a cada 3 segundos e salva o resultado em cache local.
  2. Quando detecta uma nova chamada ou 2ª chamada, destaca visualmente o cartão principal e dispara o anúncio por voz (Web Speech API) caso o áudio esteja ativado.
  3. A coluna lateral exibe exclusivamente o histórico das 5 últimas chamadas e seus status atuais.
- **Fluxo de Exceção:**
  - **E1 (Queda da API/Banco):** O Painel entra em modo contingência, preserva as 5 últimas chamadas do `localStorage`, exibe banner de reconexão e tenta reconectar automaticamente a cada 5 segundos.

### UC03 — Autenticar no Sistema
- **Ator Principal:** Agente Atendente (AA) ou Gestor.
- **Fluxo Principal:**
  1. O colaborador acessa `/login`, informa e-mail e senha e envia o formulário.
  2. O AS valida o hash da senha e verifica se o usuário está ativo, retornando o token JWT e o perfil.
  3. O front-end persiste o token e redireciona automaticamente o Gestor para `/gestor` e o AA para `/atendente`.
- **Fluxo de Exceção:** Credenciais inválidas ou usuário inativo retornam `401` com mensagem clara sem expor detalhes internos.

### UC04 — Chamar Próxima Senha e Conduzir Atendimento
- **Ator Principal:** Agente Atendente (AA).
- **Pré-condições:** AA autenticado, guichê ativo selecionado e sem atendimento aberto.
- **Fluxo Principal:**
  1. O AA fixa seu guichê e clica em **Chamar Próximo**.
  2. O AS executa rotinas automáticas, aplica lock na fila, seleciona a próxima senha conforme `[SP] → [SE | SG]`, muda o estado para `CHAMADA` e bloqueia a troca de guichê.
  3. Ao comparecer o AC, o AA clica em **Iniciar Atendimento** (`EM_ATENDIMENTO`) e o cronômetro em tempo real é iniciado.
  4. Ao concluir o SA, clica em **Finalizar Atendimento** (`ATENDIDA`), gravando duração e liberando o guichê.
- **Fluxos Alternativos:**
  - **A1 (2ª Chamada):** Caso o AC não apareça na 1ª chamada, o AA clica em **Chamar Novamente** (`CHAMADA NOVAMENTE`).
  - **A2 (Ausência Manual):** Caso o AC não compareça após a 2ª chamada, o AA aciona **Não Compareceu** (`NÃO_COMPARECEU`), liberando o guichê.
  - **E1 (Concorrência):** Requisições simultâneas do mesmo operador ou sobre o mesmo guichê recebem `409 Conflict`.

### UC05 — Gerenciar Atendentes e Guichês
- **Ator Principal:** Gestor.
- **Pré-condições:** Sessão autenticada com `eh_gestor = true`.
- **Fluxo Principal:** O Gestor acessa `/gestor` → aba **Cadastros**, podendo criar, editar, desativar ou reativar atendentes e guichês universais.
- **Exceções:** Tentativa de cadastrar e-mail duplicado, número de guichê duplicado, segundo gestor ou autodesativação é bloqueada pelo AS.

### UC06 — Consultar e Exportar Relatórios Gerenciais
- **Ator Principal:** Gestor.
- **Fluxo Principal:**
  1. O Gestor seleciona o filtro **Diário** (`YYYY-MM-DD`) ou **Mensal** (`YYYY-MM`).
  2. Navega pelas abas **Visão Geral & TM**, **Desempenho**, **Relatório Detalhado** e **Auditoria**, aplicando filtros adicionais por prioridade, status, ação ou código da senha.
  3. Exporta os dados consolidados em **CSV** ou **JSON**.

### UC07 — Encerrar Expediente
- **Ator Principal:** Gestor (ou AS automaticamente às `17:00`).
- **Fluxo Principal:** O encerramento descarta todas as senhas do dia ainda em `AGUARDANDO`, preserva todas as senhas em `EM_ATENDIMENTO` para finalização pelo AA, registra logs de auditoria e retorna o resumo quantitativo da operação.

### UC08 — Processar Abandono Automático (120s)
- **Ator Principal:** Agente Sistema (AS).
- **Pré-condições:** Existência de senha no estado `CHAMADA NOVAMENTE` cujo tempo decorrido desde `segunda_chamada_em` atingiu ou excedeu `TEMPO_LIMITE_ABANDONO_SEGUNDOS` (120s).
- **Fluxo Principal:**
  1. Ao receber consultas do Terminal AA, novas chamadas ou acionamento de rotinas, o AS identifica senhas expiradas em `CHAMADA NOVAMENTE`.
  2. Atualiza atomicamente o estado para `NÃO_COMPARECEU`, registra o evento `ABANDONO_AUTOMATICO` em `logs_auditoria` e libera automaticamente o AA e o guichê para o próximo atendimento.