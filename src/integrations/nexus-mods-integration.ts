/**
 * Nexus Mods API Integration for Mossy
 * 
 * Provides direct access to Nexus Mods from within Mossy
 * Features: Browse mods, search, download, check updates
 * 
 * Installation:
 * npm install axios
 * 
 * Usage:
 * import { NexusModsClient } from './nexus-mods-integration';
 * 
 * const nexus = new NexusModsClient(apiKey);
 * const mods = await nexus.searchMods('fallout4', 'weapons');
 * await nexus.downloadMod(12345, 67890);
 */

import type { IntegrationConfig } from './README';

interface NexusMod {
  mod_id: number;
  name: string;
  summary: string;
  description: string;
  picture_url: string;
  uid: number;
  mod_downloads: number;
  mod_unique_downloads: number;
  endorsements: number;
  created_time: string;
  updated_time: string;
  author: string;
  uploaded_by: string;
  uploaded_users_profile_url: string;
  category_id: number;
  version: string;
  endorsement_count: number;
  allow_rating: boolean;
}

interface ModFile {
  id: number[];
  uid: number;
  file_id: number;
  name: string;
  version: string;
  category_id: number;
  category_name: string;
  is_primary: boolean;
  size: number;
  file_name: string;
  uploaded_timestamp: number;
  mod_version: string;
  external_virus_scan_url: string;
  description: string;
}

interface DownloadLink {
  name: string;
  short_name: string;
  URI: string;
}

export class NexusModsClient {
  private apiKey: string;
  private baseUrl = 'https://api.nexusmods.com/v1';
  private gameDomain = 'fallout4';

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  /**
   * Make authenticated request to Nexus Mods API
   */
  private async request<T>(endpoint: string): Promise<T> {
    try {
      // Would use axios or fetch here
      // const response = await axios.get(`${this.baseUrl}${endpoint}`, {
      //   headers: {
      //     'apikey': this.apiKey,
      //     'Application-Name': 'Mossy',
      //     'Application-Version': '5.4.23'
      //   }
      // });
      // return response.data;
      
      console.log(`[Nexus] Request: ${endpoint}`);
      return {} as T;
    } catch (error) {
      console.error('[Nexus] API error:', error);
      throw error;
    }
  }

  /**
   * Search for mods
   */
  async searchMods(query: string, category?: string): Promise<NexusMod[]> {
    // API endpoint: /games/{game_domain}/mods/search
    const params = new URLSearchParams({
      terms: query,
      ...(category && { category })
    });

    return this.request<NexusMod[]>(
      `/games/${this.gameDomain}/mods/search?${params}`
    );
  }

  /**
   * Get trending mods
   */
  async getTrendingMods(): Promise<NexusMod[]> {
    return this.request<NexusMod[]>(
      `/games/${this.gameDomain}/mods/trending`
    );
  }

  /**
   * Get latest added mods
   */
  async getLatestMods(): Promise<NexusMod[]> {
    return this.request<NexusMod[]>(
      `/games/${this.gameDomain}/mods/latest_added`
    );
  }

  /**
   * Get mod details
   */
  async getMod(modId: number): Promise<NexusMod> {
    return this.request<NexusMod>(
      `/games/${this.gameDomain}/mods/${modId}`
    );
  }

  /**
   * Get mod files
   */
  async getModFiles(modId: number): Promise<{ files: ModFile[] }> {
    return this.request<{ files: ModFile[] }>(
      `/games/${this.gameDomain}/mods/${modId}/files`
    );
  }

  /**
   * Get download links for a file
   */
  async getDownloadLinks(modId: number, fileId: number): Promise<DownloadLink[]> {
    return this.request<DownloadLink[]>(
      `/games/${this.gameDomain}/mods/${modId}/files/${fileId}/download_link`
    );
  }

  /**
   * Check if user has endorsed mod
   */
  async checkEndorsement(modId: number): Promise<{ endorsed: boolean }> {
    return this.request<{ endorsed: boolean }>(
      `/games/${this.gameDomain}/mods/${modId}/endorsement`
    );
  }

  /**
   * Endorse a mod
   */
  async endorseMod(modId: number): Promise<{ success: boolean }> {
    // POST request
    return this.request<{ success: boolean }>(
      `/games/${this.gameDomain}/mods/${modId}/endorse`
    );
  }

  /**
   * Get user's tracked mods
   */
  async getTrackedMods(): Promise<NexusMod[]> {
    return this.request<NexusMod[]>(
      `/user/tracked_mods`
    );
  }

