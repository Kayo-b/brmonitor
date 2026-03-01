# BRMonitor - Plano e Specs de Adaptacao

## 1. Objetivo

Adaptar o repositorio atual do World Monitor para um produto focado em Brasil, chamado BRMonitor, com foco em monitoramento nacional, regional (UFs) e municipal, mantendo a base tecnica atual para reduzir risco e acelerar entrega.

## 2. Resultado Esperado

- Produto com branding e UX de BRMonitor.
- Dados priorizados para Brasil (federal, estadual e municipal quando viavel).
- Painel e mapa com presets de regioes brasileiras.
- Arquitetura reutilizando o core atual (frontend, API e pipeline de dados), com minimo retrabalho.

## 3. Principios de Implementacao

1. Variant-first: adicionar variante `br` no sistema existente antes de fazer refactors grandes.
2. Compatibilidade incremental: nao quebrar as variantes atuais no processo.
3. Dados com rastreabilidade: toda fonte precisa ter origem, frequencia e status de qualidade.
4. Entrega em fases curtas: primeiro valor funcional, depois cobertura e refinamento.
5. Continuidade de dados: todo dado ja implementado e pertinente ao Brasil deve ser mantido, sendo substituido apenas quando houver fonte brasileira mais especifica e de melhor qualidade.

## 4. Escopo v1 (MVP BRMonitor)

- Variante `br` com identidade propria.
- Feed de noticias focado no Brasil (politica, economia, seguranca, clima, infraestrutura, saude).
- Camadas de mapa focadas em Brasil (eventos naturais, queimadas, seguranca, infraestrutura critica, mobilidade).
- Indicadores macro e setoriais BR (BCB, IBGE, INPE e fontes abertas prioritarias).
- Estrutura inicial para modulo de esportes BR (futebol, basquete, volei e outros esportes relevantes).
- Priorizacao de idioma `pt-BR` (com fallback para `en`).

## 5. Fora de Escopo no v1

- Reescrita total do namespace `worldmonitor` em proto/generated/server.
- Cobertura completa de todos os 5570 municipios no dia 1.
- Modelos preditivos novos do zero para risco municipal.
- Troca de stack (sem mudar Vite/Tauri/API atual).

## 6. Estado Atual do Repositorio (Resumo Tecnico)

- O projeto ja tem arquitetura multi-variant (`full`, `tech`, `finance`, `happy`).
- A escolha de variante passa por `VITE_VARIANT` + `SITE_VARIANT`.
- Painel, camadas e feeds sao variant-aware em `src/config/panels.ts` e `src/config/feeds.ts`.
- Ha forte acoplamento de branding/host/chaves com `worldmonitor` em runtime, meta tags, storage keys e URLs.
- Existe mapeamento inicial de dados abertos BR em `dados_abertos_brasil.md`.

## 7. Arquitetura Alvo do BRMonitor

- Camada de apresentacao: `SITE_VARIANT=br`, tema/branding BRMonitor, presets de visualizacao Brasil.
- Camada de configuracao: novos blocos de paineis, layers e feeds para `br`.
- Camada de ingestao: adapters para fontes BR prioritarias (federal primeiro, estados/capitais na sequencia).
- Camada de normalizacao: schema canonico com geocodificacao por UF/municipio (IBGE code).
- Camada de analise: score de risco nacional/UF (v1 heuristico com pesos configuraveis).

## 8. Especificacoes Funcionais (Produto)

### 8.1 Paineis v1 obrigatorios

- `map`: mapa principal do Brasil.
- `live-news`: noticias Brasil em tempo quase real.
- `insights`: resumo sintetico por IA das principais mudancas.
- `politica-br`: executivo, legislativo, judiciario, federativo.
- `economia-br`: macro (inflacao, juros, cambio, atividade, emprego).
- `seguranca-br`: criminalidade, violencia, ocorrencias relevantes.
- `clima-ambiente-br`: chuva extrema, queimadas, desmatamento, risco hidrico.
- `infra-br`: energia, transporte, telecom e alertas operacionais.
- `saude-br`: sinais epidemiologicos e capacidade.

### 8.2 Camadas de mapa v1 obrigatorias

- queimadas e focos de calor.
- eventos naturais e extremos climaticos.
- infraestrutura critica (energia, portos, aeroportos, malha logistica).
- incidentes de seguranca com georreferencia quando disponivel.
- alertas hidricos/pluviometricos.

