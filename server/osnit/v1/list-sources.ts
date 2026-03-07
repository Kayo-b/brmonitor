import type {
  ListSourcesRequest,
  ListSourcesResponse,
  OsnitServiceHandler,
  ServerContext,
} from '../../../src/generated/server/osnit/v1/service_server';
import { listSources as listSourcesInternal } from './_shared';

export const listSources: OsnitServiceHandler['listSources'] = async (
  _ctx: ServerContext,
  req: ListSourcesRequest,
): Promise<ListSourcesResponse> => {
  return listSourcesInternal(req);
};
