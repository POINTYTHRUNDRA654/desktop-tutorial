import React, { useState, useEffect, useRef } from 'react';
import { Search, X, Command, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface SearchItem {
  id: string;
  label: string;
  path: string;
  category: string;
  description?: string;
}

interface GlobalSearchProps {
  onSearch?: (query: string) => void;
  placeholder?: string;
}

// Search index of all available modules and features
const searchIndex: SearchItem[] = [
  // Core Features
  { id: 'home', label: 'Mossy.Space', path: '/', category: 'Home', description: 'Main dashboard and overview' },
  { id: 'chat', label: 'AI Chat', path: '/chat', category: 'Core', description: 'Chat with Mossy AI assistant' },
  { id: 'projects', label: 'Mod Projects', path: '/project', category: 'Projects', description: 'Manage your Fallout 4 mod projects' },

  // Learning & Reference
  { id: 'reference', label: 'Quick Reference', path: '/reference', category: 'Learning', description: 'Quick reference guides and documentation' },
  { id: 'knowledge', label: 'Knowledge Search', path: '/knowledge', category: 'Learning', description: 'Search through modding knowledge base' },
  { id: 'install-wizard', label: 'Install Wizard', path: '/wizards', category: 'Setup', description: 'Installation and setup wizard' },
  { id: 'platforms', label: 'Platforms', path: '/wizards', category: 'Learning', description: 'Platform-specific guides and tools' },
  { id: 'crash-triage', label: 'Crash Triage', path: '/crash-triage', category: 'Debugging', description: 'Diagnose and fix game crashes' },
  { id: 'packaging', label: 'Packaging & Release', path: '/packaging-release', category: 'Publishing', description: 'Package and release your mods' },
  { id: 'quest-dialogue', label: 'CK Quest & Dialogue', path: '/ck-quest-dialogue', category: 'Content', description: 'Creation Kit quest and dialogue guides' },
  { id: 'animation-guide', label: 'Animation Guide', path: '/animation-guide', category: 'Animation', description: 'Animation creation and editing guides' },
  { id: 'skeleton-reference', label: 'Skeleton Reference', path: '/skeleton-reference', category: 'Animation', description: 'Reference for skeleton and rigging' },
  { id: 'rigging-mistakes', label: 'Rigging Mistakes', path: '/rigging-mistakes', category: 'Animation', description: 'Common rigging mistakes and fixes' },
  { id: 'quest-authoring', label: 'Quest Mod Authoring', path: '/quest-authoring', category: 'Content', description: 'Create and author quest mods' },
  { id: 'precombine-prp', label: 'Precombine & PRP Guide', path: '/precombine-prp', category: 'Optimization', description: 'LOD and precombine optimization guides' },
  { id: 'prp-patch-builder', label: 'PRP Patch Builder', path: '/wizards', category: 'Tools', description: 'Build PRP patches for optimization' },
  { id: 'leveled-list-injection', label: 'Leveled List Injection', path: '/leveled-list-injection', category: 'Content', description: 'Inject items into leveled lists' },
  { id: 'lorekeeper', label: 'The Lorekeeper', path: '/lore', category: 'Reference', description: 'Comprehensive Fallout 4 lore and references' },

  // Building Tools
  { id: 'tools', label: 'Tools', path: '/tools', category: 'Tools', description: 'General tools and utilities' },
  { id: 'cosmos-workflow', label: 'Cosmos Workflow', path: '/tools/cosmos', category: 'Tools', description: 'Cosmos Transfer2.5 workflow hub' },
  { id: 'devtools', label: 'Devtools', path: '/devtools', category: 'Tools', description: 'Script generation and analysis tools' },
  { id: 'template-generator', label: 'Template Generator', path: '/devtools', category: 'Tools', description: 'Generate templates for mods' },
  { id: 'script-analyzer', label: 'Script Analyzer', path: '/devtools', category: 'Tools', description: 'Analyze Papyrus scripts' },
  { id: 'assembler', label: 'The Assembler', path: '/assembler', category: 'Tools', description: 'Create FOMOD packages' },
  { id: 'workshop', label: 'The Workshop', path: '/workshop', category: 'Tools', description: 'Development workshop and tools' },
  { id: 'blueprint', label: 'The Blueprint', path: '/blueprint', category: 'Tools', description: 'Blueprint and planning tools' },

  // Enhancement Tools
  { id: 'rigging-checklist', label: 'Rigging Checklist', path: '/rigging-checklist', category: 'Animation', description: 'Checklist for proper rigging' },
  { id: 'export-settings', label: 'Export Settings Helper', path: '/export-settings', category: 'Tools', description: 'Helper for export settings' },
  { id: 'animation-validator', label: 'Animation Validator', path: '/animation-validator', category: 'Animation', description: 'Validate animation files' },
  { id: 'precombine-checker', label: 'Precombine Checker', path: '/precombine-checker', category: 'Optimization', description: 'Check precombine setup' },

  // Quality Assurance
  { id: 'auditor', label: 'The Auditor', path: '/auditor', category: 'Quality', description: 'Asset analysis and validation' },
  { id: 'scribe', label: 'The Scribe', path: '/scribe', category: 'Tools', description: 'Code editor and scripting' },
  { id: 'monitor', label: 'System Monitor', path: '/monitor', category: 'System', description: 'Monitor system performance' },

  // Execution & Collaboration
  { id: 'orchestrator', label: 'The Orchestrator', path: '/orchestrator', category: 'Workflow', description: 'Workflow orchestration' },
  { id: 'workflow-runner', label: 'Workflow Runner', path: '/workflow-runner', category: 'Workflow', description: 'Run automated workflows' },
  { id: 'holodeck', label: 'The Holodeck', path: '/holo', category: 'Testing', description: 'Testing and simulation environment' },
  { id: 'vault', label: 'The Vault', path: '/vault', category: 'Assets', description: 'Asset management and storage' },
  { id: 'memory-vault', label: 'Memory Vault', path: '/memory-vault', category: 'AI', description: 'AI memory and knowledge storage' },
  { id: 'neural-link', label: 'Neural Link', path: '/neural-link', category: 'Integration', description: 'Tool integration and monitoring' },
  { id: 'workflow-recorder', label: 'Workflow Recorder', path: '/dev/workflow-recorder', category: 'Development', description: 'Record and replay workflows' },
  { id: 'plugin-manager', label: 'Plugin Manager', path: '/dev/plugin-manager', category: 'Development', description: 'Manage plugins and extensions' },
  { id: 'local-capabilities', label: 'Local Capabilities', path: '/capabilities', category: 'System', description: 'Local system capabilities' },

  // Content Creation
  { id: 'image-studio', label: 'Image Studio', path: '/images', category: 'Content', description: 'Image processing and PBR texture generation' },
  { id: 'audio-studio', label: 'Audio Studio', path: '/tts', category: 'Content', description: 'Text-to-speech and audio tools' },

  // Integration & Support
  { id: 'live-synapse', label: 'Live Synapse', path: '/live', category: 'Communication', description: 'Real-time voice communication' },
  { id: 'desktop-bridge', label: 'Desktop Bridge', path: '/bridge', category: 'Integration', description: 'Desktop application integration' },
  { id: 'duplicate-finder', label: 'Duplicate Finder', path: '/dedupe', category: 'Tools', description: 'Find and manage duplicate files' },
  { id: 'community-learning', label: 'Community Learning', path: '/community', category: 'Community', description: 'Community-driven learning resources' },
  { id: 'tool-verify', label: 'Tool Verify', path: '/tool-verify', category: 'System', description: 'Verify tool installations' },

  // Settings
  { id: 'privacy-settings', label: 'Privacy Settings', path: '/settings', category: 'Settings', description: 'Privacy and data sharing settings' },
  { id: 'voice-settings', label: 'Voice Settings', path: '/settings/voice', category: 'Settings', description: 'Voice and audio settings' },
  { id: 'language-settings', label: 'Language Settings', path: '/settings', category: 'Settings', description: 'Language and localization settings' },
  { id: 'settings-import-export', label: 'Settings Import/Export', path: '/settings', category: 'Settings', description: 'Backup and restore app settings' },
  { id: 'diagnostic-tools', label: 'Diagnostic Tools', path: '/diagnostics', category: 'System', description: 'System diagnostics and troubleshooting' },
  { id: 'support', label: 'Support Mossy', path: '/support', category: 'Support', description: 'Support and donation options' },
];

export const GlobalSearch: React.FC<GlobalSearchProps> = ({
  onSearch,
  placeholder = "Search modules, tools, and features..."
}) => {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [filteredResults, setFilteredResults] = useState<SearchItem[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  // Keyboard shortcut to open search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen(true);
        setTimeout(() => inputRef.current?.focus(), 100);
      }
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
        setQuery('');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  // Filter search results
  useEffect(() => {
    if (!query.trim()) {
      setFilteredResults([]);
      return;
    }

    const filtered = searchIndex.filter(item =>
      item.label.toLowerCase().includes(query.toLowerCase()) ||
      item.category.toLowerCase().includes(query.toLowerCase()) ||
      (item.description && item.description.toLowerCase().includes(query.toLowerCase()))
    ).slice(0, 10); // Limit to 10 results

    setFilteredResults(filtered);
  }, [query]);

  const handleSearch = (searchQuery: string) => {
    setQuery(searchQuery);
    onSearch?.(searchQuery);
  };

  const clearSearch = () => {
    setQuery('');
    setFilteredResults([]);
    onSearch?.('');
  };

  const handleResultClick = (item: SearchItem) => {
    navigate(item.path);
    setIsOpen(false);
    setQuery('');
    setFilteredResults([]);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && filteredResults.length > 0) {
      handleResultClick(filteredResults[0]);
    }
  };

  return (
    <div className="relative">
      {/* Search Button */}
      <button
        onClick={() => {
          setIsOpen(true);
          setTimeout(() => inputRef.current?.focus(), 100);
        }}
        className="flex items-center gap-2 px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg hover:bg-slate-700 transition-colors text-sm text-slate-300"
        title="Search (Ctrl+K)"
      >
        <Search className="w-4 h-4" />
        <span className="hidden sm:inline">Search</span>
        <kbd className="hidden md:inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-slate-900 border border-slate-600 rounded text-xs text-slate-400">
          <Command className="w-3 h-3" />
          <span>K</span>
        </kbd>
      </button>

      {/* Search Overlay */}
      {isOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-start justify-center pt-20">
          <div className="w-full max-w-2xl mx-4">
            <div className="bg-slate-900 border border-slate-700 rounded-lg shadow-2xl">
              {/* Search Input */}
              <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-700">
                <Search className="w-5 h-5 text-slate-400" />
                <input
                  ref={inputRef}
                  type="text"
                  value={query}
                  onChange={(e) => handleSearch(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={placeholder}
                  className="flex-1 bg-transparent border-0 outline-none text-white placeholder-slate-400"
                  autoFocus
                />
                {query && (
                  <button
                    onClick={clearSearch}
                    className="p-1 hover:bg-slate-800 rounded"
                  >
                    <X className="w-4 h-4 text-slate-400" />
                  </button>
                )}
              </div>

              {/* Search Results */}
              <div className="max-h-96 overflow-y-auto">
                {query ? (
                  filteredResults.length > 0 ? (
                    <div className="py-2">
                      {filteredResults.map((item) => (
                        <button
                          key={item.id}
                          onClick={() => handleResultClick(item)}
                          className="w-full px-4 py-3 hover:bg-slate-800 flex items-center justify-between group transition-colors text-left"
                        >
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="text-white font-medium">{item.label}</span>
                              <span className="text-xs text-slate-500 bg-slate-800 px-2 py-0.5 rounded">
                                {item.category}
                              </span>
                            </div>
                            {item.description && (
                              <p className="text-sm text-slate-400 mt-1">{item.description}</p>
                            )}
                          </div>
                          <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-slate-300 transition-colors" />
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="p-4 text-center text-slate-400">
                      <p>No results found for "{query}"</p>
                      <p className="text-sm mt-1">Try searching for modules, tools, or features</p>
                    </div>
                  )
                ) : (
                  <div className="p-4">
                    <div className="text-sm text-slate-400 mb-3">Quick Actions</div>
                    <div className="space-y-1">
                      <button
                        onClick={() => handleResultClick(searchIndex.find(item => item.id === 'chat')!)}
                        className="w-full px-3 py-2 hover:bg-slate-800 rounded cursor-pointer text-slate-300 text-left transition-colors"
                      >
                        Open AI Chat
                      </button>
                      <button
                        onClick={() => handleResultClick(searchIndex.find(item => item.id === 'projects')!)}
                        className="w-full px-3 py-2 hover:bg-slate-800 rounded cursor-pointer text-slate-300 text-left transition-colors"
                      >
                        Create New Project
                      </button>
                      <button
                        onClick={() => handleResultClick(searchIndex.find(item => item.id === 'monitor')!)}
                        className="w-full px-3 py-2 hover:bg-slate-800 rounded cursor-pointer text-slate-300 text-left transition-colors"
                      >
                        View System Monitor
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};