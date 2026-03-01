import {
  SPORTS_BR_ENDPOINT,
  SPORTS_BR_MAX_MATCHES,
  SPORTS_BR_MAX_STANDINGS,
  SPORTS_BR_PROVIDER_PRIORITY,
  SPORTS_BR_REFRESH_INTERVAL_MS,
} from '@/config/sports-feeds';
import { getHydratedData } from '@/services/bootstrap';
import type {
  SportsBrDigest,
  SportsCategorizedMatches,
  SportsMatch,
  SportsMatchStatus,
  SportsProviderId,
  SportsProviderStatus,
  SportsStandingEntry,
  SportsTeam,
} from '@/types/sports';
import { createCircuitBreaker } from '@/utils/circuit-breaker';

const SERVICE_NAME = 'Sports BR Digest';

const EMPTY_TEAM: SportsTeam = {
  id: 'unknown',
  name: 'TBD',
  shortName: 'TBD',
};

const EMPTY_DIGEST: SportsBrDigest = {
  generatedAt: new Date(0).toISOString(),
  providerUsed: 'espn',
  fallbackUsed: true,
  stale: true,
  matches: [],
  standings: [],
  warnings: ['Sports digest unavailable'],
  sourceStatus: {
    'api-football': 'skipped',
    espn: 'error',
  },
};

const breaker = createCircuitBreaker<SportsBrDigest>({
  name: SERVICE_NAME,
  cacheTtlMs: SPORTS_BR_REFRESH_INTERVAL_MS,
  persistCache: true,
});

let lastDigest: SportsBrDigest | null = null;

function defaultSourceStatus(): Record<string, SportsProviderStatus> {
  return {
    'api-football': 'skipped',
    espn: 'skipped',
  };
}

function isProviderId(value: unknown): value is SportsProviderId {
  return value === 'api-football' || value === 'espn';
}

function normalizeProvider(value: unknown): SportsProviderId {
  return isProviderId(value) ? value : 'espn';
}

function normalizeStatus(value: unknown): SportsProviderStatus {
  if (value === 'ok' || value === 'error' || value === 'skipped') {
    return value;
  }
  return 'error';
}

function normalizeMatchStatus(value: unknown): SportsMatchStatus {
  if (
    value === 'scheduled' ||
    value === 'in_progress' ||
    value === 'finished' ||
    value === 'postponed' ||
    value === 'cancelled' ||
    value === 'unknown'
  ) {
    return value;
  }
  return 'unknown';
}

function normalizeNumber(value: unknown, fallback = 0): number {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string' && value.trim().length > 0) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return fallback;
}

function normalizeNullableNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === '') {
    return null;
  }
  const parsed = normalizeNumber(value, Number.NaN);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeIsoDate(value: unknown): string {
  if (typeof value === 'string') {
    const parsed = Date.parse(value);
    if (Number.isFinite(parsed)) {
      return new Date(parsed).toISOString();
    }
  }
  return new Date().toISOString();
}

function normalizeTeam(input: unknown): SportsTeam {
  if (!input || typeof input !== 'object') {
    return EMPTY_TEAM;
  }

  const candidate = input as Partial<SportsTeam>;
  const id = typeof candidate.id === 'string' && candidate.id.length > 0 ? candidate.id : 'unknown';
  const name = typeof candidate.name === 'string' && candidate.name.length > 0 ? candidate.name : 'TBD';
  const shortName = typeof candidate.shortName === 'string' && candidate.shortName.length > 0
    ? candidate.shortName
    : name;
  const logoUrl = typeof candidate.logoUrl === 'string' && candidate.logoUrl.length > 0
    ? candidate.logoUrl
    : undefined;

  return {
    id,
    name,
    shortName,
    logoUrl,
  };
}

