/**
 * DocumentationGeneratorEngine
 * In-memory / stub implementations to enable UI + IPC wiring and unit tests.
 * Replace with real content-generation logic (LLM-backed, static analyzers, etc.)
 * when integrating production services.
 */

import type {
  ProjectDocumentation,
  ProjectData,
  GitCommit,
  APIDocumentation,
  DocComment,
  FunctionReference,
  AssetDocumentation,
  ItemCatalog,
  QuestGuide,
  TutorialStep,
  Tutorial,
  InstallGuide,
  Wiki,
  WikiPage,
  Documentation,
} from '../shared/types';

export class DocumentationGeneratorEngine {
  // ---------------------------
  // Project documentation
  // ---------------------------
  async generateProjectDocs(projectPath: string): Promise<ProjectDocumentation> {
    const name = projectPath.split(/[\\/]/).pop() || 'project';

    // Generate core pieces using existing helper stubs
    const readme = await this.generateReadme({ name, version: '0.1.0', description: 'Auto-generated README' });
    const changelog = await this.generateChangelog([{ sha: 'init', author: 'auto', date: Date.now(), message: 'Initial generated changelog' }]);
    const installation = await this.generateInstallGuide({});
    const apiReference = await this.generateAPIDoc('// no code', 'typescript');
    const assetCatalog = await this.documentAssets(projectPath + '/assets');

    const troubleshooting = { entries: [{ problem: 'Missing textures', cause: 'Missing or invalid DDS files', solution: 'Ensure DDS files present in Data/textures', seeAlso: ['Asset Validator'] }], lastUpdated: Date.now() };
    const credits = { author: 'Auto Generator', contributors: [], specialThanks: [], toolsUsed: [], assets: [] };

    return { readme, changelog, installation, apiReference, assetCatalog, troubleshooting, credits } as ProjectDocumentation;
  }

  async generateReadme(projectData: ProjectData, template?: string): Promise<string> {
    const title = `# ${projectData.name} ${projectData.version ? `v${projectData.version}` : ''}`.trim();
    const desc = projectData.description ?? 'Project description';
    const authors = projectData.authors?.join(', ') ?? 'Unknown';
    const body = template ?? `\n## Description\n${desc}\n\n## Authors\n${authors}\n\n## Usage\nSee documentation.`;
    return `${title}\n\n${body}`;
  }

  async generateChangelog(commits: GitCommit[]): Promise<string> {
    const lines = commits.map(c => `- ${new Date(c.date).toISOString().split('T')[0]} — ${c.message} (${c.author})`);
    return `# Changelog\n\n${lines.join('\n')}`;
  }

  // ---------------------------
  // Code documentation
  // ---------------------------
  async generateAPIDoc(code: string, language: 'papyrus' | 'typescript'): Promise<APIDocumentation> {
    // Synthesize a basic API doc shape for UI/testing
    const functions = (code.match(/function\s+([A-Za-z0-9_]+)/g) || []).map((m, i) => ({
      name: `fn_${i}`,
      signature: `${m}()`,
      description: 'Auto-generated function doc',
      parameters: [],
      returnType: 'void',
      examples: [{ title: 'Example', code: `${m}();`, language }],
    }));

    const classes = [{ name: 'SampleClass', description: 'Auto-generated class', methods: functions as any, properties: [{ name: 'prop', type: 'string', description: 'Sample property' }] }];
    const properties = [{ name: 'globalVar', type: 'number', description: 'Global property' }];
    const events = [{ name: 'OnInit', description: 'Fired on init' }];

    return { functions: functions as any, classes, properties, events };
  }

  async extractDocComments(filePath: string): Promise<DocComment[]> {
    // Return a permissive stub so UI components can display extracted comments
    return [{ filePath, line: 1, content: '/* Example doc comment */', tags: { author: 'auto' } }];
  }

