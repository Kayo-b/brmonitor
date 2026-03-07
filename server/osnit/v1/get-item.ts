import type {
  GetItemRequest,
  GetItemResponse,
  OsnitServiceHandler,
  ServerContext,
} from '../../../src/generated/server/osnit/v1/service_server';
import { getItemById } from './_shared';
import { readTranslateTarget, translateItem } from './translation';

export const getItem: OsnitServiceHandler['getItem'] = async (
  ctx: ServerContext,
  req: GetItemRequest,
): Promise<GetItemResponse> => {
  const item = await getItemById(req.id);
  if (!item) return { item: undefined };
  const targetLang = readTranslateTarget(ctx.request.url);
  if (!targetLang) return { item };
  return {
    item: await translateItem(item, targetLang),
  };
};
