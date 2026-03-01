# Dados Abertos Brasil — Fontes por Esfera

> **Legenda:**
> - ✅ Portal de Dados Abertos (estruturado, datasets downloadáveis)
> - 🔶 Portal de Transparência (acesso a informações, menos estruturado para consumo por API)
> - 🔴 Sem portal identificado / acesso somente via LAI (Lei de Acesso à Informação)
> - 📡 API disponível
> - 📄 CSV/Arquivo para download
> - ⚠️ Portal existe mas com poucos datasets publicados

---

## FEDERAL

### Portais Agregadores Nacionais

| Nome | Tipo | Link | Dados Disponíveis |
|------|------|------|-------------------|
| Portal Brasileiro de Dados Abertos | ✅ 📡 📄 | https://dados.gov.br | Catálogo federado de todos os órgãos federais |
| Portal da Transparência (CGU) | ✅ 📄 | https://portaldatransparencia.gov.br/download-de-dados | Gastos, servidores, Bolsa Família, contratos, convênios |
| IBGE Cidades@ | ✅ 📡 | https://cidades.ibge.gov.br | Censo, população, renda, saúde, educação por município |
| IBGE API Serviços | ✅ 📡 | https://servicodados.ibge.gov.br/api/docs | API REST: municípios, indicadores, malhas geográficas |
| IPEADATA | ✅ 📡 📄 | http://www.ipeadata.gov.br | Indicadores econômicos e sociais históricos |
| Base dos Dados (BD) | ✅ 📡 | https://basedosdados.org | Dados públicos tratados e prontos para análise (BigQuery) |

### Clima / Tempo / Meio Ambiente

| Órgão | Tipo | Link | Dados |
|-------|------|------|-------|
| CPTEC/INPE | ✅ 📡 | http://servicos.cptec.inpe.br/XML/ | Previsão de tempo por município, capitais, UV, ondas (XML/REST) |
| INMET BDMEP | ✅ 📄 | https://bdmep.inmet.gov.br | Histórico estações meteorológicas desde 1961 (requer cadastro gratuito) |
| INPE Queimadas | ✅ 📄 | https://data.inpe.br/queimadas/pages/secao_downloads/dados-abertos/ | Focos de incêndio a cada 10 min, CSV e KML |
| TerraBrasilis/INPE (PRODES/DETER) | ✅ 📡 📄 | https://terrabrasilis.dpi.inpe.br | Alertas desmatamento, dados por bioma, WFS/WCS/REST |
| PRODES Amazônia | ✅ 📄 | http://www.obt.inpe.br/OBT/assuntos/programas/amazonia/prodes | Taxas desmatamento desde 1988 (shapefile, raster) |
| MapBiomas | ✅ 📄 | https://mapbiomas.org | Uso e cobertura do solo histórico desde 1985, todos biomas |
| ANA (Hidroweb) | ✅ 📄 | https://www.snirh.gov.br/hidroweb/ | Níveis de rios, chuvas, alertas de cheias por estação |
| CEMADEN | ✅ 📄 | http://www.cemaden.gov.br | Alertas de desastres naturais (deslizamentos, enchentes) |
| CETESB (Qualidade do Ar SP) | ✅ 📡 📄 | https://cetesb.sp.gov.br/ar/qualar/ | Dados horários de qualidade do ar por estação (SP) |

### Segurança Pública / Criminalidade

| Órgão | Tipo | Link | Dados |
|-------|------|------|-------|
| SINESP / Ministério da Justiça | ✅ 📄 | https://dados.mj.gov.br/dataset/sistema-nacional-de-estatisticas-de-seguranca-publica | Ocorrências criminais por município/UF (lag ~3 meses) |
| PRF - Acidentes Rodovias Federais | ✅ 📄 | https://www.gov.br/prf/pt-br/acesso-a-informacao/dados-abertos | Todos acidentes em rodovias federais com localização |
| IBAMA - Autos de Infração | ✅ 📄 | https://www.ibama.gov.br/component/legislacao/?view=legislacao&legislacao=136489 | Infrações ambientais, mineração ilegal |

