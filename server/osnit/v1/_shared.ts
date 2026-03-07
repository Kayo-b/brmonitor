import type {
  ListFeedRequest,
  ListFeedResponse,
  ListSourcesRequest,
  ListSourcesResponse,
  OsnitItem,
  OsnitSource,
  OsnitSourceType,
  OsnitVerificationStatus,
  SearchItemsRequest,
  SearchItemsResponse,
} from '../../../src/generated/server/osnit/v1/service_server';
import osnitSourceCatalog from '../../../data/osnit-sources.json';
import osnitTelegramCatalog from '../../../data/osnit-telegram-channels.json';

declare const process: { cwd?: () => string; env: Record<string, string | undefined>; versions?: Record<string, string | undefined>; execPath?: string };

type SourceTypeKey = 'rss' | 'x' | 'telegram';

interface GatheredItem {
  sourceType: SourceTypeKey;
  sourceName: string;
  sourceHandle: string;
  url: string;
  title: string;
  text: string;
  publishedAt: number;
  ingestedAt: number;
  highTrustReference: boolean;
  claimSeed?: string;
  tags?: string[];
}

interface StoreData {
  version: 1;
  lastRefreshAt: number;
  items: OsnitItem[];
  sources: OsnitSource[];
}

interface RegionMatcher {
  id: string;
  aliases: string[];
}

interface CatalogRssSource {
  id?: string;
  name?: string;
  url?: string;
  region?: string;
  theme?: string;
  highTrust?: boolean;
}

interface CatalogXAccount {
  id?: string;
  name?: string;
  handle?: string;
  url?: string;
  query?: string;
  region?: string;
  theme?: string;
  highTrust?: boolean;
}

interface CatalogXQuery {
  id?: string;
  name?: string;
  query?: string;
  region?: string;
  theme?: string;
}

const REFRESH_INTERVAL_MS = clampInt(Number(process.env.OSNIT_REFRESH_INTERVAL_MS || '180000'), 30_000, 3_600_000);
const MAX_STORE_ITEMS = clampInt(Number(process.env.OSNIT_MAX_STORE_ITEMS || '200000'), 5_000, 2_000_000);
const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 250;

const EMPTY_STORE: StoreData = {
  version: 1,
  lastRefreshAt: 0,
  items: [],
  sources: [],
};

const TIMEFRAME_MAP: Record<string, number> = {
  '1h': 60 * 60 * 1000,
  'hour': 60 * 60 * 1000,
  'last hour': 60 * 60 * 1000,
  '6h': 6 * 60 * 60 * 1000,
  '6 hours': 6 * 60 * 60 * 1000,
  '24h': 24 * 60 * 60 * 1000,
  '1d': 24 * 60 * 60 * 1000,
  '1 day': 24 * 60 * 60 * 1000,
  '7d': 7 * 24 * 60 * 60 * 1000,
  '1w': 7 * 24 * 60 * 60 * 1000,
  '1week': 7 * 24 * 60 * 60 * 1000,
  '1 week': 7 * 24 * 60 * 60 * 1000,
  '30d': 30 * 24 * 60 * 60 * 1000,
  '1m': 30 * 24 * 60 * 60 * 1000,
  '1month': 30 * 24 * 60 * 60 * 1000,
  '1 month': 30 * 24 * 60 * 60 * 1000,
};

const REGION_MATCHERS: RegionMatcher[] = [
  { id: 'iran', aliases: ['iran', 'tehran', 'irgc', 'persian'] },
  { id: 'middle_east', aliases: ['middle east', 'israel', 'gaza', 'syria', 'lebanon', 'iraq', 'yemen', 'saudi', 'uae', 'qatar', 'jordan'] },
  { id: 'ukraine', aliases: ['ukraine', 'kyiv', 'kiev', 'donetsk', 'zaporizhzhia', 'kharkiv'] },
  { id: 'russia', aliases: ['russia', 'russian', 'moscow', 'kremlin', 'st petersburg'] },
  { id: 'usa', aliases: ['usa', 'u.s.', 'u.s.a', 'united states', 'washington dc', 'pentagon', 'white house', 'america'] },
  { id: 'china', aliases: ['china', 'chinese', 'beijing', 'pla', 'prc'] },
  { id: 'taiwan', aliases: ['taiwan', 'taipei', 'taiwan strait', 'roc'] },
  { id: 'venezuela', aliases: ['venezuela', 'caracas', 'maduro'] },
  { id: 'cuba', aliases: ['cuba', 'havana', 'cuban'] },
  { id: 'colombia', aliases: ['colombia', 'bogota', 'colombian'] },
  { id: 'brazil', aliases: ['brazil', 'brasil', 'brasilia', 'sao paulo', 'rio de janeiro'] },
];

const THEME_KEYWORDS: Array<{ theme: string; keywords: string[] }> = [
  { theme: 'military', keywords: ['military', 'troops', 'airstrike', 'missile', 'drone', 'navy', 'army', 'defense'] },
  { theme: 'conflict', keywords: ['conflict', 'war', 'invasion', 'ceasefire', 'frontline', 'battle'] },
  { theme: 'cyber', keywords: ['cyber', 'malware', 'ransomware', 'ddos', 'intrusion', 'exploit', 'breach'] },
  { theme: 'politics', keywords: ['election', 'parliament', 'president', 'sanctions', 'diplomatic', 'policy'] },
  { theme: 'security', keywords: ['terror', 'hostage', 'attack', 'security', 'threat', 'alert'] },
  { theme: 'economy', keywords: ['oil', 'gas', 'energy', 'inflation', 'trade', 'market'] },
];

const SOURCE_TYPE_TO_ENUM: Record<SourceTypeKey, OsnitSourceType> = {
  rss: 'OSNIT_SOURCE_TYPE_RSS',
  x: 'OSNIT_SOURCE_TYPE_X',
  telegram: 'OSNIT_SOURCE_TYPE_TELEGRAM',
};

const VERIFICATION_UNVERIFIED: OsnitVerificationStatus = 'OSNIT_VERIFICATION_STATUS_UNVERIFIED';
const VERIFICATION_PARTIAL: OsnitVerificationStatus = 'OSNIT_VERIFICATION_STATUS_PARTIALLY_VERIFIED';
const VERIFICATION_VERIFIED: OsnitVerificationStatus = 'OSNIT_VERIFICATION_STATUS_VERIFIED';

const TELEGRAM_RELAY_PATH = '/telegram/feed';
const DEFAULT_X_ACCOUNT_HANDLE = 'Osinttechnical';
const DEFAULT_NITTER_INSTANCES = [
  'https://nitter.net',
  'https://nitter.poast.org',
  'https://xcancel.com',
];

let memoryStore: StoreData = { ...EMPTY_STORE };
let refreshInFlight: Promise<StoreData> | null = null;

export async function ensureStoreReady(forceRefresh: boolean): Promise<StoreData> {
  const current = await loadStore();
  const now = Date.now();
  if (!forceRefresh && now - current.lastRefreshAt < REFRESH_INTERVAL_MS) {
    return current;
  }
  if (refreshInFlight) return refreshInFlight;
  refreshInFlight = refreshStore(current)
    .catch(() => current)
    .finally(() => { refreshInFlight = null; });
  return refreshInFlight;
}