### 8.3 Presets de mapa

- brasil (default).
- norte.
- nordeste.
- centro-oeste.
- sudeste.
- sul.

### 8.4 UX e idioma

- Idioma default: `pt-BR`.
- Labels e textos BR-first.
- Persistencia de preferencias sem quebrar usuarios existentes (migracao de storage keys).

### 8.5 Esportes (modulo BR)

- Adicionar painel `esportes-br` para monitoramento esportivo nacional.
- Cobertura inicial:
  - Futebol: Serie A e Serie B (prioridade alta).
  - Basquete: NBB.
  - Volei: Superliga.
  - Outros: tenis, MMA/UFC, Formula 1, esports (prioridade media/baixa).
- Capacidades esperadas do painel:
  - placares ao vivo quando a fonte permitir;
  - tabela/classificacao;
  - agenda de jogos/eventos;
  - estatisticas basicas e historico recente;
  - fallback para snapshot cacheado quando API ao vivo estiver indisponivel.

## 9. Especificacoes de Dados (v1)

### 9.0 Regra de priorizacao de fontes

- Manter os dados ja implementados que sejam pertinentes ao Brasil.
- Substituir ou despriorizar fontes globais apenas quando existir base brasileira mais especifica, confiavel e com cobertura equivalente ou superior.
- Utilizar [dados_abertos_brasil.md](/home/kxyx/projects/brmonitor-feat-1/dados_abertos_brasil.md) como catalogo orientador oficial de novas fontes de dados para o BRMonitor.

### 9.1 Fontes prioritarias iniciais

- IBGE (API e indicadores).
- BCB (dados financeiros/macroeconomicos).
- INPE Queimadas / TerraBrasilis.
- CPTEC/INPE (tempo e alertas).
- ANEEL (energia e eventos setoriais).
- PRF (acidentes rodoviarios federais).
- DataSUS/OpenDataSUS (saude, quando dado aberto e estrutura permitirem).
- Dados.gov.br como catalogo federado.

### 9.2 Frequencia de atualizacao (SLA alvo)

- Noticias: 5-15 min.
- Alertas climaticos/ambientais: 10-30 min.
- Indicadores macro: diario/semanal conforme origem.
- Bases estruturais (portos, infraestrutura): semanal/mensal.

### 9.3 Schema canonico minimo para eventos

- `id`
- `source`
- `category`
- `title`
- `description`
- `event_time`
- `ingested_at`
- `severity`
- `confidence`
- `country` (sempre `BR` no v1)
- `uf`
- `municipio`
- `ibge_code`
- `lat`
- `lon`
- `tags`
- `raw_url`

### 9.4 Qualidade de dados

- Cada fonte com status: `ok`, `degradado`, `indisponivel`.
- Fallback por cache para evitar tela vazia.
- Alertas de freshness por painel/camada.

### 9.5 Fontes de dados esportivos (priorizadas)

#### 9.5.1 Futebol - Serie A e B

- APIs (tempo real / ao vivo):
  - API-Futebol.com.br: https://www.api-futebol.com.br
  - API-Football (api-sports.io): https://www.api-football.com
  - API-Sports (futebol): https://api-sports.io
  - TheSportsDB: https://www.thesportsdb.com/free_sports_api
  - Footstats API: http://apifutebol.footstats.com.br
  - Sportradar: https://sportradar.com/midia-e-tecnologia/dados-e-conteudo/api-de-dados-esportivos/?lang=pt-br
- Datasets historicos:
  - Base dos Dados (Brasileirao Serie A): https://basedosdados.org/dataset/c861330e-bca2-474d-9073-bc70744a1b23
  - Kaggle (Campeonato Brasileiro 2003+): https://www.kaggle.com/datasets/adaoduque/campeonato-brasileiro-de-futebol
  - Kaggle (Brasileirao 2024 Serie A): https://www.kaggle.com/datasets/fabioschirmann/brasileiro-2024-srie-a-dataset
  - football-data.org: https://www.football-data.org
- Cartola FC (jogadores/scouts):
  - API nao oficial Globo: https://api.cartolafc.globo.com/atletas/mercado
  - caRtola (historico tratado): https://github.com/henriquepgomide/caRtola
  - Kaggle scouts: https://www.kaggle.com/datasets/lgmoneda/cartola-fc-brasil-scouts

#### 9.5.2 Basquete - NBB