### Saúde

| Órgão | Tipo | Link | Dados |
|-------|------|------|-------|
| DataSUS | ✅ 📄 | https://datasus.saude.gov.br | Mortalidade, doenças, internações por município (TABNET) |
| OpenDataSUS | ✅ 📡 📄 | https://opendatasus.saude.gov.br | COVID-19, vacinação, SRAG, vigilância epidemiológica |

### Outros Temas Federais

| Órgão | Tipo | Link | Dados |
|-------|------|------|-------|
| ANEEL Dados Abertos | ✅ 📡 📄 | https://dados.gov.br/organization/agencia-nacional-de-energia-eletrica-aneel | Geração, apagões, distribuidoras, qualidade do serviço |
| Banco Central - Dados Abertos | ✅ 📡 | https://dadosabertos.bcb.gov.br | Indicadores financeiros, câmbio, instituições |
| TSE - Dados Eleitorais | ✅ 📄 | https://dadosabertos.tse.jus.br | Candidatos, votação, prestação de contas por município |
| INEP / MEC | ✅ 📄 | https://www.gov.br/inep/pt-br/acesso-a-informacao/dados-abertos | ENEM, IDEB, censo escolar |
| RAIS / MTE | ✅ 📄 | http://www.rais.gov.br/sitio/index.jsf | Emprego formal por setor e município |
| INCRA - Georreferenciamento | ✅ 📄 | https://certificacao.incra.gov.br/csv_shp/exp_shp.py | Shapefile de imóveis rurais, assentamentos |
| ACLED (violência política) | ✅ 📡 📄 | https://acleddata.com | Eventos de violência política e manifestações no Brasil (cadastro gratuito) |

---

## ESTADOS E CAPITAIS

> Para estados sem portal de dados abertos dedicado, o acesso principal se dá via portal de transparência ou LAI.

---

### REGIÃO NORTE

#### 🟢 Acre (AC) — Capital: Rio Branco
| Esfera | Tipo | Link | Observação |
|--------|------|------|-----------|
| Estado | 🔶 | https://transparencia.ac.gov.br | Transparência, sem portal de dados abertos estruturado |
| Município | 🔴 | — | Sem portal identificado |

#### 🟡 Amapá (AP) — Capital: Macapá
| Esfera | Tipo | Link | Observação |
|--------|------|------|-----------|
| Estado | 🔶 | https://transparencia.ap.gov.br | Transparência fiscal |
| Município | 🔴 | — | Sem portal identificado |

#### 🟡 Amazonas (AM) — Capital: Manaus
| Esfera | Tipo | Link | Observação |
|--------|------|------|-----------|
| Estado | 🔶 | https://transparencia.am.gov.br | Transparência fiscal |
| Manaus | 🔶 | https://transparencia.manaus.am.gov.br | Portal de transparência municipal |

#### 🟡 Pará (PA) — Capital: Belém
| Esfera | Tipo | Link | Observação |
|--------|------|------|-----------|
| Estado | 🔶 | https://www.transparencia.pa.gov.br | Transparência fiscal |
| Belém | 🔶 | https://transparencia.belem.pa.gov.br | Transparência municipal |
| Segurança | 📄 | https://segup.pa.gov.br | Dados da SEGUP (formato variável) |

#### 🔴 Rondônia (RO) — Capital: Porto Velho
| Esfera | Tipo | Link | Observação |
|--------|------|------|-----------|
| Estado | 🔶 | https://transparencia.ro.gov.br | Transparência fiscal |
| Município | 🔴 | — | Sem portal identificado |

#### 🔴 Roraima (RR) — Capital: Boa Vista
| Esfera | Tipo | Link | Observação |
|--------|------|------|-----------|
| Estado | 🔶 | https://transparencia.rr.gov.br | Transparência fiscal |
| Município | 🔴 | — | Sem portal identificado |

