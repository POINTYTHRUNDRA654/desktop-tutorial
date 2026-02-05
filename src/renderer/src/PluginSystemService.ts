import { cacheManager, CacheManager } from './CacheManager';

export interface PluginManifest {
    id: string;
    name: string;
    version: string;
    description: string;
    author: string;
    homepage?: string;
    repository?: string;
    license?: string;
    main: string; // Entry point file
    activationEvents: string[]; // When to activate the plugin
    contributes: {
        commands?: PluginCommand[];
        aiExtensions?: AIExtension[];
        uiComponents?: UIComponent[];
        settings?: PluginSetting[];
    };
    dependencies?: Record<string, string>;
    engines: {
        mossy: string; // Minimum Mossy version
    };
}

export interface PluginCommand {
    command: string;
    title: string;
    category?: string;
    icon?: string;
}

export interface AIExtension {
    id: string;
    name: string;
    description: string;
    capabilities: string[]; // e.g., ['chat', 'completion', 'embedding']
    parameters: Record<string, any>;
    endpoint?: string;
    apiKey?: string;
}

export interface UIComponent {
    id: string;
    name: string;
    type: 'panel' | 'button' | 'menu' | 'toolbar';
    location: string; // Where to place the component
    priority?: number;
}

export interface PluginSetting {
    key: string;
    type: 'string' | 'number' | 'boolean' | 'array' | 'object';
    title: string;
    description?: string;
    default?: any;
    enum?: any[];
    minimum?: number;
    maximum?: number;
}

export interface PluginInstance {
    manifest: PluginManifest;
    isActive: boolean;
    isLoaded: boolean;
    module?: any; // The loaded plugin module
    activationContext?: any;
    settings: Record<string, any>;
}

export interface PluginContext {
    mossy: {
        version: string;
        api: PluginAPI;
    };
    workspace: {
        rootPath: string;
        getConfiguration: (key: string) => any;
        updateConfiguration: (key: string, value: any) => Promise<void>;
    };
}

export interface PluginAPI {
    // AI-related APIs
    ai: {
        registerExtension: (extension: AIExtension) => void;
        unregisterExtension: (extensionId: string) => void;
        enhancePrompt: (prompt: string, context: any) => Promise<string>;
        generateCompletion: (prompt: string, options?: any) => Promise<string>;
    };

    // UI-related APIs
    ui: {
        registerComponent: (component: UIComponent, render: () => React.ReactElement) => void;
        unregisterComponent: (componentId: string) => void;
        showNotification: (message: string, type?: 'info' | 'warning' | 'error') => void;
        openPanel: (panelId: string, data?: any) => void;
    };

    // Command system
    commands: {
        registerCommand: (command: string, handler: (...args: any[]) => any) => void;
        unregisterCommand: (command: string) => void;
        executeCommand: (command: string, ...args: any[]) => Promise<any>;
    };

    // Data persistence
    storage: {
        get: (key: string) => Promise<any>;
        set: (key: string, value: any) => Promise<void>;
        delete: (key: string) => Promise<void>;
    };

    // Event system
    events: {
        on: (event: string, handler: (...args: any[]) => void) => void;
        off: (event: string, handler: (...args: any[]) => void) => void;
        emit: (event: string, ...args: any[]) => void;
    };
}

export class PluginSystemService {
    private cacheManager: CacheManager;
    private plugins: Map<string, PluginInstance> = new Map();
    private pluginContexts: Map<string, PluginContext> = new Map();
    private listeners: Set<(event: string, data: any) => void> = new Set();
    private api: PluginAPI;

    constructor(cacheManager: CacheManager) {
        this.cacheManager = cacheManager;
        this.api = this.createMainAPI();
        this.loadPlugins();
    }

    // Event system
    addListener(callback: (event: string, data: any) => void) {
        this.listeners.add(callback);
    }

    removeListener(callback: (event: string, data: any) => void) {
        this.listeners.delete(callback);
    }

    private emit(event: string, data: any) {
        this.listeners.forEach(listener => listener(event, data));
    }

