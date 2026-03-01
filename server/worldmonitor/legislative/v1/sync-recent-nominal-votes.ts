import type {
  LegislativeServiceHandler,
  ServerContext,
  SyncRecentNominalVotesRequest,
  SyncRecentNominalVotesResponse,
} from '../../../../src/generated/server/worldmonitor/legislative/v1/service_server';
import { createLegislativeRepository } from './repository';
import { syncRecentNominalVotes } from './service';

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export const syncRecentNominalVotesHandler: LegislativeServiceHandler['syncRecentNominalVotes'] = async (
  _ctx: ServerContext,
  req: SyncRecentNominalVotesRequest,
): Promise<SyncRecentNominalVotesResponse> => {
  const dias = clamp(req.dias || 7, 1, 30);
  const maxVotacoes = clamp(req.maxVotacoes || 20, 1, 120);
  const includeRollCalls = Boolean(req.includeRollCalls);
  const repository = createLegislativeRepository();

  try {
    const result = await syncRecentNominalVotes(
      repository,
      dias,
      maxVotacoes,
      includeRollCalls,
    );
    return {
      ok: true,
      votacoesSincronizadas: result.votacoesSincronizadas,
      rollCallsSincronizados: result.rollCallsSincronizados,
      erros: result.erros,
      source: 'fresh',
      generatedAt: Date.now(),
    };
  } catch {
    return {
      ok: false,
      votacoesSincronizadas: 0,
      rollCallsSincronizados: 0,
      erros: 1,
      source: 'error',
      generatedAt: Date.now(),
    };
  }
};
