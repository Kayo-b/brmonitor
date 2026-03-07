# OSNIT API Reference

This document describes all OSNIT API features and how to call them.

## Base URL

- Local (standalone): `http://localhost:8789`
- Local (with custom port): `http://localhost:$OSNIT_API_PORT`
- API base path: `/api/osnit/v1`

Examples in this doc assume `http://localhost:8789`.

## Auth And Access

- Access mode: public
- Authentication: none
- Content type: `application/json`

## Quick Start

1. Start the API:

```bash
npm run dev:osnit-api
```

2. Call the feed endpoint:

```bash
curl "http://localhost:8789/api/osnit/v1/list-feed?timeframe=24h&limit=20"
```

3. Open the simple frontend console:

- URL in dev server: `/osnit-api-console.html`
- file: `public/osnit-api-console.html`

If your API runs on another origin/port, set `API Base URL` at the top of the page
(for example: `http://localhost:8789/api/osnit/v1`).

4. Open the minimal vertical feed UI:

- URL in dev server: `/osnit-feed.html`
- file: `public/osnit-feed.html`
- behavior: Twitter-style readable feed with search/filter controls.

5. Enable X scraping with login (Playwright fallback):

```bash
OSNIT_X_USERNAME="your_x_login" \
OSNIT_X_PASSWORD="your_x_password" \
OSNIT_X_EMAIL="your_email_if_challenged" \
npm run dev
```

Then query X feed:

```bash
curl "http://localhost:5173/api/osnit/v1/list-feed?source_types=x&refresh=true&limit=20"
```

## Endpoints

1. `GET /api/osnit/v1/list-feed`
- Purpose: return latest OSNIT items with structured filters.

2. `GET /api/osnit/v1/search-items`
- Purpose: full-text search (`q`) plus structured filters.

3. `GET /api/osnit/v1/get-item`
- Purpose: return one item by `id`.

4. `GET /api/osnit/v1/list-sources`
- Purpose: return configured gathering sources (RSS/X/Telegram), including enabled/disabled flags.

## Shared Filters (list-feed and search-items)

- `timeframe`: `1h`, `6h`, `24h`, `7d`, `30d`
- `from`: epoch milliseconds (inclusive)
- `to`: epoch milliseconds (inclusive)
- `regions`: comma-separated values
- `themes`: comma-separated values
- `source_types`: comma-separated values (`rss`, `x`, `telegram`)
- `verification_status`: `unverified`, `partially_verified` (or `partial`), `verified`
- `tags`: dedicated tag filter
- `translate_to`: optional output translation language (`en`, `es`, `fr`, etc.) for `title` and `text`
- `limit`: page size (server max `250`, default `50`)
- `cursor`: next page cursor from previous response
- `refresh`: `true|false` (force gather before query)

## Multi-Value Parameter Encoding

- Use comma-separated values for multi filters:
  - `regions=iran,ukraine`
  - `themes=conflict,cyber`
  - `source_types=x,telegram`
  - `tags=x_filter:exact,ukraine`
- `tags` additionally supports repeated params:
  - `tags=cyber&tags=ukraine`

## list-feed

### Example

```bash
curl "http://localhost:8789/api/osnit/v1/list-feed?timeframe=24h&regions=iran,ukraine&source_types=x,telegram&tags=x_filter:exact&verification_status=verified&limit=25"
```

With translation:

```bash
curl "http://localhost:8789/api/osnit/v1/list-feed?source_types=telegram&translate_to=en&limit=10"
```

### Response Fields

- `items[]`: array of `OsnitItem`
- `nextCursor`: empty when no more results
- `total`: total matching items
- `refreshedAt`: last gather timestamp (epoch ms)

## search-items

### Example

```bash
curl "http://localhost:8789/api/osnit/v1/search-items?q=drone%20strike&timeframe=7d&regions=middle_east,iran&tags=military,x_verification&limit=20"
```

### Notes

- `q` searches over `title` + `text`.
- All shared filters still apply.

## get-item

### Example

```bash
curl "http://localhost:8789/api/osnit/v1/get-item?id=osnit-abc12345"
```

Translated:

```bash
curl "http://localhost:8789/api/osnit/v1/get-item?id=osnit-abc12345&translate_to=en"
```

### Response

- `item`: the matched `OsnitItem` (or empty when not found)

## list-sources

### Example

```bash
curl "http://localhost:8789/api/osnit/v1/list-sources?source_type=telegram&region=middle_east"
```