  async generateFunctionReference(scripts: string[]): Promise<FunctionReference> {
    const functions = scripts.map((s, i) => ({ name: `func_${i}`, signature: `${s}()` , description: `Reference for ${s}`}));
    const index: Record<string, number> = {};
    functions.forEach((f, idx) => index[f.name] = idx);
    return { functions, index };
  }

  // ---------------------------
  // Asset documentation
  // ---------------------------
  async documentAssets(assetFolder: string): Promise<AssetDocumentation> {
    const meshes = [{ path: `${assetFolder}/meshes/example.nif`, type: 'mesh', size: 34567, usedBy: ['Cell01'], description: 'Example mesh', tags: ['low-poly'] }];
    const textures = [{ path: `${assetFolder}/textures/example.dds`, type: 'texture', size: 12345, usedBy: ['example.nif'], description: 'Albedo map', tags: ['albedo','bc7'] }];
    const sounds = [{ path: `${assetFolder}/sounds/example.wav`, type: 'sound', size: 23456, usedBy: [], description: 'SFX sample', tags: ['fx'] }];
    const misc = [{ path: `${assetFolder}/misc/readme.txt`, type: 'text', size: 1234, usedBy: [], description: 'Aux file', tags: ['doc'] }];
    const totalSize = meshes.reduce((s, a) => s + a.size, 0) + textures.reduce((s, a) => s + a.size, 0) + sounds.reduce((s, a) => s + a.size, 0) + misc.reduce((s, a) => s + a.size, 0);
    const stats = { totalAssets: meshes.length + textures.length + sounds.length + misc.length, byType: { mesh: meshes.length, texture: textures.length, sound: sounds.length, misc: misc.length }, totalSize, largestAssets: [meshes[0], textures[0]] };
    return { meshes, textures, sounds, misc, statistics: stats };
  }

  async generateItemCatalog(esp: string): Promise<ItemCatalog> {
    return {
      weapons: [{ editorId: 'wpn_0001', name: 'Sample Sword', formId: '0x0001', type: 'weapon', value: 120, weight: 8, description: 'A test weapon', location: 'Blacksmith' }],
      armor: [{ editorId: 'arm_0001', name: 'Sample Armor', formId: '0x1001', type: 'armor', value: 250, weight: 12, description: 'A test armor', location: 'Armory' }],
      consumables: [{ editorId: 'cons_0001', name: 'Stimpak', formId: '0x2001', type: 'consumable', value: 10, weight: 0.1, description: 'Heals player', location: 'Vendor' }],
      misc: [{ editorId: 'misc_0001', name: 'Sample Token', formId: '0x3001', type: 'misc', value: 1, weight: 0.05, description: 'Quest token', location: 'Quest' }],
    };
  }

  async generateQuestGuide(quests: any[]): Promise<QuestGuide> {
    const entries = (quests || []).map((q: any, i: number) => ({
      name: q.name ?? `Quest ${i}`,
      type: q.type ?? 'side',
      stages: (q.steps || []).map((s: any, idx: number) => ({ index: idx + 1, description: String(s), objectives: [] } as StageEntry)),
      rewards: q.rewards || [],
      location: q.location || 'Unknown',
      requirements: q.requirements || [],
    } as QuestEntry));

    return { quests: entries };
  }

  // ---------------------------
  // Interactive guides
  // ---------------------------
  async createTutorial(topic: string, steps: TutorialStep[]): Promise<Tutorial> {
    const id = `tut_${Date.now()}`;
    const duration = Math.max(1, steps.reduce((s, st) => s + (st.estimatedTime || 3), 0));
    return {
      id,
      title: topic,
      description: `${topic} (auto-generated)`,
      category: 'beginner',
      difficulty: 1,
      duration,
      steps,
      prerequisites: [],
      tags: [topic.toLowerCase()],
    } as Tutorial;
  }

