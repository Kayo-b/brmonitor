import type {
  NominalVoteSession,
  LegislativeProposicao,
  NominalVoteRollCallEntry,
  VoteTally,
  DeputyVoteActivityItem,
} from '../../../../src/generated/server/worldmonitor/legislative/v1/service_server';
import { CHROME_UA } from '../../../_shared/constants';

const CAMARA_BASE_URL = 'https://dadosabertos.camara.leg.br/api/v2';
const DEFAULT_FETCH_TIMEOUT_MS = 10_000;

interface CamaraApiEnvelope<T> {
  dados?: T;
}

export interface CamaraVotacaoResumo {
  id?: string | number;
  dataHoraRegistro?: string;
  data?: string;
  descricao?: string;
  siglaOrgao?: string;
  resultado?: string;
  aprovacao?: number | boolean | null;
}

export interface CamaraVotacaoDetalhes {
  id?: string | number;
  dataHoraRegistro?: string;
  descricao?: string;
  descResultado?: string;
  siglaOrgao?: string;
  aprovacao?: number | boolean | null;
  descTipo?: string;
  proposicoesAfetadas?: any[];
  objetosPossiveis?: any[];
}

export interface CamaraVotoRaw {
  tipoVoto?: string;
  voto?: string;
  deputado_?: any;
  deputado?: any;
}

function asString(value: unknown): string {
  if (typeof value === 'string') return value;
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  return '';
}

function asNumber(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return 0;
}

function toEpochMs(rawDate: string): number {
  if (!rawDate) return 0;
  const parsed = Date.parse(rawDate);
  return Number.isFinite(parsed) ? parsed : 0;
}

function toIso(rawDate: string): string {
  if (!rawDate) return '';
  const parsed = new Date(rawDate);
  return Number.isNaN(parsed.getTime()) ? '' : parsed.toISOString();
}

function normalizeAprovacao(value: unknown): number {
  if (typeof value === 'boolean') return value ? 1 : 0;
  if (typeof value === 'number') return Number.isFinite(value) ? Math.trunc(value) : 0;
  if (typeof value === 'string') {
    const lowered = value.trim().toLowerCase();
    if (!lowered) return 0;
    if (lowered === 'true') return 1;
    if (lowered === 'false') return 0;
    const parsed = Number(lowered);
    return Number.isFinite(parsed) ? Math.trunc(parsed) : 0;
  }
  return 0;
}

function getNominalProposicao(details: CamaraVotacaoDetalhes): LegislativeProposicao | undefined {
  const proposicao = (details.proposicoesAfetadas && details.proposicoesAfetadas[0])
    || (details.objetosPossiveis && details.objetosPossiveis[0]);
  if (!proposicao) return undefined;

  const id = asNumber(proposicao.id ?? proposicao.codProposicao);
  const siglaTipo = asString(proposicao.siglaTipo ?? proposicao.codTipo);
  const numero = asString(proposicao.numero);
  const ano = asNumber(proposicao.ano);
  const codigo = siglaTipo && numero && ano ? `${siglaTipo} ${numero}/${ano}` : '';

  return {
    id,
    codigo,
    siglaTipo,
    numero,
    ano,
    ementa: asString(proposicao.ementa),
    uri: asString(proposicao.uri),
  };
}

function isNominalVotacao(summary: CamaraVotacaoResumo, details: CamaraVotacaoDetalhes): boolean {
  const hasProposicao = Boolean(
    (details.proposicoesAfetadas && details.proposicoesAfetadas.length > 0)
    || (details.objetosPossiveis && details.objetosPossiveis.length > 0),
  );
  const combinedDescription = `${asString(summary.descricao)} ${asString(details.descricao)} ${asString(details.descTipo)}`.toLowerCase();
  return hasProposicao || combinedDescription.includes('nominal');
}

function classifyVoto(rawVote: string): keyof VoteTally {
  const normalized = rawVote
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();

  if (normalized.startsWith('sim')) return 'favor';
  if (normalized.startsWith('nao') || normalized.startsWith('não')) return 'contra';
  if (normalized.startsWith('abstenc')) return 'abstencao';
  if (normalized.startsWith('obstruc')) return 'obstrucao';
  if (normalized.includes('ausen') || normalized.startsWith('art. 17')) return 'ausente';
  return 'outros';
}

export function buildVoteTally(votos: NominalVoteRollCallEntry[]): VoteTally {
  const tally: VoteTally = {
    favor: 0,
    contra: 0,
    abstencao: 0,
    obstrucao: 0,
    ausente: 0,
    outros: 0,
  };
  for (const entry of votos) {
    tally[classifyVoto(entry.voto)] += 1;
  }
  return tally;
}

