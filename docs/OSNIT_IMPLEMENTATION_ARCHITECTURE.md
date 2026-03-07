# OSNIT Implementation And Architecture Plan

## Goal

Build an `osnit` data gatherer that:

- gathers from RSS/news, X/Twitter, and Telegram,
- organizes and classifies items by theme and region,
- verifies claims using at least 2 independent sources,
- exposes a public API feed that any frontend can consume,
- runs locally first.

API usage details: see `docs/OSNIT_API_REFERENCE.md`.

Design rule: the OSNIT gatherer is standalone and does not import World Monitor feature modules; only source lists were copied/adapted where useful.

## Scope Locked With User

- Domain and API path: `osnit` (`/api/osnit/v1/*`)
- X strategy: API first (when available), Playwright fallback
- Message storage: full message text
- Verification rule: 2+ independent sources
- High-trust baseline source: `@Osinttechnical`
- Retention: permanent
- Auth: public endpoints
- Timeframes: `1h`, `6h`, `24h`, `7d`, `30d`
- Regions: `iran`, `middle_east`, `ukraine`, `russia`, `usa`, `china`, `taiwan`, `venezuela`, `cuba`, `colombia`, `brazil`
- `america` is normalized to `usa`

## Architecture

### 1. API Service Layer (sebuf)

- Proto package: `osnit.v1`
- Service: `OsnitService`
- Independent route bootstrap module: `server/osnit/v1/bootstrap.ts`
- Endpoints:
  - `GET /api/osnit/v1/list-feed`
  - `GET /api/osnit/v1/search-items`
  - `GET /api/osnit/v1/get-item`
  - `GET /api/osnit/v1/list-sources`

### 2. Gatherer Layer

Implemented in `server/osnit/v1/_shared.ts`.

Ingestion providers:

- RSS provider:
  - reads OSNIT-owned feed catalog from `data/osnit-sources.json`
- Telegram provider:
  - reads OSNIT-owned channel catalog from `data/osnit-telegram-channels.json`
  - includes feed channels plus OSINT tooling resources from Awesome Telegram OSINT
  - bot/tool handles are cataloged with `enabled=false` by default (discoverable via API, not ingested as feed)
  - primary fetch from relay endpoint `/telegram/feed` via `WS_RELAY_URL`
  - automatic fallback to public Telegram web channel pages (`https://t.me/s/{handle}`) when relay is unavailable
- X provider:
  - primary: official API via `X_BEARER_TOKEN` / `TWITTER_BEARER_TOKEN`
  - fallback A: external Playwright bridge endpoint (`OSNIT_X_PLAYWRIGHT_ENDPOINT`)
  - fallback B: local Playwright script execution (`OSNIT_ENABLE_PLAYWRIGHT_FALLBACK=true`)
  - strategic verification filters based on the shared OSINT search style:
    - exact phrase
    - links/media/images/videos
    - verified accounts
    - reply exclusion
    - time window around event (`since`/`until` equivalent)

### 3. Normalization Layer

Each gathered record is mapped to one normalized `OsnitItem`:

- source metadata: type/name/handle/url
- full text and title
- `published_at`, `ingested_at`
- `themes[]`, `regions[]`, `tags[]`
- claim fingerprint (`claim_hash`)
- trust marker (`high_trust_reference`)

### 4. Verification Layer

Verification is done by claim fingerprint clustering:

- independent source count is computed per `claim_hash`
- status logic:
  - `unverified`: only one independent source
  - `partially_verified`: 2+ independent sources but same source-type family
  - `verified`: 2+ independent sources across multiple source types
- confidence is boosted by corroboration and high-trust presence

### 5. Persistence Layer

- Store path: `data/osnit-store.json` (override via `OSNIT_STORE_PATH`)
- Store contains:
  - all normalized items (permanent retention)
  - source catalog snapshot
  - last refresh timestamp
- In-memory fallback is used when filesystem access is unavailable

### 6. Query/Feed Layer

Filtering supported by both list/search:

- timeframe shortcuts
- explicit `from` / `to`
- region filters
- theme filters
- source type filters (`rss`, `x`, `telegram`)
- tag filters (`tags`, including `x_filter:*`, thematic and regional tags)
- optional response translation (`translate_to`, e.g. `en`) for item `title` and `text`
- verification status filters
- cursor pagination + limit

Search adds free text query (`q`) over title + full text.

X strategic verification evidence is surfaced in item `tags` as `x_filter:*` and `x_verification`.

## Data Flow

1. Request hits `/api/osnit/v1/list-feed` or `/search-items`.
2. Service checks refresh TTL and optionally gathers new data (`refresh=true` forces gather).
3. Gathered items are normalized, deduplicated, verified, and persisted.
4. API applies filters/search and returns paginated response.

## Local Runtime

### Required

- `make generate` (already done for this service)
- run OSNIT API standalone:
  - `npm run dev:osnit-api`
- or run through existing unified local stack:
  - `npm run dev`

### Optional env vars

- `WS_RELAY_URL` for Telegram ingestion
- `X_BEARER_TOKEN` or `TWITTER_BEARER_TOKEN` for X API ingestion
- `OSNIT_ENABLE_PLAYWRIGHT_FALLBACK=true` for local Playwright fallback
- `OSNIT_X_PLAYWRIGHT_ENDPOINT` for remote Playwright bridge
- `OSNIT_STORE_PATH` custom persistence path
- `OSNIT_REFRESH_INTERVAL_MS` gather refresh interval
- `OSNIT_MAX_STORE_ITEMS` hard cap safety guard

## Current Implementation Status

- Implemented:
  - full proto/service contract
  - generated server/client/OpenAPI artifacts
  - API handler composition for `osnit`
  - gateway + dev-router wiring
  - ingestion + normalization + verification + persistence + filtering core
- Next hardening steps:
  - add dedicated tests for verification and filters
  - add operational metrics and health endpoint
  - tune query packs and source weight model