  async generateInstallGuide(modStructure: any): Promise<InstallGuide> {
    const requirements: Requirement[] = [ { name: 'Fallout 4', required: true }, { name: 'F4SE', version: 'latest', required: false } ];
    const steps: InstallStep[] = [ { number: 1, title: 'Unpack', description: 'Unpack the archive' }, { number: 2, title: 'Copy files', description: 'Copy to Data folder' } ];
    const troubleshooting: TroubleshootingEntry[] = [ { problem: 'Missing Data files', cause: 'Incorrect archive structure', solution: 'Ensure files are extracted into Data folder', seeAlso: ['Installation guide'] } ];
    const uninstall = ['Remove plugin from Data folder', 'Delete config files in My Games'];
    return { requirements, steps, troubleshooting, uninstall };
  }

  // ---------------------------
  // Wiki generation
  // ---------------------------
  async generateWiki(project: any): Promise<Wiki> {
    const id = (s: string) => `${s.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/(^-|-$)/g,'')}-${Date.now()}`;
    const pageId = id(project?.name || 'page');
    const page = {
      id: pageId,
      title: `${project?.name ?? 'Project'} - Overview`,
      slug: `/${(project?.name || 'project').toLowerCase()}/overview`,
      content: `# ${(project?.name ?? 'Project')}\nAuto-generated wiki overview.`,
      category: 'General',
      tags: ['overview','auto-generated'],
      author: 'DocumentationGenerator',
      created: Date.now(),
      updated: Date.now(),
      views: 0,
      relatedPages: [] as string[],
    } as WikiPage;

    const categories = [{ name: 'General', description: 'General pages', pages: [page.id], subcategories: [] }];
    const navigation: NavigationTree = { nodes: [{ label: 'Overview', page: page.id, children: [] }] };
    const searchIndex = { entries: [{ pageId: page.id, title: page.title, excerpt: 'Auto-generated overview', tags: page.tags }], version: 1 };
    const metadata: WikiMetadata = { title: `${project?.name ?? 'Project'} Wiki`, description: `Wiki for ${(project?.name ?? 'Project')}`, primaryColor: '#0ea5a4', version: '0.1.0' };

    return { pages: [page], categories, searchIndex, navigation, metadata };
  }

  async createWikiPage(title: string, content: string, category: string): Promise<WikiPage> {
    const makeId = (t: string) => `${t.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/(^-|-$)/g,'')}-${Date.now()}`;
    const id = makeId(title);
    const slug = `/${title.toLowerCase().replace(/[^a-z0-9]+/g,'-')}`;
    const now = Date.now();
    return { id, title, slug, content, category, tags: [], author: 'auto', created: now, updated: now, views: 0, relatedPages: [] } as WikiPage;
  }

  async linkWikiPages(pages: WikiPage[]): Promise<void> {
    // In a real implementation this would create bidirectional references and update search index/navigation.
    // For stubs, populate relatedPages with first N other pages
    for (let i = 0; i < pages.length; i++) {
      const p = pages[i];
      p.relatedPages = pages.filter(x => x.id !== p.id).slice(0,3).map(x => x.id);
    }
    return;
  }

  // ---------------------------
  // Export formats
  // ---------------------------
  async exportToMarkdown(doc: DocumentationUnion | Documentation): Promise<string> {
    return `# Exported Documentation\n\nGenerated at ${new Date().toISOString()}\n\n${JSON.stringify(doc, null, 2)}`;
  }

  async exportToHTML(doc: DocumentationUnion | Documentation, theme: string): Promise<string> {
    return `<html><head><title>Doc</title></head><body><pre>${JSON.stringify(doc, null, 2)}</pre></body></html>`;
  }

  async exportToPDF(doc: DocumentationUnion | Documentation): Promise<Buffer> {
    // Return empty PDF-like Buffer for tests
    return Buffer.from('%PDF-1.4\n%stub');
  }

  async exportToNexusFormat(doc: DocumentationUnion | Documentation): Promise<string> {
    return JSON.stringify({ nexus: true, doc });
  }
}

export const documentationGenerator = new DocumentationGeneratorEngine();