### Response Fields

- `sources[]`:
  - `id`, `name`, `sourceType`, `url`, `query`
  - `region`, `theme`
  - `enabled` (whether used for ingestion)
  - `highTrust`
- `refreshedAt`

## OsnitItem Schema (Key Fields)

- `id`
- `sourceType`: `OSNIT_SOURCE_TYPE_RSS|OSNIT_SOURCE_TYPE_X|OSNIT_SOURCE_TYPE_TELEGRAM`
- `sourceName`, `sourceHandle`, `url`
- `title`, `text` (full message/body)
- `publishedAt`, `ingestedAt`
- `themes[]`, `regions[]`, `tags[]`
- `verificationStatus`
- `corroborationCount`
- `confidence` (0..1)
- `claimHash`
- `highTrustReference`

## Dedicated Tags Filter

The `tags` filter is a first-class API filter and can target:

- thematic tags (for example `conflict`, `cyber`, `military`)
- regional tags (for example `iran`, `ukraine`, `usa`)
- source tags (`rss`, `x`, `telegram`)
- X strategic verification tags (for example `x_filter:exact`, `x_filter:links`, `x_verification`)

The filter is OR-based across provided tags (item matches when at least one tag matches).

## Pagination

1. First call:

```bash
curl "http://localhost:8789/api/osnit/v1/list-feed?limit=50"
```

2. Use `nextCursor` for next page:

```bash
curl "http://localhost:8789/api/osnit/v1/list-feed?limit=50&cursor=50"
```

## Frontend Usage (fetch)

```ts
const params = new URLSearchParams({
  timeframe: '24h',
  regions: 'iran,ukraine',
  tags: 'x_filter:exact,x_verification',
  limit: '20',
});

const res = await fetch(`/api/osnit/v1/list-feed?${params.toString()}`);
const data = await res.json();
```

## OpenAPI Artifacts

- YAML: `docs/api/OsnitService.openapi.yaml`
- JSON: `docs/api/OsnitService.openapi.json`

## Operational Environment Variables

- `OSNIT_API_PORT`: API port (default `8789`)
- `OSNIT_STORE_PATH`: persistent store path (default `data/osnit-store.json`)
- `OSNIT_REFRESH_INTERVAL_MS`: refresh interval
- `OSNIT_MAX_STORE_ITEMS`: safety cap
- `WS_RELAY_URL`: Telegram relay base URL
- `OSNIT_TELEGRAM_WEB_MAX_SOURCES`: max Telegram channels scraped via public web fallback when relay is unavailable (default `14`)
- `RELAY_SHARED_SECRET`, `RELAY_AUTH_HEADER`: relay auth (optional)
- `X_BEARER_TOKEN` or `TWITTER_BEARER_TOKEN`: X API access
- `OSNIT_X_USERNAME` / `OSNIT_X_PASSWORD` / `OSNIT_X_EMAIL`: X login for Playwright scraping fallback
- `OSNIT_ENABLE_NITTER_FALLBACK`: enable/disable Nitter/XCancel RSS fallback (`true` by default)
- `OSNIT_NITTER_INSTANCES`: comma-separated RSS mirror list override
- `OSNIT_NITTER_ENABLE_SEARCH`: enable Nitter query-search ingestion (`false` by default, slower/less reliable)
- `OSNIT_NITTER_MAX_ACCOUNT_SOURCES`: account RSS source cap for fallback
- `OSNIT_NITTER_MAX_QUERY_SOURCES`: query source cap when Nitter search is enabled
- `OSNIT_NITTER_MAX_QUERY_VARIANTS`: strategic query variant cap when Nitter search is enabled
- `OSNIT_NITTER_CURL_FALLBACK`: use `curl` fallback for Nitter RSS fetches when runtime `fetch` fails
- `GOOGLE_TRANSLATE_API_KEY`: optional official Google Cloud Translation key
- `OSNIT_GOOGLE_TRANSLATE_WEB_URL`: optional override for Google web translation endpoint
- `OSNIT_X_PLAYWRIGHT_ENDPOINT`: remote Playwright bridge
- `OSNIT_ENABLE_PLAYWRIGHT_FALLBACK`: force local Playwright fallback (`true`/`false`)
  if unset, fallback auto-enables when `OSNIT_X_USERNAME` and `OSNIT_X_PASSWORD` are provided

## Error Handling

- `400`: validation error (`violations[]`)
- `500`: internal error (`message`)
