/**
 * Discord Rich Presence Integration for Mossy
 * 
 * Displays current modding activity in Discord
 * Shows: Module in use, file being edited, elapsed time
 * 
 * Installation:
 * npm install discord-rpc
 * 
 * Usage:
 * import { DiscordPresence } from './discord-presence-integration';
 * 
 * const presence = new DiscordPresence();
 * await presence.initialize();
 * presence.updateActivity('Editing textures in GIMP', 'image-editing');
 */

import type { IntegrationConfig } from './README';

// This would normally import from discord-rpc
// For now, showing the interface
interface Client {
  on(event: string, listener: (...args: any[]) => void): this;
  login(options: { clientId: string }): Promise<void>;
  setActivity(activity: Activity): Promise<void>;
  clearActivity(): Promise<void>;
  destroy(): Promise<void>;
}

interface Activity {
  details?: string;
  state?: string;
  startTimestamp?: number;
  endTimestamp?: number;
  largeImageKey?: string;
  largeImageText?: string;
  smallImageKey?: string;
  smallImageText?: string;
  partyId?: string;
  partySize?: number;
  partyMax?: number;
  matchSecret?: string;
  joinSecret?: string;
  spectateSecret?: string;
  instance?: boolean;
  buttons?: Array<{ label: string; url: string }>;
}

export class DiscordPresence {
  private client: Client | null = null;
  private clientId = '1234567890123456789'; // Replace with actual Discord App ID
  private startTime = Date.now();
  private currentActivity: string | null = null;
  private enabled = true;

  /**
   * Initialize Discord RPC connection
   */
  async initialize(): Promise<boolean> {
    if (!this.enabled) return false;

    try {
      // Would use: const DiscordRPC = require('discord-rpc');
      // this.client = new DiscordRPC.Client({ transport: 'ipc' });
      
      console.log('[Discord] Initializing Rich Presence...');
      
      // this.client.on('ready', () => {
      //   console.log('[Discord] Rich Presence ready');
      //   this.setDefaultActivity();
      // });

      // await this.client.login({ clientId: this.clientId });
      
      return true;
    } catch (error) {
      console.error('[Discord] Failed to initialize:', error);
      return false;
    }
  }

  /**
   * Update Discord activity based on what user is doing
   */
  async updateActivity(details: string, activity: string): Promise<void> {
    if (!this.client || !this.enabled) return;

    this.currentActivity = activity;

    const activityData: Activity = {
      details,
      state: this.getStateText(activity),
      startTimestamp: this.startTime,
      largeImageKey: 'mossy-logo',
      largeImageText: 'Mossy v5.4.23',
      smallImageKey: this.getSmallIcon(activity),
      smallImageText: this.getActivityName(activity),
      instance: false,
      buttons: [
        { label: 'Get Mossy', url: 'https://github.com/POINTYTHRUNDRA654/desktop-tutorial' }
      ]
    };

    try {
      await this.client.setActivity(activityData);
      console.log('[Discord] Updated activity:', details);
    } catch (error) {
      console.error('[Discord] Failed to update activity:', error);
    }
  }

  /**
   * Clear current activity
   */
  async clearActivity(): Promise<void> {
    if (!this.client) return;

    try {
      await this.client.clearActivity();
      this.currentActivity = null;
    } catch (error) {
      console.error('[Discord] Failed to clear activity:', error);
    }
  }

  /**
   * Set default idle activity
   */
  private async setDefaultActivity(): Promise<void> {
    await this.updateActivity('Modding Fallout 4', 'idle');
  }

  /**
   * Get state text based on activity
   */
  private getStateText(activity: string): string {
    const states: Record<string, string> = {
      'blender': 'Working in Blender',
      'creation-kit': 'Using Creation Kit',
      'xedit': 'Editing with xEdit',
      'papyrus': 'Writing Papyrus scripts',
      'texture-editing': 'Editing textures',
      'image-editing': 'Creating assets',
      'testing': 'Testing mod',
      'idle': 'In Mossy Dashboard',
      'chat': 'Talking to Mossy AI',
      'analyzing': 'Analyzing mod files',
    };

    return states[activity] || 'Modding Fallout 4';
  }

  /**
   * Get small icon based on activity
   */
  private getSmallIcon(activity: string): string {
    const icons: Record<string, string> = {
      'blender': 'blender-icon',
      'creation-kit': 'ck-icon',
      'xedit': 'xedit-icon',
      'papyrus': 'code-icon',
      'texture-editing': 'image-icon',
      'image-editing': 'paint-icon',
      'testing': 'test-icon',
      'idle': 'mossy-small',
      'chat': 'chat-icon',
      'analyzing': 'search-icon',
    };

    return icons[activity] || 'mossy-small';
  }

