import type {
  NominalVoteSession,
  NominalVoteRollCallEntry,
  DeputyVoteActivityItem,
  VoteTally,
} from '../../../../src/generated/server/worldmonitor/legislative/v1/service_server';
import { getCachedJson, setCachedJson } from '../../../_shared/redis';

interface RecentNominalVotesCache {
  generatedAt: number;
  votacoes: NominalVoteSession[];
}

interface RollCallCache {
  generatedAt: number;
  votos: NominalVoteRollCallEntry[];
  tally: VoteTally;
}

interface DeputyRecentVotesCache {
  generatedAt: number;
  items: DeputyVoteActivityItem[];
}

export interface LegislativeRepository {
  getRecentNominalVotes(dias: number): Promise<RecentNominalVotesCache | null>;
  setRecentNominalVotes(dias: number, payload: RecentNominalVotesCache, ttlSeconds: number): Promise<void>;
  getRollCall(votacaoId: string): Promise<RollCallCache | null>;
  setRollCall(votacaoId: string, payload: RollCallCache, ttlSeconds: number): Promise<void>;
  getDeputyRecentVotes(deputadoId: number, dias: number): Promise<DeputyRecentVotesCache | null>;
  setDeputyRecentVotes(
    deputadoId: number,
    dias: number,
    payload: DeputyRecentVotesCache,
    ttlSeconds: number,
  ): Promise<void>;
}

const CACHE_PREFIX = 'legislative:v1';

function recentKey(dias: number): string {
  return `${CACHE_PREFIX}:recent:${dias}`;
}

function rollCallKey(votacaoId: string): string {
  return `${CACHE_PREFIX}:rollcall:${votacaoId}`;
}

function deputyKey(deputadoId: number, dias: number): string {
  return `${CACHE_PREFIX}:deputy:${deputadoId}:d${dias}`;
}

function parseObject<T extends object>(value: unknown): T | null {
  if (!value || typeof value !== 'object') return null;
  return value as T;
}

class RedisLegislativeRepository implements LegislativeRepository {
  async getRecentNominalVotes(dias: number): Promise<RecentNominalVotesCache | null> {
    const value = await getCachedJson(recentKey(dias));
    return parseObject<RecentNominalVotesCache>(value);
  }

  async setRecentNominalVotes(
    dias: number,
    payload: RecentNominalVotesCache,
    ttlSeconds: number,
  ): Promise<void> {
    await setCachedJson(recentKey(dias), payload, ttlSeconds);
  }

  async getRollCall(votacaoId: string): Promise<RollCallCache | null> {
    const value = await getCachedJson(rollCallKey(votacaoId));
    return parseObject<RollCallCache>(value);
  }

  async setRollCall(votacaoId: string, payload: RollCallCache, ttlSeconds: number): Promise<void> {
    await setCachedJson(rollCallKey(votacaoId), payload, ttlSeconds);
  }

  async getDeputyRecentVotes(deputadoId: number, dias: number): Promise<DeputyRecentVotesCache | null> {
    const value = await getCachedJson(deputyKey(deputadoId, dias));
    return parseObject<DeputyRecentVotesCache>(value);
  }

  async setDeputyRecentVotes(
    deputadoId: number,
    dias: number,
    payload: DeputyRecentVotesCache,
    ttlSeconds: number,
  ): Promise<void> {
    await setCachedJson(deputyKey(deputadoId, dias), payload, ttlSeconds);
  }
}

export function createLegislativeRepository(): LegislativeRepository {
  return new RedisLegislativeRepository();
}
