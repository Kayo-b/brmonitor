import type { OsnitServiceHandler } from '../../../src/generated/server/osnit/v1/service_server';
import { getItem } from './get-item';
import { listFeed } from './list-feed';
import { listSources } from './list-sources';
import { searchItems } from './search-items';

export const osnitHandler: OsnitServiceHandler = {
  listFeed,
  searchItems,
  getItem,
  listSources,
};
