HANDOFF REQUEST
From: Agent C
To: Agent A
Reason: Registrar painel legislativo BR em arquivos compartilhados de variante/UI

Files requested:
- src/config/panels.ts
- src/components/index.ts
- (opcional) src/locales/pt.json

Expected contract:
- panel key: `camara-votos-br`
- component class: `CamaraNominalVotesPanel`
- variante alvo: `br`
- comportamento: habilitado por default no BRMonitor, desabilitado nas demais variantes

Implementation delivered by Agent C (already in branch):
- backend API: `legislative/v1` (proto + handlers + gateway wiring)
- frontend artifacts (isolated files):
  - `src/components/CamaraNominalVotesPanel.ts`
  - `src/services/legislative/index.ts`
- tests:
  - `tests/legislative-normalization.test.mts`
- docs:
  - `docs/LEGISLATIVE_FEATURE_RUNBOOK.md`

Blocked by: yes (registration in shared ownership files)