export async function listFeed(req: ListFeedRequest): Promise<ListFeedResponse> {
  const store = await ensureStoreReady(Boolean(req.refresh));
  const filtered = applyFilters(store.items, req);
  const limit = normalizeLimit(req.limit);
  const offset = normalizeCursor(req.cursor);
  const page = filtered.slice(offset, offset + limit);
  const nextCursor = offset + limit < filtered.length ? String(offset + limit) : '';
  return {
    items: page,
    nextCursor,
    total: filtered.length,
    refreshedAt: store.lastRefreshAt,
  };
}

export async function searchItems(req: SearchItemsRequest): Promise<SearchItemsResponse> {
  const store = await ensureStoreReady(Boolean(req.refresh));
  const filtered = applyFilters(store.items, req);
  const query = req.q.trim().toLowerCase();
  const searched = query
    ? filtered.filter((item) => {
      const text = `${item.title} ${item.text}`.toLowerCase();
      return text.includes(query);
    })
    : filtered;
  const limit = normalizeLimit(req.limit);
  const offset = normalizeCursor(req.cursor);
  const page = searched.slice(offset, offset + limit);
  const nextCursor = offset + limit < searched.length ? String(offset + limit) : '';
  return {
    items: page,
    nextCursor,
    total: searched.length,
    refreshedAt: store.lastRefreshAt,
  };
}

export async function getItemById(id: string): Promise<OsnitItem | undefined> {
  const store = await ensureStoreReady(false);
  return store.items.find((item) => item.id === id);
}

export async function listSources(req: ListSourcesRequest): Promise<ListSourcesResponse> {
  const store = await ensureStoreReady(false);
  const sourceType = (req.sourceType || '').trim().toLowerCase();
  const region = normalizeRegion((req.region || '').trim().toLowerCase());
  const filtered = store.sources.filter((source) => {
    if (sourceType && sourceTypeToEnum(sourceType) !== source.sourceType) return false;
    if (region && normalizeRegion(source.region) !== region) return false;
    return true;
  });
  return {
    sources: filtered,
    refreshedAt: store.lastRefreshAt,
  };
}

async function refreshStore(current: StoreData): Promise<StoreData> {
  const sources = buildSourcesCatalog();
  const gathered = await gatherFromSources(sources);
  if (gathered.length === 0) {
    if (current.sources.length === 0) {
      const initStore = { ...current, sources, lastRefreshAt: Date.now() };
      await saveStore(initStore);
      return initStore;
    }
    return { ...current, sources, lastRefreshAt: Date.now() };
  }

  const normalized = gathered.map(normalizeGatheredItem);
  const merged = mergeItems(current.items, normalized).slice(0, MAX_STORE_ITEMS);
  const verified = applyVerification(merged);
  const refreshed: StoreData = {
    version: 1,
    lastRefreshAt: Date.now(),
    items: verified,
    sources,
  };
  await saveStore(refreshed);
  return refreshed;
}

async function gatherFromSources(sources: OsnitSource[]): Promise<GatheredItem[]> {
  const enabledSources = sources.filter((s) => s.enabled !== false);
  const rssSources = enabledSources.filter((s) => s.sourceType === 'OSNIT_SOURCE_TYPE_RSS');
  const xSources = enabledSources.filter((s) => s.sourceType === 'OSNIT_SOURCE_TYPE_X');
  const telegramSources = enabledSources.filter((s) => s.sourceType === 'OSNIT_SOURCE_TYPE_TELEGRAM');

  const [rssItems, xItems, telegramItems] = await Promise.all([
    fetchRssItems(rssSources),
    fetchXItems(xSources),
    fetchTelegramItems(telegramSources),
  ]);
  return [...rssItems, ...xItems, ...telegramItems];
}

function buildSourcesCatalog(): OsnitSource[] {
  const sources: OsnitSource[] = [];
  const seenRss = new Set<string>();

  for (const feed of readCatalogRssSources()) {
    const name = String(feed.name || '').trim();
    const url = String(feed.url || '').trim();
    if (!name || !url) continue;
    const key = `${name}|${url}`;
    if (seenRss.has(key)) continue;
    seenRss.add(key);
    sources.push({
      id: String(feed.id || `rss-${slugify(name)}`),
      name,
      sourceType: 'OSNIT_SOURCE_TYPE_RSS',
      url,
      query: '',
      region: normalizeRegion(String(feed.region || 'global')),
      theme: String(feed.theme || 'general'),
      enabled: true,
      highTrust: Boolean(feed.highTrust) || isHighTrustSource(name),
    });
  }

  for (const account of readCatalogXAccounts()) {
    const name = String(account.name || '').trim();
    const handle = String(account.handle || '').replace(/^@/, '').trim();
    if (!name || !handle) continue;
    sources.push({
      id: String(account.id || `x-account-${slugify(handle)}`),
      name,
      sourceType: 'OSNIT_SOURCE_TYPE_X',
      url: String(account.url || `https://x.com/${handle}`),
      query: String(account.query || `from:${handle} -is:retweet`),
      region: normalizeRegion(String(account.region || 'global')),
      theme: String(account.theme || 'osint'),
      enabled: true,
      highTrust: Boolean(account.highTrust),
    });
  }

  for (const querySource of readCatalogXQueries()) {
    const query = String(querySource.query || '').trim();
    if (!query) continue;
    sources.push({
      id: String(querySource.id || `x-query-${hashString(query)}`),
      name: String(querySource.name || 'X Query Source'),
      sourceType: 'OSNIT_SOURCE_TYPE_X',
      url: `https://x.com/search?q=${encodeURIComponent(query)}&f=live`,
      query,
      region: normalizeRegion(String(querySource.region || 'global')),
      theme: String(querySource.theme || 'osint'),
      enabled: true,
      highTrust: false,
    });
  }

  for (const tg of readTelegramSources()) {
    sources.push({
      id: `telegram-${slugify(tg.handle)}`,
      name: tg.label || tg.handle,
      sourceType: 'OSNIT_SOURCE_TYPE_TELEGRAM',
      url: `https://t.me/${tg.handle}`,
      query: '',
      region: normalizeRegion(tg.region || 'global'),
      theme: tg.topic || 'osint',
      enabled: tg.enabled !== false,
      highTrust: /osinttechnical/i.test(tg.label || '') || /osinttechnical/i.test(tg.handle),
    });
  }

  return sources;
}

function readTelegramSources(): Array<{ handle: string; label?: string; topic?: string; region?: string; enabled?: boolean }> {
  const root = osnitTelegramCatalog as unknown as {
    channels?: Array<{ handle: string; label?: string; topic?: string; region?: string; enabled?: boolean }>;
  };
  const rows = root.channels;
  return Array.isArray(rows) ? rows : [];
}

function readCatalogRssSources(): CatalogRssSource[] {
  const root = osnitSourceCatalog as unknown as { rss?: CatalogRssSource[] };
  return Array.isArray(root.rss) ? root.rss : [];
}

function readCatalogXAccounts(): CatalogXAccount[] {
  const root = osnitSourceCatalog as unknown as { x?: { accounts?: CatalogXAccount[] } };
  return Array.isArray(root.x?.accounts) ? root.x.accounts : [];
}

