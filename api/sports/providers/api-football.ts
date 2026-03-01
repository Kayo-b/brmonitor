declare const process: { env: Record<string, string | undefined> };

import { SPORTS_COMPETITIONS, SPORTS_FETCH_TIMEOUT_MS } from '../config';
import type {
  SportsApiMatch,
  SportsApiStandingEntry,
  SportsMatchStatus,
  SportsProviderResult,
} from '../types';

interface ApiFootballTeam {
  id?: number;
  name?: string;
  logo?: string;
}

interface ApiFootballFixtureResponse {
  fixture?: {
    id?: number;
    date?: string;
    status?: {
      short?: string;
      long?: string;
      elapsed?: number | null;
    };
    venue?: {
      name?: string;
    };
  };
  league?: {
    name?: string;
  };
  teams?: {
    home?: ApiFootballTeam;
    away?: ApiFootballTeam;
  };
  goals?: {
    home?: number | null;
    away?: number | null;
  };
}

interface ApiFootballStandingTeam {
  id?: number;
  name?: string;
  logo?: string;
}

interface ApiFootballStandingRow {
  rank?: number;
  points?: number;
  all?: {
    played?: number;
    win?: number;
    draw?: number;
    lose?: number;
    goals?: {
      for?: number;
      against?: number;
    };
  };
  goalsDiff?: number;
  team?: ApiFootballStandingTeam;
}

interface ApiFootballEnvelope {
  response?: unknown;
}

function normalizeStatus(short: string | undefined): SportsMatchStatus {
  if (!short) return 'unknown';

  if (short === 'NS' || short === 'TBD') return 'scheduled';
  if (short === '1H' || short === '2H' || short === 'HT' || short === 'ET' || short === 'BT' || short === 'P') {
    return 'in_progress';
  }
  if (short === 'FT' || short === 'AET' || short === 'PEN') return 'finished';
  if (short === 'PST') return 'postponed';
  if (short === 'CANC' || short === 'ABD' || short === 'AWD' || short === 'WO') return 'cancelled';

  return 'unknown';
}

function parseTeam(team: ApiFootballTeam | undefined, fallback: string): { id: string; name: string; shortName: string; logoUrl?: string } {
  const name = team?.name || fallback;
  const shortName = name.length > 14 ? name.slice(0, 14) : name;

  return {
    id: String(team?.id ?? fallback.toLowerCase()),
    name,
    shortName,
    logoUrl: team?.logo,
  };
}