    // Plugin management
    async installPlugin(pluginPath: string): Promise<string> {
        try {
            // Load manifest
            const manifestPath = `${pluginPath}/package.json`;
            const manifestResponse = await fetch(manifestPath);
            const manifest: PluginManifest = await manifestResponse.json();

            // Validate manifest
            this.validateManifest(manifest);

            // Create plugin instance
            const plugin: PluginInstance = {
                manifest,
                isActive: false,
                isLoaded: false,
                settings: this.getDefaultSettings(manifest)
            };

            // Load settings from cache
            const cachedSettings = await this.cacheManager.get('user-sessions', `plugin_settings_${manifest.id}`);
            if (cachedSettings && typeof cachedSettings === 'string') {
                plugin.settings = { ...plugin.settings, ...JSON.parse(cachedSettings) };
            }

            this.plugins.set(manifest.id, plugin);
            await this.savePluginList();

            this.emit('pluginInstalled', plugin);
            return manifest.id;

        } catch (error) {
            throw new Error(`Failed to install plugin from ${pluginPath}: ${(error as Error).message}`);
        }
    }

    async uninstallPlugin(pluginId: string): Promise<void> {
        const plugin = this.plugins.get(pluginId);
        if (!plugin) throw new Error(`Plugin ${pluginId} not found`);

        // Deactivate if active
        if (plugin.isActive) {
            await this.deactivatePlugin(pluginId);
        }

        // Clean up settings
        await this.cacheManager.delete('user-sessions', `plugin_settings_${pluginId}`);

        this.plugins.delete(pluginId);
        await this.savePluginList();

        this.emit('pluginUninstalled', pluginId);
    }

    async activatePlugin(pluginId: string): Promise<void> {
        const plugin = this.plugins.get(pluginId);
        if (!plugin) throw new Error(`Plugin ${pluginId} not found`);
        if (plugin.isActive) return;

        try {
            // Load the plugin module
            const modulePath = `${plugin.manifest.main}`;
            const module = await this.loadPluginModule(modulePath);

            plugin.module = module;
            plugin.isLoaded = true;

            // Create plugin context
            const context: PluginContext = {
                mossy: {
                    version: '4.0.0', // Should be dynamic
                    api: this.createPluginAPI(pluginId)
                },
                workspace: {
                    rootPath: process.cwd(),
                    getConfiguration: (key: string) => plugin.settings[key],
                    updateConfiguration: async (key: string, value: any) => {
                        plugin.settings[key] = value;
                        await this.savePluginSettings(pluginId, plugin.settings);
                    }
                }
            };

            plugin.activationContext = context;
            this.pluginContexts.set(pluginId, context);

            // Call activate function if it exists
            if (typeof module.activate === 'function') {
                await module.activate(context);
            }

            plugin.isActive = true;
            this.emit('pluginActivated', plugin);

        } catch (error) {
            plugin.isLoaded = false;
            throw new Error(`Failed to activate plugin ${pluginId}: ${(error as Error).message}`);
        }
    }

    async deactivatePlugin(pluginId: string): Promise<void> {
        const plugin = this.plugins.get(pluginId);
        if (!plugin || !plugin.isActive) return;

        try {
            // Call deactivate function if it exists
            if (plugin.module && typeof plugin.module.deactivate === 'function') {
                await plugin.module.deactivate(plugin.activationContext);
            }

            plugin.isActive = false;
            plugin.isLoaded = false;
            plugin.module = undefined;
            plugin.activationContext = undefined;

            this.pluginContexts.delete(pluginId);
            this.emit('pluginDeactivated', plugin);

        } catch (error) {
            console.error(`Error deactivating plugin ${pluginId}:`, error);
        }
    }

    // Plugin discovery and loading
    private async loadPluginModule(modulePath: string): Promise<any> {
        // In a real implementation, this would use dynamic imports
        // For now, we'll simulate loading
        try {
            // This is a placeholder - actual implementation would use import() or require()
            const module = await import(/* webpackIgnore: true */ modulePath);
            return module;
        } catch (error) {
            // Fallback for development - create a mock module
            console.warn(`Plugin module ${modulePath} not found, using mock implementation`);
            return {
                activate: async (context: PluginContext) => {
                    console.log(`Mock plugin activated with context:`, context);
                },
                deactivate: async () => {
                    console.log('Mock plugin deactivated');
                }
            };
        }
    }