  /**
   * Get activity display name
   */
  private getActivityName(activity: string): string {
    const names: Record<string, string> = {
      'blender': 'Blender',
      'creation-kit': 'Creation Kit',
      'xedit': 'xEdit',
      'papyrus': 'Papyrus',
      'texture-editing': 'Texture Editor',
      'image-editing': 'Image Editor',
      'testing': 'Testing',
      'idle': 'Dashboard',
      'chat': 'AI Chat',
      'analyzing': 'Analysis',
    };

    return names[activity] || 'Mossy';
  }

  /**
   * Update based on Neural Link detection
   */
  async updateFromNeuralLink(detectedTool: string | null): Promise<void> {
    if (!detectedTool) {
      await this.updateActivity('Browsing Mossy', 'idle');
      return;
    }

    const toolMap: Record<string, { detail: string; activity: string }> = {
      'blender.exe': {
        detail: 'Modeling in Blender',
        activity: 'blender'
      },
      'CreationKit.exe': {
        detail: 'Building in Creation Kit',
        activity: 'creation-kit'
      },
      'FO4Edit.exe': {
        detail: 'Editing with xEdit',
        activity: 'xedit'
      },
      'NifSkope.exe': {
        detail: 'Inspecting mesh files',
        activity: 'analyzing'
      },
    };

    const mapping = toolMap[detectedTool];
    if (mapping) {
      await this.updateActivity(mapping.detail, mapping.activity);
    }
  }

  /**
   * Enable/disable presence
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    if (!enabled) {
      this.clearActivity();
    }
  }

  /**
   * Cleanup on app exit
   */
  async destroy(): Promise<void> {
    if (this.client) {
      await this.clearActivity();
      await this.client.destroy();
      this.client = null;
    }
  }
}

// Integration configuration
export const discordIntegration: IntegrationConfig = {
  id: 'discord-presence',
  name: 'Discord Rich Presence',
  version: '1.0.0',
  description: 'Show your Fallout 4 modding activity in Discord',
  category: 'social',
  enabled: true,
  
  requiredPermissions: [
    'Discord must be running',
    'Internet connection required'
  ],
  
  settings: {
    enabled: {
      type: 'boolean',
      default: true,
      label: 'Enable Discord Rich Presence',
      description: 'Show what you\'re working on in Discord'
    },
    showFileName: {
      type: 'boolean',
      default: false,
      label: 'Show file names',
      description: 'Display the name of the file you\'re editing (privacy consideration)'
    },
    showElapsedTime: {
      type: 'boolean',
      default: true,
      label: 'Show elapsed time',
      description: 'Display how long you\'ve been modding'
    }
  },

  commands: [
    {
      id: 'toggle-presence',
      name: 'Toggle Discord Presence',
      description: 'Enable or disable Discord Rich Presence',
      handler: async (context) => {
        const presence = context.getService('discord-presence') as DiscordPresence;
        const currentState = context.getConfig('enabled');
        presence.setEnabled(!currentState);
        context.setConfig('enabled', !currentState);
        return {
          success: true,
          message: `Discord Presence ${!currentState ? 'enabled' : 'disabled'}`
        };
      }
    }
  ],

  hooks: {
    onActivate: async (context) => {
      console.log('[Discord Integration] Activating...');
      const presence = new DiscordPresence();
      await presence.initialize();
      context.registerService('discord-presence', presence);
      return { success: true };
    },

    onDeactivate: async (context) => {
      console.log('[Discord Integration] Deactivating...');
      const presence = context.getService('discord-presence') as DiscordPresence;
      await presence.destroy();
      return { success: true };
    },

    onToolDetected: async (context, tool) => {
      const presence = context.getService('discord-presence') as DiscordPresence;
      await presence.updateFromNeuralLink(tool);
    }
  }
};

// Example usage in main app:
/*
import { DiscordPresence } from './integrations/discord-presence-integration';

// Initialize on app start
const discordPresence = new DiscordPresence();
await discordPresence.initialize();

// Update when user changes activity
discordPresence.updateActivity('Editing NIF mesh', 'blender');

// Integrate with Neural Link
neuralLink.on('toolDetected', (tool) => {
  discordPresence.updateFromNeuralLink(tool);
});

// Cleanup on exit
app.on('will-quit', async () => {
  await discordPresence.destroy();
});
*/

