/**
 * "A new version of Mossy is out" -- checks the public GitHub Releases page.
 *
 * Only reads https://api.github.com/repos/<repo>/releases (nothing about the
 * user is sent), only looks at published app releases tagged vX.Y.Z (Brain B
 * and memory-pack releases share the repo and are ignored), and never
 * downloads or installs anything: the notice links to the release page and the
 * user picks their edition's installer there.
 */
export const UPDATE_REPO = 'POINTYTHRUNDRA654/desktop-tutorial';

export type UpdateCheckResult =
  | { ok: true; current: string; latest: string | null; newer: boolean; url: string | null; name: string | null; publishedAt: string | null }
  | { ok: false; current: string; error: string };

const parse = (v: string): number[] | null => {
  const m = /^v?(\d+)\.(\d+)\.(\d+)$/.exec(String(v || '').trim());
  return m ? [Number(m[1]), Number(m[2]), Number(m[3])] : null;
};

/** True when `candidate` is a higher x.y.z than `current`. Anything unparsable is never "newer". */
export function isNewerVersion(candidate: string, current: string): boolean {
  const a = parse(candidate);
  const b = parse(current);
  if (!a || !b) return false;
  for (let i = 0; i < 3; i++) {
    if (a[i] !== b[i]) return a[i] > b[i];
  }
  return false;
}

export function pickLatestAppRelease(releases: any[]): { tag: string; url: string; name: string; publishedAt: string } | null {
  const app = (Array.isArray(releases) ? releases : [])
    .filter((r) => r && !r.draft && !r.prerelease && parse(r.tag_name) && /^v\d/.test(String(r.tag_name)))
    .sort((x, y) => (isNewerVersion(x.tag_name, y.tag_name) ? -1 : isNewerVersion(y.tag_name, x.tag_name) ? 1 : 0));
  const top = app[0];
  return top ? { tag: String(top.tag_name), url: String(top.html_url), name: String(top.name || top.tag_name), publishedAt: String(top.published_at || '') } : null;
}

export async function checkForAppUpdate(current: string): Promise<UpdateCheckResult> {
  try {
    const r = await fetch(`https://api.github.com/repos/${UPDATE_REPO}/releases?per_page=30`, {
      headers: { 'User-Agent': 'Mossy-UpdateCheck', Accept: 'application/vnd.github+json' },
      signal: AbortSignal.timeout(15_000),
    });
    if (!r.ok) return { ok: false, current, error: `GitHub answered HTTP ${r.status}` };
    const latest = pickLatestAppRelease(await r.json());
    if (!latest) return { ok: true, current, latest: null, newer: false, url: null, name: null, publishedAt: null };
    return { ok: true, current, latest: latest.tag.replace(/^v/, ''), newer: isNewerVersion(latest.tag, current), url: latest.url, name: latest.name, publishedAt: latest.publishedAt };
  } catch (e: any) {
    return { ok: false, current, error: e?.name === 'TimeoutError' ? 'GitHub did not answer within 15 seconds' : String(e?.message || e) };
  }
}
