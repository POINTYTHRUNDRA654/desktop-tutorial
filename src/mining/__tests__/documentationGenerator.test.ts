import { describe, it, expect } from 'vitest';
import { documentationGenerator } from '../documentationGenerator';

describe('DocumentationGeneratorEngine (stubs)', () => {
  it('generateReadme returns markdown string containing project name', async () => {
    const md = await documentationGenerator.generateReadme({ name: 'TestProj', version: '1.2.3', description: 'Desc' });
    expect(typeof md).toBe('string');
    expect(md).toContain('TestProj');
  });

  it('generateProjectDocs returns full ProjectDocumentation shape', async () => {
    const docs = await documentationGenerator.generateProjectDocs('C:/repos/testproj');
    expect(docs).toBeDefined();
    expect(typeof docs.readme).toBe('string');
    expect(typeof docs.changelog).toBe('string');
    expect(docs.installation).toBeDefined();
    expect(docs.assetCatalog).toBeDefined();
    expect(Array.isArray((docs.assetCatalog as any).meshes)).toBe(true);
    expect(docs.troubleshooting).toBeDefined();
  });

  it('generateWiki returns Wiki with pages, categories, navigation and metadata', async () => {
    const wiki = await documentationGenerator.generateWiki({ name: 'MyProj' });
    expect(wiki).toBeDefined();
    expect(Array.isArray(wiki.pages)).toBe(true);
    expect(Array.isArray(wiki.categories)).toBe(true);
    expect(wiki.searchIndex).toBeDefined();
    expect(wiki.navigation).toBeDefined();
    expect(wiki.metadata).toBeDefined();
    const p = wiki.pages[0];
    expect(p).toHaveProperty('id');
    expect(p).toHaveProperty('slug');
    expect(typeof p.content).toBe('string');
  });

  it('generateAPIDoc parses code stub and returns expanded APIDocumentation', async () => {
    const code = `function Foo() {}`;
    const api = await documentationGenerator.generateAPIDoc(code as any, 'typescript');
    expect(api).toBeDefined();
    expect(Array.isArray(api.functions)).toBe(true);
    expect(Array.isArray(api.classes)).toBe(true);
    expect(Array.isArray(api.properties)).toBe(true);
    expect(Array.isArray(api.events)).toBe(true);
  });

  it('exportToMarkdown returns a markdown string', async () => {
    const doc = await documentationGenerator.generateProjectDocs('x');
    const md = await documentationGenerator.exportToMarkdown(doc as any);
    expect(md).toContain('# Exported Documentation');
  });
});