function readCatalogXQueries(): CatalogXQuery[] {
  const root = osnitSourceCatalog as unknown as { x?: { queries?: CatalogXQuery[] } };
  return Array.isArray(root.x?.queries) ? root.x.queries : [];
}

async function fetchRssItems(sources: OsnitSource[]): Promise<GatheredItem[]> {
  const items: GatheredItem[] = [];
  const batches = chunk(sources, 20);
  for (const batch of batches) {
    const settled = await Promise.allSettled(batch.map(async (source) => {
      const feedItems = await fetchSingleRssFeed(source);
      items.push(...feedItems);
    }));
    void settled;
  }
  return items;
}

async function fetchSingleRssFeed(source: OsnitSource): Promise<GatheredItem[]> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 9_000);
  try {
    const res = await fetch(source.url, {
      headers: {
        'Accept': 'application/rss+xml, application/xml, text/xml, */*',
        'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
      },
      signal: controller.signal,
    });
    if (!res.ok) return [];
    const text = await res.text();
    return parseRssXml(text, source).slice(0, 8);
  } catch {
    return [];
  } finally {
    clearTimeout(timeout);
  }
}

function parseRssXml(xml: string, source: OsnitSource): GatheredItem[] {
  const out: GatheredItem[] = [];
  const itemRegex = /<item[\s>]([\s\S]*?)<\/item>/gi;
  const entryRegex = /<entry[\s>]([\s\S]*?)<\/entry>/gi;

  let blocks = [...xml.matchAll(itemRegex)];
  const isAtom = blocks.length === 0;
  if (isAtom) blocks = [...xml.matchAll(entryRegex)];

  for (const match of blocks.slice(0, 10)) {
    const block = match[1] ?? '';
    const title = extractTag(block, 'title');
    if (!title) continue;
    const link = isAtom
      ? block.match(/<link[^>]+href=["']([^"']+)["']/i)?.[1] ?? ''
      : extractTag(block, 'link');
    if (!link) continue;
    const dateRaw = isAtom
      ? (extractTag(block, 'published') || extractTag(block, 'updated'))
      : extractTag(block, 'pubDate');
    const publishedAt = safeDateMs(dateRaw);
    out.push({
      sourceType: 'rss',
      sourceName: source.name,
      sourceHandle: '',
      url: link,
      title,
      text: title,
      publishedAt,
      ingestedAt: Date.now(),
      highTrustReference: source.highTrust,
    });
  }
  return out;
}

async function fetchTelegramItems(sources: OsnitSource[]): Promise<GatheredItem[]> {
  if (!sources.length) return [];
  const relayItems = await fetchTelegramItemsViaRelay(sources);
  if (relayItems.length > 0) return relayItems;
  return fetchTelegramItemsViaPublicWeb(sources);
}

async function fetchTelegramItemsViaRelay(sources: OsnitSource[]): Promise<GatheredItem[]> {
  const relay = normalizeRelayUrl(process.env.WS_RELAY_URL || '');
  if (!relay) return [];
  const relayUrl = new URL(TELEGRAM_RELAY_PATH, relay);
  relayUrl.searchParams.set('limit', '200');
  const relayHeaders: Record<string, string> = { 'Accept': 'application/json' };
  const relaySecret = process.env.RELAY_SHARED_SECRET || '';
  if (relaySecret) {
    const relayHeader = (process.env.RELAY_AUTH_HEADER || 'x-relay-key').toLowerCase();
    relayHeaders[relayHeader] = relaySecret;
    relayHeaders.Authorization = `Bearer ${relaySecret}`;
  }
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20_000);
  try {
    const res = await fetch(relayUrl.toString(), {
      headers: relayHeaders,
      signal: controller.signal,
    });
    if (!res.ok) return [];
    const payload = await res.json() as {
      items?: Array<{
        channel?: string;
        channelTitle?: string;
        url?: string;
        ts?: string;
        text?: string;
      }>;
    };
    const byHandle = new Map<string, OsnitSource>();
    for (const source of sources) {
      const handle = source.url.replace('https://t.me/', '').toLowerCase();
      byHandle.set(handle, source);
    }
    const rows = Array.isArray(payload.items) ? payload.items : [];
    const out: GatheredItem[] = [];
    for (const row of rows) {
      const channel = (row.channel || '').toLowerCase();
      const source = byHandle.get(channel);
      if (!source) continue;
      const message = (row.text || '').trim();
      if (!message) continue;
      out.push({
        sourceType: 'telegram',
        sourceName: row.channelTitle || source.name,
        sourceHandle: channel,
        url: row.url || source.url,
        title: trimTo(message.replace(/\s+/g, ' '), 180),
        text: message,
        publishedAt: safeDateMs(row.ts || ''),
        ingestedAt: Date.now(),
        highTrustReference: source.highTrust,
      });
    }
    return out;
  } catch {
    return [];
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchTelegramItemsViaPublicWeb(sources: OsnitSource[]): Promise<GatheredItem[]> {
  const maxSources = clampInt(Number(process.env.OSNIT_TELEGRAM_WEB_MAX_SOURCES || '14'), 1, 40);
  const targets = sources.slice(0, maxSources);
  const out: GatheredItem[] = [];
  const batches = chunk(targets, 4);
  for (const batch of batches) {
    const settled = await Promise.allSettled(batch.map((source) => fetchSingleTelegramPublicChannel(source)));
    for (const row of settled) {
      if (row.status !== 'fulfilled' || !Array.isArray(row.value)) continue;
      out.push(...row.value);
    }
  }
  return out;
}

async function fetchSingleTelegramPublicChannel(source: OsnitSource): Promise<GatheredItem[]> {
  const handle = source.url.replace('https://t.me/', '').trim();
  if (!handle) return [];

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12_000);
  try {
    const url = `https://t.me/s/${encodeURIComponent(handle)}`;
    const res = await fetch(url, {
      headers: {
        'Accept': 'text/html,application/xhtml+xml',
        'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
      },
      signal: controller.signal,
    });
    if (!res.ok) return [];
    const html = await res.text();
    return parseTelegramPublicHtml(html, source, handle).slice(0, 8);
  } catch {
    return [];
  } finally {
    clearTimeout(timeout);
  }
}

function parseTelegramPublicHtml(html: string, source: OsnitSource, handle: string): GatheredItem[] {
  const out: GatheredItem[] = [];
  const messageRegex = /<div class="tgme_widget_message\b[\s\S]*?<\/div>\s*<\/div>\s*<\/div>/gi;
  const blocks = [...html.matchAll(messageRegex)];

  for (const match of blocks.slice(0, 14)) {
    const block = match[0] || '';
    const href = block.match(/<a[^>]*class="tgme_widget_message_date"[^>]*href="([^"]+)"/i)?.[1]
      || block.match(/data-post="([^"]+)"/i)?.[1]?.replace(/^/, 'https://t.me/')
      || source.url;
    const dt = block.match(/<time[^>]*datetime="([^"]+)"/i)?.[1] || '';
    const textHtml = block.match(/<div class="tgme_widget_message_text[^"]*"[^>]*>([\s\S]*?)<\/div>/i)?.[1] || '';
    const text = htmlToPlainText(textHtml);
    if (!text) continue;
    out.push({
      sourceType: 'telegram',
      sourceName: source.name,
      sourceHandle: handle.toLowerCase(),
      url: href,
      title: trimTo(text.replace(/\s+/g, ' '), 180),
      text,
      publishedAt: safeDateMs(dt),
      ingestedAt: Date.now(),
      highTrustReference: source.highTrust,
    });
  }

  return out;
}

