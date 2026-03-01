import type {
  LegislativeServiceHandler,
  ServerContext,
  ListDeputyRecentVotesRequest,
  ListDeputyRecentVotesResponse,
} from '../../../../src/generated/server/worldmonitor/legislative/v1/service_server';
import { createLegislativeRepository } from './repository';
import { loadDeputyRecentVotes } from './service';

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export const listDeputyRecentVotes: LegislativeServiceHandler['listDeputyRecentVotes'] = async (
  _ctx: ServerContext,
  req: ListDeputyRecentVotesRequest,
): Promise<ListDeputyRecentVotesResponse> => {
  const deputadoId = Math.trunc(req.deputadoId || 0);
  const limit = clamp(req.limit || 10, 1, 50);
  const offset = clamp(req.offset || 0, 0, 200);
  const dias = clamp(req.dias || 14, 1, 30);
  const scanPages = clamp(req.scanPages || 4, 1, 10);
  const targetCount = offset + limit;

  if (!deputadoId) {
    return {
      items: [],
      total: 0,
      source: 'invalid_request',
      generatedAt: Date.now(),
    };
  }

  const repository = createLegislativeRepository();
  try {
    const result = await loadDeputyRecentVotes(
      repository,
      deputadoId,
      dias,
      targetCount,
      scanPages,
    );

    return {
      items: result.items.slice(offset, offset + limit),
      total: result.items.length,
      source: result.source,
      generatedAt: result.generatedAt,
    };
  } catch {
    return {
      items: [],
      total: 0,
      source: 'error',
      generatedAt: Date.now(),
    };
  }
};
