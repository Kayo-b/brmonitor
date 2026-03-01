import type {
  LegislativeServiceHandler,
  ServerContext,
  ListRecentNominalVotesRequest,
  ListRecentNominalVotesResponse,
} from '../../../../src/generated/server/worldmonitor/legislative/v1/service_server';
import { createLegislativeRepository } from './repository';
import { loadRecentNominalVotes } from './service';

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export const listRecentNominalVotes: LegislativeServiceHandler['listRecentNominalVotes'] = async (
  _ctx: ServerContext,
  req: ListRecentNominalVotesRequest,
): Promise<ListRecentNominalVotesResponse> => {
  const dias = clamp(req.dias || 7, 1, 30);
  const limit = clamp(req.limit || 20, 1, 100);
  const offset = clamp(req.offset || 0, 0, 500);
  const targetCount = offset + limit;
  const repository = createLegislativeRepository();

  try {
    const result = await loadRecentNominalVotes(repository, dias, targetCount, 6);
    return {
      votacoes: result.votacoes.slice(offset, offset + limit),
      total: result.votacoes.length,
      source: result.source,
      generatedAt: result.generatedAt,
    };
  } catch {
    return {
      votacoes: [],
      total: 0,
      source: 'error',
      generatedAt: Date.now(),
    };
  }
};