async function fetchXItems(sources: OsnitSource[]): Promise<GatheredItem[]> {
  if (!sources.length) return [];
  const fromApi = await fetchXViaApi(sources);
  if (fromApi.length > 0) return fromApi;

  const fromPlaywrightBridge = await fetchXViaPlaywrightBridge();
  if (fromPlaywrightBridge.length > 0) return fromPlaywrightBridge;

  const fromNitterRss = await fetchXViaNitterRss(sources);
  if (fromNitterRss.length > 0) return fromNitterRss;

  const fromLocalPlaywright = await fetchXViaLocalPlaywrightScript();
  return fromLocalPlaywright;
}

async function fetchXViaNitterRss(sources: OsnitSource[]): Promise<GatheredItem[]> {
  const enabled = (process.env.OSNIT_ENABLE_NITTER_FALLBACK || 'true').toLowerCase() !== 'false';
  if (!enabled) return [];
  const enableSearch = (process.env.OSNIT_NITTER_ENABLE_SEARCH || 'false').toLowerCase() === 'true';

  const instances = parseNitterInstances();
  if (instances.length === 0) return [];

  const maxAccountSources = clampInt(Number(process.env.OSNIT_NITTER_MAX_ACCOUNT_SOURCES || '2'), 1, 8);
  const maxQuerySources = clampInt(Number(process.env.OSNIT_NITTER_MAX_QUERY_SOURCES || '3'), 1, 12);
  const maxQueryVariants = clampInt(Number(process.env.OSNIT_NITTER_MAX_QUERY_VARIANTS || '2'), 1, 6);

  const accountSources = sources.filter((s) => s.id.startsWith('x-account-')).slice(0, maxAccountSources);
  const querySources = enableSearch
    ? sources.filter((s) => s.id.startsWith('xq-') && s.query).slice(0, maxQuerySources)
    : [];
  const out: GatheredItem[] = [];

  for (const source of accountSources) {
    const handle = parseXHandleFromSource(source).replace(/^@/, '');
    if (!handle) continue;
    const xml = await fetchNitterRss(instances, `/${encodeURIComponent(handle)}/rss`);
    if (!xml) continue;
    out.push(...parseNitterRss(xml, {
      sourceName: source.name || `@${handle}`,
      fallbackHandle: handle,
      highTrustReference: source.highTrust || /osinttechnical/i.test(handle),
      tags: ['x_filter:account'],
    }).slice(0, 12));
  }

  for (const source of querySources) {
    const variants = buildStrategicQueryVariants(source.query, 'web').slice(0, maxQueryVariants);
    for (const variant of variants) {
      const path = `/search/rss?f=tweets&q=${encodeURIComponent(variant.query)}`;
      const xml = await fetchNitterRss(instances, path);
      if (!xml) continue;
      out.push(...parseNitterRss(xml, {
        sourceName: variant.label === 'base' ? source.name : `${source.name} | Strategic ${variant.label}`,
        fallbackHandle: 'search',
        highTrustReference: source.highTrust,
        tags: [`x_filter:${variant.tag}`],
      }).slice(0, 10));
    }
  }

  if (out.length === 0) return [];

  const dedup = new Map<string, GatheredItem>();
  for (const item of out) {
    const key = item.url || `${item.sourceHandle}|${item.publishedAt}|${item.title}`;
    if (!dedup.has(key)) dedup.set(key, item);
  }
  return [...dedup.values()].sort((a, b) => b.publishedAt - a.publishedAt).slice(0, 500);
}

