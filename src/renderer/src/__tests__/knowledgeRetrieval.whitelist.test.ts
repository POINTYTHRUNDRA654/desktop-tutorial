import { beforeEach, describe, expect, it } from 'vitest';
import { buildRelevantKnowledgeVaultContext, getRelevantKnowledgeVaultItems } from '../knowledgeRetrieval';

describe('knowledge retrieval do-not-touch filtering', () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('mossy_knowledge_vault', JSON.stringify([
      { id: '1', title: 'Safe mod guide', content: 'Use xEdit carefully', source: 'doc' },
      { id: '2', title: 'Secret Mod Alpha', content: 'Protected internals', source: 'private' },
    ]));
  });

  it('omits do-not-touch items from relevant citations', () => {
    const items = getRelevantKnowledgeVaultItems('mod', { excludeTerms: ['Secret Mod Alpha'] });
    expect(items.some((i) => i.title.includes('Secret Mod Alpha'))).toBe(false);
  });

  it('omits do-not-touch items from context excerpts', () => {
    const context = buildRelevantKnowledgeVaultContext('mod', { excludeTerms: ['Secret Mod Alpha'] });
    expect(context).not.toContain('Secret Mod Alpha');
    expect(context).toContain('Safe mod guide');
  });

  it('surfaces built-in install wizard download guidance when relevant', () => {
    const items = getRelevantKnowledgeVaultItems('How do I use CKPE for PRP patching?', { maxItems: 6 });
    expect(items.some((item) => item.title.includes('CKPE'))).toBe(true);

    const context = buildRelevantKnowledgeVaultContext('How do I use CKPE for PRP patching?');
    expect(context).toContain('CKPE');
    expect(context).toContain('Creation Kit Platform Extended');
    expect(context).toContain('manual');
  });
});
