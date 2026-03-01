# Legislative Feature Runbook (BRMonitor)

## Scope

Feature: captacao e consulta de votacoes nominais da Camara dos Deputados.

Dominio API: `legislative/v1`

Base path:

- `/api/legislative/v1/list-recent-nominal-votes`
- `/api/legislative/v1/get-nominal-vote-roll-call`
- `/api/legislative/v1/list-deputy-recent-votes`
- `/api/legislative/v1/sync-recent-nominal-votes` (POST)

## Data Flow

1. Handler consulta cache Redis via `repository.ts`.
2. Em cache miss, busca API da Camara (`dadosabertos.camara.leg.br/api/v2`).
3. Normaliza payload para schema canonico (`_shared.ts`).
4. Persiste snapshot em Redis.
5. Retorna resposta com `source` (`cache`, `fresh`, `mixed`).

## Cache Keys

- `legislative:v1:recent:{dias}`
- `legislative:v1:rollcall:{votacaoId}`
- `legislative:v1:deputy:{deputadoId}:d{dias}`

## TTLs

- Recent votes: 5 min
- Roll call: 30 min
- Deputy activity: 10 min

## Failure Modes

1. API Camara indisponivel/timeout:
- comportamento: retorno parcial com cache existente, ou lista vazia;
- acao: validar conectividade externa e rate-limit de origem.

2. Votacao sem dados de voto:
- comportamento: roll-call vazio com `source=error` ou `source=fresh` sem votos;
- acao: checar se a votacao realmente possui chamada nominal no endpoint de origem.

3. Degradacao Redis:
- comportamento: handlers continuam buscando origem remota;
- impacto: aumento de latencia/custo.

## Operational Checks

1. Smoke listagem:
`GET /api/legislative/v1/list-recent-nominal-votes?dias=7&limit=10`
2. Smoke roll-call:
`GET /api/legislative/v1/get-nominal-vote-roll-call?votacao_id=<id>`
3. Smoke deputado:
`GET /api/legislative/v1/list-deputy-recent-votes?deputado_id=<id>&limit=5`
4. Warmup manual:
`POST /api/legislative/v1/sync-recent-nominal-votes?dias=7&max_votacoes=20&include_roll_calls=true`

## Ownership Notes

- Implementacao backend e contratos: Agente C.
- Integracao do painel em arquivos compartilhados de UI (`src/config/panels.ts`, `src/components/index.ts`): Agente A (handoff necessario).
