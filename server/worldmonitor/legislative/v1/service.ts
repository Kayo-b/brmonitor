import type {
  NominalVoteSession,
  NominalVoteRollCallEntry,
  VoteTally,
  DeputyVoteActivityItem,
} from '../../../../src/generated/server/worldmonitor/legislative/v1/service_server';
import {
  buildDeputyActivityItem,
  buildVoteTally,
  fetchCamaraRollCall,
  fetchCamaraVotacaoDetalhes,
  fetchRecentCamaraVotacoes,
  normalizeNominalVoteSession,
  normalizeRollCallEntries,
} from './_shared';
import type { LegislativeRepository } from './repository';

const RECENT_CACHE_TTL_SECONDS = 5 * 60;
const ROLLCALL_CACHE_TTL_SECONDS = 30 * 60;
const DEPUTY_CACHE_TTL_SECONDS = 10 * 60;

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function sortSessionsDesc(votacoes: NominalVoteSession[]): NominalVoteSession[] {
  return [...votacoes].sort((a, b) => b.dataHoraRegistro - a.dataHoraRegistro);
}

export async function ensureNominalRollCall(
  repository: LegislativeRepository,
  votacaoId: string,
): Promise<{
  votos: NominalVoteRollCallEntry[];
  tally: VoteTally;
  source: 'cache' | 'fresh';
  generatedAt: number;
}> {
  const cached = await repository.getRollCall(votacaoId);
  if (cached) {
    return {
      votos: cached.votos,
      tally: cached.tally,
      source: 'cache',
      generatedAt: cached.generatedAt,
    };
  }

  const rawVotes = await fetchCamaraRollCall(votacaoId);
  const votos = normalizeRollCallEntries(rawVotes);
  const tally = buildVoteTally(votos);
  const generatedAt = Date.now();
  await repository.setRollCall(votacaoId, { votos, tally, generatedAt }, ROLLCALL_CACHE_TTL_SECONDS);

  return { votos, tally, source: 'fresh', generatedAt };
}

export async function loadRecentNominalVotes(
  repository: LegislativeRepository,
  dias: number,
  targetCount: number,
  scanPages: number,
): Promise<{
  votacoes: NominalVoteSession[];
  source: 'cache' | 'fresh' | 'mixed';
  generatedAt: number;
}> {
  const safeDias = clamp(dias || 7, 1, 30);
  const safeTarget = clamp(targetCount || 20, 1, 120);
  const safePages = clamp(scanPages || 4, 1, 10);

  const cached = await repository.getRecentNominalVotes(safeDias);
  if (cached && cached.votacoes.length >= safeTarget) {
    return { votacoes: sortSessionsDesc(cached.votacoes), source: 'cache', generatedAt: cached.generatedAt };
  }

  const existing = cached?.votacoes ?? [];
  const collected = [...existing];
  const seen = new Set(collected.map((v) => v.votacaoId));
  let fetchedAny = false;

  for (let page = 1; page <= safePages && collected.length < safeTarget; page += 1) {
    const summaries = await fetchRecentCamaraVotacoes(safeDias, page, 100);
    if (!summaries.length) break;

    for (const summary of summaries) {
      if (collected.length >= safeTarget) break;
      const votacaoId = String(summary.id ?? '').trim();
      if (!votacaoId || seen.has(votacaoId)) continue;

      try {
        const details = await fetchCamaraVotacaoDetalhes(votacaoId);
        if (!details) continue;
        const normalized = normalizeNominalVoteSession(summary, details, 'fresh');
        if (!normalized) continue;
        const rollCall = await repository.getRollCall(votacaoId);
        normalized.votosCount = rollCall?.votos.length ?? 0;
        collected.push(normalized);
        seen.add(votacaoId);
        fetchedAny = true;
      } catch {
        // Skip malformed entries; never fail the entire response for one votacao.
      }
    }
  }

  const sorted = sortSessionsDesc(collected);
  const generatedAt = Date.now();

  await repository.setRecentNominalVotes(
    safeDias,
    { votacoes: sorted, generatedAt },
    RECENT_CACHE_TTL_SECONDS,
  );

  if (cached && fetchedAny) return { votacoes: sorted, source: 'mixed', generatedAt };
  if (cached && !fetchedAny) return { votacoes: sortSessionsDesc(cached.votacoes), source: 'cache', generatedAt: cached.generatedAt };
  return { votacoes: sorted, source: 'fresh', generatedAt };
}

export async function loadDeputyRecentVotes(
  repository: LegislativeRepository,
  deputadoId: number,
  dias: number,
  targetCount: number,
  scanPages: number,
): Promise<{
  items: DeputyVoteActivityItem[];
  source: 'cache' | 'fresh' | 'mixed';
  generatedAt: number;
}> {
  const safeDeputadoId = clamp(Math.trunc(deputadoId), 1, Number.MAX_SAFE_INTEGER);
  const safeDias = clamp(dias || 14, 1, 30);
  const safeTarget = clamp(targetCount || 10, 1, 60);
  const safePages = clamp(scanPages || 4, 1, 10);

  const cached = await repository.getDeputyRecentVotes(safeDeputadoId, safeDias);
  if (cached && cached.items.length >= safeTarget) {
    return { items: cached.items, source: 'cache', generatedAt: cached.generatedAt };
  }

  const recent = await loadRecentNominalVotes(
    repository,
    safeDias,
    Math.max(safeTarget * 3, 20),
    safePages,
  );

  const items: DeputyVoteActivityItem[] = [];

  for (const session of recent.votacoes) {
    if (items.length >= safeTarget) break;
    try {
      const rollCall = await ensureNominalRollCall(repository, session.votacaoId);
      const deputyVote = rollCall.votos.find((entry) => entry.deputado?.id === safeDeputadoId);
      if (!deputyVote) continue;
      items.push(
        buildDeputyActivityItem(
          session,
          deputyVote.voto,
          rollCall.source === 'cache' ? 'cache' : recent.source,
        ),
      );
    } catch {
      // Skip roll-call errors and keep partial results.
    }
  }

  const generatedAt = Date.now();
  await repository.setDeputyRecentVotes(
    safeDeputadoId,
    safeDias,
    { items, generatedAt },
    DEPUTY_CACHE_TTL_SECONDS,
  );

  if (cached && items.length > 0) return { items, source: 'mixed', generatedAt };
  if (cached && items.length === 0) return { items: cached.items, source: 'cache', generatedAt: cached.generatedAt };
  return { items, source: recent.source === 'cache' ? 'mixed' : recent.source, generatedAt };
}

export async function syncRecentNominalVotes(
  repository: LegislativeRepository,
  dias: number,
  maxVotacoes: number,
  includeRollCalls: boolean,
): Promise<{
  votacoesSincronizadas: number;
  rollCallsSincronizados: number;
  erros: number;
}> {
  const safeDias = clamp(dias || 7, 1, 30);
  const safeMax = clamp(maxVotacoes || 20, 1, 120);
  const recent = await loadRecentNominalVotes(repository, safeDias, safeMax, 8);

  let rollCallsSincronizados = 0;
  let erros = 0;
  if (includeRollCalls) {
    const sessions = recent.votacoes.slice(0, safeMax);
    for (const session of sessions) {
      try {
        const rollCall = await ensureNominalRollCall(repository, session.votacaoId);
        if (rollCall.votos.length > 0) rollCallsSincronizados += 1;
      } catch {
        erros += 1;
      }
    }
  }

  return {
    votacoesSincronizadas: Math.min(recent.votacoes.length, safeMax),
    rollCallsSincronizados,
    erros,
  };
}