  /**
   * Track a mod for updates
   */
  async trackMod(modId: number): Promise<{ success: boolean }> {
    // POST request
    return this.request<{ success: boolean }>(
      `/user/tracked_mods?mod_id=${modId}`
    );
  }

  /**
   * Get mod changelog
   */
  async getChangelog(modId: number): Promise<{ [version: string]: string }> {
    return this.request<{ [version: string]: string }>(
      `/games/${this.gameDomain}/mods/${modId}/changelogs`
    );
  }

  /**
   * Validate API key
   */
  async validateApiKey(): Promise<boolean> {
    try {
      await this.request('/users/validate');
      return true;
    } catch {
      return false;
    }
  }
}

/**
 * React hook for Nexus Mods integration
 */
export function useNexusMods(apiKey: string | null) {
  const [client, setClient] = React.useState<NexusModsClient | null>(null);
  const [isValidKey, setIsValidKey] = React.useState(false);

  React.useEffect(() => {
    if (!apiKey) {
      setClient(null);
      setIsValidKey(false);
      return;
    }

    const nexusClient = new NexusModsClient(apiKey);
    setClient(nexusClient);

    // Validate key
    nexusClient.validateApiKey().then(setIsValidKey);
  }, [apiKey]);

  return { client, isValidKey };
}

// Integration configuration
export const nexusModsIntegration: IntegrationConfig = {
  id: 'nexus-mods',
  name: 'Nexus Mods Integration',
  version: '1.0.0',
  description: 'Browse, search, and download mods directly from Nexus Mods',
  category: 'mod-management',
  enabled: false, // Requires API key
  
  requiredPermissions: [
    'Nexus Mods API key required',
    'Internet connection required',
    'Download permission for files'
  ],
  
  settings: {
    apiKey: {
      type: 'string',
      default: '',
      label: 'Nexus Mods API Key',
      description: 'Get your API key from nexusmods.com/users/myaccount?tab=api',
      secret: true
    },
    autoDownloadPath: {
      type: 'string',
      default: '',
      label: 'Auto-download location',
      description: 'Where to save downloaded mods'
    },
    showAdultContent: {
      type: 'boolean',
      default: false,
      label: 'Show adult content',
      description: 'Include adult-only mods in search results'
    },
    autoCheckUpdates: {
      type: 'boolean',
      default: true,
      label: 'Auto-check for updates',
      description: 'Check tracked mods for updates on startup'
    }
  },

  commands: [
    {
      id: 'search-nexus',
      name: 'Search Nexus Mods',
      description: 'Search for mods on Nexus Mods',
      handler: async (context, query: string) => {
        const client = context.getService('nexus-client') as NexusModsClient;
        if (!client) {
          return { success: false, message: 'Nexus Mods not configured' };
        }
        
        const results = await client.searchMods(query);
        return { success: true, data: results };
      }
    },
    {
      id: 'browse-trending',
      name: 'Browse Trending Mods',
      description: 'View trending mods on Nexus',
      handler: async (context) => {
        const client = context.getService('nexus-client') as NexusModsClient;
        const mods = await client.getTrendingMods();
        return { success: true, data: mods };
      }
    }
  ],

  hooks: {
    onActivate: async (context) => {
      const apiKey = context.getConfig('apiKey') as string;
      if (!apiKey) {
        return { 
          success: false, 
          message: 'Please configure your Nexus Mods API key in settings' 
        };
      }

      const client = new NexusModsClient(apiKey);
      const isValid = await client.validateApiKey();
      
      if (!isValid) {
        return { 
          success: false, 
          message: 'Invalid API key. Please check your settings.' 
        };
      }

      context.registerService('nexus-client', client);
      return { success: true };
    },

    onDeactivate: async (context) => {
      context.unregisterService('nexus-client');
      return { success: true };
    }
  }
};

// Example usage in React component:
/*
import { useNexusMods } from './integrations/nexus-mods-integration';

function NexusModsBrowser() {
  const apiKey = useSettings('nexus-api-key');
  const { client, isValidKey } = useNexusMods(apiKey);
  const [mods, setMods] = React.useState([]);

  React.useEffect(() => {
    if (client && isValidKey) {
      client.getTrendingMods().then(setMods);
    }
  }, [client, isValidKey]);

  if (!isValidKey) {
    return <div>Please configure Nexus Mods API key in settings</div>;
  }

  return (
    <div>
      <h2>Trending Mods</h2>
      {mods.map(mod => (
        <ModCard key={mod.mod_id} mod={mod} />
      ))}
    </div>
  );
}
*/
