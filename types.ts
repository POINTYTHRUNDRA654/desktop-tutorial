
export enum AppMode {
  LIVE_ASSIST = 'LIVE_ASSIST',
  RESEARCH = 'RESEARCH',
  SYSTEM_OPS = 'SYSTEM_OPS',
  CHAT_BOT = 'CHAT_BOT',
  IMAGE_STUDIO = 'IMAGE_STUDIO',
  VISION_ANALYSIS = 'VISION_ANALYSIS',
  BLENDER_BRIDGE = 'BLENDER_BRIDGE',
  DISCORD_BOT_GEN = 'DISCORD_BOT_GEN',
  SOFTWARE_AUDIT = 'SOFTWARE_AUDIT',
  TEXTURE_TOOLS = 'TEXTURE_TOOLS',
  RTX_REMIX = 'RTX_REMIX',
  MOD_INTEGRATION = 'MOD_INTEGRATION',
  NIF_TOOLS = 'NIF_TOOLS',
  GIMP_ASSISTANT = 'GIMP_ASSISTANT',
  SHADERMAP = 'SHADERMAP',
  PHOTOPEA = 'PHOTOPEA',
  UPSCAYL = 'UPSCAYL',
  MATERIALIZE = 'MATERIALIZE',
  FALLOUT_ARCHITECT = 'FALLOUT_ARCHITECT',
  MASTER_GUIDE = 'MASTER_GUIDE'
}

export enum SoftwareContext {
  GENERAL = 'General PC Use',
  FALLOUT_4_CK = 'Fallout 4 Creation Kit',
  BLENDER = 'Blender 3D',
  NIFSKOPE = 'NifSkope',
  XEDIT = 'FO4Edit (xEdit)',
  VISUAL_STUDIO = 'Visual Studio (Papyrus)',
}

export interface LogEntry {
  timestamp: string;
  sender: 'user' | 'ai' | 'system';
  message: string;
  type?: 'text' | 'code' | 'search-result' | 'image';
  metadata?: any;
}

export interface GroundingChunk {
  web?: {
    uri: string;
    title: string;
  };
}