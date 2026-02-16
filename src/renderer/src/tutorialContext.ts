/**
 * Tutorial Context System for Mossy AI Integration
 * 
 * This system provides context-aware tutorial assistance, allowing Mossy to:
 * - Understand which page the user is on
 * - Provide relevant help based on current context
 * - Guide users through the tutorial interactively
 * - Answer questions about specific UI elements
 */

export interface TutorialPageContext {
  /** Unique identifier for the page */
  pageId: string;
  
  /** Human-readable page name */
  pageName: string;
  
  /** Route path (e.g., "/chat", "/tools/auditor") */
  route: string;
  
  /** Brief description of page purpose */
  purpose: string;
  
  /** Key features available on this page */
  features: string[];
  
  /** Buttons and controls with descriptions */
  controls: {
    name: string;
    type: 'button' | 'input' | 'dropdown' | 'slider' | 'toggle';
    description: string;
    whenToUse: string;
  }[];
  
  /** Common beginner mistakes on this page */
  commonMistakes: string[];
  
  /** Step-by-step guides for common tasks */
  guides: {
    title: string;
    steps: string[];
  }[];
  
  /** Links to relevant tutorial sections */
  tutorialSections: string[];
  
  /** Suggested questions users might ask */
  suggestedQuestions: string[];
}