#### 🟡 Tocantins (TO) — Capital: Palmas
| Esfera | Tipo | Link | Observação |
|--------|------|------|-----------|
| Estado | 🔶 | https://transparencia.to.gov.br | Transparência fiscal |
| Município | 🔴 | — | Sem portal identificado |

---

### REGIÃO NORDESTE

#### 🟡 Alagoas (AL) — Capital: Maceió
| Esfera | Tipo | Link | Observação |
|--------|------|------|-----------|
| Estado | 🔶 | https://transparencia.al.gov.br | Transparência fiscal |
| Município | 🔴 | — | Sem portal identificado |
| Segurança | 📄 | https://www.ssp.al.gov.br | SSP-AL: boletins de ocorrência (formatos variados) |

#### 🟢 Bahia (BA) — Capital: Salvador
| Esfera | Tipo | Link | Observação |
|--------|------|------|-----------|
| Estado | ✅ 📄 | https://www.dados.ba.gov.br | Portal de dados abertos (CKAN) |
| Salvador | 🔶 | https://www.transparencia.salvador.ba.gov.br | Transparência municipal |
| TCE Bahia | ✅ 📄 | https://www.tce.ba.gov.br/dados-abertos | Contratos, licitações, contas públicas municipais |

#### 🟢 Ceará (CE) — Capital: Fortaleza
| Esfera | Tipo | Link | Observação |
|--------|------|------|-----------|
| Estado | ✅ 📡 📄 | https://dados.ce.gov.br | Portal de dados abertos estadual |
| Fortaleza | ✅ 📄 | https://dados.fortaleza.ce.gov.br | Portal de dados abertos municipal (CKAN) |
| Recursos Hídricos | ✅ 📡 | https://www.funceme.br | FUNCEME: dados climáticos, chuvas, açudes |

#### 🟡 Maranhão (MA) — Capital: São Luís
| Esfera | Tipo | Link | Observação |
|--------|------|------|-----------|
| Estado | 🔶 | https://transparencia.ma.gov.br | Transparência fiscal |
| Município | 🔴 | — | Sem portal identificado |

#### 🟡 Paraíba (PB) — Capital: João Pessoa
| Esfera | Tipo | Link | Observação |
|--------|------|------|-----------|
| Estado | 🔶 | https://transparencia.pb.gov.br | Transparência fiscal |
| João Pessoa | 🔶 | https://transparencia.joaopessoa.pb.gov.br | Transparência municipal |

#### 🟢 Pernambuco (PE) — Capital: Recife
| Esfera | Tipo | Link | Observação |
|--------|------|------|-----------|
| Estado | ✅ 📄 | https://dados.pe.gov.br | Portal de dados abertos (CKAN) |
| Recife | ✅ 📡 📄 | http://dados.recife.pe.gov.br | Portal robusto, referência nacional |
| Segurança | 📄 | https://www.sds.pe.gov.br | SDS-PE: estatísticas de segurança pública |

#### 🟡 Piauí (PI) — Capital: Teresina
| Esfera | Tipo | Link | Observação |
|--------|------|------|-----------|
| Estado | 🔶 | https://transparencia.pi.gov.br | Transparência fiscal |
| Município | 🔴 | — | Sem portal identificado |

#### 🟡 Rio Grande do Norte (RN) — Capital: Natal
| Esfera | Tipo | Link | Observação |
|--------|------|------|-----------|
| Estado | 🔶 | https://transparencia.rn.gov.br | Transparência fiscal |
| Natal | 🔶 | https://natal.rn.gov.br/transparencia | Transparência municipal |

#### 🟡 Sergipe (SE) — Capital: Aracaju
| Esfera | Tipo | Link | Observação |
|--------|------|------|-----------|
| Estado | 🔶 | https://transparencia.se.gov.br | Transparência fiscal |
| Município | 🔴 | — | Sem portal identificado |

---

### REGIÃO CENTRO-OESTE

