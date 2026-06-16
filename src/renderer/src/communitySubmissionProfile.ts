import { redactSensitiveText } from './utils/privacyRedaction';
import { buildGithubNewIssueUrl } from './communityLearningProfile';

export type CommunitySubmissionItem = {
  title: string;
  type: 'technique' | 'script' | 'note';
  content: string;
};

const STORAGE_KEY = 'mossy_community_submission_profile_v1';

export function loadCommunitySubmissionContributor(): { contributorName: string; contributorLink?: string } | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed.contributorName !== 'string') return null;
    return { contributorName: parsed.contributorName, contributorLink: parsed.contributorLink || undefined };
  } catch {
    return null;
  }
}

export function saveCommunitySubmissionContributor(contributorName: string, contributorLink?: string): void {
  window.localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({ contributorName: contributorName.trim(), contributorLink: (contributorLink || '').trim() || undefined })
  );
}

export function buildCommunitySubmissionIssueBody(params: {
  item: CommunitySubmissionItem;
  contributorName: string;
  contributorLink?: string;
}): string {
  const safeName = redactSensitiveText(params.contributorName);
  const safeLink = params.contributorLink ? redactSensitiveText(params.contributorLink) : '';
  const safeContent = redactSensitiveText(params.item.content);
  const fence = params.item.type === 'script' ? 'papyrus' : '';

  return [
    '## Contributor',
    `- Name: ${safeName || '(missing)'}`,
    safeLink ? `- Link: ${safeLink}` : '- Link: (not provided)',
    '',
    `## ${params.item.type === 'script' ? 'Script' : params.item.type === 'technique' ? 'Technique' : 'Note'}: ${redactSensitiveText(params.item.title)}`,
    '```' + fence,
    safeContent,
    '```',
    '',
    '## Consent',
    '- [x] I consent to share this publicly so it can be reviewed for inclusion in a future Mossy update.',
  ].join('\n');
}

export { buildGithubNewIssueUrl };