- nbb_api (wrapper): https://github.com/GabrielPastorello/nbb_api
- API-Sports Basketball: https://api-sports.io
- Sofascore NBB (referencia operacional): https://www.sofascore.com/basketball/tournament/brazil/nbb/1562

#### 9.5.3 Volei - Superliga

- API-Sports Volleyball: https://api-sports.io
- Sofascore Superliga (referencia operacional): https://www.sofascore.com

#### 9.5.4 Tenis, MMA e outros

- API-Sports Tennis: https://api-sports.io
- API-Sports MMA: https://api-sports.io
- Formula 1 (historica): Ergast API - http://ergast.com/mrd
- Formula 1 (tempo real): OpenF1 - https://openf1.org
- Esports: Pandascore - https://pandascore.co

#### 9.5.5 Regra de escolha para esportes

- Prioridade 1: fonte brasileira especifica com boa cobertura e SLA aceitavel.
- Prioridade 2: fonte global com cobertura BR confiavel.
- Prioridade 3: dataset historico para enriquecimento e fallback.
- Observacao pratica: API-Futebol.com.br e a mais focada em Brasil, mas deve ser usada com controle de rate-limit no ambiente de producao.

## 10. Especificacoes Tecnicas (Repositorio)

### 10.1 Arquivos que devem ser adaptados na Fase 1

- `src/config/variant.ts`: aceitar `br` e fallback adequado.
- `src/config/panels.ts`: adicionar blocos `BR_PANELS`, `BR_MAP_LAYERS`, `BR_MOBILE_MAP_LAYERS`.
- `src/config/feeds.ts`: criar `BR_FEEDS` e roteamento por variante.
- `src/components/DeckGLMap.ts`: incluir preset de view `brasil` e regioes BR.
- `src/components/Map.ts` e `src/components/MapContainer.ts`: alinhamento dos tipos de view para BR.
- `vite.config.ts`: adicionar metadados de variante `br` (title, description, url, feature list).
- `src/main.ts`: garantir `data-variant="br"` e tema correto.
- `src/services/runtime.ts`: mapear hosts e fallback remoto para BRMonitor.
- `src/services/meta-tags.ts` e `src/services/story-share.ts`: URLs/base domain de BRMonitor.
- `public/favico/*`: novos assets de branding BRMonitor.

### 10.2 Mudancas de backend/API na Fase 2

- Reusar handlers existentes onde possivel.
- Criar endpoints BR-specific quando necessario.
- Manter compatibilidade inicial com namespace atual; planejar migracao de namespace em fase posterior.

### 10.3 Storage e migracoes

- Criar namespace de storage `brmonitor-*`.
- Implementar migracao one-time de chaves antigas para novas quando `SITE_VARIANT=br`.

## 11. Roadmap de Execucao

### Fase 0 - Descoberta tecnica (1-2 dias)

- Inventario de pontos `worldmonitor` hardcoded.
- Matriz de impacto (frontend, api, deploy, desktop).
- Definicao de riscos e sequencia de rollout.

### Fase 1 - Esqueleto BRMonitor (3-5 dias)

- Variante `br` funcional de ponta a ponta.
- Branding inicial, metadados, favicon e titulo.
- Paineis e layers basicos BR com dados existentes.
- Build e deploy de preview dedicados.

### Fase 2 - Dados BR prioritarios (1-2 semanas)

- Integracao de fontes federais principais.
- Normalizacao de eventos com geografia BR.
- Painel de frescor e status por fonte.
- Integracao inicial do modulo `esportes-br` com futebol (Serie A/B) e estrutura para expansao.

### Fase 3 - Cobertura regional e qualidade (1-2 semanas)

- Expansao para UFs e capitais com melhor disponibilidade.
- Melhorias de deduplicacao, confianca e score de risco.
- Testes E2E e observabilidade de ingestao.

### Fase 4 - Hardening e release (3-5 dias)

- Performance, regressao, documentacao e checklist final.
- Congelamento de escopo e release v1.

## 12. Criterios de Aceite (Definition of Done v1)

- Variante `br` builda e roda sem regressao das variantes atuais.
- UI principal em `pt-BR`, com labels e paineis BR-first.
- Pelo menos 6 paineis BR ativos com dados reais.
- Pelo menos 5 camadas BR funcionais no mapa.
- Atualizacao automatica com freshness visivel por fonte.
- Painel `esportes-br` habilitado com dados de futebol (ao vivo ou cacheado) e fallback funcional.
- Suite minima de testes (typecheck + testes de dados + smoke e2e) passando.

