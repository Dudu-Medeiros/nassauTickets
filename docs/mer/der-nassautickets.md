# Modelo Entidade-Relacionamento (MER / DER) — nassauTickets

Modelagem relacional implementada em **MySQL 8.0 (InnoDB)** gerenciada via SQLAlchemy e Flask-Migrate (`backend/migrations/`).

## Diagrama Entidade-Relacionamento (DER)

```mermaid
erDiagram
    USUARIOS ||--o{ SENHAS : "atende"
    GUICHES ||--o{ SENHAS : "recebe"
    SENHAS ||--o{ LOGS_AUDITORIA : "registra"
    USUARIOS ||--o{ LOGS_AUDITORIA : "executa"
    GUICHES ||--o{ LOGS_AUDITORIA : "vincula"

    USUARIOS {
        int id PK
        varchar nome
        varchar email UK
        varchar senha_hash
        boolean eh_gestor
        boolean ativo
        datetime criado_em
    }

    GUICHES {
        int id PK
        int numero UK
        varchar nome
        boolean ativo
        datetime criado_em
    }

    SENHAS {
        int id PK
        varchar codigo UK
        varchar tipo
        int sequencial
        date data_referencia
        varchar status
        datetime emitida_em
        datetime primeira_chamada_em
        datetime segunda_chamada_em
        datetime inicio_atendimento_em
        datetime fim_atendimento_em
        int tempo_atendimento_segundos
        boolean descartada_fim_expediente
        int guiche_id FK
        int atendente_id FK
    }

    CONTROLE_FILA {
        int id PK
        date data_referencia
        varchar ultima_prioridade_chamada
        datetime atualizado_em
    }

    LOGS_AUDITORIA {
        int id PK
        int senha_id FK
        int atendente_id FK
        int guiche_id FK
        varchar status_anterior
        varchar status_novo
        varchar acao
        varchar detalhes
        datetime criado_em
    }
```

## Descrição das Entidades

* **`usuarios`:** Armazena os Agentes Atendentes (`AA`) e o único Gestor (`eh_gestor = true`). Utiliza exclusão lógica (`ativo = false`) para preservar integridade referencial de relatórios e auditoria.
* **`guiches`:** Cadastro dos guichês universais (sem restrição por tipo de senha), também com exclusão lógica.
* **`senhas`:** Registro de cada ticket emitido no padrão `YYMMDD-PPSQ`, seus timestamps de ciclo de vida, duração em segundos (`TM`), flag de descarte às 17h e vínculos com atendente e guichê.
* **`controle_fila`:** Tabela de controle transacional utilizada com bloqueio pessimista (`SELECT ... FOR UPDATE`) para garantir o ciclo `[SP] → [SE | SG]` e impedir chamadas duplicadas sob concorrência.
* **`logs_auditoria`:** Trilha cronológica imutável de todas as emissões, chamadas, atendimentos, abandonos automáticos e encerramentos de expediente.