export function normalizeNominalVoteSession(
  summary: CamaraVotacaoResumo,
  details: CamaraVotacaoDetalhes,
  source: string,
): NominalVoteSession | null {
  const votacaoId = String(summary.id ?? details.id ?? '').trim();
  if (!votacaoId) return null;
  if (!isNominalVotacao(summary, details)) return null;

  const rawDate = asString(summary.dataHoraRegistro || details.dataHoraRegistro || summary.data);
  const dataHoraRegistro = toEpochMs(rawDate);
  const proposicao = getNominalProposicao(details);

  return {
    votacaoId,
    dataHoraRegistro,
    dataHoraRegistroIso: toIso(rawDate),
    siglaOrgao: asString(summary.siglaOrgao || details.siglaOrgao),
    descricao: asString(details.descricao || summary.descricao),
    resultado: asString(details.descResultado || summary.resultado),
    tipoVotacao: 'nominal',
    aprovacao: normalizeAprovacao(details.aprovacao ?? summary.aprovacao),
    proposicao,
    votosCount: 0,
    source,
  };
}

export function normalizeRollCallEntries(rawVotes: CamaraVotoRaw[]): NominalVoteRollCallEntry[] {
  const entries: NominalVoteRollCallEntry[] = [];
  const seenDeputados = new Set<number>();

  for (const raw of rawVotes) {
    const deputadoData = raw.deputado_ ?? raw.deputado ?? {};
    const deputadoId = asNumber(deputadoData.id);
    const voto = asString(raw.tipoVoto || raw.voto).trim();
    if (!deputadoId || !voto) continue;
    if (seenDeputados.has(deputadoId)) continue;
    seenDeputados.add(deputadoId);

    entries.push({
      deputado: {
        id: deputadoId,
        nome: asString(deputadoData.nome),
        siglaPartido: asString(deputadoData.siglaPartido),
        siglaUf: asString(deputadoData.siglaUf),
        uri: asString(deputadoData.uri),
      },
      voto,
    });
  }

  return entries;
}

export function buildDeputyActivityItem(
  session: NominalVoteSession,
  voto: string,
  source: string,
): DeputyVoteActivityItem {
  return {
    votacaoId: session.votacaoId,
    dataHoraRegistro: session.dataHoraRegistro,
    dataHoraRegistroIso: session.dataHoraRegistroIso,
    siglaOrgao: session.siglaOrgao,
    tipoVotacao: session.tipoVotacao,
    voto,
    titulo: session.proposicao?.ementa || session.descricao || `Votacao ${session.votacaoId}`,
    source,
    proposicao: session.proposicao,
  };
}

function encodeParams(params?: Record<string, string | number>): string {
  if (!params) return '';
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    search.set(key, String(value));
  }
  return search.toString() ? `?${search.toString()}` : '';
}

export async function fetchCamaraJson<T>(
  endpoint: string,
  params?: Record<string, string | number>,
): Promise<T | null> {
  const query = encodeParams(params);
  const response = await fetch(`${CAMARA_BASE_URL}${endpoint}${query}`, {
    headers: {
      Accept: 'application/json',
      'User-Agent': CHROME_UA,
    },
    signal: AbortSignal.timeout(DEFAULT_FETCH_TIMEOUT_MS),
  });
  if (!response.ok) return null;
  const payload = await response.json() as CamaraApiEnvelope<T>;
  return payload.dados ?? null;
}

export function getDateWindow(dias: number): { dataInicio: string; dataFim: string } {
  const safeDias = Math.max(1, Math.min(dias || 7, 30));
  const end = new Date();
  const start = new Date(end.getTime() - safeDias * 24 * 60 * 60 * 1000);
  return {
    dataInicio: start.toISOString().slice(0, 10),
    dataFim: end.toISOString().slice(0, 10),
  };
}

export async function fetchRecentCamaraVotacoes(
  dias: number,
  pagina: number,
  itens = 100,
): Promise<CamaraVotacaoResumo[]> {
  const { dataInicio, dataFim } = getDateWindow(dias);
  const data = await fetchCamaraJson<CamaraVotacaoResumo[]>('/votacoes', {
    dataInicio,
    dataFim,
    ordem: 'DESC',
    ordenarPor: 'dataHoraRegistro',
    itens,
    pagina,
  });
  return Array.isArray(data) ? data : [];
}

export async function fetchCamaraVotacaoDetalhes(
  votacaoId: string,
): Promise<CamaraVotacaoDetalhes | null> {
  return fetchCamaraJson<CamaraVotacaoDetalhes>(`/votacoes/${encodeURIComponent(votacaoId)}`);
}

export async function fetchCamaraRollCall(
  votacaoId: string,
): Promise<CamaraVotoRaw[]> {
  const data = await fetchCamaraJson<CamaraVotoRaw[]>(`/votacoes/${encodeURIComponent(votacaoId)}/votos`);
  return Array.isArray(data) ? data : [];
}
