import type {
  OsnitServiceHandler,
  SearchItemsRequest,
  SearchItemsResponse,
  ServerContext,
} from '../../../src/generated/server/osnit/v1/service_server';
import { searchItems as searchItemsInternal } from './_shared';
import { withNormalizedTagFilters } from './query-filters';
import { readTranslateTarget, translateItems } from './translation';

export const searchItems: OsnitServiceHandler['searchItems'] = async (
  ctx: ServerContext,
  req: SearchItemsRequest,
): Promise<SearchItemsResponse> => {
  const response = await searchItemsInternal(withNormalizedTagFilters(ctx, req));
  const targetLang = readTranslateTarget(ctx.request.url);
  if (!targetLang) return response;
  return {
    ...response,
    items: await translateItems(response.items, targetLang),
  };
};
