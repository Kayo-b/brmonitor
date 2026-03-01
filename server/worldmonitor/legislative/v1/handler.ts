import type { LegislativeServiceHandler } from '../../../../src/generated/server/worldmonitor/legislative/v1/service_server';
import { listRecentNominalVotes } from './list-recent-nominal-votes';
import { getNominalVoteRollCall } from './get-nominal-vote-roll-call';
import { listDeputyRecentVotes } from './list-deputy-recent-votes';
import { syncRecentNominalVotesHandler } from './sync-recent-nominal-votes';

export const legislativeHandler: LegislativeServiceHandler = {
  listRecentNominalVotes,
  getNominalVoteRollCall,
  listDeputyRecentVotes,
  syncRecentNominalVotes: syncRecentNominalVotesHandler,
};
