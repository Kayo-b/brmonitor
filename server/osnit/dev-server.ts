// @ts-nocheck
import http from 'node:http';
import { createOsnitRouter } from './v1/bootstrap';
import { getCorsHeaders, isDisallowedOrigin } from '../cors';

const PORT = Number(process.env.OSNIT_API_PORT || process.env.PORT || 8789);
const router = createOsnitRouter();

function json(body: unknown, status: number, headers: Record<string, string>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...headers },
  });
}

async function toWebRequest(req: http.IncomingMessage): Promise<Request> {
  const host = req.headers.host || `localhost:${PORT}`;
  const url = new URL(req.url || '/', `http://${host}`);
  const headers = new Headers();
  for (const [key, value] of Object.entries(req.headers)) {
    if (typeof value === 'string') headers.set(key, value);
    else if (Array.isArray(value)) headers.set(key, value.join(', '));
  }
  if (req.method === 'GET' || req.method === 'HEAD') {
    return new Request(url.toString(), { method: req.method, headers });
  }
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
  }
  return new Request(url.toString(), { method: req.method, headers, body: Buffer.concat(chunks) });
}

function writeNodeResponse(res: http.ServerResponse, response: Response): void {
  res.statusCode = response.status;
  response.headers.forEach((value, key) => res.setHeader(key, value));
  if (!response.body) {
    res.end();
    return;
  }
  response.arrayBuffer()
    .then((buffer) => res.end(Buffer.from(buffer)))
    .catch(() => res.end());
}

const server = http.createServer(async (req, res) => {
  try {
    const webReq = await toWebRequest(req);
    if (isDisallowedOrigin(webReq)) {
      return writeNodeResponse(res, json({ error: 'Origin not allowed' }, 403, {}));
    }
    const cors = getCorsHeaders(webReq);
    if (webReq.method === 'OPTIONS') {
      return writeNodeResponse(res, new Response(null, { status: 204, headers: cors }));
    }
    const pathname = new URL(webReq.url).pathname;
    if (!pathname.startsWith('/api/osnit/v1/')) {
      return writeNodeResponse(res, json({ error: 'Not found' }, 404, cors));
    }
    const matched = router.match(webReq);
    if (!matched) {
      return writeNodeResponse(res, json({ error: 'Not found' }, 404, cors));
    }
    const routed = await matched(webReq);
    const headers = new Headers(routed.headers);
    for (const [k, v] of Object.entries(cors)) headers.set(k, v);
    return writeNodeResponse(res, new Response(routed.body, {
      status: routed.status,
      statusText: routed.statusText,
      headers,
    }));
  } catch (error) {
    console.error('[osnit-api] request failed:', error);
    return writeNodeResponse(res, json({ error: 'Internal server error' }, 500, {}));
  }
});

server.listen(PORT, () => {
  console.log(`[osnit-api] listening on http://localhost:${PORT}`);
  console.log(`[osnit-api] endpoint example: http://localhost:${PORT}/api/osnit/v1/list-feed?timeframe=24h`);
});