## 13. Riscos e Mitigacoes

- Risco: alta variacao de qualidade em dados estaduais/municipais.
Mitigacao: priorizar federal + capitais com portal estruturado e expandir por maturidade.
- Risco: acoplamento forte com branding/dominios worldmonitor.
Mitigacao: camada de configuracao por variante e migracao progressiva.
- Risco: regressao nas variantes existentes.
Mitigacao: gates de CI por variante e rollout em preview antes de producao.
- Risco: limites/rate-limit de fontes.
Mitigacao: cache agressivo, retry com backoff e fallback por dataset espelhado.

## 14. Entregaveis de Documentacao

- Este plano (`BRMONITOR.md`) como fonte de verdade de escopo.
- Documento de arquitetura BR (novo arquivo a criar na fase 1).
- Catalogo de fontes BR com contrato de ingestao por fonte.
- Runbook de operacao e troubleshooting de pipelines BR.

## 15. Proximos Passos Imediatos

1. Criar variante `br` no codigo (sem trocar namespace global ainda).
2. Implementar paineis/layers/feed minimos para demo funcional.
3. Integrar 3-5 fontes BR de maior valor para provar pipeline.
4. Publicar preview de BRMonitor e validar com checklist de aceite.

## 16. Integracao da Feature de Votos Nominais da Camara (origem `../voto-db`)

### 16.1 Objetivo da feature

- Integrar no BRMonitor a captacao de votacoes nominais da Camara dos Deputados com estrategia DB-first (cache/local-first + enriquecimento progressivo da API).
- Expor essa feature no painel `politica-br` com foco em:
  - votacoes nominais recentes;
  - votos individuais por votacao;
  - atividade recente por deputado.

### 16.2 O que reaproveitar do `voto-db` (e o que nao portar 1:1)

- Reaproveitar a logica funcional validada em `recent_votacoes_service.py`:
  - upsert de votacao por `api_votacao_id`;
  - armazenamento incremental de votos nominais;
  - criacao minima de entidades relacionadas (deputado/partido/proposicao);
  - deduplicacao de votos por `(deputado_id, votacao_id)`.
- Reaproveitar o contrato funcional dos endpoints:
  - `/votacoes/recentes`;
  - `/votacoes/{votacao_id}/votos`;
  - `/deputados/{deputado_id}/votos-recentes`.
- Nao portar 1:1:
  - `main_v2.py` monolitico (muitos dominios misturados);
  - servicos legados paralelos (analisador em arquivo + DB service);
  - comportamentos acoplados fora de escopo (ex.: post social automatico).

### 16.3 Arquitetura alvo no BRMonitor

- Seguir padrao sebuf ja usado no repositorio.
- Novo dominio sugerido: `worldmonitor/legislative/v1` (manter namespace atual no v1 para evitar refactor transversal).
- Componentes principais:
  - `proto/worldmonitor/legislative/v1/*`
  - `server/worldmonitor/legislative/v1/*`
  - `src/generated/client/worldmonitor/legislative/v1/service_client.ts`
  - `src/generated/server/worldmonitor/legislative/v1/service_server.ts`
  - registro de rotas no gateway `api/[domain]/v1/[rpc].ts`
  - `src/services/politica-br/*` e painel em `src/components`.

### 16.4 Contrato de API v1 proposto (BRMonitor)

- `ListRecentNominalVotes`:
  - filtros: `dias`, `limit`, `offset`;
  - retorno: lista de votacoes nominais + metadados de origem (`cache`, `fresh`, `mixed`) e freshness.
- `GetNominalVoteRollCall`:
  - input: `votacao_id`;
  - retorno: votos individuais + contagens agregadas por tipo de voto.
- `ListDeputyRecentVotes`:
  - input: `deputado_id`, `limit`, `offset`;
  - retorno: historico recente consolidado por proposicao/votacao.
- `SyncRecentNominalVotes` (interno/admin, opcional no v1):
  - gatilho de sincronizacao manual para warmup e backfill curto.

### 16.5 Modelo de dados canonico da feature (v1)

- Entidades:
  - `camara_votacoes` (chave: `api_votacao_id`);
  - `camara_votos` (chave unica: `api_votacao_id + deputado_id`);
  - `camara_deputados` (dimensao minima);
  - `camara_proposicoes` (dimensao minima).
