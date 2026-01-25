/**
 * Version Utility Functions
 * Handles version comparison and checking
 */

/**
 * Compare two semantic versions
 * Returns: 
 *  - positive number if version1 > version2
 *  - negative number if version1 < version2
 *  - 0 if equal
 */
export const compareVersions = (version1: string, version2: string): number => {
  const v1 = version1.split('.').map(Number);
  const v2 = version2.split('.').map(Number);

  for (let i = 0; i < Math.max(v1.length, v2.length); i++) {
    const v1Part = v1[i] || 0;
    const v2Part = v2[i] || 0;

    if (v1Part > v2Part) return 1;
    if (v1Part < v2Part) return -1;
  }

  return 0;
};

/**
 * Check if a newer version is available
 */
export const isNewerVersionAvailable = (currentVersion: string, latestVersion: string): boolean => {
  return compareVersions(latestVersion, currentVersion) > 0;
};

/**
 * Parse semantic version string
 */
export const parseVersion = (versionString: string): { major: number; minor: number; patch: number } => {
  const cleaned = versionString.replace(/^v/, '');
  const parts = cleaned.split('.');
  return {
    major: parseInt(parts[0] || '0', 10),
    minor: parseInt(parts[1] || '0', 10),
    patch: parseInt(parts[2] || '0', 10)
  };
};

/**
 * Get current app version
 */
export const getCurrentVersion = async (): Promise<string> => {
  try {
    const response = await fetch('/package.json');
    const packageJson = await response.json();
    return packageJson.version;
  } catch (error) {
    console.error('Failed to read package.json:', error);
    return '0.0.0';
  }
};
