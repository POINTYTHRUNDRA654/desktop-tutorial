import { isNewerVersion, pickLatestAppRelease } from '../updateCheck';

describe('update check', () => {
  it('compares x.y.z versions numerically', () => {
    expect(isNewerVersion('v6.0.1', '6.0.0')).toBe(true);
    expect(isNewerVersion('6.10.0', '6.9.9')).toBe(true);
    expect(isNewerVersion('v6.0.0', '6.0.0')).toBe(false);
    expect(isNewerVersion('5.9.9', '6.0.0')).toBe(false);
    expect(isNewerVersion('vv5.4.36', '5.4.0')).toBe(false); // old double-v tags are never offered
    expect(isNewerVersion('brain-b-v1.2.0', '0.0.1')).toBe(false);
  });

  it('only considers published app releases, not drafts, prereleases or Brain B / memory-pack tags', () => {
    const latest = pickLatestAppRelease([
      { tag_name: 'brain-b-v9.9.9', html_url: 'b', draft: false, prerelease: false },
      { tag_name: 'memory-pack-v1', html_url: 'm', draft: false, prerelease: false },
      { tag_name: 'v7.0.0', html_url: 'draft', draft: true, prerelease: false },
      { tag_name: 'v6.5.0', html_url: 'pre', draft: false, prerelease: true },
      { tag_name: 'v6.1.0', html_url: 'good', name: 'Mossy 6.1.0', draft: false, prerelease: false },
      { tag_name: 'v6.0.0', html_url: 'old', draft: false, prerelease: false },
    ]);
    expect(latest).toMatchObject({ tag: 'v6.1.0', url: 'good' });
    expect(pickLatestAppRelease([])).toBeNull();
  });
});
