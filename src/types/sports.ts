export type SportsProviderId = 'api-football' | 'espn';

export type SportsProviderStatus = 'ok' | 'error' | 'skipped';

export type SportsMatchStatus =
  | 'scheduled'
  | 'in_progress'
  | 'finished'
  | 'postponed'
  | 'cancelled'
  | 'unknown';

export interface SportsTeam {
  id: string;
  name: string;
  shortName: string;
  logoUrl?: string;
}

export interface SportsScore {
  home: number | null;
  away: number | null;
}

export interface SportsMatch {
  id: string;
  provider: SportsProviderId;
  competition: string;
  competitionCode: string;
  kickoffUtc: string;
  status: SportsMatchStatus;
  statusLabel: string;
  minute: number | null;
  homeTeam: SportsTeam;
  awayTeam: SportsTeam;
  score: SportsScore;
  venue?: string;
}

export interface SportsStandingEntry {
  provider: SportsProviderId;
  competition: string;
  competitionCode: string;
  position: number;
  points: number;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  team: SportsTeam;
}

export interface SportsBrDigest {
  generatedAt: string;
  providerUsed: SportsProviderId;
  fallbackUsed: boolean;
  stale: boolean;
  matches: SportsMatch[];
  standings: SportsStandingEntry[];
  warnings: string[];
  sourceStatus: Record<string, SportsProviderStatus>;
}

export interface SportsCategorizedMatches {
  live: SportsMatch[];
  upcoming: SportsMatch[];
  results: SportsMatch[];
}
