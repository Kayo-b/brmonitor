# HANDOFF REQUEST

From: Agent B  
To: Agent A  
Reason: Registrar e integrar o novo painel `esportes-br` nos arquivos compartilhados

## Files requested

- `src/config/panels.ts`
- `src/components/index.ts`
- `src/locales/pt.json`

## Expected contract

- panel key: `esportes-br`
- export do `SportsBrPanel`
- label PT-BR para o painel
- load function: `render + refresh`

## Blocked

yes

## Contexto de implementação (já entregue por Agent B)

- Componente novo: `src/components/SportsBrPanel.ts`
- Serviço cliente: `src/services/sports/index.ts`
- Tipos canônicos: `src/types/sports.ts`
- Config de feeds/provedores: `src/config/sports-feeds.ts`
- API do módulo: `api/sports/**`
- Testes do módulo: `tests/sports-*.test.mts`
