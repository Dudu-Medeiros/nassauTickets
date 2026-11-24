# nassauTickets

Sistema Web Full-Stack de Controle de Atendimento para um Laboratório de Análises Clínicas, desenvolvido como projeto acadêmico da disciplina de Desenvolvimento Web (UNINASSAU).

---

## Objetivo

Gerenciar de forma automatizada, segura e auditável o ciclo completo de atendimento laboratorial — da emissão anônima de senhas no Totem (AC) à chamada priorizada no Painel TV com síntese de voz (AS), operação de guichês universais pelos Atendentes (AA) e análise de indicadores gerenciais pelo Gestor — aplicando boas práticas de engenharia de software, Git/GitHub, React, controle transacional de concorrência, LGPD, acessibilidade e recuperação de desastres.

---

## Membros

| Nome | Matrícula | Papel |
| :--- | :--- | :--- |
| Eduardo Guilherme | 01802828 | Scrum Master/Desenvolvedor/Documentador |
| Bruno André | 01554553 | Desenvolvedor/Testador |

---

## Visão Geral e Arquitetura do Sistema

O **nassauTickets** opera com três agentes principais:

* **AC (Agente Cliente):** interage anonimamente com o Totem (`/`) para emitir senhas (`SP`, `SE`, `SG`) e acompanha as chamadas no Painel TV (`/painel`).
* **AA (Agente Atendente):** autentica-se via JWT (`/login`), assume um guichê universal (`/atendente`) e conduz o ciclo de estados da senha. Um único atendente possui o perfil adicional de **Gestor** (`/gestor`) para cadastros, relatórios, auditoria e encerramento de expediente.
* **AS (Agente Sistema):** API REST em Flask acoplada ao MySQL 8.0 responsável pela numeração `YYMMDD-PPSQ`, priorização alternada `[SP] → [SE | SG]`, lock transacional de concorrência, abandono automático após 120s na 2ª chamada, encerramento do expediente às 17h e trilha imutável de auditoria.

### Arquitetura em Camadas

```text
[ Totem / Painel TV / Terminal AA / Painel Gestor ]  -->  React 19 + TypeScript + Tailwind (frontend/)
                         |  HTTP / REST (JSON + Bearer JWT)
                         v
[ Blueprints REST -> Services -> Models / Utils ]    -->  Python + Flask + SQLAlchemy (backend/)
                         |  Transações ACID + Lock FOR UPDATE
                         v
[ MySQL 8.0 (InnoDB) ]                               -->  usuarios, guiches, senhas, controle_fila, logs_auditoria
```

---

## Tecnologias Utilizadas

| Camada | Tecnologias |
| :--- | :--- |
| **Front-end** | React, TypeScript, Vite, Tailwind CSS, React Router, Axios, Lucide React, Web Speech API (TTS `pt-BR`) |
| **Back-end** | Python, Flask, Flask-SQLAlchemy, Flask-Migrate (Alembic), Flask-JWT-Extended, Flask-CORS, PyMySQL |
| **Banco de Dados** | MySQL 8.0 (InnoDB) |
| **Simulação e Testes** | Script automatizado em Python (`requests`, `ThreadPoolExecutor`, `threading.Barrier`) |

### Justificativa Técnica da Escolha do Back-end

Entre as opções homologadas pela especificação do laboratório (Node.js/Express, Java/Spring Boot e Python/Flask ou FastAPI), optou-se por **Python com Flask + SQLAlchemy + MySQL 8.0** pelos seguintes motivos:

1. **Conformidade direta com a infraestrutura prevista** no documento de requisitos do laboratório.
2. **Controle transacional explícito no MySQL 8.0:** SQLAlchemy permite aplicar bloqueio pessimista (`SELECT ... FOR UPDATE`) sobre a tabela de controle da fila e capturar diretamente erros nativos do InnoDB (`1213` Deadlock e `1205` Lock Wait Timeout) com política de rollback e retry automático.
3. **Arquitetura modular enxuta:** o uso de *Blueprints*, camada de *Services* e migrações versionadas com Alembic (`Flask-Migrate`) reduz código repetitivo e mantém alta legibilidade para auditoria, regras de máquina de estados e geração dos relatórios diários e mensais.