function safeNumber(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

function buildHeaders(apiKey: string): HeadersInit {
  return {
    Accept: 'application/json',
    'x-apisports-key': apiKey,
  };
}

function withTimeout(signal: AbortSignal | undefined): AbortSignal {
  const timeoutSignal = AbortSignal.timeout(SPORTS_FETCH_TIMEOUT_MS);
  return signal ? AbortSignal.any([signal, timeoutSignal]) : timeoutSignal;
}

async function fetchApiFootballJson(url: string, apiKey: string, signal?: AbortSignal): Promise<unknown> {
  const response = await fetch(url, {
    method: 'GET',
    headers: buildHeaders(apiKey),
    signal: withTimeout(signal),
  });

  if (!response.ok) {
    throw new Error(`API-Football request failed (${response.status})`);
  }

  return response.json();
}

function parseFixtureEnvelope(payload: unknown): ApiFootballFixtureResponse[] {
  const envelope = payload as ApiFootballEnvelope;
  return Array.isArray(envelope.response)
    ? envelope.response as ApiFootballFixtureResponse[]
    : [];
}

function parseStandingEnvelope(payload: unknown): ApiFootballStandingRow[] {
  const envelope = payload as ApiFootballEnvelope;
  const response = Array.isArray(envelope.response) ? envelope.response : [];
  const firstLeague = response[0] as { league?: { standings?: ApiFootballStandingRow[][] } } | undefined;
  const firstGroup = firstLeague?.league?.standings?.[0];
  return Array.isArray(firstGroup) ? firstGroup : [];
}

function mapFixtureToMatch(
  competitionCode: string,
  competitionLabel: string,
  fixture: ApiFootballFixtureResponse,
): SportsApiMatch | null {
  const fixtureId = fixture.fixture?.id;
  const fixtureDate = fixture.fixture?.date;
  if (!fixtureId || !fixtureDate) return null;

  const home = parseTeam(fixture.teams?.home, 'Home');
  const away = parseTeam(fixture.teams?.away, 'Away');

  const shortCode = fixture.fixture?.status?.short;
  const label = fixture.fixture?.status?.long || shortCode || 'Unknown';

  return {
    id: String(fixtureId),
    provider: 'api-football',
    competition: fixture.league?.name || competitionLabel,
    competitionCode,
    kickoffUtc: new Date(fixtureDate).toISOString(),
    status: normalizeStatus(shortCode),
    statusLabel: label,
    minute: fixture.fixture?.status?.elapsed ?? null,
    homeTeam: home,
    awayTeam: away,
    score: {
      home: typeof fixture.goals?.home === 'number' ? fixture.goals.home : null,
      away: typeof fixture.goals?.away === 'number' ? fixture.goals.away : null,
    },
    venue: fixture.fixture?.venue?.name,
  };
}

function mapStandingToEntry(
  competitionCode: string,
  competitionLabel: string,
  row: ApiFootballStandingRow,
): SportsApiStandingEntry | null {
  const rank = safeNumber(row.rank);
  if (rank <= 0) return null;

  const teamName = row.team?.name || 'Unknown';

  return {
    provider: 'api-football',
    competition: competitionLabel,
    competitionCode,
    position: rank,
    points: safeNumber(row.points),
    played: safeNumber(row.all?.played),
    won: safeNumber(row.all?.win),
    drawn: safeNumber(row.all?.draw),
    lost: safeNumber(row.all?.lose),
    goalsFor: safeNumber(row.all?.goals?.for),
    goalsAgainst: safeNumber(row.all?.goals?.against),
    goalDifference: safeNumber(row.goalsDiff),
    team: {
      id: String(row.team?.id ?? teamName.toLowerCase()),
      name: teamName,
      shortName: teamName.length > 14 ? teamName.slice(0, 14) : teamName,
      logoUrl: row.team?.logo,
    },
  };
}

function currentSeasonYear(): number {
  const now = new Date();
  const year = now.getUTCFullYear();
  const month = now.getUTCMonth();
  return month >= 10 ? year + 1 : year;
}

export async function fetchApiFootballProvider(signal?: AbortSignal): Promise<SportsProviderResult> {
  const apiKey = process.env.API_FOOTBALL_KEY;
  if (!apiKey) {
    return {
      provider: 'api-football',
      status: 'skipped',
      matches: [],
      standings: [],
      warnings: ['API_FOOTBALL_KEY not configured'],
    };
  }

  const season = currentSeasonYear();
  const warnings: string[] = [];
  const matchesById = new Map<string, SportsApiMatch>();
  const standings: SportsApiStandingEntry[] = [];

  for (const competition of SPORTS_COMPETITIONS) {
    const baseUrl = 'https://v3.football.api-sports.io';
    const nextUrl = `${baseUrl}/fixtures?league=${competition.apiFootballLeagueId}&season=${season}&next=12&timezone=America/Sao_Paulo`;
    const lastUrl = `${baseUrl}/fixtures?league=${competition.apiFootballLeagueId}&season=${season}&last=12&timezone=America/Sao_Paulo`;
    const standingsUrl = `${baseUrl}/standings?league=${competition.apiFootballLeagueId}&season=${season}`;

    try {
      const nextPayload = await fetchApiFootballJson(nextUrl, apiKey, signal);
      const lastPayload = await fetchApiFootballJson(lastUrl, apiKey, signal);
      const fixtures = [...parseFixtureEnvelope(nextPayload), ...parseFixtureEnvelope(lastPayload)];

      for (const fixture of fixtures) {
        const match = mapFixtureToMatch(competition.competitionCode, competition.label, fixture);
        if (match) {
          matchesById.set(match.id, match);
        }
      }
    } catch (error) {
      warnings.push(`API-Football fixtures failed for ${competition.competitionCode}: ${String(error)}`);
    }

    try {
      const standingsPayload = await fetchApiFootballJson(standingsUrl, apiKey, signal);
      const rows = parseStandingEnvelope(standingsPayload);
      for (const row of rows) {
        const mapped = mapStandingToEntry(competition.competitionCode, competition.label, row);
        if (mapped) {
          standings.push(mapped);
        }
      }
    } catch (error) {
      warnings.push(`API-Football standings failed for ${competition.competitionCode}: ${String(error)}`);
    }
  }

  const matches = [...matchesById.values()];
  const hasData = matches.length > 0 || standings.length > 0;

  return {
    provider: 'api-football',
    status: hasData ? 'ok' : 'error',
    matches,
    standings,
    warnings,
  };
}
