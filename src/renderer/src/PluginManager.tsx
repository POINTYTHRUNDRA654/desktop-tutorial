import React, { useState, useEffect, useMemo } from 'react';
import './PluginManager.css';
import { Plugin, PluginListing, PluginValidationResult } from '../../shared/types';

// ============================================================================
// Types & Interfaces
// ============================================================================

interface PluginManagerState {
  installedPlugins: Plugin[];
  availablePlugins: PluginListing[];
  selectedPlugin: (Plugin | PluginListing) | null;
  showDetailsModal: boolean;
  activeTab: 'installed' | 'marketplace' | 'developer' | 'settings';
  searchTerm: string;
  categoryFilter: string;
  loading: boolean;
  error: string | null;
}

interface PluginSettings {
  autoUpdate: boolean;
  marketplaceSources: string[];
  installDirectory: string;
  allowUnsigned: boolean;
  enableTelemetry: boolean;
}

interface PluginTemplate {
  name: string;
  description: string;
  files: Record<string, string>;
}

// ============================================================================
// Main Component
// ============================================================================

export const PluginManager: React.FC = () => {
  const [state, setState] = useState<PluginManagerState>({
    installedPlugins: [],
    availablePlugins: [],
    selectedPlugin: null,
    showDetailsModal: false,
    activeTab: 'installed',
    searchTerm: '',
    categoryFilter: 'All',
    loading: false,
    error: null,
  });

  const [settings, setSettings] = useState<PluginSettings>({
    autoUpdate: true,
    marketplaceSources: ['https://marketplace.mossy.dev', 'https://community.mossy.dev'],
    installDirectory: '~/.mossy/plugins',
    allowUnsigned: false,
    enableTelemetry: true,
  });

  // Load initial data
  useEffect(() => {
    loadInstalledPlugins();
    loadMarketplacePlugins();
  }, []);

  // ========================================================================
  // Data Loading Functions
  // ========================================================================

  const loadInstalledPlugins = async () => {
    setState(s => ({ ...s, loading: true }));
    try {
      // TODO: Replace with actual API call
      const mockPlugins: Plugin[] = [
        {
          id: 'com.example.nif-tools',
          name: 'NIF Tools',
          version: '2.1.0',
          description: 'Advanced NIF model editing and visualization',
          author: 'Bethesda Community',
          path: '~/.mossy/plugins/nif-tools',
          enabled: true,
          installed: true,
          permissions: ['filesystem:read', 'filesystem:write'],
          dependencies: [],
          homepage: 'https://github.com/nif-tools/nif-tools',
          license: 'MIT',
          created: Date.now() - 90 * 24 * 60 * 60 * 1000,
          modified: Date.now(),
        },
        {
          id: 'com.example.blender-bridge',
          name: 'Blender Bridge',
          version: '1.5.2',
          description: 'Direct integration with Blender for mesh editing',
          author: 'Mossy Team',
          path: '~/.mossy/plugins/blender-bridge',
          enabled: true,
          installed: true,
          permissions: ['process:spawn', 'network:request'],
          dependencies: [],
          homepage: 'https://docs.mossy.dev',
          license: 'GPL-3.0',
          created: Date.now() - 60 * 24 * 60 * 60 * 1000,
          modified: Date.now() - 7 * 24 * 60 * 60 * 1000,
        },
      ];
      setState(s => ({ ...s, installedPlugins: mockPlugins, loading: false }));
    } catch (err) {
      setState(s => ({
        ...s,
        error: `Failed to load plugins: ${err}`,
        loading: false,
      }));
    }
  };

  const loadMarketplacePlugins = async () => {
    try {
      // TODO: Replace with actual marketplace API
      const mockListings: PluginListing[] = [
        {
          id: 'com.example.texture-tools',
          name: 'Texture Tools Pro',
          version: '3.2.1',
          author: 'Graphics Lab',
          description: 'Complete texture editing suite with batch processing',
          downloads: 15420,
          rating: 4.8,
          tags: ['textures', 'editing', 'batch', 'dds'],
          homepage: 'https://github.com/texture-tools/pro',
          repository: 'https://github.com/texture-tools/pro',
        },
        {
          id: 'com.example.script-editor',
          name: 'Script Editor Plus',
          version: '2.0.0',
          author: 'Script Dev',
          description: 'Advanced script editing with syntax highlighting and debugging',
          downloads: 8932,
          rating: 4.6,
          tags: ['scripting', 'editing', 'debugger', 'esp'],
          repository: 'https://github.com/script-editor/plus',
        },
        {
          id: 'com.example.animation-viewer',
          name: 'Animation Viewer',
          version: '1.8.5',
          author: 'Animation Team',
          description: 'Real-time animation preview and editing interface',
          downloads: 5621,
          rating: 4.4,
          tags: ['animation', 'viewer', 'preview', 'kf'],
        },
      ];
      setState(s => ({ ...s, availablePlugins: mockListings }));
    } catch (err) {
      console.error('Failed to load marketplace:', err);
    }
  };

  // ========================================================================
  // Filter & Search Logic
  // ========================================================================

  const filteredMarketplace = useMemo(() => {
    return state.availablePlugins.filter(plugin => {
      const matchesSearch =
        plugin.name.toLowerCase().includes(state.searchTerm.toLowerCase()) ||
        plugin.description.toLowerCase().includes(state.searchTerm.toLowerCase()) ||
        plugin.author.toLowerCase().includes(state.searchTerm.toLowerCase());

      if (state.categoryFilter === 'All') return matchesSearch;
      return matchesSearch && plugin.tags.includes(state.categoryFilter.toLowerCase());
    });
  }, [state.availablePlugins, state.searchTerm, state.categoryFilter]);

  // ========================================================================
  // Action Handlers
  // ========================================================================

  const handleInstallPlugin = async (plugin: PluginListing) => {
    setState(s => ({ ...s, loading: true }));
    try {
      // TODO: Call actual install API
      console.log(`Installing ${plugin.id} v${plugin.version}`);
      await new Promise(resolve => setTimeout(resolve, 2000)); // Simulate install

      // Add to installed plugins
      const newPlugin: Plugin = {
        id: plugin.id,
        name: plugin.name,
        version: plugin.version,
        description: plugin.description,
        author: plugin.author,
        path: `${settings.installDirectory}/${plugin.id}`,
        enabled: true,
        installed: true,
        permissions: [],
        dependencies: [],
        homepage: plugin.homepage,
        license: 'Unknown',
        created: Date.now(),
        modified: Date.now(),
      };

      setState(s => ({
        ...s,
        installedPlugins: [...s.installedPlugins, newPlugin],
        loading: false,
        error: null,
      }));
    } catch (err) {
      setState(s => ({
        ...s,
        error: `Failed to install plugin: ${err}`,
        loading: false,
      }));
    }
  };

  const handleUninstallPlugin = async (pluginId: string) => {
    if (!confirm('Are you sure you want to uninstall this plugin?')) return;

    setState(s => ({ ...s, loading: true }));
    try {
      // TODO: Call actual uninstall API
      console.log(`Uninstalling ${pluginId}`);
      await new Promise(resolve => setTimeout(resolve, 1500)); // Simulate uninstall

      setState(s => ({
        ...s,
        installedPlugins: s.installedPlugins.filter(p => p.id !== pluginId),
        loading: false,
        error: null,
      }));
    } catch (err) {
      setState(s => ({
        ...s,
        error: `Failed to uninstall plugin: ${err}`,
        loading: false,
      }));
    }
  };

  const handleTogglePlugin = async (pluginId: string, enabled: boolean) => {
    try {
      // TODO: Call actual toggle API
      setState(s => ({
        ...s,
        installedPlugins: s.installedPlugins.map(p =>
          p.id === pluginId ? { ...p, enabled } : p
        ),
      }));
    } catch (err) {
      console.error(`Failed to toggle plugin:`, err);
    }
  };

  const handleUpdatePlugin = async (pluginId: string) => {
    setState(s => ({ ...s, loading: true }));
    try {
      // TODO: Call actual update API
      console.log(`Updating ${pluginId}`);
      await new Promise(resolve => setTimeout(resolve, 2500)); // Simulate update

      setState(s => ({
        ...s,
        installedPlugins: s.installedPlugins.map(p =>
          p.id === pluginId ? { ...p, version: (parseFloat(p.version) + 0.1).toFixed(1) } : p
        ),
        loading: false,
      }));
    } catch (err) {
      setState(s => ({
        ...s,
        error: `Failed to update plugin: ${err}`,
        loading: false,
      }));
    }
  };

  const handleShowDetails = (plugin: Plugin | PluginListing) => {
    setState(s => ({
      ...s,
      selectedPlugin: plugin,
      showDetailsModal: true,
    }));
  };

  const handleCloseDetails = () => {
    setState(s => ({
      ...s,
      selectedPlugin: null,
      showDetailsModal: false,
    }));
  };

  // ========================================================================
  // Settings Handlers
  // ========================================================================

  const handleSaveSettings = () => {
    // TODO: Call settings API to persist
    console.log('Saving settings:', settings);
    setState(s => ({ ...s, error: null }));
  };

  // ========================================================================
  // Render Functions
  // ========================================================================

  const renderInstalledPlugins = () => {
    if (state.installedPlugins.length === 0) {
      return (
        <div className="plugin-empty-state">
          <div className="empty-icon">📦</div>
          <h3>No Plugins Installed</h3>
          <p>Explore the marketplace to find and install plugins</p>
          <button
            className="btn btn-primary"
            onClick={() => setState(s => ({ ...s, activeTab: 'marketplace' }))}
          >
            Browse Marketplace
          </button>
        </div>
      );
    }

    return (
      <div className="plugin-list">
        {state.installedPlugins.map(plugin => (
          <div key={plugin.id} className="plugin-card installed">
            <div className="plugin-header">
              <div className="plugin-info">
                <h3>{plugin.name}</h3>
                <p className="plugin-version">v{plugin.version}</p>
              </div>
              <div className="plugin-toggle">
                <input
                  type="checkbox"
                  checked={plugin.enabled}
                  onChange={e => handleTogglePlugin(plugin.id, e.target.checked)}
                  aria-label={`Enable ${plugin.name}`}
                />
              </div>
            </div>

            <p className="plugin-description">{plugin.description}</p>

            <div className="plugin-meta">
              <span className="plugin-author">By {plugin.author}</span>
              <span className="plugin-date">
                Updated {new Date(plugin.modified).toLocaleDateString()}
              </span>
            </div>

            <div className="plugin-footer">
              <button
                className="btn btn-sm btn-link"
                onClick={() => handleShowDetails(plugin)}
              >
                Details
              </button>
              <button
                className="btn btn-sm btn-link"
                onClick={() => handleUpdatePlugin(plugin.id)}
              >
                Update
              </button>
              <button
                className="btn btn-sm btn-link text-danger"
                onClick={() => handleUninstallPlugin(plugin.id)}
              >
                Uninstall
              </button>
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderMarketplace = () => {
    return (
      <div className="marketplace-section">
        <div className="marketplace-controls">
          <div className="search-bar">
            <input
              type="text"
              placeholder="Search plugins..."
              value={state.searchTerm}
              onChange={e =>
                setState(s => ({ ...s, searchTerm: e.target.value }))
              }
              className="search-input"
            />
          </div>

          <div className="category-filters">
            {['All', 'Tools', 'Themes', 'Integrations', 'Importers'].map(
              cat => (
                <button
                  key={cat}
                  className={`filter-btn ${
                    state.categoryFilter === cat ? 'active' : ''
                  }`}
                  onClick={() =>
                    setState(s => ({ ...s, categoryFilter: cat }))
                  }
                >
                  {cat}
                </button>
              )
            )}
          </div>
        </div>

        <div className="plugin-grid">
          {filteredMarketplace.length === 0 ? (
            <div className="grid-empty">
              <p>No plugins found matching your search</p>
            </div>
          ) : (
            filteredMarketplace.map(plugin => (
              <div key={plugin.id} className="plugin-card marketplace">
                <div className="plugin-header">
                  <h3>{plugin.name}</h3>
                  <div className="rating">
                    {'⭐'.repeat(Math.floor(plugin.rating))}
                    <span className="rating-value">{plugin.rating}</span>
                  </div>
                </div>

                <p className="plugin-description">{plugin.description}</p>

                <div className="plugin-stats">
                  <span className="stat">
                    <strong>{(plugin.downloads / 1000).toFixed(1)}k</strong> installs
                  </span>
                  <span className="stat">By {plugin.author}</span>
                </div>

                <div className="plugin-tags">
                  {plugin.tags.slice(0, 3).map(tag => (
                    <span key={tag} className="tag">
                      {tag}
                    </span>
                  ))}
                </div>

                <div className="plugin-footer">
                  <button
                    className={`btn btn-sm ${
                      state.installedPlugins.some(p => p.id === plugin.id)
                        ? 'btn-secondary'
                        : 'btn-primary'
                    }`}
                    onClick={() => handleInstallPlugin(plugin)}
                  >
                    {state.installedPlugins.some(p => p.id === plugin.id)
                      ? 'Installed'
                      : 'Install'}
                  </button>
                  <button
                    className="btn btn-sm btn-link"
                    onClick={() => handleShowDetails(plugin)}
                  >
                    View Details
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    );
  };

  const renderDeveloperTools = () => {
    return (
      <div className="developer-tools-section">
        <div className="developer-grid">
          {/* Create Plugin Wizard */}
          <div className="dev-card">
            <h3>📝 Create Plugin</h3>
            <p>Start building a new plugin with our interactive wizard</p>
            <button className="btn btn-primary" onClick={() => handleShowCreateWizard()}>
              New Plugin
            </button>
          </div>

          {/* Plugin Template Generator */}
          <div className="dev-card">
            <h3>📦 Plugin Templates</h3>
            <p>Generate boilerplate code for common plugin types</p>
            <select className="select-input">
              <option>Select a template...</option>
              <option>Basic Plugin</option>
              <option>UI Panel Extension</option>
              <option>Tool Wrapper</option>
              <option>File Importer</option>
            </select>
            <button className="btn btn-secondary" onClick={() => handleGenerateTemplate()}>
              Generate
            </button>
          </div>

          {/* Hot Reload */}
          <div className="dev-card">
            <h3>🔄 Hot Reload</h3>
            <p>Monitor plugin changes and reload automatically</p>
            <button className="btn btn-secondary" onClick={() => handleToggleHotReload()}>
              Enable Hot Reload
            </button>
            <p className="helper-text">Currently watching: ~/development/my-plugin</p>
          </div>

          {/* Debug Console */}
          <div className="dev-card">
            <h3>🐛 Debug Console</h3>
            <p>View plugin logs and debug information in real-time</p>
            <button className="btn btn-secondary" onClick={() => handleOpenDebugConsole()}>
              Open Console
            </button>
          </div>

          {/* API Documentation */}
          <div className="dev-card">
            <h3>📚 API Documentation</h3>
            <p>Comprehensive guide to the MossyPluginAPI</p>
            <button className="btn btn-secondary" onClick={() => handleOpenApiDocs()}>
              View Docs
            </button>
          </div>

          {/* Extension Points */}
          <div className="dev-card">
            <h3>🔌 Extension Points</h3>
            <p>Learn how to create custom extensions</p>
            <button className="btn btn-secondary" onClick={() => handleOpenExtensionDocs()}>
              Extension Guide
            </button>
          </div>
        </div>

        {/* Development Console */}
        <div className="dev-console">
          <div className="console-header">
            <h3>Plugin Development Console</h3>
            <button className="btn btn-sm btn-link">Clear</button>
          </div>
          <div className="console-output">
            <pre>[12:45:23] Plugin watcher started for ~/development/my-plugin
[12:45:24] MyPlugin v1.0.0 loaded successfully
[12:45:25] Registered 3 commands
[12:45:26] Ready for development</pre>
          </div>
        </div>
      </div>
    );
  };

  const renderSettings = () => {
    return (
      <div className="settings-section">
        <div className="settings-form">
          {/* Auto-update */}
          <div className="setting-group">
            <h3>🔄 Automatic Updates</h3>
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={settings.autoUpdate}
                onChange={e =>
                  setSettings({ ...settings, autoUpdate: e.target.checked })
                }
              />
              <span>Automatically update plugins when new versions are available</span>
            </label>
            <p className="setting-description">
              Plugins will be updated in the background without interrupting your workflow
            </p>
          </div>

          {/* Marketplace Sources */}
          <div className="setting-group">
            <h3>🏪 Marketplace Sources</h3>
            <p className="setting-description">
              Configure where plugins are sourced from
            </p>
            <div className="sources-list">
              {settings.marketplaceSources.map((source, idx) => (
                <div key={idx} className="source-item">
                  <input type="text" value={source} readOnly className="source-input" />
                  <button className="btn btn-sm btn-link text-danger">Remove</button>
                </div>
              ))}
            </div>
            <button className="btn btn-sm btn-secondary">Add Source</button>
          </div>

          {/* Install Directory */}
          <div className="setting-group">
            <h3>📁 Plugin Directory</h3>
            <div className="input-group">
              <input
                type="text"
                value={settings.installDirectory}
                onChange={e =>
                  setSettings({ ...settings, installDirectory: e.target.value })
                }
                className="input-field"
              />
              <button className="btn btn-secondary">Browse</button>
            </div>
            <p className="setting-description">
              Location where plugins are installed
            </p>
          </div>

          {/* Security Settings */}
          <div className="setting-group">
            <h3>🔒 Security</h3>
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={settings.allowUnsigned}
                onChange={e =>
                  setSettings({ ...settings, allowUnsigned: e.target.checked })
                }
              />
              <span>Allow installation of unsigned plugins</span>
            </label>
            <p className="setting-description warning">
              ⚠️ Unsigned plugins may pose security risks. Only enable if you trust the source.
            </p>
          </div>

          {/* Telemetry & Analytics */}
          <div className="setting-group">
            <h3>📊 Telemetry</h3>
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={settings.enableTelemetry}
                onChange={e =>
                  setSettings({ ...settings, enableTelemetry: e.target.checked })
                }
              />
              <span>Send plugin usage analytics</span>
            </label>
            <p className="setting-description">
              Helps us understand which plugins are most useful and improve them
            </p>
          </div>

          {/* Action Buttons */}
          <div className="settings-footer">
            <button className="btn btn-primary" onClick={handleSaveSettings}>
              Save Settings
            </button>
            <button
              className="btn btn-secondary"
              onClick={() =>
                setSettings({
                  autoUpdate: true,
                  marketplaceSources: ['https://marketplace.mossy.dev'],
                  installDirectory: '~/.mossy/plugins',
                  allowUnsigned: false,
                  enableTelemetry: true,
                })
              }
            >
              Reset to Defaults
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderPluginDetails = () => {
    if (!state.selectedPlugin) return null;

    const plugin = state.selectedPlugin;
    const isInstalled = 'path' in plugin;

    return (
      <div className="modal-overlay" onClick={handleCloseDetails}>
        <div className="modal-content" onClick={e => e.stopPropagation()}>
          <div className="modal-header">
            <h2>{plugin.name}</h2>
            <button className="close-btn" onClick={handleCloseDetails}>
              ✕
            </button>
          </div>

          <div className="modal-body plugin-details">
            {/* Plugin Info */}
            <div className="detail-section">
              <div className="detail-grid">
                <div>
                  <strong>Author:</strong> {plugin.author}
                </div>
                <div>
                  <strong>Version:</strong> {plugin.version}
                </div>
                <div>
                  <strong>License:</strong> {'license' in plugin ? plugin.license : 'Unknown'}
                </div>
                {'rating' in plugin && (
                  <div>
                    <strong>Rating:</strong> {'⭐'.repeat(Math.floor(plugin.rating))}{' '}
                    ({plugin.rating})
                  </div>
                )}
              </div>
            </div>

            {/* Description */}
            <div className="detail-section">
              <h3>Description</h3>
              <p>{plugin.description}</p>
            </div>

            {/* Dependencies */}
            {'dependencies' in plugin && plugin.dependencies && plugin.dependencies.length > 0 && (
              <div className="detail-section">
                <h3>Dependencies</h3>
                <ul>
                  {plugin.dependencies.map(dep => (
                    <li key={dep}>{dep}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Permissions */}
            {'permissions' in plugin && plugin.permissions && plugin.permissions.length > 0 && (
              <div className="detail-section">
                <h3>Permissions</h3>
                <div className="permission-list">
                  {plugin.permissions.map(perm => (
                    <span key={perm} className="permission-badge">
                      {perm}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Links */}
            <div className="detail-section links">
              {plugin.homepage && (
                <a href={plugin.homepage} target="_blank" rel="noopener noreferrer">
                  Homepage
                </a>
              )}
              {('repository' in plugin && plugin.repository) && (
                <a href={plugin.repository} target="_blank" rel="noopener noreferrer">
                  Repository
                </a>
              )}
            </div>

            {/* Stats (for marketplace plugins) */}
            {'downloads' in plugin && (
              <div className="detail-section">
                <h3>Statistics</h3>
                <div className="stats-grid">
                  <div>
                    <strong>{(plugin.downloads / 1000).toFixed(1)}k</strong>
                    <p>Installs</p>
                  </div>
                  <div>
                    <strong>{plugin.rating}</strong>
                    <p>Rating</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="modal-footer">
            {isInstalled ? (
              <>
                <button className="btn btn-secondary" onClick={handleCloseDetails}>
                  Close
                </button>
                <button
                  className="btn btn-link text-danger"
                  onClick={() => {
                    handleUninstallPlugin(plugin.id);
                    handleCloseDetails();
                  }}
                >
                  Uninstall
                </button>
              </>
            ) : (
              <>
                <button className="btn btn-secondary" onClick={handleCloseDetails}>
                  Cancel
                </button>
                <button
                  className="btn btn-primary"
                  onClick={() => {
                    handleInstallPlugin(plugin as PluginListing);
                    handleCloseDetails();
                  }}
                >
                  Install Plugin
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    );
  };

  // ========================================================================
  // Placeholder Action Handlers (for developer tools)
  // ========================================================================

  const handleShowCreateWizard = () => console.log('Show create wizard');
  const handleGenerateTemplate = () => console.log('Generate template');
  const handleToggleHotReload = () => console.log('Toggle hot reload');
  const handleOpenDebugConsole = () => console.log('Open debug console');
  const handleOpenApiDocs = () => console.log('Open API docs');
  const handleOpenExtensionDocs = () => console.log('Open extension docs');

  // ========================================================================
  // Main Render
  // ========================================================================

  return (
    <div className="plugin-manager">
      {/* Header */}
      <div className="manager-header">
        <h1>🔌 Plugin Manager</h1>
        <p>Install, manage, and develop plugins to extend Mossy's capabilities</p>
      </div>

      {/* Error Display */}
      {state.error && (
        <div className="error-banner">
          <span>{state.error}</span>
          <button onClick={() => setState(s => ({ ...s, error: null }))}>✕</button>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="tab-navigation">
        {['installed', 'marketplace', 'developer', 'settings'].map(tab => (
          <button
            key={tab}
            className={`tab-btn ${state.activeTab === tab ? 'active' : ''}`}
            onClick={() => setState(s => ({ ...s, activeTab: tab as any }))}
          >
            {tab === 'installed' && '📦 Installed'}
            {tab === 'marketplace' && '🏪 Marketplace'}
            {tab === 'developer' && '👨‍💻 Developer'}
            {tab === 'settings' && '⚙️ Settings'}
          </button>
        ))}
      </div>

      {/* Loading Indicator */}
      {state.loading && (
        <div className="loading-indicator">
          <div className="spinner"></div>
          <p>Loading...</p>
        </div>
      )}

      {/* Tab Content */}
      {!state.loading && (
        <div className="tab-content">
          {state.activeTab === 'installed' && renderInstalledPlugins()}
          {state.activeTab === 'marketplace' && renderMarketplace()}
          {state.activeTab === 'developer' && renderDeveloperTools()}
          {state.activeTab === 'settings' && renderSettings()}
        </div>
      )}

      {/* Plugin Details Modal */}
      {renderPluginDetails()}
    </div>
  );
};

export default PluginManager;