async function fetchNitterRss(instances: string[], pathAndQuery: string): Promise<string> {
  const allowCurlFallback = (process.env.OSNIT_NITTER_CURL_FALLBACK || 'true').toLowerCase() !== 'false';
  for (const base of instances) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 9_000);
    try {
      const url = new URL(pathAndQuery.replace(/^\//, ''), `${base.replace(/\/$/, '')}/`);
      const res = await fetch(url.toString(), {
        headers: {
          'Accept': 'application/rss+xml, application/xml, text/xml, */*',
          'User-Agent': 'Mozilla/5.0',
        },
        signal: controller.signal,
      });
      if (!res.ok) continue;
      let text = await res.text();
      if (!text && allowCurlFallback) {
        text = await fetchUrlTextViaCurl(url.toString());
      }
      if (/rss reader not yet whitelist/i.test(text)) continue;
      if (/<item[\s>]/i.test(text)) return text;
    } catch {
      if (allowCurlFallback) {
        try {
          const url = new URL(pathAndQuery.replace(/^\//, ''), `${base.replace(/\/$/, '')}/`);
          const text = await fetchUrlTextViaCurl(url.toString());
          if (/rss reader not yet whitelist/i.test(text)) continue;
          if (/<item[\s>]/i.test(text)) return text;
        } catch {
          // try next instance
        }
      }
    } finally {
      clearTimeout(timeout);
    }
  }
  return '';
}

interface NitterParseOptions {
  sourceName: string;
  fallbackHandle: string;
  highTrustReference: boolean;
  tags: string[];
}

function parseNitterRss(xml: string, options: NitterParseOptions): GatheredItem[] {
  const out: GatheredItem[] = [];
  const itemRegex = /<item[\s>]([\s\S]*?)<\/item>/gi;
  const items = [...xml.matchAll(itemRegex)];
  for (const match of items.slice(0, 20)) {
    const block = match[1] || '';
    const link = extractTag(block, 'link');
    const rawTitle = extractTag(block, 'title');
    const rawDescription = extractTag(block, 'description');
    const pubDate = extractTag(block, 'pubDate');
    if (!link) continue;

    const text = htmlToPlainText(rawDescription || rawTitle);
    if (!text) continue;
    const canonicalUrl = canonicalizeXStatusUrl(link, options.fallbackHandle);
    const sourceHandle = parseXHandleFromStatusUrl(canonicalUrl, options.fallbackHandle);
    out.push({
      sourceType: 'x',
      sourceName: options.sourceName,
      sourceHandle,
      url: canonicalUrl,
      title: trimTo(text.replace(/\s+/g, ' '), 180),
      text,
      publishedAt: safeDateMs(pubDate),
      ingestedAt: Date.now(),
      highTrustReference: options.highTrustReference || /osinttechnical/i.test(sourceHandle),
      claimSeed: strategicClaimSeed(text),
      tags: options.tags,
    });
  }
  return out;
}

async function fetchXViaApi(sources: OsnitSource[]): Promise<GatheredItem[]> {
  const token = process.env.X_BEARER_TOKEN || process.env.TWITTER_BEARER_TOKEN || '';
  if (!token) return [];

  const accountSource = sources.find((s) => s.id.startsWith('x-account-')) || sources[0];
  const accountHandle = parseXHandleFromSource(accountSource);

  const out: GatheredItem[] = [];
  const headers = {
    'Authorization': `Bearer ${token}`,
    'Accept': 'application/json',
  };
  const accountTweets: Array<{ id: string; text: string; createdAt: string; claimSeed: string }> = [];

  try {
    const userResp = await fetch(`https://api.twitter.com/2/users/by/username/${encodeURIComponent(accountHandle)}?user.fields=id,username,name`, { headers });
    if (userResp.ok) {
      const userData = await userResp.json() as { data?: { id?: string } };
      const userId = userData.data?.id;
      if (userId) {
        const timelineUrl = `https://api.twitter.com/2/users/${encodeURIComponent(userId)}/tweets?max_results=40&tweet.fields=created_at,lang,public_metrics&exclude=retweets,replies`;
        const timelineResp = await fetch(timelineUrl, { headers });
        if (timelineResp.ok) {
          const timeline = await timelineResp.json() as { data?: Array<{ id?: string; text?: string; created_at?: string }> };
          const rows = Array.isArray(timeline.data) ? timeline.data : [];
          for (const row of rows) {
            const text = (row.text || '').trim();
            if (!text || !row.id) continue;
            const claimSeed = strategicClaimSeed(text);
            accountTweets.push({
              id: row.id,
              text,
              createdAt: row.created_at || new Date().toISOString(),
              claimSeed,
            });
            out.push({
              sourceType: 'x',
              sourceName: accountSource?.name || `@${accountHandle}`,
              sourceHandle: accountHandle,
              url: `https://x.com/${accountHandle}/status/${row.id}`,
              title: trimTo(text.replace(/\s+/g, ' '), 180),
              text,
              publishedAt: safeDateMs(row.created_at || ''),
              ingestedAt: Date.now(),
              highTrustReference: true,
              claimSeed,
            });
          }
        }
      }
    }
  } catch {
    // Ignore API path failures and continue.
  }

  const querySources = sources.filter((s) => s.query && s.id.startsWith('xq-')).slice(0, 8);
  for (const source of querySources) {
    const variants = buildStrategicQueryVariants(source.query, 'api').slice(0, 4);
    for (const variant of variants) {
      const searchRows = await searchXRecentApi({
        headers,
        query: variant.query,
        maxResults: 15,
      });
      for (const row of searchRows) {
        out.push({
          sourceType: 'x',
          sourceName: variant.label === 'base'
            ? source.name
            : `${source.name} | Strategic ${variant.label}`,
          sourceHandle: row.handle,
          url: `https://x.com/${row.handle}/status/${row.id}`,
          title: trimTo(row.text.replace(/\s+/g, ' '), 180),
          text: row.text,
          publishedAt: safeDateMs(row.createdAt),
          ingestedAt: Date.now(),
          highTrustReference: /osinttechnical/i.test(row.handle) || source.highTrust,
          claimSeed: strategicClaimSeed(row.text),
          tags: variant.tag ? [`x_filter:${variant.tag}`] : [],
        });
      }
    }
  }

  // Strategic verification pass based on the monitored account timeline.
  for (const tweet of accountTweets.slice(0, 8)) {
    const phrase = extractStrategicPhrase(tweet.text);
    if (!phrase) continue;
    const variants = buildStrategicEvidenceQueries(phrase, accountHandle);
    const window = strategicWindow(tweet.createdAt);
    for (const variant of variants) {
      const searchRows = await searchXRecentApi({
        headers,
        query: variant.query,
        startTime: window.start,
        endTime: window.end,
        maxResults: 12,
      });
      for (const row of searchRows) {
        if (row.handle.toLowerCase() === accountHandle.toLowerCase()) continue;
        out.push({
          sourceType: 'x',
          sourceName: `X Strategic Filter (${variant.label})`,
          sourceHandle: row.handle,
          url: `https://x.com/${row.handle}/status/${row.id}`,
          title: trimTo(row.text.replace(/\s+/g, ' '), 180),
          text: row.text,
          publishedAt: safeDateMs(row.createdAt),
          ingestedAt: Date.now(),
          highTrustReference: false,
          claimSeed: tweet.claimSeed,
          tags: [`x_filter:${variant.tag}`, 'x_verification'],
        });
      }
    }
  }

  return out;
}

async function fetchXViaPlaywrightBridge(): Promise<GatheredItem[]> {
  const endpoint = process.env.OSNIT_X_PLAYWRIGHT_ENDPOINT || '';
  if (!endpoint) return [];
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 60_000);
  try {
    const resp = await fetch(endpoint, { headers: { 'Accept': 'application/json' }, signal: controller.signal });
    if (!resp.ok) return [];
    const json = await resp.json() as { items?: GatheredItem[] };
    return Array.isArray(json.items) ? json.items : [];
  } catch {
    return [];
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchXViaLocalPlaywrightScript(): Promise<GatheredItem[]> {
  const fallbackToggle = (process.env.OSNIT_ENABLE_PLAYWRIGHT_FALLBACK || '').toLowerCase();
  const xUser = process.env.OSNIT_X_USERNAME || process.env.X_USERNAME || '';
  const xPass = process.env.OSNIT_X_PASSWORD || process.env.X_PASSWORD || '';
  const hasCredentials = Boolean(xUser && xPass);
  const enabled = fallbackToggle === 'true' || (fallbackToggle !== 'false' && hasCredentials);
  if (!enabled) return [];
  if (!process.versions?.node) return [];
  const nodePath = process.execPath || 'node';
  const scriptPath = process.env.OSNIT_PLAYWRIGHT_SCRIPT || 'scripts/osnit/x-playwright-scrape.mjs';
  const catalogQueries = readCatalogXQueries().map((row) => String(row.query || '').trim()).filter(Boolean);
  const strategicQueries = catalogQueries.flatMap((q) => buildStrategicQueryVariants(q, 'web').map((v) => v.query));
  const allQueries = [...new Set([...catalogQueries, ...strategicQueries])];
  const accountHandle = readCatalogXAccounts()
    .map((row) => String(row.handle || '').replace(/^@/, '').trim())
    .find(Boolean) || DEFAULT_X_ACCOUNT_HANDLE;

  try {
    const dynamicImport = Function('m', 'return import(m)') as (m: string) => Promise<any>;
    const childProcess = await dynamicImport('node:child_process');
    const args = [scriptPath];
    for (const query of allQueries.slice(0, 20)) {
      args.push('--query', query);
    }
    args.push('--account', accountHandle);
    const result = await new Promise<{ stdout: string; stderr: string }>((resolve, reject) => {
      childProcess.execFile(nodePath, args, { timeout: 120_000, maxBuffer: 8 * 1024 * 1024 }, (error: unknown, stdout: string, stderr: string) => {
        if (error) {
          reject(error);
          return;
        }
        resolve({ stdout, stderr });
      });
    });
    void result.stderr;
    const parsed = JSON.parse(result.stdout) as { items?: GatheredItem[] };
    return Array.isArray(parsed.items) ? parsed.items : [];
  } catch {
    return [];
  }
}

function normalizeGatheredItem(item: GatheredItem): OsnitItem {
  const normalizedText = normalizeText(`${item.title} ${item.text}`);
  const claimHash = hashString(item.claimSeed || normalizedClaim(normalizedText));
  const themes = detectThemes(normalizedText);
  const regions = detectRegions(normalizedText);
  const tags = [...new Set([...themes, ...regions, item.sourceType, ...(item.tags || [])])];
  const baseConfidence = baseConfidenceFor(item);
  const idBase = `${item.sourceType}|${item.sourceName}|${item.url}|${item.publishedAt}|${claimHash}`;
  return {
    id: `osnit-${hashString(idBase)}`,
    sourceType: SOURCE_TYPE_TO_ENUM[item.sourceType],
    sourceName: item.sourceName,
    sourceHandle: item.sourceHandle,
    url: item.url,
    title: item.title,
    text: item.text,
    publishedAt: item.publishedAt,
    ingestedAt: item.ingestedAt,
    themes,
    regions,
    tags,
    verificationStatus: VERIFICATION_UNVERIFIED,
    corroborationCount: 1,
    confidence: baseConfidence,
    claimHash,
    highTrustReference: item.highTrustReference,
  };
}

function mergeItems(existing: OsnitItem[], incoming: OsnitItem[]): OsnitItem[] {
  const byId = new Map<string, OsnitItem>();
  const byUrl = new Map<string, string>();

  for (const item of existing) {
    byId.set(item.id, item);
    if (item.url) byUrl.set(item.url, item.id);
  }

  for (const item of incoming) {
    const existingById = byId.get(item.id);
    if (existingById) {
      byId.set(item.id, { ...existingById, ...item });
      continue;
    }
    if (item.url && byUrl.has(item.url)) continue;
    byId.set(item.id, item);
    if (item.url) byUrl.set(item.url, item.id);
  }

  return [...byId.values()].sort((a, b) => b.publishedAt - a.publishedAt);
}

function applyVerification(items: OsnitItem[]): OsnitItem[] {
  const byClaim = new Map<string, OsnitItem[]>();
  for (const item of items) {
    const key = item.claimHash || item.id;
    const arr = byClaim.get(key) || [];
    arr.push(item);
    byClaim.set(key, arr);
  }

  for (const group of byClaim.values()) {
    const sourceKeys = new Set<string>();
    const sourceTypes = new Set<OsnitSourceType>();
    let hasHighTrust = false;
    let hasStrategicXEvidence = false;
    for (const item of group) {
      const uniqueHandle = item.sourceHandle ? item.sourceHandle.toLowerCase() : item.sourceName.toLowerCase();
      sourceKeys.add(`${item.sourceType}:${uniqueHandle}`);
      sourceTypes.add(item.sourceType);
      if (item.highTrustReference) hasHighTrust = true;
      if (item.tags.some((tag) => tag.startsWith('x_filter:'))) hasStrategicXEvidence = true;
    }
    const corroborationCount = Math.max(1, sourceKeys.size);
    let status: OsnitVerificationStatus = VERIFICATION_UNVERIFIED;
    if (corroborationCount >= 2 && sourceTypes.size >= 2) {
      status = VERIFICATION_VERIFIED;
    } else if (
      corroborationCount >= 2
      && hasHighTrust
      && sourceTypes.size === 1
      && sourceTypes.has('OSNIT_SOURCE_TYPE_X')
      && hasStrategicXEvidence
    ) {
      // Strategic X corroboration: monitored account + independent filtered search matches.
      status = VERIFICATION_VERIFIED;
    } else if (corroborationCount >= 2) {
      status = VERIFICATION_PARTIAL;
    }
    for (const item of group) {
      const boosted = boostConfidence(item, corroborationCount, hasHighTrust, status);
      item.corroborationCount = corroborationCount;
      item.verificationStatus = status;
      item.confidence = boosted;
    }
  }
  return items.sort((a, b) => b.publishedAt - a.publishedAt);
}

function boostConfidence(
  item: OsnitItem,
  corroborationCount: number,
  groupHasHighTrust: boolean,
  status: OsnitVerificationStatus,
): number {
  let score = item.confidence;
  if (corroborationCount >= 2) score += 0.14;
  if (corroborationCount >= 3) score += 0.08;
  if (groupHasHighTrust && !item.highTrustReference) score += 0.04;
  if (status === VERIFICATION_VERIFIED) score += 0.06;
  if (status === VERIFICATION_PARTIAL) score += 0.03;
  return Math.max(0.05, Math.min(0.99, Number(score.toFixed(3))));
}

function applyFilters(items: OsnitItem[], req: ListFeedRequest | SearchItemsRequest): OsnitItem[] {
  const now = Date.now();
  const timeframeMs = parseTimeframeToMs(req.timeframe);
  const fromReq = Number(req.from || 0);
  const toReq = Number(req.to || 0);
  const fromTime = fromReq > 0 ? fromReq : (timeframeMs > 0 ? now - timeframeMs : 0);
  const toTime = toReq > 0 ? toReq : Number.MAX_SAFE_INTEGER;
  const wantedRegions = new Set(normalizeArray(req.regions).map(normalizeRegion).filter(Boolean));
  const wantedThemes = new Set(normalizeArray(req.themes).map((x) => x.trim().toLowerCase()).filter(Boolean));
  const wantedTags = new Set(normalizeArray(req.tags).map((x) => x.trim().toLowerCase()).filter(Boolean));
  const wantedTypes = new Set(normalizeArray(req.sourceTypes).map((x) => sourceTypeToEnum(x)).filter(Boolean));
  const verificationStatus = parseVerificationStatus(req.verificationStatus);

  return items.filter((item) => {
    if (item.publishedAt < fromTime || item.publishedAt > toTime) return false;
    if (wantedRegions.size > 0) {
      const itemRegions = new Set(item.regions.map(normalizeRegion));
      let ok = false;
      for (const region of wantedRegions) {
        if (itemRegions.has(region)) {
          ok = true;
          break;
        }
      }
      if (!ok) return false;
    }
    if (wantedThemes.size > 0) {
      const itemThemes = new Set(item.themes.map((x) => x.toLowerCase()));
      let ok = false;
      for (const theme of wantedThemes) {
        if (itemThemes.has(theme)) {
          ok = true;
          break;
        }
      }
      if (!ok) return false;
    }
    if (wantedTags.size > 0) {
      const itemTags = new Set(item.tags.map((x) => x.toLowerCase()));
      let ok = false;
      for (const tag of wantedTags) {
        if (itemTags.has(tag)) {
          ok = true;
          break;
        }
      }
      if (!ok) return false;
    }
    if (wantedTypes.size > 0 && !wantedTypes.has(item.sourceType)) return false;
    if (verificationStatus && item.verificationStatus !== verificationStatus) return false;
    return true;
  });
}

async function loadStore(): Promise<StoreData> {
  const fs = await getFsModule();
  if (!fs) return memoryStore;
  const file = resolveStorePath();
  try {
    const raw = await fs.readFile(file, 'utf8');
    const parsed = JSON.parse(raw) as Partial<StoreData>;
    const loaded: StoreData = {
      version: 1,
      lastRefreshAt: Number(parsed.lastRefreshAt || 0),
      items: Array.isArray(parsed.items) ? parsed.items : [],
      sources: Array.isArray(parsed.sources) ? parsed.sources : [],
    };
    memoryStore = loaded;
    return loaded;
  } catch {
    return memoryStore;
  }
}

async function saveStore(store: StoreData): Promise<void> {
  memoryStore = store;
  const fs = await getFsModule();
  if (!fs) return;
  const path = resolveStorePath();
  const idx = path.lastIndexOf('/');
  if (idx > 0) {
    const dir = path.slice(0, idx);
    await fs.mkdir(dir, { recursive: true });
  }
  await fs.writeFile(path, JSON.stringify(store), 'utf8');
}

interface FsLike {
  readFile(path: string, encoding: 'utf8'): Promise<string>;
  writeFile(path: string, data: string, encoding: 'utf8'): Promise<void>;
  mkdir(path: string, options: { recursive: boolean }): Promise<void>;
}

async function getFsModule(): Promise<FsLike | null> {
  try {
    const dynamicImport = Function('m', 'return import(m)') as (m: string) => Promise<any>;
    const fs = await dynamicImport('node:fs/promises');
    return fs as FsLike;
  } catch {
    return null;
  }
}

function resolveStorePath(): string {
  const configured = process.env.OSNIT_STORE_PATH || 'data/osnit-store.json';
  if (configured.startsWith('/')) return configured;
  const cwd = typeof process.cwd === 'function' ? process.cwd() : '';
  return cwd ? `${cwd}/${configured}` : configured;
}

function parseTimeframeToMs(value: string): number {
  const key = value.trim().toLowerCase();
  return TIMEFRAME_MAP[key] || 0;
}

function parseVerificationStatus(value: string): OsnitVerificationStatus | null {
  const key = value.trim().toLowerCase();
  if (!key) return null;
  if (key === 'verified') return VERIFICATION_VERIFIED;
  if (key === 'partially_verified' || key === 'partial') return VERIFICATION_PARTIAL;
  if (key === 'unverified') return VERIFICATION_UNVERIFIED;
  return null;
}

function sourceTypeToEnum(value: string): OsnitSourceType | null {
  const key = value.trim().toLowerCase();
  if (key === 'rss') return 'OSNIT_SOURCE_TYPE_RSS';
  if (key === 'x' || key === 'twitter') return 'OSNIT_SOURCE_TYPE_X';
  if (key === 'telegram' || key === 'tg') return 'OSNIT_SOURCE_TYPE_TELEGRAM';
  return null;
}

function normalizeRegion(value: string): string {
  const v = value.trim().toLowerCase();
  if (!v) return '';
  if (v === 'america') return 'usa';
  if (v === 'middle east') return 'middle_east';
  return v.replace(/\s+/g, '_');
}

function detectRegions(textLower: string): string[] {
  const out: string[] = [];
  for (const region of REGION_MATCHERS) {
    for (const alias of region.aliases) {
      if (textLower.includes(alias)) {
        out.push(region.id);
        break;
      }
    }
  }
  return out.length > 0 ? out : ['global'];
}

function detectThemes(textLower: string): string[] {
  const out: string[] = [];
  for (const row of THEME_KEYWORDS) {
    for (const kw of row.keywords) {
      if (textLower.includes(kw)) {
        out.push(row.theme);
        break;
      }
    }
  }
  return out.length > 0 ? out : ['general'];
}

function normalizeText(value: string): string {
  return value.toLowerCase().replace(/\s+/g, ' ').trim();
}

function normalizedClaim(value: string): string {
  return value
    .replace(/https?:\/\/\S+/g, ' ')
    .replace(/[@#][\w_]+/g, ' ')
    .replace(/[^\w\s]/g, ' ')
    .replace(/\b\d+\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function baseConfidenceFor(item: GatheredItem): number {
  if (item.highTrustReference) return 0.86;
  if (item.sourceType === 'telegram') return 0.62;
  if (item.sourceType === 'rss') return 0.57;
  return 0.52;
}

function safeDateMs(value: string): number {
  const t = value ? new Date(value).getTime() : NaN;
  return Number.isFinite(t) && t > 0 ? t : Date.now();
}

function normalizeLimit(limit: number): number {
  return clampInt(Number(limit || DEFAULT_LIMIT), 1, MAX_LIMIT);
}

function normalizeCursor(cursor: string): number {
  const value = parseInt(cursor || '0', 10);
  return Number.isFinite(value) && value > 0 ? value : 0;
}

function normalizeArray(input: unknown): string[] {
  if (Array.isArray(input)) {
    return input
      .flatMap((v) => typeof v === 'string' ? v.split(',') : [])
      .map((v) => v.trim())
      .filter(Boolean);
  }
  if (typeof input === 'string') {
    return input.split(',').map((v) => v.trim()).filter(Boolean);
  }
  return [];
}

function normalizeRelayUrl(url: string): string {
  const value = (url || '').trim();
  if (!value) return '';
  if (value.startsWith('wss://')) return value.replace('wss://', 'https://');
  if (value.startsWith('ws://')) return value.replace('ws://', 'http://');
  return value;
}

interface StrategicQueryVariant {
  label: string;
  tag: string;
  query: string;
}

interface XApiSearchOptions {
  headers: Record<string, string>;
  query: string;
  maxResults: number;
  startTime?: string;
  endTime?: string;
}

interface XApiRow {
  id: string;
  text: string;
  createdAt: string;
  handle: string;
}

async function searchXRecentApi(options: XApiSearchOptions): Promise<XApiRow[]> {
  const url = new URL('https://api.twitter.com/2/tweets/search/recent');
  url.searchParams.set('max_results', String(clampInt(options.maxResults, 10, 100)));
  url.searchParams.set('tweet.fields', 'created_at,lang,public_metrics,author_id');
  url.searchParams.set('expansions', 'author_id');
  url.searchParams.set('user.fields', 'username');
  url.searchParams.set('query', options.query);
  if (options.startTime) url.searchParams.set('start_time', options.startTime);
  if (options.endTime) url.searchParams.set('end_time', options.endTime);

  try {
    const resp = await fetch(url.toString(), { headers: options.headers });
    if (!resp.ok) return [];
    const json = await resp.json() as {
      data?: Array<{ id?: string; text?: string; created_at?: string; author_id?: string }>;
      includes?: { users?: Array<{ id?: string; username?: string }> };
    };
    const users = new Map<string, string>();
    for (const user of json.includes?.users || []) {
      if (user.id && user.username) users.set(user.id, user.username);
    }
    const out: XApiRow[] = [];
    for (const row of json.data || []) {
      const id = String(row.id || '').trim();
      const text = String(row.text || '').trim();
      if (!id || !text) continue;
      const handle = row.author_id ? (users.get(row.author_id) || 'unknown') : 'unknown';
      out.push({
        id,
        text,
        createdAt: String(row.created_at || ''),
        handle,
      });
    }
    return out;
  } catch {
    return [];
  }
}

function buildStrategicQueryVariants(baseQuery: string, mode: 'api' | 'web'): StrategicQueryVariant[] {
  const base = baseQuery.trim();
  if (!base) return [];
  if (mode === 'api') {
    return [
      { label: 'base', tag: 'base', query: `${base} -is:reply` },
      { label: 'links', tag: 'links', query: `${base} has:links -is:reply` },
      { label: 'media', tag: 'media', query: `${base} has:media -is:reply` },
      { label: 'verified', tag: 'verified', query: `${base} is:verified -is:reply` },
    ];
  }
  return [
    { label: 'base', tag: 'base', query: `${base} -filter:replies` },
    { label: 'links', tag: 'links', query: `${base} filter:links -filter:replies` },
    { label: 'media', tag: 'media', query: `${base} filter:media -filter:replies` },
    { label: 'images', tag: 'images', query: `${base} filter:images -filter:replies` },
    { label: 'videos', tag: 'videos', query: `${base} filter:videos -filter:replies` },
    { label: 'verified', tag: 'verified', query: `${base} filter:verified -filter:replies` },
  ];
}

function extractStrategicPhrase(text: string): string {
  const normalized = text
    .replace(/https?:\/\/\S+/g, ' ')
    .replace(/[@#][\w_]+/g, ' ')
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!normalized) return '';
  const words = normalized
    .split(' ')
    .filter((w) => w.length >= 4)
    .slice(0, 9);
  if (words.length < 3) return '';
  return `"${words.join(' ')}"`;
}

function strategicClaimSeed(text: string): string {
  const phrase = extractStrategicPhrase(text);
  if (phrase) return phrase.toLowerCase();
  return normalizedClaim(normalizeText(text));
}

function buildStrategicEvidenceQueries(phrase: string, accountHandle: string): StrategicQueryVariant[] {
  const handle = accountHandle.replace(/^@/, '').trim();
  return [
    { label: 'exact', tag: 'exact', query: `${phrase} -is:reply -is:retweet` },
    { label: 'links', tag: 'links', query: `${phrase} has:links -is:reply` },
    { label: 'media', tag: 'media', query: `${phrase} has:media -is:reply` },
    { label: 'verified', tag: 'verified', query: `${phrase} is:verified -is:reply` },
    { label: 'to-account', tag: 'to_account', query: `${phrase} to:${handle} -is:reply` },
  ];
}

function strategicWindow(createdAt: string): { start: string; end: string } {
  const center = safeDateMs(createdAt);
  const start = new Date(center - 24 * 60 * 60 * 1000).toISOString();
  const end = new Date(center + 24 * 60 * 60 * 1000).toISOString();
  return { start, end };
}

function parseXHandleFromSource(source: OsnitSource | undefined): string {
  if (!source) return DEFAULT_X_ACCOUNT_HANDLE;
  const explicit = source.query.match(/from:([A-Za-z0-9_]+)/i)?.[1];
  if (explicit) return explicit;
  const fromUrl = source.url.match(/x\.com\/([A-Za-z0-9_]+)/i)?.[1];
  if (fromUrl) return fromUrl;
  return DEFAULT_X_ACCOUNT_HANDLE;
}

function parseXHandleFromStatusUrl(url: string, fallback: string): string {
  const match = url.match(/x\.com\/([A-Za-z0-9_]+)\/status\//i);
  if (match?.[1]) return match[1];
  return fallback;
}

function canonicalizeXStatusUrl(url: string, fallbackHandle: string): string {
  const direct = url.match(/\/([A-Za-z0-9_]+)\/status\/([0-9]+)/i);
  if (direct?.[1] && direct?.[2]) {
    return `https://x.com/${direct[1]}/status/${direct[2]}`;
  }
  const numeric = url.match(/status\/([0-9]+)/i);
  if (numeric?.[1]) {
    return `https://x.com/${fallbackHandle}/status/${numeric[1]}`;
  }
  return url;
}

function parseNitterInstances(): string[] {
  const configured = (process.env.OSNIT_NITTER_INSTANCES || '')
    .split(',')
    .map((x) => x.trim())
    .filter(Boolean);
  const merged = configured.length > 0 ? configured : DEFAULT_NITTER_INSTANCES;
  const normalized = merged
    .map((value) => value.replace(/\/+$/, ''))
    .filter((value) => /^https?:\/\//i.test(value));
  return [...new Set(normalized)];
}

async function fetchUrlTextViaCurl(url: string): Promise<string> {
  if (!process.versions?.node) return '';
  try {
    const dynamicImport = Function('m', 'return import(m)') as (m: string) => Promise<any>;
    const childProcess = await dynamicImport('node:child_process');
    const result = await new Promise<{ stdout: string; stderr: string }>((resolve, reject) => {
      childProcess.execFile(
        'curl',
        [
          '-L',
          '--max-time',
          '10',
          '-A',
          'Mozilla/5.0',
          '-H',
          'Accept: application/rss+xml, application/xml, text/xml, */*',
          '-s',
          url,
        ],
        { timeout: 12_000, maxBuffer: 2 * 1024 * 1024 },
        (error: unknown, stdout: string, stderr: string) => {
          if (error) {
            reject(error);
            return;
          }
          resolve({ stdout, stderr });
        },
      );
    });
    void result.stderr;
    return result.stdout || '';
  } catch {
    return '';
  }
}

function isHighTrustSource(name: string): boolean {
  const key = name.toLowerCase();
  return key.includes('reuters')
    || key.includes('ap news')
    || key.includes('bbc')
    || key.includes('usni')
    || key.includes('defense one');
}

function hashString(value: string): string {
  let h1 = 0x811c9dc5;
  for (let i = 0; i < value.length; i++) {
    h1 ^= value.charCodeAt(i);
    h1 = Math.imul(h1, 0x01000193);
  }
  return (h1 >>> 0).toString(16).padStart(8, '0');
}

function slugify(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

function clampInt(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, Math.floor(value)));
}

function trimTo(value: string, n: number): string {
  return value.length > n ? `${value.slice(0, n - 1)}...` : value;
}

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    out.push(arr.slice(i, i + size));
  }
  return out;
}

const TAG_REGEX_CACHE = new Map<string, { cdata: RegExp; plain: RegExp }>();
const KNOWN_TAGS = ['title', 'link', 'pubDate', 'published', 'updated'] as const;
for (const tag of KNOWN_TAGS) {
  TAG_REGEX_CACHE.set(tag, {
    cdata: new RegExp(`<${tag}[^>]*>\\s*<!\\[CDATA\\[([\\s\\S]*?)\\]\\]>\\s*<\\/${tag}>`, 'i'),
    plain: new RegExp(`<${tag}[^>]*>([^<]*)<\\/${tag}>`, 'i'),
  });
}

function extractTag(xml: string, tag: string): string {
  const cached = TAG_REGEX_CACHE.get(tag);
  const cdataMatch = xml.match(cached?.cdata ?? /a^/);
  if (cdataMatch?.[1]) return cdataMatch[1].trim();
  const plainMatch = xml.match(cached?.plain ?? /a^/);
  return plainMatch?.[1] ? decodeXmlEntities(plainMatch[1].trim()) : '';
}

function decodeXmlEntities(s: string): string {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n: string) => String.fromCharCode(Number(n)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, n: string) => String.fromCharCode(parseInt(n, 16)));
}

function htmlToPlainText(input: string): string {
  if (!input) return '';
  return decodeXmlEntities(
    input
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/p>/gi, '\n')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+\n/g, '\n')
      .replace(/\n\s+/g, '\n')
      .replace(/\s+/g, ' ')
      .trim(),
  );
}
