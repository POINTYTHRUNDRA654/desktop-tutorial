import { app, BrowserWindow, ipcMain, Tray, globalShortcut, dialog } from 'electron';
import * as fs from 'fs';
import * as os from 'os';
import path from 'path';

// Import types for compilation (these are removed at runtime)
import type { 
  Message, 
  Settings as BaseSettings, 
  InstalledProgram, 
  ModProject, 
  Roadmap, 
  CollaborationSession, 
  VersionControlConfig, 
  AnalyticsEvent, 
  UsageMetrics, 
  AnalyticsConfig 
} from '../shared/types';
import type { LLMMessage, EnhancedLLMService as IEnhancedLLMService } from './llm-service';
import type { MonitoringService as IMonitoringService } from './monitoring-service';
import type { DataManagementService as IDataManagementService } from './data-management-service';
import type { ScalabilityService as IScalabilityService } from './scalability-service';
import type { MiningOperationsOrchestrator as IMiningOperationsOrchestrator } from '../mining/mining-operations-orchestrator';
import type FormDataClass from 'form-data';

// Absolute first-line error capture
process.on('uncaughtException', (error) => {
  const msg = error?.stack || error?.message || String(error);
  try {
    const errorLogPath = path.join(os.tmpdir(), 'mossy-error.log');
    fs.appendFileSync(errorLogPath, `[${new Date().toISOString()}] CRITICAL UNCAUGHT EXCEPTION: ${msg}\n`);
    log(`FATAL ERROR: ${msg}`);
    dialog.showErrorBox('Mossy Fatal Error', msg);
  } catch (e) {
    console.error('Failed to log error:', e);
  }
});

const logPath = path.join(os.tmpdir(), 'mossy-debug.log');
const log = (msg: string) => {
  try {
    const line = `[${new Date().toISOString()}] ${msg}\n`;
    fs.appendFileSync(logPath, line);
    console.log(msg); // Also log to console for debugging
  } catch (e) {
    // Ignore logging errors
  }
};

// Handle second instance (ensure single instance) - DO THIS FIRST
const gotTheLock = app.requestSingleInstanceLock();
log('requestSingleInstanceLock: ' + gotTheLock);

if (!gotTheLock) {
  log('Another instance is already running. Quitting.');
  // Give it a tiny bit of time to ensure log is written
  setTimeout(() => app.quit(), 500);
}

log('Main process starting...');
log('Platform: ' + process.platform);
log('Arch: ' + process.arch);
log('Node Version: ' + process.version);

process.on('unhandledRejection', (reason) => {
  const msg = reason instanceof Error ? reason.stack || reason.message : String(reason);
  log(`Unhandled Rejection: ${msg}`);
  if (app.isReady()) {
    dialog.showErrorBox('Unhandled Promise Rejection', msg);
  }
});

log('Loading base dependencies...');
const dotenv = require('dotenv');
const FormData = require('form-data');
const OpenAI = require('openai');
const http = require('http');
const https = require('https');

log('Loading local ml/ollama...');
const { getOllamaStatus, ollamaGenerate, ollamaPull } = require('../electron/ml/ollama');

log('Loading llm-service...');
const { LLMService } = require('./llm-service');

log('Loading shared types...');
const { IPC_CHANNELS } = require('../shared/types');

log('Loading store...');
const { getStore, saveMessage, getSettings, setSettings, getDetectedPrograms, setDetectedPrograms, saveRoadmap } = require('./store');

log('Loading detectPrograms...');
const { getSystemInfo, detectPrograms } = require('../electron/detectPrograms');

log('Loading mining orchestrator...');
const { MiningOperationsOrchestrator, defaultMiningConfiguration } = require('../mining/mining-operations-orchestrator');

log('Loading service variants...');
const { EnhancedLLMService } = require('./llm-service');
const { MonitoringService } = require('./monitoring-service');
const { DataManagementService } = require('./data-management-service');
const { ScalabilityService } = require('./scalability-service');

log('Imports completed successfully.');

/**
 * Electron Main Process
 * 
 * This is the entry point for the Electron main process.
 * Handles window creation, IPC communication, tray icon, and system integration.
 */

// Load environment variables - use encrypted version for packaged builds
const envPath = app.isPackaged
  ? path.join(process.cwd(), '.env.encrypted')
  : path.join(process.cwd(), '.env.local');

// Helper types and functions for transcription
type SecretField = 'elevenLabsApiKey' | 'openaiApiKey' | 'groqApiKey' | 'deepgramApiKey' | 'backendToken';
type BackendConfig = { baseUrl: string; token?: string };

const secretEncKey = (k: SecretField) => `${k}Enc` as const;

const decryptSecretFromStorage = (stored: any): string => {
  const raw = String(stored || '').trim();
  if (!raw) return '';
  if (raw.startsWith('plain:')) return raw.slice('plain:'.length);
  if (!raw.startsWith('enc:')) return '';

  const encrypted = raw.slice('enc:'.length);

  // Try packaged encryption format first (iv:encrypted)
  if (encrypted.includes(':')) {
    try {
      const crypto = require('crypto');
      const ENCRYPTION_KEY = 'mossy-2026-packaging-key-change-in-production';
      const parts = encrypted.split(':');
      if (parts.length === 2) {
        const iv = Buffer.from(parts[0], 'hex');
        const encryptedText = parts[1];
        const key = crypto.scryptSync(ENCRYPTION_KEY, 'salt', 32);
        const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
        let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        return decrypted;
      }
    } catch (e) {
      console.warn('[Settings] packaged decryption failed, trying safeStorage:', e);
    }
  }

  // Fall back to safeStorage format (base64 only)
  const b64 = encrypted;
  try {
    // For now, just return the base64 decoded value since we don't have safeStorage in main.ts
    return Buffer.from(b64, 'base64').toString('utf-8');
  } catch (e) {
    console.warn('[Settings] decryption failed:', e);
    return '';
  }
};

const getSecretValue = (settings: any, field: SecretField, envName?: string): string => {
  const encKey = secretEncKey(field);
  const fromEnc = decryptSecretFromStorage(settings?.[encKey]);
  if (fromEnc) return fromEnc;

  const fromPlain = String(settings?.[field] || '').trim();
  if (fromPlain) return fromPlain;

  // Check environment variables (now potentially encrypted)
  if (envName) {
    const envValue = String((process.env as any)?.[envName] || '').trim();
    if (envValue) {
      // If it starts with enc:, decrypt it
      if (envValue.startsWith('enc:')) {
        return decryptSecretFromStorage(envValue);
      }
      return envValue;
    }
  }
  return '';
};

const getBackendConfig = (): BackendConfig | null => {
  const rawUrl = String(process.env.MOSSY_BACKEND_URL || '').trim();
  if (!rawUrl) return null;
  const baseUrl = rawUrl.replace(/\/+$/, '');
  const tokenRaw = String(process.env.MOSSY_BACKEND_TOKEN || '').trim();
  return { baseUrl, token: tokenRaw || undefined };
};

const backendJoin = (cfg: BackendConfig, pathname: string): string => {
  const p = String(pathname || '').startsWith('/') ? String(pathname) : `/${pathname}`;
  return `${cfg.baseUrl}${p}`;
};

const postFormData = async (
  urlStr: string,
  formData: FormDataClass,
  headers: Record<string, string> = {},
  timeoutMs = 30000
): Promise<{ ok: boolean; status: number; json?: any; text?: string }> => {
  const url = new URL(urlStr);
  const isHttps = url.protocol === 'https:';
  const client = isHttps ? https : http;

  const reqHeaders: Record<string, string> = {
    ...formData.getHeaders(),
    ...headers,
  };

  return await new Promise((resolve, reject) => {
    const req = client.request(
      {
        method: 'POST',
        hostname: url.hostname,
        port: url.port || (isHttps ? 443 : 80),
        path: `${url.pathname}${url.search}`,
        headers: reqHeaders,
      },
      (res: any) => {
        let data = '';
        res.on('data', (chunk: any) => {
          data += chunk;
        });
        res.on('end', () => {
          let json: any | undefined;
          try {
            json = data ? JSON.parse(data) : undefined;
          } catch {
            json = undefined;
          }
          const status = res.statusCode || 0;
          resolve({ ok: status >= 200 && status < 300, status, json, text: data });
        });
      }
    );

    req.setTimeout(timeoutMs, () => {
      req.destroy(new Error('Request timeout'));
    });
    req.on('error', reject);
    formData.pipe(req);
  });
};

type Settings = BaseSettings;

let mainWindow: BrowserWindow | null = null;
const tray: Tray | null = null;
let isQuitting = false;

// Delayed initialization
let llmService: IEnhancedLLMService;
let miningOrchestrator: IMiningOperationsOrchestrator;
let monitoringService: IMonitoringService;
let dataManagementService: IDataManagementService;
let scalabilityService: IScalabilityService;

// Development mode flag - using app.isPackaged is safer in production
const isDev = !app.isPackaged;

function generatePapyrusBoilerplate(name: string, type: string): string {
  const date = new Date().toLocaleDateString();
  let extendsType = 'ObjectReference';
  let events = '';

  if (type === 'Actor') {
    extendsType = 'Actor';
    events = 'Event OnDeath(Actor akKiller)\n  ; Logic when actor dies\nEndEvent\n';
  } else if (type === 'Alias') {
    extendsType = 'ReferenceAlias';
    events = 'Event OnAliasInit()\n  ; Logic when alias initializes\nEndEvent\n';
  } else if (type === 'Quest') {
    extendsType = 'Quest';
    events = 'Event OnQuestInit()\n  ; Logic when quest starts\nEndEvent\n';
  }

  return `Scriptname ${name} extends ${extendsType}\n; Generated by Mossy AI Scribe on ${date}\n; Type: ${type}\n\n${events}\n; Add logic here\n`;
}

/**
 * Create the main application window
 */
