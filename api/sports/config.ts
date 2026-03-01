import type { SportsProviderId } from './types';

export interface SportsCompetitionConfig {
  key: 'brasileirao-serie-a' | 'brasileirao-serie-b';
  label: string;
  competitionCode: string;
  espnLeagueSlug: string;
  apiFootballLeagueId: number;
}

export const SPORTS_PROVIDER_PRIORITY: SportsProviderId[] = ['api-football', 'espn'];

export const SPORTS_COMPETITIONS: SportsCompetitionConfig[] = [
  {
    key: 'brasileirao-serie-a',
    label: 'Brasileirao Serie A',
    competitionCode: 'bra.1',
    espnLeagueSlug: 'bra.1',
    apiFootballLeagueId: 71,
  },
  {
    key: 'brasileirao-serie-b',
    label: 'Brasileirao Serie B',
    competitionCode: 'bra.2',
    espnLeagueSlug: 'bra.2',
    apiFootballLeagueId: 72,
  },
];

export const SPORTS_CACHE_TTL_MS = 2 * 60 * 1000;

export const SPORTS_FETCH_TIMEOUT_MS = 8_000;

export const SPORTS_MAX_MATCHES = 40;

export const SPORTS_MAX_STANDINGS = 40;
