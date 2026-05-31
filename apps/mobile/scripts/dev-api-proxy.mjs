import { createServer } from 'node:http';

const port = Number(process.env.BANDFAN_PROXY_PORT ?? 8787);
const targetOrigin = process.env.BANDFAN_PROXY_TARGET ?? 'https://bandfan.space';

function writeCorsHeaders(response, requestOrigin) {
  response.setHeader('Access-Control-Allow-Origin', requestOrigin ?? '*');
  response.setHeader('Access-Control-Allow-Methods', 'GET,POST,PATCH,OPTIONS');
  response.setHeader('Access-Control-Allow-Headers', 'Accept,Authorization,Content-Type');
  response.setHeader('Access-Control-Expose-Headers', 'Content-Type');
  response.setHeader('Vary', 'Origin');
}

function buildForwardHeaders(headers) {
  const forwardedHeaders = new Headers();

  Object.entries(headers).forEach(([key, value]) => {
    if (!value) {
      return;
    }

    const lowerKey = key.toLowerCase();

    if (['connection', 'content-length', 'host', 'origin', 'referer'].includes(lowerKey)) {
      return;
    }

    if (Array.isArray(value)) {
      value.forEach((entry) => forwardedHeaders.append(key, entry));
      return;
    }

    forwardedHeaders.set(key, value);
  });

  return forwardedHeaders;
}

async function readRequestBody(request) {
  const chunks = [];

  for await (const chunk of request) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  return chunks.length > 0 ? Buffer.concat(chunks) : undefined;
}

const server = createServer(async (request, response) => {
  writeCorsHeaders(response, request.headers.origin);

  if (request.method === 'OPTIONS') {
    response.writeHead(204);
    response.end();
    return;
  }

  if (!request.url?.startsWith('/api/')) {
    response.writeHead(404, { 'Content-Type': 'application/json' });
    response.end(JSON.stringify({ message: 'Proxy only forwards /api/* routes.' }));
    return;
  }

  try {
    const targetUrl = new URL(request.url, targetOrigin);
    const body = request.method === 'GET' || request.method === 'HEAD' ? undefined : await readRequestBody(request);
    const upstreamResponse = await fetch(targetUrl, {
      body,
      duplex: body ? 'half' : undefined,
      headers: buildForwardHeaders(request.headers),
      method: request.method,
    });
    const responseBuffer = Buffer.from(await upstreamResponse.arrayBuffer());

    upstreamResponse.headers.forEach((value, key) => {
      if (['connection', 'content-encoding', 'content-length', 'transfer-encoding'].includes(key.toLowerCase())) {
        return;
      }

      response.setHeader(key, value);
    });

    writeCorsHeaders(response, request.headers.origin);
    response.writeHead(upstreamResponse.status);
    response.end(responseBuffer);
  } catch (error) {
    response.writeHead(502, { 'Content-Type': 'application/json' });
    response.end(
      JSON.stringify({
        message: 'Local BandFan proxy could not reach the upstream API.',
        details: error instanceof Error ? error.message : String(error),
      }),
    );
  }
});

server.listen(port, () => {
  console.log(`BandFan web API proxy listening on http://localhost:${port} -> ${targetOrigin}`);
});