import React, { useState } from 'react';
import { Share2, Image as ImageIcon, FileText, Upload, Globe, CheckCircle, Loader2 } from 'lucide-react';

interface ModMetadata {
  name: string;
  version: string;
  author: string;
  description: string;
  category: string;
  requirements: string[];
  tags: string[];
}

interface Screenshot {
  file: File | null;
  caption: string;
  category: 'main' | 'detail' | 'comparison';
}

export const ModDistribution: React.FC = () => {
  const [metadata, setMetadata] = useState<ModMetadata>({
    name: '',
    version: '1.0.0',
    author: '',
    description: '',
    category: 'Gameplay',
    requirements: ['Fallout4.esm'],
    tags: []
  });

  const [screenshots, setScreenshots] = useState<Screenshot[]>([]);
  const [changelog, setChangelog] = useState('');
  const [readme, setReadme] = useState('');
  const [platform, setPlatform] = useState<'nexus' | 'bethesda' | 'both'>('nexus');
  const [publishing, setPublishing] = useState(false);
  const [published, setPublished] = useState(false);

  const generateReadme = () => {
    const template = `# ${metadata.name}

**Version:** ${metadata.version}
**Author:** ${metadata.author}

## Description
${metadata.description}

## Requirements
${metadata.requirements.map(r => `- ${r}`).join('\n')}

## Installation
1. Download the mod
2. Extract to your Fallout 4 Data folder
3. Enable the plugin in your mod manager
4. Enjoy!

## Credits
Created by ${metadata.author}

## Permissions
Please ask before using assets from this mod.
`;

    setReadme(template);
    alert('README generated! You can edit it below.');
  };

  const generateChangelog = () => {
    const today = new Date().toISOString().split('T')[0];
    const template = `## ${metadata.version} - ${today}

### Added
- Initial release
- Core features implemented

### Changed
- N/A

### Fixed
- N/A
`;

    setChangelog(template);
    alert('Changelog generated! Add your specific changes.');
  };

  const addScreenshot = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const newScreenshots = Array.from(files).map(file => ({
      file,
      caption: '',
      category: 'detail' as const
    }));

    setScreenshots([...screenshots, ...newScreenshots]);
  };

  const removeScreenshot = (index: number) => {
    setScreenshots(screenshots.filter((_, i) => i !== index));
  };

  const publish = async () => {
    // Validation
    if (!metadata.name || !metadata.author || !metadata.description) {
      alert('Please fill in all required fields');
      return;
    }

    if (screenshots.length === 0) {
      const confirm = window.confirm('No screenshots added. Continue anyway?');
      if (!confirm) return;
    }

    setPublishing(true);

    try {
      const formData = new FormData();
      formData.append('metadata', JSON.stringify(metadata));
      formData.append('readme', readme);
      formData.append('changelog', changelog);
      formData.append('platform', platform);

      screenshots.forEach((ss, idx) => {
        if (ss.file) {
          formData.append(`screenshot_${idx}`, ss.file);
          formData.append(`caption_${idx}`, ss.caption);
          formData.append(`category_${idx}`, ss.category);
        }
      });

      const response = await fetch('http://localhost:21337/publish/upload', {
        method: 'POST',
        body: formData
      });

      if (response.ok) {
        setPublished(true);
        alert('Mod published successfully!');
      } else {
        throw new Error('Upload failed');
      }
    } catch (error) {
      alert(`Publication failed: Could not connect to the publishing bridge on port 21337. Ensure your server is active.`);
    } finally {
      setPublishing(false);
    }
  };

  return (
    <div className="h-full bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 overflow-hidden flex flex-col">
      {/* Header */}
      <div className="p-6 border-b border-slate-700 bg-slate-800/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Share2 className="w-8 h-8 text-orange-400" />
            <div>
              <h1 className="text-2xl font-bold text-white">Mod Distribution Hub</h1>
              <p className="text-sm text-slate-400">One-click publishing to Nexus & Bethesda.net</p>
            </div>
          </div>

          {published && (
            <div className="flex items-center gap-2 bg-green-900/30 border border-green-500 rounded px-4 py-2">
              <CheckCircle className="w-5 h-5 text-green-400" />
              <span className="text-green-300 font-bold">Published!</span>
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Metadata */}
          <div className="bg-slate-900 border border-slate-700 rounded-xl p-6">
            <h2 className="text-lg font-bold text-white mb-4">Mod Information</h2>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-slate-400 mb-1">Mod Name *</label>
                <input
                  type="text"
                  value={metadata.name}
                  onChange={(e) => setMetadata({ ...metadata, name: e.target.value })}
                  placeholder="My Awesome Mod"
                  className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 text-slate-200 placeholder-slate-500 focus:border-orange-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-sm text-slate-400 mb-1">Version</label>
                <input
                  type="text"
                  value={metadata.version}
                  onChange={(e) => setMetadata({ ...metadata, version: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 text-slate-200"
                />
              </div>

              <div>
                <label className="block text-sm text-slate-400 mb-1">Author *</label>
                <input
                  type="text"
                  value={metadata.author}
                  onChange={(e) => setMetadata({ ...metadata, author: e.target.value })}
                  placeholder="Your Name"
                  className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 text-slate-200 placeholder-slate-500"
                />
              </div>

              <div>
                <label className="block text-sm text-slate-400 mb-1">Category</label>
                <select
                  value={metadata.category}
                  onChange={(e) => setMetadata({ ...metadata, category: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 text-slate-200"
                >
                  <option>Gameplay</option>
                  <option>Weapons</option>
                  <option>Armor</option>
                  <option>Quests</option>
                  <option>Graphics</option>
                  <option>Overhaul</option>
                  <option>Utilities</option>
                </select>
              </div>

              <div className="col-span-2">
                <label className="block text-sm text-slate-400 mb-1">Description *</label>
                <textarea
                  value={metadata.description}
                  onChange={(e) => setMetadata({ ...metadata, description: e.target.value })}
                  placeholder="Describe your mod..."
                  rows={4}
                  className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 text-slate-200 placeholder-slate-500 resize-none focus:border-orange-500 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Screenshots */}
          <div className="bg-slate-900 border border-slate-700 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-white">Screenshots</h2>
              <label className="px-4 py-2 bg-orange-600 hover:bg-orange-500 text-white font-bold rounded cursor-pointer flex items-center gap-2 transition-colors">
                <ImageIcon className="w-4 h-4" />
                Add Images
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={addScreenshot}
                  className="hidden"
                />
              </label>
            </div>

            {screenshots.length === 0 ? (
              <div className="text-center py-8 text-slate-500">
                No screenshots added yet
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-4">
                {screenshots.map((ss, idx) => (
                  <div key={idx} className="bg-slate-950 border border-slate-700 rounded-lg p-2">
                    <div className="aspect-video bg-slate-800 rounded mb-2 flex items-center justify-center">
                      {ss.file ? (
                        <img
                          src={URL.createObjectURL(ss.file)}
                          alt=""
                          className="w-full h-full object-cover rounded"
                        />
                      ) : (
                        <ImageIcon className="w-8 h-8 text-slate-600" />
                      )}
                    </div>
                    <input
                      type="text"
                      value={ss.caption}
                      onChange={(e) => {
                        const updated = [...screenshots];
                        updated[idx].caption = e.target.value;
                        setScreenshots(updated);
                      }}
                      placeholder="Caption..."
                      className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-slate-200 placeholder-slate-500 mb-2"
                    />
                    <button
                      onClick={() => removeScreenshot(idx)}
                      className="w-full px-2 py-1 bg-red-900 hover:bg-red-800 text-white text-xs rounded transition-colors"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* README & Changelog */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-slate-900 border border-slate-700 rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-white">README</h3>
                <button
                  onClick={generateReadme}
                  className="px-3 py-1 bg-blue-900 hover:bg-blue-800 text-white text-sm rounded transition-colors"
                >
                  Auto-Generate
                </button>
              </div>
              <textarea
                value={readme}
                onChange={(e) => setReadme(e.target.value)}
                placeholder="README content..."
                rows={10}
                className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 text-xs text-slate-200 placeholder-slate-500 font-mono resize-none"
              />
            </div>

            <div className="bg-slate-900 border border-slate-700 rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-white">Changelog</h3>
                <button
                  onClick={generateChangelog}
                  className="px-3 py-1 bg-blue-900 hover:bg-blue-800 text-white text-sm rounded transition-colors"
                >
                  Auto-Generate
                </button>
              </div>
              <textarea
                value={changelog}
                onChange={(e) => setChangelog(e.target.value)}
                placeholder="Changelog..."
                rows={10}
                className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 text-xs text-slate-200 placeholder-slate-500 font-mono resize-none"
              />
            </div>
          </div>

          {/* Platform Selection */}
          <div className="bg-slate-900 border border-slate-700 rounded-xl p-6">
            <h3 className="font-bold text-white mb-4">Publish To</h3>
            <div className="grid grid-cols-3 gap-3">
              <button
                onClick={() => setPlatform('nexus')}
                className={`p-4 border-2 rounded-lg transition-all ${
                  platform === 'nexus' 
                    ? 'border-orange-500 bg-orange-900/30' 
                    : 'border-slate-700 hover:border-slate-600'
                }`}
              >
                <Globe className="w-8 h-8 text-orange-400 mx-auto mb-2" />
                <div className="font-bold text-white text-sm">Nexus Mods</div>
              </button>

              <button
                onClick={() => setPlatform('bethesda')}
                className={`p-4 border-2 rounded-lg transition-all ${
                  platform === 'bethesda' 
                    ? 'border-blue-500 bg-blue-900/30' 
                    : 'border-slate-700 hover:border-slate-600'
                }`}
              >
                <Share2 className="w-8 h-8 text-blue-400 mx-auto mb-2" />
                <div className="font-bold text-white text-sm">Bethesda.net</div>
              </button>

              <button
                onClick={() => setPlatform('both')}
                className={`p-4 border-2 rounded-lg transition-all ${
                  platform === 'both' 
                    ? 'border-green-500 bg-green-900/30' 
                    : 'border-slate-700 hover:border-slate-600'
                }`}
              >
                <CheckCircle className="w-8 h-8 text-green-400 mx-auto mb-2" />
                <div className="font-bold text-white text-sm">Both Platforms</div>
              </button>
            </div>
          </div>

          {/* Publish Button */}
          <button
            onClick={publish}
            disabled={publishing || !metadata.name || !metadata.author}
            className="w-full px-6 py-4 bg-orange-600 hover:bg-orange-500 disabled:opacity-50 text-white font-bold text-lg rounded-lg transition-colors flex items-center justify-center gap-3"
          >
            {publishing ? (
              <>
                <Loader2 className="w-6 h-6 animate-spin" />
                Publishing...
              </>
            ) : (
              <>
                <Upload className="w-6 h-6" />
                Publish Mod
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
