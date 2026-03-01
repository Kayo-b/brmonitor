import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  categorizeSportsMatches,
  digestFingerprint,
  normalizeSportsDigest,
} from '../src/services/sports/index.ts';

describe('sports service normalization', () => {
  it('normalizes partial digest payloads and enforces defaults', () => {
    const digest = normalizeSportsDigest({
      generatedAt: '2026-03-01T12:00:00.000Z',
      providerUsed: 'espn',
      fallbackUsed: false,
      stale: false,
      matches: [
        {
          id: 'm1',
          provider: 'espn',
          competition: 'Brasileirao Serie A',
          competitionCode: 'bra.1',
          kickoffUtc: '2026-03-01T20:00:00.000Z',
          status: 'in_progress',
          statusLabel: '2H',
          minute: 81,
          homeTeam: { id: '1', name: 'Palmeiras', shortName: 'PAL' },
          awayTeam: { id: '2', name: 'Santos', shortName: 'SAN' },
          score: { home: 2, away: 1 },
        },
      ],
      standings: [
        {
          provider: 'espn',
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
          team: { id: '1', name: 'Palmeiras', shortName: 'PAL' },
        },
      ],
      warnings: ['partial'],
      sourceStatus: { espn: 'ok', 'api-football': 'skipped' },
    });

    assert.equal(digest.providerUsed, 'espn');
    assert.equal(digest.matches.length, 1);
    assert.equal(digest.standings.length, 1);
    assert.equal(digest.sourceStatus.espn, 'ok');
    assert.equal(digest.sourceStatus['api-football'], 'skipped');
  });

  it('handles invalid payloads safely', () => {
    const digest = normalizeSportsDigest({
      providerUsed: 'unknown-provider',
      matches: [{ invalid: true }],
      standings: [{ invalid: true }],
      sourceStatus: { espn: 'bogus' },
    } as unknown as Parameters<typeof normalizeSportsDigest>[0]);

    assert.equal(digest.providerUsed, 'espn');
    assert.equal(digest.matches.length, 0);
    assert.equal(digest.standings.length, 0);
    assert.equal(digest.sourceStatus.espn, 'error');
    assert.equal(digest.sourceStatus['api-football'], 'skipped');
  });
});

describe('sports match categorization', () => {
  it('groups live, upcoming and result matches', () => {
    const digest = normalizeSportsDigest({
      matches: [
        {
          id: 'live',
          provider: 'espn',
          competition: 'A',
          competitionCode: 'a',
          kickoffUtc: '2026-03-01T18:00:00.000Z',
          status: 'in_progress',
          statusLabel: '2H',
          minute: 70,
          homeTeam: { id: '1', name: 'A', shortName: 'A' },
          awayTeam: { id: '2', name: 'B', shortName: 'B' },
          score: { home: 1, away: 0 },
        },
        {
          id: 'upcoming',
          provider: 'espn',
          competition: 'A',
          competitionCode: 'a',
          kickoffUtc: '2026-03-01T22:00:00.000Z',
          status: 'scheduled',
          statusLabel: 'Today',
          minute: null,
          homeTeam: { id: '3', name: 'C', shortName: 'C' },
          awayTeam: { id: '4', name: 'D', shortName: 'D' },
          score: { home: null, away: null },
        },
        {
          id: 'result',
          provider: 'espn',
          competition: 'A',
          competitionCode: 'a',
          kickoffUtc: '2026-02-28T20:00:00.000Z',
          status: 'finished',
          statusLabel: 'FT',
          minute: null,
          homeTeam: { id: '5', name: 'E', shortName: 'E' },
          awayTeam: { id: '6', name: 'F', shortName: 'F' },
          score: { home: 3, away: 2 },
        },
      ],
      sourceStatus: { espn: 'ok', 'api-football': 'skipped' },
    });

    const grouped = categorizeSportsMatches(digest.matches);

    assert.equal(grouped.live.length, 1);
    assert.equal(grouped.upcoming.length, 1);
    assert.equal(grouped.results.length, 1);
    assert.equal(grouped.live[0]?.id, 'live');
    assert.equal(grouped.upcoming[0]?.id, 'upcoming');
    assert.equal(grouped.results[0]?.id, 'result');
  });

  it('creates a deterministic digest fingerprint', () => {
    const digest = normalizeSportsDigest({
      generatedAt: '2026-03-01T12:00:00.000Z',
      providerUsed: 'espn',
      matches: [
        {
          id: 'm1',
          provider: 'espn',
          competition: 'A',
          competitionCode: 'a',
          kickoffUtc: '2026-03-01T20:00:00.000Z',
          status: 'scheduled',
          statusLabel: 'Today',
          minute: null,
          homeTeam: { id: '1', name: 'A', shortName: 'A' },
          awayTeam: { id: '2', name: 'B', shortName: 'B' },
          score: { home: null, away: null },
        },
      ],
      sourceStatus: { espn: 'ok', 'api-football': 'skipped' },
    });

    const a = digestFingerprint(digest);
    const b = digestFingerprint(digest);

    assert.equal(a, b);
  });
});
