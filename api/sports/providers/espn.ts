import { SPORTS_COMPETITIONS, SPORTS_FETCH_TIMEOUT_MS } from '../config';
import type {
  SportsApiMatch,
  SportsApiStandingEntry,
  SportsMatchStatus,
  SportsProviderResult,
} from '../types';

interface EspnTeamRef {
  id?: string;
  displayName?: string;
  abbreviation?: string;
  logo?: string;
}

interface EspnCompetitor {
  id?: string;
  homeAway?: 'home' | 'away' | string;
  score?: string;
  team?: EspnTeamRef;
}

interface EspnStatusType {
  state?: string;
  description?: string;
  shortDetail?: string;
  completed?: boolean;
}

interface EspnCompetitionStatus {
  displayClock?: string;
  type?: EspnStatusType;
}

interface EspnCompetition {
  id?: string;
  date?: string;
  status?: EspnCompetitionStatus;
  competitors?: EspnCompetitor[];
  venue?: {
    fullName?: string;
  };
}

interface EspnEvent {
  id?: string;
  date?: string;
  competitions?: EspnCompetition[];
}

interface EspnScoreboardResponse {
  events?: EspnEvent[];
}

interface EspnStandingStat {
  name?: string;
  value?: number;
}

interface EspnStandingEntry {
  team?: {
    id?: string;
    displayName?: string;
    abbreviation?: string;
    logos?: Array<{ href?: string }>;
  };
  stats?: EspnStandingStat[];
}

interface EspnStandingsResponse {
  children?: Array<{
    standings?: {
      entries?: EspnStandingEntry[];
    };
  }>;
}

function parseScore(value: string | undefined): number | null {
  if (!value) return null;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseMinute(displayClock: string | undefined): number | null {
  if (!displayClock) return null;
  const clean = displayClock.replace(/[^0-9]/g, '');
  if (!clean) return null;
  const parsed = Number.parseInt(clean, 10);
  return Number.isFinite(parsed) ? parsed : null;
}

function mapStateToStatus(state: string | undefined, completed: boolean | undefined): SportsMatchStatus {
  if (completed) return 'finished';
  if (state === 'pre') return 'scheduled';
  if (state === 'in') return 'in_progress';
  if (state === 'post') return 'finished';
  if (state === 'postponed') return 'postponed';
  if (state === 'cancelled') return 'cancelled';
  return 'unknown';
}

function readStandingStat(stats: EspnStandingStat[] | undefined, name: string): number {
  const stat = stats?.find((entry) => entry.name === name);
  return typeof stat?.value === 'number' ? stat.value : 0;
}

function fetchJsonWithTimeout(url: string, signal?: AbortSignal): Promise<unknown> {
  const timeoutSignal = AbortSignal.timeout(SPORTS_FETCH_TIMEOUT_MS);
  const combinedSignal = signal ? AbortSignal.any([signal, timeoutSignal]) : timeoutSignal;

  return fetch(url, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
      'User-Agent': 'brmonitor-sports-module/1.0',
    },
    signal: combinedSignal,
  }).then(async (response) => {
    if (!response.ok) {
      throw new Error(`ESPN fetch failed (${response.status}) for ${url}`);
    }
    return response.json();
  });
}

