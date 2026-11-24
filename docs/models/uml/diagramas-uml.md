# Diagramas UML — nassauTickets

Diagramas comportamentais e de interação do sistema **nassauTickets** em notação Mermaid.

---

## 1. Diagrama de Casos de Uso

```mermaid
flowchart LR
    AC(["AC — Agente Cliente (Anônimo)"])
    AA(["AA — Agente Atendente (JWT)"])
    GESTOR(["AA Gestor (Admin Único - JWT)"])
    AS(["AS — Agente Sistema"])

    subgraph Sistema["nassauTickets"]
        UC1["UC01: Emitir Senha SP/SE/SG no Totem"]
        UC2["UC02: Acompanhar 5 Últimas Chamadas + TTS"]
        UC3["UC03: Autenticar via Login JWT"]
        UC4["UC04: Selecionar Guichê e Conduzir Atendimento"]
        UC5["UC05: Gerenciar Atendentes e Guichês"]
        UC6["UC06: Consultar/Exportar Relatórios, TM e Auditoria"]
        UC7["UC07: Encerrar Expediente (17h / Manual)"]
        UC8["UC08: Processar Abandono Automático (120s)"]
    end

    AC --> UC1
    AC --> UC2
    AA --> UC3
    AA --> UC4
    GESTOR --> UC3
    GESTOR --> UC4
    GESTOR --> UC5
    GESTOR --> UC6
    GESTOR --> UC7
    AS --> UC7
    AS --> UC8
```

---

## 2. Diagrama de Máquina de Estados (7 Estados)

```mermaid
stateDiagram-v2
    [*] --> EMITIDA : AC emite senha no Totem (SP / SE / SG)
    EMITIDA --> AGUARDANDO : AS enfileira automaticamente

    AGUARDANDO --> CHAMADA : AA aciona Chamar Próximo
    AGUARDANDO --> [*] : AS descarta no encerramento às 17h

    CHAMADA --> EM_ATENDIMENTO : AC comparece (AA inicia SA)
    CHAMADA --> CHAMADA_NOVAMENTE : AA aciona Chamar Novamente

    state "CHAMADA NOVAMENTE" as CHAMADA_NOVAMENTE
    CHAMADA_NOVAMENTE --> EM_ATENDIMENTO : AC comparece dentro de 120s
    CHAMADA_NOVAMENTE --> NAO_COMPARECEU : Ausência manual ou timeout 120s (AS)

    EM_ATENDIMENTO --> ATENDIDA : AA finaliza atendimento (grava TM)

    state "NÃO_COMPARECEU" as NAO_COMPARECEU
    ATENDIDA --> [*]
    NAO_COMPARECEU --> [*]
```

---

## 3. Diagramas de Sequência

### 3.1 Emissão, Chamada, Painel TV (TTS) e Finalização

```mermaid
sequenceDiagram
    actor AC as Agente Cliente (Totem)
    participant AS as Agente Sistema (API Flask)
    participant DB as MySQL 8.0
    actor AA as Agente Atendente
    participant TV as Painel TV (TTS)

    AC->>AS: POST /api/senhas { tipo: "SP" }
    AS->>DB: Lock controle_fila + INSERT senha (EMITIDA -> AGUARDANDO) + LogAuditoria
    DB-->>AS: Senha 261124-SP001
    AS-->>AC: 201 Created (Comprovante)

    AA->>AS: POST /api/atendimento/chamar { guiche_id: 1 } (JWT)
    AS->>DB: Rotinas automáticas + Lock controle_fila (FOR UPDATE)
    AS->>DB: Seleciona próxima [SP -> SE|SG] + UPDATE status = CHAMADA
    DB-->>AS: Senha 261124-SP001 vinculada ao Guichê 01
    AS-->>AA: 200 OK (Bloqueia troca de guichê)

    loop Polling a cada 3s
        TV->>AS: GET /api/painel/chamados
        AS->>DB: SELECT 5 últimas chamadas (COALESCE 2ª/1ª chamada)
        DB-->>AS: Lista com até 5 chamadas
        AS-->>TV: 200 OK
    end
    TV->>TV: Atualiza destaque, grava cache localStorage e anuncia via Web Speech API

    AA->>AS: POST /api/atendimento/senhas/{id}/iniciar
    AS->>DB: UPDATE status = EM_ATENDIMENTO, inicio_atendimento_em
    AS-->>AA: 200 OK (Inicia cronômetro)

    AA->>AS: POST /api/atendimento/senhas/{id}/finalizar
    AS->>DB: Calcula tempo_atendimento_segundos + UPDATE status = ATENDIDA
    AS-->>AA: 200 OK (Libera guichê)
```

### 3.2 Tratamento de Concorrência e Deadlock

```mermaid
sequenceDiagram
    actor AA1 as Atendente 1 (Guichê 01)
    actor AA2 as Atendente 2 (Guichê 02)
    participant Route as atendimento_routes.py
    participant Service as atendimento_service.py
    participant DB as MySQL 8.0 (InnoDB)

    par Chamadas simultâneas
        AA1->>Route: POST /api/atendimento/chamar { guiche_id: 1 }
        AA2->>Route: POST /api/atendimento/chamar { guiche_id: 2 }
    end

    Route->>Service: chamar_proxima_senha(AA1, 1)
    Route->>Service: chamar_proxima_senha(AA2, 2)

    Service->>DB: AA1: SELECT * FROM controle_fila WHERE id=1 FOR UPDATE
    DB-->>Service: Lock exclusivo concedido a AA1

    Service->>DB: AA2: SELECT * FROM controle_fila WHERE id=1 FOR UPDATE
    Service->>DB: AA1: Atualiza SP001 -> CHAMADA + COMMIT
    Route-->>AA1: 200 OK (261124-SP001)

    alt Lock liberado normalmente
        DB-->>Service: Lock concedido a AA2
        Service->>DB: AA2: Seleciona próxima senha (SE001) + COMMIT
        Route-->>AA2: 200 OK (261124-SE001)
    else Deadlock 1213 / Lock Timeout 1205
        DB-->>Route: OperationalError (1213)
        Route->>DB: db.session.rollback()
        Note over Route: Backoff aleatório (30–120ms) e retry automático (até 5x)
        Route->>Service: Reexecuta chamar_proxima_senha(AA2, 2)
        Service->>DB: Seleciona próxima senha (SE001) + COMMIT
        Route-->>AA2: 200 OK (261124-SE001)
    end
```