- Campos minimos de votacao:
  - `api_votacao_id`, `data_hora_registro`, `sigla_orgao`, `descricao`, `resultado`, `aprovacao`, `tipo_votacao`, `proposicao_id`.
- Campos minimos de voto:
  - `api_votacao_id`, `deputado_id`, `voto`, `sigla_partido`, `sigla_uf`, `captured_at`.
- Regras:
  - idempotencia obrigatoria por chave natural;
  - sem duplicidade de voto por deputado em uma mesma votacao;
  - tolerancia a votacoes sem proposicao associada.

### 16.6 Estrategia de persistencia no BRMonitor

- Fase inicial (rapida):
  - cache e coalescing em Upstash Redis (padrao do repositorio);
  - snapshots de curto prazo para resposta rapida e resiliencia.
- Fase de consolidacao:
  - adicionar storage relacional dedicado (Postgres serverless) atras de interface de repositorio;
  - manter Redis como cache de leitura.
- Decisao arquitetural:
  - handlers nao acessam storage diretamente; usam `legislativeRepository` para permitir migracao sem quebrar API.

### 16.7 Plano de implementacao em fases

1. Fase A - Descoberta e contrato (1-2 dias)
- Definir protos, payloads e erros.
- Validar mapeamento de campos entre Camara API e schema canonico.
- Definir politicas de cache TTL por RPC.

2. Fase B - Backend minimo funcional (2-4 dias)
- Implementar handlers `ListRecentNominalVotes` e `GetNominalVoteRollCall`.
- Integrar fetch da API da Camara com dedupe + coalescing + fallback.
- Adicionar testes unitarios de normalizacao e idempotencia.

3. Fase C - Historico por deputado (1-2 dias)
- Implementar `ListDeputyRecentVotes`.
- Adicionar enriquecimento progressivo com limite de paginas/tempo.
- Instrumentar metadados de origem (`cache/fresh`) para observabilidade.

4. Fase D - UI BRMonitor (2-3 dias)
- Criar painel `camara-votos-br` (ou bloco interno do `politica-br`).
- Exibir listagem de votacoes, drill-down de votos nominais e atividade por deputado.
- Integrar data freshness/status da fonte.

5. Fase E - Hardening e release (1-2 dias)
- Rate-limit defensivo, retry com backoff e circuit breaker.
- E2E de fluxo principal.
- Runbook operacional (falha da API Camara, degradacao de cache, backfill).

### 16.8 Orquestracao sem overlap (2 agentes em paralelo)

- Agente 1 (Backend/Contratos):
  - protos `legislative`;
  - handlers e repositorio;
  - gateway e cache tier;
  - testes de contrato e normalizacao.
- Agente 2 (Frontend/Produto):
  - servico client TS;
  - novo painel/UX de votos nominais;
  - integracao com `politica-br`, i18n `pt-BR` e estados de loading/erro;
  - testes de componente e smoke E2E.
- Regra de fronteira:
  - Agente 2 consome apenas contrato proto aprovado;
  - mudanca de contrato exige PR pequeno de alinhamento antes de continuar.

### 16.9 Riscos especificos e mitigacoes

- Risco: IDs de votacao retornando erro 400 no endpoint de votos.
- Mitigacao: validar tipo nominal antes do fetch de votos e registrar erro nao-fatal.
- Risco: rate-limit/instabilidade da API da Camara.
- Mitigacao: cache agressivo, coalescing, retry com jitter e fallback para ultimo snapshot valido.
- Risco: divergencia entre modelos `voto-db` e BRMonitor.
- Mitigacao: camada de normalizacao unica e testes de fixtures reais.
- Risco: crescimento de latencia no endpoint de atividade por deputado.
- Mitigacao: limites de paginas/tempo de enriquecimento e resposta parcial com `source=db_enriched`.

### 16.10 Criterios de aceite da feature Camara

- Endpoints legislative v1 publicados e documentados.
- Captacao incremental funcionando para votacoes nominais recentes.
- Endpoint de votos por votacao com cache hit/miss observavel.
- Endpoint de atividade por deputado retornando historico consistente.
- Painel BR exibindo dados reais com fallback quando API externa falhar.
- Testes de regressao (typecheck + unit + smoke E2E) sem quebrar variantes existentes.