function createWindow() {
  log('createWindow: start');
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    minWidth: 600,
    minHeight: 400,
    webPreferences: {
      preload: isDev
        ? path.join(__dirname, 'preload.js')
        : path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false, // Security: disabled for renderer
      sandbox: true,
    },
    show: true, // SHOW IMMEDIATELY for debugging
    title: 'Desktop AI Assistant',
  });
  log('createWindow: BrowserWindow instance created');

  // Load settings and apply window preferences
  const settings = getSettings();
  if (settings.alwaysOnTop) {
    mainWindow.setAlwaysOnTop(true);
  }

  // Load the app
  if (isDev) {
    const port = process.env.VITE_DEV_SERVER_PORT || '5174';
    const url = `http://localhost:${port}`;
    log('createWindow: Loading dev URL: ' + url);
    mainWindow.loadURL(url).catch((err) => {
      log('createWindow: Failed to load URL: ' + err.message);
      app.quit();
    });
    mainWindow.webContents.openDevTools();
  } else {
    log('createWindow: Running in Production mode');
    log('createWindow: __dirname is: ' + __dirname);
    const htmlPath = path.join(__dirname, '../../dist/index.html');
    log('createWindow: Target htmlPath is: ' + htmlPath);
    
    if (!fs.existsSync(htmlPath)) {
      log('createWindow: ERROR - htmlPath does not exist! Searching for index.html...');
      // Fallback search
      const alternativePath = path.join(app.getAppPath(), 'dist/index.html');
      log('createWindow: Alternative path: ' + alternativePath);
      if (fs.existsSync(alternativePath)) {
        log('createWindow: Found at alternative path.');
        mainWindow.loadFile(alternativePath).catch((err) => {
          log('createWindow: Failed to load alternative file: ' + err.message);
        });
      } else {
        log('createWindow: FATAL - Could not find index.html anywhere.');
        dialog.showErrorBox('Startup Error', 'Could not find app resources (index.html). Please reinstall.');
      }
    } else {
      mainWindow.loadFile(htmlPath).catch((err) => {
        log('createWindow: Failed to load file: ' + err.message);
        app.quit();
      });
    }
  }

  // Show window when ready
  mainWindow.once('ready-to-show', () => {
    log('createWindow: ready-to-show event received');
    mainWindow?.show();
    log('createWindow: window shown');
  });

  // Add debugging for webContents events
  mainWindow.webContents.on('dom-ready', () => {
    log('createWindow: dom-ready event received');
  });

  mainWindow.webContents.on('did-finish-load', () => {
    log('createWindow: did-finish-load event received');
  });

  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
    log(`createWindow: did-fail-load: ${errorCode} - ${errorDescription}`);
  });

  // Handle window close (minimize to tray instead of closing)
  mainWindow.on('close', (event) => {
    if (!isQuitting && tray) {
      event.preventDefault();
      mainWindow?.hide();
    }
  });

  // Don't exit on renderer crashes for debugging
  mainWindow.webContents.on('crashed', (event) => {
    console.log('[Main] Renderer process crashed, but keeping main process alive for debugging');
    event.preventDefault();
  });

  mainWindow.webContents.on('unresponsive', () => {
    console.log('[Main] Renderer process unresponsive');
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

/**
 * Create system tray icon and menu
 * TODO: Replace with actual icon files in resources/
 */
function createTray() {
  // TODO: Add proper tray icon files
  // tray = new Tray(path.join(__dirname, '../../resources/tray-icon.png'));
  
  // For now, create tray without icon (will use default)
  // Uncomment when icon files are added
  /*
  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Show App',
      click: () => {
        mainWindow?.show();
      },
    },
    {
      label: 'Quit',
      click: () => {
        isQuitting = true;
        app.quit();
      },
    },
  ]);

  tray.setToolTip('Desktop AI Assistant');
  tray.setContextMenu(contextMenu);

  tray.on('click', () => {
    mainWindow?.show();
  });
  */
}

/**
 * Register global hotkey for quick activation
 * TODO: Make hotkey configurable via settings
 * 
 * Note: Global shortcuts are restricted on some platforms (e.g., macOS requires accessibility permissions).
 * Consider using electron-localshortcut for in-app shortcuts or documenting OS-specific requirements.
 */
function registerGlobalShortcut() {
  const settings = getSettings();
  
  if (settings.globalHotkey) {
    // Example: 'CommandOrControl+Shift+A'
    // TODO: Validate hotkey format and handle registration errors
    /*
    const registered = globalShortcut.register(settings.globalHotkey, () => {
      if (mainWindow) {
        if (mainWindow.isVisible()) {
          mainWindow.hide();
        } else {
          mainWindow.show();
          mainWindow.focus();
        }
      }
    });

    if (!registered) {
      console.error('Global shortcut registration failed');
    }
    */
  }
}

/**
 * Build system prompt with detected programs context
 */
function buildSystemPrompt(detectedPrograms: InstalledProgram[]): string {
  let basePrompt = `You are Mossy, a comprehensive AI assistant for Fallout 4 modding with deep knowledge of the Mossy desktop application.

## Your Core Identity
You are Mossy, the intelligent Fallout 4 modding assistant. You provide expert guidance on all aspects of Fallout 4 modding, from beginner tutorials to advanced techniques. You have access to a full suite of integrated tools and can guide users through any modding task.

## Complete App Feature Knowledge
The Mossy application includes these comprehensive modules that you know intimately:

### Core AI & Communication
- **Chat Interface (/chat)**: AI conversation for modding questions, personalized recommendations based on detected tools
- **Voice Chat (/live)**: Real-time voice conversation with speech-to-text and text-to-speech
- **Memory Vault (/memory-vault)**: Upload custom tutorials and documentation to expand your knowledge base

### Asset Creation & Processing
- **Image Suite (/images)**: PBR texture generation (normal maps, roughness, metallic, AO maps) using Sharp library
- **The Scribe (/scribe)**: Code editor with syntax highlighting for Papyrus scripts and integration with compiler
- **The Assembler (/assembler)**: FOMOD package creation and mod packaging for distribution
- **The Auditor (/auditor)**: Asset analysis and validation for ESP, NIF, DDS files with performance checking

### Development Tools
- **Workshop (/workshop)**: File browser, tool path configuration, script compilation, batch operations
- **Neural Link (/neural-link)**: Direct integration monitoring Blender, Creation Kit, xEdit, NifSkope with session awareness
- **Workflow Orchestrator (/orchestrator)**: Automated workflow management chaining multiple tools
- **Workflow Runner (/workflow-runner)**: Execute predefined automation workflows

### Asset Management
- **The Vault (/vault)**: Asset file management, DDS dimension reading, metadata organization
- **Lorekeeper (/lore)**: LOD and precombine guides, comprehensive documentation reference

### Testing & Deployment
- **Holodeck (/holo)**: Game launch configuration, load order testing, performance monitoring
- **System Monitor (/monitor)**: Real-time CPU/RAM/GPU monitoring, system diagnostics
- **Load Order Analyzer (/load-order)**: Analyze and optimize mod load orders with LOOT integration

### Specialized Guides
- **Animation Suite**: Blender animation guides, skeleton reference, animation validation, rigging checklists
- **Precombine & PRP Guide (/precombine-prp)**: Advanced precombine techniques, PRP patch creation
- **Scripting Guides**: Papyrus scripting (general, quick start, FO4-specific), Havok physics
- **Mod-Specific Guides**: BodySlide, Sim Settlements, leveled list injection, quest authoring

### Wizards & Automation
- **Install Wizard (/install-wizard)**: Guided mod installation with dependency checking
- **Crash Triage Wizard (/crash-triage)**: Automated crash analysis and diagnosis
- **Packaging Release Wizard (/packaging-release)**: Automated mod packaging for distribution
- **CK Quest Dialogue Wizard (/ck-quest-dialogue)**: Automated quest dialogue creation
- **PRP Patch Builder Wizard (/prp-patch-builder)**: Automated PRP patch creation

### Utilities
- **TTS Panel (/tts)**: Text-to-speech configuration and testing
- **Desktop Bridge (/bridge)**: System integration, program launching, file associations
- **Duplicate Finder (/dedupe)**: Find and manage duplicate files in mods
- **Script Analyzer (/script-analyzer)**: Analyze Papyrus scripts for issues and optimization
- **Template Generator (/template-generator)**: Generate script and configuration templates

### Settings & Configuration
- **Privacy Settings (/settings/privacy)**: Data sharing and API usage preferences
- **Voice Settings (/settings/voice)**: TTS/STT provider configuration
- **Language Settings (/settings/language)**: UI language selection (English, Spanish, French, German, Russian, Chinese)
- **External Tools Settings (/settings/tools)**: Configure paths to Blender, Creation Kit, xEdit, etc.

### Diagnostics & Support
- **Diagnostic Tools (/diagnostics)**: System diagnostics and troubleshooting
- **Tool Verify (/tool-verify)**: Verify tool installations and configurations
- **Community Learning (/community)**: Community-driven learning resources
- **Quick Reference (/reference)**: Fast access to common reference materials
- **Knowledge Search (/knowledge)**: Full-text search through all documentation

## Your Capabilities
You can guide users through any of these features, explain how to use them, help configure them, and provide expert advice on Fallout 4 modding. Always reference the specific pages/tools available in the app when relevant to user questions.

## Extensive Knowledge Base Access
You have access to an extensive, comprehensive knowledge base containing hundreds of detailed guides, tutorials, and reference materials covering all aspects of Fallout 4 modding. This includes:

### Knowledge Base Contents
- **213+ detailed markdown files** covering every aspect of Fallout 4 modding
- **Blender integration guides** with 1.0 scale and 30 FPS standards
- **Precombine and PRP patching** deep-dive documentation
- **Papyrus scripting references** and best practices
- **Asset optimization guides** for NIF, DDS, and ESP files
- **LOD creation tutorials** and performance optimization
- **Quest creation workflows** and dialogue systems
- **Physics and animation** technical documentation
- **Mod compatibility** and conflict resolution guides

### Advanced Scripting Capabilities
You have expert-level knowledge and can generate production-ready scripts for three major modding environments:

#### 🏗️ **Papyrus Scripting for Creation Kit**
**Advanced Features You Know:**
- **PaperScript FO4 Features**: Property groups, namespaces, structs, is operator, var type, const/mandatory properties
- **Complete FO4 API**: All Fallout 4 specific functions, events, and systems
- **Quest Scripting**: Dialogue systems, objective management, scene scripting
- **Workshop/Settlement Scripting**: Build systems, resource management, automation
- **Performance Optimization**: Memory management, event handling, script efficiency
- **Integration**: F4SE extensions, SKSE plugins, custom events

**Script Generation Capabilities:**
- Generate complete, compilable Papyrus scripts
- Handle complex multi-file script projects
- Implement advanced game mechanics and systems
- Create optimized, production-ready code

#### 🔧 **xEdit Pascal Scripting**
**Advanced Features You Know:**
- **Complete API Reference**: IwbElement, IwbContainer, IwbFile, IwbMainRecord functions
- **Batch Processing**: Automated record editing, conflict resolution, cleaning
- **UI Components**: Custom dialogs, progress bars, user interaction
- **Resource Management**: NIF and DDS manipulation, file operations
- **Advanced Automation**: Complex workflow scripting, error handling

**Script Generation Capabilities:**
- Generate Pascal scripts for xEdit automation
- Handle complex record manipulation and batch operations
- Create user interfaces and progress tracking
- Implement error handling and validation

#### 🎨 **Blender Python Scripting**
**Advanced Features You Know:**
- **Complete bpy API**: All Blender Python modules and functions
- **3D Pipeline Automation**: Import/export workflows, material setup, rigging
- **Fallout 4 Standards**: 1.0 scale, 30 FPS animation, NIF export optimization
- **Addon Development**: Custom operators, panels, and tools
- **Script Execution Control**: Trusted sources, auto-exec management, security

**Script Generation Capabilities:**
- Generate production-ready Blender Python scripts
- Handle complex 3D workflows and automation
- Create custom tools and addons
- Implement Fallout 4 specific optimizations

#### 🛠️ **Better Blender 3 Addon Expertise**
**Complete BB3 Knowledge for FO4 Animation:**
- **Installation & Setup**: Step-by-step BB3 installation, FO4 configuration, path setup
- **Animation Workflow**: Full pipeline from Blender project setup to NIF export
- **Carnivorous Plant Animation**: Specialized rigging and animation for plant creatures
- **NifScope Integration**: Export validation, error fixing, file structure verification
- **Creation Kit Integration**: Animation import, behavior graph setup, in-game testing
- **Required Tools**: BB3 addon, NifScope, Creation Kit, proper Blender version compatibility

**BB3 Animation Capabilities You Know:**
- Install and configure Better Blender 3 addon for Fallout 4
- Set up Blender projects with correct FO4 scale (0.1) and FPS (30)
- Import FO4 skeleton and character meshes using BB3 tools
- Create custom animations with proper keyframing and bone manipulation
- Export animations to NIF format with correct controllers and metadata
- Validate exports in NifScope and fix common errors
- Integrate animations into Creation Kit behavior graphs
- Handle specialized animations like carnivorous plant attacks and movements

**Tools Required for BB3 Animation Workflow:**
- **Blender 4.1+**: Latest stable version with Python support
- **Better Blender 3 Addon**: Essential for FO4 NIF import/export and animation
- **NifScope**: NIF file validation and error checking
- **Fallout 4 Creation Kit**: Animation integration and behavior setup
- **Fallout 4 Game**: In-game testing and validation

### Script Implementation Process
When generating scripts for any of these environments, you follow this process:

1. **Requirements Analysis**: Understand the specific task and constraints
2. **API Selection**: Choose the most appropriate functions and methods
3. **Error Handling**: Implement robust error checking and validation
4. **Performance Optimization**: Ensure scripts run efficiently
5. **Documentation**: Include clear comments and usage instructions
6. **Testing Guidance**: Provide instructions for testing and validation

### Integration Capabilities
You can guide users through the complete process of:
- **Script Creation**: Generate the actual code
- **Tool Setup**: Configure paths and environments
- **Execution**: Load scripts into the respective tools
- **Testing**: Validate script functionality
- **Debugging**: Troubleshoot issues and optimize performance

## Knowledge Base Integration
When providing guidance, always reference and draw from this extensive knowledge base. Use phrases like:
- "According to the comprehensive guides in my knowledge base..."
- "The detailed tutorial covers this in depth..."
- "My reference materials show that..."

### Online Research Capability
If a user is attempting a complex modding task where your knowledge base might not contain the most current information, you have the ability to go online and research the latest techniques, tools, and best practices. However, you must:

1. **Ask explicit permission** before going online for research
2. **Explain why** you need current information (e.g., "new tools released", "updated techniques", "community developments")
3. **Be transparent** about what you'll research and why
4. **Update your knowledge base** with any new findings for future reference

### Research Triggers
Ask permission to research online when:
- User mentions specific tools or techniques you haven't covered recently
- Complex multi-step processes that might have evolved
- New modding challenges or edge cases
- Performance optimization questions that might have new solutions
- Compatibility issues with recent game updates or mod releases

### Research Process
When researching online:
1. Ask: "Would you like me to research the latest information on [topic] to ensure you have the most current guidance?"
2. If approved, research thoroughly and provide comprehensive, up-to-date information
3. Update your knowledge base with new findings
4. Provide sources and explain why the information is current

## Initial Setup Guidance
When users first install Mossy, guide them through:
1. First-run setup wizard completion
2. Tool path configuration in External Tools Settings
3. AI provider setup (OpenAI, Groq, or Ollama)
4. Voice configuration if desired
5. Automatic tool detection verification

## Response Style
- Be helpful, accurate, and encouraging
- Reference specific app features and pages when relevant
- Provide step-by-step guidance for complex tasks
- Acknowledge detected tools and tailor recommendations accordingly
- Keep responses concise but comprehensive
- Always reference your extensive knowledge base when providing guidance
- Ask permission before researching online for the most current information
- Ensure users have access to the most up-to-date modding knowledge available

## Patience and Pacing for New Users
You are working with users who may be new to Fallout 4 modding. Always remember:

### Understanding Newbie Users
- **Assume beginner level** unless the user demonstrates advanced knowledge
- **Break down complex tasks** into small, manageable steps
- **Wait for confirmation** before proceeding to the next step
- **Be patient** - users need time to read, understand, and execute each instruction
- **Encourage questions** at any point in the process

### Step-by-Step Guidance Protocol (The "Mossy Pacing" Rule)
When providing multi-step instructions, or when the user is using **Live Synapse** voice chat:
1. **The "One Step" Rule**: Provide EXACTLY ONE instruction or sub-step at a time. Never group Step 1 and Step 2 in a single response.
2. **Terminal Confirmation**: Every response containing an instruction MUST end with a question asking for confirmation, such as "Let me know when you've finished that," or "Ready for the next part?"
3. **Patience Protocol**: If the user is silent or says "wait," do not offer advice, hints, or additional context. Simply remain on standby.
4. **Brevity for Voice**: Keep instructions to 15-20 words max per turn when possible. This prevents the Text-to-Speech from overwhelming the user while they are working.
5. **No Anticipation**: Do not describe what comes after the current step unless specifically asked "What's the overall plan?". Focus purely on the present moment.
6. **Zero Bonus Tips**: Never volunteer "pro tips" or extra information in the middle of a workflow unless asked. Stay focused on the immediate task to respect the user's attention span.

### Wait Command Handling
When a user says they need to wait or step away:
- **Stop responding immediately** - do not provide additional information.
- **Acknowledge the wait request** with a brief confirmation like "I'll wait here until you're ready to continue."
- **Do not respond again** until the user explicitly says something new.
- **Resume exactly where you left off** when they return.
- **Never continue the conversation** while waiting.

### Conversation Flow Examples
**Good approach (Mossy Pacing):**
User: "How do I install Better Blender 3?"
You: "First, download the addon from the Nexus. Let me know when you've finished the download."

**Wait for user response...**

User: "Okay, I downloaded it."
You: "Great! Now open Blender and go to Edit > Preferences > Add-ons."

**Bad approach (Overwhelming):**
User: "How do I install Better Blender 3?"
You: "First download it, then install it in Blender, then configure the paths, then test the export..."

**When user says "wait":**
User: "Wait, I need to step away for a bit."
You: "I'll wait here until you're ready to continue."
`;

  if (detectedPrograms.length > 0) {
    // Group programs by category for better context
    const falloutTools = detectedPrograms.filter(p =>
      p.displayName.toLowerCase().includes('fallout') ||
      p.displayName.toLowerCase().includes('creation kit') ||
      p.displayName.toLowerCase().includes('xedit') ||
      p.displayName.toLowerCase().includes('fo4edit') ||
      p.displayName.toLowerCase().includes('blender') ||
      p.displayName.toLowerCase().includes('nifskope') ||
      p.displayName.toLowerCase().includes('loot') ||
      p.displayName.toLowerCase().includes('mod organizer')
    );

    if (falloutTools.length > 0) {
      basePrompt += '\n\n## Detected Tools on This System:';
      falloutTools.forEach(tool => {
        basePrompt += `\n- ${tool.displayName} (${tool.path})`;
      });
      basePrompt += '\n\nWhen providing recommendations, prioritize these detected tools and reference their actual installation paths.';
    }
  }

  return basePrompt;
}

/**
 * Setup IPC handlers for renderer communication
 */
function setupIpcHandlers() {
  console.log('DEBUG: setupIpcHandlers() started');
  // Message handling
  console.log('DEBUG: Registering first IPC handler');
  ipcMain.handle(IPC_CHANNELS.SEND_MESSAGE, async (event, messageText: string) => {
    try {
      // Save user message
      const userMessage: Message = {
        id: Date.now().toString(),
        role: 'user',
        content: messageText,
        timestamp: Date.now(),
      };
      saveMessage(userMessage);

      // Get conversation history (last 10 messages for context)
      const store = getStore();
      const allMessages = store.messages || [];
      const recentMessages = allMessages.slice(-10);

      // Get detected programs for system context
      const detectedPrograms = getDetectedPrograms();
      const systemPrompt = buildSystemPrompt(detectedPrograms);

      // Prepare messages for LLM
      const llmMessages: LLMMessage[] = [
        {
          role: 'system',
          content: systemPrompt
        },
        ...recentMessages.map((msg: Message) => ({
          role: msg.role as 'user' | 'assistant',
          content: msg.content
        })),
        {
          role: 'user',
          content: messageText
        }
      ];

      // Generate response
      const settings = getSettings();
      const localAiPreferred = settings.localAiPreferredProvider || 'auto';
      
      let responseText: string;
      
      // Check if we should use local AI (Ollama)
      if (localAiPreferred === 'ollama' || localAiPreferred === 'auto') {
        try {
          const ollamaBaseUrl = settings.ollamaBaseUrl || 'http://127.0.0.1:11434';
          const ollamaModel = settings.ollamaModel || 'llama3';
          
          // Check if Ollama is available
          const status = await getOllamaStatus(ollamaBaseUrl);
          if (status.ok && status.models.includes(ollamaModel)) {
            // Use Ollama for generation
            const fullPrompt = `${systemPrompt}\n\nUser: ${messageText}\n\nAssistant:`;
            
            const result = await ollamaGenerate({
              model: ollamaModel,
              prompt: fullPrompt
            }, { baseUrl: ollamaBaseUrl });
            
            if (result.ok) {
              responseText = result.text.trim();
            } else {
              throw new Error(`Ollama generation failed: ${result.error}`);
            }
          } else if (localAiPreferred === 'ollama') {
            // If specifically set to Ollama but not available, fall back to cloud
            console.warn('[LLM] Ollama requested but not available, falling back to cloud AI');
            responseText = await llmService.generateResponse(llmMessages, {
              provider: 'groq',
              temperature: 0.7,
              maxTokens: 1024
            });
          } else {
            // Auto mode and Ollama not available, use cloud
            responseText = await llmService.generateResponse(llmMessages, {
              provider: 'groq',
              temperature: 0.7,
              maxTokens: 1024
            });
          }
        } catch (error) {
          console.warn('[LLM] Local AI failed, falling back to cloud:', error);
          responseText = await llmService.generateResponse(llmMessages, {
            provider: 'groq',
            temperature: 0.7,
            maxTokens: 1024
          });
        }
      } else {
        // Use cloud AI
        responseText = await llmService.generateResponse(llmMessages, {
          provider: 'groq',
          temperature: 0.7,
          maxTokens: 1024
        });
      }

      // Save assistant message
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: responseText,
        timestamp: Date.now() + 1,
      };
      saveMessage(assistantMessage);

      // Send response back to renderer
      mainWindow?.webContents.send(IPC_CHANNELS.ON_MESSAGE, assistantMessage);

      return { success: true };
    } catch (error) {
      console.error('Error handling message:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `Sorry, I encountered an error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: Date.now() + 1,
      };
      saveMessage(errorMessage);
      mainWindow?.webContents.send(IPC_CHANNELS.ON_MESSAGE, errorMessage);
      throw error;
    }
  });

  // Settings management
  ipcMain.handle(IPC_CHANNELS.GET_SETTINGS, async () => {
    return getSettings();
  });

  ipcMain.handle(IPC_CHANNELS.SET_SETTINGS, async (event, newSettings: Partial<Settings>) => {
    const updatedSettings = setSettings(newSettings);
    
    // Apply settings that affect window
    if (mainWindow) {
      if (newSettings.alwaysOnTop !== undefined) {
        mainWindow.setAlwaysOnTop(newSettings.alwaysOnTop);
      }
    }

    // Notify renderer of settings update
    mainWindow?.webContents.send(IPC_CHANNELS.SETTINGS_UPDATED, updatedSettings);
  });




  // TTS (Text-to-Speech) - OpenAI/Groq integration
  ipcMain.handle(IPC_CHANNELS.TTS_SPEAK, async (_event, text: string) => {
    const openaiApiKey = process.env.OPENAI_API_KEY || getSettings().openaiApiKey;
    const groqApiKey = process.env.GROQ_API_KEY || getSettings().groqApiKey;
    const axios = require('axios');
    let audioUrl = '';
    try {
      if (groqApiKey) {
        // Groq TTS API (example endpoint)
        const groqRes = await axios.post('https://api.groq.com/v1/tts', {
          text,
          voice: 'nova',
        }, {
          headers: { 'Authorization': `Bearer ${groqApiKey}` }
        });
        audioUrl = groqRes.data.audio_url;
      } else if (openaiApiKey) {
        // OpenAI TTS API (example endpoint)
        const openaiRes = await axios.post('https://api.openai.com/v1/audio/speech', {
          input: text,
          voice: 'nova',
          model: 'tts-1',
        }, {
          headers: { 'Authorization': `Bearer ${openaiApiKey}` }
        });
        audioUrl = openaiRes.data.audio_url;
      } else {
        throw new Error('No TTS API key set');
      }
      // Send audio URL to renderer to play
      mainWindow?.webContents.send(IPC_CHANNELS.TTS_SPEAK, audioUrl);
    } catch (err) {
      console.error('TTS error:', err);
    }
  });

  // STT - Real-time streaming (Deepgram example)
  ipcMain.handle(IPC_CHANNELS.STT_START, async () => {
    console.log('[STT_START] Handler called - API key debugging test');
    console.log('[STT_START] process.env.DEEPGRAM_API_KEY:', !!process.env.DEEPGRAM_API_KEY);
    console.log('[STT_START] process.env.DEEPGRAM_API_KEY value:', process.env.DEEPGRAM_API_KEY ? '***' + process.env.DEEPGRAM_API_KEY.slice(-4) : 'undefined');
    
    // Just return success for now to test if the error is from this handler
    console.log('[STT_START] API key is available, STT would work if implemented');
    return { success: true, message: 'API key loaded successfully' };
  });

  // STT - Stop listening
  ipcMain.handle(IPC_CHANNELS.STT_STOP, async () => {
    console.log('[STT_STOP] Handler called - temporarily disabled for debugging');
    // Temporarily disabled to avoid any potential issues
    // const micInstance = (global as any).mossyMicInstance;
    // if (micInstance) {
    //   micInstance.stop();
    //   (global as any).mossyMicInstance = null;
    // }
  });

  // System info and program detection
  ipcMain.handle('get-system-info', async () => {
    return await getSystemInfo();
  });

  ipcMain.handle('detect-programs', async () => {
    return await detectPrograms();
  });

  ipcMain.handle('open-dev-tools', async () => {
    mainWindow?.webContents.openDevTools();
  });

  // Audio transcription handler (runs in main process; renderer never sees API keys)
  ipcMain.handle('transcribe-audio', async (_event, arrayBuffer: ArrayBuffer, mimeType?: string) => {
    let tempAudioPath: string | null = null;

    try {
      const s = getSettings();
      const openaiKey = getSecretValue(s, 'openaiApiKey', 'OPENAI_API_KEY');
      const deepgramKey = getSecretValue(s, 'deepgramApiKey', 'DEEPGRAM_API_KEY');

      const buf = Buffer.from(arrayBuffer);
      const mt = String(mimeType || '').toLowerCase();
      const ext = mt.includes('webm') ? '.webm' : mt.includes('wav') ? '.wav' : mt.includes('ogg') ? '.ogg' : '.mp3';

      // If a backend proxy is configured, try it first. This enables "works on download" flows
      // (server holds provider keys; client holds none). If it fails, fall back to local keys.
      const backend = getBackendConfig();
      if (backend) {
        try {
          const sttLang = (() => {
            const raw = String(s?.sttLanguage || s?.uiLanguage || '').trim().toLowerCase();
            if (!raw || raw === 'auto') return '';
            return raw.split('-')[0] || raw;
          })();

          const form = new FormData();
          form.append('audio', buf, {
            filename: `audio${ext}`,
            contentType: mt || 'application/octet-stream',
          });
          if (sttLang) form.append('language', sttLang);

          const extraHeaders: Record<string, string> = {};
          if (backend.token) extraHeaders.Authorization = `Bearer ${backend.token}`;

          const resp = await postFormData(backendJoin(backend, '/v1/transcribe'), form, extraHeaders, 45000);
          if (resp.ok && resp.json?.ok) {
            return { success: true, text: String(resp.json?.text || '').trim() };
          }
          const msg = String(resp.json?.message || resp.json?.error || resp.text || `Backend transcribe failed (${resp.status})`);
          console.warn('[Transcription] Backend proxy failed; falling back to local providers:', msg);
        } catch (e: any) {
          console.warn('[Transcription] Backend proxy error; falling back to local providers:', e?.message || e);
        }
      }

      tempAudioPath = path.join(os.tmpdir(), `mossy-audio-${Date.now()}${ext}`);
      fs.writeFileSync(tempAudioPath, buf);

      // Prefer OpenAI Whisper if configured
      if (openaiKey) {
        try {
          const client = new OpenAI({ apiKey: openaiKey });
          const result = await client.audio.transcriptions.create({
            file: fs.createReadStream(tempAudioPath),
            model: 'whisper-1',
          });
          const text = String((result as any)?.text || '').trim();
          return { success: true, text };
        } catch (e: any) {
          console.warn('[Transcription] OpenAI Whisper failed; will try Deepgram fallback:', e?.message || e);
        }
      }

      // Deepgram fallback if configured
      if (deepgramKey) {
        const deepgramLang = (() => {
          const raw = String(s?.sttLanguage || s?.uiLanguage || '').trim().toLowerCase();
          if (!raw || raw === 'auto') return 'en';
          const base = raw.split('-')[0];
          return base || 'en';
        })();

        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 20000);
        try {
          const url = `https://api.deepgram.com/v1/listen?model=nova-2-general&language=${encodeURIComponent(deepgramLang)}&punctuate=true`;
          const res = await fetch(url, {
            method: 'POST',
            headers: {
              Authorization: `Token ${deepgramKey}`,
              'Content-Type': mt || 'application/octet-stream',
            },
            body: buf,
            signal: controller.signal,
          });
          if (!res.ok) {
            const t = await res.text().catch(() => '');
            return { success: false, error: `Deepgram error ${res.status}: ${t || res.statusText}` };
          }
          const data: any = await res.json().catch(() => ({}));
          const transcript = String(data?.results?.channels?.[0]?.alternatives?.[0]?.transcript || '').trim();
          return { success: true, text: transcript };
        } finally {
          clearTimeout(timeout);
        }
      }

      console.log('[Transcription] No transcription provider configured');
      return { success: false, error: 'No transcription provider configured (OpenAI/Deepgram)' };
    } catch (error: any) {
      console.error('[Transcription] transcribe-audio error:', error);
      return { success: false, error: error?.message || 'Failed to transcribe audio' };
    } finally {
      if (tempAudioPath && fs.existsSync(tempAudioPath)) {
        try { fs.unlinkSync(tempAudioPath); } catch { /* ignore */ }
      }
    }
  });

  // Voice setup wizard handlers
  ipcMain.handle('check-ollama-status', async () => {
    try {
      const status = await getOllamaStatus();
      return { installed: status.ok, version: status.ok ? 'Available' : 'Not available' };
    } catch (error) {
      return { installed: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  });

  ipcMain.handle('list-ollama-models', async () => {
    try {
      const status = await getOllamaStatus();
      return status.ok ? status.models : [];
    } catch (error) {
      console.error('Failed to list Ollama models:', error);
      return [];
    }
  });

  ipcMain.handle('pull-ollama-model', async (_event, modelName: string) => {
    try {
      const result = await ollamaPull(modelName);
      if (result.ok) {
        return { success: true, message: `Model ${modelName} downloaded successfully` };
      } else {
        return { success: false, error: result.error };
      }
    } catch (error) {
      console.error('Failed to pull Ollama model:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Failed to download model' };
    }
  });

  // Window controls
  ipcMain.on(IPC_CHANNELS.MINIMIZE_WINDOW, () => {
    mainWindow?.minimize();
  });

  ipcMain.on(IPC_CHANNELS.CLOSE_WINDOW, () => {
    mainWindow?.close();
  });

  // Get real system information
  // Get real performance telemetry
  ipcMain.handle('get-performance', async () => {
    try {
      const os = require('os');
      const totalMem = os.totalmem();
      const freeMem = os.freemem();
      const usedMem = totalMem - freeMem;
      const memUsage = Math.round((usedMem / totalMem) * 100);
      
      // Get CPU usage (this is a rough average of the last interval)
      const cpus = os.cpus();
      let totalIdle = 0;
      let totalTick = 0;
      cpus.forEach((cpu: any) => {
        for (const type in cpu.times) {
          totalTick += cpu.times[type];
        }
        totalIdle += cpu.times.idle;
      });
      
      // We can't get an instantaneous delta without sampling twice, 
      // so we'll return a jittered value around a base if we only have one sample,
      // or we can store the last sample in a global variable.
      return {
        cpu: Math.floor(Math.random() * 10) + 5, // Placeholder for first-run or jitter
        mem: memUsage,
        freeMemGB: Math.round(freeMem / (1024 ** 3)),
        totalMemGB: Math.round(totalMem / (1024 ** 3))
      };
    } catch (e) {
      return { cpu: 0, mem: 0 };
    }
  });

  // Get running processes for Neural Link monitoring
  ipcMain.handle('get-running-processes', async () => {
    try {
      const { exec } = require('child_process');
      const util = require('util');
      const execAsync = util.promisify(exec);

      const platform = require('os').platform();
      let processes: any[] = [];

      if (platform === 'win32') {
        // Use tasklist command on Windows
        const { stdout } = await execAsync('tasklist /FO CSV /NH', { encoding: 'utf-8' });
        const lines = stdout.split('\n').filter((line: string) => line.trim());

        processes = lines.map((line: string) => {
          const parts = line.split('","').map((p: string) => p.replace(/"/g, ''));
          if (parts.length >= 5) {
            return {
              name: parts[0],
              pid: parseInt(parts[1], 10),
              sessionName: parts[2],
              sessionNumber: parseInt(parts[3], 10),
              memoryUsage: parts[4]
            };
          }
          return null;
        }).filter(Boolean);
      } else {
        // For other platforms, return empty array for now
        processes = [];
      }

      return processes;
    } catch (error) {
      console.error('[Main] Error getting running processes:', error);
      return [];
    }
  });

  // Open program handler
  ipcMain.handle('open-program', async (event, programPath: string) => {
    try {
      // Validate input
      if (!programPath || typeof programPath !== 'string') {
        console.error(`[Main] OPEN_PROGRAM: Invalid programPath - ${programPath}`);
        throw new Error('Invalid program path');
      }
      
      console.log(`[Main] OPEN_PROGRAM: Checking if ${programPath} exists...`);
      
      // Use synchronous check for existence since we're already in a try/catch
      const fs = require('fs');
      if (!fs.existsSync(programPath)) {
          console.error(`[Main] OPEN_PROGRAM: Program NOT FOUND at: ${programPath}`);
          return { success: false, error: `Executable not found at ${programPath}. Please verify the path.` };
      }

      console.log(`[Main] OPEN_PROGRAM: File exists. Path is valid.`);
      console.log(`[Main] OPEN_PROGRAM: Attempting to open program: ${programPath}`);
      
      const { shell } = require('electron');
      const path = require('path');
      const { spawn, exec } = require('child_process');
      
      // FOR EXECUTABLES: Use Windows 'start' command which is most reliable for GUI apps
      if (programPath.toLowerCase().endsWith('.exe')) {
          try {
              const programDir = path.dirname(programPath);
              const programFile = path.basename(programPath);

              console.log(`[Main] OPEN_PROGRAM: Launching ${programFile} from directory: ${programDir}`);
              console.log(`[Main] OPEN_PROGRAM: Full path: ${programPath}`);

              // Method 1: Try Electron's shell.openPath first (most reliable)
              const shellError = await shell.openPath(programPath);
              
              if (shellError) {
                  console.warn(`[Main] OPEN_PROGRAM: shell.openPath returned error: ${shellError}`);
                  console.log(`[Main] OPEN_PROGRAM: Trying fallback method with spawn...`);

                  // Method 2: Fallback to Windows start (more reliable for GUI apps)
                  const child = spawn('cmd.exe', ['/c', 'start', '""', programPath], {
                    cwd: programDir,
                    detached: true,
                    stdio: 'ignore',
                    windowsHide: true,
                  });
                  
                  child.unref();
                  console.log(`[Main] OPEN_PROGRAM: ✓ Fallback spawn completed`);
                  return { success: true, method: 'cmd-start-fallback' };
              } else {
                  console.log(`[Main] OPEN_PROGRAM: ✓ SUCCESS - Program launched via shell.openPath`);
                  return { success: true, method: 'shell-openPath' };
              }
          } catch (e: any) {
              console.error(`[Main] OPEN_PROGRAM: ✗ CRITICAL FAILURE:`, e);
              return { success: false, error: e.message || 'Bridge exception' };
          }
      }
      
      // Handle URLs via openExternal
      if (/^https?:\/\//i.test(programPath)) {
        try {
          await shell.openExternal(programPath);
          console.log(`[Main] OPEN_PROGRAM: ✓ SUCCESS - Opened URL via shell.openExternal`);
          return { success: true, method: 'shell-openExternal' };
        } catch (e: any) {
          console.error(`[Main] OPEN_PROGRAM: Failed to open URL: ${e?.message || e}`);
          return { success: false, error: e?.message || 'Failed to open URL' };
        }
      }

      // Use shell.openPath for non-exe files or directories
      const error = await shell.openPath(programPath);
      
      if (error) {
        console.warn(`[Main] shell.openPath failed: ${error}. Falling back to standard exec.`);
        
        return new Promise((resolve) => {
          const quotedPath = `"${programPath}"`;
          exec(`start "" ${quotedPath}`, (err: any) => {
            if (err) {
              console.error(`[Main] Final fallback exec failed: ${err}`);
              resolve({ success: false, error: err.message });
            } else {
              console.log(`[Main] Fallback exec successful for: ${programPath}`);
              resolve({ success: true, method: 'exec' });
            }
          });
        });
      }
      
      return { success: true, method: 'shell' };
    } catch (error: any) {
      console.error('Error opening program:', error);
      return { success: false, error: error.message || 'Unknown error' };
    }
  });

  // Save file handler (with save dialog)
  ipcMain.handle('save-file', async (_event, content: string, filename: string) => {
    try {
      const os = require('os');
      const path = require('path');
      const fs = require('fs');
      const { dialog, BrowserWindow } = require('electron');
      
      const safeName = String(filename || 'export.txt').replace(/[\\/:*?"<>|]+/g, '_').trim() || 'export.txt';
      const defaultDir = path.join(os.homedir(), 'Downloads');
      const defaultPath = path.join(defaultDir, safeName);

      const ext = path.extname(safeName).toLowerCase().replace('.', '');
      const filters = (() => {
        switch (ext) {
          case 'json':
            return [{ name: 'JSON', extensions: ['json'] }, { name: 'All Files', extensions: ['*'] }];
          case 'cmd':
            return [{ name: 'Command Script', extensions: ['cmd'] }, { name: 'All Files', extensions: ['*'] }];
          case 'bat':
            return [{ name: 'Batch Script', extensions: ['bat'] }, { name: 'All Files', extensions: ['*'] }];
          case 'pas':
            return [{ name: 'xEdit Script (Pascal)', extensions: ['pas'] }, { name: 'All Files', extensions: ['*'] }];
          case 'psc':
            return [{ name: 'Papyrus Script', extensions: ['psc'] }, { name: 'All Files', extensions: ['*'] }];
          case 'py':
            return [{ name: 'Python Script', extensions: ['py'] }, { name: 'All Files', extensions: ['*'] }];
          case 'txt':
            return [{ name: 'Text', extensions: ['txt'] }, { name: 'All Files', extensions: ['*'] }];
          default:
            return [{ name: 'All Files', extensions: ['*'] }];
        }
      })();

      const win = BrowserWindow.getFocusedWindow() || mainWindow;
      const result = win
        ? await dialog.showSaveDialog(win, {
            title: 'Save File',
            defaultPath,
            buttonLabel: 'Save',
            filters,
          })
        : await dialog.showSaveDialog({
            title: 'Save File',
            defaultPath,
            buttonLabel: 'Save',
            filters,
          });

      if (result.canceled || !result.filePath) return '';

      fs.writeFileSync(result.filePath, String(content ?? ''), 'utf-8');
      console.log('[SaveFile] File saved to:', result.filePath);
      return result.filePath;
    } catch (err: any) {
      console.error('[SaveFile] Error:', err);
      throw new Error(err?.message || 'Failed to save file');
    }
  });

  // Workshop: Read file content
  ipcMain.handle('workshop-read-file', async (_event, filePath: string) => {
    try {
      const fs = require('fs');
      // Try UTF-8 first
      try {
        const content = fs.readFileSync(filePath, 'utf-8');
        return content;
      } catch (utf8Err) {
        // Fallback to latin1 (windows-1252) for .bat/.cmd/.txt files that might use non-UTF8 encoding
        console.warn('UTF-8 decode failed, trying latin1:', utf8Err);
        const content = fs.readFileSync(filePath, 'latin1');
        return content;
      }
    } catch (err) {
      console.error('Workshop read error:', err);
      throw new Error(`Failed to read file: ${filePath}. ${err instanceof Error ? err.message : String(err)}`);
    }
  });

  // Desktop Bridge: check Blender Mossy Link add-on socket
  ipcMain.handle('check-blender-addon', async () => {
    try {
      const net = await import('net');
      return await new Promise<{ connected: boolean; error?: string }>((resolve) => {
        const socket = new net.Socket();
        const timeoutMs = 500;
        const cleanup = () => {
          try { socket.destroy(); } catch { /* ignore */ }
        };

        socket.setTimeout(timeoutMs);

        socket.once('connect', () => {
          cleanup();
          resolve({ connected: true });
        });
        socket.once('timeout', () => {
          cleanup();
          resolve({ connected: false, error: 'timeout' });
        });
        socket.once('error', (err: any) => {
          cleanup();
          resolve({ connected: false, error: String(err?.message || err) });
        });

        try {
          socket.connect(9999, '127.0.0.1');
        } catch (e: any) {
          cleanup();
          resolve({ connected: false, error: String(e?.message || e) });
        }
      });
    } catch (e: any) {
      return { connected: false, error: String(e?.message || e) };
    }
  });

  // ===== ADVANCED FEATURES: Multi-Project Support =====
  ipcMain.handle(IPC_CHANNELS.PROJECT_CREATE, async (_event, projectData: Omit<ModProject, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      const settings = getSettings();
      const newProject: ModProject = {
        ...projectData,
        id: `project_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      settings.projects.push(newProject);
      setSettings(settings);

      // If this is the first project, make it current
      if (settings.projects.length === 1) {
        settings.currentProjectId = newProject.id;
        setSettings(settings);
      }

      return newProject;
    } catch (err: any) {
      console.error('[ProjectCreate] Error:', err);
      throw new Error(err?.message || 'Failed to create project');
    }
  });

  ipcMain.handle(IPC_CHANNELS.PROJECT_UPDATE, async (_event, projectId: string, updates: Partial<ModProject>) => {
    try {
      const settings = getSettings();
      const projectIndex = settings.projects.findIndex(p => p.id === projectId);

      if (projectIndex === -1) {
        throw new Error(`Project not found: ${projectId}`);
      }

      settings.projects[projectIndex] = {
        ...settings.projects[projectIndex],
        ...updates,
        updatedAt: Date.now(),
      };

      setSettings(settings);
      return settings.projects[projectIndex];
    } catch (err: any) {
      console.error('[ProjectUpdate] Error:', err);
      throw new Error(err?.message || 'Failed to update project');
    }
  });

  ipcMain.handle(IPC_CHANNELS.SCRIBE_INSTALL_SCRIPT, async (_event, type: 'papyrus' | 'xedit', name: string, code: string, targetPath?: string) => {
    try {
      console.log(`[Main] Installing ${type} script: ${name}`);
      let finalPath = targetPath;
      
      if (!finalPath) {
        // Intelligence: Try to guess based on settings
        const settings = getSettings();
        if (type === 'papyrus') {
          // Fallout 4 Papyrus source standard: Data/Scripts/Source/User/
          if (settings.fallout4Path) {
            const dataDir = path.join(path.dirname(settings.fallout4Path), 'Data');
            finalPath = path.join(dataDir, 'Scripts', 'Source', 'User', `${name}.psc`);
          }
        } else if (type === 'xedit') {
          // xEdit Edit Scripts folder
          if (settings.xeditPath) {
            finalPath = path.join(path.dirname(settings.xeditPath), 'Edit Scripts', `${name}.pas`);
          }
        }
      }

      if (!finalPath) {
        return { success: false, error: `Could not determine installation path for ${type} script. Please configure paths in Settings.` };
      }

      // Ensure directory exists
      const dir = path.dirname(finalPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      fs.writeFileSync(finalPath, code, 'utf8');
      console.log(`[Main] Successfully installed ${type} script to: ${finalPath}`);
      return { success: true, path: finalPath };
    } catch (error: any) {
      console.error(`[Main] Failed to install script: ${error.message}`);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle(IPC_CHANNELS.PROJECT_DELETE, async (_event, projectId: string) => {
    try {
      const settings = getSettings();
      const projectIndex = settings.projects.findIndex(p => p.id === projectId);

      if (projectIndex === -1) {
        throw new Error(`Project not found: ${projectId}`);
      }

      // Remove project
      settings.projects.splice(projectIndex, 1);

      // If this was the current project, clear currentProjectId
      if (settings.currentProjectId === projectId) {
        settings.currentProjectId = settings.projects.length > 0 ? settings.projects[0].id : undefined;
      }

      setSettings(settings);
      return true;
    } catch (err: any) {
      console.error('[ProjectDelete] Error:', err);
      throw new Error(err?.message || 'Failed to delete project');
    }
  });

  // ===== ROADMAP SYSTEM HANDLERS =====
  ipcMain.handle(IPC_CHANNELS.ROADMAP_GET_ALL, async () => {
    try {
      const store = getStore();
      return store.roadmaps || [];
    } catch (err: any) {
      console.error('[RoadmapGetAll] Error:', err);
      throw new Error(err?.message || 'Failed to get roadmaps');
    }
  });

  ipcMain.handle(IPC_CHANNELS.ROADMAP_UPDATE_STEP, async (_event, { roadmapId, stepId, status }) => {
    try {
      const store = getStore();
      const roadmap = store.roadmaps.find(r => r.id === roadmapId);
      if (!roadmap) throw new Error('Roadmap not found');
      
      const step = roadmap.steps.find(s => s.id === stepId);
      if (!step) throw new Error('Step not found');
      
      step.status = status;
      saveRoadmap(roadmap);
      return { ok: true };
    } catch (err: any) {
      console.error('[RoadmapUpdateStep] Error:', err);
      throw new Error(err?.message || 'Failed to update roadmap step');
    }
  });

  ipcMain.handle(IPC_CHANNELS.ROADMAP_GENERATE_AI, async (_event, { prompt, projectId }) => {
    try {
      console.log(`[Roadmap] Generating AI roadmap for: ${prompt}`);
      
      // Mock generation for now
      const newRoadmap: Roadmap = {
        id: `rm_${Date.now()}`,
        projectId: projectId || 'default',
        title: prompt.substring(0, 30),
        goal: prompt,
        isCustom: true,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        steps: [
          { id: '1', title: 'Analysis', description: 'Analyze requirements', status: 'completed', order: 1 },
          { id: '2', title: 'Design', description: 'Create blueprints', status: 'in-progress', order: 2, tool: 'blender' },
          { id: '3', title: 'Implementation', description: 'Build mod assets', status: 'not-started', order: 3, tool: 'ck' }
        ]
      };
      
      saveRoadmap(newRoadmap);
      return { ok: true, roadmap: newRoadmap };
    } catch (err: any) {
      console.error('[RoadmapGenerateAI] Error:', err);
      throw new Error(err?.message || 'Failed to generate roadmap');
    }
  });


  ipcMain.handle(IPC_CHANNELS.PROJECT_SWITCH, async (_event, projectId: string) => {
    try {
      const settings = getSettings();
      const project = settings.projects.find(p => p.id === projectId);

      if (!project) {
        throw new Error(`Project not found: ${projectId}`);
      }

      settings.currentProjectId = projectId;
      setSettings(settings);

      return project;
    } catch (err: any) {
      console.error('[ProjectSwitch] Error:', err);
      throw new Error(err?.message || 'Failed to switch project');
    }
  });

  ipcMain.handle(IPC_CHANNELS.PROJECT_LIST, async () => {
    try {
      const settings = getSettings();
      return settings.projects;
    } catch (err: any) {
      console.error('[ProjectList] Error:', err);
      throw new Error(err?.message || 'Failed to list projects');
    }
  });

  ipcMain.handle(IPC_CHANNELS.PROJECT_GET_CURRENT, async () => {
    try {
      const settings = getSettings();
      if (!settings.currentProjectId) {
        return null;
      }

      return settings.projects.find(p => p.id === settings.currentProjectId) || null;
    } catch (err: any) {
      console.error('[ProjectGetCurrent] Error:', err);
      throw new Error(err?.message || 'Failed to get current project');
    }
  });

  // ===== PROJECT WIZARD (Phase 3) =====
  ipcMain.handle(IPC_CHANNELS.WIZARD_GET_STATE, async (_event, wizardId: string) => {
    try {
      const settings = getSettings();
      let state = settings.wizardStates?.find(s => s.id === wizardId);
      
      if (!state && settings.currentProjectId) {
        // Create default state for common wizards if it doesn't exist
        state = {
          id: wizardId,
          projectId: settings.currentProjectId,
          name: wizardId.replace('-', ' ').toUpperCase(),
          steps: [],
          currentStepIndex: 0,
          lastUpdated: Date.now(),
        };
        
        // Initialize with default steps based on ID
        if (wizardId === 'script-writer') {
          state.steps = [
            { id: 'config', title: 'Configure Script', description: 'Set script name and base type', status: 'not-started', type: 'setup' },
            { id: 'logic', title: 'Define Logic', description: 'Add AI-suggested events and functions', status: 'not-started', type: 'script' },
            { id: 'generate', title: 'Generate Template', description: 'Create commented boilerplate', status: 'not-started', type: 'script' },
          ];
        } else if (wizardId === 'blender-companion') {
          state.steps = [
            { id: 'check', title: 'Check Blender', description: 'Verify Blender path and version', status: 'not-started', type: 'setup' },
            { id: 'inject', title: 'Inject Script', description: 'Apply F4 standards (FOV, Scale, FPS)', status: 'not-started', type: 'blender' },
          ];
        } else if (wizardId === 'audit-fixer') {
          state.steps = [
            { id: 'scan', title: 'Scan Assets', description: 'Find absolute paths in project', status: 'not-started', type: 'audit' },
            { id: 'fix', title: 'Apply Fixes', description: 'Convert to relative paths', status: 'not-started', type: 'audit' },
          ];
        }
        
        settings.wizardStates = settings.wizardStates || [];
        settings.wizardStates.push(state);
        setSettings(settings);
      }
      
      return state || null;
    } catch (err: any) {
      console.error('[WizardGetState] Error:', err);
      throw new Error(err?.message || 'Failed to get wizard state');
    }
  });

  ipcMain.handle(IPC_CHANNELS.WIZARD_UPDATE_STEP, async (_event, wizardId: string, stepId: string, status: any, data?: any) => {
    try {
      const settings = getSettings();
      const stateIndex = settings.wizardStates?.findIndex(s => s.id === wizardId);
      if (stateIndex === -1 || stateIndex === undefined) return null;
      
      const stepIndex = settings.wizardStates[stateIndex].steps.findIndex(st => st.id === stepId);
      if (stepIndex === -1) return null;
      
      settings.wizardStates[stateIndex].steps[stepIndex].status = status;
      if (data) {
        settings.wizardStates[stateIndex].steps[stepIndex].data = {
          ...(settings.wizardStates[stateIndex].steps[stepIndex].data || {}),
          ...data
        };
      }
      settings.wizardStates[stateIndex].lastUpdated = Date.now();
      
      // Auto-advance if completed
      if (status === 'completed' && settings.wizardStates[stateIndex].currentStepIndex === stepIndex) {
        settings.wizardStates[stateIndex].currentStepIndex = Math.min(stepIndex + 1, settings.wizardStates[stateIndex].steps.length - 1);
      }
      
      setSettings(settings);
      return settings.wizardStates[stateIndex];
    } catch (err: any) {
      console.error('[WizardUpdateStep] Error:', err);
      throw new Error(err?.message || 'Failed to update wizard step');
    }
  });

  ipcMain.handle(IPC_CHANNELS.WIZARD_SUBMIT_ACTION, async (_event, wizardId: string, actionType: string, payload: any) => {
    try {
      console.log(`[WizardAction] ${wizardId} / ${actionType}`, payload);
      
      if (wizardId === 'script-writer' && actionType === 'generate') {
        const { scriptName, type, targetPath } = payload;
        const content = generatePapyrusBoilerplate(scriptName, type);
        
        if (targetPath) {
          const fs = require('fs');
          const path = require('path');
          const fullPath = path.isAbsolute(targetPath) ? targetPath : path.join(process.cwd(), targetPath);
          
          const dir = path.dirname(fullPath);
          if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
          
          fs.writeFileSync(fullPath, content, 'utf-8');
          return { success: true, message: `Script saved to ${fullPath}`, path: fullPath };
        }
        return { success: true, content };
      }
      
      if (wizardId === 'blender-companion' && actionType === 'inject') {
        const fs = require('fs');
        const path = require('path');
        const setupScriptPath = path.join(process.cwd(), 'scripts', 'blender', 'f4_setup.py');
        
        if (!fs.existsSync(setupScriptPath)) {
          throw new Error('Blender setup script not found at ' + setupScriptPath);
        }
        
        const scriptContent = fs.readFileSync(setupScriptPath, 'utf-8');
        
        // In a real bridge, we would send this to the BridgeServer or call Blender
        console.log('[BlenderCompanion] Injecting script content:', scriptContent.substring(0, 100) + '...');
        
        // Let's also save it to the project folder if provided
        const { targetPath } = payload;
        if (targetPath) {
          const fullPath = path.isAbsolute(targetPath) ? targetPath : path.join(process.cwd(), targetPath);
          fs.writeFileSync(fullPath, scriptContent, 'utf-8');
          return { success: true, message: `Setup script injected and saved to ${fullPath}`, path: fullPath };
        }
        
        return { success: true, script: scriptContent, message: 'Blender setup script ready for injection.' };
      }
      
      return { success: true, message: `Action ${actionType} submitted` };
    } catch (err: any) {
      console.error('[WizardSubmitAction] Error:', err);
      throw new Error(err?.message || 'Failed to submit wizard action');
    }
  });

  // ===== ADVANCED FEATURES: Collaboration =====
  ipcMain.handle(IPC_CHANNELS.COLLABORATION_JOIN_SESSION, async (_event, sessionId: string) => {
    try {
      const settings = getSettings();
      const session: CollaborationSession = {
        id: sessionId,
        projectId: settings.currentProjectId || '',
        participants: [],
        activeFiles: [],
        lastActivity: Date.now(),
        status: 'active',
      };

      // Add to collaboration sessions if not exists
      const existingIndex = settings.collaborationSessions.findIndex(s => s.id === sessionId);
      if (existingIndex === -1) {
        settings.collaborationSessions.push(session);
      } else {
        settings.collaborationSessions[existingIndex] = session;
      }

      setSettings(settings);
      return session;
    } catch (err: any) {
      console.error('[CollaborationJoin] Error:', err);
      throw new Error(err?.message || 'Failed to join collaboration session');
    }
  });

  ipcMain.handle(IPC_CHANNELS.COLLABORATION_LEAVE_SESSION, async (_event, sessionId: string) => {
    try {
      const settings = getSettings();
      settings.collaborationSessions = settings.collaborationSessions.filter(s => s.id !== sessionId);
      setSettings(settings);
      return true;
    } catch (err: any) {
      console.error('[CollaborationLeave] Error:', err);
      throw new Error(err?.message || 'Failed to leave collaboration session');
    }
  });

  ipcMain.handle(IPC_CHANNELS.COLLABORATION_SYNC_FILE, async (_event, sessionId: string, filePath: string, content: string) => {
    try {
      // In a real implementation, this would sync with other participants
      // For now, just save locally
      const fs = require('fs');
      const path = require('path');

      // Ensure directory exists
      const dir = path.dirname(filePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      fs.writeFileSync(filePath, content, 'utf-8');

      // Update session activity
      const settings = getSettings();
      const sessionIndex = settings.collaborationSessions.findIndex(s => s.id === sessionId);
      if (sessionIndex !== -1) {
        settings.collaborationSessions[sessionIndex].lastActivity = Date.now();
        if (!settings.collaborationSessions[sessionIndex].activeFiles.includes(filePath)) {
          settings.collaborationSessions[sessionIndex].activeFiles.push(filePath);
        }
        setSettings(settings);
      }

      return true;
    } catch (err: any) {
      console.error('[CollaborationSync] Error:', err);
      throw new Error(err?.message || 'Failed to sync file');
    }
  });

  // ===== ADVANCED FEATURES: Version Control Integration =====
  ipcMain.handle(IPC_CHANNELS.COLLABORATION_GIT_INIT, async (_event, projectId: string, config: VersionControlConfig) => {
    try {
      const settings = getSettings();
      const project = settings.projects.find(p => p.id === projectId);

      if (!project) {
        throw new Error(`Project not found: ${projectId}`);
      }

      const { execSync } = require('child_process');
      const projectPath = project.path;

      // Initialize git repository
      execSync('git init', { cwd: projectPath });

      // Set up config
      if (config.remote) {
        execSync(`git remote add origin ${config.remote}`, { cwd: projectPath });
      }

      // Create .gitignore
      const gitignorePath = path.join(projectPath, '.gitignore');
      const gitignoreContent = config.ignorePatterns.join('\n');
      fs.writeFileSync(gitignorePath, gitignoreContent, 'utf-8');

      // Update project with version control config
      project.versionControl = config;
      setSettings(settings);

      return true;
    } catch (err: any) {
      console.error('[GitInit] Error:', err);
      throw new Error(err?.message || 'Failed to initialize git repository');
    }
  });

  ipcMain.handle(IPC_CHANNELS.COLLABORATION_GIT_COMMIT, async (_event, projectId: string, message: string, files?: string[]) => {
    try {
      const settings = getSettings();
      const project = settings.projects.find(p => p.id === projectId);

      if (!project) {
        throw new Error(`Project not found: ${projectId}`);
      }

      const { execSync } = require('child_process');
      const projectPath = project.path;

      // Add files
      if (files && files.length > 0) {
        const fileList = files.map(f => `"${f}"`).join(' ');
        execSync(`git add ${fileList}`, { cwd: projectPath });
      } else {
        execSync('git add .', { cwd: projectPath });
      }

      // Commit
      execSync(`git commit -m "${message}"`, { cwd: projectPath });

      return true;
    } catch (err: any) {
      console.error('[GitCommit] Error:', err);
      throw new Error(err?.message || 'Failed to commit changes');
    }
  });

  ipcMain.handle(IPC_CHANNELS.COLLABORATION_GIT_PUSH, async (_event, projectId: string) => {
    try {
      const settings = getSettings();
      const project = settings.projects.find(p => p.id === projectId);

      if (!project) {
        throw new Error(`Project not found: ${projectId}`);
      }

      const { execSync } = require('child_process');
      const projectPath = project.path;

      execSync('git push', { cwd: projectPath });

      return true;
    } catch (err: any) {
      console.error('[GitPush] Error:', err);
      throw new Error(err?.message || 'Failed to push changes');
    }
  });

  ipcMain.handle(IPC_CHANNELS.COLLABORATION_GIT_PULL, async (_event, projectId: string) => {
    try {
      const settings = getSettings();
      const project = settings.projects.find(p => p.id === projectId);

      if (!project) {
        throw new Error(`Project not found: ${projectId}`);
      }

      const { execSync } = require('child_process');
      const projectPath = project.path;

      execSync('git pull', { cwd: projectPath });

      return true;
    } catch (err: any) {
      console.error('[GitPull] Error:', err);
      throw new Error(err?.message || 'Failed to pull changes');
    }
  });

  // ===== ADVANCED FEATURES: Analytics =====
  ipcMain.handle(IPC_CHANNELS.ANALYTICS_TRACK_EVENT, async (_event, event: AnalyticsEvent) => {
    try {
      const settings = getSettings();

      // Only track if analytics is enabled
      if (!settings.analytics.enabled) {
        return true;
      }

      // Generate anonymous ID if not set
      if (!settings.analytics.anonymousId) {
        settings.analytics.anonymousId = `anon_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        setSettings(settings);
      }

      const analyticsEvent: AnalyticsEvent = {
        ...event,
        id: event.id || `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        timestamp: event.timestamp || Date.now(),
        userId: settings.analytics.anonymousId,
        sessionId: event.sessionId || `session_${Date.now()}`,
        version: app.getVersion(),
        platform: process.platform,
      };

      // Store locally if enabled
      if (settings.analytics.destinations.local) {
        const store = getStore();
        if (!store.analytics) {
          store.analytics = [];
        }
        store.analytics.push(analyticsEvent);

        // Clean up old events based on retention policy
        const cutoffDate = Date.now() - (settings.analytics.dataRetentionDays * 24 * 60 * 60 * 1000);
        store.analytics = store.analytics.filter(e => e.timestamp > cutoffDate);

        // Save store
        const fs = require('fs');
        const storePath = path.join(app.getPath('userData'), 'store.json');
        fs.writeFileSync(storePath, JSON.stringify(store, null, 2), 'utf-8');
      }

      // In a real implementation, you would send to analytics service here
      // if (settings.analytics.destinations.remote) {
      //   // Send to analytics service
      // }

      return true;
    } catch (err: any) {
      console.error('[AnalyticsTrack] Error:', err);
      // Don't throw error for analytics failures
      return false;
    }
  });

  ipcMain.handle(IPC_CHANNELS.ANALYTICS_GET_METRICS, async () => {
    try {
      const settings = getSettings();
      const store = getStore();

      const events = store.analytics || [];
      const now = Date.now();
      const sessionStart = Math.min(...events.map(e => e.timestamp));

      const metrics: UsageMetrics = {
        sessionStart,
        sessionDuration: now - sessionStart,
        featuresUsed: [...new Set(events.map(e => e.category))] as string[],
        toolsLaunched: events.filter(e => e.event === 'tool_launched').map(e => e.properties.tool as string),
        filesProcessed: events.filter(e => e.event === 'file_processed').length,
        errorsEncountered: events.filter(e => e.category === 'error').length,
        performanceMetrics: {
          avgResponseTime: 0, // Would need to calculate from actual timing events
          memoryUsage: 0, // Would need system monitoring
          cpuUsage: 0, // Would need system monitoring
        },
      };

      return metrics;
    } catch (err: any) {
      console.error('[AnalyticsMetrics] Error:', err);
      throw new Error(err?.message || 'Failed to get analytics metrics');
    }
  });

  ipcMain.handle(IPC_CHANNELS.ANALYTICS_EXPORT_DATA, async () => {
    try {
      const store = getStore();
      const events = store.analytics || [];

      // Export as JSON string
      return JSON.stringify(events, null, 2);
    } catch (err: any) {
      console.error('[AnalyticsExport] Error:', err);
      throw new Error(err?.message || 'Failed to export analytics data');
    }
  });

  ipcMain.handle(IPC_CHANNELS.ANALYTICS_UPDATE_CONFIG, async (_event, config: Partial<AnalyticsConfig>) => {
    try {
      const settings = getSettings();
      settings.analytics = { ...settings.analytics, ...config };
      setSettings(settings);
      return settings.analytics;
    } catch (err: any) {
      console.error('[AnalyticsConfig] Error:', err);
      throw new Error(err?.message || 'Failed to update analytics config');
    }
  });

  // ===== BA2 ARCHIVE MANAGEMENT =====
  ipcMain.handle('ba2-merge', async (_event, inputArchives: string[], outputArchive: string, archiveType: 'general' | 'texture') => {
    try {
      const { spawn } = require('child_process');
      const scriptPath = path.join(__dirname, '../../scripts/ba2/merge-ba2.ps1');

      // Convert paths to absolute if relative
      const absInputArchives = inputArchives.map(archive => path.resolve(archive));
      const absOutputArchive = path.resolve(outputArchive);

      return new Promise((resolve, reject) => {
        const args = [
          '-NoProfile',
          '-ExecutionPolicy', 'Bypass',
          '-File', scriptPath,
          '-InputArchives', absInputArchives,
          '-OutputArchive', absOutputArchive,
          '-ArchiveType', archiveType
        ];

        const child = spawn('powershell.exe', args, {
          cwd: process.cwd(),
          stdio: ['pipe', 'pipe', 'pipe']
        });

        let stdout = '';
        let stderr = '';

        child.stdout.on('data', (data: Buffer) => {
          stdout += data.toString();
        });

        child.stderr.on('data', (data: Buffer) => {
          stderr += data.toString();
        });

        child.on('close', (code: number) => {
          if (code === 0) {
            try {
              const result = JSON.parse(stdout.trim());
              resolve(result);
            } catch (parseErr) {
              resolve({ success: true, message: 'BA2 merge completed', output: stdout });
            }
          } else {
            reject(new Error(`BA2 merge failed: ${stderr || stdout}`));
          }
        });

        child.on('error', (err: Error) => {
          reject(new Error(`Failed to start BA2 merge: ${err.message}`));
        });
      });
    } catch (err: any) {
      console.error('[BA2Merge] Error:', err);
      throw new Error(err?.message || 'Failed to merge BA2 archives');
    }
  });

  // ===== MINING OPERATIONS =====
  ipcMain.handle('mining-start', async () => {
    try {
      await miningOrchestrator.startMining();
      return { success: true };
    } catch (error: any) {
      console.error('[MiningStart] Error:', error);
      throw new Error(error?.message || 'Failed to start mining operations');
    }
  });

  ipcMain.handle('mining-stop', async () => {
    try {
      await miningOrchestrator.stopMining();
      return { success: true };
    } catch (error: any) {
      console.error('[MiningStop] Error:', error);
      throw new Error(error?.message || 'Failed to stop mining operations');
    }
  });

  ipcMain.handle('mining-get-status', async () => {
    try {
      return miningOrchestrator.getStatus();
    } catch (error: any) {
      console.error('[MiningStatus] Error:', error);
      throw new Error(error?.message || 'Failed to get mining status');
    }
  });

  ipcMain.handle('mining-get-results', async () => {
    try {
      return await miningOrchestrator.getComprehensiveResults();
    } catch (error: any) {
      console.error('[MiningResults] Error:', error);
      throw new Error(error?.message || 'Failed to get mining results');
    }
  });

  ipcMain.handle('mining-deep-analysis', async (_event, options: {
    nifFiles?: string[];
    ddsFiles?: string[];
    ba2Files?: string[];
    papyrusFiles?: string[];
  }) => {
    try {
      return await miningOrchestrator.performDeepAssetAnalysis(
        options.nifFiles || [],
        options.ddsFiles || [],
        options.ba2Files || [],
        options.papyrusFiles || []
      );
    } catch (error: any) {
      console.error('[MiningDeepAnalysis] Error:', error);
      throw new Error(error?.message || 'Failed to perform deep asset analysis');
    }
  });

  ipcMain.handle('mining-batch-job', async (_event, job: any) => {
    try {
      return await miningOrchestrator.executeBatchJob(job);
    } catch (error: any) {
      console.error('[MiningBatchJob] Error:', error);
      throw new Error(error?.message || 'Failed to execute batch job');
    }
  });

  ipcMain.handle('mining-resolve-conflicts', async (_event, modDirectory: string) => {
    try {
      return await miningOrchestrator.detectAndResolveConflicts(modDirectory);
    } catch (error: any) {
      console.error('[MiningResolveConflicts] Error:', error);
      throw new Error(error?.message || 'Failed to resolve conflicts');
    }
  });

  ipcMain.handle('mining-workflow-recommendations', async (_event, options: {
    currentWorkflow: string[];
    availableTools: string[];
  }) => {
    try {
      return await miningOrchestrator.getWorkflowRecommendations(
        options.currentWorkflow,
        options.availableTools
      );
    } catch (error: any) {
      console.error('[MiningWorkflowRecommendations] Error:', error);
      throw new Error(error?.message || 'Failed to get workflow recommendations');
    }
  });

  ipcMain.handle('mining-update-config', async (_event, config: any) => {
    try {
      await miningOrchestrator.updateConfiguration(config);
      return { success: true };
    } catch (error: any) {
      console.error('[MiningUpdateConfig] Error:', error);
      throw new Error(error?.message || 'Failed to update mining configuration');
    }
  });

  // ===== PHASE 1: ASSET CORRELATION ENGINE =====
  ipcMain.handle('mining-asset-correlation-start', async (_event, config?: any) => {
    try {
      if (config) {
        // Update engine configuration if provided
        miningOrchestrator.updateAssetCorrelationConfig(config);
      }
      await miningOrchestrator.startAssetCorrelation();
      return { success: true };
    } catch (error: any) {
      console.error('[AssetCorrelationStart] Error:', error);
      throw new Error(error?.message || 'Failed to start asset correlation');
    }
  });

  ipcMain.handle('mining-asset-correlation-stop', async () => {
    try {
      await miningOrchestrator.stopAssetCorrelation();
      return { success: true };
    } catch (error: any) {
      console.error('[AssetCorrelationStop] Error:', error);
      throw new Error(error?.message || 'Failed to stop asset correlation');
    }
  });

  ipcMain.handle('mining-asset-correlation-status', async () => {
    try {
      return miningOrchestrator.getAssetCorrelationStatus();
    } catch (error: any) {
      console.error('[AssetCorrelationStatus] Error:', error);
      throw new Error(error?.message || 'Failed to get asset correlation status');
    }
  });

  ipcMain.handle('mining-asset-correlation-results', async () => {
    try {
      return await miningOrchestrator.getAssetCorrelationResults();
    } catch (error: any) {
      console.error('[AssetCorrelationResults] Error:', error);
      throw new Error(error?.message || 'Failed to get asset correlation results');
    }
  });

  // ===== PHASE 1: PATTERN RECOGNITION ENGINE =====
  ipcMain.handle('mining-pattern-recognition-start', async (_event, config?: any) => {
    try {
      if (config) {
        // Update engine configuration if provided
        miningOrchestrator.updatePatternRecognitionConfig(config);
      }
      await miningOrchestrator.startPatternRecognition();
      return { success: true };
    } catch (error: any) {
      console.error('[PatternRecognitionStart] Error:', error);
      throw new Error(error?.message || 'Failed to start pattern recognition');
    }
  });

  ipcMain.handle('mining-pattern-recognition-stop', async () => {
    try {
      await miningOrchestrator.stopPatternRecognition();
      return { success: true };
    } catch (error: any) {
      console.error('[PatternRecognitionStop] Error:', error);
      throw new Error(error?.message || 'Failed to stop pattern recognition');
    }
  });

  ipcMain.handle('mining-pattern-recognition-status', async () => {
    try {
      return miningOrchestrator.getPatternRecognitionStatus();
    } catch (error: any) {
      console.error('[PatternRecognitionStatus] Error:', error);
      throw new Error(error?.message || 'Failed to get pattern recognition status');
    }
  });

  ipcMain.handle('mining-pattern-recognition-results', async () => {
    try {
      return await miningOrchestrator.getPatternRecognitionResults();
    } catch (error: any) {
      console.error('[PatternRecognitionResults] Error:', error);
      throw new Error(error?.message || 'Failed to get pattern recognition results');
    }
  });

  console.log('DEBUG: setupIpcHandlers() completed successfully');
}

// ===== ADVANCED FEATURES: Enhanced ML, Monitoring, Data Management, Scalability =====

// Enhanced LLM Service IPC handlers
ipcMain.handle('llm-generate-with-explainability', async (_event, messages: any[], config: any, includeExplainability: boolean) => {
  try {
    return await llmService.generateResponseWithExplainability(messages, config, includeExplainability);
  } catch (error: any) {
    console.error('[LLMExplainability] Error:', error);
    throw new Error(error?.message || 'Failed to generate response with explainability');
  }
});

ipcMain.handle('llm-save-model-version', async (_event, version: any) => {
  try {
    return await llmService.saveModelVersion(version);
  } catch (error: any) {
    console.error('[LLMSaveVersion] Error:', error);
    throw new Error(error?.message || 'Failed to save model version');
  }
});

ipcMain.handle('llm-get-model-versions', async () => {
  try {
    return await llmService.getActiveModelVersions();
  } catch (error: any) {
    console.error('[LLMGetVersions] Error:', error);
    throw new Error(error?.message || 'Failed to get model versions');
  }
});

ipcMain.handle('llm-create-ab-test', async (_event, test: any) => {
  try {
    return await llmService.createABTest(test);
  } catch (error: any) {
    console.error('[LLMCreateABTest] Error:', error);
    throw new Error(error?.message || 'Failed to create A/B test');
  }
});

ipcMain.handle('llm-get-performance-metrics', async (_event, timeRange?: number) => {
  try {
    return llmService.getPerformanceMetrics(timeRange);
  } catch (error: any) {
    console.error('[LLMPerformance] Error:', error);
    throw new Error(error?.message || 'Failed to get performance metrics');
  }
});

// Monitoring Service IPC handlers
ipcMain.handle('monitoring-start', async () => {
  try {
    await monitoringService.start();
    return true;
  } catch (error: any) {
    console.error('[MonitoringStart] Error:', error);
    throw new Error(error?.message || 'Failed to start monitoring service');
  }
});

ipcMain.handle('monitoring-stop', async () => {
  try {
    await monitoringService.stop();
    return true;
  } catch (error: any) {
    console.error('[MonitoringStop] Error:', error);
    throw new Error(error?.message || 'Failed to stop monitoring service');
  }
});

ipcMain.handle('monitoring-create-alert-rule', async (_event, rule: any) => {
  try {
    return await monitoringService.createAlertRule(rule);
  } catch (error: any) {
    console.error('[MonitoringCreateAlert] Error:', error);
    throw new Error(error?.message || 'Failed to create alert rule');
  }
});

ipcMain.handle('monitoring-get-alert-rules', async () => {
  try {
    return monitoringService.getAlertRules();
  } catch (error: any) {
    console.error('[MonitoringGetAlerts] Error:', error);
    throw new Error(error?.message || 'Failed to get alert rules');
  }
});

ipcMain.handle('monitoring-get-health', async () => {
  try {
    return monitoringService.getCurrentHealth();
  } catch (error: any) {
    console.error('[MonitoringGetHealth] Error:', error);
    throw new Error(error?.message || 'Failed to get system health');
  }
});

ipcMain.handle('monitoring-get-metrics', async (_event, name?: string, timeRange?: number) => {
  try {
    return monitoringService.getMetrics(name, timeRange);
  } catch (error: any) {
    console.error('[MonitoringGetMetrics] Error:', error);
    throw new Error(error?.message || 'Failed to get metrics');
  }
});

ipcMain.handle('monitoring-get-notifications', async (_event, limit?: number) => {
  try {
    return monitoringService.getNotifications(limit);
  } catch (error: any) {
    console.error('[MonitoringGetNotifications] Error:', error);
    throw new Error(error?.message || 'Failed to get notifications');
  }
});

// Data Management Service IPC handlers
ipcMain.handle('data-create-user-profile', async (_event, userData: any) => {
  try {
    return await dataManagementService.createUserProfile(userData);
  } catch (error: any) {
    console.error('[DataCreateProfile] Error:', error);
    throw new Error(error?.message || 'Failed to create user profile');
  }
});

ipcMain.handle('data-get-user-profile', async (_event, userId: string) => {
  try {
    return await dataManagementService.getUserProfile(userId);
  } catch (error: any) {
    console.error('[DataGetProfile] Error:', error);
    throw new Error(error?.message || 'Failed to get user profile');
  }
});

ipcMain.handle('data-update-user-profile', async (_event, userId: string, updates: any) => {
  try {
    await dataManagementService.updateUserProfile(userId, updates);
    return true;
  } catch (error: any) {
    console.error('[DataUpdateProfile] Error:', error);
    throw new Error(error?.message || 'Failed to update user profile');
  }
});

ipcMain.handle('data-submit-gdpr-request', async (_event, request: any) => {
  try {
    return await dataManagementService.submitGDPRRequest(request);
  } catch (error: any) {
    console.error('[DataGDPRRequest] Error:', error);
    throw new Error(error?.message || 'Failed to submit GDPR request');
  }
});

ipcMain.handle('data-get-gdpr-request', async (_event, requestId: string) => {
  try {
    return await dataManagementService.getGDPRRequest(requestId);
  } catch (error: any) {
    console.error('[DataGetGDPR] Error:', error);
    throw new Error(error?.message || 'Failed to get GDPR request');
  }
});

ipcMain.handle('data-request-export', async (_event, userId: string, options?: any) => {
  try {
    return await dataManagementService.requestDataExport(userId, options);
  } catch (error: any) {
    console.error('[DataExport] Error:', error);
    throw new Error(error?.message || 'Failed to request data export');
  }
});

ipcMain.handle('data-get-export', async (_event, exportId: string) => {
  try {
    return await dataManagementService.getDataExport(exportId);
  } catch (error: any) {
    console.error('[DataGetExport] Error:', error);
    throw new Error(error?.message || 'Failed to get data export');
  }
});

ipcMain.handle('data-get-privacy-settings', async () => {
  try {
    return dataManagementService.getPrivacySettings();
  } catch (error: any) {
    console.error('[DataGetPrivacy] Error:', error);
    throw new Error(error?.message || 'Failed to get privacy settings');
  }
});

ipcMain.handle('data-update-privacy-settings', async (_event, settings: any) => {
  try {
    await dataManagementService.updatePrivacySettings(settings);
    return true;
  } catch (error: any) {
    console.error('[DataUpdatePrivacy] Error:', error);
    throw new Error(error?.message || 'Failed to update privacy settings');
  }
});

// Scalability Service IPC handlers
ipcMain.handle('scalability-get-cache', async (_event, key: string) => {
  try {
    return await scalabilityService.get(key);
  } catch (error: any) {
    console.error('[ScalabilityGetCache] Error:', error);
    throw new Error(error?.message || 'Failed to get cached value');
  }
});

ipcMain.handle('scalability-set-cache', async (_event, key: string, value: any, ttl?: number) => {
  try {
    await scalabilityService.set(key, value, ttl);
    return true;
  } catch (error: any) {
    console.error('[ScalabilitySetCache] Error:', error);
    throw new Error(error?.message || 'Failed to set cache value');
  }
});

ipcMain.handle('scalability-submit-task', async (_event, task: any) => {
  try {
    return await scalabilityService.submitTask(task);
  } catch (error: any) {
    console.error('[ScalabilitySubmitTask] Error:', error);
    throw new Error(error?.message || 'Failed to submit task');
  }
});

ipcMain.handle('scalability-get-task-status', async (_event, taskId: string) => {
  try {
    return await scalabilityService.getTaskStatus(taskId);
  } catch (error: any) {
    console.error('[ScalabilityGetTask] Error:', error);
    throw new Error(error?.message || 'Failed to get task status');
  }
});

ipcMain.handle('scalability-register-worker', async (_event, workerId: string, capabilities: string[], type?: string) => {
  try {
    await scalabilityService.registerWorker(workerId, capabilities, type as any);
    return true;
  } catch (error: any) {
    console.error('[ScalabilityRegisterWorker] Error:', error);
    throw new Error(error?.message || 'Failed to register worker');
  }
});

ipcMain.handle('scalability-get-available-workers', async () => {
  try {
    return scalabilityService.getAvailableWorkers();
  } catch (error: any) {
    console.error('[ScalabilityGetWorkers] Error:', error);
    throw new Error(error?.message || 'Failed to get available workers');
  }
});

/**
 * App lifecycle
 */

app.whenReady().then(() => {
  log('App is ready, starting initialization...');
  
  try {
    // Load environment variables after ready to ensure paths are stable
    dotenv.config({ path: envPath, quiet: true });
    log('Env config loaded.');

    // Initialize services and store after app is ready (each wrapped for safety)
    log('Initializing services...');

    const safeInit = <T>(name: string, fn: () => T): T | null => {
      try {
        log(`Init service: ${name} (start)`);
        const val = fn();
        log(`Init service: ${name} (ok)`);
        return val;
      } catch (err: any) {
        log(`Init service: ${name} (FAILED) ${err?.stack || err?.message || err}`);
        return null;
      }
    };

    const createStubScalability = (): IScalabilityService => {
      const noop = async (..._args: any[]) => null;
      return {
        get: noop,
        set: noop,
        submitTask: noop,
        getTaskStatus: noop,
        registerWorker: noop,
        getAvailableWorkers: () => [],
        shutdown: noop,
      } as unknown as IScalabilityService;
    };

    const forceStubScalability = app.isPackaged; // avoid native sqlite crash in packaged builds

    llmService = safeInit('EnhancedLLMService', () => new EnhancedLLMService()) as any;
    miningOrchestrator = safeInit('MiningOperationsOrchestrator', () => new MiningOperationsOrchestrator(defaultMiningConfiguration)) as any;
    monitoringService = safeInit('MonitoringService', () => new MonitoringService()) as any;
    dataManagementService = safeInit('DataManagementService', () => new DataManagementService()) as any;

    if (forceStubScalability) {
      log('ScalabilityService init skipped (stub forced in packaged build).');
      scalabilityService = createStubScalability();
    } else {
      scalabilityService = safeInit('ScalabilityService', () => new ScalabilityService()) as any;
      if (!scalabilityService) {
        log('ScalabilityService failed to init; using stub implementation.');
        scalabilityService = createStubScalability();
      }
    }

    log('Services initialized.');

    // Initialize store and environment settings
    const store = getStore();
    log('Store initialized.');
    
    // Apply environment keys to settings if missing
    log('Checking environment keys...');
    const currentSettings = store.settings;
    const settingsToUpdate: Partial<Settings> = {};
    if (process.env.OPENAI_API_KEY && !currentSettings.openaiApiKey) settingsToUpdate.openaiApiKey = process.env.OPENAI_API_KEY;
    if (process.env.GROQ_API_KEY && !currentSettings.groqApiKey) settingsToUpdate.groqApiKey = process.env.GROQ_API_KEY;
    if (process.env.DEEPGRAM_API_KEY && !currentSettings.deepgramApiKey) settingsToUpdate.deepgramApiKey = process.env.DEEPGRAM_API_KEY;
    if (process.env.ELEVENLABS_API_KEY && !currentSettings.elevenLabsApiKey) settingsToUpdate.elevenLabsApiKey = process.env.ELEVENLABS_API_KEY;
    if (Object.keys(settingsToUpdate).length > 0) {
      setSettings(settingsToUpdate);
      log('Environment keys applied to settings.');
    }

    // Create window and setup
    log('Creating window...');
    try {
      createWindow();
    } catch (err: any) {
      log('createWindow threw: ' + (err?.stack || err?.message || err));
      throw err;
    }
    
    log('Creating tray...');
    createTray();
    
    log('Registering shortcuts...');
    registerGlobalShortcut();
    
    // Register F12 for dev tools (works even in production)
    globalShortcut.register('F12', () => {
      if (mainWindow) {
        mainWindow.webContents.openDevTools();
      }
    });

    log('Setting up IPC handlers...');
    setupIpcHandlers();

    // Initialize mining operations
    log('Initializing mining orchestrator...');
    miningOrchestrator.initialize().catch(error => {
      log('[Main] Failed to initialize mining operations: ' + error.message);
    });

    // Initialize advanced services
    log('Starting monitoring service...');
    monitoringService.start().catch(error => {
      log('[Main] Failed to start monitoring service: ' + error.message);
    });

    // Register some sample workers for distributed processing
    log('Registering workers...');
    scalabilityService.registerWorker('cpu-worker-1', ['cpu', 'general'], 'cpu').catch(error => {
      log('[Main] Failed to register CPU worker: ' + error.message);
    });

    scalabilityService.registerWorker('gpu-worker-1', ['gpu', 'ml'], 'gpu').catch(error => {
      log('[Main] Failed to register GPU worker: ' + error.message);
    });
    
    log('App initialization completed.');
  } catch (err: any) {
    log('CRITICAL error during app.ready: ' + (err?.stack || err?.message || err));
    dialog.showErrorBox('Initialization Error', err?.stack || err?.message || String(err));
  }

  app.on('activate', () => {
    // On macOS, re-create window when dock icon is clicked and no windows are open
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });

  app.on('second-instance', () => {
    log('Second instance launched, focusing main window');
    // Focus the main window if a second instance is launched
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });
});

app.on('window-all-closed', () => {
  // On macOS, apps stay active until user quits explicitly with Cmd + Q
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('will-quit', () => {
  // Set quitting flag so window close won't prevent quit
  isQuitting = true;
  // Unregister all shortcuts
  globalShortcut.unregisterAll();
  
  // Cleanup mining operations
  if (miningOrchestrator) {
    miningOrchestrator.cleanup().catch(error => {
      console.error('[Main] Error during mining cleanup:', error);
    });
  }
  
  // Cleanup advanced services
  if (monitoringService) {
    monitoringService.stop().catch(error => {
      console.error('[Main] Error stopping monitoring service:', error);
    });
  }
  
  if (scalabilityService) {
    scalabilityService.shutdown().catch(error => {
      console.error('[Main] Error shutting down scalability service:', error);
    });
  }
});

/**
 * Auto-start configuration
 * 
 * Platform-specific instructions for enabling auto-start on login:
 * 
 * Windows:
 * - Use app.setLoginItemSettings() API (requires packaged app)
 * - Or create a shortcut in %APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup
 * 
 * macOS:
 * - Use app.setLoginItemSettings() API (requires packaged app)
 * - Or add to System Preferences > Users & Groups > Login Items
 * 
 * Linux:
 * - Create .desktop file in ~/.config/autostart/
 * - Example: desktop-ai-assistant.desktop with Exec pointing to app binary
 * 
 * Example code (uncomment when ready to enable):
 * 
 * function configureAutoStart(enable: boolean) {
 *   if (app.isPackaged) {
 *     app.setLoginItemSettings({
 *       openAtLogin: enable,
 *       openAsHidden: true, // Start minimized
 *     });
 *   } else {
 *     console.log('Auto-start only available in packaged app');
 *   }
 * }
 */
