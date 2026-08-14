// bridgeClient.ts — authenticated client for BridgeServer.ts (the loopback HTTP
// server that used to be fixed on port 21337 with zero authentication and
// Access-Control-Allow-Origin: '*'). See BridgeServer.ts's class-level SECURITY
// comment for the full story: any webpage open in any browser tab while Mossy
// was running could reach it, including a since-removed arbitrary-shell-exec
// path — CORS headers don't prevent this, since they only gate whether the
// calling page's JS can read the response, not whether the request executes.
//
// Every renderer call to the Bridge must go through bridgeFetch()/bridgeUrl()
// here rather than a raw fetch('http://127.0.0.1:21337/...') — the port is now
// OS-assigned (ephemeral) at each launch, and every request must carry a valid
// X-Mossy-Token header or the server returns 401.
//
// This token is Mossy's own INTERNAL, full-access credential — not a general
// third-party API key. See docs/ARCHITECTURE.md's "Bridge auth" section for
// the intended per-client, scoped-token design for actual third-party tools;
// this module only ever authenticates as "the Mossy renderer itself."

interface BridgeConnection {
  port: number;
  token: string;
}

let cached: BridgeConnection | null = null;
let inflight: Promise<BridgeConnection> | null = null;

function getApi(): any {
  return (window as any).electron?.api || (window as any).electronAPI;
}

async function getConnection(forceRefresh = false): Promise<BridgeConnection> {
  if (cached && !forceRefresh) return cached;
  if (inflight && !forceRefresh) return inflight;
  const api = getApi();
  inflight = Promise.resolve(api.getBridgeConnection()).then((conn: BridgeConnection) => {
    cached = conn;
    inflight = null;
    return conn;
  });
  return inflight;
}

/** Resolve a Bridge-relative path ("/health") to a full URL using the current live port. */
export async function bridgeUrl(path: string): Promise<string> {
  const { port } = await getConnection();
  return `http://127.0.0.1:${port}${path}`;
}

/**
 * Authenticated fetch to the Bridge — attaches X-Mossy-Token automatically.
 * Retries once against a freshly-queried port/token on a 401, which covers
 * the (rare, defensive) case of the renderer having cached stale connection
 * info from before the bridge's listen callback finished binding.
 */
export async function bridgeFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const doFetch = async (conn: BridgeConnection): Promise<Response> => {
    const headers = new Headers(init.headers);
    headers.set('X-Mossy-Token', conn.token);
    return fetch(`http://127.0.0.1:${conn.port}${path}`, { ...init, headers });
  };

  const conn = await getConnection();
  const res = await doFetch(conn);
  if (res.status === 401) {
    const fresh = await getConnection(true);
    return doFetch(fresh);
  }
  return res;
}

/** Convenience wrapper for the common "POST JSON, expect JSON back" shape. */
export async function bridgePostJson<T = any>(path: string, body: unknown): Promise<T> {
  const res = await bridgeFetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return res.json();
}