#### 🟢 Distrito Federal (DF) — Capital: Brasília
| Esfera | Tipo | Link | Observação |
|--------|------|------|-----------|
| GDF | ✅ 📄 | https://dados.df.gov.br | Portal de dados abertos (CKAN) |
| Transparência | 🔶 | https://www.transparencia.df.gov.br | Gastos, contratos, servidores |
| Segurança | 📄 | https://www.ssp.df.gov.br | SSPDF: estatísticas de criminalidade |

#### ⚠️ Goiás (GO) — Capital: Goiânia
| Esfera | Tipo | Link | Observação |
|--------|------|------|-----------|
| Estado | ⚠️ 📄 | https://dadosabertos.go.gov.br | Portal existe mas com poucos datasets publicados |
| Goiânia | 🔶 | https://www.goiania.go.gov.br/transparencia | Transparência municipal |

#### 🟡 Mato Grosso (MT) — Capital: Cuiabá
| Esfera | Tipo | Link | Observação |
|--------|------|------|-----------|
| Estado | 🔶 | https://transparencia.mt.gov.br | Transparência fiscal |
| Desmatamento | 📄 | https://dados.gov.br (filtrar MT) | INPE cobre MT extensivamente |
| Município | 🔴 | — | Sem portal identificado |

#### 🟡 Mato Grosso do Sul (MS) — Capital: Campo Grande
| Esfera | Tipo | Link | Observação |
|--------|------|------|-----------|
| Estado | 🔶 | https://transparencia.ms.gov.br | Transparência fiscal |
| Município | 🔴 | — | Sem portal identificado |

---

### REGIÃO SUDESTE

#### 🟢 Espírito Santo (ES) — Capital: Vitória
| Esfera | Tipo | Link | Observação |
|--------|------|------|-----------|
| Estado | ✅ 📄 | https://dados.es.gov.br | Portal de dados abertos |
| Vitória | ✅ 📡 📄 | https://transparencia.vitoria.es.gov.br | Dados abertos municipais |

#### 🟢 Minas Gerais (MG) — Capital: Belo Horizonte
| Esfera | Tipo | Link | Observação |
|--------|------|------|-----------|
| Estado | ✅ 📡 📄 | https://dados.mg.gov.br | Portal robusto, orçamento, convênios, contratos |
| Segurança/Sejusp | ✅ 📄 | https://www.seguranca.mg.gov.br/transparencia/dados-abertos | Crimes violentos, homicídios, roubos por município (CSV) |
| Belo Horizonte | ✅ 📡 📄 | https://dados.pbh.gov.br | Portal robusto de dados abertos municipais |

#### 🟢 Rio de Janeiro (RJ) — Capital: Rio de Janeiro
| Esfera | Tipo | Link | Observação |
|--------|------|------|-----------|
| Estado | ✅ 📄 | https://dadosabertos.rj.gov.br | Portal de dados abertos estadual (CKAN) |
| ISP-RJ (Segurança) | ✅ 📡 📄 | https://www.ispdados.rj.gov.br | Instituto de Segurança Pública: ocorrências, UPPs, letalidade policial |
| Rio de Janeiro (cidade) | ✅ 📡 📄 | https://data.rio | Portal DATA.RIO — referência nacional, API REST |

#### 🟢 São Paulo (SP) — Capital: São Paulo
| Esfera | Tipo | Link | Observação |
|--------|------|------|-----------|
| Estado | ✅ 📄 | https://dadosabertos.sp.gov.br | Portal de dados abertos estadual |
| SSP-SP (Segurança) | ✅ 📄 | https://www.ssp.sp.gov.br/estatistica | Ocorrências por município, boletins anuais e mensais |
| São Paulo (cidade) | ✅ 📡 📄 | https://dados.prefeitura.sp.gov.br | Portal robusto, CKAN, API, datasets variados |
| CETESB (Qualidade do ar) | ✅ 📡 | https://cetesb.sp.gov.br/ar/qualar/ | Dados horários por estação no estado de SP |

---

### REGIÃO SUL

