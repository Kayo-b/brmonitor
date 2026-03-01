import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  buildDigestFromProviderResult,
  chooseProviderResult,
} from '../api/sports/br-digest.ts';
import type { SportsProviderResult } from '../api/sports/types.ts';

function result(provider: SportsProviderResult['provider'], status: SportsProviderResult['status'], hasData: boolean): SportsProviderResult {
  return {
    provider,
    status,
    matches: hasData
      ? [{
        id: `${provider}-m1`,
        provider,
        competition: 'Brasileirao Serie A',
        competitionCode: 'bra.1',
        kickoffUtc: '2026-03-01T20:00:00.000Z',
        status: 'scheduled',
        statusLabel: 'Today',
        minute: null,
        homeTeam: { id: '1', name: 'A', shortName: 'A' },
        awayTeam: { id: '2', name: 'B', shortName: 'B' },
        score: { home: null, away: null },
      }]
      : [],
    standings: hasData
      ? [{
        provider,
        competition: 'Brasileirao Serie A',
        competitionCode: 'bra.1',
        position: 1,
        points: 12,
        played: 5,
        won: 4,
        drawn: 0,
        lost: 1,
        goalsFor: 10,
        goalsAgainst: 4,
        goalDifference: 6,
        team: { id: '1', name: 'A', shortName: 'A' },
      }]
      : [],
    warnings: [],
  };
}

describe('sports provider selection', () => {
  it('prefers first provider in priority list with usable data', () => {
    const selected = chooseProviderResult(
      ['api-football', 'espn'],
      [
        result('api-football', 'ok', true),
        result('espn', 'ok', true),
      ],
    );

    assert.equal(selected?.provider, 'api-football');
  });

  it('falls back to secondary provider when primary has no data', () => {
    const selected = chooseProviderResult(
      ['api-football', 'espn'],
      [
        result('api-football', 'error', false),
        result('espn', 'ok', true),
      ],
    );

    assert.equal(selected?.provider, 'espn');
  });

  it('returns first result when every provider fails', () => {
    const selected = chooseProviderResult(
      ['api-football', 'espn'],
      [
        result('api-football', 'error', false),
        result('espn', 'error', false),
      ],
    );

    assert.equal(selected?.provider, 'api-football');
  });
});

describe('sports digest builder', () => {
  it('marks fallbackUsed when selected provider is not first in priority', () => {
    const selected = result('espn', 'ok', true);

    const digest = buildDigestFromProviderResult(
      selected,
      { 'api-football': 'error', espn: 'ok' },
      ['api-football unavailable'],
    );

    assert.equal(digest.providerUsed, 'espn');
    assert.equal(digest.fallbackUsed, true);
    assert.equal(digest.matches.length, 1);
    assert.equal(digest.standings.length, 1);
    assert.ok(digest.warnings.includes('api-football unavailable'));
  });
});
