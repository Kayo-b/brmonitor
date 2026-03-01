import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizeNominalVoteSession,
  normalizeRollCallEntries,
  buildVoteTally,
} from '../server/worldmonitor/legislative/v1/_shared';

describe('legislative normalization', () => {
  it('normalizes nominal voting session with proposicao metadata', () => {
    const session = normalizeNominalVoteSession(
      {
        id: '2524984-37',
        dataHoraRegistro: '2026-02-27T19:10:00',
        descricao: 'Votacao nominal',
        siglaOrgao: 'PLEN',
      },
      {
        descricao: 'Aprovacao do texto-base',
        descResultado: 'Aprovado',
        aprovacao: 1,
        proposicoesAfetadas: [{
          id: 12345,
          siglaTipo: 'PL',
          numero: 1010,
          ano: 2025,
          ementa: 'Teste de ementa',
          uri: 'https://dadosabertos.camara.leg.br/api/v2/proposicoes/12345',
        }],
      },
      'fresh',
    );

    assert.ok(session);
    assert.equal(session?.votacaoId, '2524984-37');
    assert.equal(session?.tipoVotacao, 'nominal');
    assert.equal(session?.proposicao?.codigo, 'PL 1010/2025');
    assert.equal(session?.aprovacao, 1);
  });

  it('returns null for non-nominal entries without hints', () => {
    const session = normalizeNominalVoteSession(
      {
        id: 'abc',
        descricao: 'Votacao simbolica',
      },
      {
        descricao: 'Discussao da materia',
      },
      'fresh',
    );

    assert.equal(session, null);
  });

  it('normalizes roll-call entries and deduplicates by deputado id', () => {
    const entries = normalizeRollCallEntries([
      {
        tipoVoto: 'Sim',
        deputado_: { id: 1, nome: 'Alice', siglaPartido: 'PT', siglaUf: 'SP' },
      },
      {
        tipoVoto: 'Não',
        deputado_: { id: 2, nome: 'Bruno', siglaPartido: 'PSB', siglaUf: 'RJ' },
      },
      {
        tipoVoto: 'Sim',
        deputado_: { id: 1, nome: 'Alice', siglaPartido: 'PT', siglaUf: 'SP' },
      },
    ]);

    assert.equal(entries.length, 2);
    assert.equal(entries[0]?.deputado?.id, 1);
    assert.equal(entries[1]?.deputado?.id, 2);
  });

  it('builds vote tally with normalized Portuguese labels', () => {
    const tally = buildVoteTally([
      { deputado: { id: 1, nome: 'A', siglaPartido: 'X', siglaUf: 'SP', uri: '' }, voto: 'Sim' },
      { deputado: { id: 2, nome: 'B', siglaPartido: 'X', siglaUf: 'SP', uri: '' }, voto: 'Não' },
      { deputado: { id: 3, nome: 'C', siglaPartido: 'X', siglaUf: 'SP', uri: '' }, voto: 'Abstenção' },
      { deputado: { id: 4, nome: 'D', siglaPartido: 'X', siglaUf: 'SP', uri: '' }, voto: 'Obstrução' },
      { deputado: { id: 5, nome: 'E', siglaPartido: 'X', siglaUf: 'SP', uri: '' }, voto: 'Ausente' },
      { deputado: { id: 6, nome: 'F', siglaPartido: 'X', siglaUf: 'SP', uri: '' }, voto: 'Art. 17' },
    ]);

    assert.equal(tally.favor, 1);
    assert.equal(tally.contra, 1);
    assert.equal(tally.abstencao, 1);
    assert.equal(tally.obstrucao, 1);
    assert.equal(tally.ausente, 2);
    assert.equal(tally.outros, 0);
  });
});