#### 🟢 Paraná (PR) — Capital: Curitiba
| Esfera | Tipo | Link | Observação |
|--------|------|------|-----------|
| Estado | ✅ 📄 | https://dados.pr.gov.br | Portal de dados abertos estadual |
| Curitiba | ✅ 📡 📄 | https://dadosabertos.curitiba.pr.gov.br | Portal bem estruturado, CKAN |

#### 🟢 Rio Grande do Sul (RS) — Capital: Porto Alegre
| Esfera | Tipo | Link | Observação |
|--------|------|------|-----------|
| Estado | ✅ 📄 | https://dados.rs.gov.br | Portal de dados abertos estadual |
| Porto Alegre | ✅ 📡 📄 | https://datapoa.com.br | DataPOA — um dos portais municipais mais completos do Brasil |
| Segurança | 📄 | https://www.ssp.rs.gov.br | SSP-RS: estatísticas de segurança pública |

#### 🟡 Santa Catarina (SC) — Capital: Florianópolis
| Esfera | Tipo | Link | Observação |
|--------|------|------|-----------|
| Estado | ✅ 📄 | https://dados.sc.gov.br | Portal de dados abertos estadual |
| Florianópolis | 🔶 | https://transparencia.pmf.sc.gov.br | Transparência municipal |

---

## FONTES TEMÁTICAS TRANSVERSAIS (cobertura nacional)

| Fonte | Tipo | Link | Dados |
|-------|------|------|-------|
| FBSP (Fórum Brasileiro de Segurança Pública) | 📄 | https://forumseguranca.org.br/estatisticas | Anuário consolidado de segurança pública por estado |
| MapBiomas Alerta | ✅ 📡 | https://alerta.mapbiomas.org | Alertas de desmatamento e degradação em tempo real |
| Monitor de Secas | ✅ 📄 | https://monitordesecas.ana.gov.br | Monitoramento de seca por município — ANA + parceiros |
| INPE Queimadas (Mapa) | ✅ 📡 | https://queimadas.dgi.inpe.br/queimadas/bdqueimadas | Mapa interativo e API de focos de incêndio |
| PRF Acidentes (API) | ✅ 📄 | https://www.gov.br/prf/pt-br/acesso-a-informacao/dados-abertos/dados-abertos-acidentes | CSV anual de acidentes em rodovias federais desde 2007 |
| CNJ - Justiça em Números | ✅ 📄 | https://www.cnj.jus.br/pesquisas-judiciarias/justica-em-numeros | Estatísticas do judiciário por tribunal |
| ANTT - Transporte Rodoviário | ✅ 📄 | https://dados.gov.br/organization/agencia-nacional-de-transportes-terrestres-antt | Frotas, acidentes, rodovias federais |
| ANS - Saúde Suplementar | ✅ 📡 📄 | https://dados.ans.gov.br | Planos de saúde, beneficiários por município |

---

## NOTAS IMPORTANTES

1. **Qualidade varia muito**: Portais de estados do Norte e partes do Nordeste são majoritariamente de transparência fiscal, sem datasets estruturados para consumo programático.
2. **SINESP**: Lag de ~3 meses nos dados consolidados. Para dados mais recentes, consultar SSPs estaduais individualmente.
3. **Dados de segurança estaduais**: MG (Sejusp) e RJ (ISP) são os mais completos e estruturados. SP (SSP) é completo mas em PDF/Excel. Demais estados variam muito.
4. **API vs CSV**: A maioria dos portais estaduais oferece CSV para download, não API REST. Para APIs, os melhores são: IBGE, CPTEC/INPE, DATA.RIO, dados.recife.pe.gov.br, datapoa.com.br.
5. **Base dos Dados** (basedosdados.org): Agrega e trata dados de múltiplas fontes federais, disponibilizando via BigQuery — boa opção para análises cruzadas sem tratar dados brutos.

---

*Última atualização: Março 2026 | Contribuições via LAI possíveis para estados sem portal identificado*