export function mapEspnScoreboardToMatches(
  competitionCode: string,
  competitionLabel: string,
  payload: unknown,
): SportsApiMatch[] {
  const typed = payload as EspnScoreboardResponse;
  const events = Array.isArray(typed.events) ? typed.events : [];

  const matches: SportsApiMatch[] = [];

  for (const event of events) {
    const game = event.competitions?.[0];
    if (!game) continue;

    const competitors = Array.isArray(game.competitors) ? game.competitors : [];
    const home = competitors.find((entry) => entry.homeAway === 'home') ?? competitors[0];
    const away = competitors.find((entry) => entry.homeAway === 'away') ?? competitors[1];

    if (!home || !away) continue;

    const kickoff = game.date ?? event.date;
    if (!kickoff) continue;

    const statusType = game.status?.type;

    matches.push({
      id: String(game.id ?? event.id ?? `${competitionCode}-${kickoff}`),
      provider: 'espn',
      competition: competitionLabel,
      competitionCode,
      kickoffUtc: new Date(kickoff).toISOString(),
      status: mapStateToStatus(statusType?.state, statusType?.completed),
      statusLabel: statusType?.shortDetail || statusType?.description || 'Unknown',
      minute: parseMinute(game.status?.displayClock),
      homeTeam: {
        id: String(home.team?.id ?? home.id ?? 'home'),
        name: home.team?.displayName || 'Home',
        shortName: home.team?.abbreviation || home.team?.displayName || 'HOME',
        logoUrl: home.team?.logo,
      },
      awayTeam: {
        id: String(away.team?.id ?? away.id ?? 'away'),
        name: away.team?.displayName || 'Away',
        shortName: away.team?.abbreviation || away.team?.displayName || 'AWAY',
        logoUrl: away.team?.logo,
      },
      score: {
        home: parseScore(home.score),
        away: parseScore(away.score),
      },
      venue: game.venue?.fullName,
    });
  }

  return matches;
}

export function mapEspnStandingsToEntries(
  competitionCode: string,
  competitionLabel: string,
  payload: unknown,
): SportsApiStandingEntry[] {
  const typed = payload as EspnStandingsResponse;
  const entries = typed.children?.[0]?.standings?.entries;
  const rows = Array.isArray(entries) ? entries : [];

  return rows.map((entry) => {
    const stats = entry.stats ?? [];

    const mapped: SportsApiStandingEntry = {
      provider: 'espn',
      competition: competitionLabel,
      competitionCode,
      position: readStandingStat(stats, 'rank'),
      points: readStandingStat(stats, 'points'),
      played: readStandingStat(stats, 'gamesPlayed'),
      won: readStandingStat(stats, 'wins'),
      drawn: readStandingStat(stats, 'ties'),
      lost: readStandingStat(stats, 'losses'),
      goalsFor: readStandingStat(stats, 'pointsFor'),
      goalsAgainst: readStandingStat(stats, 'pointsAgainst'),
      goalDifference: readStandingStat(stats, 'pointDifferential'),
      team: {
        id: String(entry.team?.id ?? 'unknown'),
        name: entry.team?.displayName || 'Unknown',
        shortName: entry.team?.abbreviation || entry.team?.displayName || 'UNK',
        logoUrl: entry.team?.logos?.[0]?.href,
      },
    };

    return mapped;
  }).filter((entry) => entry.position > 0);
}

export async function fetchEspnProvider(signal?: AbortSignal): Promise<SportsProviderResult> {
  const warnings: string[] = [];
  const matches: SportsApiMatch[] = [];
  const standings: SportsApiStandingEntry[] = [];

  for (const competition of SPORTS_COMPETITIONS) {
    const scoreboardUrl = `https://site.api.espn.com/apis/site/v2/sports/soccer/${competition.espnLeagueSlug}/scoreboard`;
    const standingsUrl = `https://site.api.espn.com/apis/v2/sports/soccer/${competition.espnLeagueSlug}/standings`;

    try {
      const scoreboardPayload = await fetchJsonWithTimeout(scoreboardUrl, signal);
      matches.push(...mapEspnScoreboardToMatches(competition.competitionCode, competition.label, scoreboardPayload));
    } catch (error) {
      warnings.push(`ESPN scoreboard failed for ${competition.competitionCode}: ${String(error)}`);
    }

    try {
      const standingsPayload = await fetchJsonWithTimeout(standingsUrl, signal);
      standings.push(...mapEspnStandingsToEntries(competition.competitionCode, competition.label, standingsPayload));
    } catch (error) {
      warnings.push(`ESPN standings failed for ${competition.competitionCode}: ${String(error)}`);
    }
  }

  const hasData = matches.length > 0 || standings.length > 0;

  return {
    provider: 'espn',
    status: hasData ? 'ok' : 'error',
    matches,
    standings,
    warnings,
  };
}
