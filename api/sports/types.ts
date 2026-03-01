export type SportsProviderId = 'api-football' | 'espn';

export type SportsProviderStatus = 'ok' | 'error' | 'skipped';

export type SportsMatchStatus =
  | 'scheduled'
  | 'in_progress'
  | 'finished'
  | 'postponed'
  | 'cancelled'
  | 'unknown';

export interface SportsApiTeam {
  id: string;
  name: string;
  shortName: string;
  logoUrl?: string;
}

export interface SportsApiMatch {
  id: string;
  provider: SportsProviderId;
  competition: string;
  competitionCode: string;
  kickoffUtc: string;
  status: SportsMatchStatus;
  statusLabel: string;
  minute: number | null;
  homeTeam: SportsApiTeam;
  awayTeam: SportsApiTeam;
  score: {
    home: number | null;
    away: number | null;
  };
  venue?: string;
}

export interface SportsApiStandingEntry {
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
  team: SportsApiTeam;
}

export interface SportsProviderResult {
  provider: SportsProviderId;
  status: SportsProviderStatus;
  matches: SportsApiMatch[];
  standings: SportsApiStandingEntry[];
  warnings: string[];
}

export interface SportsApiDigest {
  generatedAt: string;
  providerUsed: SportsProviderId;
  fallbackUsed: boolean;
  stale: boolean;
  matches: SportsApiMatch[];
  standings: SportsApiStandingEntry[];
  warnings: string[];
  sourceStatus: Record<string, SportsProviderStatus>;
}
