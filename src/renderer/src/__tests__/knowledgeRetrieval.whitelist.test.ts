import { beforeEach, describe, expect, it } from 'vitest';
import { buildRelevantKnowledgeVaultContext, getRelevantKnowledgeVaultItems } from '../knowledgeRetrieval';

describe('knowledge retrieval whitelist filtering', () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('mossy_knowledge_vault', JSON.stringify([
      { id: '1', title: 'Safe mod guide', content: 'Use xEdit carefully', source: 'doc' },
      { id: '2', title: 'Secret Mod Alpha', content: 'Protected internals', source: 'private' },
    ]));
  });

  it('omits whitelisted items from relevant citations', () => {
    const items = getRelevantKnowledgeVaultItems('mod', { whitelist: ['Secret Mod Alpha'] });
    expect(items.some((i) => i.title.includes('Secret Mod Alpha'))).toBe(false);
  });

  it('omits whitelisted items from context excerpts', () => {
    const context = buildRelevantKnowledgeVaultContext('mod', { whitelist: ['Secret Mod Alpha'] });
    expect(context).not.toContain('Secret Mod Alpha');
    expect(context).toContain('Safe mod guide');
  });
});
