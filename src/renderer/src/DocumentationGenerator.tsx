import React, { useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { FileText, File, Printer, Copy, Download, Image as ImageIcon, Check } from 'lucide-react';
import { readmeTemplate, readmeVariables, TEMPLATES } from '../../shared/templates';
import type { Template } from '../../shared/types';

const defaultTemplate = readmeTemplate as Template;

function renderTemplateContent(template: Template, vars: Record<string, any> = {}) {
  let content = template.content || '';
  const defs = (template.variables || []) as any[];

  for (const def of defs) {
    const name = def.name;
    let val = vars[name];
    if (val === undefined || val === null) val = def.default ?? '';

    let formatted = '';
    if (Array.isArray(val)) {
      if (name.toLowerCase().includes('installation') || name.toLowerCase().includes('steps')) {
        formatted = val.map((s: any, i: number) => `${i + 1}. ${s}`).join('\n');
      } else {
        formatted = val.map((s: any) => `- ${s}`).join('\n');
      }
    } else {
      formatted = String(val);
    }

    const re = new RegExp('{{\\s*' + name + '\\s*}}', 'g');
    content = content.replace(re, formatted);
  }

  // Remove any remaining unreplaced tags
  content = content.replace(/{{[^}]+}}/g, '');
  return content;
}

