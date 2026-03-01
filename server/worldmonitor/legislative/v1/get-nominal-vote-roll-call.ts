import type {
  LegislativeServiceHandler,
  ServerContext,
  GetNominalVoteRollCallRequest,
  GetNominalVoteRollCallResponse,
} from '../../../../src/generated/server/worldmonitor/legislative/v1/service_server';
import { createLegislativeRepository } from './repository';
import { ensureNominalRollCall } from './service';

export const getNominalVoteRollCall: LegislativeServiceHandler['getNominalVoteRollCall'] = async (
  _ctx: ServerContext,
  req: GetNominalVoteRollCallRequest,
): Promise<GetNominalVoteRollCallResponse> => {
  const votacaoId = String(req.votacaoId || '').trim();
  if (!votacaoId) {
    return {
      votacaoId: '',
      votos: [],
      tally: {
        favor: 0,
        contra: 0,
        abstencao: 0,
        obstrucao: 0,
        ausente: 0,
        outros: 0,
      },
      total: 0,
      source: 'invalid_request',
      generatedAt: Date.now(),
    };
  }

  const repository = createLegislativeRepository();
  try {
    const result = await ensureNominalRollCall(repository, votacaoId);
    return {
      votacaoId,
      votos: result.votos,
      tally: result.tally,
      total: result.votos.length,
      source: result.source,
      generatedAt: result.generatedAt,
    };
  } catch {
    return {
      votacaoId,
      votos: [],
      tally: {
        favor: 0,
        contra: 0,
        abstencao: 0,
        obstrucao: 0,
        ausente: 0,
        outros: 0,
      },
      total: 0,
      source: 'error',
      generatedAt: Date.now(),
    };
  }
};