    // Validation
    private validateManifest(manifest: PluginManifest): void {
        if (!manifest.id || !manifest.name || !manifest.version) {
            throw new Error('Plugin manifest missing required fields: id, name, version');
        }

        if (!manifest.main) {
            throw new Error('Plugin manifest missing main entry point');
        }

        if (!manifest.engines?.mossy) {
            throw new Error('Plugin manifest missing Mossy engine requirement');
        }

        // Version compatibility check would go here
    }

    private getDefaultSettings(manifest: PluginManifest): Record<string, any> {
        const settings: Record<string, any> = {};

        if (manifest.contributes?.settings) {
            manifest.contributes.settings.forEach(setting => {
                settings[setting.key] = setting.default;
            });
        }

        return settings;
    }

    // Persistence
    private async loadPlugins(): Promise<void> {
        try {
            const pluginList = await this.cacheManager.get('user-sessions', 'installedPlugins');
            if (pluginList && typeof pluginList === 'string') {
                const plugins = JSON.parse(pluginList);
                for (const [id, pluginData] of Object.entries(plugins)) {
                    this.plugins.set(id, pluginData as PluginInstance);
                }
            }
        } catch (error) {
            console.error('Failed to load plugins:', error);
        }
    }

    private async savePluginList(): Promise<void> {
        try {
            const pluginData = Object.fromEntries(this.plugins);
            await this.cacheManager.set('user-sessions', 'installedPlugins', JSON.stringify(pluginData));
        } catch (error) {
            console.error('Failed to save plugin list:', error);
        }
    }

    private async savePluginSettings(pluginId: string, settings: Record<string, any>): Promise<void> {
        try {
            await this.cacheManager.set('user-sessions', `plugin_settings_${pluginId}`, JSON.stringify(settings));
        } catch (error) {
            console.error('Failed to save plugin settings:', error);
        }
    }

    private createMainAPI(): PluginAPI {
        return {
            ai: {
                registerExtension: (extension: AIExtension) => {
                    this.emit('aiExtensionRegistered', extension);
                },
                unregisterExtension: (extensionId: string) => {
                    this.emit('aiExtensionUnregistered', extensionId);
                },
                enhancePrompt: async (prompt: string, context: any) => {
                    // Implementation
                    return prompt;
                },
                generateCompletion: async (prompt: string, options?: any) => {
                    // Implementation
                    return '';
                }
            },
            ui: {
                registerComponent: (component: UIComponent, render: () => React.ReactElement) => {
                    this.emit('uiComponentRegistered', { component, render });
                },
                unregisterComponent: (componentId: string) => {
                    this.emit('uiComponentUnregistered', componentId);
                },
                showNotification: (message: string, type: 'info' | 'warning' | 'error' = 'info') => {
                    this.emit('showNotification', { message, type });
                },
                openPanel: (panelId: string, data?: any) => {
                    this.emit('openPanel', { panelId, data });
                }
            },
            commands: {
                registerCommand: (command: string, handler: (...args: any[]) => any) => {
                    this.emit('commandRegistered', { command, handler });
                },
                unregisterCommand: (command: string) => {
                    this.emit('commandUnregistered', command);
                },
                executeCommand: async (command: string, ...args: any[]) => {
                    this.emit('commandExecuted', { command, args });
                }
            },
            workspace: {
                getConfiguration: (key: string) => {
                    // Global configuration
                    return null;
                },
                updateConfiguration: async (key: string, value: any) => {
                    // Global configuration update
                }
            },
            storage: {
                get: async (key: string) => {
                    // Global storage
                    return null;
                },
                set: async (key: string, value: any) => {
                    // Global storage
                },
                delete: async (key: string) => {
                    // Global storage
                }
            },
            events: {
                on: (event: string, handler: (...args: any[]) => void) => {
                    this.addListener((e, data) => {
                        if (e === event) handler(data);
                    });
                },
                off: (event: string, handler: (...args: any[]) => void) => {
                    // Implementation for removing listeners
                },
                emit: (event: string, ...args: any[]) => {
                    this.emit(event, args);
                }
            }
        };
    }