// Tutorial context for each page
export const tutorialContexts: Record<string, TutorialPageContext> = {
  'nexus': {
    pageId: 'nexus',
    pageName: 'The Nexus (Dashboard)',
    route: '/',
    purpose: 'Central hub showing all available modules and quick actions',
    features: [
      'Module cards organized by category',
      'Neural Link status monitoring',
      'Project selector',
      'Quick action buttons',
      'System health indicators',
      'Video tutorial and interactive walkthrough launchers',
      'Quick Help / command-palette access (Ctrl+K)',
    ],
    controls: [
      {
        name: 'Module Card',
        type: 'button',
        description: 'Click to open that module/tool',
        whenToUse: 'When you want to access a specific feature like Chat, Image Suite, or The Auditor',
      },
      {
        name: 'Start New Project Button',
        type: 'button',
        description: 'Creates a new mod project with folder structure',
        whenToUse: 'When beginning a brand new mod',
      },
      {
        name: 'Open Recent Button',
        type: 'button',
        description: 'Shows list of recently worked-on projects',
        whenToUse: 'When continuing work on an existing mod',
      },
      {
        name: 'System Check Button',
        type: 'button',
        description: 'Scans for problems and missing tools',
        whenToUse: 'When something isn\'t working or after installing new tools',
      },
      {
        name: 'Watch Video Tutorial',
        type: 'button',
        description: 'Opens a full-length video walkthrough of the app',
        whenToUse: 'When you prefer a visual overview before using the interactive tutorial',
      },
      {
        name: 'Start Interactive Walkthrough',
        type: 'button',
        description: 'Launches the step-by-step interactive tutorial',
        whenToUse: 'When you want hands-on guidance through the main pages',
      },
    ],
    commonMistakes: [
      'Clicking "Start New Project" when they should open an existing one',
      'Not checking Neural Link status before asking tool-specific questions',
      'Ignoring system health warnings',
      'Missing the command-palette shortcut (Ctrl+K) for quick navigation',
    ],
    guides: [
      {
        title: 'Finding a Module',
        steps: [
          'Look at the module cards on the dashboard',
          'Read the brief descriptions',
          'Click the card that matches your need',
          'Alternatively, use the search bar at the top',
        ],
      },
      {
        title: 'Loading a Project',
        steps: [
          'Click "Open Recent" button',
          'See list of recent projects',
          'Click the project name you want to work on',
          'If not in list, click "Browse for Project" and navigate to your project folder',
        ],
      },
      {
        title: 'Using Quick Help',
        steps: [
          'Press Ctrl+K (Cmd+K on mac) to open the command palette',
          'Type the feature or tool name you\'re looking for',
          'Select the matching command to open that page or action',
        ],
      },
    ],
    tutorialSections: [
      'Understanding the Interface',
      'The Nexus - Your Home Base',
      'Quick Help & Tutorials',
    ],
    suggestedQuestions: [
      'What does each module card do?',
      'How do I start a new project?',
      'What does Neural Link mean?',
      'Why is my bridge status showing WEB MODE?',
      'How do I open the command palette (Ctrl+K)?',
    ],
  },
  
  'chat': {
    pageId: 'chat',
    pageName: 'Chat Interface',
    route: '/chat',
    purpose: 'Text-based AI conversation for modding assistance',
    features: [
      'Natural language interaction with Mossy AI',
      'Context-aware responses',
      'Code generation and file/script handoff',
      'Step-by-step guidance',
      'Chat history with memory',
      'Send-to-Chat handoff from other pages (prefills/transfer)',
      'Saved file links in responses with "Open folder"',
    ],
    controls: [
      {
        name: 'Clear History Button',
        type: 'button',
        description: 'Deletes all messages in the current chat',
        whenToUse: 'When starting a completely new topic that\'s unrelated to previous conversation',
      },
      {
        name: 'Reset Memory / Session',
        type: 'button',
        description: 'Reset conversation context and session-specific working memory',
        whenToUse: 'When you want to clear project-scoped state or start fresh',
      },
      {
        name: 'Export Chat Button',
        type: 'button',
        description: 'Saves conversation as a text file',
        whenToUse: 'When you want to keep instructions or solutions for later reference',
      },
      {
        name: 'Message Input Box',
        type: 'input',
        description: 'Text field where you type your questions',
        whenToUse: 'Always - this is where you communicate with Mossy',
      },
      {
        name: 'Send Button',
        type: 'button',
        description: 'Sends your message to Mossy',
        whenToUse: 'After typing your complete question (or press Enter)',
      },
      {
        name: 'Open Saved Path / Open Folder',
        type: 'button',
        description: 'Opens the filesystem folder for a saved file referenced in chat',
        whenToUse: 'When Mossy provides a saved file path (e.g. generated script or export)',
      },
    ],
    commonMistakes: [
      'Asking one-word questions without context',
      'Clearing history too often (Mossy forgets context)',
      'Not providing error messages when troubleshooting',
      'Expecting Mossy to know what file you\'re working on without telling her',
    ],
    guides: [
      {
        title: 'Having Your First Conversation',
        steps: [
          'Click in the message input box at the bottom',
          'Type a specific question like "How do I create a normal map?"',
          'Press Enter or click the Send button',
          'Wait for Mossy to respond (usually 1-3 seconds)',
          'Read the response and ask follow-up questions',
        ],
      },
      {
        title: 'Getting Help with an Error',
        steps: [
          'Copy the error message from wherever you saw it',
          'Type in chat: "I got this error: [paste error]"',
          'Add context: "I was trying to [what you were doing]"',
          'Send the message',
          'Follow Mossy\'s troubleshooting steps',
        ],
      },
      {
        title: 'Using Send-to-Chat & Saved Files',
        steps: [
          'From another page, click "Send to Chat" to prefill the prompt or checklist',
          'Switch to the Chat page and confirm the prefilled message',
          'If Mossy provides a saved file path, click "Open folder" to jump to it',
          'Export the chat if you want to keep the conversation for later',
        ],
      },
    ],
    tutorialSections: [
      'Chat Interface - Talk to Mossy',
      'Getting Help',
      'Send-to-Chat & Saved Files',
    ],
    suggestedQuestions: [
      'How do I ask good questions?',
      'Can you write code for me?',
      'What should I do if I don\'t understand your answer?',
      'Do you remember our previous conversation?',
      'How do I open a saved file referenced in chat?',
      'How do I send a checklist from another page to Chat?',
    ],
  },
  
  'live-voice': {
    pageId: 'live-voice',
    pageName: 'Live Voice Chat (Live Synapse)',
    route: '/live',
    purpose: 'Real-time, voice-driven interaction with Mossy — live transcription, mic monitoring and embedded audio tools.',
    features: [
      'Real-time voice conversation with live transcription preview',
      'Mic level meter and visual status indicators (listening / speaking / processing)',
      'Central Connect / Disconnect action with connection ring animation',
      'ENCRYPTED BEAM active indicator when link is established',
      'Multiple STT and TTS provider support (browser, Whisper, Deepgram, OpenAI, ElevenLabs)',
      'Embedded Audio Studio and Memory Vault panels for TTS and saved notes',
      'Neural Link monitoring so Mossy adapts to active tools',
    ],
    controls: [
      {
        name: 'Connect / Disconnect (big round action)',
        type: 'button',
        description: 'Starts or terminates a Live Synapse session; shows connection ring while active',
        whenToUse: 'Press to initiate a conversation or end the live session',
      },
      {
        name: 'Input Device Selector',
        type: 'dropdown',
        description: 'Choose system microphone (avoid Stereo Mix unless intended)',
        whenToUse: 'Select the physical mic that should be used for input',
      },
      {
        name: 'Mute Button',
        type: 'toggle',
        description: 'Temporarily silences your microphone during an active session',
        whenToUse: 'When someone interrupts or you need to pause input',
      },
      {
        name: 'Mic Level Meter',
        type: 'slider',
        description: 'Displays real-time mic input level (read-only)',
        whenToUse: 'Use to verify your voice is being detected and not clipping',
      },
      {
        name: 'Settings / Voice Panel',
        type: 'button',
        description: 'Opens Voice Settings and Audio Studio (TTS & presets)',
        whenToUse: 'Configure providers, test voices, and export audio assets',
      },
      {
        name: 'STT / TTS Provider Selectors',
        type: 'dropdown',
        description: 'Switch between speech-to-text and text-to-speech backends',
        whenToUse: 'Choose provider based on latency, quality and available API keys',
      },
      {
        name: 'Audio Studio',
        type: 'button',
        description: 'Create, preview and export TTS/audio assets used by Mossy',
        whenToUse: 'When you need custom voice clips or exported audio for mods',
      },
      {
        name: 'Memory Vault Panel',
        type: 'button',
        description: 'Access saved notes and project memory that the assistant can reference',
        whenToUse: 'Upload or inspect contextual notes you want Mossy to recall',
      },
    ],
    commonMistakes: [
      'Not granting microphone permissions or OS-level mic access',
      'Selecting the wrong input (Stereo Mix) which echoes Mossy back',
      'Interrupting Mossy while she\'s speaking (wait for the listening indicator)',
      'Expecting sub-second responses (allow 1–2s for processing)',
      'Running voice in a noisy room without noise suppression',
    ],
    guides: [
      {
        title: 'First Time Voice Chat Setup & Mic Test',
        steps: [
          'Open Live Synapse and click the central Connect button',
          'Grant microphone permission when prompted by the OS or browser',
          'Select the correct Input Device from the dropdown',
          'Speak a short sentence and confirm the Mic Level Meter moves and transcription appears',
          'If transcription fails, open Settings → Voice and verify STT provider and API keys',
        ],
      },
      {
        title: 'Using Live Synapse for Conversations',
        steps: [
          'Connect and wait for the status to show LINK ESTABLISHED or PROCESSING',
          'Speak clearly and pause at the end so Mossy detects silence',
          'Listen to the spoken response or read the transcription',
          'Use Mute to silence yourself temporarily or Disconnect to end session',
          'Check the ENCRYPTED BEAM badge to confirm secure link when available',
        ],
      },
      {
        title: 'Audio Studio & Memory Vault Workflow',
        steps: [
          'Open Audio Studio to preview and export Mossy\'s voice clips',
          'Adjust volume or speech rate in Voice Settings for natural output',
          'Save important notes to Memory Vault so they appear in Chat and Live contexts',
          'Use "Open folder" from chat to jump to saved audio files',
        ],
      },
      {
        title: 'Troubleshooting Live Voice',
        steps: [
          'Confirm OS microphone permissions and that no other app is exclusively using the mic',
          'Try a different STT provider or fall back to browser STT',
          'Restart the Live Synapse session and check Tools Install / Verify panel suggestions',
        ],
      },
    ],
    tutorialSections: [
      'Live Voice Chat - Speak to Mossy',
      'Voice Settings & Audio Studio',
      'Memory Vault & Neural Link',
      'Troubleshooting Live Sessions',
    ],
    suggestedQuestions: [
      'Why is my mic not listed in the Input Device dropdown?',
      'What does ENCRYPTED BEAM mean in Live Synapse?',
      'How do I export a voice clip from Audio Studio?',
      'Which STT provider is best for noisy rooms?',
      'How do I save repeated instructions to Memory Vault?',
    ],
  },
  
  'auditor': {
    pageId: 'auditor',
    pageName: 'The Auditor',
    route: '/tools/auditor',
    purpose: 'In‑app triage and validation for plugins, meshes, textures and materials with AI advice and in‑place fixes.',
    features: [
      'ESP (.esp/.esm/.esl) analysis and record checks',
      'NIF mesh validation (vertex/triangle checks, absolute path detection)',
      'DDS texture diagnostics and visual preview',
      'BGSM/BGEM material inspection',
      'Batch / folder scanning with scan progress bar',
      'Per‑issue AI advice (Mossy Suggests) and one‑click Fix‑It',
      'Exportable reports and external tool integrations (xEdit, NifSkope, Blender)',
      'Cached analysis results for quick re‑scan',
    ],
    controls: [
      { name: 'ESP / NIF / DDS / BGSM upload buttons', type: 'button', description: 'Upload a single file for inspection (ESP, NIF, DDS or BGSM)', whenToUse: 'Use to add files to the Mod Manifest for analysis' },
      { name: 'Run Audit', type: 'button', description: 'Analyze selected files or entire folder and show progress', whenToUse: 'Click after adding files or when you need an up‑to‑date report' },
      { name: 'Mod Manifest (file list)', type: 'button', description: 'Select a file from the left‑hand manifest to inspect in the center pane', whenToUse: 'When you want to review a specific file and its issues' },
      { name: 'Status Badge / Visual Diagnostics', type: 'button', description: 'Shows file status (clean/warning/error) and texture preview + metadata', whenToUse: 'To verify visual/format issues for textures and materials' },
      { name: 'Fix‑It (per‑issue)', type: 'button', description: 'Attempt an automatic fix for the selected issue', whenToUse: 'When Mossy indicates an auto‑fix is available and you have a backup' },
      { name: 'Ignore Rule', type: 'button', description: 'Mark an issue as intentionally ignored for this project', whenToUse: 'When a flagged issue is acceptable for your mod' },
      { name: 'Ask Mossy / AI Advice', type: 'button', description: 'Request a short, focused explanation and remediation steps from Mossy', whenToUse: 'When you need a concise explanation of the technical issue' },
      { name: 'External Tool Links', type: 'button', description: 'Quick open links to xEdit, NifSkope, Blender or Nexus search', whenToUse: 'When you need to perform manual edits in specialized tools' },
      { name: 'Export Report', type: 'button', description: 'Save the current audit as a report for sharing or offline review', whenToUse: 'Before submitting a bug report or archiving audit results' },
    ],
    commonMistakes: [
      'Running Auto‑Fix without creating a backup first',
      'Assuming warnings are safe to ignore (always inspect)',
      'Keeping files open in other apps while scanning',
      'Relying exclusively on AI advice for complex plugin fixes',
      'Forgetting to re‑scan after applying fixes',
    ],
    guides: [
      { title: 'Quick File Audit', steps: ['Click the DDS / NIF / ESP button to upload a file', 'Select the file from the Mod Manifest', 'Click Run Audit', 'Click any listed issue to read Mossy’s advice', 'Use Fix‑It or open the file in an external tool to remediate', 'Re‑run the audit to confirm the fix'] },
      { title: 'Full Mod Scan & Report', steps: ['Click Select Folder (or add multiple files)', 'Click Run Audit and monitor the progress bar', 'Prioritize errors (fix them first), then resolve warnings', 'Use Export Report to save the summary for reviewers', 'If needed, open problematic files in xEdit or NifSkope for manual fixes'] },
      { title: 'Using Mossy Advice & Fix‑It', steps: ['Click an issue to load Mossy Suggests in the right panel', 'Read the concise remediation steps', 'Click Fix‑It if available (or follow the recommended external-tool steps)', 'If Fix‑It runs, re‑scan to validate the result'] },
      { title: 'Visual Diagnostics for Textures', steps: ['Select a texture in the Mod Manifest', 'Inspect the Visual Diagnostics preview for dimensions/format', 'Check compression and power‑of‑two warnings', 'Use external image tooling or the Image Suite to correct and re‑export'] },
    ],
    tutorialSections: ['The Auditor - Asset Triage', 'Visual Diagnostics & Fixes', 'Exporting & External Tools'],
    suggestedQuestions: [
      'How do I export the audit report?',
      'What does STATUS: error vs warning mean?',
      'How reliable is Fix‑It for NIF/DDS issues?',
      'Where are cached audit results stored (re‑scan behavior)?',
      'How do I open a flagged file in xEdit/NifSkope?',
    ],
  },
  
  'image-suite': {
    pageId: 'image-suite',
    pageName: 'Image Suite',
    route: '/media/images',
    purpose: 'PBR texture generation, format conversion and FO4-ready exports — includes visual previews, presets and DDS tooling integration.',
    features: [
      'Normal / Roughness / Height / Metallic / AO map generation (PBR Synthesizer)',
      'Format conversion (PNG/JPG/TGA/DDS) with optional DDS compression presets',
      'FO4 export preset (_d/_n/_s) for immediate in‑game use',
      'Mipmap control and real‑DDS (texconv) support',
      'Drag & drop source image + live preview',
      'Worker‑based parallel PBR generation for fast results',
      'Fallback DDS mode when external encoder not configured',
    ],
    controls: [
      { name: 'Source Image (drag & drop)', type: 'button', description: 'Add or drop an image to begin (preview shown)', whenToUse: 'When starting any PBR or conversion flow' },
      { name: 'PBR / Format tabs', type: 'button', description: 'Switch between PBR Synthesizer and Format Converter', whenToUse: 'Choose the workflow you need' },
      { name: 'Generate PBR Maps', type: 'button', description: 'Synthesize Normal/Roughness/Height/Metallic/AO maps using web workers', whenToUse: 'After selecting/uploading a source image' },
      { name: 'FO4 Preset Toggle', type: 'toggle', description: 'Lock outputs to FO4 naming/format conventions (_d/_n/_s) and compression', whenToUse: 'When exporting assets directly for Fallout 4' },
      { name: 'Require real DDS', type: 'toggle', description: 'Use a configured external DDS encoder (texconv) instead of fallback stubs', whenToUse: 'Enable if you have texconv configured in The Vault for authentic DDS output' },
      { name: 'DDS Compression / BC Format', type: 'dropdown', description: 'Choose BC1/BC3/BC5/BC7 for DDS exports', whenToUse: 'When saving as DDS and FO4 Preset is disabled or you need specific compression' },
      { name: 'Mipmap Levels', type: 'input', description: 'Controls how many mipmaps to generate (0 = none)', whenToUse: 'When preparing textures for game use with mipmapping' },
      { name: 'Export FO4 DDS (_d/_n/_s)', type: 'button', description: 'Export three FO4‑ready DDS files (diffuse/normal/specular)', whenToUse: 'When you want game-ready outputs for packaging' },
      { name: 'Download / Save buttons on previews', type: 'button', description: 'Download the generated map or converted file', whenToUse: 'After verifying the preview image', },
    ],
    commonMistakes: [
      'Using low-resolution source images for PBR (results suffer)',
      'Not enabling or configuring texconv when Require real DDS is expected',
      'Overwriting originals — always keep backups before export',
      'Expecting fallback DDS to be identical to real texconv output',
      'Forgetting to set mipmap levels for game assets',
    ],
    guides: [
      { title: 'Create PBR Maps and Export', steps: ['Upload or drag a source image into Source Image', 'Open the PBR tab and click Generate PBR Maps', 'Preview generated maps in the result area', 'Use the download icon on any preview to save the map', 'If targeting FO4, enable FO4 Preset and click Export FO4 DDS (_d/_n/_s)'] },
      { title: 'Convert Image Format (with DDS options)', steps: ['Switch to Format Converter tab', 'Select target format (PNG/JPG/TGA/DDS)', 'If DDS is selected, choose BC format and mipmap levels', 'Enable Require real DDS only if texconv is configured in The Vault', 'Click Convert & Download or Export FO4 DDS when FO4 preset is active'] },
      { title: 'FO4 Preset & texconv workflow', steps: ['Enable FO4 Preset to lock naming and formats', 'If you need authentic DDS binaries, set texconv path in The Vault settings', 'Set mipmap levels and export using Export FO4 DDS', 'Verify outputs in-game or open with your DDS viewer'] },
      { title: 'Troubleshooting Fallback DDS', steps: ['If you see a fallback warning, configure texconv or disable Require real DDS', 'Try a different BC format if visual artifacts appear', 'Reduce source image size if processing fails in the browser'] },
    ],
    tutorialSections: ['Image Suite - PBR & Converter', 'FO4 Preset & DDS Details', 'Export & Troubleshooting'],
    suggestedQuestions: [
      'What does FO4 Preset do and when should I use it?',
      'How do I configure texconv for real DDS output?',
      'What mipmap level should I pick for game textures?',
      'Why is a fallback DDS produced and is it safe to use?',
      'Which BC format is correct for normals vs color maps?',
    ],
  },

  'workshop': {
    pageId: 'workshop',
    pageName: 'The Workshop',
    route: '/dev/workshop',
    purpose: 'Code editor and script development environment for modding',
    features: [
      'Syntax-highlighted code editor',
      'Papyrus script support',
      'IntelliSense and auto-completion',
      'Debugging tools',
      'File management',
      'Version control integration',
    ],
    controls: [
      {
        name: 'New File Button',
        type: 'button',
        description: 'Creates a new script file',
        whenToUse: 'When starting a new script or mod',
      },
      {
        name: 'Open File Button',
        type: 'button',
        description: 'Opens existing script files',
        whenToUse: 'When editing existing scripts',
      },
      {
        name: 'Save Button',
        type: 'button',
        description: 'Saves current file',
        whenToUse: 'After making changes to prevent data loss',
      },
      {
        name: 'Run/Debug Button',
        type: 'button',
        description: 'Compiles and tests your script',
        whenToUse: 'To check if your code works correctly',
      },
      {
        name: 'Search/Replace',
        type: 'input',
        description: 'Find and replace text in your code',
        whenToUse: 'When refactoring code or fixing multiple instances',
      },
    ],
    commonMistakes: [
      'Not saving frequently',
      'Using wrong Papyrus syntax',
      'Not testing scripts in-game',
      'Forgetting to compile before testing',
      'Not backing up important scripts',
    ],
    guides: [
      {
        title: 'Creating Your First Script',
        steps: [
          'Click "New File" button',
          'Choose "Papyrus Script" from template',
          'Write your script code',
          'Click "Save" to save the file',
          'Click "Compile" to check for errors',
          'Test in Creation Kit or game',
        ],
      },
    ],
    tutorialSections: [
      'The Workshop - Code Editor',
      'Papyrus Scripting Basics',
    ],
    suggestedQuestions: [
      'How do I create a new script?',
      'What\'s the difference between functions and events?',
      'How do I debug my script?',
      'What are properties and how do I use them?',
    ],
  },

  'orchestrator': {
    pageId: 'orchestrator',
    pageName: 'Workflow Orchestrator',
    route: '/dev/orchestrator',
    purpose: 'Automate complex modding workflows and batch operations',
    features: [
      'Visual workflow builder',
      'Batch processing',
      'Task scheduling',
      'Progress monitoring',
      'Error handling',
      'Workflow templates',
    ],
    controls: [
      {
        name: 'New Workflow Button',
        type: 'button',
        description: 'Creates a new automation workflow',
        whenToUse: 'When setting up a new automated process',
      },
      {
        name: 'Add Task Button',
        type: 'button',
        description: 'Adds a new step to your workflow',
        whenToUse: 'Building out your automation sequence',
      },
      {
        name: 'Run Workflow Button',
        type: 'button',
        description: 'Executes the entire workflow',
        whenToUse: 'After configuring all the steps',
      },
      {
        name: 'Template Selector',
        type: 'dropdown',
        description: 'Choose from pre-built workflow templates',
        whenToUse: 'When you want to start with a common workflow pattern',
      },
    ],
    commonMistakes: [
      'Not testing workflows on small batches first',
      'Running workflows without backups',
      'Not monitoring progress during long operations',
      'Using wrong task order in workflows',
    ],
    guides: [
      {
        title: 'Creating a Texture Conversion Workflow',
        steps: [
          'Click "New Workflow"',
          'Add "File Scanner" task to find PNG files',
          'Add "Image Converter" task for DDS conversion',
          'Add "File Organizer" task to move converted files',
          'Click "Run Workflow" to execute',
        ],
      },
    ],
    tutorialSections: [
      'Workflow Orchestrator - Automation',
      'Creating Custom Workflows',
    ],
    suggestedQuestions: [
      'How do I create a batch conversion workflow?',
      'What tasks are available?',
      'How do I schedule workflows?',
      'What if a workflow fails?',
    ],
  },

  'load-order': {
    pageId: 'load-order',
    pageName: 'Load Order Hub',
    route: '/dev/load-order',
    purpose: 'Manage mod load order and detect conflicts',
    features: [
      'Automatic load order detection',
      'Conflict analysis',
      'Mod dependency checking',
      'LOOT integration',
      'Load order optimization',
      'Conflict resolution suggestions',
    ],
    controls: [
      {
        name: 'Scan Load Order Button',
        type: 'button',
        description: 'Analyzes current mod load order',
        whenToUse: 'When checking for issues after installing mods',
      },
      {
        name: 'Auto Sort Button',
        type: 'button',
        description: 'Automatically sorts mods for optimal loading',
        whenToUse: 'When you want LOOT to organize your mods',
      },
      {
        name: 'Fix Conflicts Button',
        type: 'button',
        description: 'Attempts to resolve detected conflicts',
        whenToUse: 'When conflicts are found and you want auto-resolution',
      },
      {
        name: 'Export Report Button',
        type: 'button',
        description: 'Saves load order analysis to file',
        whenToUse: 'When sharing load order info or keeping records',
      },
    ],
    commonMistakes: [
      'Not checking load order after mod installs',
      'Ignoring conflict warnings',
      'Manual sorting without understanding dependencies',
      'Not backing up load order before changes',
    ],
    guides: [
      {
        title: 'Checking Your Load Order',
        steps: [
          'Click "Scan Load Order"',
          'Review any conflict warnings',
          'Click "Auto Sort" if no major issues',
          'Check "Fix Conflicts" for automatic resolution',
          'Export report for your records',
        ],
      },
    ],
    tutorialSections: [
      'Load Order Management',
      'Resolving Mod Conflicts',
    ],
    suggestedQuestions: [
      'Why is load order important?',
      'How do I fix mod conflicts?',
      'What does LOOT do?',
      'How do I know if mods are compatible?',
    ],
  },

  'holodeck': {
    pageId: 'holodeck',
    pageName: 'Holodeck',
    route: '/test/holo',
    purpose: 'Test mods in a virtual environment before in-game testing',
    features: [
      'Virtual game world simulation',
      'Mod compatibility testing',
      'Performance benchmarking',
      'Error detection',
      'Screenshot automation',
      'Test scenario creation',
    ],
    controls: [
      {
        name: 'Launch Test Button',
        type: 'button',
        description: 'Starts the virtual testing environment',
        whenToUse: 'When ready to test your mod virtually',
      },
      {
        name: 'Create Scenario Button',
        type: 'button',
        description: 'Sets up specific test conditions',
        whenToUse: 'When you need to test specific situations',
      },
      {
        name: 'Run Benchmarks Button',
        type: 'button',
        description: 'Tests performance impact of your mod',
        whenToUse: 'When checking if your mod affects game performance',
      },
      {
        name: 'Capture Screenshots Button',
        type: 'button',
        description: 'Automatically takes test screenshots',
        whenToUse: 'When documenting test results or showing changes',
      },
    ],
    commonMistakes: [
      'Not testing in Holodeck before in-game testing',
      'Using wrong test scenarios',
      'Not checking performance benchmarks',
      'Forgetting to test on different hardware configs',
    ],
    guides: [
      {
        title: 'Testing a Weapon Mod',
        steps: [
          'Click "Create Scenario" and choose "Combat Test"',
          'Select your weapon mod files',
          'Click "Launch Test"',
          'Observe weapon behavior in virtual environment',
          'Check performance benchmarks',
          'Capture screenshots of results',
        ],
      },
    ],
    tutorialSections: [
      'Holodeck - Virtual Testing',
      'Creating Test Scenarios',
    ],
    suggestedQuestions: [
      'How accurate is Holodeck testing?',
      'What scenarios should I test?',
      'How do I benchmark performance?',
      'Can I test multiplayer mods?',
    ],
  },

  'packaging': {
    pageId: 'packaging',
    pageName: 'Packaging Hub',
    route: '/packaging-release',
    purpose: 'Package and distribute your completed mods',
    features: [
      'Mod packaging automation',
      'Archive creation',
      'Nexus upload preparation',
      'File organization',
      'Readme generation',
      'Version management',
    ],
    controls: [
      {
        name: 'New Package Button',
        type: 'button',
        description: 'Starts creating a new mod package',
        whenToUse: 'When ready to package a completed mod',
      },
      {
        name: 'Add Files Button',
        type: 'button',
        description: 'Includes files in your mod package',
        whenToUse: 'Building your mod file list',
      },
      {
        name: 'Generate Readme Button',
        type: 'button',
        description: 'Creates documentation for your mod',
        whenToUse: 'When you need to create mod description and instructions',
      },
      {
        name: 'Create Archive Button',
        type: 'button',
        description: 'Packages everything into a distributable file',
        whenToUse: 'Final step before uploading to Nexus',
      },
    ],
    commonMistakes: [
      'Forgetting to include all required files',
      'Not testing the packaged mod',
      'Poor readme documentation',
      'Not including version numbers',
      'Packaging with debugging files included',
    ],
    guides: [
      {
        title: 'Packaging Your First Mod',
        steps: [
          'Click "New Package"',
          'Name your mod and set version',
          'Click "Add Files" to include ESP, meshes, textures',
          'Click "Generate Readme" and fill in details',
          'Click "Create Archive"',
          'Test the archive by installing it',
        ],
      },
    ],
    tutorialSections: [
      'Packaging & Distribution',
      'Creating Mod Archives',
    ],
    suggestedQuestions: [
      'What files should I include in my mod?',
      'How do I create a good readme?',
      'What archive format should I use?',
      'How do I prepare for Nexus upload?',
    ],
  },

  'learning-hub': {
    pageId: 'learning-hub',
    pageName: 'Learning Hub',
    route: '/learn',
    purpose: 'Comprehensive Fallout 4 modding education and reference',
    features: [
      'Interactive tutorials',
      'Video guides',
      'Reference documentation',
      'Tool-specific guides',
      'Best practices',
      'Troubleshooting help',
    ],
    controls: [
      {
        name: 'Tutorial Browser',
        type: 'input',
        description: 'Search and browse available tutorials',
        whenToUse: 'When looking for specific learning content',
      },
      {
        name: 'Video Player',
        type: 'button',
        description: 'Plays tutorial videos',
        whenToUse: 'When watching step-by-step guides',
      },
      {
        name: 'Reference Search',
        type: 'input',
        description: 'Search technical documentation',
        whenToUse: 'When looking up specific functions or tools',
      },
      {
        name: 'Progress Tracker',
        type: 'button',
        description: 'Shows your learning progress',
        whenToUse: 'When tracking completed tutorials',
      },
    ],
    commonMistakes: [
      'Not using Learning Hub before asking questions',
      'Skipping video tutorials',
      'Not bookmarking useful references',
      'Not tracking learning progress',
    ],
    guides: [
      {
        title: 'Finding Help',
        steps: [
          'Use search bar to find specific topics',
          'Browse by category (Creation Kit, Papyrus, etc.)',
          'Watch video tutorials for visual learning',
          'Bookmark important reference pages',
          'Track your progress in learning paths',
        ],
      },
    ],
    tutorialSections: [
      'Learning Hub - Education Center',
      'Finding the Right Tutorial',
    ],
    suggestedQuestions: [
      'Where do I start learning modding?',
      'What tutorials should I watch first?',
      'How do I find documentation for specific tools?',
      'Are there learning paths for beginners?',
    ],
  },

  'settings': {
    pageId: 'settings',
    pageName: 'Settings Hub',
    route: '/settings',
    purpose: 'Configure Mossy preferences and system integration',
    features: [
      'API key management',
      'Tool path configuration',
      'Voice settings',
      'Privacy controls',
      'Theme customization',
      'Performance settings',
    ],
    controls: [
      {
        name: 'API Keys Section',
        type: 'input',
        description: 'Enter API keys for AI services',
        whenToUse: 'Setting up OpenAI, Groq, or other AI providers',
      },
      {
        name: 'Tool Paths Section',
        type: 'input',
        description: 'Configure paths to modding tools',
        whenToUse: 'After installing new tools or changing locations',
      },
      {
        name: 'Voice Settings',
        type: 'dropdown',
        description: 'Configure TTS and STT providers',
        whenToUse: 'Setting up voice chat features',
      },
      {
        name: 'Privacy Toggle',
        type: 'toggle',
        description: 'Control data sharing and analytics',
        whenToUse: 'Managing your privacy preferences',
      },
      {
        name: 'Theme Selector',
        type: 'dropdown',
        description: 'Choose UI theme and appearance',
        whenToUse: 'Customizing the interface look',
      },
    ],
    commonMistakes: [
      'Not setting API keys before using AI features',
      'Wrong tool paths causing integration failures',
      'Enabling too many voice features at once',
      'Not backing up settings before changes',
    ],
    guides: [
      {
        title: 'Initial Setup',
        steps: [
          'Go to API Keys section',
          'Enter your OpenAI API key',
          'Configure tool paths for Creation Kit, etc.',
          'Set up voice preferences',
          'Test integrations with "Test Connection" buttons',
        ],
      },
    ],
    tutorialSections: [
      'Settings & Configuration',
      'API Key Setup',
    ],
    suggestedQuestions: [
      'How do I get API keys?',
      'Why isn\'t a tool being detected?',
      'How do I change the theme?',
      'What privacy settings should I use?',
    ],
  },

  'project-hub': {
    pageId: 'project-hub',
    pageName: 'Project Hub',
    route: '/project',
    purpose: 'Manage mod projects, track progress, and collaborate',
    features: [
      'Project creation and management',
      'Progress tracking',
      'File organization',
      'Version control',
      'Collaboration tools',
      'Project analytics',
    ],
    controls: [
      {
        name: 'New Project Button',
        type: 'button',
        description: 'Creates a new mod project',
        whenToUse: 'Starting a new modding project',
      },
      {
        name: 'Open Project Button',
        type: 'button',
        description: 'Opens existing project',
        whenToUse: 'Continuing work on existing mod',
      },
      {
        name: 'Project Settings',
        type: 'button',
        description: 'Configure project properties',
        whenToUse: 'Changing project details or settings',
      },
      {
        name: 'Share Project Button',
        type: 'button',
        description: 'Share project with collaborators',
        whenToUse: 'When working with a team',
      },
    ],
    commonMistakes: [
      'Not organizing files properly',
      'Not using version control',
      'Sharing projects without proper documentation',
      'Not backing up project files',
    ],
    guides: [
      {
        title: 'Starting a New Project',
        steps: [
          'Click "New Project"',
          'Choose project type (Weapon, Armor, etc.)',
          'Set project name and description',
          'Configure file structure preferences',
          'Click "Create" to set up folders',
        ],
      },
    ],
    tutorialSections: [
      'Project Management',
      'Organizing Mod Files',
    ],
    suggestedQuestions: [
      'How do I organize my mod files?',
      'What project types are available?',
      'How do I share projects?',
      'How does version control work?',
    ],
  },

  'diagnostics': {
    pageId: 'diagnostics',
    pageName: 'Diagnostics Hub',
    route: '/diagnostics',
    purpose: 'Troubleshoot modding setup and detect system issues',
    features: [
      'System health checks',
      'Tool detection and validation',
      'Performance monitoring',
      'Error log analysis',
      'Configuration verification',
      'Automated fixes',
    ],
    controls: [
      {
        name: 'Run Diagnostics Button',
        type: 'button',
        description: 'Scans system for modding-related issues',
        whenToUse: 'When experiencing problems or after setup changes',
      },
      {
        name: 'Tool Status Panel',
        type: 'button',
        description: 'Shows which tools are detected and working',
        whenToUse: 'Checking if all your modding tools are properly configured',
      },
      {
        name: 'Performance Monitor',
        type: 'button',
        description: 'Shows system performance metrics',
        whenToUse: 'When experiencing slowdowns or crashes',
      },
      {
        name: 'Error Log Viewer',
        type: 'button',
        description: 'Displays recent error messages and logs',
        whenToUse: 'When troubleshooting specific issues',
      },
    ],
    commonMistakes: [
      'Not running diagnostics after tool installations',
      'Ignoring warning messages',
      'Not checking tool status before reporting issues',
      'Running diagnostics while tools are in use',
    ],
    guides: [
      {
        title: 'Troubleshooting Setup Issues',
        steps: [
          'Click "Run Diagnostics"',
          'Review any error messages in red',
          'Check "Tool Status" for missing tools',
          'Click "Fix Issues" for automatic repairs',
          'Re-run diagnostics to verify fixes',
        ],
      },
    ],
    tutorialSections: [
      'Diagnostics & Troubleshooting',
      'System Health Checks',
    ],
    suggestedQuestions: [
      'Why is a tool not being detected?',
      'How do I fix configuration errors?',
      'What do the diagnostic results mean?',
      'How do I improve performance?',
    ],
  },

  'devtools': {
    pageId: 'devtools',
    pageName: 'DevTools Hub',
    route: '/devtools',
    purpose: 'Advanced development tools for experienced modders',
    features: [
      'Script analysis and optimization',
      'Template generation',
      'Code quality checks',
      'Performance profiling',
      'Debugging utilities',
      'Advanced file operations',
    ],
    controls: [
      {
        name: 'Script Analyzer',
        type: 'button',
        description: 'Analyzes Papyrus scripts for issues',
        whenToUse: 'When debugging script problems',
      },
      {
        name: 'Template Generator',
        type: 'button',
        description: 'Creates code templates for common tasks',
        whenToUse: 'Starting new scripts or projects',
      },
      {
        name: 'Performance Profiler',
        type: 'button',
        description: 'Analyzes script performance bottlenecks',
        whenToUse: 'When scripts are running slowly',
      },
      {
        name: 'Code Formatter',
        type: 'button',
        description: 'Formats code for consistency',
        whenToUse: 'Cleaning up messy code',
      },
    ],
    commonMistakes: [
      'Using advanced tools without understanding basics',
      'Not testing after using optimization tools',
      'Running profilers on unmodified code',
      'Not backing up before major changes',
    ],
    guides: [
      {
        title: 'Optimizing a Script',
        steps: [
          'Open script in analyzer',
          'Click "Run Analysis"',
          'Review performance suggestions',
          'Apply recommended optimizations',
          'Test the optimized script',
        ],
      },
    ],
    tutorialSections: [
      'Advanced Development Tools',
      'Script Optimization',
    ],
    suggestedQuestions: [
      'How do I optimize my scripts?',
      'What templates are available?',
      'How do I debug performance issues?',
      'What code quality checks should I run?',
    ],
  },

  'wizards': {
    pageId: 'wizards',
    pageName: 'Wizards Hub',
    route: '/wizards',
    purpose: 'Guided workflows for complex modding tasks',
    features: [
      'Step-by-step wizards',
      'Automated workflows',
      'Template-based creation',
      'Validation and error checking',
      'Progress tracking',
      'Undo/redo support',
    ],
    controls: [
      {
        name: 'Weapon Creation Wizard',
        type: 'button',
        description: 'Guided process for creating weapons',
        whenToUse: 'When creating a new weapon mod',
      },
      {
        name: 'Armor Creation Wizard',
        type: 'button',
        description: 'Guided process for creating armor',
        whenToUse: 'When creating a new armor mod',
      },
      {
        name: 'Quest Creation Wizard',
        type: 'button',
        description: 'Guided process for creating quests',
        whenToUse: 'When creating a new quest mod',
      },
      {
        name: 'NPC Creation Wizard',
        type: 'button',
        description: 'Guided process for creating NPCs',
        whenToUse: 'When creating a new NPC mod',
      },
    ],
    commonMistakes: [
      'Skipping wizard steps',
      'Not reviewing generated content',
      'Using wizards without understanding the result',
      'Not customizing wizard outputs',
    ],
    guides: [
      {
        title: 'Creating a Weapon with Wizards',
        steps: [
          'Click "Weapon Creation Wizard"',
          'Fill in weapon details (name, damage, etc.)',
          'Choose weapon model and textures',
          'Configure stats and enchantments',
          'Review and customize generated files',
          'Export the completed weapon mod',
        ],
      },
    ],
    tutorialSections: [
      'Wizards - Guided Creation',
      'Automated Mod Creation',
    ],
    suggestedQuestions: [
      'Which wizard should I use for my mod?',
      'How do wizards work?',
      'Can I customize wizard results?',
      'What if I make a mistake in a wizard?',
    ],
  },

  'blueprint': {
    pageId: 'blueprint',
    pageName: 'The Blueprint',
    route: '/tools/blueprint',
    purpose: 'Plan and design your mods before implementation',
    features: [
      'Mod planning tools',
      'Design documentation',
      'Requirement analysis',
      'Scope management',
      'Timeline planning',
      'Resource estimation',
    ],
    controls: [
      {
        name: 'New Blueprint Button',
        type: 'button',
        description: 'Creates a new mod design document',
        whenToUse: 'Planning a new mod project',
      },
      {
        name: 'Requirement Analyzer',
        type: 'button',
        description: 'Analyzes mod requirements and dependencies',
        whenToUse: 'Understanding what you need to build',
      },
      {
        name: 'Scope Calculator',
        type: 'input',
        description: 'Estimates project scope and complexity',
        whenToUse: 'Planning project timeline and resources',
      },
      {
        name: 'Export Plan Button',
        type: 'button',
        description: 'Exports blueprint as documentation',
        whenToUse: 'Sharing plans with collaborators',
      },
    ],
    commonMistakes: [
      'Not planning before starting',
      'Underestimating project scope',
      'Not documenting design decisions',
      'Changing scope mid-project',
    ],
    guides: [
      {
        title: 'Planning Your First Mod',
        steps: [
          'Click "New Blueprint"',
          'Describe your mod idea',
          'Use "Requirement Analyzer" to list needs',
          'Set scope and timeline',
          'Export plan for reference',
        ],
      },
    ],
    tutorialSections: [
      'The Blueprint - Mod Planning',
      'Project Design and Planning',
    ],
    suggestedQuestions: [
      'How do I plan a mod project?',
      'What should be in a mod blueprint?',
      'How do I estimate project time?',
      'How do I know if my idea is too complex?',
    ],
  },

  'scribe': {
    pageId: 'scribe',
    pageName: 'The Scribe',
    route: '/tools/scribe',
    purpose: 'Document and write mod descriptions, readmes, and guides',
    features: [
      'Readme generation',
      'Documentation writing',
      'Change log management',
      'Tutorial creation',
      'Content organization',
      'Export to multiple formats',
    ],
    controls: [
      {
        name: 'New Document Button',
        type: 'button',
        description: 'Creates a new documentation file',
        whenToUse: 'Writing mod documentation',
      },
      {
        name: 'Readme Generator',
        type: 'button',
        description: 'Creates mod readme files',
        whenToUse: 'Creating installation and usage instructions',
      },
      {
        name: 'Change Log Editor',
        type: 'input',
        description: 'Manages version change logs',
        whenToUse: 'Documenting updates and fixes',
      },
      {
        name: 'Export Document Button',
        type: 'button',
        description: 'Exports documentation in various formats',
        whenToUse: 'Publishing or sharing documentation',
      },
    ],
    commonMistakes: [
      'Not writing documentation',
      'Poor readme quality',
      'Not updating change logs',
      'Not explaining installation clearly',
    ],
    guides: [
      {
        title: 'Creating a Mod Readme',
        steps: [
          'Click "Readme Generator"',
          'Fill in mod details and features',
          'Add installation instructions',
          'Include compatibility information',
          'Export as markdown or PDF',
        ],
      },
    ],
    tutorialSections: [
      'The Scribe - Documentation',
      'Writing Mod Documentation',
    ],
    suggestedQuestions: [
      'What should be in a mod readme?',
      'How do I write installation instructions?',
      'How do I document mod features?',
      'What format should I use for documentation?',
    ],
  },

  'vault': {
    pageId: 'vault',
    pageName: 'The Vault',
    route: '/tools/vault',
    purpose: 'Knowledge base and memory storage for AI learning and reference',
    features: [
      'Document storage and retrieval',
      'AI memory persistence',
      'Knowledge search and indexing',
      'Reference material organization',
      'Learning data management',
    ],
    controls: [
      {
        name: 'Upload Documents Button',
        type: 'button',
        description: 'Add new documents to the knowledge base',
        whenToUse: 'When you have tutorials or reference materials to store',
      },
      {
        name: 'Search Knowledge Button',
        type: 'input',
        description: 'Search through stored knowledge and documents',
        whenToUse: 'When looking for specific information or references',
      },
      {
        name: 'Organize Categories Button',
        type: 'button',
        description: 'Sort and categorize stored documents',
        whenToUse: 'When managing your knowledge base structure',
      },
    ],
    commonMistakes: [
      'Not uploading relevant documentation',
      'Poor organization of knowledge base',
      'Not using search effectively',
    ],
    guides: [
      {
        title: 'Building Your Knowledge Base',
        steps: [
          'Click "Upload Documents"',
          'Select relevant tutorials and guides',
          'Use categories to organize content',
          'Search to verify documents are indexed',
        ],
      },
    ],
    tutorialSections: [
      'The Vault - Knowledge Storage',
      'AI Memory and Learning',
    ],
    suggestedQuestions: [
      'How do I add documents to the knowledge base?',
      'How does the AI learn from my documents?',
      'How do I search my stored knowledge?',
    ],
  },

  'duplicate-finder': {
    pageId: 'duplicate-finder',
    pageName: 'Duplicate Finder',
    route: '/tools/dedupe',
    purpose: 'Identify and manage duplicate files in your mod projects',
    features: [
      'File duplicate detection',
      'Hash-based comparison',
      'Batch duplicate removal',
      'Size and type filtering',
      'Safe deletion with backup',
    ],
    controls: [
      {
        name: 'Scan Directory Button',
        type: 'button',
        description: 'Scan a folder for duplicate files',
        whenToUse: 'When checking a mod folder for duplicates',
      },
      {
        name: 'Compare Files Button',
        type: 'button',
        description: 'Compare selected files for duplicates',
        whenToUse: 'When manually checking specific files',
      },
      {
        name: 'Safe Delete Button',
        type: 'button',
        description: 'Remove duplicates with backup option',
        whenToUse: 'After reviewing duplicates to remove',
      },
    ],
    commonMistakes: [
      'Deleting files without backup',
      'Not checking file contents before deletion',
      'Running on entire drive instead of specific folders',
    ],
    guides: [
      {
        title: 'Cleaning Up Duplicate Files',
        steps: [
          'Click "Scan Directory"',
          'Select your mod folder',
          'Review duplicate groups',
          'Check "Safe Delete" for automatic backup',
          'Remove selected duplicates',
        ],
      },
    ],
    tutorialSections: [
      'Duplicate Finder - File Management',
      'Cleaning Mod Folders',
    ],
    suggestedQuestions: [
      'How do I find duplicate textures?',
      'Is it safe to delete duplicates?',
      'How does the duplicate detection work?',
    ],
  },

  'cosmos-workflow': {
    pageId: 'cosmos-workflow',
    pageName: 'Cosmos Workflow',
    route: '/tools/cosmos',
    purpose: 'Advanced AI-powered workflow automation for complex modding tasks',
    features: [
      'AI-driven workflow generation',
      'Multi-step automation',
      'Integration with external tools',
      'Smart error handling',
      'Workflow optimization',
    ],
    controls: [
      {
        name: 'Create AI Workflow Button',
        type: 'button',
        description: 'Generate workflow using AI assistance',
        whenToUse: 'When you need help designing complex workflows',
      },
      {
        name: 'Add Integration Button',
        type: 'button',
        description: 'Connect external tools to the workflow',
        whenToUse: 'When building workflows that use multiple tools',
      },
      {
        name: 'Test Workflow Button',
        type: 'button',
        description: 'Run workflow in test mode',
        whenToUse: 'Before running on real files',
      },
    ],
    commonMistakes: [
      'Not testing workflows before production use',
      'Over-complicating simple tasks',
      'Not monitoring workflow execution',
    ],
    guides: [
      {
        title: 'Creating an AI Workflow',
        steps: [
          'Click "Create AI Workflow"',
          'Describe your automation needs',
          'Review AI-generated workflow',
          'Add or modify steps as needed',
          'Test before running on real data',
        ],
      },
    ],
    tutorialSections: [
      'Cosmos Workflow - AI Automation',
      'Advanced Workflow Creation',
    ],
    suggestedQuestions: [
      'How does AI help create workflows?',
      'What integrations are available?',
      'How do I debug workflow issues?',
    ],
  },

  'workflow-runner': {
    pageId: 'workflow-runner',
    pageName: 'Workflow Runner',
    route: '/dev/workflow-runner',
    purpose: 'Execute and monitor automated workflows with detailed progress tracking',
    features: [
      'Real-time workflow execution',
      'Progress monitoring',
      'Error handling and recovery',
      'Performance metrics',
      'Execution history',
    ],
    controls: [
      {
        name: 'Run Workflow Button',
        type: 'button',
        description: 'Execute the selected workflow',
        whenToUse: 'When ready to run your automated process',
      },
      {
        name: 'Monitor Progress Button',
        type: 'button',
        description: 'View detailed execution progress',
        whenToUse: 'While workflow is running',
      },
      {
        name: 'Stop Workflow Button',
        type: 'button',
        description: 'Halt execution if needed',
        whenToUse: 'If workflow encounters issues or needs to be stopped',
      },
    ],
    commonMistakes: [
      'Starting workflows without monitoring',
      'Not checking results after completion',
      'Running multiple heavy workflows simultaneously',
    ],
    guides: [
      {
        title: 'Running a Workflow',
        steps: [
          'Select workflow from list',
          'Click "Run Workflow"',
          'Monitor progress in real-time',
          'Review results when complete',
          'Check logs if any errors occurred',
        ],
      },
    ],
    tutorialSections: [
      'Workflow Runner - Execution Engine',
      'Monitoring Automated Processes',
    ],
    suggestedQuestions: [
      'How do I monitor workflow progress?',
      'What happens if a workflow fails?',
      'Can I pause and resume workflows?',
    ],
  },

  'desktop-bridge': {
    pageId: 'desktop-bridge',
    pageName: 'Desktop Bridge',
    route: '/test/bridge',
    purpose: 'Connect web interface to desktop applications and system integration',
    features: [
      'System application detection',
      'Secure IPC communication',
      'Tool integration management',
      'Permission management',
      'Connection monitoring',
    ],
    controls: [
      {
        name: 'Connect Bridge Button',
        type: 'button',
        description: 'Establish connection to desktop environment',
        whenToUse: 'When starting Mossy or after disconnection',
      },
      {
        name: 'Manage Permissions Button',
        type: 'button',
        description: 'Control which tools Mossy can access',
        whenToUse: 'When changing tool access permissions',
      },
      {
        name: 'Test Connection Button',
        type: 'button',
        description: 'Verify bridge connection and functionality',
        whenToUse: 'When troubleshooting connection issues',
      },
    ],
    commonMistakes: [
      'Not granting necessary permissions',
      'Running without bridge connection',
      'Not testing connection after setup changes',
    ],
    guides: [
      {
        title: 'Setting Up Desktop Bridge',
        steps: [
          'Click "Connect Bridge"',
          'Grant requested permissions',
          'Click "Test Connection"',
          'Verify all tools are detected',
          'Manage permissions as needed',
        ],
      },
    ],
    tutorialSections: [
      'Desktop Bridge - System Integration',
      'Connecting to Desktop Tools',
    ],
    suggestedQuestions: [
      'Why do I need the desktop bridge?',
      'How do I grant permissions?',
      'What happens if bridge disconnects?',
    ],
  },

  'blender-animation-guide': {
    pageId: 'blender-animation-guide',
    pageName: 'Blender Animation Guide',
    route: '/guides/blender/animation',
    purpose: 'Comprehensive guide for creating animations in Blender for Fallout 4',
    features: [
      'Animation workflow tutorials',
      'Rigging instructions',
      'Export settings for HKX',
      'Animation validation',
      'Common problem solutions',
    ],
    controls: [
      {
        name: 'Animation Tutorials Button',
        type: 'button',
        description: 'Access step-by-step animation guides',
        whenToUse: 'When learning animation creation',
      },
      {
        name: 'Rigging Guide Button',
        type: 'button',
        description: 'Learn character rigging for animations',
        whenToUse: 'When setting up characters for animation',
      },
      {
        name: 'Export Settings Button',
        type: 'button',
        description: 'Configure Blender for Fallout 4 export',
        whenToUse: 'When preparing animations for the game',
      },
    ],
    commonMistakes: [
      'Wrong export settings for HKX',
      'Poor rigging causing animation issues',
      'Not validating animations before export',
    ],
    guides: [
      {
        title: 'Creating Your First Animation',
        steps: [
          'Set up character rig',
          'Create animation in pose mode',
          'Configure export settings',
          'Export as HKX format',
          'Test animation in game',
        ],
      },
    ],
    tutorialSections: [
      'Blender Animation Guide',
      'Creating Fallout 4 Animations',
    ],
    suggestedQuestions: [
      'How do I rig a character for animation?',
      'What export settings should I use?',
      'How do I fix animation glitches?',
    ],
  },

  'quest-authoring-guide': {
    pageId: 'quest-authoring-guide',
    pageName: 'Quest Authoring Guide',
    route: '/guides/creation-kit/quest-authoring',
    purpose: 'Complete guide for creating quests and story content in Creation Kit',
    features: [
      'Quest creation workflow',
      'Dialogue system guide',
      'Objective management',
      'Script integration',
      'Quest validation tools',
    ],
    controls: [
      {
        name: 'Quest Creation Wizard',
        type: 'button',
        description: 'Step-by-step quest creation assistant',
        whenToUse: 'When starting a new quest',
      },
      {
        name: 'Dialogue Editor Button',
        type: 'button',
        description: 'Create and manage NPC conversations',
        whenToUse: 'When adding dialogue to your quest',
      },
      {
        name: 'Objective Manager Button',
        type: 'button',
        description: 'Set up quest goals and progression',
        whenToUse: 'When defining what players need to do',
      },
    ],
    commonMistakes: [
      'Poor quest flow design',
      'Missing dialogue branches',
      'Not testing quest thoroughly',
      'Script integration issues',
    ],
    guides: [
      {
        title: 'Creating a Simple Quest',
        steps: [
          'Use Quest Creation Wizard',
          'Define quest objectives',
          'Add dialogue and interactions',
          'Set up rewards and completion',
          'Test quest in game',
        ],
      },
    ],
    tutorialSections: [
      'Quest Authoring Guide',
      'Creation Kit Quest Creation',
    ],
    suggestedQuestions: [
      'How do I create quest objectives?',
      'How does the dialogue system work?',
      'How do I add quest stages?',
    ],
  },

  'bodyslide-guide': {
    pageId: 'bodyslide-guide',
    pageName: 'BodySlide Guide',
    route: '/guides/mods/bodyslide',
    purpose: 'Guide for using BodySlide to customize character bodies and outfits',
    features: [
      'BodySlide installation and setup',
      'Preset creation and management',
      'Batch processing guides',
      'Compatibility information',
      'Troubleshooting common issues',
    ],
    controls: [
      {
        name: 'Batch Build Button',
        type: 'button',
        description: 'Process multiple outfits at once',
        whenToUse: 'When applying body changes to many items',
      },
      {
        name: 'Preset Manager Button',
        type: 'button',
        description: 'Create and manage body presets',
        whenToUse: 'When customizing body shapes',
      },
      {
        name: 'Preview Changes Button',
        type: 'button',
        description: 'See how changes will look before applying',
        whenToUse: 'When testing different body options',
      },
    ],
    commonMistakes: [
      'Not running BodySlide after mod installs',
      'Wrong preset selection',
      'Not backing up original files',
      'Running on wrong body type',
    ],
    guides: [
      {
        title: 'Customizing Character Bodies',
        steps: [
          'Install BodySlide correctly',
          'Choose appropriate preset',
          'Select outfits to modify',
          'Click "Batch Build"',
          'Test changes in game',
        ],
      },
    ],
    tutorialSections: [
      'BodySlide Guide',
      'Character Body Customization',
    ],
    suggestedQuestions: [
      'How do I install BodySlide?',
      'What presets should I use?',
      'How do I create custom presets?',
    ],
  },

  'sim-settlements-guide': {
    pageId: 'sim-settlements-guide',
    pageName: 'Sim Settlements Guide',
    route: '/guides/mods/sim-settlements',
    purpose: 'Complete guide for creating settlements and plots with Sim Settlements',
    features: [
      'Settlement planning guides',
      'Plot creation tutorials',
      'Building instructions',
      'Resource management',
      'Expansion strategies',
    ],
    controls: [
      {
        name: 'Plot Creator Button',
        type: 'button',
        description: 'Design custom settlement plots',
        whenToUse: 'When creating new building areas',
      },
      {
        name: 'Building Guide Button',
        type: 'button',
        description: 'Access construction tutorials',
        whenToUse: 'When learning to build settlements',
      },
      {
        name: 'Resource Calculator Button',
        type: 'button',
        description: 'Plan resource requirements',
        whenToUse: 'When planning large settlements',
      },
    ],
    commonMistakes: [
      'Poor settlement layout planning',
      'Not balancing resource requirements',
      'Over-building without expansion strategy',
      'Ignoring plot compatibility',
    ],
    guides: [
      {
        title: 'Creating Your First Settlement',
        steps: [
          'Plan settlement layout',
          'Create initial plots',
          'Build essential structures',
          'Set up resource production',
          'Test and expand gradually',
        ],
      },
    ],
    tutorialSections: [
      'Sim Settlements Guide',
      'Settlement Creation and Management',
    ],
    suggestedQuestions: [
      'How do I create custom plots?',
      'What buildings should I prioritize?',
      'How do I balance settlement resources?',
    ],
  },

  'paperscript-guide': {
    pageId: 'paperscript-guide',
    pageName: 'PaperScript Guide',
    route: '/guides/papyrus/guide',
    purpose: 'Comprehensive guide for Papyrus scripting in Fallout 4',
    features: [
      'Script syntax reference',
      'Function library documentation',
      'Debugging techniques',
      'Performance optimization',
      'Common script patterns',
    ],
    controls: [
      {
        name: 'Function Reference Button',
        type: 'button',
        description: 'Browse available Papyrus functions',
        whenToUse: 'When looking up specific functions',
      },
      {
        name: 'Code Examples Button',
        type: 'button',
        description: 'View sample scripts and patterns',
        whenToUse: 'When learning scripting techniques',
      },
      {
        name: 'Debug Tools Button',
        type: 'button',
        description: 'Access debugging and testing tools',
        whenToUse: 'When troubleshooting script issues',
      },
    ],
    commonMistakes: [
      'Using wrong function signatures',
      'Not handling script states properly',
      'Performance-heavy scripts',
      'Not testing scripts thoroughly',
    ],
    guides: [
      {
        title: 'Writing Your First Script',
        steps: [
          'Learn basic Papyrus syntax',
          'Understand script states and events',
          'Use function reference for available functions',
          'Test script in Creation Kit',
          'Debug and optimize performance',
        ],
      },
    ],
    tutorialSections: [
      'PaperScript Guide',
      'Papyrus Scripting for Fallout 4',
    ],
    suggestedQuestions: [
      'How do I create a basic script?',
      'What functions are available?',
      'How do I debug script errors?',
    ],
  },

  'support': {
    pageId: 'support',
    pageName: 'Support & Donations',
    route: '/support',
    purpose: 'Support the development of Mossy and access premium features',
    features: [
      'Donation options',
      'Premium feature access',
      'Community support',
      'Development updates',
      'Exclusive content',
    ],
    controls: [
      {
        name: 'Donate Button',
        type: 'button',
        description: 'Support Mossy development',
        whenToUse: 'When you want to contribute to the project',
      },
      {
        name: 'Premium Features Button',
        type: 'button',
        description: 'Access premium capabilities',
        whenToUse: 'When interested in advanced features',
      },
      {
        name: 'Community Links Button',
        type: 'button',
        description: 'Join the Mossy community',
        whenToUse: 'When seeking help or sharing experiences',
      },
    ],
    commonMistakes: [
      'Not exploring free features first',
      'Expecting instant premium access',
      'Not reading donation terms',
    ],
    guides: [
      {
        title: 'Supporting Mossy',
        steps: [
          'Explore all free features first',
          'Choose appropriate donation level',
          'Access premium features if applicable',
          'Join community for support',
          'Provide feedback for improvements',
        ],
      },
    ],
    tutorialSections: [
      'Support & Community',
      'Contributing to Mossy',
    ],
    suggestedQuestions: [
      'How can I support Mossy development?',
      'What are premium features?',
      'How do I join the community?',
    ],
  },

  'mining-dashboard': {
    pageId: 'mining-dashboard',
    pageName: 'Mining Dashboard',
    route: '/dev/mining-dashboard',
    purpose: 'Monitor and manage AI mining operations for data collection',
    features: [
      'Real-time mining status',
      'Performance metrics',
      'Data collection monitoring',
      'Mining job management',
      'Resource usage tracking',
    ],
    controls: [
      {
        name: 'Start Mining Button',
        type: 'button',
        description: 'Begin AI data mining operations',
        whenToUse: 'When you want to collect training data',
      },
      {
        name: 'Monitor Progress Button',
        type: 'button',
        description: 'View detailed mining progress and statistics',
        whenToUse: 'While mining operations are running',
      },
      {
        name: 'Stop Mining Button',
        type: 'button',
        description: 'Halt current mining operations',
        whenToUse: 'When you need to stop data collection',
      },
    ],
    commonMistakes: [
      'Running mining without monitoring',
      'Not checking resource usage',
      'Starting multiple mining jobs simultaneously',
    ],
    guides: [
      {
        title: 'Setting Up AI Mining',
        steps: [
          'Configure mining parameters',
          'Select data sources',
          'Start mining operation',
          'Monitor progress and performance',
          'Review collected data',
        ],
      },
    ],
    tutorialSections: [
      'Mining Dashboard - AI Data Collection',
      'Monitoring Mining Operations',
    ],
    suggestedQuestions: [
      'How do I start AI mining?',
      'What data does mining collect?',
      'How do I monitor mining performance?',
    ],
  },

  'advanced-analysis-panel': {
    pageId: 'advanced-analysis-panel',
    pageName: 'Advanced Analysis Panel',
    route: '/tools/advanced-analysis',
    purpose: 'Perform deep analysis on mod files and assets with AI assistance',
    features: [
      'Deep file analysis',
      'AI-powered insights',
      'Performance optimization',
      'Compatibility checking',
      'Automated recommendations',
    ],
    controls: [
      {
        name: 'Analyze Files Button',
        type: 'button',
        description: 'Start deep analysis of selected files',
        whenToUse: 'When you need detailed file insights',
      },
      {
        name: 'Generate Report Button',
        type: 'button',
        description: 'Create comprehensive analysis report',
        whenToUse: 'After analysis is complete',
      },
      {
        name: 'Apply Recommendations Button',
        type: 'button',
        description: 'Implement AI-suggested improvements',
        whenToUse: 'When you want to optimize your files',
      },
    ],
    commonMistakes: [
      'Not reviewing analysis results',
      'Applying recommendations without testing',
      'Running analysis on too many files at once',
    ],
    guides: [
      {
        title: 'Performing Advanced Analysis',
        steps: [
          'Select files to analyze',
          'Click "Analyze Files"',
          'Review AI insights and recommendations',
          'Generate detailed report',
          'Apply suggested optimizations',
        ],
      },
    ],
    tutorialSections: [
      'Advanced Analysis Panel',
      'AI-Powered File Analysis',
    ],
    suggestedQuestions: [
      'How does AI analysis work?',
      'What can I learn from the analysis?',
      'How do I apply recommendations?',
    ],
  },

  'plugin-manager': {
    pageId: 'plugin-manager',
    pageName: 'Plugin Manager',
    route: '/dev/plugin-manager',
    purpose: 'Manage and configure plugins that extend Mossy functionality',
    features: [
      'Plugin installation and removal',
      'Plugin configuration',
      'Extension management',
      'Compatibility checking',
      'Plugin updates',
    ],
    controls: [
      {
        name: 'Install Plugin Button',
        type: 'button',
        description: 'Add new plugins to extend functionality',
        whenToUse: 'When you want to add new features',
      },
      {
        name: 'Configure Plugin Button',
        type: 'button',
        description: 'Adjust plugin settings and options',
        whenToUse: 'After installing a plugin',
      },
      {
        name: 'Update Plugins Button',
        type: 'button',
        description: 'Update installed plugins to latest versions',
        whenToUse: 'When updates are available',
      },
    ],
    commonMistakes: [
      'Installing incompatible plugins',
      'Not configuring plugins after installation',
      'Running outdated plugin versions',
    ],
    guides: [
      {
        title: 'Managing Plugins',
        steps: [
          'Browse available plugins',
          'Click "Install Plugin" for desired extensions',
          'Configure plugin settings',
          'Test plugin functionality',
          'Update plugins regularly',
        ],
      },
    ],
    tutorialSections: [
      'Plugin Manager - Extension System',
      'Installing and Configuring Plugins',
    ],
    suggestedQuestions: [
      'How do I install plugins?',
      'What plugins are available?',
      'How do I configure plugin settings?',
    ],
  },

  'roadmap-panel': {
    pageId: 'roadmap-panel',
    pageName: 'Roadmap Panel',
    route: '/roadmap',
    purpose: 'View development roadmap and upcoming features for Mossy',
    features: [
      'Feature roadmap viewing',
      'Development progress tracking',
      'Upcoming feature previews',
      'Community feedback integration',
      'Release planning',
    ],
    controls: [
      {
        name: 'View Roadmap Button',
        type: 'button',
        description: 'Browse planned features and improvements',
        whenToUse: 'When you want to see future development plans',
      },
      {
        name: 'Provide Feedback Button',
        type: 'button',
        description: 'Share your thoughts on upcoming features',
        whenToUse: 'When you have suggestions for the roadmap',
      },
      {
        name: 'Vote on Features Button',
        type: 'button',
        description: 'Vote for features you want to see prioritized',
        whenToUse: 'When you want to influence development priorities',
      },
    ],
    commonMistakes: [
      'Not providing feedback on roadmap items',
      'Expecting features to be released immediately',
      'Not understanding development timelines',
    ],
    guides: [
      {
        title: 'Exploring the Development Roadmap',
        steps: [
          'Click "View Roadmap" to see planned features',
          'Read about upcoming improvements',
          'Provide feedback on features you care about',
          'Vote on features to help prioritize development',
          'Stay updated on release timelines',
        ],
      },
    ],
    tutorialSections: [
      'Roadmap Panel - Future Development',
      'Contributing to Mossy Development',
    ],
    suggestedQuestions: [
      'What features are coming next?',
      'How can I provide feedback?',
      'When will certain features be released?',
    ],
  },

  'ba2-manager': {
    pageId: 'ba2-manager',
    pageName: 'BA2 Archive Manager',
    route: '/tools/ba2-manager',
    purpose: 'Create and manage Bethesda Archive files for Fallout 4 mods',
    features: [
      'BA2 archive creation',
      'Archive extraction and viewing',
      'File compression optimization',
      'Archive validation',
      'Batch processing',
    ],
    controls: [
      {
        name: 'Create Archive Button',
        type: 'button',
        description: 'Package files into a BA2 archive',
        whenToUse: 'When preparing mod files for distribution',
      },
      {
        name: 'Extract Archive Button',
        type: 'button',
        description: 'Extract files from existing BA2 archives',
        whenToUse: 'When you need to access archived files',
      },
      {
        name: 'Validate Archive Button',
        type: 'button',
        description: 'Check archive integrity and compatibility',
        whenToUse: 'Before distributing or using archives',
      },
    ],
    commonMistakes: [
      'Creating archives with wrong compression',
      'Not validating archives before use',
      'Including unnecessary files in archives',
    ],
    guides: [
      {
        title: 'Creating BA2 Archives',
        steps: [
          'Select files to archive',
          'Choose compression settings',
          'Click "Create Archive"',
          'Validate the created archive',
          'Test archive in game',
        ],
      },
    ],
    tutorialSections: [
      'BA2 Archive Manager',
      'Creating Mod Archives',
    ],
    suggestedQuestions: [
      'How do I create a BA2 archive?',
      'What compression should I use?',
      'How do I extract BA2 files?',
    ],
  },

  'workflow-recorder': {
    pageId: 'workflow-recorder',
    pageName: 'Workflow Recorder',
    route: '/dev/workflow-recorder',
    purpose: 'Record and automate repetitive modding tasks and workflows',
    features: [
      'Workflow recording',
      'Macro creation',
      'Task automation',
      'Workflow playback',
      'Custom script generation',
    ],
    controls: [
      {
        name: 'Start Recording Button',
        type: 'button',
        description: 'Begin recording your actions',
        whenToUse: 'When you want to automate a repetitive task',
      },
      {
        name: 'Stop Recording Button',
        type: 'button',
        description: 'End recording and save the workflow',
        whenToUse: 'When you finish performing the task',
      },
      {
        name: 'Play Workflow Button',
        type: 'button',
        description: 'Execute recorded workflow',
        whenToUse: 'When you want to repeat the automated task',
      },
    ],
    commonMistakes: [
      'Recording workflows with inconsistent steps',
      'Not testing recorded workflows',
      'Recording overly complex workflows',
    ],
    guides: [
      {
        title: 'Recording Your First Workflow',
        steps: [
          'Click "Start Recording"',
          'Perform the task you want to automate',
          'Click "Stop Recording" when done',
          'Name and save your workflow',
          'Test playback to ensure it works',
        ],
      },
    ],
    tutorialSections: [
      'Workflow Recorder - Task Automation',
      'Creating Automated Workflows',
    ],
    suggestedQuestions: [
      'How do I record a workflow?',
      'Can I edit recorded workflows?',
      'How do I share workflows?',
    ],
  },

  'first-success': {
    pageId: 'first-success',
    pageName: 'First Success Wizard',
    route: '/first-success',
    purpose: 'Celebrate your first successful modding achievement and get next steps',
    features: [
      'Achievement celebration',
      'Next steps guidance',
      'Success story sharing',
      'Motivational content',
      'Further learning recommendations',
    ],
    controls: [
      {
        name: 'Share Success Button',
        type: 'button',
        description: 'Share your achievement with the community',
        whenToUse: 'When you want to celebrate your success',
      },
      {
        name: 'Next Steps Button',
        type: 'button',
        description: 'Get recommendations for what to try next',
        whenToUse: 'When you want guidance on continuing your modding journey',
      },
      {
        name: 'View Achievements Button',
        type: 'button',
        description: 'See all your modding accomplishments',
        whenToUse: 'When you want to track your progress',
      },
    ],
    commonMistakes: [
      'Not celebrating small wins',
      'Skipping the learning recommendations',
      'Not sharing successes with community',
    ],
    guides: [
      {
        title: 'Celebrating Your First Success',
        steps: [
          'Read your achievement message',
          'Click "Share Success" if you want to celebrate',
          'Review "Next Steps" recommendations',
          'Explore suggested learning paths',
          'Continue your modding journey',
        ],
      },
    ],
    tutorialSections: [
      'First Success Wizard',
      'Celebrating Modding Achievements',
    ],
    suggestedQuestions: [
      'What should I try next?',
      'How do I share my success?',
      'What achievements can I unlock?',
    ],
  },

  'whats-new': {
    pageId: 'whats-new',
    pageName: 'What\'s New',
    route: '/whats-new',
    purpose: 'Stay updated with the latest features and improvements in Mossy',
    features: [
      'Latest feature announcements',
      'Version update information',
      'New tool introductions',
      'Improvement highlights',
      'Changelog access',
    ],
    controls: [
      {
        name: 'View Changelog Button',
        type: 'button',
        description: 'See detailed list of changes',
        whenToUse: 'When you want to see all updates',
      },
      {
        name: 'Try New Features Button',
        type: 'button',
        description: 'Explore newly added capabilities',
        whenToUse: 'When you want to test new functionality',
      },
      {
        name: 'Dismiss Update Button',
        type: 'button',
        description: 'Hide this update notification',
        whenToUse: 'When you\'ve read the update information',
      },
    ],
    commonMistakes: [
      'Not exploring new features',
      'Missing important updates',
      'Not understanding new capabilities',
    ],
    guides: [
      {
        title: 'Exploring New Features',
        steps: [
          'Read the update summary',
          'Click "Try New Features" to explore',
          'Test new functionality',
          'Check the changelog for details',
          'Dismiss when you\'re ready to continue',
        ],
      },
    ],
    tutorialSections: [
      'What\'s New - Latest Updates',
      'Staying Current with Mossy',
    ],
    suggestedQuestions: [
      'What\'s new in this version?',
      'How do I use the new features?',
      'Where can I see all changes?',
    ],
  },

  'mining-panel': {
    pageId: 'mining-panel',
    pageName: 'Mining Panel',
    route: '/tools/mining',
    purpose: 'Configure and monitor AI data mining operations for training',
    features: [
      'Mining configuration',
      'Data source selection',
      'Performance monitoring',
      'Training data collection',
      'Resource management',
    ],
    controls: [
      {
        name: 'Configure Mining Button',
        type: 'button',
        description: 'Set up mining parameters and sources',
        whenToUse: 'When setting up data collection',
      },
      {
        name: 'Start Mining Button',
        type: 'button',
        description: 'Begin data mining operations',
        whenToUse: 'When ready to collect training data',
      },
      {
        name: 'View Results Button',
        type: 'button',
        description: 'Check collected data and results',
        whenToUse: 'After mining operations complete',
      },
    ],
    commonMistakes: [
      'Mining without proper configuration',
      'Not monitoring resource usage',
      'Collecting irrelevant data',
    ],
    guides: [
      {
        title: 'Setting Up Data Mining',
        steps: [
          'Click "Configure Mining"',
          'Select appropriate data sources',
          'Set mining parameters',
          'Start the mining operation',
          'Monitor progress and results',
        ],
      },
    ],
    tutorialSections: [
      'Mining Panel - Data Collection',
      'AI Training Data Mining',
    ],
    suggestedQuestions: [
      'How do I configure mining?',
      'What data sources are available?',
      'How do I optimize mining performance?',
    ],
  },

  /* ------------------------- NEW / UPDATED PAGES ------------------------- */

  'tutorial': {
    pageId: 'tutorial',
    pageName: 'Interactive Tutorial',
    route: '/tutorial',
    purpose: 'Step‑by‑step guided walkthrough covering Mossy features and workflows',
    features: [
      'Guided steps for each page',
      'Screenshots and inline tips',
      'Progress tracking and resume',
      'Voice narration (TTS) option',
    ],
    controls: [
      { name: 'Next Step', type: 'button', description: 'Advance to the next tutorial page', whenToUse: 'When ready to continue' },
      { name: 'Previous Step', type: 'button', description: 'Go back to the previous step', whenToUse: 'To review earlier instructions' },
      { name: 'Exit Tutorial', type: 'button', description: 'Close the tutorial and save progress', whenToUse: 'When you want to stop the tutorial' },
      { name: 'Enable Voice', type: 'toggle', description: 'Turn on spoken guidance', whenToUse: 'When you prefer audio narration' },
    ],
    commonMistakes: [
      'Skipping steps before trying the actions',
      'Expecting the tutorial to change app layout (it only guides)',
    ],
    guides: [
      { title: 'Using the Tutorial', steps: ['Open the tutorial from the Home page', 'Follow the text and screenshot guidance', 'Try the suggested actions on each page', 'Use Previous/Next to navigate'] },
    ],
    tutorialSections: ['Interactive Tutorial Overview'],
    suggestedQuestions: ['How do I resume the tutorial?', 'Can I replay a step?'],
  },

  'ai-assistant': {
    pageId: 'ai-assistant',
    pageName: 'AI Assistant',
    route: '/ai-assistant',
    purpose: 'Task-oriented AI assistant for workflows, automation, and code assistance',
    features: ['Context-aware workflows', 'Automation suggestions', 'Task runner integrations', 'Plugin-aware recommendations'],
    controls: [
      { name: 'Ask Assistant', type: 'input', description: 'Type your task or question', whenToUse: 'When you need step-by-step help or automation' },
      { name: 'Run Suggestion', type: 'button', description: 'Execute a suggested workflow', whenToUse: 'After reviewing a suggested action' },
      { name: 'Create Workflow', type: 'button', description: 'Convert instructions into an automated workflow', whenToUse: 'To automate repetitive tasks' },
    ],
    commonMistakes: ['Pasting huge logs without context', 'Running suggested workflows without review'],
    guides: [
      { title: 'Ask for a Workflow', steps: ['Describe the task you want automated', 'Review the assistant’s proposed steps', 'Click Create Workflow to save it', 'Test the workflow on safe data'] },
    ],
    tutorialSections: ['AI Assistant - Automate tasks', 'Converting advice into actions'],
    suggestedQuestions: ['Create a workflow to import textures', 'Generate a script to rename assets'],
  },

  'ai-mod-assistant': {
    pageId: 'ai-mod-assistant',
    pageName: 'AI Mod Assistant',
    route: '/ai-mod-assistant',
    purpose: 'Specialized assistant focused on mod creation tasks (scripting, quests, assets)',
    features: ['Papyrus script generation', 'Quest-authoring templates', 'Asset optimization advice', 'Code snippets and validation'],
    controls: [
      { name: 'Generate Script', type: 'button', description: 'Create a Papyrus script from a prompt', whenToUse: 'When you need starter code or examples' },
      { name: 'Validate Script', type: 'button', description: 'Run linting/validation on a script', whenToUse: 'Before testing in the CK' },
      { name: 'Quest Template', type: 'dropdown', description: 'Choose a quest-authoring template', whenToUse: 'Starting a new quest' },
    ],
    commonMistakes: ['Not telling the assistant which game/version you target', 'Skipping validation before testing in CK'],
    guides: [
      { title: 'Create a Simple Quest', steps: ['Choose Quest Template', 'Fill NPC and objective details', 'Generate script and validate', 'Test in Creation Kit'] },
    ],
    tutorialSections: ['AI Mod Assistant - Scripting & Quests'],
    suggestedQuestions: ['Create a Papyrus function to open a door', 'How to structure a quest script?'],
  },

  'cloud-sync': {
    pageId: 'cloud-sync',
    pageName: 'Cloud Sync',
    route: '/cloud-sync',
    purpose: 'Sync projects and sessions to the cloud for collaboration and backups',
    features: ['Session synchronization', 'Conflict resolution', 'Auto‑backup', 'Collaborator presence'],
    controls: [
      { name: 'Start Sync', type: 'button', description: 'Upload local changes to the cloud', whenToUse: 'After finishing local edits' },
      { name: 'Restore Backup', type: 'button', description: 'Restore a previous snapshot', whenToUse: 'When recovery is needed' },
      { name: 'Session Invite', type: 'button', description: 'Invite collaborators to session', whenToUse: 'To collaborate in real time' },
    ],
    commonMistakes: ['Not resolving conflicts before pushing', 'Relying on auto-sync without checking status'],
    guides: [
      { title: 'Share a Project', steps: ['Open Cloud Sync', 'Create or join a session', 'Invite collaborators', 'Push changes and confirm sync status'] },
    ],
    tutorialSections: ['Cloud Sync - Collaboration & Backups'],
    suggestedQuestions: ['How to resolve a sync conflict?', 'How to restore a snapshot?'],
  },

  'tools': {
    pageId: 'tools',
    pageName: 'Tools Hub',
    route: '/tools',
    purpose: 'Central hub listing all utility tools (auditor, deduplicator, converters, etc.)',
    features: ['Quick access to utility tools', 'Search & filter tools', 'Tool status indicators'],
    controls: [
      { name: 'Tool Card', type: 'button', description: 'Opens that tool', whenToUse: 'When you need to use a specific utility' },
      { name: 'Search Tools', type: 'input', description: 'Filter tools by name', whenToUse: 'To quickly find a tool' },
    ],
    commonMistakes: ['Using the wrong tool for a task (e.g., using dedupe instead of auditor)'],
    guides: [
      { title: 'Find the Right Tool', steps: ['Open Tools Hub', 'Type keywords in search', 'Click the matching tool card'] },
    ],
    tutorialSections: ['Tools Hub Overview'],
    suggestedQuestions: ['Which tool checks textures?', 'How do I merge duplicate assets?'],
  },

  'ini-config': {
    pageId: 'ini-config',
    pageName: 'INI Configuration Manager',
    route: '/tools/ini-config',
    purpose: 'Edit and manage important INI settings for game and tools',
    features: ['Preset profiles', 'Safe-editing', 'Export/Import INI sets'],
    controls: [
      { name: 'Select Profile', type: 'dropdown', description: 'Choose a preset configuration', whenToUse: 'To apply recommended settings' },
      { name: 'Edit Field', type: 'input', description: 'Change an INI key value', whenToUse: 'When adjusting advanced settings' },
    ],
    commonMistakes: ['Editing without backup', 'Applying incompatible presets'],
    guides: [
      { title: 'Apply a Preset', steps: ['Open INI Manager', 'Choose preset', 'Click Apply', 'Test the game'] },
    ],
    tutorialSections: ['INI Edits & Safety'],
    suggestedQuestions: ['How to revert INI changes?', 'Which preset is best for performance?'],
  },

  'asset-deduplicator': {
    pageId: 'asset-deduplicator',
    pageName: 'Asset Deduplicator',
    route: '/tools/asset-deduplicator',
    purpose: 'Find and resolve duplicate textures/meshes to reduce package size and conflicts',
    features: ['Duplicate detection', 'Similarity thresholds', 'Batch actions', 'Export reports'],
    controls: [
      { name: 'Scan Folder', type: 'button', description: 'Scan chosen directories for duplicates', whenToUse: 'When analysing asset libraries' },
      { name: 'Merge/Remove', type: 'button', description: 'Resolve duplicates by merging or removing', whenToUse: 'After reviewing groups' },
    ],
    commonMistakes: ['Blindly deleting duplicates without preview', 'Using too low a similarity threshold'],
    guides: [
      { title: 'Remove Duplicate Textures', steps: ['Scan folder', 'Review groups', 'Preview assets', 'Select merge action'] },
    ],
    tutorialSections: ['Asset Deduplication Workflow'],
    suggestedQuestions: ['How to preview duplicates?', 'What similarity threshold should I use?'],
  },

  'log-monitor': {
    pageId: 'log-monitor',
    pageName: 'Game Log Monitor',
    route: '/tools/log-monitor',
    purpose: 'Monitor real-time logs from the game or tools for errors and warnings',
    features: ['Real-time tailing', 'Filter by severity', 'Persisted logs'],
    controls: [
      { name: 'Start Tail', type: 'button', description: 'Begin live log monitoring', whenToUse: 'When reproducing crashes or issues' },
      { name: 'Filter', type: 'input', description: 'Narrow log output by keywords', whenToUse: 'To find specific errors' },
    ],
    commonMistakes: ['Not filtering noisy info messages', 'Missing the relevant timestamp window'],
    guides: [
      { title: 'Diagnose a Crash', steps: ['Start the log monitor', 'Reproduce the crash', 'Filter for ERROR or EXCEPTION', 'Copy timestamp and share with Mossy'] },
    ],
    tutorialSections: ['Live Log Monitoring'],
    suggestedQuestions: ['How to capture a crash log?', 'Which log lines matter most?'],
  },

  'xedit-tools': {
    pageId: 'xedit-tools',
    pageName: 'xEdit Tools',
    route: '/tools/xedit',
    purpose: 'Utilities and integrations for xEdit/FO4Edit (load order, exports, scripts)',
    features: ['Export load order', 'Run xEdit scripts', 'Profile-aware operations'],
    controls: [
      { name: 'Export Load Order', type: 'button', description: 'Generate a plugins.txt or patch-friendly list', whenToUse: 'Before running comparators or auditors' },
      { name: 'Run Script', type: 'button', description: 'Execute an xEdit script', whenToUse: 'When applying batch fixes' },
    ],
    commonMistakes: ['Running destructive scripts without backup', 'Not using MO2 profile when required'],
    guides: [
      { title: 'Exporting for Patches', steps: ['Open xEdit Tools', 'Click Export Load Order', 'Save and use with patcher'] },
    ],
    tutorialSections: ['xEdit Integrations & Exporting'],
    suggestedQuestions: ['How to export a load order for xEdit?', 'Can I run xEdit scripts from Mossy?'],
  },

  'ck-extension': {
    pageId: 'ck-extension',
    pageName: 'Creation Kit Extension',
    route: '/tools/ck-extension',
    purpose: 'Integration helpers and safety features for the Creation Kit',
    features: ['Launch CK via MO2', 'Preflight checks', 'Crash prevention hooks'],
    controls: [
      { name: 'Launch CK', type: 'button', description: 'Start Creation Kit (respects MO2 profile)', whenToUse: 'When editing quests or ESPs' },
      { name: 'Preflight', type: 'button', description: 'Run sanity checks before CK launch', whenToUse: 'To reduce crash risk' },
    ],
    commonMistakes: ['Launching CK without MO2 when files are in virtual file system', 'Skipping preflight before heavy edits'],
    guides: [
      { title: 'Safe CK Launch', steps: ['Run Preflight Checks', 'Launch CK through MO2 if applicable', 'Open your plugin within CK'] },
    ],
    tutorialSections: ['CK Integration & Safety'],
    suggestedQuestions: ['How to launch CK from MO2?', 'Why does CK crash on load?'],
  },

  'project-templates': {
    pageId: 'project-templates',
    pageName: 'Project Templates',
    route: '/tools/project-templates',
    purpose: 'Create new mod projects from curated templates to jumpstart workflows',
    features: ['Multiple templates (quest, textures, overhaul)', 'Preview & customize', 'Initialize repo structure'],
    controls: [
      { name: 'Choose Template', type: 'dropdown', description: 'Select a starting template', whenToUse: 'When creating a new project' },
      { name: 'Initialize Project', type: 'button', description: 'Create project files and folders', whenToUse: 'After choosing a template' },
    ],
    commonMistakes: ['Choosing the wrong template for project goals', 'Not editing metadata after initialization'],
    guides: [
      { title: 'Start a New Mod', steps: ['Open Project Templates', 'Select an appropriate template', 'Click Initialize', 'Open the new project in Project Hub'] },
    ],
    tutorialSections: ['Project Templates & Initialization'],
    suggestedQuestions: ['Which template is best for quest mods?', 'How to customize template files?'],
  },

  'formid-remapper': {
    pageId: 'formid-remapper',
    pageName: 'FormID Remapper',
    route: '/tools/formid-remapper',
    purpose: 'Safely remap FormIDs to avoid conflicts when merging multiple plugins',
    features: ['Automated remapping', 'Preview changes', 'Undo support'],
    controls: [
      { name: 'Analyze Plugins', type: 'button', description: 'Scan plugin FormIDs for conflicts', whenToUse: 'Before remapping' },
      { name: 'Apply Remap', type: 'button', description: 'Execute remapping with backup', whenToUse: 'After review' },
    ],
    commonMistakes: ['Not creating backups before remapping', 'Remapping active live plugins without testing'],
    guides: [
      { title: 'Remap FormIDs', steps: ['Analyze plugins', 'Review suggested remaps', 'Backup and Apply', 'Test in game'] },
    ],
    tutorialSections: ['FormID Management & Safety'],
    suggestedQuestions: ['When should I remap FormIDs?', 'How to revert a remap?'],
  },

  'precombine-generator': {
    pageId: 'precombine-generator',
    pageName: 'Precombine Generator',
    route: '/tools/precombine-generator',
    purpose: 'Generate PRP/precombine patches to fix rendering/performance issues',
    features: ['Automatic precombine generation', 'Compatibility checks', 'Export PRP patches'],
    controls: [
      { name: 'Scan for Precombine Issues', type: 'button', description: 'Detect problematic objects', whenToUse: 'When seeing performance or lighting issues' },
      { name: 'Generate Patch', type: 'button', description: 'Create precombine PRP patches', whenToUse: 'After scanning' },
    ],
    commonMistakes: ['Applying precombine patches without testing on a copy'],
    guides: [
      { title: 'Create Precombine Patch', steps: ['Scan mod assets', 'Review flagged objects', 'Generate patch and test in-game'] },
    ],
    tutorialSections: ['Precombine & PRP Patches'],
    suggestedQuestions: ['What is precombine?', 'How does this affect lighting?'],
  },

  'voice-commands': {
    pageId: 'voice-commands',
    pageName: 'Voice Commands',
    route: '/tools/voice-commands',
    purpose: 'Configure and use voice command mappings for hands-free control',
    features: ['Map phrases to actions', 'Hotword support', 'Voice macros'],
    controls: [
      { name: 'Add Command', type: 'button', description: 'Create a new voice-to-action mapping', whenToUse: 'To add hands-free shortcuts' },
      { name: 'Test Command', type: 'button', description: 'Verify voice trigger and action', whenToUse: 'After adding a command' },
    ],
    commonMistakes: ['Using ambiguous phrases that trigger multiple actions'],
    guides: [
      { title: 'Create a Voice Macro', steps: ['Open Voice Commands', 'Click Add Command', 'Record phrase and assign action', 'Test and save'] },
    ],
    tutorialSections: ['Voice Commands & Macros'],
    suggestedQuestions: ['How to trigger a workflow by voice?', 'Can I use custom hotwords?'],
  },

  'automation-manager': {
    pageId: 'automation-manager',
    pageName: 'Automation Manager',
    route: '/tools/automation',
    purpose: 'Schedule and manage background automation tasks and workflows',
    features: ['Scheduled jobs', 'Retry policies', 'Task logs', 'Workflow triggers'],
    controls: [
      { name: 'Create Job', type: 'button', description: 'Schedule a recurring or one-time automation', whenToUse: 'When you want routine tasks automated' },
      { name: 'Run Now', type: 'button', description: 'Execute the job immediately', whenToUse: 'For testing or urgent runs' },
    ],
    commonMistakes: ['Scheduling heavy jobs during peak work hours'],
    guides: [
      { title: 'Schedule a Task', steps: ['Create job', 'Choose trigger (cron/datetime)', 'Assign workflow', 'Save and monitor logs'] },
    ],
    tutorialSections: ['Automation Manager - Background Tasks'],
    suggestedQuestions: ['How to run a workflow nightly?', 'Where are automation logs stored?'],
  },

  'ck-crash-prevention': {
    pageId: 'ck-crash-prevention',
    pageName: 'CK Crash Prevention',
    route: '/tools/ck-crash-prevention',
    purpose: 'Protect Creation Kit sessions by validating plugins and monitoring CK health',
    features: ['ESP validation', 'Live CK monitoring', 'Crash log analysis', 'Prevention plans'],
    controls: [
      { name: 'Validate ESP', type: 'button', description: 'Run validation checks on a plugin file', whenToUse: 'Before loading plugin in CK' },
      { name: 'Start Monitoring', type: 'button', description: 'Attach to CK process and monitor metrics', whenToUse: 'When running Creation Kit' },
    ],
    commonMistakes: ['Ignoring warnings before loading large plugins in CK'],
    guides: [
      { title: 'Preflight a Plugin', steps: ['Open CK Crash Prevention', 'Select ESP file', 'Click Validate', 'Apply prevention plan if suggested'] },
    ],
    tutorialSections: ['CK Safety & Preflight Checks'],
    suggestedQuestions: ['How to analyze a CK crash log?', 'What prevention steps can I take?'],
  },

  'security-validator': {
    pageId: 'security-validator',
    pageName: 'Security Validator',
    route: '/tools/security',
    purpose: 'Scan projects and assets for common security and privacy concerns',
    features: ['Vulnerability checks', 'Dependency scanning', 'Report generation'],
    controls: [
      { name: 'Run Scan', type: 'button', description: 'Perform a security scan', whenToUse: 'When auditing a project for release' },
    ],
    commonMistakes: ['Assuming only code needs security checks (assets can also leak data)'],
    guides: [
      { title: 'Perform Security Audit', steps: ['Click Run Scan', 'Review flagged items', 'Remediate and rescan'] },
    ],
    tutorialSections: ['Security Validation'],
    suggestedQuestions: ['What does the security scan check?', 'How to fix flagged items?'],
  },

  'mining-hub': {
    pageId: 'mining-hub',
    pageName: 'Mining & Analysis Hub',
    route: '/tools/mining-hub',
    purpose: 'Advanced data analysis, ML conflict prediction and large-scale asset mining',
    features: ['Longitudinal analytics', 'Conflict prediction', 'Performance profiling'],
    controls: [
      { name: 'Start Analysis', type: 'button', description: 'Run an analytics job', whenToUse: 'When preparing reports or ML datasets' },
    ],
    commonMistakes: ['Running large analyses without resource planning'],
    guides: [
      { title: 'Run Conflict Prediction', steps: ['Open Mining Hub', 'Select dataset or profile', 'Run prediction job', 'Review results'] },
    ],
    tutorialSections: ['Mining Hub - Large Scale Analysis'],
    suggestedQuestions: ['How accurate is conflict prediction?', 'How to limit analysis scope?'],
  },

  'dev': {
    pageId: 'dev',
    pageName: 'Developer Hub',
    route: '/dev',
    purpose: 'Developer tools, debugging and extension testing area',
    features: ['Dev utilities', 'Workflows for plugin authors', 'Debug consoles'],
    controls: [
      { name: 'Open Devtools', type: 'button', description: 'Open developer utilities', whenToUse: 'When debugging or testing extensions' },
    ],
    commonMistakes: ['Running devtools in production mode'],
    guides: [
      { title: 'Start Developer Debugging', steps: ['Open Dev Hub', 'Select tool (console, profiler)', 'Reproduce issue and inspect logs'] },
    ],
    tutorialSections: ['Developer Tools & Debugging'],
    suggestedQuestions: ['How to enable debug logging?', 'How to test an extension?'],
  },

  'mods': {
    pageId: 'mods',
    pageName: 'Mod Browser',
    route: '/mods',
    purpose: 'Browse, search and inspect installed mods and plugins',
    features: ['Filter by category', 'Inspect load order', 'Plugin metadata'],
    controls: [
      { name: 'Search Mods', type: 'input', description: 'Search installed mods', whenToUse: 'To find a specific mod quickly' },
    ],
    commonMistakes: ['Assuming mod list is authoritative when MO2 profile differs'],
    guides: [
      { title: 'Inspect a Mod', steps: ['Open Mod Browser', 'Search or filter', 'Click a mod to view details'] },
    ],
    tutorialSections: ['Mod Browser - Inspecting Mods'],
    suggestedQuestions: ['How to find a mod by author?', 'How to export mod metadata?'],
  },

  'media': {
    pageId: 'media',
    pageName: 'Media & Assets',
    route: '/media',
    purpose: 'Manage images, textures, and media assets used in mod projects',
    features: ['Image suite', 'TTS/voice previews', 'Asset previews'],
    controls: [
      { name: 'Open Image Suite', type: 'button', description: 'Edit and preview images', whenToUse: 'When preparing textures and icons' },
    ],
    commonMistakes: ['Uploading very large files without optimization'],
    guides: [
      { title: 'Optimize a Texture', steps: ['Open Image Suite', 'Apply conversion/resize', 'Export optimized file'] },
    ],
    tutorialSections: ['Media Management & Optimization'],
    suggestedQuestions: ['How to convert DDS to PNG?', 'How to preview textures?'],
  },

  'test': {
    pageId: 'test',
    pageName: 'Test & Sandbox',
    route: '/test',
    purpose: 'Testing area for experimental features and sandboxed tools',
    features: ['Experimental modules', 'Sandbox environment', 'Diagnostics'],
    controls: [
      { name: 'Run Sandbox', type: 'button', description: 'Launch a test instance of a module', whenToUse: 'When validating new features' },
    ],
    commonMistakes: ['Using sandbox data for production decisions'],
    guides: [
      { title: 'Try an Experimental Feature', steps: ['Open Test Hub', 'Select experimental feature', 'Run and provide feedback'] },
    ],
    tutorialSections: ['Testing & Experimental Features'],
    suggestedQuestions: ['How to report a bug?', 'Can I enable experimental tools?'],
  },

  'notification-test': {
    pageId: 'notification-test',
    pageName: 'Notification Test',
    route: '/test/notification-test',
    purpose: 'Simulate in-app notifications and verify behavior',
    features: ['Simulate success/error/ info notifications', 'Toast previews'],
    controls: [
      { name: 'Trigger Notification', type: 'button', description: 'Show a test notification', whenToUse: 'To confirm notification appearance' },
    ],
    commonMistakes: ['Assuming notification delivery equals persistence'],
    guides: [
      { title: 'Test Notifications', steps: ['Open Notification Test', 'Trigger each type', 'Observe behavior and timing'] },
    ],
    tutorialSections: ['Notifications & Feedback'],
    suggestedQuestions: ['How to customize notification settings?'],
  },

  'memory-vault': {
    pageId: 'memory-vault',
    pageName: 'Memory Vault',
    route: '/memory-vault',
    purpose: 'Persistent knowledge and memory repository for Mossy to recall project context',
    features: ['Saved notes & snippets', 'Searchable memory', 'Export/import memory'],
    controls: [
      { name: 'Save Note', type: 'button', description: 'Store context or snippets', whenToUse: 'To preserve important project details' },
      { name: 'Search Memory', type: 'input', description: 'Find stored entries', whenToUse: 'To recall prior guidance' },
    ],
    commonMistakes: ['Putting secrets into memory (avoid API keys)'],
    guides: [
      { title: 'Store Useful Info', steps: ['Open Memory Vault', 'Click Add', 'Fill title and content', 'Save entry'] },
    ],
    tutorialSections: ['Memory Vault - Save & Recall'],
    suggestedQuestions: ['How long is memory retained?', 'Can I export memory?'],
  },

  'dds-converter': {
    pageId: 'dds-converter',
    pageName: 'DDS Converter',
    route: '/dds-converter',
    purpose: 'Convert between DDS and common formats, with texture presets for games',
    features: ['Convert DDS ↔ PNG/JPEG', 'Mipmap generation', 'Preset export settings'],
    controls: [
      { name: 'Select File', type: 'button', description: 'Choose a texture to convert', whenToUse: 'When converting asset formats' },
      { name: 'Convert', type: 'button', description: 'Run conversion with chosen preset', whenToUse: 'After selecting options' },
    ],
    commonMistakes: ['Overwriting original files without backup'],
    guides: [
      { title: 'Convert a Texture', steps: ['Select file', 'Choose preset', 'Click Convert', 'Verify output in game or preview'] },
    ],
    tutorialSections: ['Texture Conversion & Presets'],
    suggestedQuestions: ['Which DDS format should I use?', 'How to keep mipmaps?'],
  },

  'texture-generator': {
    pageId: 'texture-generator',
    pageName: 'Texture Generator',
    route: '/texture-generator',
    purpose: 'Generate or enhance textures using AI-assisted tools and presets',
    features: ['AI upscaling', 'Style-presets', 'Seamless texture baking'],
    controls: [
      { name: 'Generate', type: 'button', description: 'Create or upscale a texture using selected model', whenToUse: 'When producing or improving assets' },
    ],
    commonMistakes: ['Expecting perfect results without iteration'],
    guides: [
      { title: 'Upscale a Texture', steps: ['Open Texture Generator', 'Upload texture', 'Choose upscaler preset', 'Generate and review'] },
    ],
    tutorialSections: ['AI Texture Generation'],
    suggestedQuestions: ['How to remove seams?', 'Which presets fit clothing textures?'],
  },

  'guides': {
    pageId: 'guides',
    pageName: 'Guides & Learning Hub',
    route: '/guides',
    purpose: 'Centralized learning resources, step-by-step guides and references',
    features: ['Curated tutorials', 'Searchable knowledge base', 'Community-contributed guides'],
    controls: [
      { name: 'Search Guides', type: 'input', description: 'Find guides by topic', whenToUse: 'When looking for how-to documentation' },
    ],
    commonMistakes: ['Skipping prerequisites for advanced guides'],
    guides: [
      { title: 'Find a Guide', steps: ['Open Guides', 'Search or browse category', 'Open guide and follow steps'] },
    ],
    tutorialSections: ['Learning Hub Overview'],
    suggestedQuestions: ['Where to learn Papyrus scripting?', 'Which guide covers texture baking?'],
  },

  'guides-blender': {
    pageId: 'guides-blender',
    pageName: 'Blender Animation Guide',
    route: '/guides/blender',
    purpose: 'Blender workflows and export settings tailored for Fallout 4 assets',
    features: ['Export presets', 'Rigging checklists', 'Animation validator guidance'],
    controls: [
      { name: 'Export Preset', type: 'dropdown', description: 'Choose export settings compatible with game', whenToUse: 'When exporting FBX/NIF' },
    ],
    commonMistakes: ['Incorrect bone naming conventions', 'Exporting with wrong scale/orientation'],
    guides: [
      { title: 'Export an Animation', steps: ['Prepare rig', 'Apply export preset', 'Export and validate in toolchain'] },
    ],
    tutorialSections: ['Blender Export & Rigging'],
    suggestedQuestions: ['How to export for NIF?', 'What naming conventions to use?'],
  },

  'guides-creation-kit': {
    pageId: 'guides-creation-kit',
    pageName: 'Creation Kit Guides',
    route: '/guides/creation-kit',
    purpose: 'Authoritative Creation Kit tutorials for quest authoring and plugins',
    features: ['Quest templates', 'Leveled list guidance', 'Script examples'],
    controls: [],
    commonMistakes: ['Editing live ESPs without backups'],
    guides: [
      { title: 'Create a Dialogue', steps: ['Open Creation Kit', 'Create quest and dialogue views', 'Test in CK and game'] },
    ],
    tutorialSections: ['Quest Authoring', 'Papyrus Examples'],
    suggestedQuestions: ['How to inject leveled lists?', 'Best practices for quest debugging?'],
  },

  'guides-physics': {
    pageId: 'guides-physics',
    pageName: 'Physics & Havok Guides',
    route: '/guides/physics',
    purpose: 'Physics export and havok troubleshooting guides for animations and collision',
    features: ['Havok export tips', 'Collision setup', 'Previs guidance'],
    controls: [],
    commonMistakes: ['Missing precombine steps for complex meshes'],
    guides: [
      { title: 'Prepare collision', steps: ['Simplify mesh', 'Generate collision primitives', 'Export and test'] },
    ],
    tutorialSections: ['Physics & Collision'],
    suggestedQuestions: ['How to export collision for Havok?', 'Why is my navmesh broken?'],
  },

  'guides-mods': {
    pageId: 'guides-mods',
    pageName: 'Modding Guides',
    route: '/guides/mods',
    purpose: 'Practical how‑tos for common modding tasks (BodySlide, Sim Settlements, etc.)',
    features: ['Step-by-step tutorials', 'Tool-specific best practices'],
    controls: [],
    commonMistakes: ['Missing platform-specific steps (MO2 vs Vortex)'],
    guides: [
      { title: 'Mod Packaging Checklist', steps: ['Verify assets', 'Run Auditor', 'Build archive', 'Test in clean load order'] },
    ],
    tutorialSections: ['Mod Packaging & Testing'],
    suggestedQuestions: ['How to build a distributable mod?', 'Packaging best practices?'],
  },

  'mo2-extension': {
    pageId: 'mo2-extension',
    pageName: 'MO2 Extension',
    route: '/extensions/mo2',
    purpose: 'Integrate with Mod Organizer 2 to surface profiles, load order and mod management',
    features: ['Profile detection', 'Load order preview', 'Export lists'],
    controls: [
      { name: 'Refresh', type: 'button', description: 'Reload MO2 profile and mod list', whenToUse: 'When MO2 changes' },
    ],
    commonMistakes: ['Not running MO2 before expecting live data'],
    guides: [
      { title: 'Link MO2', steps: ['Start MO2', 'Open MO2 Extension', 'Refresh and verify detected mods'] },
    ],
    tutorialSections: ['MO2 Integration'],
    suggestedQuestions: ['How to use MO2 with Mossy?', 'Why is MO2 not detected?'],
  },

  'comfyui-extension': {
    pageId: 'comfyui-extension',
    pageName: 'ComfyUI Extension',
    route: '/extensions/comfyui',
    purpose: 'Connect to ComfyUI instances for specialized image pipeline integrations',
    features: ['Status detection', 'Pipeline launching', 'Preset management'],
    controls: [],
    commonMistakes: ['Not starting ComfyUI before opening the extension'],
    guides: [
      { title: 'Use ComfyUI', steps: ['Start ComfyUI', 'Open extension', 'Run pipeline or preview'] },
    ],
    tutorialSections: ['ComfyUI Integration'],
    suggestedQuestions: ['How to connect ComfyUI?', 'What pipelines are supported?'],
  },

  'upscayl-extension': {
    pageId: 'upscayl-extension',
    pageName: 'Upscayl Extension',
    route: '/extensions/upscayl',
    purpose: 'Use Upscayl upscaler from within Mossy for high-quality texture upscaling',
    features: ['Local upscaling', 'Preset selection', 'Batch processing'],
    controls: [
      { name: 'Upscale', type: 'button', description: 'Upscale selected texture', whenToUse: 'When improving texture resolution' },
    ],
    commonMistakes: ['Expecting pixel-perfect results without manual touchups'],
    guides: [
      { title: 'Upscale a Texture', steps: ['Open Upscayl Extension', 'Select file(s)', 'Choose preset and run'] },
    ],
    tutorialSections: ['Upscayl Integration'],
    suggestedQuestions: ['What presets work best for UI art?', 'How to batch-upscale?'],
  },

  /* Backwards-compatible route: /ck-crash-prevention (also available at /tools/ck-crash-prevention) */
  'ck-crash-prevention-legacy': {
    pageId: 'ck-crash-prevention-legacy',
    pageName: 'CK Crash Prevention (legacy route)',
    route: '/ck-crash-prevention',
    purpose: 'Legacy/alternate route mapping for CK crash prevention content',
    features: ['ESP validation', 'Live CK monitoring', 'Crash log analysis'],
    controls: [
      { name: 'Validate ESP', type: 'button', description: 'Run quick validation before loading in CK' },
    ],
    commonMistakes: ['Skipping preflight checks before launching CK'],
    guides: [
      { title: 'Use CK Crash Prevention (legacy)', steps: ['Open the CK Crash Prevention page', 'Run Validate ESP', 'Start monitoring if you run CK'] },
    ],
    tutorialSections: ['CK Safety (legacy route)'],
    suggestedQuestions: ['How to analyze CK crash logs?'],
  },

};

