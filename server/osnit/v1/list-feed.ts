import type {
  ListFeedRequest,
  ListFeedResponse,
  OsnitServiceHandler,
  ServerContext,
} from '../../../src/generated/server/osnit/v1/service_server';
import { listFeed as listFeedInternal } from './_shared';
import { withNormalizedTagFilters } from './query-filters';
import { readTranslateTarget, translateItems } from './translation';

export const listFeed: OsnitServiceHandler['listFeed'] = async (
  ctx: ServerContext,
  req: ListFeedRequest,
): Promise<ListFeedResponse> => {
  const response = await listFeedInternal(withNormalizedTagFilters(ctx, req));
  const targetLang = readTranslateTarget(ctx.request.url);
  if (!targetLang) return response;
  return {
    ...response,
    items: await translateItems(response.items, targetLang),
  };
};
