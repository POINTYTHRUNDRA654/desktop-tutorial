// Small shared helper for calling Brain B (the local service on this computer) from the renderer.
import { LocalAIEngine } from '../LocalAIEngine';

function getApi(): any {
  return (window as any).electron?.api || (window as any).electronAPI;
}

export async function getBrainBBaseUrl(): Promise<string> {
  try {
    const settings = await LocalAIEngine.getLocalAiSettings();
    return String((settings as any)?.brainBBaseUrl || 'http://127.0.0.1:8766');
  } catch {
    return 'http://127.0.0.1:8766';
  }
}

export async function getBrainBAuthHeaders(): Promise<Record<string, string>> {
  try {
    const conn = await getApi()?.getBridgeConnection?.();
    return conn?.token ? { 'X-Mossy-Token': String(conn.token) } : {};
  } catch {
    return {};
  }
}

/** fetch() against Brain B with the auth header and a timeout. JSON bodies get a content type. */
export async function brainBFetch(path: string, init: RequestInit = {}, timeoutMs = 30000): Promise<Response> {
  const base = await getBrainBBaseUrl();
  return fetch(`${base}${path}`, {
    ...init,
    headers: { ...(init.body ? { 'Content-Type': 'application/json' } : {}), ...(await getBrainBAuthHeaders()), ...(init.headers as any) },
    signal: AbortSignal.timeout(timeoutMs),
  });
}