    private createPluginAPI(pluginId: string): PluginAPI {
        return {
            ai: {
                registerExtension: (extension: AIExtension) => {
                    this.emit('aiExtensionRegistered', extension);
                },
                unregisterExtension: (extensionId: string) => {
                    this.emit('aiExtensionUnregistered', extensionId);
                },
                enhancePrompt: async (prompt: string, context: any) => {
                    // This would integrate with the AI system
                    return prompt; // Placeholder
                },
                generateCompletion: async (prompt: string, options?: any) => {
                    // This would call the AI system
                    return 'Mock AI response'; // Placeholder
                }
            },

            ui: {
                registerComponent: (component: UIComponent, render: () => React.ReactElement) => {
                    this.emit('uiComponentRegistered', { component, render });
                },
                unregisterComponent: (componentId: string) => {
                    this.emit('uiComponentUnregistered', componentId);
                },
                showNotification: (message: string, type: 'info' | 'warning' | 'error' = 'info') => {
                    this.emit('showNotification', { message, type });
                },
                openPanel: (panelId: string, data?: any) => {
                    this.emit('openPanel', { panelId, data });
                }
            },

            commands: {
                registerCommand: (command: string, handler: (...args: any[]) => any) => {
                    this.emit('commandRegistered', { command, handler });
                },
                unregisterCommand: (command: string) => {
                    this.emit('commandUnregistered', command);
                },
                executeCommand: async (command: string, ...args: any[]) => {
                    this.emit('commandExecuted', { command, args });
                    // Placeholder - would execute registered commands
                    return null;
                }
            },

            storage: {
                get: async (key: string) => {
                    return await this.cacheManager.get('user-sessions', `plugin_storage_${pluginId}_${key}`);
                },
                set: async (key: string, value: any) => {
                    await this.cacheManager.set('user-sessions', `plugin_storage_${pluginId}_${key}`, JSON.stringify(value));
                },
                delete: async (key: string) => {
                    await this.cacheManager.delete('user-sessions', `plugin_storage_${pluginId}_${key}`);
                }
            },

            events: {
                on: (event: string, handler: (...args: any[]) => void) => {
                    this.listeners.add((e, data) => {
                        if (e === event) handler(data);
                    });
                },
                off: (event: string, handler: (...args: any[]) => void) => {
                    // Note: This is a simplified implementation
                    // In a real system, we'd need to track handlers per plugin
                },
                emit: (event: string, ...args: any[]) => {
                    this.emit(event, args);
                }
            }
        };
    }

    // Public API
    getPlugin(pluginId: string): PluginInstance | undefined {
        return this.plugins.get(pluginId);
    }

    getAllPlugins(): PluginInstance[] {
        return Array.from(this.plugins.values());
    }

    getActivePlugins(): PluginInstance[] {
        return this.getAllPlugins().filter(p => p.isActive);
    }

    getPluginContext(pluginId: string): PluginContext | undefined {
        return this.pluginContexts.get(pluginId);
    }

    // Plugin marketplace/discovery (placeholder)
    async discoverPlugins(): Promise<PluginManifest[]> {
        // This would query a plugin registry
        // For now, return empty array
        return [];
    }

    async updatePlugin(pluginId: string): Promise<void> {
        // Implementation for updating plugins
        this.emit('pluginUpdated', pluginId);
    }
}

// Factory function for creating service instances
export const createPluginSystemService = (cacheManagerInstance: any): PluginSystemService => {
    return new PluginSystemService(cacheManagerInstance);
};

// Singleton instance - only created when accessed
let _singletonInstance: PluginSystemService | null = null;

export const getPluginSystemService = (): PluginSystemService => {
    if (!_singletonInstance) {
        _singletonInstance = new PluginSystemService(cacheManager);
    }
    return _singletonInstance;
};