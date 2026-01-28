/**
 * GitHub Release Checker
 * Fetches latest release info from GitHub repository
 */

export interface GitHubRelease {
  id: number;
  tag_name: string;
  name: string;
  draft: boolean;
  prerelease: boolean;
  published_at: string;
  body: string;
  html_url: string;
}

const GITHUB_REPO = 'POINTYTHRUNDRA654/desktop-tutorial';
const GITHUB_API_URL = `https://api.github.com/repos/${GITHUB_REPO}`;

/**
 * Fetch latest release from GitHub
 */
export const getLatestGitHubRelease = async (): Promise<GitHubRelease | null> => {
  // Avoid network calls in dev/localhost to keep console clean and offline-friendly
  if (import.meta.env.DEV || typeof window !== 'undefined' && window.location.hostname === 'localhost') {
    return null;
  }

  try {
    const response = await fetch(`${GITHUB_API_URL}/releases/latest`, {
      headers: {
        'Accept': 'application/vnd.github.v3+json'
      }
    });

    if (!response.ok) {
      // 404 is expected if no releases exist yet; skip noisy warning
      if (response.status !== 404) {
        console.warn('[GitHubReleaseChecker] Failed to fetch releases:', response.statusText);
      }
      return null;
    }

    const release: GitHubRelease = await response.json();

    // Skip draft and pre-release versions for stable releases
    if (release.draft || release.prerelease) {
      return null;
    }

    return release;
  } catch (error) {
    console.warn('[GitHubReleaseChecker] Error fetching GitHub releases:', error);
    return null;
  }
};

/**
 * Extract version number from GitHub tag (e.g., "v3.0.0" -> "3.0.0")
 */
export const extractVersionFromTag = (tagName: string): string => {
  return tagName.replace(/^v/, '');
};

/**
 * Get release notes from GitHub release body
 */
export const getReleaseNotes = (release: GitHubRelease): string => {
  // Extract first 500 characters of release notes
  if (!release.body) return '';
  return release.body.substring(0, 500) + (release.body.length > 500 ? '...' : '');
};

/**
 * Check for updates against GitHub releases
 */
export const checkForUpdates = async (
  currentVersion: string
): Promise<{
  available: boolean;
  latestVersion: string;
  releaseNotes: string;
  downloadUrl: string;
} | null> => {
  try {
    const release = await getLatestGitHubRelease();
    if (!release) {
      return null;
    }

    const latestVersion = extractVersionFromTag(release.tag_name);

    // Compare versions
    const currentParts = currentVersion.split('.').map(Number);
    const latestParts = latestVersion.split('.').map(Number);

    let isNewer = false;
    for (let i = 0; i < Math.max(currentParts.length, latestParts.length); i++) {
      const curr = currentParts[i] || 0;
      const latest = latestParts[i] || 0;
      if (latest > curr) {
        isNewer = true;
        break;
      }
      if (latest < curr) {
        break;
      }
    }

    if (!isNewer) {
      return null;
    }

    return {
      available: true,
      latestVersion,
      releaseNotes: getReleaseNotes(release),
      downloadUrl: release.html_url
    };
  } catch (error) {
    console.warn('[UpdateChecker] Error checking for updates:', error);
    return null;
  }
};
