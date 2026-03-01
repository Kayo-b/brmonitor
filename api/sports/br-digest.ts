export const config = { runtime: 'edge' };

import {
  SPORTS_CACHE_TTL_MS,
  SPORTS_MAX_MATCHES,
  SPORTS_MAX_STANDINGS,
  SPORTS_PROVIDER_PRIORITY,
} from './config';
import { fetchApiFootballProvider } from './providers/api-football';
import { fetchEspnProvider } from './providers/espn';
import type {
  SportsApiDigest,
  SportsApiMatch,
  SportsApiStandingEntry,
  SportsProviderId,
  SportsProviderResult,
  SportsProviderStatus,
} from './types';

const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'content-type, authorization',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
};

let cachedDigest: SportsApiDigest | null = null;
let cacheTimestamp = 0;
let inFlight: Promise<SportsApiDigest> | null = null;

const EMPTY_DIGEST: SportsApiDigest = {
  generatedAt: new Date(0).toISOString(),
  providerUsed: 'espn',
  fallbackUsed: true,
  stale: true,
  matches: [],
  standings: [],
  warnings: ['No sports providers returned data'],
  sourceStatus: {
    'api-football': 'skipped',
    espn: 'error',
  },
};

function jsonResponse(body: unknown, status = 200, extraHeaders: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'public, s-maxage=120, stale-while-revalidate=60, stale-if-error=300',
      ...CORS_HEADERS,
      ...extraHeaders,
    },
  });
}

function nowIso(): string {
  return new Date().toISOString();
}

function dedupeWarnings(warnings: string[]): string[] {
  const set = new Set<string>();
  for (const warning of warnings) {
    const normalized = warning.trim();
    if (!normalized) continue;
    set.add(normalized);
  }
  return [...set];
}

function sortMatches(matches: SportsApiMatch[]): SportsApiMatch[] {
  const copy = [...matches];
  copy.sort((a, b) => Date.parse(a.kickoffUtc) - Date.parse(b.kickoffUtc));
  return copy.slice(0, SPORTS_MAX_MATCHES);
}

function sortStandings(entries: SportsApiStandingEntry[]): SportsApiStandingEntry[] {
  const copy = [...entries];
  copy.sort((a, b) => {
    if (a.competitionCode !== b.competitionCode) {
      return a.competitionCode.localeCompare(b.competitionCode);
    }
    return a.position - b.position;
  });
  return copy.slice(0, SPORTS_MAX_STANDINGS);
}

function hasData(result: SportsProviderResult): boolean {
  return result.matches.length > 0 || result.standings.length > 0;
}

function staleFromCache(cache: SportsApiDigest, reason: string): SportsApiDigest {
  return {
    ...cache,
    stale: true,
    fallbackUsed: true,
    generatedAt: nowIso(),
    warnings: dedupeWarnings([...cache.warnings, reason]),
  };
}

export function buildDigestFromProviderResult(
  selected: SportsProviderResult,
  sourceStatus: Record<string, SportsProviderStatus>,
  aggregateWarnings: string[],
): SportsApiDigest {
  return {
    generatedAt: nowIso(),
    providerUsed: selected.provider,
    fallbackUsed: selected.provider !== SPORTS_PROVIDER_PRIORITY[0],
    stale: false,
    matches: sortMatches(selected.matches),
    standings: sortStandings(selected.standings),
    warnings: dedupeWarnings([...aggregateWarnings, ...selected.warnings]),
    sourceStatus,
  };
}

export function chooseProviderResult(
  priority: SportsProviderId[],
  results: SportsProviderResult[],
): SportsProviderResult | null {
  for (const provider of priority) {
    const result = results.find((entry) => entry.provider === provider);
    if (!result) continue;
    if (result.status === 'ok' && hasData(result)) {
      return result;
    }
  }

  for (const provider of priority) {
    const result = results.find((entry) => entry.provider === provider);
    if (!result) continue;
    if (result.status === 'ok') {
      return result;
    }
  }

  return results[0] ?? null;
}

async function fetchProvider(provider: SportsProviderId, signal?: AbortSignal): Promise<SportsProviderResult> {
  if (provider === 'api-football') {
    return fetchApiFootballProvider(signal);
  }
  return fetchEspnProvider(signal);
}

async function buildSportsDigest(signal?: AbortSignal): Promise<SportsApiDigest> {
  const results: SportsProviderResult[] = [];
  const sourceStatus: Record<string, SportsProviderStatus> = {};
  const aggregateWarnings: string[] = [];

  for (const provider of SPORTS_PROVIDER_PRIORITY) {
    const result = await fetchProvider(provider, signal);
    results.push(result);
    sourceStatus[result.provider] = result.status;
    aggregateWarnings.push(...result.warnings);

    if (result.status === 'ok' && hasData(result)) {
      return buildDigestFromProviderResult(result, sourceStatus, aggregateWarnings);
    }
  }

  const selected = chooseProviderResult(SPORTS_PROVIDER_PRIORITY, results);
  if (selected) {
    const digest = buildDigestFromProviderResult(selected, sourceStatus, aggregateWarnings);
    if (!hasData(selected)) {
      digest.stale = true;
      digest.warnings = dedupeWarnings([...digest.warnings, 'Selected provider returned empty payload']);
    }
    return digest;
  }

  return {
    ...EMPTY_DIGEST,
    generatedAt: nowIso(),
    warnings: dedupeWarnings([...aggregateWarnings, ...EMPTY_DIGEST.warnings]),
    sourceStatus: {
      ...EMPTY_DIGEST.sourceStatus,
      ...sourceStatus,
    },
  };
}

function isCacheFresh(): boolean {
  return cachedDigest !== null && Date.now() - cacheTimestamp < SPORTS_CACHE_TTL_MS;
}

async function resolveWithCache(signal?: AbortSignal): Promise<SportsApiDigest> {
  if (isCacheFresh() && cachedDigest) {
    return cachedDigest;
  }

  if (!inFlight) {
    inFlight = buildSportsDigest(signal)
      .then((digest) => {
        if (digest.matches.length > 0 || digest.standings.length > 0) {
          cachedDigest = digest;
          cacheTimestamp = Date.now();
          return digest;
        }

        if (cachedDigest) {
          return staleFromCache(cachedDigest, 'Using cached sports snapshot after empty provider response');
        }

        return digest;
      })
      .catch((error) => {
        if (cachedDigest) {
          return staleFromCache(cachedDigest, `Using cached sports snapshot after provider failure: ${String(error)}`);
        }

        return {
          ...EMPTY_DIGEST,
          generatedAt: nowIso(),
          warnings: dedupeWarnings([...EMPTY_DIGEST.warnings, String(error)]),
        };
      })
      .finally(() => {
        inFlight = null;
      });
  }

  return inFlight;
}

export default async function handler(request: Request): Promise<Response> {
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  if (request.method !== 'GET') {
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }

  const url = new URL(request.url);
  const forceRefresh = url.searchParams.get('refresh') === '1';

  if (forceRefresh) {
    cachedDigest = null;
    cacheTimestamp = 0;
  }

  const digest = await resolveWithCache(request.signal);
  const cacheHeader = isCacheFresh() ? 'hit' : 'miss';

  return jsonResponse(digest, 200, { 'X-Sports-Cache': cacheHeader });
}
