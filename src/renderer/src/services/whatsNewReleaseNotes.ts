import packageJson from '../../../../package.json';
import changelogRaw from '../../../../CHANGELOG.md?raw';

export interface WhatsNewFeature {
  title: string;
  description: string;
}

export interface WhatsNewReleaseData {
  requestedVersion: string;
  renderedVersion: string | null;
  hasExactMatch: boolean;
  features: WhatsNewFeature[];
}

interface ParsedReleaseSection {
  heading: string;
  bullets: string[];
}

interface ParsedRelease {
  version: string;
  sections: ParsedReleaseSection[];
}

const FALLBACK_FEATURES: WhatsNewFeature[] = [
  {
    title: 'Release Notes Unavailable',
    description: 'No changelog entry was found yet for this build. Please check GitHub Releases for full update notes.',
  },
];

const normalizeVersion = (version: string): string => version.replace(/^v/i, '').trim();

const stripMarkdown = (value: string): string =>
  value
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .trim();

const splitBullet = (bullet: string, fallbackTitle: string): WhatsNewFeature => {
  const clean = stripMarkdown(bullet);
  const dashParts = clean.split(/\s+—\s+/);
  if (dashParts.length >= 2) {
    return {
      title: dashParts[0].trim(),
      description: dashParts.slice(1).join(' — ').trim(),
    };
  }

  const colonParts = clean.split(':');
  if (colonParts.length >= 2) {
    return {
      title: colonParts[0].trim(),
      description: colonParts.slice(1).join(':').trim(),
    };
  }

  return { title: fallbackTitle, description: clean };
};

const parseChangelogReleases = (raw: string): ParsedRelease[] => {
  const lines = raw.split(/\r?\n/);
  const releases: ParsedRelease[] = [];
  let currentRelease: ParsedRelease | null = null;
  let currentSection: ParsedReleaseSection | null = null;

  for (const line of lines) {
    const releaseMatch = line.match(/^##\s+\[([^\]]+)\]/);
    if (releaseMatch) {
      currentRelease = { version: normalizeVersion(releaseMatch[1]), sections: [] };
      releases.push(currentRelease);
      currentSection = null;
      continue;
    }

    if (!currentRelease) continue;

    const sectionMatch = line.match(/^###\s+(.+)/);
    if (sectionMatch) {
      currentSection = { heading: sectionMatch[1].trim(), bullets: [] };
      currentRelease.sections.push(currentSection);
      continue;
    }

    const bulletMatch = line.match(/^\s*-\s+(.+)/);
    if (bulletMatch) {
      if (!currentSection) {
        currentSection = { heading: 'Highlights', bullets: [] };
        currentRelease.sections.push(currentSection);
      }
      currentSection.bullets.push(bulletMatch[1].trim());
    }
  }

  return releases;
};

const toFeatures = (release: ParsedRelease | null): WhatsNewFeature[] => {
  if (!release) return FALLBACK_FEATURES;

  const features: WhatsNewFeature[] = [];
  for (const section of release.sections) {
    for (const bullet of section.bullets) {
      features.push(splitBullet(bullet, section.heading));
      if (features.length >= 12) return features;
    }
  }

  return features.length > 0 ? features : FALLBACK_FEATURES;
};

const parsedReleases = parseChangelogReleases(changelogRaw);

export const getWhatsNewReleaseData = (version: string = packageJson.version): WhatsNewReleaseData => {
  const normalizedRequested = normalizeVersion(version);
  const exact = parsedReleases.find((release) => release.version === normalizedRequested) ?? null;
  const fallback = parsedReleases[0] ?? null;
  const rendered = exact ?? fallback;

  return {
    requestedVersion: normalizedRequested,
    renderedVersion: rendered?.version ?? null,
    hasExactMatch: !!exact,
    features: toFeatures(rendered),
  };
};