---

## Estrutura do Repositório

```text
nassauTickets/
├── backend/
│   ├── app/
│   │   ├── models/          # Entidades SQLAlchemy e enums dos 7 estados
│   │   ├── routes/          # Endpoints REST (/auth, /usuarios, /guiches, /senhas, /atendimento, /painel, /relatorios, /health)
│   │   ├── services/        # Regras de negócio, priorização, rotinas automáticas e relatórios
│   │   └── utils/           # RBAC/JWT, validação de expediente e máquina de estados
│   ├── migrations/          # Migrações versionadas do banco de dados
│   ├── run.py               # Inicialização da API Flask
│   ├── seed.py              # Carga inicial (Gestor, Atendente e 3 Guichês)
│   └── simular_cenario.py   # Teste de concorrência, carga de TM/abandono (5%) e resiliência
├── docs/
│   ├── branding/            # Identidade visual (.gitkeep)
│   ├── mer/                 # Modelo Entidade-Relacionamento (DER)
│   ├── mockups/             # Protótipos de tela (.gitkeep)
│   ├── models/
│   │   └── uml/             # Diagramas UML (Casos de Uso, Máquina de Estados e Sequência)
│   └── requirements/        # RF, RNF, RN, Casos de Uso, LGPD, Acessibilidade e DRP
├── frontend/
│   └── src/
│       ├── components/      # Componentes UI acessíveis, layout, ProtectedRoute e seções do Gestor
│       ├── contexts/        # AuthContext (sessão JWT)
│       ├── hooks/           # Hook useAuth
│       ├── pages/           # TotemPage, PainelPage, LoginPage, AtendentePage, GestorPage, NotFoundPage
│       ├── services/        # Cliente Axios com interceptor JWT, serviços REST e voz (TTS)
│       ├── types/           # Tipagens TypeScript compartilhadas
│       └── utils/           # Exportação CSV (UTF-8 BOM) e JSON
├── .gitignore
├── LICENSE
└── README.md
```

### Documentação e Artefatos (`docs/`)

* [Requisitos (RF, RNF), Regras de Negócio e Casos de Uso](docs/requirements/requisitos-e-regras-de-negocio.md)
* [Adequação à LGPD, Acessibilidade (WCAG 2.1 AA) e DRP](docs/requirements/lgpd-acessibilidade-e-drp.md)
* [Modelo Entidade-Relacionamento (DER / MER)](docs/mer/der-nassautickets.md)
* [Diagramas UML (Casos de Uso, Máquina de Estados e Sequência)](docs/models/uml/diagramas-uml.md)

---

## Fluxo de Branches e Versionamento (Git)

O repositório utiliza estratégia de duas branches permanentes:

