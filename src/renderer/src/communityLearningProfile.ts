import { redactSensitiveText } from './utils/privacyRedaction';

export type CommunityLearningProfileV1 = {
  version: 1;
  contributorName: string;
  contributorLink?: string;
  goals: string[];
  notes?: string;
  createdAt: string;
  updatedAt: string;
};

const STORAGE_KEY = 'mossy_community_learning_profile_v1';

export function loadCommunityLearningProfile(): CommunityLearningProfileV1 | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CommunityLearningProfileV1;
    if (!parsed || parsed.version !== 1) return null;
    if (!Array.isArray(parsed.goals)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function saveCommunityLearningProfile(
  next: Omit<CommunityLearningProfileV1, 'createdAt' | 'updatedAt'> &
    Partial<Pick<CommunityLearningProfileV1, 'createdAt' | 'updatedAt'>>
): CommunityLearningProfileV1 {
  const nowIso = new Date().toISOString();
  const existing = loadCommunityLearningProfile();
  const profile: CommunityLearningProfileV1 = {
    version: 1,
    contributorName: (next.contributorName || '').trim(),
    contributorLink: (next.contributorLink || '').trim() || undefined,
    goals: (next.goals || [])
      .map((g) => (g || '').trim())
      .filter(Boolean),
    notes: (next.notes || '').trim() || undefined,
    createdAt: existing?.createdAt || next.createdAt || nowIso,
    updatedAt: nowIso,
  };

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
  return profile;
}

export function redactForPublicSharing(input: string): string {
  return redactSensitiveText(String(input ?? ''));
}

export function buildCommunityIssueBody(profile: CommunityLearningProfileV1): string {
  const safeName = redactForPublicSharing(profile.contributorName);
  const safeLink = profile.contributorLink
    ? redactForPublicSharing(profile.contributorLink)
    : '';

  const goals =
    profile.goals
      .map((g) => `- ${redactForPublicSharing(g)}`)
      .join('\n') || '- (none provided)';
  const notes = profile.notes ? redactForPublicSharing(profile.notes) : '';

  const payload = {
    schema: 'mossy-community-learning/v1',
    contributor: {
      name: safeName,
      link: safeLink || undefined,
    },
    learning: {
      goals: profile.goals.map((g) => redactForPublicSharing(g)),
      notes: notes || undefined,
    },
    timestamps: {
      createdAt: profile.createdAt,
      updatedAt: profile.updatedAt,
    },
  };

  return [
    '## Contributor',
    `- Name: ${safeName || '(missing)'}`,
    safeLink ? `- Link: ${safeLink}` : '- Link: (not provided)',
    '',
    '## What Mossy learned',
    goals,
    notes ? `\n**Notes:**\n${notes}` : '',
    '',
    '## Consent',
    '- [x] I consent to share this publicly in the Mossy tutorial dataset.',
    '',
    '## Machine-readable payload',
    '```json',
    JSON.stringify(payload, null, 2),
    '```',
  ]
    .filter(Boolean)
    .join('\n');
}

export function buildGithubNewIssueUrl(params: {
  repo: string; // owner/repo
  title: string;
  body: string;
  labels?: string[];
}): string {
  const base = `https://github.com/${params.repo}/issues/new`;
  const query = new URLSearchParams();
  query.set('title', params.title);
  query.set('body', params.body);
  if (params.labels && params.labels.length > 0) {
    query.set('labels', params.labels.join(','));
  }
  return `${base}?${query.toString()}`;
}

export function getCommunityLearningContextForModel(): string {
  const profile = loadCommunityLearningProfile();
  if (!profile) return '';

  const goals = profile.goals.map((g) => `- ${g}`).join('\n');
  if (!goals) return '';

  // Do not include contributor identity in model context.
  return ['**USER MODDING GOALS (taught by user):**', goals].join('\n');
}
