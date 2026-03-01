import {
  LegislativeServiceClient,
  type NominalVoteSession as ProtoNominalVoteSession,
  type NominalVoteRollCallEntry as ProtoRollCallEntry,
  type DeputyVoteActivityItem as ProtoDeputyVoteActivityItem,
} from '@/generated/client/worldmonitor/legislative/v1/service_client';

export interface NominalVoteSession {
  votacaoId: string;
  dataHoraRegistro: number;
  dataHoraRegistroIso: string;
  siglaOrgao: string;
  descricao: string;
  resultado: string;
  tipoVotacao: string;
  aprovacao: number;
  votosCount: number;
  source: string;
  proposicao?: {
    id: number;
    codigo: string;
    siglaTipo: string;
    numero: string;
    ano: number;
    ementa: string;
    uri: string;
  };
}

export interface NominalRollCallEntry {
  deputado: {
    id: number;
    nome: string;
    siglaPartido: string;
    siglaUf: string;
    uri: string;
  };
  voto: string;
}

export interface DeputyRecentVoteItem {
  votacaoId: string;
  dataHoraRegistro: number;
  dataHoraRegistroIso: string;
  siglaOrgao: string;
  tipoVotacao: string;
  voto: string;
  titulo: string;
  source: string;
  proposicao?: NominalVoteSession['proposicao'];
}

const client = new LegislativeServiceClient('', {
  fetch: (...args) => globalThis.fetch(...args),
});

function mapSession(session: ProtoNominalVoteSession): NominalVoteSession {
  return {
    votacaoId: session.votacaoId,
    dataHoraRegistro: session.dataHoraRegistro,
    dataHoraRegistroIso: session.dataHoraRegistroIso,
    siglaOrgao: session.siglaOrgao,
    descricao: session.descricao,
    resultado: session.resultado,
    tipoVotacao: session.tipoVotacao,
    aprovacao: session.aprovacao,
    votosCount: session.votosCount,
    source: session.source,
    proposicao: session.proposicao
      ? {
        id: session.proposicao.id,
        codigo: session.proposicao.codigo,
        siglaTipo: session.proposicao.siglaTipo,
        numero: session.proposicao.numero,
        ano: session.proposicao.ano,
        ementa: session.proposicao.ementa,
        uri: session.proposicao.uri,
      }
      : undefined,
  };
}

function mapRollCallEntry(entry: ProtoRollCallEntry): NominalRollCallEntry {
  return {
    deputado: {
      id: entry.deputado?.id ?? 0,
      nome: entry.deputado?.nome ?? '',
      siglaPartido: entry.deputado?.siglaPartido ?? '',
      siglaUf: entry.deputado?.siglaUf ?? '',
      uri: entry.deputado?.uri ?? '',
    },
    voto: entry.voto,
  };
}

function mapDeputyItem(item: ProtoDeputyVoteActivityItem): DeputyRecentVoteItem {
  return {
    votacaoId: item.votacaoId,
    dataHoraRegistro: item.dataHoraRegistro,
    dataHoraRegistroIso: item.dataHoraRegistroIso,
    siglaOrgao: item.siglaOrgao,
    tipoVotacao: item.tipoVotacao,
    voto: item.voto,
    titulo: item.titulo,
    source: item.source,
    proposicao: item.proposicao
      ? {
        id: item.proposicao.id,
        codigo: item.proposicao.codigo,
        siglaTipo: item.proposicao.siglaTipo,
        numero: item.proposicao.numero,
        ano: item.proposicao.ano,
        ementa: item.proposicao.ementa,
        uri: item.proposicao.uri,
      }
      : undefined,
  };
}

export async function fetchRecentNominalVotes(
  dias = 7,
  limit = 20,
  offset = 0,
): Promise<{ sessions: NominalVoteSession[]; total: number; source: string }> {
  const response = await client.listRecentNominalVotes({ dias, limit, offset });
  return {
    sessions: response.votacoes.map(mapSession),
    total: response.total,
    source: response.source,
  };
}

export async function fetchNominalVoteRollCall(
  votacaoId: string,
): Promise<{
  votacaoId: string;
  votos: NominalRollCallEntry[];
  total: number;
  source: string;
  tally: { favor: number; contra: number; abstencao: number; obstrucao: number; ausente: number; outros: number };
}> {
  const response = await client.getNominalVoteRollCall({ votacaoId });
  return {
    votacaoId: response.votacaoId,
    votos: response.votos.map(mapRollCallEntry),
    total: response.total,
    source: response.source,
    tally: {
      favor: response.tally?.favor ?? 0,
      contra: response.tally?.contra ?? 0,
      abstencao: response.tally?.abstencao ?? 0,
      obstrucao: response.tally?.obstrucao ?? 0,
      ausente: response.tally?.ausente ?? 0,
      outros: response.tally?.outros ?? 0,
    },
  };
}

export async function fetchDeputyRecentVotes(
  deputadoId: number,
  limit = 10,
  offset = 0,
  scanPages = 4,
  dias = 14,
): Promise<{ items: DeputyRecentVoteItem[]; total: number; source: string }> {
  const response = await client.listDeputyRecentVotes({
    deputadoId,
    limit,
    offset,
    scanPages,
    dias,
  });
  return {
    items: response.items.map(mapDeputyItem),
    total: response.total,
    source: response.source,
  };
}