function normalizeMatch(input: unknown): SportsMatch | null {
  if (!input || typeof input !== 'object') {
    return null;
  }

  const candidate = input as Partial<SportsMatch>;
  const id = typeof candidate.id === 'string' && candidate.id.length > 0 ? candidate.id : '';
  if (!id) {
    return null;
  }

  return {
    id,
    provider: normalizeProvider(candidate.provider),
    competition: typeof candidate.competition === 'string' && candidate.competition.length > 0
      ? candidate.competition
      : 'Unknown competition',
    competitionCode: typeof candidate.competitionCode === 'string' && candidate.competitionCode.length > 0
      ? candidate.competitionCode
      : 'unknown',
    kickoffUtc: normalizeIsoDate(candidate.kickoffUtc),
    status: normalizeMatchStatus(candidate.status),
    statusLabel: typeof candidate.statusLabel === 'string' && candidate.statusLabel.length > 0
      ? candidate.statusLabel
      : 'Unknown',
    minute: normalizeNullableNumber(candidate.minute),
    homeTeam: normalizeTeam(candidate.homeTeam),
    awayTeam: normalizeTeam(candidate.awayTeam),
    score: {
      home: normalizeNullableNumber(candidate.score?.home),
      away: normalizeNullableNumber(candidate.score?.away),
    },
    venue: typeof candidate.venue === 'string' && candidate.venue.length > 0
      ? candidate.venue
      : undefined,
  };
}

function normalizeStanding(input: unknown): SportsStandingEntry | null {
  if (!input || typeof input !== 'object') {
    return null;
  }

  const candidate = input as Partial<SportsStandingEntry>;
  const position = normalizeNumber(candidate.position, Number.NaN);
  if (!Number.isFinite(position)) {
    return null;
  }

  return {
    provider: normalizeProvider(candidate.provider),
    competition: typeof candidate.competition === 'string' && candidate.competition.length > 0
      ? candidate.competition
      : 'Unknown competition',
    competitionCode: typeof candidate.competitionCode === 'string' && candidate.competitionCode.length > 0
      ? candidate.competitionCode
      : 'unknown',
    position,
    points: normalizeNumber(candidate.points),
    played: normalizeNumber(candidate.played),
    won: normalizeNumber(candidate.won),
    drawn: normalizeNumber(candidate.drawn),
    lost: normalizeNumber(candidate.lost),
    goalsFor: normalizeNumber(candidate.goalsFor),
    goalsAgainst: normalizeNumber(candidate.goalsAgainst),
    goalDifference: normalizeNumber(candidate.goalDifference),
    team: normalizeTeam(candidate.team),
  };
}

function sortMatches(matches: SportsMatch[]): SportsMatch[] {
  const copy = [...matches];
  copy.sort((a, b) => {
    const aTs = Date.parse(a.kickoffUtc);
    const bTs = Date.parse(b.kickoffUtc);
    return aTs - bTs;
  });
  return copy;
}

function sortStandings(entries: SportsStandingEntry[]): SportsStandingEntry[] {
  const copy = [...entries];
  copy.sort((a, b) => {
    if (a.competitionCode !== b.competitionCode) {
      return a.competitionCode.localeCompare(b.competitionCode);
    }
    return a.position - b.position;
  });
  return copy;
}

export function normalizeSportsDigest(input: Partial<SportsBrDigest> | null | undefined): SportsBrDigest {
  if (!input) {
    return { ...EMPTY_DIGEST, sourceStatus: { ...EMPTY_DIGEST.sourceStatus }, warnings: [...EMPTY_DIGEST.warnings] };
  }

  const matches = Array.isArray(input.matches)
    ? input.matches.map(normalizeMatch).filter((item): item is SportsMatch => item !== null)
    : [];

  const standings = Array.isArray(input.standings)
    ? input.standings.map(normalizeStanding).filter((item): item is SportsStandingEntry => item !== null)
    : [];

  const mergedStatus = defaultSourceStatus();
  if (input.sourceStatus && typeof input.sourceStatus === 'object') {
    for (const [provider, status] of Object.entries(input.sourceStatus)) {
      mergedStatus[provider] = normalizeStatus(status);
    }
  }

  const warnings = Array.isArray(input.warnings)
    ? input.warnings.filter((entry): entry is string => typeof entry === 'string' && entry.length > 0)
    : [];

  return {
    generatedAt: normalizeIsoDate(input.generatedAt),
    providerUsed: normalizeProvider(input.providerUsed),
    fallbackUsed: Boolean(input.fallbackUsed),
    stale: Boolean(input.stale),
    matches: sortMatches(matches).slice(0, SPORTS_BR_MAX_MATCHES),
    standings: sortStandings(standings).slice(0, SPORTS_BR_MAX_STANDINGS),
    warnings,
    sourceStatus: mergedStatus,
  };
}

