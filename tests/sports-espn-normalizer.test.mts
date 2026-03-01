import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  mapEspnScoreboardToMatches,
  mapEspnStandingsToEntries,
} from '../api/sports/providers/espn.ts';

describe('espn sports normalizers', () => {
  it('maps scoreboard payload to normalized matches', () => {
    const payload = {
      events: [
        {
          id: '401',
          date: '2026-03-01T20:00:00.000Z',
          competitions: [
            {
              id: '401',
              date: '2026-03-01T20:00:00.000Z',
              status: {
                displayClock: '72:11',
                type: {
                  state: 'in',
                  description: 'In Progress',
                  shortDetail: '72\'',
                  completed: false,
                },
              },
              venue: { fullName: 'Allianz Parque' },
              competitors: [
                {
                  id: '1',
                  homeAway: 'home',
                  score: '2',
                  team: {
                    id: '1',
                    displayName: 'Palmeiras',
                    abbreviation: 'PAL',
                    logo: 'https://example.com/pal.png',
                  },
                },
                {
                  id: '2',
                  homeAway: 'away',
                  score: '1',
                  team: {
                    id: '2',
                    displayName: 'Santos',
                    abbreviation: 'SAN',
                    logo: 'https://example.com/san.png',
                  },
                },
              ],
            },
          ],
        },
      ],
    };

    const matches = mapEspnScoreboardToMatches('bra.1', 'Brasileirao Serie A', payload);

    assert.equal(matches.length, 1);
    assert.equal(matches[0]?.provider, 'espn');
    assert.equal(matches[0]?.competitionCode, 'bra.1');
    assert.equal(matches[0]?.status, 'in_progress');
    assert.equal(matches[0]?.score.home, 2);
    assert.equal(matches[0]?.score.away, 1);
    assert.equal(matches[0]?.homeTeam.shortName, 'PAL');
    assert.equal(matches[0]?.awayTeam.shortName, 'SAN');
  });

  it('maps standings payload to normalized table entries', () => {
    const payload = {
      children: [
        {
          standings: {
            entries: [
              {
                team: {
                  id: '1',
                  displayName: 'Palmeiras',
                  abbreviation: 'PAL',
                  logos: [{ href: 'https://example.com/pal.png' }],
                },
                stats: [
                  { name: 'rank', value: 1 },
                  { name: 'points', value: 12 },
                  { name: 'gamesPlayed', value: 5 },
                  { name: 'wins', value: 4 },
                  { name: 'ties', value: 0 },
                  { name: 'losses', value: 1 },
                  { name: 'pointsFor', value: 10 },
                  { name: 'pointsAgainst', value: 4 },
                  { name: 'pointDifferential', value: 6 },
                ],
              },
            ],
          },
        },
      ],
    };

    const rows = mapEspnStandingsToEntries('bra.1', 'Brasileirao Serie A', payload);

    assert.equal(rows.length, 1);
    assert.equal(rows[0]?.provider, 'espn');
    assert.equal(rows[0]?.team.shortName, 'PAL');
    assert.equal(rows[0]?.position, 1);
    assert.equal(rows[0]?.points, 12);
    assert.equal(rows[0]?.goalDifference, 6);
  });
});
