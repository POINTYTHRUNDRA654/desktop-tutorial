import React, { useState, useEffect } from 'react';
import { PluginInstance, PluginManifest, getPluginSystemService } from './PluginSystemService';
import { ArrowDownToLine, Upload, Settings, Play, Square, Trash2, AlertTriangle, CheckCircle, XCircle, Package, Zap } from 'lucide-react';

export const PluginManager: React.FC = () => {
    const [plugins, setPlugins] = useState<PluginInstance[]>([]);
    const [showInstallDialog, setShowInstallDialog] = useState(false);
    const [installPath, setInstallPath] = useState('');
    const [loading, setLoading] = useState(false);
    const pluginsEnabled = false;

    const pluginSystemService = getPluginSystemService();

    useEffect(() => {
        // Load plugins
        setPlugins(pluginSystemService.getAllPlugins());

        // Listen to plugin service events
        const handlePluginInstalled = (plugin: PluginInstance) => {
            setPlugins(prev => [...prev, plugin]);
        };

        const handlePluginUninstalled = (pluginId: string) => {
            setPlugins(prev => prev.filter(p => p.manifest.id !== pluginId));
        };

        const handlePluginActivated = (plugin: PluginInstance) => {
            setPlugins(prev => prev.map(p => p.manifest.id === plugin.manifest.id ? plugin : p));
        };

        const handlePluginDeactivated = (plugin: PluginInstance) => {
            setPlugins(prev => prev.map(p => p.manifest.id === plugin.manifest.id ? plugin : p));
        };

        const handleEvent = (event: string, data: any) => {
            switch (event) {
                case 'pluginInstalled':
                    handlePluginInstalled(data);
                    break;
                case 'pluginUninstalled':
                    handlePluginUninstalled(data);
                    break;
                case 'pluginActivated':
                    handlePluginActivated(data);
                    break;
                case 'pluginDeactivated':
                    handlePluginDeactivated(data);
                    break;
            }
        };

        pluginSystemService.addListener(handleEvent);

        return () => {
            pluginSystemService.removeListener(handleEvent);
        };
    }, []);

    const handleInstallPlugin = async () => {
        if (!installPath.trim()) return;

        setLoading(true);
        try {
            await pluginSystemService.installPlugin(installPath);
            setInstallPath('');
            setShowInstallDialog(false);
        } catch (error) {
            console.error('Failed to install plugin:', error);
            alert(`Failed to install plugin: ${(error as Error).message}`);
        } finally {
            setLoading(false);
        }
    };

    const handleUninstallPlugin = async (pluginId: string) => {
        if (!confirm('Are you sure you want to uninstall this plugin? This action cannot be undone.')) return;

        try {
            await pluginSystemService.uninstallPlugin(pluginId);
        } catch (error) {
            console.error('Failed to uninstall plugin:', error);
            alert(`Failed to uninstall plugin: ${(error as Error).message}`);
        }
    };

    const handleTogglePlugin = async (plugin: PluginInstance) => {
        try {
            if (plugin.isActive) {
                await pluginSystemService.deactivatePlugin(plugin.manifest.id);
            } else {
                await pluginSystemService.activatePlugin(plugin.manifest.id);
            }
        } catch (error) {
            console.error('Failed to toggle plugin:', error);
            alert(`Failed to ${plugin.isActive ? 'deactivate' : 'activate'} plugin: ${(error as Error).message}`);
        }
    };

    const getPluginStatusIcon = (plugin: PluginInstance) => {
        if (plugin.isActive) {
            return <CheckCircle className="w-4 h-4 text-green-500" />;
        } else if (plugin.isLoaded) {
            return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
        } else {
            return <XCircle className="w-4 h-4 text-red-500" />;
        }
    };

    const getPluginStatusText = (plugin: PluginInstance) => {
        if (plugin.isActive) return 'Active';
        if (plugin.isLoaded) return 'Loaded';
        return 'Inactive';
    };

    const getPluginCapabilities = (plugin: PluginInstance) => {
        const aiExtensions = plugin.manifest.contributes?.aiExtensions || [];
        const commands = plugin.manifest.contributes?.commands || [];
        const uiComponents = plugin.manifest.contributes?.uiComponents || [];

        const capabilities = [];
        if (aiExtensions.length) capabilities.push(`${aiExtensions.length} AI extensions`);
        if (commands.length) capabilities.push(`${commands.length} commands`);
        if (uiComponents.length) capabilities.push(`${uiComponents.length} UI components`);

        return capabilities.join(', ') || 'No capabilities';
    };

    return (
        <div className="bg-slate-900 border border-slate-700 rounded-xl p-6 shadow-2xl">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h3 className="text-xl font-bold text-white flex items-center gap-2">
                        <Package className="w-5 h-5 text-emerald-400" />
                        AI Plugin Manager
                    </h3>
                    <p className="text-xs text-slate-400 mt-1">Manage AI extensions and plugins</p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => setShowInstallDialog(true)}
                        disabled={!pluginsEnabled}
                        className={`px-3 py-1 text-white text-sm rounded-lg transition-colors ${
                            pluginsEnabled
                                ? 'bg-emerald-600 hover:bg-emerald-700'
                                : 'bg-slate-700 text-slate-400 cursor-not-allowed'
                        }`}
                        title={pluginsEnabled ? 'Install plugin' : 'Plugin system is still experimental'}
                    >
                        Install Plugin
                    </button>
                    <button
                        onClick={() => pluginSystemService.discoverPlugins()}
                        disabled={!pluginsEnabled}
                        className={`px-3 py-1 text-white text-sm rounded-lg transition-colors ${
                            pluginsEnabled
                                ? 'bg-slate-700 hover:bg-slate-600'
                                : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                        }`}
                        title={pluginsEnabled ? 'Discover plugins' : 'Marketplace discovery is not available yet'}
                    >
                        Discover
                    </button>
                </div>
            </div>

            {!pluginsEnabled && (
                <div className="mb-6 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-xs text-amber-200">
                    <div className="flex items-start gap-2">
                        <AlertTriangle className="w-4 h-4 mt-0.5" />
                        <div>
                            <div className="font-bold text-amber-100">Plugin system is experimental</div>
                            <div className="text-amber-200/80">
                                Installation, discovery, and execution hooks are not production-ready yet. This page stays visible for roadmap visibility, but actions are disabled to avoid fake workflows.
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Plugins List */}
            <div className="space-y-4">
                {plugins.map(plugin => (
                    <div key={plugin.manifest.id} className="bg-slate-800 border border-slate-600 rounded-lg p-4">
                        <div className="flex items-start justify-between">
                            <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                    {getPluginStatusIcon(plugin)}
                                    <h4 className="text-white font-medium">{plugin.manifest.name}</h4>
                                    <span className="text-xs text-slate-400">v{plugin.manifest.version}</span>
                                    <span className={`px-2 py-0.5 text-xs rounded ${
                                        plugin.isActive ? 'bg-green-600 text-white' :
                                        plugin.isLoaded ? 'bg-yellow-600 text-white' :
                                        'bg-red-600 text-white'
                                    }`}>
                                        {getPluginStatusText(plugin)}
                                    </span>
                                </div>
                                <p className="text-sm text-slate-400 mb-2">{plugin.manifest.description}</p>
                                <div className="text-xs text-slate-500 space-y-1">
                                    <div>Author: {plugin.manifest.author}</div>
                                    <div>Capabilities: {getPluginCapabilities(plugin)}</div>
                                    {plugin.manifest.homepage && (
                                        <div>
                                            Homepage: <a href={plugin.manifest.homepage} target="_blank" rel="noopener noreferrer" className="text-emerald-400 hover:underline">
                                                {plugin.manifest.homepage}
                                            </a>
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div className="flex gap-1 ml-4">
                                <button
                                    onClick={() => handleTogglePlugin(plugin)}
                                    disabled={!pluginsEnabled}
                                    className={`p-2 rounded transition-colors ${
                                        pluginsEnabled
                                            ? plugin.isActive
                                                ? 'bg-red-600 hover:bg-red-700 text-white'
                                                : 'bg-green-600 hover:bg-green-700 text-white'
                                            : 'bg-slate-700 text-slate-400 cursor-not-allowed'
                                    }`}
                                    title={plugin.isActive ? 'Deactivate Plugin' : 'Activate Plugin'}
                                >
                                    {plugin.isActive ? <Square className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                                </button>
                                <button
                                    onClick={() => handleUninstallPlugin(plugin.manifest.id)}
                                    disabled={!pluginsEnabled}
                                    className={`p-2 rounded transition-colors ${
                                        pluginsEnabled
                                            ? 'bg-red-600 hover:bg-red-700 text-white'
                                            : 'bg-slate-700 text-slate-400 cursor-not-allowed'
                                    }`}
                                    title="Uninstall Plugin"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    </div>
                ))}

                {plugins.length === 0 && (
                    <div className="text-center py-12 text-slate-400">
                        <Package className="w-16 h-16 mx-auto mb-4 opacity-50" />
                        <h4 className="text-lg font-medium mb-2">No plugins installed</h4>
                        <p className="text-sm mb-4">Install AI extensions to enhance Mossy's capabilities</p>
                        <button
                            onClick={() => setShowInstallDialog(true)}
                            disabled={!pluginsEnabled}
                            className={`px-4 py-2 rounded-lg transition-colors ${
                                pluginsEnabled
                                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                                    : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                            }`}
                        >
                            Install Your First Plugin
                        </button>
                    </div>
                )}
            </div>

            {/* Install Plugin Dialog */}
            {showInstallDialog && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-slate-800 border border-slate-600 rounded-xl p-6 w-full max-w-md">
                        <h3 className="text-lg font-bold text-white mb-4">Install Plugin</h3>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-400 mb-1">Plugin Path</label>
                                <input
                                    type="text"
                                    value={installPath}
                                    onChange={(e) => setInstallPath(e.target.value)}
                                    placeholder="Path to plugin directory or .zip file"
                                    className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white focus:border-emerald-500 focus:outline-none"
                                />
                                <p className="text-xs text-slate-500 mt-1">
                                    Enter the path to a plugin directory containing a package.json manifest file
                                </p>
                            </div>
                        </div>
                        <div className="flex gap-3 mt-6">
                            <button
                                onClick={() => setShowInstallDialog(false)}
                                className="flex-1 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
                                disabled={loading}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleInstallPlugin}
                                disabled={loading || !installPath.trim()}
                                className="flex-1 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
                            >
                                {loading ? 'Installing...' : 'Install'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};