export const DocumentationGenerator: React.FC = () => {
  const [selectedDocs, setSelectedDocs] = useState<Record<string, boolean>>({
    readme: true,
    changelog: true,
    wiki: false,
    api: false,
    assets: false,
  });

  const [selectedTemplateId, setSelectedTemplateId] = useState<string>(defaultTemplate.id);
  const [templateVars, setTemplateVars] = useState<Record<string, any>>({ ...readmeVariables });
  const [autoGen, setAutoGen] = useState<boolean>(false);
  const [toc, setToc] = useState<boolean>(true);
  const [images, setImages] = useState<boolean>(true);
  const [links, setLinks] = useState<boolean>(true);

  const [previewContent, setPreviewContent] = useState<string>('');
  const [generatedDocs, setGeneratedDocs] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  const templates = TEMPLATES as Template[];
  const activeTemplate = templates.find((t) => t.id === selectedTemplateId) || defaultTemplate;

  useEffect(() => {
    // live-preview from template when not using AI auto-gen
    if (!autoGen) {
      const md = renderTemplateContent(activeTemplate, templateVars);
      setPreviewContent(mdWithExtras(md));
    }
  }, [templateVars, selectedTemplateId, toc, images, links, autoGen]);

  function mdWithExtras(md: string) {
    let out = md;
    if (toc) out = `<!-- TOC -->\n\n${out}`;
    if (images) out = out.replace(/## Features\n/, '## Features\n\n![screenshot](screenshot.png)\n');
    if (links) out += `\n\n[Support](#) · [Homepage](#)`;
    return out;
  }

  const handleToggleDoc = (key: string) => {
    setSelectedDocs((s) => ({ ...s, [key]: !s[key] }));
  };

  const handleVarChange = (name: string, value: any) => {
    setTemplateVars((t) => ({ ...t, [name]: value }));
  };

  const downloadFile = (filename: string, contents: string, mime = 'text/plain') => {
    const blob = new Blob([contents], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(previewContent);
      alert('Copied to clipboard');
    } catch (err) {
      alert('Copy failed');
    }
  };

  const handleExportHTML = () => {
    const html = `<!doctype html><html><head><meta charset="utf-8"><title>Export</title><meta name=viewport content='width=device-width,initial-scale=1'></head><body><pre style="white-space:pre-wrap;font-family:ui-monospace,monospace;">${escapeHtml(
      previewContent
    )}</pre></body></html>`;
    downloadFile('documentation.html', html, 'text/html');
  };

  const handleExportMarkdown = () => {
    downloadFile('DOCUMENTATION.md', previewContent, 'text/markdown');
  };

  const handleExportPDF = () => {
    // Print the preview (simple PDF export via print)
    window.print();
  };

  function escapeHtml(s: string) {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  const handleGenerate = async () => {
    setLoading(true);
    const next: Record<string, string> = { ...generatedDocs };

    // README
    if (selectedDocs.readme) {
      let md = '';

      if (autoGen && (window as any).electron?.api?.aiGenerateDocumentation) {
        try {
          const req = { type: 'readme', payload: { templateId: selectedTemplateId, variables: templateVars, options: { toc, images, links } } };
          const res = await (window as any).electron.api.aiGenerateDocumentation(req);
          md = res?.documentation?.content ?? '';
        } catch (err) {
          console.warn('AI generate failed, falling back to template', err);
          md = renderTemplateContent(activeTemplate, templateVars);
        }
      } else if ((window as any).electron?.api?.modPackagingGenerateReadme) {
        try {
          const projectData = {
            name: templateVars.MOD_NAME || 'My Mod',
            version: templateVars.MOD_VERSION || '0.1.0',
            description: templateVars.DESCRIPTION || '',
            authors: [templateVars.AUTHOR_NAME || ''],
          };
          md = await (window as any).electron.api.modPackagingGenerateReadme(projectData, selectedTemplateId || 'default');
        } catch (err) {
          md = renderTemplateContent(activeTemplate, templateVars);
        }
      } else {
        md = renderTemplateContent(activeTemplate, templateVars);
      }

      next.readme = mdWithExtras(md);
    }

    // Changelog
    if (selectedDocs.changelog) {
      if (autoGen && (window as any).electron?.api?.aiGenerateDocumentation) {
        try {
          const res = await (window as any).electron.api.aiGenerateDocumentation({ type: 'changelog', payload: {} });
          next.changelog = res?.documentation?.content ?? `# Changelog\n\n- ${templateVars.MOD_VERSION || '1.0.0'} - Initial release`;
        } catch (err) {
          next.changelog = `# Changelog\n\n- ${templateVars.MOD_VERSION || '1.0.0'} - Initial release`;
        }
      } else {
        next.changelog = `# Changelog\n\n## ${templateVars.MOD_VERSION || '1.0.0'} - ${new Date().toISOString().slice(0, 10)}\n- Initial generated changelog`;
      }
    }

    // Wiki / API / Assets (simple stubs)
    if (selectedDocs.wiki) next.wiki = `# Wiki\n\nAuto-generated wiki page for ${templateVars.MOD_NAME || 'My Mod'}`;
    if (selectedDocs.api) next.api = `# API Reference\n\nNo API detected in project (stub)`;
    if (selectedDocs.assets) next.assets = `# Asset Catalog\n\n- No assets discovered (stub)`;

    setGeneratedDocs(next);

    // Set preview to the first selected doc (priority: README, Changelog, Wiki, API, Assets)
    const order = ['readme', 'changelog', 'wiki', 'api', 'assets'];
    const first = order.find((k) => selectedDocs[k]);
    if (first && next[first]) setPreviewContent(next[first]);

    setLoading(false);
  };

  const selectedPreview = Object.entries(selectedDocs).find(([, v]) => v)?.[0] || 'readme';

  return (
    <div className="documentation-generator" data-testid="documentation-generator" style={{ display: 'flex', gap: 12 }}>
      <div className="left-panel" style={{ width: 300 }}>
        <div className="panel-header">
          <h3>Documentation Generator</h3>
          <div className="legend">Templates · AI · Export</div>
        </div>

        <div className="prop-card">
          <h4>Document Types</h4>
          <label style={{ display: 'block', margin: '8px 0' }}><input type="checkbox" checked={selectedDocs.readme} onChange={() => handleToggleDoc('readme')} /> <strong>README</strong></label>
          <label style={{ display: 'block', margin: '8px 0' }}><input type="checkbox" checked={selectedDocs.changelog} onChange={() => handleToggleDoc('changelog')} /> <strong>CHANGELOG</strong></label>
          <label style={{ display: 'block', margin: '8px 0' }}><input type="checkbox" checked={selectedDocs.wiki} onChange={() => handleToggleDoc('wiki')} /> Wiki</label>
          <label style={{ display: 'block', margin: '8px 0' }}><input type="checkbox" checked={selectedDocs.api} onChange={() => handleToggleDoc('api')} /> API Reference</label>
          <label style={{ display: 'block', margin: '8px 0' }}><input type="checkbox" checked={selectedDocs.assets} onChange={() => handleToggleDoc('assets')} /> Asset Catalog</label>
        </div>

        <div className="prop-card">
          <h4>Template</h4>
          <select className="form-input" value={selectedTemplateId} onChange={(e) => setSelectedTemplateId(e.target.value)}>
            {templates.map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
            <option value="nexus">Nexus Format</option>
            <option value="github">GitHub</option>
          </select>

          <div style={{ marginTop: 8 }}>
            <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>Auto Gen (AI)</span>
              <input type="checkbox" checked={autoGen} onChange={(e) => setAutoGen(e.target.checked)} />
            </label>
            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              <label><input type="checkbox" checked={toc} onChange={(e) => setToc(e.target.checked)} /> TOC</label>
              <label><input type="checkbox" checked={images} onChange={(e) => setImages(e.target.checked)} /> Images</label>
              <label><input type="checkbox" checked={links} onChange={(e) => setLinks(e.target.checked)} /> Links</label>
            </div>
          </div>

          <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
            <button className="btn-primary" onClick={handleGenerate} disabled={loading}>{loading ? 'Generating...' : 'Generate'}</button>
            <button className="btn-ghost" onClick={() => { setPreviewContent(renderTemplateContent(activeTemplate, templateVars)); }}>Preview</button>
          </div>
        </div>

        <div className="prop-card">
          <h4>Export</h4>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn-ghost" onClick={handleExportMarkdown}><FileText size={14} /> Markdown</button>
            <button className="btn-ghost" onClick={handleExportHTML}><File size={14} /> HTML</button>
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <button className="btn-ghost" onClick={handleExportPDF}><Printer size={14} /> PDF</button>
            <button className="btn-ghost" onClick={handleCopy}><Copy size={14} /> Copy</button>
          </div>
        </div>
      </div>

      <div className="center-panel" style={{ flex: 1, minWidth: 560 }}>
        <div className="center-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontWeight: 700 }}>{selectedPreview?.toUpperCase()}</div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn-ghost" title="Markdown"><FileText size={14} /></button>
            <button className="btn-ghost" title="HTML"><File size={14} /></button>
            <button className="btn-ghost" title="Print" onClick={handleExportPDF}><Printer size={14} /></button>
            <button className="btn-ghost" title="Copy" onClick={handleCopy}><Copy size={14} /></button>
          </div>
        </div>

        <div style={{ marginTop: 8, background: 'var(--panel)', padding: 12, borderRadius: 8, minHeight: 360 }}>
          {previewContent ? (
            <div style={{ color: '#e6eef6' }}>
              <ReactMarkdown className="prose prose-invert prose-sm max-w-none whitespace-pre-wrap">{previewContent}</ReactMarkdown>
            </div>
          ) : (
            <div className="empty-note">No preview available — generate or edit template variables.</div>
          )}
        </div>
      </div>

      <div className="right-panel" style={{ width: 340 }}>
        <div className="prop-card">
          <h4>Template Variables</h4>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <div>
              <label className="text-xs text-slate-400">Mod Name</label>
              <input className="form-input" value={templateVars.MOD_NAME || ''} onChange={(e) => handleVarChange('MOD_NAME', e.target.value)} />
            </div>
            <div>
              <label className="text-xs text-slate-400">Version</label>
              <input className="form-input" value={templateVars.MOD_VERSION || ''} onChange={(e) => handleVarChange('MOD_VERSION', e.target.value)} />
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <label className="text-xs text-slate-400">Author</label>
              <input className="form-input" value={templateVars.AUTHOR_NAME || ''} onChange={(e) => handleVarChange('AUTHOR_NAME', e.target.value)} />
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <label className="text-xs text-slate-400">Description</label>
              <input className="form-input" value={templateVars.DESCRIPTION || ''} onChange={(e) => handleVarChange('DESCRIPTION', e.target.value)} />
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <label className="text-xs text-slate-400">Features (one per line)</label>
              <textarea className="form-input" rows={4} value={Array.isArray(templateVars.FEATURES) ? (templateVars.FEATURES as string[]).join('\n') : String(templateVars.FEATURES || '')} onChange={(e) => handleVarChange('FEATURES', e.target.value.split('\n').map(s => s.trim()).filter(Boolean))} />
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <label className="text-xs text-slate-400">Installation Steps (one per line)</label>
              <textarea className="form-input" rows={3} value={Array.isArray(templateVars.INSTALLATION_STEPS) ? (templateVars.INSTALLATION_STEPS as string[]).join('\n') : String(templateVars.INSTALLATION_STEPS || '')} onChange={(e) => handleVarChange('INSTALLATION_STEPS', e.target.value.split('\n').map(s => s.trim()).filter(Boolean))} />
            </div>
            <div style={{ gridColumn: '1 / -1' }}>
              <label className="text-xs text-slate-400">Credits (one per line)</label>
              <textarea className="form-input" rows={2} value={Array.isArray(templateVars.CREDITS) ? (templateVars.CREDITS as string[]).join('\n') : String(templateVars.CREDITS || '')} onChange={(e) => handleVarChange('CREDITS', e.target.value.split('\n').map(s => s.trim()).filter(Boolean))} />
            </div>
          </div>

          <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
            <button className="btn-primary" onClick={() => { const md = renderTemplateContent(activeTemplate, templateVars); setPreviewContent(mdWithExtras(md)); }}><Check size={14} /> Apply</button>
            <button className="btn-ghost" onClick={() => setTemplateVars({ ...readmeVariables })}>Reset</button>
          </div>
        </div>

        <div className="prop-card">
          <h4>Quick Actions</h4>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn-ghost" onClick={() => { navigator.clipboard.writeText(renderTemplateContent(activeTemplate, templateVars)); }}>Copy Template</button>
            <button className="btn-ghost" onClick={() => { setTemplateVars({ ...templateVars, FEATURES: [...(templateVars.FEATURES || []), 'New feature'] }); }}>Add Feature</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DocumentationGenerator;