export function categorizeSportsMatches(matches: SportsMatch[]): SportsCategorizedMatches {
  const live: SportsMatch[] = [];
  const upcoming: SportsMatch[] = [];
  const results: SportsMatch[] = [];

  for (const match of matches) {
    if (match.status === 'in_progress') {
      live.push(match);
      continue;
    }
    if (match.status === 'scheduled') {
      upcoming.push(match);
      continue;
    }
    results.push(match);
  }

  live.sort((a, b) => Date.parse(a.kickoffUtc) - Date.parse(b.kickoffUtc));
  upcoming.sort((a, b) => Date.parse(a.kickoffUtc) - Date.parse(b.kickoffUtc));
  results.sort((a, b) => Date.parse(b.kickoffUtc) - Date.parse(a.kickoffUtc));

  return { live, upcoming, results };
}

export function digestFingerprint(digest: SportsBrDigest): string {
  return JSON.stringify({
    generatedAt: digest.generatedAt,
    providerUsed: digest.providerUsed,
    stale: digest.stale,
    fallbackUsed: digest.fallbackUsed,
    matches: digest.matches.map((match) => ({
      id: match.id,
      status: match.status,
      minute: match.minute,
      score: match.score,
    })),
    standings: digest.standings.map((entry) => ({
      competitionCode: entry.competitionCode,
      teamId: entry.team.id,
      position: entry.position,
      points: entry.points,
    })),
  });
}

async function requestSportsDigest(signal?: AbortSignal): Promise<SportsBrDigest> {
  const response = await fetch(SPORTS_BR_ENDPOINT, {
    method: 'GET',
    headers: { Accept: 'application/json' },
    signal,
  });

  if (!response.ok) {
    throw new Error(`sports endpoint failed (${response.status})`);
  }

  const payload = (await response.json()) as Partial<SportsBrDigest>;
  return normalizeSportsDigest(payload);
}

export interface SportsBrService {
  fetchDigest(options?: { force?: boolean; signal?: AbortSignal }): Promise<SportsBrDigest>;
  getLastDigest(): SportsBrDigest | null;
  getStatus(): string;
}

export const sportsBrService: SportsBrService = {
  async fetchDigest(options = {}) {
    const hydrated = getHydratedData('sportsBrDigest') as Partial<SportsBrDigest> | undefined;
    if (hydrated && lastDigest === null) {
      lastDigest = normalizeSportsDigest(hydrated);
      return lastDigest;
    }

    if (options.force) {
      const fresh = await requestSportsDigest(options.signal);
      breaker.recordSuccess(fresh);
      lastDigest = fresh;
      return fresh;
    }

    const fallback = lastDigest ?? EMPTY_DIGEST;
    const digest = await breaker.execute(() => requestSportsDigest(options.signal), fallback);
    const normalized = normalizeSportsDigest(digest);

    if (normalized.matches.length > 0 || normalized.standings.length > 0) {
      lastDigest = normalized;
      return normalized;
    }

    if (lastDigest) {
      return {
        ...lastDigest,
        stale: true,
        warnings: [...lastDigest.warnings, 'Using previous sports snapshot'],
      };
    }

    return normalized;
  },

  getLastDigest() {
    return lastDigest;
  },

  getStatus() {
    return breaker.getStatus();
  },
};

export async function fetchSportsBrDigest(options?: { force?: boolean; signal?: AbortSignal }): Promise<SportsBrDigest> {
  return sportsBrService.fetchDigest(options);
}

export function getSportsBrDigestStatus(): string {
  return sportsBrService.getStatus();
}

export function getLastSportsBrDigest(): SportsBrDigest | null {
  return sportsBrService.getLastDigest();
}

export { SPORTS_BR_PROVIDER_PRIORITY };