/**
 * Get tutorial context for current page
 */
export function getTutorialContext(route: string): TutorialPageContext | null {
  // Normalize route
  const normalizedRoute = route.startsWith('/') ? route.slice(1) : route;
  
  // Direct match
  for (const context of Object.values(tutorialContexts)) {
    if (context.route === `/${normalizedRoute}` || context.route === normalizedRoute) {
      return context;
    }
  }
  
  // Partial match (for nested routes)
  for (const context of Object.values(tutorialContexts)) {
    if (normalizedRoute.startsWith(context.route.slice(1))) {
      return context;
    }
  }
  
  return null;
}

/**
 * Generate context-aware prompt for Mossy based on current page
 */
export function generateTutorialPrompt(route: string, userQuestion: string): string {
  const context = getTutorialContext(route);
  
  if (!context) {
    return userQuestion;
  }
  
  // Build enriched prompt with context
  const prompt = `[CONTEXT: User is on the "${context.pageName}" page (${context.route})]
[PAGE PURPOSE: ${context.purpose}]
[AVAILABLE FEATURES: ${context.features.join(', ')}]

User's question: ${userQuestion}

Please provide a helpful, beginner-friendly answer that:
1. References features available on this specific page
2. Provides step-by-step instructions when appropriate
3. Uses simple language and explains technical terms
4. Mentions specific buttons/controls if relevant: ${context.controls.map(c => c.name).join(', ')}
5. Includes "Beginner Tip" if helpful`;
  
  return prompt;
}

/**
 * Get suggested questions for current page
 */
export function getSuggestedQuestions(route: string): string[] {
  const context = getTutorialContext(route);
  return context?.suggestedQuestions || [];
}

/**
 * Get common mistakes for current page
 */
export function getCommonMistakes(route: string): string[] {
  const context = getTutorialContext(route);
  return context?.commonMistakes || [];
}
