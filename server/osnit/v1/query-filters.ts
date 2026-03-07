import type { ServerContext } from '../../../src/generated/server/osnit/v1/service_server';

interface RequestWithTags {
  tags: string[];
}

export function withNormalizedTagFilters<T extends RequestWithTags>(ctx: ServerContext, req: T): T {
  const url = new URL(ctx.request.url);
  const rawFromUrl = url.searchParams.getAll('tags');
  const rawFromReq = normalizeTagInput((req as unknown as { tags?: unknown }).tags);
  const merged = [...rawFromReq, ...rawFromUrl]
    .flatMap((value) => value.split(','))
    .map((value) => value.trim())
    .filter(Boolean);

  if (merged.length === 0) return req;

  return {
    ...req,
    tags: [...new Set(merged)],
  };
}

function normalizeTagInput(input: unknown): string[] {
  if (Array.isArray(input)) {
    return input.filter((value): value is string => typeof value === 'string');
  }
  if (typeof input === 'string') return [input];
  return [];
}