* **`main`:** branch estável de produção/entrega. Recebe código exclusivamente por meio de **Pull Requests** vindos da `dev` utilizando *Merge Commit* para preservar todo o histórico de desenvolvimento.
* **`dev`:** branch ativa de desenvolvimento, onde as funcionalidades, correções, testes e documentação são versionados em commits pequenos e semânticos (`feat:`, `fix:`, `test:`, `docs:`, `chore:`) vinculados às Issues do projeto (#1 a #15).

---

## Instalação, Configuração e Execução

### Pré-requisitos

* Python 3.12+
* Node.js 20+ e npm
* MySQL 8.0 em execução

### 1. Clonar o repositório e criar o banco de dados

```powershell
git clone [https://github.com/Dudu-Medeiros/nassauTickets.git](https://github.com/Dudu-Medeiros/nassauTickets.git)
cd nassauTickets
```

No MySQL 8.0, crie o schema:

```sql
CREATE DATABASE IF NOT EXISTS nassautickets
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;
```

### 2. Configurar e executar o Back-end

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
Copy-Item .env.example .env
```

Preencha o arquivo `backend/.env`:

```env
FLASK_APP=run.py
FLASK_ENV=development
DATABASE_URL=mysql+pymysql://root:SUA_SENHA@localhost:3306/nassautickets
SECRET_KEY=sua-chave-secreta-flask
JWT_SECRET_KEY=sua-chave-secreta-jwt
EXPEDIENTE_INICIO=07:00
EXPEDIENTE_FIM=17:00
TEMPO_LIMITE_ABANDONO_SEGUNDOS=120
MODO_DEMO_SEM_EXPEDIENTE=true
```

> Em operação estrita de horário comercial (07h–17h), defina `MODO_DEMO_SEM_EXPEDIENTE=false`.

Execute as migrações, a carga inicial e suba a API:

```powershell
flask db upgrade
python seed.py
python run.py
```

* **API:** `http://127.0.0.1:5000`
* **Healthcheck:** `http://127.0.0.1:5000/health` e `http://127.0.0.1:5000/api/health`

### 3. Configurar e executar o Front-end

Em um segundo terminal:

```powershell
cd frontend
npm install
Copy-Item .env.example .env
npm run dev
```

Confira se `frontend/.env` aponta para `VITE_API_URL=http://localhost:5000/api`.

* **Aplicação Web:** `http://localhost:5173`

---

## Credenciais de Acesso (Seed)

| Perfil | E-mail | Senha | Rota Pós-Login |
| :--- | :--- | :--- | :--- |
| **Gestor** | `gestor@nassautickets.com` | `gestor123` | `/gestor` |
| **Atendente (AA)** | `ana@nassautickets.com` | `atendente123` | `/atendente` |

Rotas públicas (sem login):
* **Totem de Autoatendimento (AC):** `http://localhost:5173/`
* **Painel de Chamados (TV + TTS):** `http://localhost:5173/painel`

---

## Simulação de Concorrência, Variação de TM e Resiliência

Com o servidor Flask em execução (`python run.py`), execute em outro terminal dentro de `backend/` (com a `.venv` ativa):

```powershell
# Executa concorrência (barreira + lock), carga de 60 atendimentos (5% abandono + variação oficial de TM) e healthcheck
python simular_cenario.py --tudo

# Módulos individuais:
python simular_cenario.py --concorrencia
python simular_cenario.py --popular --qtd 60
python simular_cenario.py --resiliencia
```

---

## Principais Endpoints da API

| Método | Endpoint | Permissão | Descrição |
| :--- | :--- | :--- | :--- |
| `GET` | `/health` e `/api/health` | Público | Verifica disponibilidade da API e conexão MySQL (`SELECT 1`). |
| `GET` | `/api/senhas/expediente` | Público | Retorna status do expediente (07h–17h). |
| `POST` | `/api/senhas` | Público | Emite senha anônima (`SP`, `SE` ou `SG`). |
| `GET` | `/api/painel/chamados` | Público | Retorna estritamente as 5 últimas senhas chamadas do dia. |
| `POST` | `/api/auth/login` | Público | Autentica colaborador e emite token JWT. |
| `GET` | `/api/auth/me` | JWT (AA/Gestor) | Retorna dados do usuário autenticado. |
| `GET` | `/api/atendimento/atual` | JWT (AA/Gestor) | Retorna atendimento ativo, fila aguardando e próxima ordem do ciclo. |
| `POST` | `/api/atendimento/chamar` | JWT (AA/Gestor) | Chama próxima senha sob lock transacional (`FOR UPDATE`). |
| `POST` | `/api/atendimento/senhas/:id/{acao}` | JWT (AA/Gestor) | Executa `rechamar`, `iniciar`, `finalizar` ou `nao-compareceu`. |
| `POST` | `/api/atendimento/encerrar-expediente` | JWT (Gestor) | Encerra expediente descartando pendentes e preservando em curso. |
| `CRUD` | `/api/usuarios` e `/api/guiches` | JWT (Gestor)* | Gerencia atendentes e guichês (*`GET /api/guiches` acessível a AA). |
| `GET` | `/api/relatorios/{tipo}` | JWT (Gestor) | `quantitativo`, `detalhado`, `tempo-medio`, `auditoria`, `desempenho`. |

---

## Licença

Este projeto está licenciado sob a **Licença MIT** — consulte o arquivo [LICENSE](LICENSE) para mais detalhes.