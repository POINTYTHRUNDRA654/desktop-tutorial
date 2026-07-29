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
  
  /** Optional: canonical VISUAL_GUIDE page number (if available) */
  visualGuidePage?: number;
  
  /** Route path (e.g., "/chat", "/tools/auditor") */
  route: string;
  
  /** Brief description of page purpose */
  purpose: string;
  
  /** Key features available on this page */
  features: string[];
  
  /** Buttons and controls with descriptions */
  controls: {
    name: string;
    // Control taxonomy widened to reflect actual UI elements referenced in contexts
    type:
      | 'button'
      | 'input'
      | 'dropdown'
      | 'slider'
      | 'toggle'
      | 'indicator'
      | 'panel'
      | 'task'
      | 'list'
      | 'form'
      | 'navigation'
      | 'tool'
      | 'links'
      | 'walkthrough'
      | 'widget'
      | 'viewer'
      | 'text'
      | 'card'
      | 'controls'
      | 'input/button'
      | 'tab'
      | 'tabs';
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
    pageName: 'Mossy.Space (Home Dashboard)',
    visualGuidePage: 1,
    route: '/',
    purpose: 'Central dashboard showing all 23 platforms via Quick Hub Access grid, live health badges, and FO4 beginner steps',
    features: [
      'Live health badges: Electron, Storage, Vault, Wizard, Mic, TTS',
      'Active project banner (when a project is in progress)',
      'Quick Hub Access grid — links directly to all major hubs',
      'Fallout 4 Modding — 6-step "Where to Start" guide for new users',
      'Desktop Bridge / UPLINK status indicator',
      'Time-based greeting (Good Morning / Afternoon / Evening)',
      'Quick Help link → FO4 Knowledge Hub',
      'In-app shortcuts panel (AI Chat, Setup Wizards, System Hub, FO4 Knowledge Hub, FO4 Mod Journey Hub)',
      'Version display reads from package.json automatically',
    ],
    controls: [
      {
        name: 'Hub Card',
        type: 'button',
        description: 'Click to navigate to that consolidated hub',
        whenToUse: 'When you want to go directly to Creation Kit, Textures, Plugin & Load Order, or any other hub',
      },
      {
        name: 'Help Link (top-right)',
        type: 'button',
        description: 'Opens the FO4 Knowledge Hub with search, quick reference, and community docs',
        whenToUse: 'When you need to look something up or find documentation',
      },
      {
        name: 'UPLINK SYNCED / UPLINK REQUIRED badge',
        type: 'indicator',
        description: 'Shows whether the Desktop Bridge (Electron backend) is connected',
        whenToUse: 'Check this first if a tool integration is not working — a red badge means local features are unavailable',
      },
      {
        name: 'Health Badges strip',
        type: 'indicator',
        description: 'Green = OK, Yellow = warning, Red = error. Shows Electron, Storage, Vault, Wizard, Mic, and TTS status.',
        whenToUse: 'When something is not working — use the badges to narrow down if the issue is hardware permissions, storage, or the Electron layer',
      },
      {
        name: 'Active Project Banner',
        type: 'panel',
        description: 'Appears when a mod project is active; click Open to jump to FO4 Mod Journey Hub → Mod Projects',
        whenToUse: 'When returning to Mossy mid-project — quickly jump back to your open project',
      },
      {
        name: 'FO4 "Where to Start" steps',
        type: 'panel',
        description: '6 clickable step cards covering Setup Wizards → Goals → Load Order → Assets → Stability → Build & Release',
        whenToUse: 'When you are new to Fallout 4 modding or want a guided entry into Mossy\'s tools',
      },
    ],
    commonMistakes: [
      'Ignoring the health badges — a yellow Wizard badge means Setup Wizards has not been run yet',
      'Using old "/tools/..." URLs — all tools are now consolidated inside hub pages',
      'Missing the Ctrl+K command palette for fast navigation across all 23 platforms',
      'Clicking "Help" and expecting it to open external docs — it opens the in-app FO4 Knowledge Hub',
      'Not checking the UPLINK badge before expecting local tool integrations to work',
      'Starting the Stability step (Step 5) without knowing your game version — OG (1.10.163), NG (1.10.980-984), and AE/1.11.x all require different F4SE, Address Library, and crash tool builds',
    ],
    guides: [
      {
        title: 'First time setup from the home dashboard',
        steps: [
          'Check the health badges — Wizard should turn green after running Setup Wizards',
          'Click "Setup Wizards" in the hub grid or the in-app shortcuts below the ToolsInstallVerifyPanel',
          'Detect your installed tools (xEdit, MO2/Vortex, Creation Kit, F4SE, etc.)',
          'Return to Mossy.Space — the Wizard badge should now be green',
          'Follow the 6-step FO4 "Where to Start" guide on the home screen to continue',
        ],
      },
      {
        title: 'Navigating from the home screen',
        steps: [
          'Use the Quick Hub Access 4×3 grid for the 12 most common destinations',
          'Or press Ctrl+K to open the command palette and search by name',
          'Or use the sidebar on the left — all 23 platforms are listed there',
        ],
      },
    ],
    tutorialSections: [
      'Mossy.Space - Home Dashboard',
      'Health Badges and Bridge Status',
      'Quick Hub Access Grid',
      'FO4 Where to Start - 6 steps for new modders',
    ],
    suggestedQuestions: [
      'Why is my Electron badge showing WARN?',
      'What does UPLINK REQUIRED mean on the home screen?',
      'Where do I go to manage my load order?',
      'How do I start my first Fallout 4 mod?',
      'What is the difference between the hubs?',
      'How do I open the command palette?',
      'How do I find out which game version I am running?',
      'What is the difference between NG and AE for my mod setup?',
    ],
  },
  
  'ai-chat': {
    pageId: 'ai-chat',
    pageName: 'AI Chat',
    visualGuidePage: 2,
    route: '/chat',
    purpose: 'Primary Fallout 4 command-and-guidance console with chat, voice input, live tool telemetry, and citations',
    features: [
      'FO4-locked assistant with content guard for non-FO4 prompts',
      'Quick FO4 prompt chips (load order, ESL, BA2 V1/V2, FOMOD, precombines, DDS formats, crash triage, deprecated frameworks, game version check, etc.)',
      'Live citations panel on assistant answers ("Explain why")',
      'Voice input via microphone and optional TTS playback',
      'Desktop Bridge + Blender Link awareness for tool execution',
      'Live guidance checklist based on currently active tools and project tags',
      'Conversation export (Markdown), pause/resume controls, and durable history backup',
      '👍 / 👎 rating buttons on assistant messages for personal training dataset capture',
    ],
    controls: [
      {
        name: 'Send Button',
        type: 'button',
        description: 'Sends your current FO4 question/prompt to Mossy',
        whenToUse: 'Every time you want a new response',
      },
      {
        name: 'Pause Mossy / Resume Mossy',
        type: 'button',
        description: 'Temporarily stops or resumes assistant replies without losing chat history',
        whenToUse: 'When you need to stop responses while editing your prompt or context',
      },
      {
        name: 'Voice Toggle + Mic Input',
        type: 'button',
        description: 'Enables spoken playback and records microphone transcription',
        whenToUse: 'When you want hands-free interaction',
      },
      {
        name: 'Monitor ON/OFF',
        type: 'button',
        description: 'Toggles live tool monitoring and checklist generation',
        whenToUse: 'Pause when telemetry is noisy, resume for context-aware guidance',
      },
      {
        name: 'Clear Chat History',
        type: 'button',
        description: 'Resets chat messages/project context while preserving global app settings and scan approvals',
        whenToUse: 'When you want a fresh conversation state',
      },
      {
        name: '👍 / 👎 Rate Response',
        type: 'button',
        description: 'Thumbs-up/down buttons on each assistant message; pairs that response with the preceding user turn and saves it to userData/training-dataset.jsonl',
        whenToUse: 'Any time a response is notably good or bad — helps improve future fine-tuning',
      },
    ],
    commonMistakes: [
      'Trying to execute desktop actions while Runtime Hub/Desktop Bridge is offline',
      'Keeping monitoring paused and expecting live tool-aware guidance',
      'Sending broad prompts instead of FO4-specific records/files/goals',
      'Ignoring the 👍/👎 buttons — rating responses builds a free training dataset you can use to fine-tune Mossy later',
      'Not specifying your game version (OG 1.10.163 / NG 1.10.980-984 / AE 1.11.x) — version changes everything for F4SE, BA2 headers, Address Library, and crash tools',
      'Using AWKCR, Armorsmith Extended, or DEF_UI on NG/AE — these are deprecated and cause CTDs. Use ECO/NEO, LEO, and FallUI Suite instead.',
    ],
    guides: [
      {
        title: 'Starting a productive FO4 chat session',
        steps: [
          'Use a quick prompt chip or type a focused FO4 question',
          'Include your target (record type, tool, or workflow) and current issue',
          'Press Enter or click Send',
          'If available, expand citations to confirm the response basis',
        ],
      },
      {
        title: 'Using voice + runtime integrations',
        steps: [
          'Open Runtime Hub and ensure Desktop Bridge is online',
          'Enable Voice if you want spoken responses',
          'Use the microphone button to transcribe speech into chat input',
          'If you need Blender actions, ensure Blender Link is active before requesting scripts',
        ],
      },
      {
        title: 'Building a training dataset',
        steps: [
          'Chat normally and click 👍 on responses you want to keep',
          'Click 👎 on responses that were wrong or unhelpful',
          'Open System Hub → Capabilities tab → Training Data → click "Export JSONL" to download the file',
          'Use the JSONL with Unsloth to fine-tune your own local model',
        ],
      },
    ],
    tutorialSections: [
      'AI Chat Basics',
      'FO4 Prompting Patterns',
      'Voice + Runtime Tooling',
      'Citations and Training Data Feedback',
    ],
    suggestedQuestions: [
      'How do I ask for a safe ESL-flag workflow in xEdit?',
      'Why are my desktop actions failing from chat?',
      'How do I use citations to verify an answer?',
      'What should I include in a good FO4 troubleshooting prompt?',
      'How do I export my training data from the chat ratings?',
      'I have AWKCR installed — is it safe on my version of the game?',
      'What is the difference between BA2 Header V1 and V2 and which do I need?',
      'How do I read an X-Cell crash log to find the broken mod?',
    ],
  },

  'ai-mod-assistant': {
    pageId: 'ai-mod-assistant',
    pageName: 'AI Mod Assistant',
    visualGuidePage: 3,
    route: '/ai-mod-assistant',
    purpose: 'FO4-focused assistant for mod ideation, Papyrus/script generation, and panel-aware smart actions.',
    features: [
      'Two-pane workflow: chat assistant + code preview panel',
      'Generate Papyrus/script output directly from Smart Actions',
      'Quick action routing to key hubs (Runtime, Asset Analysis, FO4 Mod Builder Hub, Memory Vault, etc.)',
      'Optional learning mode toggle for guided practice messaging',
      'Voice start/stop hooks when STT bridge APIs are available',
      'FO4-constrained system instruction context through MossyBrain',
    ],
    controls: [
      {
        name: 'Send Message',
        type: 'button',
        description: 'Sends your current request to the AI Mod Assistant chat panel',
        whenToUse: 'Use for normal guidance, planning, and troubleshooting prompts',
      },
      {
        name: 'Generate Script',
        type: 'button',
        description: 'Runs a Papyrus/script generation prompt and displays output in Code Assistant preview',
        whenToUse: 'Use when you need a starting script skeleton or quick prototype',
      },
      {
        name: 'Learning Toggle + Voice Toggle',
        type: 'toggle',
        description: 'Learning toggle changes coaching mode; Voice toggle starts/stops STT when available',
        whenToUse: 'Enable learning for guided walkthroughs and voice when hands-free input is needed',
      },
    ],
    commonMistakes: [
      'Using non-FO4 prompts that are too broad to produce actionable outputs',
      'Expecting file actions to work while Runtime Hub/Desktop Bridge is offline',
      'Treating generated scripts as final without validating in CK/xEdit workflows',
    ],
    guides: [
      {
        title: 'Generating a script prototype',
        steps: [
          'Open AI Mod Assistant and click Generate Script (or ask in chat)',
          'Review the output in the Code Assistant preview panel',
          'Refine the prompt with specific record names/events and regenerate',
        ],
      },
      {
        title: 'Using smart panel actions safely',
        steps: [
          'Trigger a smart action that opens another hub (asset, runtime, builder, etc.)',
          'Confirm the destination route is the expected consolidated hub',
          'If file actions fail, verify Runtime Hub/Desktop Bridge connectivity first',
        ],
      },
    ],
    tutorialSections: [
      'AI Mod Assistant Basics',
      'Script Generation + Code Preview',
      'Smart Actions and Hub Routing',
    ],
    suggestedQuestions: [
      'Can you generate a basic FO4 Papyrus quest trigger script?',
      'Which hub should I open next for packaging or conflict checks?',
      'Why did a file action fail in AI Mod Assistant?',
      'How should I refine prompts for better script output?',
    ],
  },
  
  'live-voice': {
    pageId: 'live-voice',
    pageName: 'Live Synapse',
    route: '/live',
    purpose: 'Real-time, voice-driven interaction with Mossy — live transcription, mic monitoring and embedded audio tools.',
    features: [
      'Real-time voice conversation with live transcription preview',
      'Mic level meter and visual status indicators (listening / speaking / processing)',
      'Central Connect / Disconnect action with connection ring animation',
      'ENCRYPTED BEAM active indicator when link is established',
      'Multiple STT and TTS provider support (browser, Whisper, Deepgram, OpenAI)',
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
      'Expecting sub-second responses (allow 1-2s for processing)',
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
          'Deepgram/remote STT can occasionally fail - Mossy will now automatically fall back to browser/Whisper if errors recur',
          'Your voice conversations are logged to a file (default `D:\\mossy_voice_history.txt`); you can review past chats any time',
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
      { title: 'Quick File Audit', steps: ['Click the DDS / NIF / ESP button to upload a file', 'Select the file from the Mod Manifest', 'Click Run Audit', "Click any listed issue to read Mossy's advice", 'Use Fix‑It or open the file in an external tool to remediate', 'Re‑run the audit to confirm the fix'] },
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
    pageName: 'Image Studio',
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
    pageName: 'FO4 Automation Orchestrator',
    visualGuidePage: 16,
    route: '/dev/orchestrator',
    purpose: 'FO4 Automation Orchestrator centralizes type-aware asset pipelines so mesh, texture, audio, and script processing can be run from one panel with reproducible logs and BA2 staging output.',
    features: [
      'Asset-first workflow: choose one asset and automatically get the matching pipeline',
      'Type-based pipelines for mesh, texture, audio, and script processing',
      'Per-step execution output with generated command strings and copy helpers',
      'Run logs and short run history per selected asset',
      'Storage stats (total / processed / pending) and BA2 queue export',
      'Integrated setup/verification panel for first-run orchestration checks',
    ],
    controls: [
      {
        name: 'Asset List panel',
        type: 'button',
        description: 'Select the asset you want to process; pipeline applicability updates by asset type',
        whenToUse: 'Start each run by selecting the target mesh/texture/audio/script item',
      },
      {
        name: 'Run Pipeline button',
        type: 'button',
        description: 'Executes the currently selected pipeline and streams step logs/output',
        whenToUse: 'After confirming selected asset paths and pipeline steps',
      },
      {
        name: 'Pipeline steps view',
        type: 'panel',
        description: 'Displays ordered step cards, status, generated command text, and per-step copy actions',
        whenToUse: 'During and after a run to validate exactly what the orchestrator executed',
      },
      {
        name: 'Storage Stats / BA2 Queue panel',
        type: 'panel',
        description: 'Shows processed/pending storage totals and exportable BA2 target path list',
        whenToUse: 'Before packaging, to confirm staged outputs and queue contents',
      },
      {
        name: 'Run History / Log stream',
        type: 'panel',
        description: 'Shows recent run durations for the selected asset and real-time run log entries',
        whenToUse: 'When troubleshooting step behavior or verifying a rerun after fixes',
      },
    ],
    commonMistakes: [
      'Treating EXAMPLE source paths as real input paths without replacing them',
      'Running a pipeline without verifying the selected asset target path',
      'Skipping reruns after fixing reported asset issues',
      'Exporting BA2 queue paths before confirming assets are staged/processed',
    ],
    guides: [
      {
        title: 'Run a complete orchestrated asset pass',
        steps: [
          'Select an asset from the left Asset List and verify its source/target paths',
          'Review the auto-selected pipeline and its ordered steps',
          'Click "Run Pipeline" and monitor step cards plus the live log stream',
          'Use "Copy Path" for target verification and copy BA2 queue entries when ready',
          'Review Run History and rerun after fixes to confirm clean completion',
        ],
      },
    ],
    tutorialSections: [
      'FO4 Automation Orchestrator - Asset Pipelines',
      'Runs, Logs, Storage Stats & BA2 Queue',
    ],
    suggestedQuestions: [
      'How does FO4 Automation Orchestrator choose a pipeline for my asset type?',
      'Where can I inspect the exact commands used for each pipeline step?',
      'How do I export staged target paths for BA2 packaging?',
      'What should I verify before rerunning a failed pipeline?',
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
    pageName: 'The Holodeck',
    route: '/test/holo',
    purpose: 'A real pre-flight readiness checklist — runs checkable diagnostics (Desktop Bridge status, game process detection, load order integrity, navmesh CTD risk, and more) so you catch setup problems before you ever launch the game.',
    features: [
      'A library of real test scenarios grouped by category (load order, combat, quest, settlement, NPC)',
      'Each scenario has real, checkable steps with an expected outcome and known risk areas',
      '"Run All" executes every scenario in sequence',
      '"Export Report" copies all test run results to your clipboard',
    ],
    controls: [
      {
        name: 'Run All',
        type: 'button',
        description: 'Runs every test scenario in sequence and records pass/fail/partial results for each.',
        whenToUse: 'Before a play session, to catch setup problems (missing tools, bad load order, misconfigured paths) early.',
      },
      {
        name: 'Scenario list (left panel)',
        type: 'button',
        description: 'Click a scenario to select it and see its individual steps, expected outcome, and severity.',
        whenToUse: 'When you want to run or inspect just one specific check instead of the whole suite.',
      },
      {
        name: 'Run (per-scenario)',
        type: 'button',
        description: 'Runs only the currently selected scenario.',
        whenToUse: 'To re-check a single item after fixing something, without rerunning the whole suite.',
      },
      {
        name: 'Export Report',
        type: 'button',
        description: 'Copies all completed test run results to your clipboard as text, ready to paste into a bug report or chat with Mossy.',
        whenToUse: 'After running tests, when you want to share results or ask Mossy for help interpreting a failure.',
      },
    ],
    commonMistakes: [
      'Skipping Holodeck and troubleshooting blind in-game instead of checking these real, fast diagnostics first',
      'Ignoring "major"/"critical" severity failures and launching the game anyway',
      'Not re-running a scenario after fixing the underlying issue, so the report goes stale',
    ],
    guides: [
      {
        title: 'Running a full readiness check',
        steps: [
          'Open the Holodeck and click "Run All"',
          'Watch the pass/fail/partial status update for each scenario as it completes',
          'Expand any failed scenario to see which step failed and its listed risk areas',
          'Fix the underlying issue (e.g. configure a missing tool path in Settings), then re-run that scenario',
          'Click "Export Report" to copy results if you want to share them or ask Mossy for help',
        ],
      },
    ],
    tutorialSections: [
      'Holodeck - Readiness Checklist',
      'Running and Exporting Test Results',
    ],
    suggestedQuestions: [
      'What does a "critical" severity failure mean?',
      'Why did the load order integrity check fail?',
      'How do I fix a navmesh CTD risk warning?',
      'Can I add my own test scenario?',
    ],
  },

  'packaging': {
    pageId: 'packaging',
    pageName: 'FO4 Packaging & Release',
    visualGuidePage: 11, // synced from VISUAL_GUIDE.md
    route: '/packaging-release',
    purpose: 'Unified FO4 release pipeline for packaging and validation: BA2 archive prep, release checklist, conflict analysis, mod comparison, FOMOD installer export, and final release publishing.',
    features: [
      'Six-step consolidated workflow (BA2, checklist, conflicts, comparison, assembler, export) plus three standalone advanced tools',
      'BA2 Archive Manager for listing, extracting, packing, and merging BA2 files',
      'Packaging checklist wizard for release readiness and distribution sanity checks',
      'Conflict analysis for visualizing mod conflicts before shipping',
      'Mod comparison tooling for compatibility checks against similar mods',
      'FOMOD installer assembly and export as a packaging stage',
      'Step 5 Export & Release: build the release zip, write release notes, and publish to Nexus or Bethesda.net',
      'Three standalone advanced tools alongside the numbered steps: Conflict Resolver (resolve plugin record conflicts, generate patch recommendations), Conflict Dependency Graph (visualize mod conflict relationships as an interactive graph), and Mod Auto-Enhancer (drag in a mod, auto-enhance its textures, download the enhanced package — a local pipeline, not a Bethesda.net uploader)',
      'Section deep-link support via ?section= query values',
    ],
    controls: [
      {
        name: 'Step 0: BA2 Archive Manager',
        type: 'button',
        description: 'Expands BA2 tools to list, extract, pack, and merge archives before release assembly',
        whenToUse: 'Use first when your distribution requires BA2 archive prep or verification',
      },
      {
        name: 'Step 1: Packaging Checklist',
        type: 'button',
        description: 'Runs the embedded packaging checklist for folder structure and release readiness',
        whenToUse: 'Use after archive prep to verify package structure and required release metadata',
      },
      {
        name: 'Step 2: Conflict Analysis',
        type: 'button',
        description: 'Opens conflict visualization against other mods',
        whenToUse: 'Use before release to identify and triage compatibility risks',
      },
      {
        name: 'Step 3: Mod Comparison',
        type: 'button',
        description: 'Compares your mod against similar mods for overlap and compatibility checks',
        whenToUse: 'Use before final packaging when you need side-by-side compatibility validation',
      },
      {
        name: 'Step 4: FOMOD Installer (Assembler)',
        type: 'button',
        description: 'Builds and exports a FOMOD installer for end-user distribution',
        whenToUse: 'Use as a packaging stage before test install and publication',
      },
      {
        name: 'Step 5: Export & Release',
        type: 'button',
        description: 'Builds your release zip, writes release notes, and publishes to Nexus or Bethesda.net',
        whenToUse: 'Use as the final step once everything else has passed validation',
      },
      {
        name: 'Conflict Resolver',
        type: 'tab',
        description: 'Standalone tool that resolves plugin record conflicts and generates patch recommendations',
        whenToUse: 'Use when Conflict Analysis flags a conflict you need to actually resolve, not just see',
      },
      {
        name: 'Conflict Dependency Graph',
        type: 'tab',
        description: 'Standalone tool that visualizes mod conflict relationships as an interactive dependency graph',
        whenToUse: 'Use to understand how conflicts chain across multiple mods, not just one pair at a time',
      },
      {
        name: 'Mod Auto-Enhancer',
        type: 'tab',
        description: 'Standalone tool — drag in a mod, automatically enhance its textures, and download the enhanced package; a local pipeline, not a Bethesda.net uploader',
        whenToUse: 'Use to batch-improve another mod\'s textures locally before repackaging',
      },
    ],
    commonMistakes: [
      'Skipping BA2 validation and shipping broken or incomplete archives',
      'Running checklist but skipping conflict/comparison validation',
      'Publishing without test-installing the exported package/FOMOD',
      'Packaging with debug/dev artifacts still included',
      'Ignoring section deep-links and reopening the wrong stage in long sessions',
      'Forgetting Step 5 Export & Release exists and manually zipping/publishing instead',
      'Confusing Mod Auto-Enhancer with a Bethesda.net uploader — it only enhances textures locally',
    ],
    guides: [
      {
        title: 'FO4 Packaging & Release End-to-End',
        steps: [
          'Open /packaging-release and start with Step 0 BA2 Archive Manager',
          'Run Step 1 Packaging Checklist to validate release structure and required files',
          'Use Step 2 Conflict Analysis to detect compatibility issues (Conflict Resolver / Dependency Graph for deeper investigation)',
          'Use Step 3 Mod Comparison for overlap/risk review against similar mods',
          'Build Step 4 FOMOD Installer',
          'Finish with Step 5 Export & Release to build the zip, write release notes, and publish',
        ],
      },
    ],
    tutorialSections: [
      'Step 0: BA2 Archive Manager',
      'Step 1: Packaging Checklist',
      'Step 2: Conflict Analysis',
      'Step 3: Mod Comparison',
      'Step 4: FOMOD Installer',
      'Step 5: Export & Release',
      'Advanced Tools: Conflict Resolver, Conflict Dependency Graph, Mod Auto-Enhancer',
    ],
    suggestedQuestions: [
      'When should I use BA2 merge vs pack in this release flow?',
      'What order should I run checklist, conflicts, and comparison before publishing?',
      'How do I validate my FOMOD installer before Nexus release?',
      'Can I deep-link directly to a packaging step with ?section= ?',
      'What does Step 5 Export & Release actually do?',
      'What is the difference between Conflict Analysis and Conflict Resolver?',
      'Is Mod Auto-Enhancer going to upload my mod anywhere?',
    ],
  },

  'learning-hub': {
    pageId: 'knowledge-hub',
    pageName: 'FO4 Knowledge Hub',
    visualGuidePage: 6,
    route: '/knowledge-hub',
    purpose: 'Unified FO4 knowledge workspace for quick references, semantic search, community learning notes, vanilla asset browsing, and RAG-backed vector search.',
    features: [
      'Five-tab layout: Quick Reference, Knowledge Search, Community Learning, Vanilla Assets, and RAG Search',
      'Tab selection persists for the session via sessionStorage key `knowledge_hub_tab`, and number keys 1-5 jump directly between tabs',
      'Quick Reference for Papyrus, FormIDs, CK hotkeys, xEdit shortcuts, and practical FO4 cheatsheets — now includes Deprecated Frameworks (AWKCR/DEF_UI/Armorsmith) and NG/AE version guidance',
      'Knowledge Search for semantic retrieval and indexed in-app docs (Ollama-backed)',
      'Community Learning for shared tips and curated knowledge',
      'Vanilla Assets browses your own unpacked base-game Data folder (all 44 FO4 BA2 archives extracted) as a searchable file tree, letting you copy any vanilla mesh/texture/material/audio into your mod project for reference or replacement',
      'RAG Search queries an AnythingLLM workspace over a vector database for grounded, source-cited answers pulled from whatever documents you have indexed there',
    ],
    controls: [
      {
        name: 'Quick Reference Tab',
        type: 'button',
        description: 'Opens FO4 quick-reference content and practical lookup notes',
        whenToUse: 'Use when you need immediate Papyrus/FormID/tool reminders',
      },
      {
        name: 'Knowledge Search Tab',
        type: 'button',
        description: 'Switches to semantic search and indexed knowledge lookup',
        whenToUse: 'Use when you need targeted documentation or concept search',
      },
      {
        name: 'Community Learning Tab',
        type: 'button',
        description: 'Shows curated community tips and shared best-practice notes',
        whenToUse: 'Use when looking for practical patterns from other modders',
      },
      {
        name: 'Vanilla Assets Tab',
        type: 'tab',
        description: 'Browse, search, and copy unpacked vanilla FO4 meshes/textures/materials/audio/scripts from your Data folder directly into your mod project',
        whenToUse: 'Use when you need to reference or reuse a base-game asset as a starting point instead of building one from scratch',
      },
      {
        name: 'RAG Search Tab',
        type: 'tab',
        description: 'Connects to an AnythingLLM workspace and runs vector-database queries against your indexed documents, returning cited source snippets alongside the answer',
        whenToUse: 'Use for grounded answers backed by your own indexed documentation set, rather than general knowledge search',
      },
      {
        name: 'Tab Memory Handler',
        type: 'indicator',
        description: 'Restores your last selected Knowledge Hub tab for continuity',
        whenToUse: 'Expect this when returning to the hub mid-workflow',
      },
    ],
    commonMistakes: [
      'Using legacy /learn assumptions and missing the current /knowledge-hub platform route',
      'Ignoring tab context and expecting Quick Reference content while Search/Community tab is active',
      'Assuming search is external-only instead of using in-app FO4 indexed knowledge first',
      'Forgetting that tab state restores from session storage between visits',
      'Installing AWKCR, Armorsmith Extended, or DEF_UI on NG/AE — check the Deprecated Frameworks section of Quick Reference for safe replacements',
      'Trying to use Vanilla Assets without first unpacking the FO4 BA2 archives to a Data folder on disk',
      'Trying to use RAG Search without an AnythingLLM workspace connected or configured',
    ],
    guides: [
      {
        title: 'Using FO4 Knowledge Hub efficiently',
        steps: [
          'Open FO4 Knowledge Hub from the sidebar (`/knowledge-hub`)',
          'Start in Quick Reference for immediate command/record lookups',
          'Switch to Knowledge Search for deeper indexed documentation queries',
          'Use Community Learning for implementation tips and workflow ideas',
          'Browse Vanilla Assets to pull a base-game mesh or texture into your project',
          'Use RAG Search for grounded, source-cited answers from your own indexed documents',
          'Return later and confirm your previous tab restores automatically',
        ],
      },
    ],
    tutorialSections: [
      'FO4 Knowledge Hub Overview',
      'Quick Reference + Search + Community Tabs',
      'Vanilla Assets Browser',
      'RAG Search (AnythingLLM)',
      'Tab Persistence Behavior',
    ],
    suggestedQuestions: [
      'Which tab should I use for fast FO4 lookup vs deep search?',
      'Why did the hub reopen on the same tab I used earlier?',
      'Where can I find in-app FO4 references before asking chat?',
      'How do I search indexed knowledge from this hub?',
      'Where can I look up which frameworks are deprecated on NG/AE?',
      'What is the ESL FormID limit and why does it matter?',
      'How do I browse and copy vanilla FO4 assets into my mod?',
      'What is RAG Search and how is it different from Knowledge Search?',
    ],
  },

  'settings': {
    pageId: 'settings',
    pageName: 'Settings',
    visualGuidePage: 22,
    route: '/settings',
    purpose: 'Nine-section accordion hub for configuring all Mossy preferences in one ordered flow: Privacy & Security, Language, AI Engine (Groq model / token limit / self-critique), Local LLM (Ollama), External FO4 Tool Paths, Backup & Restore, Tutorial Reset, Internet Access Test, and Credits. Changes here affect every other platform in the app.',
    features: [
      'Step 1 — Privacy & Security: control data collection, analytics opt-out, and security rule defaults',
      'Step 2 — Language: choose UI language and request new translations',
      'Step 3 — AI Engine: select Groq primary model (Llama 3.1 8B, Llama 3.2 11B Vision, Llama 3.3 70B, DeepSeek R1, Gemma 2, Mixtral), max response tokens (512-4096), and self-critique loop toggle',
      'Step 3b — Local LLM (Ollama): connect to a local Ollama endpoint for offline AI assistance and check model pull status',
      'Step 4 — External Tools: browse and test-launch paths for all FO4 modding tools — xEdit (FO4Edit), Creation Kit, Fallout 4 game root, Papyrus compiler, F4SE, Archive2, LOOT, Mod Organizer 2, Wrye Bash, NifSkope, Blender, BodySlide, Outfit Studio, Vortex, FOMOD Creator, Upscayl, GIMP, and more; auto-detect for common install locations',
      'Step 5 — Backup & Restore: export or import a complete settings snapshot (JSON) for quick recovery after reinstall or machine migration',
      'Step 6 — Tutorial & Onboarding: replay the installation tutorial and first-run onboarding experience',
      'Step 7 — Internet Access Test: live connectivity probe for all search providers Mossy uses (Fallout Wiki, Fandom, DuckDuckGo, Wikipedia) with per-provider latency and DNS troubleshooting guidance',
      'Credits & Acknowledgments: searchable list of all open-source libraries and tools that power Mossy',
      'Version Info panel always visible at the bottom — shows app version, build date, and update status',
    ],
    controls: [
      {
        name: 'Step 1: Privacy & Security accordion',
        type: 'panel',
        description: 'Expands the PrivacySettings component — toggle analytics, crash reporting, and data-sharing preferences',
        whenToUse: 'On first run or whenever you want to review what data Mossy collects',
      },
      {
        name: 'Step 2: Language accordion',
        type: 'panel',
        description: 'Choose UI language from available translations; includes a link to contribute missing translations',
        whenToUse: 'When switching to a non-English UI or checking translation coverage',
      },
      {
        name: 'Step 3: AI Engine accordion',
        type: 'panel',
        description: 'Select Groq primary model, set max response tokens, and toggle the self-critique loop (second-pass refinement). Fast models (8B) suit quick questions and voice; smart models (70B) suit complex Papyrus scripting and deep analysis.',
        whenToUse: 'When AI responses feel too slow or too shallow; switch to a larger model for detailed FO4 scripting help',
      },
      {
        name: 'Groq primary model selector',
        type: 'dropdown',
        description: 'Choices include qwen/qwen3.6-27b (fastest), llama-3.2-11b-vision-preview (fast vision), openai/gpt-oss-120b (best reasoning), deepseek-r1-distill-llama-70b (chain-of-thought), llama-3.2-90b-vision-preview (smartest + vision), gemma2-9b-it (Google compact)',
        whenToUse: 'Switch to openai/gpt-oss-120b for complex Creation Kit scripting or asset pipeline questions; stay on qwen/qwen3.6-27b for real-time voice and quick lookups',
      },
      {
        name: 'Self-critique loop toggle',
        type: 'toggle',
        description: 'When ON, Mossy generates an answer then runs a second pass to find errors and gaps before delivering the final response. Adds 3-6 seconds per turn.',
        whenToUse: 'Enable when reviewing Papyrus scripts or getting step-by-step FO4 mod build guidance where accuracy matters more than speed',
      },
      {
        name: 'Step 3b: Local LLM (Ollama) accordion',
        type: 'panel',
        description: 'Set the Ollama base URL, choose a local model, and check pull / connection status',
        whenToUse: 'When working offline or when you want responses that never leave your machine',
      },
      {
        name: 'Step 4: External Tools accordion',
        type: 'panel',
        description: 'Browse/Test-launch buttons for every FO4 tool path. Auto-detect scans common Steam, GOG, and default install directories. Save button validates all paths before committing.',
        whenToUse: 'First-time setup, after moving tools to a different drive, or when a hub reports a missing tool path',
      },
      {
        name: 'Browse button (per tool)',
        type: 'button',
        description: 'Opens a native file-picker dialog to locate the tool executable',
        whenToUse: 'When the auto-detect did not find a tool or found the wrong version',
      },
      {
        name: 'Test Launch button (per tool)',
        type: 'button',
        description: 'Spawns the tool executable to confirm the path is valid and the tool opens correctly',
        whenToUse: 'After setting or changing a path to confirm the tool starts without errors',
      },
      {
        name: 'Auto-Detect All button',
        type: 'button',
        description: 'Scans Steam library folders, Program Files, and common mod manager install locations for all known FO4 tools',
        whenToUse: 'Run once on first launch; re-run after installing new tools or moving your Steam library',
      },
      {
        name: 'Step 5: Backup & Restore accordion',
        type: 'panel',
        description: 'Export a timestamped JSON snapshot of all settings; import a snapshot to restore from backup',
        whenToUse: 'Before a major version update or when setting up Mossy on a second machine',
      },
      {
        name: 'Step 6: Tutorial & Onboarding accordion',
        type: 'panel',
        description: 'Reset tutorial progress and replay the guided installation and first-run onboarding flow',
        whenToUse: 'When showing Mossy to a new team member or re-learning platform features after a long break',
      },
      {
        name: 'Step 7: Internet Access Test accordion',
        type: 'panel',
        description: 'Runs a live connectivity probe against every search provider: Fallout Wiki (fallout.wiki), Fandom (fallout.fandom.com), DuckDuckGo, and Wikipedia. Shows latency (ms) and OK/fail status per provider.',
        whenToUse: 'When AI web-search results are missing, empty, or stale; or when online knowledge fetch shows errors',
      },
      {
        name: 'Credits & Acknowledgments accordion',
        type: 'panel',
        description: 'Opens the full searchable credits panel listing every open-source library, framework, and tool used in Mossy with their licenses',
        whenToUse: 'For attribution compliance or to see what version of a dependency Mossy ships',
      },
      {
        name: 'Version Info panel',
        type: 'indicator',
        description: 'Always-visible footer showing app version, build metadata, and auto-updater status',
        whenToUse: 'When reporting a bug or checking whether an update is available',
      },
    ],
    commonMistakes: [
      'Skipping Privacy & Security on first run — some defaults allow analytics; review them before using the app heavily',
      'Leaving the Groq API key empty — all AI features will fail silently until a valid Groq key is entered in Privacy/API settings',
      'Setting xEdit path to the folder instead of FO4Edit.exe — path must point to the executable, not the directory',
      'Not running Test Launch after setting a tool path — a path can look valid but point to the wrong version (e.g., Skyrim xEdit instead of FO4Edit)',
      'Setting Fallout 4 root to the Data folder instead of the game root — the correct path ends in \\Fallout4 (contains Fallout4.exe)',
      'Setting papyrusCompilerPath to PapyrusCompiler.exe in the wrong game\'s Scripts\\Compiler folder — must be the FO4 compiler, not Skyrim',
      'Choosing the 70B Groq model for real-time voice chat — large models add 3-8 s latency; use 8B-instant for voice',
      'Not exporting a settings backup before a major Mossy update — settings structure can change between major versions',
      'Not running the Internet Access Test when online knowledge fetch returns empty results — one blocked provider can cause silent failures',
    ],
    guides: [
      {
        title: 'First-time FO4 modder setup (recommended order)',
        steps: [
          'Open Settings → Step 1: Privacy & Security; review and confirm your data-sharing preferences',
          'Open Step 3: AI Engine; select openai/gpt-oss-120b for the best FO4 scripting and build guidance',
          'Open Step 4: External Tools; click Auto-Detect All and wait for the scan to complete',
          'For any tool shown in red (not found), click Browse to manually locate the executable',
          'Set Fallout 4 path to the game root folder containing Fallout4.exe (e.g., C:\\Program Files (x86)\\Steam\\steamapps\\common\\Fallout 4)',
          'Set xEdit path to FO4Edit.exe (download FO4Edit from Nexus if not installed)',
          'Set Creation Kit path to CreationKit.exe in your Fallout 4 game folder (requires Bethesda Launcher install)',
          'Set F4SE path to f4se_loader.exe (download from f4se.silverlock.org)',
          'Set Archive2 path to Archive2.exe inside the Creation Kit folder',
          'Click Test Launch for each critical tool to confirm it opens correctly',
          'Click Save — Mossy validates all paths before saving',
          'Return to Step 5 and export a backup snapshot immediately after a clean setup',
          'Open Step 7: Internet Access Test to confirm online knowledge fetch is working',
        ],
      },
      {
        title: 'Tune AI responses for FO4 mod work',
        steps: [
          'Open Step 3: AI Engine',
          'Select openai/gpt-oss-120b for complex Papyrus scripting, asset pipeline analysis, or conflict resolution questions',
          'Select qwen/qwen3.6-27b for quick lookups, real-time voice, or simple how-to questions',
          'Set Max Response Tokens to 2048 or 4096 when requesting complete Papyrus script examples',
          'Enable Self-Critique Loop when generating scripts or detailed step-by-step guides where correctness matters more than speed',
          'Save settings and test a question to confirm response quality meets your needs',
        ],
      },
    ],
    tutorialSections: [
      'Settings Hub — 9-Section Configuration Flow',
      'External FO4 Tool Paths (xEdit, CK, Papyrus, F4SE, Archive2, LOOT)',
      'AI Engine Setup (Groq Model, Tokens, Self-Critique)',
      'Privacy, Backup & Internet Diagnostics',
    ],
    suggestedQuestions: [
      'What is the correct Fallout 4 root path and how do I find it?',
      'How do I get a free Groq API key and where do I enter it?',
      'Which AI model should I use for writing Papyrus scripts vs. quick questions?',
      'Why is xEdit showing as not found even though I installed it?',
      'What does the self-critique loop do and when should I enable it?',
      'How do I set up F4SE and confirm the path is correct?',
      'How do I export a settings backup and restore it on another machine?',
      'Why are my internet search results empty or stale?',
      'What is the correct Papyrus compiler path for Fallout 4?',
      'How do I run Auto-Detect for all tools at once?',
    ],
  },

  'project-hub': {
    pageId: 'project-hub',
    pageName: 'FO4 Mod Journey Hub',
    visualGuidePage: 4,
    route: '/journey-hub',
    purpose: 'Create, organize and track mod projects end-to-end (planning → implementation → release).',
    features: [
      'Create and save mod project plans (type, author, description)',
      'Project list with progress, version and status badges',
      'Per-project step tracking (add/update/delete steps)',
      'Quick create flow that sets a project as the current mod',
      'Project detail view with tabs: Overview, Steps, Settings',
      'Persistence via ModProjectStorage and integration with Chat/Neural Link',
      'Collaboration & Git controls (init, commit, push, pull)',
      'Tools Install / Verify guidance embedded for healthy workflows',
    ],
    controls: [
      {
        name: 'New Mod / Create Mod Project',
        type: 'button',
        description: 'Opens the create form to define name, type, author and description',
        whenToUse: 'When starting any new mod — small or large',
      },
      {
        name: 'Project List Card',
        type: 'button',
        description: 'Select a project to open its detail view (also marks it as current)',
        whenToUse: 'When you want to continue or inspect a project',
      },
      {
        name: 'Progress Bar & Percentage',
        type: 'slider',
        description: 'Shows completion percentage based on project steps',
        whenToUse: 'Quickly check project progress or sprint completeness',
      },
      {
        name: 'Add Step / Step Controls',
        type: 'button',
        description: 'Add a new task/step to the project and update status/priority',
        whenToUse: 'When planning work or recording completed tasks',
      },
      {
        name: 'Project Status Dropdown',
        type: 'dropdown',
        description: 'Set project lifecycle state (planning, in‑progress, testing, released)',
        whenToUse: 'When changing the current phase of development',
      },
      {
        name: 'Delete Project (trash)',
        type: 'button',
        description: 'Permanently removes the project after confirmation',
        whenToUse: 'Only when you are sure the project is no longer needed',
      },
      {
        name: 'Version & Notes (Settings tab)',
        type: 'input',
        description: 'Edit project version and notes which are saved to storage',
        whenToUse: 'When publishing a new build or recording important notes',
      },
      {
        name: 'Tools Install / Verify Panel',
        type: 'button',
        description: 'Guidance checks and small test loops recommended before major tasks',
        whenToUse: 'Run when integrating external tools or when troubleshooting build issues',
      },
    ],
    commonMistakes: [
      'Creating a project but forgetting to set it as the current mod (Chat won\'t have context)',
      'Using wide-scoped steps — prefer small, testable tasks',
      'Deleting a project accidentally without a backup',
      'Not using version control or initializing Git for collaborative work',
      'Relying on ephemeral storage (private/cleared storage) and losing projects',
    ],
    guides: [
      {
        title: 'Create your first Mod Project',
        steps: [
          'Open Project Hub and click "New Mod"',
          'Enter a clear name, choose a Mod Type and add a short description',
          'Click "Create Mod Project" — it will become the current mod',
          'Open the project and add 1-3 small steps to get started',
          'Run a quick test loop (change → build → test) and mark the step complete',
        ],
      },
      {
        title: 'Track progress & update steps',
        steps: [
          'Select a project from the list to open Details → Steps',
          'Click "Add Step" to create discrete tasks (e.g., "Create normal map")',
          'Use the status dropdown to move steps between Pending / In Progress / Completed',
          'Observe the Progress bar update and the completion percentage change',
        ],
      },
      {
        title: 'Use Collaboration & Version Control',
        steps: [
          'Open the Collaboration section in Project Hub',
          'Initialize Git for the current project (Init Repository)',
          'Use Commit / Push / Pull controls to sync with remote when available',
          'Create a Collaboration Session to invite contributors and share context',
        ],
      },
      {
        title: 'Project Settings & Release Notes',
        steps: [
          'Open project → Settings tab',
          'Update the Version field before packaging or publishing',
          'Add release notes to the Notes field and save (onBlur persists)',
          'Use timestamps to track created / last updated dates',
        ],
      },
    ],
    tutorialSections: [
      'Project Hub Overview',
      'Creating & Managing Mod Projects',
      'Step Tracking & Progress',
      'Collaboration & Git',
    ],
    suggestedQuestions: [
      'How do I create a mod project? (show steps)',
      'How do I add or reorder steps in a project?',
      'Why is my project not persisting after refresh?',
      'How do I initialize Git for this project?',
      'How can I share this project with collaborators?',
    ],
  },

  'monitor': {
    pageId: 'monitor',
    pageName: 'System Monitor',
    route: '/monitor',
    purpose: 'System Monitor is the status & diagnostics hub — run hardware and tool detection, inspect Desktop Bridge status, and collect exportable diagnostic snapshots.',
    features: [
      'Hardware & tool detection (detectPrograms)',
      'Desktop Bridge & bridge connectivity status',
      'Live performance & logs',
      'Exportable scan reports',
      'Quick-fix suggestions (Tool Verify links)',
    ],
    controls: [
      { name: 'Full System Scan', type: 'button', description: 'Run hardware and tool detection scans', whenToUse: 'After installing tools or when integrations fail' },
      { name: 'View Logs', type: 'button', description: 'Open recent system and bridge logs', whenToUse: 'When diagnosing connectivity or install issues' },
      { name: 'Export Scan Report', type: 'button', description: 'Download a diagnostic scan report', whenToUse: 'When sharing troubleshooting data' },
    ],
    commonMistakes: [
      'Not running the scanner after installing tools',
      'Assuming bridge is online without checking status',
    ],
    guides: [
      { title: 'Run your first scan', steps: ['Open System Monitor from the sidebar', 'Click Full System Scan', 'Verify detected tools and bridge status', 'Open Tool Verify for any failed tools'] },
    ],
    tutorialSections: ['System Monitor - Scans & Health', 'Bridge & Tool Detection'],
    suggestedQuestions: ['How do I run a hardware scan?', 'Why is Desktop Bridge offline?'],
  },

  'diagnostics': {
    pageId: 'diagnostics',
    pageName: 'Diagnostic Tools',
    route: '/diagnostics',
    purpose: 'All-in-one system checks: verify the desktop bridge, tool paths, API/secret visibility, permissions, and collect exportable diagnostic snapshots for triage.',
    features: [
      'System health & telemetry checks (bridge, storage, permissions)',
      'Tool path & version detection (detectPrograms test)',
      'Microphone & TTS voice availability checks',
      'Secret status check for backend/OpenAI/Groq',
      'Exportable diagnostic report (text) and snapshot (JSON)',
      'Crash triage wizard and timeline snapshots',
      'Guided remediation and Tools Install / Verify guidance',
    ],
    controls: [
      {
        name: 'Run Diagnostics',
        type: 'button',
        description: 'Performs a suite of runtime checks (bridge, storage, mic, secrets, TTS voices)',
        whenToUse: 'On first launch, after installing tools, or when something behaves incorrectly',
      },
      {
        name: 'Diagnostic Checks List',
        type: 'button',
        description: 'Displays each check with status (Checking / Success / Error) and result details',
        whenToUse: 'Inspect individual subsystem health and error details',
      },
      {
        name: 'Run detectPrograms Test',
        type: 'button',
        description: 'Calls detectPrograms() to enumerate installed tools and shows sample output',
        whenToUse: 'When verifying Creation Kit, MO2, Blender etc. are detected correctly',
      },
      {
        name: 'Export Diagnostics (text)',
        type: 'button',
        description: 'Downloads a human-readable diagnostic report for sharing with support',
        whenToUse: 'When filing an issue or sending troubleshooting info to a collaborator',
      },
      {
        name: 'Export Snapshot (JSON)',
        type: 'button',
        description: 'Creates a detailed, redacted JSON snapshot (system info, checks, logs) and saves/downloads it',
        whenToUse: 'When you need a full snapshot for bug triage or crash reproduction',
      },
      {
        name: 'Reveal Settings File',
        type: 'button',
        description: 'Opens the app settings file location (when supported by the Desktop Bridge)',
        whenToUse: 'To inspect or copy settings for debugging',
      },
      {
        name: 'Crash Triage Wizard',
        type: 'button',
        description: 'Guided flow to reproduce, capture logs and escalate crashes',
        whenToUse: 'When you experience an app crash or persistent instability',
      },
    ],
    commonMistakes: [
      'Not running diagnostics immediately after installing or updating external tools',
      'Sharing diagnostic snapshots without redacting or confirming sensitive keys (snapshots are redacted by default)',
      'Expecting every check to be "Success" — some checks depend on environment (e.g., Desktop Bridge in web preview)',
      'Running diagnostics while tools are actively being used (may report false negatives)',
    ],
    guides: [
      {
        title: 'Run a Full Health Check',
        steps: [
          'Open Diagnostics Hub and click "Run Diagnostics"',
          'Wait for each check to show Success or Error (no indefinite "Checking...")',
          'If a check fails, open the matching section (Tool Verify / System Monitor) and follow suggested fixes',
          'Re-run diagnostics to confirm the issue is resolved',
        ],
      },
      {
        title: 'Export a Diagnostic Snapshot for Support',
        steps: [
          'Click "Export Snapshot (JSON)"',
          'Save the generated file to a convenient location (or allow the app to save)',
          'Confirm that secret fields are redacted before sharing',
          'Attach the snapshot to your issue or send to support',
        ],
      },
      {
        title: 'Validate External Tools (detectPrograms)',
        steps: [
          'Open the Tool Verify section or run the detectPrograms test from Diagnostic Tools',
          'Review the first results to confirm expected programs (CK, MO2, Blender)',
          'If a tool is missing, update the path or install the missing app and re-run the test',
        ],
      },
      {
        title: 'Crash Triage & Timeline',
        steps: [
          'Open Crash Triage from Diagnostics Hub',
          'Follow the wizard to reproduce and capture logs',
          'Export the diagnostics snapshot and include it with the bug report',
        ],
      },
    ],
    tutorialSections: [
      'Diagnostics & Troubleshooting',
      'Tool Verify & detectPrograms Test',
      'Crash Triage & Snapshot Export',
    ],
    suggestedQuestions: [
      'How do I export a diagnostics snapshot? (show steps)',
      'Why does the Desktop Bridge show Inactive?',
      'How do I verify microphone and TTS voice availability?',
      'What does the secret-status check look for?',
      'How do I run the detectPrograms test?',
    ],
  },

  'devtools': {
    pageId: 'devtools',
    pageName: 'Dev Tools',
    route: '/devtools',
    purpose: 'Generate, analyze and validate Papyrus scripts — scaffold code, detect issues, and prepare scripts for compilation.',
    features: [
      'Papyrus Template Generator with example prompts',
      'Script Analyzer that finds syntax, structure and performance issues',
      'Upload / download / copy workflow for working with .psc files',
      'Quick Nexus / FO4Edit search links for investigations',
      'Guided first-test loop (generate → compile → test)',
    ],
    controls: [
      {
        name: 'Generate Papyrus Script',
        type: 'button',
        description: 'Creates a scaffolded .psc file from your natural-language description',
        whenToUse: 'When you need a working starting point or example script',
      },
      {
        name: 'Copy / Download (generated)',
        type: 'button',
        description: 'Copy generated code to clipboard or download as a .psc file',
        whenToUse: 'When you want to move the scaffold into your project or compiler',
      },
      {
        name: 'Example Prompts',
        type: 'button',
        description: 'Select an example prompt to prefill the generator',
        whenToUse: 'When you need inspiration or a quick-start template',
      },
      {
        name: 'Upload .psc',
        type: 'button',
        description: 'Upload an existing Papyrus source file for analysis',
        whenToUse: 'When you want to validate or inspect an existing script',
      },
      {
        name: 'Analyze (Script Analyzer)',
        type: 'button',
        description: 'Runs static checks to detect missing EndEvent/EndFunction, performance hotspots and property issues',
        whenToUse: 'Before compiling or shipping scripts',
      },
      {
        name: 'Open Nexus / FO4Edit Search',
        type: 'button',
        description: 'Quick external searches (Nexus / FO4Edit) to find similar mods or references',
        whenToUse: 'When diagnosing an issue or locating reference material',
      },
    ],
    commonMistakes: [
      'Copying generated code into game without compiling/validating in the Creation Kit',
      'Ignoring analyzer warnings (they often flag runtime performance issues)',
      'Using overly broad example prompts — prefer specific, testable tasks',
      'Not saving a backup before applying automatic changes',
    ],
    guides: [
      {
        title: 'Generate and export a working script',
        steps: [
          'Open DevTools → Template Generator',
          'Type a short description (e.g., "door that spawns 3 enemies")',
          'Click "Generate Papyrus Script" and review the explanation',
          'Click Copy or Download to move the .psc into your project',
          'Compile in Creation Kit and run an in‑game test',
        ],
      },
      {
        title: 'Analyze an existing .psc file',
        steps: [
          'Open DevTools → Script Analyzer',
          'Upload your .psc file or paste the source into the editor',
          'Click "Analyze" and review Errors / Warnings / Info',
          'Address critical errors first (missing EndEvent/EndFunction)',
          'Re-run analysis until no critical issues remain',
        ],
      },
      {
        title: 'Use example prompts effectively',
        steps: [
          'Choose a focused example prompt (Activator / Timer / Spawn)',
          'Generate the template and inspect the event handlers added',
          'Adapt properties to your mod project and test a small change',
        ],
      },
    ],
    tutorialSections: [
      'Template Generator',
      'Script Analyzer',
      'First Test Loop (generate → compile → test)',
    ],
    suggestedQuestions: [
      'How do I export the generated script to my mod folder?',
      'What does the analyzer mean by "GetDistance in loop" warning?',
      'Which prompts produce quest scripts vs. activator scripts?',
      'How do I fix a missing EndEvent error?',
    ],
  },

  'wizards': {
    pageId: 'wizards',
    pageName: 'FO4 Setup Wizards',
    visualGuidePage: 8, // synced from VISUAL_GUIDE.md
    route: '/wizards',
    purpose: 'All-in-one FO4 setup flow for selecting a platform path, completing install verification checklists, and generating PRP compatibility planning output.',
    features: [
      'Collapsible 3-step flow (Platform Selector → Install Wizard → PRP Patch Builder)',
      'Install Wizard for xEdit / SS2 / PRP / patch prerequisites with trusted source links',
      'Knowledge Vault link ingestion + optional JSON/bundled vault import for setup references',
      'Persistent checklist state and first‑test loops for repeatable machine setup',
      'PRP Patch Builder generates copy-ready README/Nexus blocks for compatibility handoff',
    ],
    controls: [
      {
        name: 'Step 1: Choose a Platform',
        type: 'button',
        description: 'Use embedded platform workflow cards to choose the correct setup path before running install tasks',
        whenToUse: 'Use first when deciding your setup flow for the current modding goal',
      },
      {
        name: 'Step 2: Install Wizard',
        type: 'button',
        description: 'Run topic-based prerequisite/download/install/verify checklists with persistent progress',
        whenToUse: 'Run this first when setting up a new machine or after installing tools',
      },
      {
        name: 'Step 3: PRP Patch Builder',
        type: 'button',
        description: 'Generate and copy README + optional Nexus block for PRP compatibility patch planning',
        whenToUse: 'When preparing precombined/previs content or optimizing assets',
      },
      {
        name: 'Reset + Persistence Controls',
        type: 'button',
        description: 'Reset Install Wizard or PRP state and re-run clean verification loops',
        whenToUse: 'When you want to restart setup from a known clean state',
      },
      {
        name: 'Trusted Links + Vault Sources',
        type: 'button',
        description: 'Open built-in trusted download links plus topic-matched links from your local Knowledge Vault',
        whenToUse: 'When validating sources or pulling setup references directly from your saved vault data',
      },
    ],
    commonMistakes: [
      'Running wizards out of order (skip Platforms → Install → PRP flow)',
      'Assuming the wizard installs external apps for you (it verifies and links only)',
      'Marking steps complete without performing the verification steps',
      'Not saving or exporting wizard progress before resetting',
      'Not identifying your game version first (OG 1.10.163 / NG 1.10.980-984 / AE 1.11.x) — the correct F4SE build, Address Library build, and BA2 header version all depend on this',
      'Installing Buffout 4 standalone on NG/AE — use X-Cell (Addictol successor) instead',
    ],
    guides: [
      {
        title: 'Run the Install Wizard (recommended first step)',
        steps: [
          'Open FO4 Setup Wizards → expand Step 2: Install Wizard',
          'Pick the topic that matches your workflow (xEdit, SS2, PRP, Patching)',
          'Follow each checklist item and open trusted links when instructed',
          'Mark steps complete and re-run the verification checks',
          'Return to Diagnostics and re-run checks if something still fails',
        ],
      },
      {
        title: 'Generate a PRP Patch Plan',
        steps: [
          'Open FO4 Setup Wizards → expand Step 3: PRP Patch Builder',
          'Fill in the target project details and choose assets to include',
          'Use copy buttons to capture the generated README / Nexus block',
          'Follow the PRP workflow with the copied plan in your release notes or handoff docs',
        ],
      },
      {
        title: 'Choose the right wizard via PlatformsHub',
        steps: [
          'Open FO4 Setup Wizards and expand Step 1: Choose a Platform',
          'Select the platform card that matches your task (Install, Packaging, PRP)',
          'Start the recommended wizard and complete the minimal verification loop',
        ],
      },
    ],
    tutorialSections: [
      'Platform Selection (PlatformsHub)',
      'Install Wizard (xEdit / SS2 / PRP)',
      'PRP Patch Builder & Packaging',
    ],
    suggestedQuestions: [
      'Which wizard should I run first for a fresh install?',
      'How do I reset the Install Wizard progress?',
      'What does the PRP Patch Builder generated README contain?',
      'Why does a wizard checklist not persist after refresh?',
      'How do I know if I should install the NG or AE build of Address Library?',
      'My game is v1.11.191 — what version of F4SE and Address Library do I need?',
      'What BA2 header version do I need for NG/AE?',
    ],
  },

  'ck-tools': {
    pageId: 'ck-tools',
    pageName: 'FO4 Creation Kit Hub',
    visualGuidePage: 9,
    route: '/ck-tools',
    purpose: 'Unified Creation Kit workspace with 11 tabs: CK Safety, CK Extension, FO4 CK Guide, Plugin Inspector, Pre-Publish, INI Validator, Quest Editor, Animation, Save Parser, Live Monitor, and Game Link.',
    features: [
      'Eleven-tab consolidated workflow: CK Safety · CK Extension · FO4 CK Guide · Plugin Inspector · Pre-Publish · INI Validator · Quest Editor · Animation · Save Parser · Live Monitor · Game Link',
      'Session tab persistence via sessionStorage (restores last active tab)',
      'Deep-link support with query param routing (/ck-tools?tab=safety|extension|guide|inspector|checklist|inifix|quests|anim|saves|livemon|gameint)',
      'Embedded FO4 CK reference: crash causes, best practices, Papyrus tips, ESL/FormID rules, NG/AE version guidance, and deprecated framework warnings (AWKCR/DEF_UI/Armorsmith Extended)',
      'Integrated tool references for CK Platform Extended, Addictol (all-in-one stability, Nexus #84214), CLASSIC, xEdit, and related utilities',
      'CK Safety tab: plugin validation, Spriggit serialization (ESP → YAML for Git version control), and live CK process monitor',
      'CK Extension tab: auto-save timer (timestamp only — CK IPC save bridge not yet wired), script compiler log, connection status',
      'Plugin Inspector tab: a full "Plugin Repair Platform" with its own 3 sub-tabs — Inspect & Fix (binary deep-scan with real auto-fix: NAVM undelete, rename, xEdit launch, CK rebuild), Patch Creator (compatibility patch generation), and Previsbines & PRP (precombine/previs repair workflow)',
      'Pre-Publish tab: a real 22-item release checklist across categories, with critical-vs-total progress tracking saved to localStorage',
      'INI Validator tab: paste your Fallout4.ini/Fallout4Custom.ini content and it parses real sections/keys, checking them against known-good settings (missing/wrong/ok status per setting)',
      'Quest Editor tab: quest stage and alias authoring helpers',
      'Animation tab: Havok/HKX workflow guidance — covers behavior graph editing, HKX export pipelines, community rig setup (Shiagur Blender rigs #81279/#82537, MaikCG F4Biped #16691), and animation framework integration (IAF #50555 keyword patching, NAF #73889 ESP-less XML packs, AWF #100946 world-object interactions)',
      'Save Parser tab: save game data inspection and script residue analysis',
      'Live Monitor tab: runtime event monitoring',
      'Game Link tab: F4SE bridge status and integration',
    ],
    controls: [
      {
        name: 'CK Safety Tab',
        type: 'button',
        description: 'Plugin validation, Spriggit ESP→YAML conversion (wire to Git), and live CK process monitoring',
        whenToUse: 'Use first when preparing a CK session, before distributing a plugin, or after any crash',
      },
      {
        name: 'CK Extension Tab',
        type: 'button',
        description: 'Auto-save timer (logs timestamps only — not a real CK save) and script compiler output log',
        whenToUse: 'Keep open while actively editing; use File > Save in CK manually to protect your work',
      },
      {
        name: 'FO4 CK Guide Tab',
        type: 'button',
        description: 'In-app CK reference: crash pitfalls, NG/AE version matrix (OG CK vs NG CK, CKPE 0.3.x vs 0.5+), deprecated framework warnings, Papyrus tips, ESL/FormID rules, essential tool list',
        whenToUse: 'Use before any release, when checking NG/AE compatibility, or looking up ESL limits and deprecated mods',
      },
      {
        name: 'Plugin Inspector Tab',
        type: 'button',
        description: 'A full Plugin Repair Platform with 3 internal sub-tabs: Inspect & Fix (binary deep-scan with real auto-fix), Patch Creator (compatibility patches), and Previsbines & PRP (precombine/previs repair)',
        whenToUse: 'Use when diagnosing plugin errors, generating a compatibility patch, or repairing broken precombine/previs data',
      },
      {
        name: 'Pre-Publish Tab',
        type: 'button',
        description: 'A real 22-item release checklist with critical-vs-total progress tracking, saved across sessions',
        whenToUse: 'Use right before uploading a mod, to make sure you haven\'t missed a standard release step',
      },
      {
        name: 'INI Validator Tab',
        type: 'button',
        description: 'Paste your Fallout4.ini or Fallout4Custom.ini content to check real settings against known-good values',
        whenToUse: 'Use when troubleshooting performance or stability settings, or verifying an INI tweak actually took effect',
      },
      {
        name: 'Quest Editor Tab',
        type: 'button',
        description: 'Quest stage and alias authoring helpers for CK quest workflows',
        whenToUse: 'Use when designing or debugging quest logic, alias fill conditions, or dialogue staging',
      },
      {
        name: 'Animation Tab',
        type: 'button',
        description: 'Havok/HKX workflow guidance covering: behavior graph editing, rig export pipelines, Shiagur Blender rig suite (human #82537 + PA #81279), MaikCG F4Biped #16691, IAF keyword-dispatch patching, NAF ESP-less animation packs, and AWF world-object interaction animations',
        whenToUse: 'Use when working on custom animations, HKX export pipelines, Havok behavior graphs, or integrating animation frameworks (IAF/NAF/AWF) into your mod',
      },
      {
        name: 'Save Parser Tab',
        type: 'button',
        description: 'Inspect save game data, identify orphaned script instances, and check for save bloat',
        whenToUse: 'Use when diagnosing save corruption, bloat, or orphaned Papyrus script residue',
      },
      {
        name: 'Live Monitor Tab',
        type: 'button',
        description: 'Runtime event monitoring for in-game script and system events via the CK bridge',
        whenToUse: 'Use while running Fallout 4 to observe live script events',
      },
      {
        name: 'Game Link Tab',
        type: 'button',
        description: 'F4SE bridge status and game integration connection state',
        whenToUse: 'Use to verify the F4SE IPC bridge is active before requesting in-game operations',
      },
    ],
    commonMistakes: [
      'Editing CK data without running plugin validation in the CK Safety tab first',
      'Relying on the auto-save timer in CK Extension to protect CK work — it logs timestamps only; use File > Save in CK manually',
      'Using CKPE 0.3.x on NG/AE (1.10.982+) — install CKPE 0.5+ for NG/AE; 0.3.x is OG (1.10.163) only',
      'Distributing a mod built with the NG CK to OG users without warning about BA2 V7/V8 incompatibility',
      'Installing AWKCR, Armorsmith Extended, or DEF_UI/DEF_HUD in any NG/AE mod — these are deprecated; see FO4 CK Guide tab',
      'Installing standalone Buffout 4 NG alongside Addictol — Addictol already includes it; installing both causes crashes',
      'Treating the FO4 CK Guide tab as optional and missing ESL FormID limits (0x000-0xFFF) or precombine rules',
    ],
    guides: [
      {
        title: 'Pre-flight before any CK editing session',
        steps: [
          'Open FO4 Creation Kit Hub → CK Safety tab',
          'Select your plugin file and run validation — check for deleted refs, missing masters, crash patterns',
          'Open the FO4 CK Guide tab → check NG/AE Compatibility section to confirm you have the right CK + CKPE version',
          'If any deprecated frameworks (AWKCR, DEF_UI, etc.) are present, swap them before editing',
          'Only then open the CK and begin editing',
        ],
      },
      {
        title: 'Active authoring session with CK Extension',
        steps: [
          'Open the CK Extension tab',
          'Note: auto-save only logs timestamps — press Ctrl+S or File > Save in CK frequently',
          'Watch the script compiler log for Papyrus errors as you compile PSC files',
        ],
      },
      {
        title: 'Release-safe workflow checklist',
        steps: [
          'Open FO4 CK Guide tab → review Deprecated Frameworks and NG/AE sections',
          'Validate ESL FormID boundary (0x000-0xFFF limit) — run xEdit Compact FormIDs if needed',
          'Check BA2 header version matches your target runtime (V1 for OG, V2 for NG/AE)',
          'Run Spriggit (CK Safety tab) to serialize your ESP to YAML for Git before releasing',
        ],
      },
    ],
    tutorialSections: [
      'CK Safety (Plugin Validation + Spriggit + Live Monitor)',
      'CK Extension (Auto-save timer & Script Compile — timestamp logging only)',
      'FO4 CK Guide (Crash Causes, Best Practices, NG/AE Compatibility, Deprecated Frameworks)',
      'Plugin Inspector (Inspect & Fix, Patch Creator, Previsbines & PRP)',
      'Pre-Publish (22-Item Release Checklist)',
      'INI Validator (Fallout4.ini / Fallout4Custom.ini Checks)',
      'Quest Editor (Stages & Aliases)',
      'Animation (Havok/HKX Workflow — Shiagur Blender rigs, MaikCG F4Biped, IAF/NAF/AWF framework integration)',
      'Save Parser (Save Game Data Inspection)',
      'Live Monitor (Runtime Events)',
      'Game Link (F4SE Bridge)',
    ],
    suggestedQuestions: [
      'When should I use CK Safety versus CK Extension?',
      'Which CKPE version do I need for NG (1.10.982+) vs OG (1.10.163)?',
      'Why does auto-save in CK Extension not actually save my CK file?',
      'What deprecated frameworks should I avoid on NG/AE mods?',
      'What is the ESL FormID limit and what happens if I exceed 0xFFF?',
      'How do I use Spriggit to serialize my plugin to YAML for Git?',
      'Why are BA2 archives from the NG CK incompatible with OG users?',
      'What does the Pre-Publish checklist actually check?',
      'How does the Plugin Inspector\'s auto-fix work?',
      'Can the INI Validator tell me if my shadow settings are safe for my GPU?',
    ],
  },
  'blueprint': {
    pageId: 'blueprint',
    pageName: 'The Blueprint',
    route: '/tools/blueprint',
    purpose: 'Mod architecture planner — choose a template, inspect folder/file layout, required components and dependencies, then copy or export the structure to your workspace.',
    features: [
      'Predefined mod templates (Quest, Settlement, Companion, Weapons, World Expansion)',
      'Folder & file structure preview with copy-to-clipboard',
      'Required vs optional components list with badges',
      'Master file / dependency overview',
      'Quick-copy individual paths or entire structure',
      'Tools Install / Verify guidance embedded for first-test loops',
    ],
    controls: [
      {
        name: 'Template List',
        type: 'button',
        description: 'Select a mod template to populate the Folder Structure / Components / Dependencies tabs',
        whenToUse: 'When you want a recommended baseline layout for your mod type',
      },
      {
        name: 'Folder Structure Tab',
        type: 'button',
        description: 'Shows folders and files you should create for the selected template',
        whenToUse: 'Inspect and copy the exact paths you need to create',
      },
      {
        name: 'Copy Structure (clipboard)',
        type: 'button',
        description: 'Copies the full folder/file list to clipboard for pasting into a README or terminal',
        whenToUse: 'When bootstrapping a new mod workspace or sharing the structure',
      },
      {
        name: 'Copy Path (per-item)',
        type: 'button',
        description: 'Copies a single folder/file path to clipboard',
        whenToUse: 'When you only need one path (e.g., Data/Scripts/Source/)',
      },
      {
        name: 'Components Tab',
        type: 'button',
        description: 'Lists required and optional plugin records (QUST, FURN, NPC_, etc.)',
        whenToUse: 'To verify which records must exist in your ESP/ESM',
      },
      {
        name: 'Dependencies Tab',
        type: 'button',
        description: 'Shows master files / DLC dependencies your mod relies on',
        whenToUse: 'Before packaging, ensure required masters are declared',
      },
    ],
    commonMistakes: [
      'Treating Blueprint as an auto-generator — it only plans and copies paths',
      'Copying paths but not creating the corresponding plugin records (QUST/WEAP/NPC_)',
      'Ignoring required master files in Dependencies (causes missing masters at load)',
      'Not performing a small test loop after creating folders and scripts',
    ],
    guides: [
      {
        title: 'Use Blueprint to scaffold a new mod',
        steps: [
          'Open The Blueprint and pick a template that matches your mod type',
          'Click Folder Structure and use Copy to clipboard to copy the layout',
          'Create the folders/files in your mod workspace and add minimal placeholder files',
          'Open Components and verify REQUIRED records that must be present in your plugin',
          'Check Dependencies and add any missing masters before packaging',
        ],
      },
      {
        title: 'Share or export a structure quickly',
        steps: [
          'Select template → click Copy Structure',
          'Paste into a README or ticket to share the planned layout',
          'Optionally ask Mossy in Chat to review the plan for missing items',
        ],
      },
      {
        title: 'First test loop for Blueprints',
        steps: [
          'Pick a small template (e.g., Weapon or Timer script) and copy its structure',
          'Create folders, add a trivial script, and compile/test in Creation Kit',
          "Run Diagnostics/Tools Verify if the project doesn't behave as expected",
        ],
      },
    ],
    tutorialSections: [
      'Templates & Structure',
      'Components & Dependencies',
      'Copying & First Test Loop',
    ],
    suggestedQuestions: [
      'Which template fits my idea best?',
      'How do I copy the folder structure to my project?',
      'What does the REQUIRED badge on a component mean?',
      'Why does my plugin fail to load after adding files?',
    ],
  },

  'scribe': {
    pageId: 'scribe',
    pageName: 'The Scribe',
    route: '/tools/scribe',
    purpose: 'Author documentation and scripts — write readmes, manage script templates, validate Papyrus/xEdit/Blender code, and export/install bundles.',
    features: [
      'Multi-tab editor: Papyrus, xEdit and Blender script modes',
      'Code validation & technical inspector for Papyrus signatures',
      'Local script libraries (xEdit/Blender) and reusable templates',
      'Script Bundles: import/export, merge, and install into libraries',
      'Export/Download/Copy workflows and Desktop Bridge install hooks (xEdit/Creation Kit/Blender)',
      'Bundle management (create, save, import, export)',
    ],
    controls: [
      {
        name: 'Editor Tabs (Papyrus / xEdit / Blender)',
        type: 'button',
        description: 'Switch between script editing modes and tool-specific flows',
        whenToUse: 'When authoring code for a particular toolchain',
      },
      {
        name: 'Validate / Inspector',
        type: 'button',
        description: 'Run quick validation to surface errors, warnings and info about code',
        whenToUse: 'Before saving, bundling, or attempting to install/compile',
      },
      {
        name: 'Copy / Download / Export',
        type: 'button',
        description: 'Copy code to clipboard or download as a file for your project',
        whenToUse: 'When you want to move code into a project or share with collaborators',
      },
      {
        name: 'Save to Library',
        type: 'button',
        description: 'Persist the current script as a reusable template for xEdit/Blender',
        whenToUse: 'Build a personal snippet library for repeatable tasks',
      },
      {
        name: 'Script Bundles (Import / Export)',
        type: 'button',
        description: 'Group templates into bundles, export JSON, and import/merge bundles',
        whenToUse: 'When sharing a set of templates or migrating libraries',
      },
      {
        name: 'Install / Run to Tool',
        type: 'button',
        description: 'Install or run scripts in external tools (xEdit, Creation Kit, Blender) when Desktop Bridge is available',
        whenToUse: 'After validation and small local testing',
      },
      {
        name: 'Bundle → Library',
        type: 'button',
        description: 'Install templates from a bundle into the local xEdit/Blender libraries',
        whenToUse: 'When onboarding a collection of templates or example workflows',
      },
    ],
    commonMistakes: [
      'Not validating Papyrus before compiling — missing EndEvent/EndFunction errors can block builds',
      'Assuming "Save" also installs to Creation Kit/xEdit without running the Install action',
      'Importing untrusted bundles without reviewing templates',
      'Not saving library items before resetting or exporting bundles',
    ],
    guides: [
      {
        title: 'Author and validate a Papyrus script',
        steps: [
          'Open The Scribe and select the Papyrus tab',
          'Paste or write your script in the editor',
          'Click Validate/Inspect and fix any Errors or Warnings',
          'Copy or Download the .psc and compile in Creation Kit (first test loop)',
        ],
      },
      {
        title: 'Save template to library & create bundle',
        steps: [
          'Switch to xEdit/Blender tab and author your template',
          'Click Save to Library to persist it locally',
          'Create a new Bundle and Add the saved template',
          'Export the Bundle (JSON) to share or import on another machine',
        ],
      },
      {
        title: 'Install a bundle into local libraries',
        steps: [
          'Open Bundles list and select the Bundle to install',
          'Use "Install to Libraries" to merge templates into xEdit/Blender libraries',
          'Open the library and load a template into the editor to run a quick test',
        ],
      },
    ],
    tutorialSections: [
      'Authoring & Validation (Papyrus/xEdit/Blender)',
      'Libraries & Bundles',
      'Export / Install to Tools',
    ],
    suggestedQuestions: [
      'How do I validate a Papyrus script before compiling?',
      'How do I export/import script bundles?',
      'How do I install a template into xEdit or Blender from a bundle?',
      'What does the Technical Inspector check for?',
    ],
  },

  'vault': {
    pageId: 'memory-vault',
    pageName: 'FO4 Memory Vault',
    visualGuidePage: 7,
    route: '/memory-vault',
    purpose: 'Long-term FO4 knowledge memory hub for ingesting notes/files, searching trusted memory, and sharing curated community packs.',
    features: [
      'Ingest knowledge from pasted text, dropped files, PDFs, PSD/ABR assets, and media transcripts',
      'Search and trust filtering (All, Personal, Community, Official) across learned memory items',
      'Community knowledge workflow: browse packs, import packs, and export shared-only knowledge',
      'Full backup export and per-memory sharing controls with attribution metadata',
      'Vault status metrics and ingestion progress for local RAG memory growth',
    ],
    controls: [
      {
        name: 'Ingest Knowledge',
        type: 'button',
        description: 'Open the ingestion modal to add new notes/files and metadata for memory digestion',
        whenToUse: 'Use when you want Mossy to learn project-specific FO4 knowledge',
      },
      {
        name: 'Search + Trust Filter',
        type: 'input',
        description: 'Search learned memory and filter by trust level (all/personal/community/official)',
        whenToUse: 'Use when narrowing memory to reliable sources during troubleshooting',
      },
      {
        name: 'Browse Library',
        type: 'button',
        description: 'Open curated community knowledge packs and import selected packs',
        whenToUse: 'Use when expanding your vault from shared FO4 tutorials and workflows',
      },
      {
        name: 'Export Shared / Export All',
        type: 'button',
        description: 'Export community-safe knowledge only or full backup JSON of all vault memories',
        whenToUse: 'Use shared export for publishing; use full export for local backup/migration',
      },
      {
        name: 'Per-memory Share Toggle',
        type: 'toggle',
        description: 'Marks a memory as community-shareable while keeping other notes private/local',
        whenToUse: 'Use before Export Shared to control exactly what leaves your private vault',
      },
    ],
    commonMistakes: [
      'Adding memory without source/credit details and losing attribution context later',
      'Assuming all memories are public by default — only shared-marked entries export in shared mode',
      'Skipping trust filters and mixing personal + community guidance unintentionally',
      'Not backing up with Export All before large cleanup or migration changes',
    ],
    guides: [
      {
        title: 'Ingest and validate new FO4 knowledge',
        steps: [
          'Open FO4 Memory Vault (`/memory-vault`) and click Ingest Knowledge',
          'Paste notes or drop a file, then fill in source + credit metadata',
          'Click Start Digestion and wait for status to return as learned',
          'Search for a unique term from your content to confirm retrieval works',
        ],
      },
      {
        title: 'Share safely with the community',
        steps: [
          'Mark specific memories as shared using the per-memory share toggle',
          'Click Export Shared to create a community-safe JSON',
          'Publish the JSON where collaborators can download it',
          'Use Import Community to ingest trusted packs from other modders',
        ],
      },
      {
        title: 'Protect your private vault data',
        steps: [
          'Run Export All periodically to keep a full backup',
          'Use Search + Trust filter to review older entries before deleting',
          'Keep personal/private notes unshared unless explicitly intended for export',
        ],
      },
    ],
    tutorialSections: [
      'FO4 Memory Vault - Ingestion & Retrieval',
      'Trust Filtering & Community Sharing',
      'Backup / Export Workflow',
    ],
    suggestedQuestions: [
      'How do I ingest notes so AI Chat can reuse them later?',
      'What is the difference between Export Shared and Export All?',
      'How do trust filters affect search results in memory?',
      'How do I safely import community knowledge packs?',
    ],
  },

  'duplicate-finder': {
    pageId: 'duplicate-finder',
    pageName: 'Duplicate Finder',
    route: '/tools/dedupe',
    purpose: 'Scan selected folders for byte-identical duplicate files (textures, meshes, archives) and safely move duplicates to the Recycle Bin or export selection lists.',
    features: [
      'SHA-256 hash-based duplicate detection (byte-identical)',
      'Configurable extension filters and minimum file size',
      'Group previews with estimated disk‑savings',
      'Select-by-rule (keep-first) and batch Recycle‑Bin removal (reversible)',
      'Cancelable scans with progress reporting (Desktop Bridge required)',
      'Background scan persistence — scan continues even if you navigate to other panels, and resumes automatically on return',
      'Install Recovery panel — shows any tool installs that were skipped mid-scan so they can be completed later',
    ],
    controls: [
      {
        name: 'Pick folder(s)',
        type: 'button',
        description: 'Choose one or more folders to include in the scan (Desktop only)',
        whenToUse: 'Before running a scan — narrow scope to mod folders',
      },
      {
        name: 'Scan',
        type: 'button',
        description: 'Start a dedupe scan — computes file hashes and groups identical files',
        whenToUse: 'After picking folders and configuring extensions/min-size',
      },
      {
        name: 'Cancel',
        type: 'button',
        description: 'Interrupt an in-progress scan',
        whenToUse: 'If the scan is taking too long or you picked the wrong folders',
      },
      {
        name: 'Extensions toggles',
        type: 'toggle',
        description: 'Enable/disable file extensions to include in the scan (DDS, NIF, PNG, etc.)',
        whenToUse: 'Filter results to asset types you care about',
      },
      {
        name: 'Min size (bytes)',
        type: 'input',
        description: 'Ignore files smaller than this threshold to reduce noise',
        whenToUse: 'Skip tiny thumbnails or generated files',
      },
      {
        name: 'Select duplicates (keep first)',
        type: 'button',
        description: 'Auto-select duplicate files while keeping the first file in each group',
        whenToUse: 'Quickly mark files for removal after review',
      },
      {
        name: 'Move to Recycle Bin',
        type: 'button',
        description: 'Move selected duplicates to the OS Recycle Bin (recoverable)',
        whenToUse: 'After confirming selected files in the group list',
      },
      {
        name: 'Reveal in folder',
        type: 'button',
        description: 'Open file location in Explorer to inspect content before removing',
        whenToUse: 'When you need to preview files on disk',
      },
    ],
    commonMistakes: [
      'Running a scan on the entire drive — restrict scope to mod folders',
      'Assuming Recycle Bin = permanent delete (use it to recover)',
      'Not configuring extensions/min-size, producing noisy groups',
      'Removing files without inspecting groups (same name ≠ same bytes)',
      'Navigating away and thinking the scan stopped — it continues in the background and resumes state when you return',
    ],
    guides: [
      {
        title: 'Find and safely remove duplicate textures',
        steps: [
          'Click "Pick folder(s)" and choose your mod assets folder',
          'Confirm extensions and set a sensible "Min size" (e.g. 1024 bytes)',
          'Click "Scan" and wait for groups to appear',
          'Use "Select duplicates (keep first)" then click "Move to Recycle Bin"',
          'If needed, restore files from the Recycle Bin',
        ],
      },
      {
        title: 'Triage large libraries',
        steps: [
          'Restrict the scan to specific plugin or Data subfolders',
          'Exclude rarely used extensions to speed hashing',
          'Use progress messages to estimate remaining time and cancel if necessary',
          'Switch to other panels freely — the scan runs in the background and state is auto-saved',
        ],
      },
      {
        title: 'Recover skipped tool installs',
        steps: [
          'After a scan completes, scroll down to the Install Recovery panel',
          'Any tool installs that were pending when you navigated away are listed there',
          'Click the install button next to each item to complete the installation',
        ],
      },
    ],
    tutorialSections: [
      'Duplicate Finder - File Management',
      'Cleaning Mod Folders',
      'Background Scan & Install Recovery',
    ],
    suggestedQuestions: [
      'What does "Select duplicates (keep first)" do?',
      'Can I recover files after Move to Recycle Bin?',
      'How long will a full game asset scan take?',
      'Why two files with the same name may not be duplicates?',
      'Will switching panels stop my scan?',
      'What is the Install Recovery panel?',
    ],
  },

  'cosmos-workflow': {
    pageId: 'cosmos-workflow',
    pageName: 'FO4 Automation Studio',
    visualGuidePage: 13,
    route: '/tools/cosmos',
    purpose: 'FO4 Automation Studio for Cosmos integrations: verify local repo detection, register knowledge roots, open integration docs, and validate searchable workflow coverage in Knowledge Search.',
    features: [
      'Detects local Cosmos repos (Transfer, Predict, Cookbook, RL, etc.)',
      'Add repo folders to Knowledge Search roots (persisted in localStorage)',
      'Open integration documentation for each Cosmos repo',
      'Status indicators for repo presence and root registration',
      'Guidance to build/search the Knowledge index after adding roots',
    ],
    controls: [
      {
        name: 'Repo Status (detected / not detected)',
        type: 'indicator',
        description: 'Shows whether the expected repo path exists on disk',
        whenToUse: 'Verify the repo is cloned into the expected `external/nvidia-cosmos/*` path',
      },
      {
        name: 'Knowledge Roots status',
        type: 'indicator',
        description: 'Shows whether the repo is already added to Knowledge Search (stored under the Vault key)',
        whenToUse: 'After adding a root, confirm the checkmark appears',
      },
      {
        name: 'Add to Knowledge Search',
        type: 'button',
        description: 'Register the local repo folder as a Knowledge Search root (adds to localStorage)',
        whenToUse: 'When you want Mossy to index and search that repo',
      },
      {
        name: 'Open Integration Doc',
        type: 'button',
        description: 'Open the local integration documentation for the selected Cosmos repo',
        whenToUse: 'Read setup instructions, usage examples, or API notes',
      },
      {
        name: 'Build / Query Knowledge Search',
        type: 'task',
        description: 'After adding roots, run a Knowledge Search index build and query the repo names or provided search hints',
        whenToUse: 'Verify the repo content is indexed and discoverable',
      },
    ],
    commonMistakes: [
      'Assuming Add → Index is automatic (you still need to build the Knowledge Search index)',
      'Repo not cloned into expected path (check `external/nvidia-cosmos/*`)',
      'Adding duplicate roots or forgetting to remove stale paths from localStorage',
      'Expecting model runtime from this page — this only wires docs into Knowledge Search',
    ],
    guides: [
      {
        title: 'Add Cosmos Transfer2.5 to Knowledge Search',
        steps: [
          'Confirm the transfer repo is present under `external/nvidia-cosmos/cosmos-transfer2.5` (Repo Status)',
          'Click "Add to Knowledge Search" for Cosmos Transfer2.5',
          'Open Knowledge Search and run the index build',
          'Search for: "Cosmos-Transfer2.5-2B" or use the repo search hint',
        ],
      },
      {
        title: 'Open integration docs and confirm paths',
        steps: [
          'Click "Open Integration Doc" to view the local MD reference',
          'Verify examples and default paths match your local checkout',
          'Save any custom workflow notes to The Vault for future reference',
        ],
      },
    ],
    tutorialSections: [
      'FO4 Automation Studio - Knowledge Integration',
      'Indexing & Local Docs',
    ],
    suggestedQuestions: [
      'How do I add Cosmos Transfer2.5 to Knowledge Search?',
      'What if the repo status shows "not detected"?',
      'How do I build the Knowledge Search index after adding roots?',
      'Does this page enable running Cosmos models locally? (No — it only indexes docs)',
    ],
  },

  'mod-builder': {
    pageId: 'mod-builder',
    pageName: 'FO4 Mod Builder Hub',
    visualGuidePage: 14,
    route: '/mod-builder',
    purpose: 'FO4 Mod Builder Hub unifies the authoring workflow for scaffolding a new mod project, planning a mod, working with project files, generating scripts, and producing documentation inside one five-tab workspace.',
    features: [
      'Five-tab workflow: Blueprint, Workshop, Devtools, Scribe, and Project Creator',
      'Session tab persistence via `builder_hub_tab` so the last active tab restores automatically',
      'Keyboard shortcuts 1-5 switch tabs directly when the hub has focus',
      'Tabs can be drag-reordered into any arrangement; the custom order persists in `builder_hub_tab_order`',
      'Lazy-loaded panels keep heavyweight builder tools responsive inside the unified hub',
      'Project Creator scaffolds a brand-new mod project folder structure so you have somewhere real to build into before touching Blueprint, Workshop, or Devtools',
      'Combines project scaffolding, planning, file/compile workflows, script tooling, and documentation authoring in one route',
    ],
    controls: [
      {
        name: 'Blueprint tab',
        type: 'tab',
        description: 'Opens the planning workspace for mod architecture and project structure',
        whenToUse: 'Start here when you want to map features, content scope, or implementation order before building assets/scripts',
      },
      {
        name: 'Workshop tab',
        type: 'tab',
        description: 'Loads the file-browser and compile-oriented workspace',
        whenToUse: 'Use when you need to inspect project files, perform hands-on editing tasks, or run build/compile flows',
      },
      {
        name: 'Devtools tab',
        type: 'tab',
        description: 'Opens the Papyrus/script tooling workspace (Papyrus, xEdit, snippets)',
        whenToUse: 'Switch here for script generation, analysis, or iteration on developer-focused tooling',
      },
      {
        name: 'Scribe tab',
        type: 'tab',
        description: 'Loads the documentation authoring workspace',
        whenToUse: 'Use after planning/building to write guides, notes, changelogs, or release-facing documentation',
      },
      {
        name: 'Project Creator tab',
        type: 'tab',
        description: 'Scaffolds a new mod project\'s folder structure (a "new mod scaffold") so subsequent Blueprint/Workshop/Devtools/Scribe work has a real project to operate on',
        whenToUse: 'Use first, before starting any other tab, when beginning a brand-new mod from scratch',
      },
    ],
    commonMistakes: [
      'Treating the hub as a single page instead of switching to the tab that matches your current task',
      'Jumping into Blueprint/Workshop before scaffolding the project in Project Creator',
      'Skipping Blueprint and jumping straight into implementation without defining structure first',
      'Forgetting that the active tab is persisted in session storage under `builder_hub_tab`',
      'Not realizing tabs can be drag-reordered — expecting the default 1-5 order after customizing it',
      'Packaging directly from builder steps without reviewing Packaging & Release afterward',
    ],
    guides: [
      {
        title: 'Plan to implementation workflow',
        steps: [
          'Open Project Creator and scaffold the new mod\'s folder structure',
          'Open Blueprint and outline the mod architecture or feature breakdown',
          'Switch to Workshop to inspect project files and carry out build-focused tasks',
          'Move to Devtools for Papyrus/script generation or analysis as needed',
          'Finish in Scribe to document the workflow, setup, or release notes',
        ],
      },
      {
        title: 'Resume a previous builder session',
        steps: [
          'Return to `/mod-builder` and confirm the expected tab restores from `builder_hub_tab`',
          'If the wrong tab opens, switch to the correct workspace manually (or use shortcut keys 1-5)',
          'Continue the workflow from the appropriate stage rather than duplicating work in the wrong tab',
        ],
      },
    ],
    tutorialSections: [
      'FO4 Mod Builder Hub - Five Tab Workflow',
      'Project Creator, Blueprint, Workshop, Devtools & Scribe',
      'Tab Shortcuts & Drag-to-Reorder',
    ],
    suggestedQuestions: [
      'Which Mod Builder tab should I use first for a new Fallout 4 mod?',
      'What is the difference between Blueprint, Workshop, Devtools, Scribe, and Project Creator?',
      'What does Project Creator actually scaffold for me?',
      'Why did Mod Builder reopen on the same tab as last time?',
      'How do I reorder the Mod Builder tabs, and does it stick?',
      'What are the keyboard shortcuts for switching Mod Builder tabs?',
      'When should I move from Mod Builder to Packaging & Release?',
    ],
  },

  'asset-analysis': {
    pageId: 'asset-analysis',
    pageName: 'FO4 Asset Analysis Hub',
    visualGuidePage: 15,
    route: '/asset-analysis',
    purpose: 'FO4 Asset Analysis Hub centralizes quality workflows for Fallout 4 assets: mining dependency data, conflict/performance analysis, ML-driven prediction, crash-log triage, duplicate reduction, and in-app optimization guidance.',
    features: [
      'Seven-tab workflow: Mining Dashboard, Advanced Analysis, Phase 2 Mining, Asset Deduplicator, Crash Analyzer, FO4 Asset Guide, and 3D Viewer',
      'Phase 2 Mining runs and polls five real background mining engines over IPC (Contextual, ML Conflict Prediction, Performance Bottleneck, Hardware-Aware, Longitudinal) with per-engine start/stop and start-all/stop-all controls',
      'Crash Analyzer parses real Buffout 4 / Buffout 4 NG / CLASSIC-style crash logs, extracting FormIDs, offending plugins, module names, and callstack frames, then matches them against known crash-signature patterns with severity and a suggested fix',
      'Session tab persistence via `asset_hub_tab` so the last active tab restores automatically',
      'Lazy-loaded analysis panels for heavy workflows while keeping the hub responsive',
      'Unified QA flow from scan/mining insights to ML conflict prediction, crash-log root-causing, dedupe cleanup, optimization reference, and NIF preview',
    ],
    controls: [
      {
        name: 'Mining Dashboard tab',
        type: 'tab',
        description: 'Opens the dependency/mining workspace for plugin and asset visibility',
        whenToUse: 'Start here to map relationships, coverage, or data patterns before deeper analysis',
      },
      {
        name: 'Advanced Analysis tab',
        type: 'tab',
        description: 'Loads deeper conflict, performance, and memory-oriented analysis views',
        whenToUse: 'Use when diagnosing stability/performance issues or validating high-risk asset sets',
      },
      {
        name: 'Phase 2 Mining tab',
        type: 'tab',
        description: 'Dashboard for five real background mining engines (Contextual, ML Conflict Prediction, Performance Bottleneck, Hardware-Aware, Longitudinal) with per-engine start/stop toggles and a start-all/stop-all control, auto-refreshing every 15 seconds',
        whenToUse: 'Use for longer-running, deeper background analysis of your load order beyond the on-demand Advanced Analysis pass',
      },
      {
        name: 'Asset Deduplicator tab',
        type: 'tab',
        description: 'Opens duplicate detection and consolidation workflow',
        whenToUse: 'Switch here when reducing repeated assets and trimming VRAM/storage waste',
      },
      {
        name: 'Crash Analyzer tab',
        type: 'tab',
        description: 'Paste or load a Buffout 4 / Buffout 4 NG / CLASSIC crash log to extract the exception, callstack, involved plugins and FormIDs, and get probable-cause matches with severity and fix suggestions',
        whenToUse: 'Use right after a crash to identify which plugin or FormID most likely caused it before digging through the raw log by hand',
      },
      {
        name: 'FO4 Asset Guide tab',
        type: 'tab',
        description: 'Built-in Fallout 4 reference covering budgets, conflicts, and optimization practices',
        whenToUse: 'Use as the authoritative in-app reference while triaging and fixing asset issues',
      },
      {
        name: '3D Viewer tab',
        type: 'tab',
        description: 'Load and preview NIF meshes with collision, wireframe, and bounds overlays; shows vertex/triangle counts and material slots',
        whenToUse: 'Use to quickly inspect a mesh before or after optimization — verify poly counts, collision presence, and LOD availability without leaving Mossy',
      },
    ],
    commonMistakes: [
      'Only running one tab workflow and missing issues visible in the other analysis tabs',
      'Skipping deduplication after analysis, leaving avoidable VRAM and archive bloat',
      'Forgetting that active tab state persists in session storage under `asset_hub_tab`',
      'Treating guide recommendations as optional when troubleshooting severe performance conflicts',
      'Leaving Phase 2 Mining engines running indefinitely instead of stopping them when not actively investigating',
      'Pasting a partial or truncated crash log into Crash Analyzer, which weakens FormID/plugin extraction accuracy',
    ],
    guides: [
      {
        title: 'End-to-end asset QA pass',
        steps: [
          'Open Mining Dashboard to map plugin/assets and identify suspicious hotspots',
          'Switch to Advanced Analysis to inspect conflicts, memory pressure, and performance warnings',
          'Start relevant Phase 2 Mining engines for deeper background ML conflict/performance/hardware analysis',
          'Use Asset Deduplicator to consolidate repeated files and reduce runtime overhead',
          'Review FO4 Asset Guide thresholds before final packaging and release checks',
          'Open the 3D Viewer to spot-check optimized NIF meshes — confirm poly counts and collision are within budget',
        ],
      },
      {
        title: 'Diagnose a crash with Crash Analyzer',
        steps: [
          'Copy the full Buffout 4 / Buffout 4 NG / CLASSIC crash log text from your Documents\\My Games\\Fallout4\\F4SE folder',
          'Open the Crash Analyzer tab and load or paste the full log',
          'Review the extracted exception, callstack, and matched probable causes with their severity and fix suggestions',
          'Cross-check any flagged FormIDs/plugins against your load order before uninstalling or patching',
        ],
      },
      {
        title: 'Resume a prior analysis session',
        steps: [
          'Return to `/asset-analysis` and confirm the expected tab restores from `asset_hub_tab`',
          'If the wrong tab appears, switch to the relevant stage manually',
          'Continue from the remaining QA stage instead of rerunning completed steps',
        ],
      },
    ],
    tutorialSections: [
      'FO4 Asset Analysis Hub - Quality Workflow',
      'Mining, Advanced Analysis, Phase 2 Mining & Crash Analyzer',
      'Deduplication, FO4 Guide & 3D Viewer',
    ],
    suggestedQuestions: [
      'Which tab should I start with in FO4 Asset Analysis Hub?',
      'When do I use Mining Dashboard versus Advanced Analysis?',
      'What do the five Phase 2 Mining engines each analyze?',
      'How does Asset Deduplicator help with VRAM and archive size?',
      'Why does FO4 Asset Analysis Hub reopen on the previous tab?',
      'How do I preview a NIF mesh in the 3D Viewer?',
      'What does the 3D Viewer show about my mesh?',
      'How does Crash Analyzer identify which plugin caused my crash?',
    ],
  },

  'workflow-runner': {
    pageId: 'workflow-runner',
    pageName: 'FO4 Automation Runner',
    visualGuidePage: 17,
    route: '/workflow-runner',
    purpose: 'Author, save, run and inspect repeatable automation workflows (commands, program launches, URLs, file reveals). Workflows persist to app settings and are intended for desktop automation runs.',
    features: [
      'Author ordered workflows made of typed steps (Run Tool / Open Program / Open External / Reveal In Folder)',
      'Run workflows with live step-by-step logs and success/fail reporting',
      'Saved run history (latest 50) with copy/export of logs',
      'Import / export workflow definitions (JSON) and download run logs',
      'Persisted workflows in settings and automatic starter workflow creation',
      'Desktop-only execution (Electron) while editor and import/export work in Web Mode',
    ],
    controls: [
      {
        name: 'Workflows list',
        type: 'list',
        description: 'Select a workflow to edit or run; list shows step count and last-updated date',
        whenToUse: 'Choose which workflow to run or edit',
      },
      {
        name: 'New / Save / Delete Workflow',
        type: 'button',
        description: 'Create a starter workflow, persist edits, or remove a workflow',
        whenToUse: 'When authoring or cleaning up workflows',
      },
      {
        name: 'Add Step / Step Editor',
        type: 'panel',
        description: 'Add steps and configure step type and parameters (cmd, args, cwd or target)',
        whenToUse: 'When composing automation sequences',
      },
      {
        name: 'Move / Delete Step',
        type: 'controls',
        description: 'Reorder steps or remove them from the workflow',
        whenToUse: 'After adjusting execution order or removing obsolete steps',
      },
      {
        name: 'Run Workflow',
        type: 'button',
        description: 'Execute the selected workflow (requires Desktop Bridge / Electron API)',
        whenToUse: 'When your workflow is ready and you want to run it locally',
      },
      {
        name: 'Run History & Logs',
        type: 'panel',
        description: 'Inspect saved runs, copy/export logs, and clear history',
        whenToUse: 'After running a workflow to debug or archive output',
      },
      {
        name: 'Import / Export Workflows',
        type: 'button',
        description: 'Load or save workflow definitions as JSON (merge on import)',
        whenToUse: 'Share workflows or restore from backup',
      },
      {
        name: 'Export / Download Run Log',
        type: 'button',
        description: 'Save the textual run log for sharing or diagnostics',
        whenToUse: 'When you need to attach logs to an issue or teammate',
      },
    ],
    commonMistakes: [
      'Expecting web-only mode to run steps (desktop app required for execution)',
      'Leaving cmd/target fields empty for step types (causes run-time errors)',
      'Not saving workflows after editing before running',
      'Running untested destructive commands in production workflows',
    ],
    guides: [
      {
        title: 'Create and run a simple workflow',
        steps: [
          'Click "New Workflow" and give it a name',
          'Add a step (choose Run Tool) and fill `cmd` and `args` or choose another step type and set `target`',
          'Save the workflow, then click "Run Workflow" (desktop required to execute)',
          'Open Run History to inspect logs; copy or export the run log if needed',
        ],
      },
      {
        title: 'Share workflows with a teammate',
        steps: [
          'Click "Export Workflows" to save a JSON snapshot',
          'Send the file to a teammate who can use "Import Workflows"',
          'Confirm imported workflows and run a test to validate behavior',
        ],
      },
    ],
    tutorialSections: [
      'FO4 Automation Runner - Execution Engine',
      'Authoring & Troubleshooting Workflows',
    ],
    suggestedQuestions: [
      'What step types are supported and what parameters do they need?',
      'How do I inspect or export run logs after a failure?',
      'Can I import workflows exported from another machine?',
      'Why does Run Workflow say "Desktop app required" in Web Mode?',
    ],
  },

  'runtime-hub': {
    pageId: 'runtime-hub',
    pageName: 'FO4 Runtime Hub',
    visualGuidePage: 18,
    route: '/runtime-hub',
    purpose: 'Three-tab runtime operations hub for live voice sessions, desktop bridge connectivity, and in-app testing workflows.',
    features: [
      'Three-tab consolidated layout: Live Synapse, Desktop Bridge, and Holodeck',
      'Session-persistent tab selection via sessionStorage key `runtime_hub_tab`',
      'Live Synapse voice interaction and runtime assistant workflows',
      'Desktop Bridge connectivity checks for desktop-only tools and system integrations',
      'Holodeck scenario testing from the same runtime workspace',
      'Single hub for switching between live assist, bridge diagnostics, and runtime QA',
    ],
    controls: [
      {
        name: 'Runtime tab strip',
        type: 'tabs',
        description: 'Switch between Live Synapse, Desktop Bridge, and Holodeck without leaving the hub',
        whenToUse: 'Move between runtime voice, bridge, and testing workflows',
      },
      {
        name: 'Live Synapse tab',
        type: 'panel',
        description: 'Opens the live voice workflow with mic-driven interaction and assistant responses',
        whenToUse: 'When you want spoken interaction or hands-free guidance',
      },
      {
        name: 'Desktop Bridge tab',
        type: 'panel',
        description: 'Shows bridge connectivity, local integration status, and desktop-only tooling',
        whenToUse: 'Before using local scans, file actions, or external program automations',
      },
      {
        name: 'Holodeck tab',
        type: 'panel',
        description: 'Loads runtime testing and scenario validation tools',
        whenToUse: 'When validating mod behavior before in-game testing',
      },
    ],
    commonMistakes: [
      'Treating Runtime Hub as a single tool instead of a 3-tab operations hub',
      'Forgetting that desktop-only actions still depend on Desktop Bridge being online',
      'Expecting the hub to keep a tab across brand-new sessions rather than the current session only',
    ],
    guides: [
      {
        title: 'Choose the right runtime tab',
        steps: [
          'Open FO4 Runtime Hub',
          'Use Live Synapse for voice-driven interaction and spoken guidance',
          'Switch to Desktop Bridge to verify local connectivity and integrations',
          'Open Holodeck when you need runtime scenario testing and validation',
        ],
      },
      {
        title: 'Recover from a failed desktop action',
        steps: [
          'Open the Desktop Bridge tab inside FO4 Runtime Hub',
          'Confirm the bridge is online before retrying the action',
          'Review bridge/tool status, then retry the workflow from chat or the destination hub',
        ],
      },
    ],
    tutorialSections: [
      'FO4 Runtime Hub - Unified Runtime Operations',
      'Live Synapse, Bridge, and Holodeck Routing',
    ],
    suggestedQuestions: [
      'When should I use Live Synapse versus Desktop Bridge?',
      'Why did a desktop action fail even though I am inside Runtime Hub?',
      'Does Runtime Hub remember my last open tab?',
      'How do I switch from voice workflows to Holodeck testing quickly?',
    ],
  },

  'desktop-bridge': {
    pageId: 'desktop-bridge',
    pageName: 'Desktop Bridge',
    route: '/test/bridge',
    purpose: 'Local system bridge that connects Mossy (renderer) to OS tools, editors, and runtime services — exposes hardware info, file/clipboard access, and special integrations (Blender, CK, xEdit).',
    features: [
      'Bridge heartbeat & connection status (online/offline)',
      'System & hardware scanning (GPU/CPU)',
      'Blender / Creation Kit tool integrations and scene export/scan',
      'Clipboard preview, file browser and directory scanning',
      'Persistent settings, Papyrus template library & tool path checks',
      'Detailed bridge logs and troubleshooting helpers',
    ],
    controls: [
      {
        name: 'Bridge Status & Heartbeat',
        type: 'indicator',
        description: 'Shows whether the Desktop Bridge is active and its reported version',
        whenToUse: 'Check before running desktop-only commands or integrations',
      },
      {
        name: 'System / Hardware Scan',
        type: 'button',
        description: 'Trigger a hardware/system scan to capture GPU, CPU, and driver info',
        whenToUse: 'When verifying environment compatibility or debugging performance issues',
      },
      {
        name: 'Scan Scene (Blender)',
        type: 'button',
        description: 'Ask Blender (via bridge) to scan the active scene or export assets',
        whenToUse: 'Prepare assets for export or check Blender bridge connectivity',
      },
      {
        name: 'Clipboard & Screenshot Panel',
        type: 'panel',
        description: 'Preview clipboard text or view screenshots captured through the bridge',
        whenToUse: 'When inspecting copied data or diagnosing integrations',
      },
      {
        name: 'File Browser / Directory Scan',
        type: 'input/button',
        description: 'Browse local folders and run directory scans (returns file listings & logs)',
        whenToUse: 'When validating project folder contents or locating tools',
      },
      {
        name: 'CK / Papyrus Settings & Template Library',
        type: 'form',
        description: 'Configure Creation Kit paths, Papyrus compiler settings and save template scripts',
        whenToUse: 'Set up Papyrus build/compile toolchain and reuse script templates',
      },
      {
        name: 'Custom Tool Links',
        type: 'form',
        description: 'Add helpful external tool links or local documentation entries',
        whenToUse: 'Provide quick access to repo tools or docs from the Bridge page',
      },
      {
        name: 'Bridge Logs & Console',
        type: 'panel',
        description: 'Inspect logged bridge events for debug and audit trails',
        whenToUse: 'When troubleshooting connection or tool failures',
      },
      {
        name: 'Save Settings / Export',
        type: 'button',
        description: 'Persist any path/tool changes to app settings',
        whenToUse: 'After configuring tool paths, papyrus settings, or custom links',
      },
    ],
    commonMistakes: [
      'Assuming web mode can run bridge-only actions (desktop app required)',
      'Leaving default bridge base URL incorrect (set to local host by default)',
      'Ignoring driver/permission warnings before running integrations',
      'Expecting Scan Scene to export assets — it inspects/exports only when bridge + Blender are active',
    ],
    guides: [
      {
        title: 'Enable the Desktop Bridge and verify tools',
        steps: [
          'Open Desktop Bridge and confirm the top-level status shows "Bridge Active"',
          'Run a System / Hardware Scan and confirm hardware info is reported',
          'Inspect Drivers panel — ensure required drivers show `active` and required permissions are present',
          'Use "Scan Scene" (Blender) or "Scan Directory" to validate integrations',
        ],
      },
      {
        title: 'Configure Creation Kit / Papyrus paths',
        steps: [
          'Open the CK / Papyrus section on the Bridge page',
          'Set the Creation Kit and Papyrus compiler paths, plus import/source/output folders',
          'Save settings and run a Papyrus validation or compile step from The Scribe to verify',
        ],
      },
      {
        title: 'Troubleshoot a missing tool',
        steps: [
          'Check Drivers status for the tool (e.g., xEdit, Blender)',
          'If not detected, confirm the executable path in External Tools settings',
          'Run Bridge System Scan and review logs for launch/path errors',
        ],
      },
    ],
    tutorialSections: [
      'Desktop Bridge - System Integration',
      'Blender & CK Integration',
      'System Scan & Troubleshooting',
    ],
    suggestedQuestions: [
      'How do I know the Desktop Bridge is connected?',
      'What do the driver status colors mean?',
      'How do I scan my Blender scene or export assets via the bridge?',
      'Why do I get "Bridge offline" when running a desktop-only action?',
    ],
  },

  'ext-tools': {
    pageId: 'ext-tools',
    pageName: 'FO4 External Integrations Hub',
    visualGuidePage: 19,
    route: '/ext-tools',
    purpose: 'Three-tab external integrations hub for connecting Fallout 4 workflows to Mod Organizer 2, ComfyUI, and Upscayl.',
    features: [
      'Three-tab consolidated layout: MO2, ComfyUI, and Upscayl',
      'Session-persistent tab selection via sessionStorage key `ext_hub_tab`',
      'Contextual FO4 tips panel describing the active integration and best-use guidance',
      'Auto-connect coverage for install-downloaded desktop tools via detectPrograms() and running-process checks',
      'MO2 integration for profile awareness, plugin/load-order context, and conflict-first workflow tips',
      'ComfyUI integration guidance for concept art, texture references, and AI-assisted visual iteration',
      'Upscayl guidance for texture upscaling before DDS conversion and final compression',
    ],
    controls: [
      {
        name: 'Integration tab strip',
        type: 'tabs',
        description: 'Switch between MO2, ComfyUI, and Upscayl inside one integrations workspace',
        whenToUse: 'Move between profile management, image generation, and upscaling workflows',
      },
      {
        name: 'FO4 tips panel',
        type: 'panel',
        description: 'Shows the active tool description and Fallout 4-specific tips for using that integration well',
        whenToUse: 'When deciding how to use the current tool in your FO4 asset or mod workflow',
      },
      {
        name: 'Auto-connect desktop tools panel',
        type: 'panel',
        description: 'Shows installed/live-link status for setup-time desktop tools like xEdit, Creation Kit, Blender, LOOT, NifSkope, and BodySlide/Outfit Studio',
        whenToUse: 'When verifying that Mossy can see the desktop tools you installed during setup',
      },
      {
        name: 'MO2 tab',
        type: 'panel',
        description: 'Opens the Mod Organizer 2 integration surface for profile and plugin awareness',
        whenToUse: 'When checking active mod context, profiles, or mod-manager-driven troubleshooting',
      },
      {
        name: 'ComfyUI tab',
        type: 'panel',
        description: 'Loads the ComfyUI integration for AI image and texture-reference workflows',
        whenToUse: 'When generating concept art, references, or source imagery for texture work',
      },
      {
        name: 'Upscayl tab',
        type: 'panel',
        description: 'Loads the Upscayl integration for enhancing low-resolution source images and textures',
        whenToUse: 'When preparing texture sources for later DDS export and compression',
      },
    ],
    commonMistakes: [
      'Treating the hub as generic settings instead of a 3-tab workflow hub',
      'Using ComfyUI or Upscayl outputs directly in-game without routing them through the FO4 texture pipeline afterward',
      'Forgetting that tab persistence is session-based and not a permanent saved preference',
    ],
    guides: [
      {
        title: 'Choose the right external integration',
        steps: [
          'Open FO4 External Integrations Hub',
          'Use MO2 when you need profile, active-mod, or load-order context',
          'Switch to ComfyUI for concept art, texture references, or visual ideation',
          'Use Upscayl when you need to enhance source textures before DDS conversion',
        ],
      },
      {
        title: 'Move from ideation to usable texture output',
        steps: [
          'Generate or refine source imagery in the ComfyUI tab',
          'Upscale the result in the Upscayl tab if the source resolution is too low',
          'Continue into the Textures & Materials hub for DDS conversion and Fallout-ready compression',
        ],
      },
      {
        title: 'Verify setup-time tools are visible to Mossy',
        steps: [
          'Open FO4 External Integrations Hub and review the Auto-connect desktop tools panel',
          'Confirm your installed tools show as detected after setup or downloads complete',
          'Launch a tool like xEdit, Blender, or Creation Kit and refresh to confirm the live link becomes active',
        ],
      },
    ],
    tutorialSections: [
      'FO4 External Integrations Hub - Unified Tool Routing',
      'MO2, ComfyUI, and Upscayl Workflow Selection',
    ],
    suggestedQuestions: [
      'When should I use MO2 versus FO4 Plugin & Load Order Hub?',
      'Should I start in ComfyUI or Upscayl for texture work?',
      'Does FO4 External Integrations Hub remember my last tab?',
      'What should I do after generating or upscaling an image here?',
    ],
  },

  'plugin-tools': {
    pageId: 'plugin-tools',
    pageName: 'FO4 Plugin & Load Order Hub',
    visualGuidePage: 20,
    route: '/plugin-tools',
    purpose: 'Six-tab plugin workflow hub covering xEdit operations, PRP compatibility patching, load-order management, ESP data mining, ESL merge-candidate scanning, and FO4 plugin reference guidance.',
    features: [
      'Six-tab layout: xEdit Tools, PRP Patch Tools, Load Order, ESP Mining, FO4 Plugin Guide, Merge Scanner',
      'Session-persistent tab selection via sessionStorage key `plugin_hub_tab`',
      'xEdit Tools surface for cleaning, conflict inspection, and workflow execution',
      'PRP Patch Tools workflow for precombine/previs-safe patch generation',
      'Load Order tab is itself a 3-step flow: Analyzer (fast conflict/missing-master checks), Lab (MO2 + LOOT import, xEdit script prep), and Optimizer (real MO2/Vortex import-export, drag-and-drop reordering, real FormID-overlap conflict detection, rule-based sorting)',
      'ESP Mining: extracts FormID/cell/quest data directly from real plugin files',
      'Merge Scanner: scans your load order for real ESL/ESP merge candidates, flagging each as ESL-ready, ESP-merge-safe, needs-review, or blocked based on real structural checks (scripts, precombines, shared masters, navmesh)',
      'In-hub FO4 plugin reference covering ESL limits, conflict strategy, and release-safe practices',
    ],
    controls: [
      {
        name: 'Hub tab strip',
        type: 'tabs',
        description: 'Switch between xEdit Tools, PRP Patch Tools, Load Order, ESP Mining, FO4 Plugin Guide, and Merge Scanner in one workspace',
        whenToUse: 'Move between cleaning, patching, ordering, mining, and reference tasks without leaving the hub',
      },
      {
        name: 'xEdit Tools tab',
        type: 'panel',
        description: 'Open xEdit-focused workflows for plugin cleaning and conflict diagnostics',
        whenToUse: 'When validating plugin health, dependencies, and override behavior',
      },
      {
        name: 'PRP Patch Tools tab',
        type: 'panel',
        description: 'Open guided PRP compatibility workflows for precombine/previs patching',
        whenToUse: 'When preparing exterior-edit mods for PRP-safe load-order integration',
      },
      {
        name: 'Load Order tab — Analyzer step',
        type: 'panel',
        description: 'Fast, real conflict and missing-master scan of your current load order',
        whenToUse: 'For a quick first pass before deeper work',
      },
      {
        name: 'Load Order tab — Optimizer step',
        type: 'panel',
        description: 'Import from MO2 or Vortex, drag-and-drop to reorder, run real FormID-overlap conflict detection across your actual plugin files, apply rule-based sorting (ESL-first, priority plugins, custom rules), and export the result back to MO2 or Vortex',
        whenToUse: 'When you need to actually fix and export a stable load order, not just check it',
      },
      {
        name: 'ESP Mining tab',
        type: 'panel',
        description: 'Extracts real FormID, cell, and quest data straight from your plugin files for inspection',
        whenToUse: 'When you need to look inside a plugin\'s actual record data',
      },
      {
        name: 'Merge Scanner tab',
        type: 'panel',
        description: 'Scans your active plugins and categorizes each as a real zMerge candidate (ESL Ready, ESP Merge, Needs Review, or Blocked) based on real structural checks',
        whenToUse: 'When trying to free up plugin/ESL slots by consolidating simple mods',
      },
      {
        name: 'FO4 Plugin Guide tab',
        type: 'panel',
        description: 'Read integrated FO4 plugin rules, ESL limits, and conflict-resolution best practices',
        whenToUse: 'When you need a quick reference before shipping a plugin update',
      },
    ],
    commonMistakes: [
      'Treating xEdit and load-order checks as separate workflows instead of one integrated verification pass',
      'Applying ESL flags before FormID compaction validation',
      'Generating PRP-related patches without confirming final load-order placement',
      'Assuming conflict-free scan output means release-ready without final in-game verification',
      'Merging a plugin flagged "Needs Review" or "Blocked" by the Merge Scanner without actually reviewing why it was flagged',
    ],
    guides: [
      {
        title: 'Run a full plugin validation loop',
        steps: [
          'Open FO4 Plugin & Load Order Hub',
          'Use xEdit Tools to clean and inspect conflicts for your target plugin(s)',
          'Switch to Load Order → Analyzer for a quick conflict/missing-master pass',
          'Use Load Order → Optimizer to import your real profile, reorder, and resolve real FormID conflicts, then export back to MO2/Vortex',
          'If exterior edits are involved, complete PRP Patch Tools workflow',
          'Review FO4 Plugin Guide limits/rules before packaging and release',
        ],
      },
      {
        title: 'Find merge candidates to free up plugin slots',
        steps: [
          'Open the Merge Scanner tab',
          'Let it scan your active plugins',
          'Start with anything flagged "ESL Ready" — those give the biggest slot savings',
          'Review anything flagged "Needs Review" before merging it (scripts or precombines involved)',
          'Never merge anything flagged "Blocked" (ESM, shared master, or navmesh records)',
        ],
      },
    ],
    tutorialSections: [
      'FO4 Plugin & Load Order Hub - Unified Plugin Workflow',
      'xEdit, PRP Patch, and Load Order Validation',
      'ESP Mining and Merge Candidate Scanning',
    ],
    suggestedQuestions: [
      'When should I run xEdit cleaning versus load-order analysis first?',
      'How does FO4 Plugin & Load Order Hub handle PRP-related plugin patching?',
      'What are the key ESL/FormID limits I should validate before release?',
      'Which tab should I use when tracking down a plugin conflict chain?',
      'Why did the Merge Scanner flag my plugin as "Blocked"?',
      'What\'s the difference between the Load Order Analyzer and the Optimizer?',
    ],
  },

  'system-hub': {
    pageId: 'system-hub',
    pageName: 'FO4 System & Diagnostics Hub',
    visualGuidePage: 21,
    route: '/system-hub',
    purpose: 'Eight-tab system hub for runtime diagnostics, local AI/hardware capability checks, local AI engine setup, blacklist/security rule management, asset vault manifest verification, Mossy development support, backup snapshot management, and context-aware file watching.',
    features: [
      'Eight-tab layout: Diagnostics, Capabilities, Local AI Engine, Blacklist Manager, Asset Vault, Support Mossy, Backup Manager, File Watcher',
      'Session-persistent tab selection via sessionStorage key `system_hub_tab`',
      'Diagnostics — full runtime check suite: bridge, storage, mic, secrets, TTS voices, and exportable diagnostic snapshots',
      'Capabilities — local AI runtime detection: Ollama, Cosmos, OpenAI-compat, GGUF import, and LoRA fine-tune launcher',
      'Local AI Engine — KoboldCPP setup and local model management, separate from the Ollama-focused Capabilities tab',
      'Blacklist Manager — safety rule management for flagged mods, programs, and a do-not-touch whitelist',
      'Asset Vault — manifest-driven asset registry with integrity verification, tool path config, and BA2 staging',
      'Support Mossy — development support links, donation options, and community entry points',
      'Backup Manager — snapshot creation (auto/manual/pre-compile/pre-launch), git commit/push integration, workspace path config',
      'File Watcher — context-aware live folder monitoring with smart suggestions for scripts, meshes, textures, and plugins',
    ],
    controls: [
      {
        name: 'Hub tab strip',
        type: 'tabs',
        description: 'Switch between all eight system tabs in one workspace',
        whenToUse: 'Move between system checks, capability scans, local AI engine setup, security rules, vault, support, backups, and file watching without leaving the hub',
      },
      {
        name: 'Diagnostics tab',
        type: 'panel',
        description: 'Run bridge, tool path, secret, microphone, and TTS voice checks; export diagnostic snapshots',
        whenToUse: 'On first launch, after installing tools, or when any integration behaves unexpectedly',
      },
      {
        name: 'Capabilities tab',
        type: 'panel',
        description: 'Scan local hardware and AI runtime availability; import GGUF models; launch LoRA fine-tune',
        whenToUse: 'When evaluating whether local AI workflows or offline voice features can be enabled, or to fine-tune Mossy on your own data',
      },
      {
        name: 'Local AI Engine tab',
        type: 'panel',
        description: 'Set up and manage KoboldCPP for local model inference',
        whenToUse: 'When you want to run local models via KoboldCPP specifically, rather than Ollama',
      },
      {
        name: 'Blacklist Manager tab',
        type: 'panel',
        description: 'Add, review, and remove safety rules for flagged mods, programs, or do-not-touch whitelist entries',
        whenToUse: 'When configuring content filters or investigating why a mod is being excluded',
      },
      {
        name: 'Asset Vault tab',
        type: 'panel',
        description: 'Inspect the asset manifest, run integrity verification, configure tool paths, and stage assets for BA2',
        whenToUse: 'When verifying tracked assets before packaging or after a deduplication pass',
      },
      {
        name: 'Support Mossy tab',
        type: 'panel',
        description: 'Access donation links, premium feature info, and Mossy community resources',
        whenToUse: 'When you want to contribute to the project or connect with the community',
      },
      {
        name: 'Backup Manager tab',
        type: 'panel',
        description: 'Create named snapshots, manage auto-backup interval, commit/push via git integration, and set workspace path',
        whenToUse: 'Before major script compilations or game launches, or to recover work from a previous snapshot',
      },
      {
        name: 'File Watcher tab',
        type: 'panel',
        description: 'Point to your Data folder and start live monitoring; get smart next-step suggestions as files change',
        whenToUse: 'During active mod authoring sessions to get automatic Mossy prompts when scripts, meshes, textures, or plugins are saved',
      },
    ],
    commonMistakes: [
      'Not running Diagnostics after a tool installation or Desktop Bridge reconnect',
      'Assuming Capabilities scan reflects real-time state without re-running it after hardware changes',
      'Adding blacklist rules without understanding pattern-matching scope',
      'Skipping Asset Vault verification before a BA2 packaging or release pass',
      'Forgetting to set a workspace path in Backup Manager before taking snapshots',
      'Not stopping the File Watcher before closing the hub (interval keeps running in background)',
    ],
    guides: [
      {
        title: 'Run a full system health check',
        steps: [
          'Open FO4 System & Diagnostics Hub from the sidebar',
          'On the Diagnostics tab, click Run Diagnostics and review all check results',
          'Switch to Capabilities and scan for local AI/GPU/voice availability',
          'Check Blacklist Manager for any stale or incorrect safety rules',
          'Open Asset Vault and run manifest verification before your next packaging session',
        ],
      },
      {
        title: 'Set up live file monitoring',
        steps: [
          'Open the File Watcher tab',
          'Click the Browse button and select your Fallout 4 Data folder',
          'Click Start Watching — Mossy will begin polling for file changes',
          'Save a script, mesh, or plugin; a smart suggestion will appear on the left panel',
          'Click the suggestion action to jump directly to the relevant Mossy tool',
        ],
      },
    ],
    tutorialSections: [
      'FO4 System & Diagnostics Hub - 8-Tab System Workflow',
      'Diagnostics, Capabilities, Local AI Engine, Blacklist, Vault, Support, Backup, and File Watcher',
    ],
    suggestedQuestions: [
      'How do I run a full diagnostic check and export the report?',
      'Why is my local Ollama / GPU capability not detected?',
      'What is the difference between the Capabilities tab and the Local AI Engine tab?',
      'How do I add or remove blacklist rules for specific mods?',
      'What does Asset Vault manifest verification check for?',
      'How do I create a snapshot before compiling my Papyrus scripts?',
      'How does the File Watcher suggest next steps when I save a .nif file?',
    ],
  },

  'guides-hub': {
    pageId: 'guides-hub',
    pageName: 'FO4 Guides Hub',
    visualGuidePage: 12,
    route: '/guides-hub',
    purpose: 'Seven-tab consolidated guide hub covering every major FO4 mod authoring discipline: Animation & Rigging, Quest Authoring, LOD & Precombine, Textures & Materials, Papyrus & Scripting, Sim Settlements 2, and BodySlide & Outfits — plus a direct link to the Fallout Wiki.',
    features: [
      'Seven-tab layout: Animation & Rigging, Quest Authoring, LOD & Precombine, Textures & Materials, Papyrus & Scripting, Sim Settlements 2, BodySlide & Outfits',
      'Tab selection persists for the session via sessionStorage key `guides_hub_tab`',
      'Live search/filter across tab metadata, plus keyboard shortcuts 1-7 for instant tab switching',
      'Per-tab visited/completion tracking so you can see your progress through each guide',
      'A real "Fallout Wiki" button in the header opens fallout.fandom.com in your browser',
      'Animation & Rigging — full Blender + Havok pipeline (skeleton, weights, FBX export, HKX conversion) + Shiagur rig suite, MaikCG F4Biped, IAF/NAF/AWF framework integration',
      'Quest Authoring — CK + Papyrus + F4SE workflow from smoke test to release',
      'LOD & Precombine — xLODGen + DynDOLOD + PRP end-to-end generation and validation',
      'Textures & Materials — DDS formats, BGSM editing, PBR pipeline, and batch optimization (mirrors the FO4 Textures & Materials platform\'s own guide tab)',
      'Papyrus & Scripting — F4SE, event-driven scripting patterns, and PaperScript reference',
      'Sim Settlements 2 — addon pack structure, city plan authoring, and unit/plot design',
      'BodySlide & Outfits — Outfit Studio workflow, morphs, and CBBE-family body compatibility',
    ],
    controls: [
      {
        name: 'Animation & Rigging Tab',
        type: 'button',
        description: 'Opens the Blender + Havok FO4 animation pipeline guide',
        whenToUse: 'Use when authoring, exporting, or validating FO4 animations or rigged meshes',
      },
      {
        name: 'Quest Authoring Tab',
        type: 'button',
        description: 'Opens the Creation Kit + Papyrus quest and dialogue authoring guide',
        whenToUse: 'Use when building quests, dialogue, or scripted content in the CK',
      },
      {
        name: 'LOD & Precombine Tab',
        type: 'button',
        description: 'Opens the LOD generation and precombine rebuild guide for exterior mods',
        whenToUse: 'Use when generating LODs or rebuilding precombines after exterior edits',
      },
      {
        name: 'Textures & Materials Tab',
        type: 'button',
        description: 'Opens the DDS/BGSM/PBR texture and material reference guide',
        whenToUse: 'Use when you need format/channel/pipeline reference rather than the full Textures & Materials tool itself',
      },
      {
        name: 'Papyrus & Scripting Tab',
        type: 'button',
        description: 'Opens the F4SE and Papyrus event-driven scripting reference',
        whenToUse: 'Use when writing or debugging Papyrus scripts and F4SE-dependent functions',
      },
      {
        name: 'Sim Settlements 2 Tab',
        type: 'button',
        description: 'Opens the SS2 addon pack, city plan, and unit authoring guide',
        whenToUse: 'Use when building content for the Sim Settlements 2 framework',
      },
      {
        name: 'BodySlide & Outfits Tab',
        type: 'button',
        description: 'Opens the Outfit Studio and BodySlide morph/conversion guide',
        whenToUse: 'Use when converting or building outfits for BodySlide-compatible bodies',
      },
      {
        name: 'Fallout Wiki button',
        type: 'button',
        description: 'Opens fallout.fandom.com in your default browser for looking up vanilla game data (items, NPCs, quests, locations)',
        whenToUse: 'When you need to check vanilla game facts while authoring a mod',
      },
      {
        name: 'Keyboard shortcuts (1-7, /)',
        type: 'indicator',
        description: 'Press 1-7 to jump directly to a tab, or / to focus the search box',
        whenToUse: 'For fast tab switching without reaching for the mouse',
      },
      {
        name: 'Tab Memory Handler',
        type: 'indicator',
        description: 'Restores your last selected Guides Hub tab for continuity between visits',
        whenToUse: 'Expect this when returning to the hub mid-workflow',
      },
    ],
    commonMistakes: [
      'Starting quest content without running the Minimal Working Quest smoke test first',
      'Exporting animations with renamed deform bones (breaks in-game rigging)',
      'Editing exterior cells without running precombines afterward',
      'Confusing the Animation tab with the LOD tab when looking for Havok vs xLODGen guides',
      'Using RegisterForUpdate() as a polling loop in Papyrus — use event-driven handlers (RegisterForRemoteEvent, RegisterForCustomEvent) instead',
      'Using the OG Creation Kit (1.10.163 build) on a NG/AE installation — install the NG CK + CKPE 0.5+ for 1.10.980+/1.11.x',
      'Installing standalone Buffout 4 on NG/AE — use Addictol (Nexus #84214) which bundles Buffout 4, X-Cell, and Papyrus VM patches',
      'Not specifying runtime target (OG 1.10.163 / NG 1.10.980-984 / AE 1.11.x) before writing F4SE scripts or DLL plugins',
    ],
    guides: [
      {
        title: 'Navigate FO4 Guides Hub by discipline',
        steps: [
          'Open /guides-hub and select the tab matching your current work: Animation, Quest, or LOD',
          'Follow the in-tab pipeline in order — each guide is sequential from setup to release',
          'Use Tab Memory to return to your active step when switching between Mossy panels',
        ],
      },
    ],
    tutorialSections: [
      'Animation & Rigging (Blender + Havok)',
      'Quest Authoring (CK + Papyrus + F4SE)',
      'LOD & Precombine (xLODGen + DynDOLOD + PRP)',
      'Textures & Materials (DDS + BGSM + PBR + Optimize)',
      'Papyrus & Scripting (F4SE + Events + PaperScript)',
      'Sim Settlements 2 (Addon Packs + City Plans + Units)',
      'BodySlide & Outfits (Outfit Studio + Morphs + CBBE)',
    ],
    suggestedQuestions: [
      'Which Guides Hub tab covers Blender FBX to HKX conversion?',
      'How do I start a quest smoke test in the CK?',
      'What is the correct order for LOD generation and PRP precombine rebuilds?',
      'How do I switch between guide tabs without losing my place?',
      'What version of CKPE do I need for NG (1.10.980+) vs OG (1.10.163)?',
      'Why should I avoid RegisterForUpdate() in Papyrus scripts?',
      'Do I need Addictol or standalone Buffout 4 for NG/AE?',
      'What PRP version supports NG/AE precombine rebuilds?',
      'Which Blender rig should I use for FO4 animations — Shiagur or MaikCG F4Biped?',
      'What is the difference between IAF, NAF, and AWF for animation modding?',
      'How do I use the Animated World Framework to add animations to world-object interactions?',
      'How do I build a Sim Settlements 2 addon pack?',
      'What\'s the difference between BodySlide and Outfit Studio?',
      'Can I jump straight to a tab with a keyboard shortcut?',
    ],
  },

  'blender-animation-guide': {
    pageId: 'blender-animation-guide',
    pageName: 'Animation Guide',
    route: '/guides/blender/animation',
    purpose: 'End-to-end Fallout 4 animation pipeline: skeleton import, rigging, authoring, FBX export and HKX conversion, validation, in-game testing, and community rig/framework integration.',
    features: [
      'Reference & skeleton import (preserve vanilla bone names)',
      'Rigging & weight painting checklists',
      'Authoring best practices (FPS, root handling, looping)',
      'FBX export guidance and Havok (FBX → HKX) conversion notes',
      'Animation Validator + common error troubleshooting',
      'Embedded helper panels (skeleton reference, export settings, rigging gallery, Havok guides)',
      'Shiagur Blender Rig suite — Human 1st/3rd person rig (#82537) and Power Armor rig (#81279): FO4 Tools N-key panels, IK/FK driver system, 3-method annotation extraction, Havok Viewer preview workflow',
      'MaikCG F4Biped (#16691) — 3ds Max / Maya / MotionBuilder pipeline: HCT export presets, 1st vs 3rd person skeleton conventions, vanilla animation import via havok2fbx',
      'IAF — Immersive Animation Framework (#50555): keyword-dispatch patching for ingestible animations; patch author keyword table',
      'NAF — Native Animation Framework (#73889): ESP-less XML animation packs, raceData graph/startEvent, face animation creation, NAF.ini HeadPart Morph Patch, AAF XML compatibility',
      'AWF — Animated World Framework (#100946): F4SE-native world-object interaction animations; no-scripting CK workflow for patch authors',
      'JNFA2026 (#100034), RAF (#90839), Witch\'s Nature (#89664), HIT THE MASS (#90416) — community animation mods as learning references',
    ],
    controls: [
      {
        name: 'Pipeline Sections (Overview → Validate)',
        type: 'navigation',
        description: 'Step through Reference, Rigging, Animation, Export and Validation sections',
        whenToUse: 'Follow the ordered pipeline when authoring or reviewing animations',
      },
      {
        name: 'Skeleton Reference & Import Tips',
        type: 'panel',
        description: 'Instructions for importing FO4 skeletons (do not rename deform bones)',
        whenToUse: 'Before rigging or binding meshes',
      },
      {
        name: 'Rigging Checklist / Mistakes Gallery',
        type: 'panel',
        description: 'Weight paint and common rigging pitfalls with visual examples',
        whenToUse: 'While binding and weight‑painting meshes',
      },
      {
        name: 'Export Settings Helper',
        type: 'tool',
        description: 'Recommended FBX export flags (bake animation, only deform bones, consistent scale)',
        whenToUse: 'Before exporting FBX for Havok conversion',
      },
      {
        name: 'Animation Validator',
        type: 'tool',
        description: 'In‑app validation to catch naming/scale/FPS issues before conversion',
        whenToUse: 'Run after export and before in‑game testing',
      },
      {
        name: 'Havok Quick‑Start Links',
        type: 'links',
        description: 'Guides for FBX → HKX conversion and FO4 Havok profile notes',
        whenToUse: 'When preparing HKX for in‑game use',
      },
    ],
    commonMistakes: [
      'Renaming or adding deform bones (breaks in‑game rigging)',
      'Mismatched FPS between Blender and target animation (speed issues)',
      'Exporting non-deform bones or incorrect FBX flags',
      'Inconsistent scale across authoring → export → conversion',
      'Skipping the Animation Validator before game testing',
    ],
    guides: [
      {
        title: 'Import FO4 skeleton and prepare a base file',
        steps: [
          'Install PyNifly and import the vanilla FO4 skeleton NIF',
          'Confirm the bone hierarchy & names are intact',
          'Save a clean skeleton_only.blend as your project base',
        ],
      },
      {
        title: 'Author a simple looping animation',
        steps: [
          'Set scene FPS to match the target (commonly 30 FPS)',
          'Animate in Pose mode and use Pose Markers for events',
          'Bake keys and ensure first/last frames blend for loops',
          'Export FBX with "Only Deform Bones" and baked animation',
          'Run the in‑app Animation Validator, then convert FBX → HKX with Havok',
        ],
      },
      {
        title: 'Export & convert to HKX (quick path)',
        steps: [
          'Export FBX from Blender using recommended flags',
          'Import FBX into Havok Content Tools 2014 using FO4 profile',
          'Export HKX and inspect with HKXPackUI',
          'Place HKX in the same relative path as the vanilla file for loose testing',
        ],
      },
      {
        title: 'Validate and ship',
        steps: [
          'Run the Animation Validator and fix naming/scale issues',
          'Test the HKX in-game using a controlled scenario',
          'Package into BA2 when stable and repeat tests',
        ],
      },
    ],
    tutorialSections: [
      'Reference & Skeleton',
      'Rigging & Weighting',
      'Animation Authoring',
      'Export & HKX Conversion',
      'Validation & Packaging',
    ],
    suggestedQuestions: [
      'Which bone names must never be changed for FO4 skeletons?',
      'What FPS should I author at for a given vanilla animation?',
      'Which FBX export flags are required for Havok import?',
      'How do I convert FBX to HKX for Fallout 4?',
      'What common weight‑painting mistakes cause in‑game mesh explosions?',
      'How do I use the Shiagur Blender rig FO4 Tools panel to import and export animations?',
      'What is the difference between Shiagur\'s human rig (#82537) and the Power Armor rig (#81279)?',
      'How do I extract vanilla annotations from an HKX file using the three available methods?',
      'How do I add keyword patching to make my ingestible mod compatible with IAF (#50555)?',
      'How do I create an ESP-less animation pack for NAF (#73889)?',
      'How do I add a world-object activation animation using the Animated World Framework (#100946)?',
      'What animation frameworks exist for Fallout 4 and when should I use each one?',
    ],
  },

  // pageName: 'Quest Mod Authorizing', (parity helper)
  'quest-authoring-guide': {
    pageId: 'quest-authoring-guide',
    pageName: 'Quest Authoring Guide (Quest Mod Authorizing)', // VISUAL_GUIDE title: Quest Mod Authorizing
    route: '/guides/creation-kit/quest-authoring',
    purpose: 'Authoritative Creation Kit hub: install/verify CK toolchain, author quests & dialogue, manage leveled lists, precombine exteriors, validate, and publish.',
    features: [
      'Tools & install verification (CK, FO4Edit, mod manager, Archive2)',
      'Minimal Working Quest (first test loop) to prove the toolchain',
      'Dialogue authoring wizard and scene tips',
      'Leveled-list injection guidance and safety checks',
      'Precombine / PRP rebuild checklist and helper utilities',
      'Papyrus scripting patterns, logging and debug workflows',
      'Dynamic Spawn Framework (DSFW #96276) integration notes for creature/NPC spawn systems (F4SE + Garden of Eden Papyrus extender requirements)',
      'Fallout4.esm Records Spreadsheet resource (#100679) for fast FormID/EditorID lookups during CK/xEdit authoring',
      'Custom radio authoring workflow reference (#101520): Sound Descriptors, quest scenes, randomization scripts, and BA2 packaging safety',
      'Validation & release checklist (testing, packaging, docs)',
    ],
    controls: [
      {
        name: 'Tools / Install / Verify checklist',
        type: 'panel',
        description: 'Follow a no-guess checklist to ensure CK, FO4Edit, mod manager and Archive2 are installed and working',
        whenToUse: 'Before authoring any quest content',
      },
      {
        name: 'Minimal Working Quest (first test loop)',
        type: 'walkthrough',
        description: 'Create a tiny quest (start → objective → completion) to validate end‑to‑end flow',
        whenToUse: 'Use this as your initial smoke test',
      },
      {
        name: 'CK Quest / Dialogue Wizard',
        type: 'widget',
        description: 'In‑app wizard to scaffold quest records and dialogue topics',
        whenToUse: 'When building quest skeleton and dialogue branches',
      },
      {
        name: 'Leveled List Injection Guide',
        type: 'widget',
        description: 'Safe patterns to inject items/NPCs into leveled lists without breaking load order',
        whenToUse: 'When adding loot or NPC spawns tied to your quest',
      },
      {
        name: 'Precombine & PRP tools',
        type: 'widget',
        description: 'Rebuild precombines for exterior edits and verify PRP usage',
        whenToUse: 'When changing exterior cells or terrain',
      },
      {
        name: 'Animation / Scenes / Lip Sync tips',
        type: 'panel',
        description: 'Guidance for scene setup, lip sync and camera placement',
        whenToUse: 'When authoring cinematic quest scenes',
      },
      {
        name: 'Testing & Release checklist',
        type: 'panel',
        description: 'Step-by-step tests to run before packaging and publishing',
        whenToUse: 'Before public release',
      },
    ],
    commonMistakes: [
      'Skipping the Minimal Working Quest smoke test (makes debugging harder later)',
      'Forgetting to check masters in FO4Edit (missing master errors at load)',
      'Unclear objectives or missing quest markers causing player confusion',
      'Over-relying on untested Papyrus scripts in production',
      'Forgetting to rebuild precombines after exterior edits',
    ],
    guides: [
      {
        title: 'Minimal Working Quest — smoke test',
        steps: [
          'Create a new plugin in Creation Kit and save it',
          'Add a Quest record with Start Game Enabled',
          'Add Stage 10 (objective) and Stage 20 (completion)',
          'Place a simple trigger (activator or dialogue topic) to advance stages',
          'Test in-game on a clean save and verify stage progression',
        ],
      },
      {
        title: 'Author dialogue & scenes (quick path)',
        steps: [
          'Use the CK Dialogue Wizard to scaffold topics and responses',
          'Add scene cameras and lip-sync data where needed',
          'Test lines in‑editor and then in‑game with the scene active',
        ],
      },
      {
        title: 'Safe leveled-list injection',
        steps: [
          'Use the Leveled List guide to create an injection record',
          'Prefer non-destructive edits and test with FO4Edit',
          'Validate that injection scales match intended level ranges',
        ],
      },
      {
        title: 'Precombine & PRP workflow',
        steps: [
          'Run Precombine after exterior edits',
          'Use the Precombine Checker to detect missing PRP/lighting issues',
          'Rebuild PRP and verify in a clean test profile',
        ],
      },
      {
        title: 'Validation & release checklist',
        steps: [
          'Run full playthrough of all quest branches',
          'Check FO4Edit for missing masters and conflicts',
          'Document installation steps and compatibility notes',
          'Package into BA2 and perform final smoke tests',
        ],
      },
    ],
    tutorialSections: [
      'Tools & Install',
      'Design & Story Structure',
      'CK Build & Dialogue',
      'Scripting & Testing',
      'Precombine & Packaging',
    ],
    suggestedQuestions: [
      'How do I scaffold a quest quickly for testing?',
      'When should I rebuild precombines?',
      'How do I safely inject items into a leveled list?',
      'What are the minimum Papyrus logging practices for debugging?',
      'How do I set up a non-repeating custom radio station quest in Creation Kit?',
      'When should I use Dynamic Spawn Framework (#96276) instead of custom one-off spawn scripts?',
      'How can I use the Fallout4.esm spreadsheet resource (#100679) to speed up CK/xEdit record lookups?',
    ],
  },

  'bodyslide-guide': {
    pageId: 'bodyslide-guide',
    pageName: 'BodySlide Guide',
    route: '/guides/mods/bodyslide',
    purpose: 'Complete guide to installing, using and troubleshooting BodySlide / Outfit Studio',
    features: [
      'Quick start (Batch Build presets)',
      'Installation & mod‑manager setup (Vortex / MO2)',
      'Preset creation, sliders and custom presets',
      'Project creation & conversion workflows (Outfit Studio)',
      'Verify & troubleshoot common issues',
    ],
    controls: [
      { name: 'Preset Selector', type: 'dropdown', description: 'Pick a body preset (adjusts sliders for entire body)', whenToUse: 'Choose before building or saving presets' },
      { name: 'Outfit Selector', type: 'dropdown', description: 'Select the outfit(s) to build', whenToUse: 'Use blank for all outfits or pick one for individual builds' },
      { name: 'Batch Build', type: 'button', description: 'Apply a preset to many outfits at once', whenToUse: 'When deploying body changes across mods' },
      { name: 'Build', type: 'button', description: 'Build currently selected outfit only', whenToUse: 'For single-outfit tweaks or testing' },
      { name: 'Preview', type: 'viewer', description: "Quick visual check (don't fully trust — always test in game)", whenToUse: 'Before saving or exporting presets' },
    ],
    commonMistakes: [
      'Running BodySlide outside your mod manager (BodySlide must see the real game Data folder)',
      'Forgetting to check "Build Morphs" / mesh options before building',
      'Expecting LooksMenu sliders to change BodySlide output (they do not)',
      'Maxing sliders without in‑game verification (causes clipping)',
      'Not deploying or placing output in the correct folder (MO2 Overwrite / Vortex deploy)',
    ],
    guides: [
      {
        title: 'Quick Start (5 minutes)',
        steps: [
          'Open BodySlide via your mod manager (Vortex → Tools or MO2 shortcut)',
          'Select a Preset from the Preset dropdown',
          'Select an Outfit (or leave blank to affect multiple)',
          'Click "Batch Build" → leave recommended checkboxes marked → Click Build',
          'Wait for completion and verify output meshes were written',
          'Launch game and equip the outfit to confirm the change',
        ],
      },
      {
        title: 'Create & Save a Custom Preset',
        steps: [
          'Load an existing preset as a base',
          'Adjust sliders gradually (5-10% increments)',
          'Use Body Part Settings for fine adjustments',
          'Click "Save As" and give the preset a descriptive name',
          'Test in game and iterate',
        ],
      },
      {
        title: 'Project → Outfit Studio → BodySlide Workflow',
        steps: [
          'Create a new project in Outfit Studio and load the outfit',
          'Use Conversion References to morph between body types if needed',
          'Copy bone weights from a reference body to ensure correct animations',
          'Save project and export shapes into a BodySlide project (SliderSets/ShapeData)',
          'Open BodySlide, load the project and Batch Build',
        ],
      },
      {
        title: 'Verify & Troubleshoot (first test loop)',
        steps: [
          'Run BodySlide through your mod manager so it sees the same virtual FS',
          'Batch Build a small set and confirm files were written to expected folder (MO2 Overwrite or game Data)',
          'Restart the game completely and test the outfit in‑game',
          'If nothing changed: check output path, deployment, and that the outfit mod is enabled',
        ],
      },
    ],
    tutorialSections: [
      'quickstart','installation','downloads','interface','advanced','verify-troubleshoot','sliders','workflows','settings','shortcuts','brushes','advanced-editing','troubleshooting','tips'
    ],
    suggestedQuestions: [
      'How do I install BodySlide and point it at the correct game folder?',
      'What is the difference between Build and Batch Build?',
      'Why do my BodySlide changes not appear in‑game?',
      'How do I create custom presets or convert outfits between body types?',
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
    pageName: 'Support Mossy',
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
    pageName: 'Modding Roadmaps',
    route: '/roadmap',
    purpose: 'Turn a mod idea into a step‑by‑step plan with tool hints and progress tracking',
    features: [
      'AI‑generated step lists from a short goal',
      'Progress tracking with step completion',
      'Tool badges and quick action links',
      'Editable steps and manual reordering',
      'Export/share roadmap and estimates',
    ],
    controls: [
      {
        name: 'New Goal / Goal Input',
        type: 'input',
        description: 'Type a short objective for what you want to build',
        whenToUse: 'Whenever you want Mossy to generate or update a roadmap',
      },
      {
        name: 'Generate (Lightning) Button',
        type: 'button',
        description: 'Ask Mossy to create a draft roadmap from your goal',
        whenToUse: 'After entering a clear, concise goal',
      },
      {
        name: 'Step Status Toggle',
        type: 'button',
        description: 'Mark a step completed or not started to update progress',
        whenToUse: 'As you complete each task in the roadmap',
      },
      {
        name: 'Export / Share',
        type: 'button',
        description: 'Export roadmap or share with collaborators',
        whenToUse: 'When you want to preserve or distribute your plan',
      },
    ],
    commonMistakes: [
      'Making goals too broad (e.g., "Make a mod")',
      'Marking steps complete before testing them',
      'Relying solely on the generated estimates without review',
    ],
    guides: [
      {
        title: 'Create your first roadmap',
        steps: [
          'Click New Goal and enter a concise objective (example: "Create a custom plasma rifle with new textures")',
          'Press the Generate (lightning) button to create a draft roadmap',
          'Open the roadmap card to review ordered steps and tool badges',
          'Click any step to see details or open the recommended tool',
          'Mark steps completed as you finish them — progress updates automatically',
        ],
      },
    ],
    tutorialSections: [
      'Modding Roadmaps - Create & Track Goals',
      'Using Roadmaps with Project Hub & Workshop',
    ],
    suggestedQuestions: [
      'How do I split a large roadmap step into smaller tasks?',
      'Which tools are recommended for this step?',
      'How do I export or share my roadmap?',
    ],
  },

  'ba2-manager': {
    pageId: 'ba2-manager',
    pageName: 'BA2 Manager',
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
    // Not part of the main 23-page guided tour (no visualGuidePage) — reachable both from
    // inside Journey Hub and directly at its own route.
    route: '/first-success',
    purpose: 'Guide you through the core onboarding checklist so Mossy can personalize help',
    features: [
      'System scan checklist',
      'Tool verification steps',
      'Knowledge index setup',
      'Memory Vault note prompts',
      'Spriggit plugin digest (optional) — converts .esp/.esm/.esl to YAML and ingests into Knowledge Vault',
      'First-question example prompt',
    ],
    controls: [
      {
        name: 'Step Cards',
        type: 'panel',
        description: 'Required setup steps in the recommended order',
        whenToUse: 'When you are ready to complete the onboarding checklist',
      },
      {
        name: 'Step Descriptions',
        type: 'text',
        description: 'Short explanations and where to go next for each step',
        whenToUse: 'When you are unsure why a step matters or what to click',
      },
      {
        name: 'Example Prompt Box',
        type: 'card',
        description: 'Starter question format you can copy',
        whenToUse: 'When you are ready to ask your first question',
      },
    ],
    commonMistakes: [
      'Skipping the system scan before asking for help',
      'Leaving tool paths unverified',
      'Asking a broad question without indexing guides',
      'Skipping the Spriggit digest when you have plugins — it gives Mossy direct knowledge of your specific mods',
    ],
    guides: [
      {
        title: 'Finishing the First Success Checklist',
        steps: [
          'Open System Hub and run a Diagnostics scan to detect installed tools',
          'Verify detected tools and paths in System Hub → Diagnostics',
          'Index built-in guides in Knowledge Search',
          'Add at least one note to the Memory Vault',
          '(Optional) Run the Spriggit plugin digest: select Spriggit.CLI.exe and your Fallout 4 Data folder — Mossy will serialize and ingest your plugins',
          'Ask a narrow first question using the example prompt',
        ],
      },
    ],
    tutorialSections: [
      'First Success Wizard',
      'Onboarding Checklist',
      'Spriggit Plugin Digest',
    ],
    suggestedQuestions: [
      'Where do I run the system scan?',
      'How do I verify tool paths?',
      'What should I ask for my first question?',
      'How do I run the Spriggit plugin digest?',
      'Can I re-run the Spriggit digest later from the Memory Vault?',
    ],
  },

  // pageName: 'What s New', (parity helper)
  // pageName: 'Whats New', (parity helper)
  // parity: pageName: "What's New"
  // parity helper: pageName: "FO4 What’s New",
  'whats-new': {
    pageId: 'whats-new',
    pageName: "FO4 What's New",
    visualGuidePage: 5,
    route: '/whats-new',
    purpose: 'Changelog-driven FO4 release notes page showing current-version highlights, fallback behavior, and version-aware dismissal settings.',
    features: [
      'Highlights cards are generated from CHANGELOG.md for the running app version',
      'Automatic fallback to the latest changelog entry when the current version has no section yet',
      'Version-aware "Don\'t auto-open this page again" behavior stored in localStorage/sessionStorage',
      'Back navigation returns to the route that opened What\'s New (or home if none)',
      'Persistent sidebar route so release notes can be revisited anytime',
    ],
    controls: [
      {
        name: 'Back to Mossy',
        type: 'button',
        description: 'Closes this page and navigates back to the source route (or home)',
        whenToUse: 'Use when you finish reviewing release highlights',
      },
      {
        name: 'Don\'t auto-open this page again',
        type: 'toggle',
        description: 'Saves a version-specific dismissal so this release does not auto-open again',
        whenToUse: 'Enable when you already reviewed this release and want fewer startup interruptions',
      },
      {
        name: 'Continue to Dashboard',
        type: 'button',
        description: 'Quick exit action that applies current dismissal preference and returns to Mossy',
        whenToUse: 'Use to leave release notes and continue normal FO4 workflow',
      },
      {
        name: 'Fallback Notice',
        type: 'panel',
        description: 'Amber warning shown when current version has no exact changelog entry and fallback notes are rendered',
        whenToUse: 'Check this to confirm you are reading fallback notes from an earlier version',
      },
    ],
    commonMistakes: [
      'Assuming highlights are for the current version when the fallback warning is visible',
      'Dismissing the page before scanning notes tied to your FO4 modding workflow',
      'Expecting route-specific details without checking the linked hub pages after reading highlights',
    ],
    guides: [
      {
        title: 'Reviewing release notes before modding',
        steps: [
          'Open FO4 What\'s New and read the Highlights list for your current version',
          'If the fallback warning appears, note which version is actually being shown',
          'Open impacted hubs (AI Chat, AI Mod Assistant, Journey, etc.) and verify your daily workflow still matches the new behavior',
          'Use Continue to Dashboard to return to work once checks are complete',
        ],
      },
      {
        title: 'Controlling auto-open behavior safely',
        steps: [
          'Enable "Don\'t auto-open this page again" only after reading this release',
          'Click Back to Mossy or Continue to Dashboard to persist the dismissal for the current version',
          'On the next app version, the page auto-opens again so you can review new FO4-related changes',
        ],
      },
    ],
    tutorialSections: [
      'FO4 What\'s New Overview',
      'Version Fallback Behavior',
      'Auto-open Dismissal Controls',
    ],
    suggestedQuestions: [
      'Which FO4 workflows changed in this release?',
      'Why am I seeing notes from a different version?',
      'How do I stop What\'s New from auto-opening this version only?',
      'Where do I go after reading this page to validate my pipeline?',
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

  'advanced-analysis': {
    pageId: 'advanced-analysis',
    pageName: 'Advanced Analysis',
    route: '/tools/advanced-analysis',
    purpose: 'Deep asset and plugin analysis with AI-suggested fixes and batch scanning.',
    features: [
      'Batch scans',
      'Severity grouping',
      'AI remediation suggestions',
    ],
    controls: [
      { name: 'Run Advanced Scan', type: 'button', description: 'Perform a deep analysis of selected files', whenToUse: 'When triaging complex issues' },
    ],
    commonMistakes: [
      'Running wide-scoped scans without filters',
    ],
    guides: [
      { title: 'Run an advanced scan', steps: ['Open Advanced Analysis', 'Choose scope and start scan', 'Review grouped results'] },
    ],
    tutorialSections: [
      'Deep Analysis & Fixes',
    ],
    suggestedQuestions: [
      'How do I limit scan scope?',
    ],
  },

  'local-capabilities': {
    pageId: 'local-capabilities',
    pageName: 'Local Capabilities',
    route: '/capabilities',
    purpose: 'Detect and list local system capabilities and available native integrations.',
    features: [
      'Detected tools',
      'Bridge status',
      'Environment checks',
    ],
    controls: [
      { name: 'Refresh Capabilities', type: 'button', description: 'Re-scan local system for available integrations', whenToUse: 'After installing new local tools' },
    ],
    commonMistakes: [
      'Assuming remote-only features are available locally',
    ],
    guides: [
      { title: 'Refresh local capabilities', steps: ['Open Local Capabilities', 'Click Refresh', 'Review detected services'] },
    ],
    tutorialSections: [
      'Local Integrations',
    ],
    suggestedQuestions: [
      'How do I enable Desktop Bridge?',
    ],
  },

  'community-learning': {
    pageId: 'community-learning',
    pageName: 'Community Learning',
    route: '/community',
    purpose: 'Access community-contributed guides, tutorials and examples.',
    features: [
      'Curated guides',
      'User examples',
      'Upvote & bookmark',
    ],
    controls: [
      { name: 'Open Guide', type: 'button', description: 'Open a community guide', whenToUse: 'When you want a community example' },
    ],
    commonMistakes: [
      'Assuming community content is always canonical',
    ],
    guides: [
      { title: 'Browse community guides', steps: ['Open Community Learning', 'Filter by topic', 'Open and bookmark useful guides'] },
    ],
    tutorialSections: [
      'Community Content',
    ],
    suggestedQuestions: [
      'How do I submit a guide?',
    ],
  },

  'tool-verify': {
    pageId: 'tool-verify',
    pageName: 'Tool Verify',
    // Merged into Diagnostics — /tool-verify and /devtools/tool-verify both redirect to /diagnostics now.
    route: '/diagnostics',
    purpose: 'Verify configured tool paths and versions (Creation Kit, Blender, MO2, xEdit) — now part of the Diagnostic Tools page.',
    features: [
      'Path checks',
      'Version detection',
      'Auto-fix suggestions',
    ],
    controls: [
      { name: 'Verify', type: 'button', description: 'Verify all configured tool paths', whenToUse: 'After installing or moving a tool' },
    ],
    commonMistakes: [
      'Not running verification after installs',
    ],
    guides: [
      { title: 'Verify tools', steps: ['Open Tool Verify', 'Click Verify', 'Follow suggested fix links'] },
    ],
    tutorialSections: [
      'Path & Version Checks',
    ],
    suggestedQuestions: [
      'How do I fix a missing path?',
    ],
  },

  'guided-tours': {
    pageId: 'guided-tours',
    pageName: 'Guided Tours',
    visualGuidePage: 23,
    // Not a dedicated page — the "Guided Tours" panel lives in the Sidebar and launches
    // real react-joyride spotlight overlays. Anchored to home for lack of a single URL.
    route: '/',
    purpose: 'A "Guided Tours" panel in the sidebar that re-launches real, spotlight-based walkthroughs any time you want — this full 23-page tour, a Feature Spotlight highlighting a specific tool, or the entire first-run install experience from scratch.',
    features: [
      'Welcome Tour — replays this same 23-page interactive tour you\'re on right now',
      'Feature Spotlight — a react-joyride overlay that highlights specific UI elements on the current page with narrated call-outs',
      'Initial Install — fully replays the system scan and first-run onboarding flow (with a confirmation prompt, since it resets onboarding progress). Your settings, API keys, and data are all preserved',
      'Spoken narration via Mossy\'s text-to-speech on each spotlighted step',
      'Screenshot fallbacks — if a step\'s reference image is missing, it shows a "Screenshot unavailable" placeholder instead of a broken image',
    ],
    controls: [
      {
        name: 'Welcome Tour',
        type: 'button',
        description: 'Restarts this interactive page-by-page tour from page 1',
        whenToUse: 'When you want a full refresher on every platform in the app',
      },
      {
        name: 'Feature Spotlight',
        type: 'button',
        description: 'Launches a react-joyride overlay that highlights specific controls on your current page with narrated explanations',
        whenToUse: 'When you want a focused walkthrough of the page you\'re already on, rather than the whole app',
      },
      {
        name: 'Initial Install',
        type: 'button',
        description: 'Replays the full first-run system scan and onboarding flow from the very beginning, after a confirmation prompt',
        whenToUse: 'If you want to re-run setup (e.g. after adding new modding tools) without losing your existing settings or data',
      },
    ],
    commonMistakes: [
      'Clicking "Initial Install" without realizing it replays the full scan/onboarding sequence — read the confirmation prompt first',
      'Expecting Feature Spotlight to cover every page — it highlights whatever\'s relevant to the page you\'re currently on',
    ],
    guides: [
      {
        title: 'Replay the full tour',
        steps: ['Open the Guided Tours panel in the sidebar', 'Click "Welcome Tour"', 'Follow along page by page, same as your first run'],
      },
      {
        title: 'Get a focused walkthrough of your current page',
        steps: ['Navigate to the page you want help with', 'Open the Guided Tours panel in the sidebar', 'Click "Feature Spotlight" to highlight that page\'s key controls'],
      },
    ],
    tutorialSections: [
      'Guided Tours - Replaying Walkthroughs',
      'Welcome Tour vs Feature Spotlight vs Initial Install',
    ],
    suggestedQuestions: [
      'How do I replay this tutorial later?',
      'What\'s the difference between Feature Spotlight and the Welcome Tour?',
      'Will replaying Initial Install erase my settings?',
      'Can I get a guided tour of just one specific tool?',
    ],
  },

  'pip-boy-mode': {
    pageId: 'pip-boy-mode',
    pageName: 'Pip‑Boy Mode',
    // Not a dedicated page — it's a small icon button (Radio icon) in the app header, present
    // on every screen. Anchored to home since there's no single "correct" route.
    route: '/',
    purpose: 'A real, full app-wide theme change — not just a button lighting up. One click (or Ctrl+Shift+P) recolors the entire interface to look like a Fallout Pip-Boy screen: black background, monochrome green text and borders, a monospace font, a green text glow, and a faint CRT-style screen reflection overlay. Every button, panel, and input across the whole app changes, not just the toggle itself.',
    features: [
      'Header toggle button (Radio icon) — turns amber/highlighted when Pip-Boy mode is active',
      'Keyboard shortcut: Ctrl+Shift+P',
      'Applies instantly app-wide: black background, classic Pip-Boy green (#16f342) text/borders/glow, monospace font',
      'Buttons glow green on hover in Pip-Boy mode',
      'A subtle CRT screen-reflection overlay for the retro-terminal look',
      'Purely cosmetic — no features are hidden or disabled while it\'s active',
    ],
    controls: [
      {
        name: 'Pip-Boy toggle (header)',
        type: 'toggle',
        description: 'Click the Radio icon button in the top header to switch the whole app between normal and Pip-Boy green-monochrome theme',
        whenToUse: 'Whenever you want the immersive, in-universe look — purely a visual preference, doesn\'t change any functionality',
      },
    ],
    commonMistakes: [
      'Not realizing it\'s a full-app theme change (some text can be harder to read in Pip-Boy mode on certain screens due to the monochrome override)',
    ],
    guides: [
      { title: 'Toggle Pip-Boy mode', steps: ['Look for the small Radio icon button in the top header (or press Ctrl+Shift+P)', 'Click it to switch the whole app to the green Pip-Boy theme', 'Click again (or press the shortcut again) to switch back to normal'] },
    ],
    tutorialSections: [
      'Appearance & Themes',
    ],
    suggestedQuestions: [
      'How do I return to normal UI?',
    ],
  },

  'knowledge-search': {
    pageId: 'knowledge-search',
    pageName: 'Knowledge Search',
    route: '/knowledge',
    purpose: 'Search the Mossy knowledge base for Fallout 4 modding information.',
    features: ['Full-text search', 'Category filters', 'Bookmarks'],
    controls: [
      { name: 'Search', type: 'input', description: 'Enter keywords to search', whenToUse: 'When looking for specific information' },
    ],
    commonMistakes: ['Using overly broad search terms'],
    guides: [{ title: 'Search the knowledge base', steps: ['Open Knowledge Search', 'Enter a keyword', 'Browse results'] }],
    tutorialSections: ['Search'],
    suggestedQuestions: ['How do I search for specific topics?'],
  },

  'crash-triage': {
    pageId: 'crash-triage',
    pageName: 'Crash Triage',
    route: '/crash-triage',
    purpose: 'Diagnose and triage Fallout 4 crash logs to identify mod conflicts.',
    features: ['Crash log analysis', 'Conflict detection', 'Fix suggestions'],
    controls: [
      { name: 'Analyze', type: 'button', description: 'Analyze a crash log', whenToUse: 'After a game crash' },
    ],
    commonMistakes: ['Not providing the most recent crash log'],
    guides: [{ title: 'Triage a crash', steps: ['Open Crash Triage', 'Upload crash log', 'Review detected conflicts'] }],
    tutorialSections: ['Crash Analysis'],
    suggestedQuestions: ['How do I find my crash log?'],
  },

  'the-lorekeeper': {
    pageId: 'the-lorekeeper',
    pageName: 'LOD & Precombine Guide',
    // This content was merged into the Quest Authoring Guide (precombine-prp and
    // precombine-checker both redirect there now) — route matches where it actually lives.
    route: '/guides/creation-kit/quest-authoring',
    purpose: 'End-to-end LOD generation and precombine rebuild workflow for FO4 exterior mods: xLODGen terrain/object LODs, DynDOLOD tree/dynamic LODs, and PRP precombine rebuild and validation.',
    features: ['xLODGen terrain and object LOD generation', 'DynDOLOD tree and dynamic LOD setup', 'PRP precombine rebuild steps', 'Exterior cell edit validation', 'Precombine conflict detection'],
    controls: [
      { name: 'LOD & Precombine Tab', type: 'button', description: 'Opens the combined LOD generation and precombine guide', whenToUse: 'Use when editing exterior cells or generating LODs for distribution' },
    ],
    commonMistakes: ['Editing exterior cells without rebuilding precombines', 'Running xLODGen before DynDOLOD (order matters)', 'Not validating PRP compatibility before release'],
    guides: [{ title: 'LOD & Precombine rebuild (quick path)', steps: ['Edit exterior cells in CK', 'Rebuild precombines and verify with PRP', 'Run xLODGen for terrain/object LODs', 'Run DynDOLOD for tree/dynamic LODs', 'Test in-game on a clean profile'] }],
    tutorialSections: ['xLODGen', 'DynDOLOD', 'PRP Precombine Rebuild'],
    suggestedQuestions: ['What order should I run xLODGen and DynDOLOD?', 'How do I rebuild precombines for a cell I edited?', 'What does PRP do vs standard precombines?'],
  },

  'tools': {
    pageId: 'tools',
    pageName: 'Tools',
    route: '/tools',
    purpose: 'Central hub for all Mossy modding tools and utilities.',
    features: ['Tool launcher', 'Quick access', 'Tool status'],
    controls: [
      { name: 'Open Tool', type: 'button', description: 'Launch a specific tool', whenToUse: 'When you need a specific utility' },
    ],
    commonMistakes: ['Not verifying tool paths before use'],
    guides: [{ title: 'Use the Tools hub', steps: ['Open Tools', 'Select the desired tool', 'Follow tool instructions'] }],
    tutorialSections: ['Tools Hub'],
    suggestedQuestions: ['Which tool should I use for texture editing?'],
  },

  'the-assembler': {
    pageId: 'the-assembler',
    pageName: 'The Assembler',
    route: '/tools/assembler',
    purpose: 'Assemble and package mod files for distribution.',
    features: ['File assembly', 'Archive creation', 'Validation'],
    controls: [
      { name: 'Assemble', type: 'button', description: 'Assemble mod files into a package', whenToUse: 'When preparing a mod for release' },
    ],
    commonMistakes: ['Forgetting to validate before assembling'],
    guides: [{ title: 'Assemble a mod', steps: ['Open The Assembler', 'Select files', 'Run assembly'] }],
    tutorialSections: ['Mod Assembly'],
    suggestedQuestions: ['How do I create a BA2 archive?'],
  },

  'creative-director': {
    pageId: 'creative-director',
    pageName: 'Vault-Tec Creative Director',
    // Not part of the main 23-page guided tour — Creative Director is a local-only dev tool
    // and shouldn't be presented as a normal user-facing feature. Page 23 is now Guided Tours,
    // matching the real screenshot set (see 'guided-tours' entry).
    route: '/creative-director',
    purpose: 'AI team pipeline for designing small, accurate Fallout 4 mods. The team works through a strict gated pipeline — Plan → Review → Analyze → YOUR APPROVAL → Build (section by section) → Verify — before producing a complete BUILD_GUIDE.md you can follow in Creation Kit. Every FormID, EditorID, and NIF path is cross-checked against real FO4 game data. The team never invents records.',
    features: [
      'Five-agent pipeline: Mod Planner, Plan Reviewer, Game Data Analyst, Mod Builder, Build Verifier',
      'Strict scope limits enforced: 1 quest (3–5 stages), 1–2 NPCs, 1 location, no custom assets',
      'Real game data verification — all FormIDs and EditorIDs checked against 141,055 scanned records from all FO4 ESMs',
      'User approval gate — team PAUSES after analysis and waits for your OK before any building starts',
      'Section-by-section building with per-section verification (pass/fail) before advancing',
      'Phase progress bar showing live pipeline status: Planning → Review → Analysis → Approval → Building → Verifying',
      'Approval UI — Approve to start build, or Send Back with specific written feedback to revise the plan',
      'FO4 World Scan — loads 7,000+ real game names so AI never invents existing locations or NPCs',
      'Completed projects: BUILD_GUIDE.md, transcript, optional Papyrus scripts',
      'xEdit Script Generator — AI writes a Pascal FO4Edit script that pre-wires selected records into your ESP',
    ],
    controls: [
      {
        name: 'Enable / Disable toggle',
        type: 'button',
        description: 'Start or stop the autonomous AI team. When enabled, the team immediately begins the pipeline on a new project.',
        whenToUse: 'Enable when you want the team to design a mod; disable to pause all AI activity',
      },
      {
        name: 'Approve — Start Building',
        type: 'button',
        description: 'Appears during the Approval phase. Confirms the plan and analysis, and tells the Builder to begin writing the mod section by section.',
        whenToUse: 'After reviewing the plan and analysis in the transcript and deciding the design is solid',
      },
      {
        name: 'Send Back with Feedback',
        type: 'button',
        description: 'Appears during the Approval phase. Opens a text field where you write specific revision notes; the Planner restarts with your feedback.',
        whenToUse: 'When the plan has scope creep, invented records, wrong location, or other problems you want corrected before building',
      },
      {
        name: 'FO4 World Scan',
        type: 'button',
        description: 'Runs fo4_strings_scan.py against your local FO4 game files and loads real location, NPC, and faction names into the AI context.',
        whenToUse: 'Run once before first use, then periodically when DLC data changes — ensures AI never reuses existing names',
      },
      {
        name: 'Reset All',
        type: 'button',
        description: 'Wipes all projects (current, queued, completed) and returns to a clean state.',
        whenToUse: 'Only when you want to start completely fresh — this cannot be undone',
      },
      {
        name: 'Guide Viewer',
        type: 'panel',
        description: 'Inline viewer for the finished BUILD_GUIDE.md once a project completes all four build sections.',
        whenToUse: 'As a reference guide while implementing the mod in Creation Kit',
      },
    ],
    commonMistakes: [
      'Clicking Approve too fast — always read the full Analysis section (Verified Reference Table) before approving; it lists every FormID the build will use',
      'Writing vague rejection feedback like "make it better" — be specific: name the section, the field, and what you want changed',
      'Expecting the team to design large mods — scope is deliberately capped at 1 quest / 1-2 NPCs / 1 location; this is intentional to ensure quality',
      'Not running the FO4 World Scan before first use — without it the AI uses a fallback list and may pick names that already exist in-game',
      'Disabling the team mid-build — the current section will not finish; re-enable to resume from the current section',
      'Treating BUILD_GUIDE.md as an ESP — it is a human-readable step-by-step guide; you still need to execute each step in CK or xEdit',
    ],
    guides: [
      {
        title: 'Run the pipeline and approve your first mod',
        steps: [
          'Open Vault-Tec Creative Director → go to the AI Team tab',
          'If not done: click "Scan FO4 World" to load real game names (takes ~5 seconds)',
          'Click Enable — the Creative Director generates a concept/brief immediately',
          'Watch the phase progress bar: Planning → Review → Analysis completes automatically',
          'When the bar reaches "Approval" (amber pulse), read the full transcript — especially the Verified Reference Table',
          'If the plan looks good, click "Approve — Start Building"',
          'If you want changes, click "Send Back with Feedback" and describe exactly what to fix',
          'After approval the Builder writes each of 4 sections; the Verifier checks each before continuing',
          'When all sections pass, the project is finalized and BUILD_GUIDE.md is saved',
        ],
      },
      {
        title: 'Review and reject a plan effectively',
        steps: [
          'Wait for the pipeline to reach the Approval gate (amber "Approval" in the progress bar)',
          'Read all three agent outputs in the transcript: Planner (the plan), Reviewer (issues found), Analyst (verified table)',
          'Check: Is the scope within limits? (1 quest, 3-5 stages, 1-2 NPCs, 1 location)',
          'Check: Are all FormIDs in the Verified Reference Table marked "Confirmed: Yes"?',
          'Check: Does the location EditorID look like a real CK cell name (no spaces, correct casing)?',
          'If anything is wrong, click "Send Back with Feedback"',
          'Write precise feedback: e.g. "The NPC uses race HumanRace which is correct but the outfit LaborerOutfit01 was not confirmed — find and verify the real EditorID"',
          'The Planner restarts with your feedback and the pipeline runs again',
        ],
      },
      {
        title: 'Use the xEdit Script to pre-wire assets',
        steps: [
          'Open the finished project in the Lab Handoff panel',
          'Expand the xEdit Script Generator section',
          'Enter your target ESP filename (e.g., MyMod.esp)',
          'Click Generate Script and wait for the AI to write the Pascal script',
          'Click Open Folder to find the saved .pas file',
          'Open FO4Edit, load Fallout4.esm and your target ESP as masters',
          'Apply Script → select the generated .pas file',
          'The script creates TXST, STAT, ACTI, and other records from the team\'s asset list',
          'Open the ESP in Creation Kit — assets are pre-wired; place objects and customize from there',
        ],
      },
    ],
    tutorialSections: [
      'Creative Director — Phase Pipeline Overview',
      'Approval Gate — When and How to Approve',
      'Sending Feedback — Writing Effective Revision Notes',
      'Build Phase — Section-by-Section Verification',
      'Lab Handoff & BUILD_GUIDE.md',
      'xEdit Script Generator',
      'FO4 World Scan',
    ],
    suggestedQuestions: [
      'What is the approval gate and when does it appear?',
      'How do I write good feedback when rejecting a plan?',
      'Why is scope capped at 1 quest and 1-2 NPCs?',
      'What does the Verified Reference Table show?',
      'What happens if the verifier fails a build section?',
      'Where is the BUILD_GUIDE.md saved after the project finishes?',
      'How do I use the xEdit script to set up my ESP before opening Creation Kit?',
      'What does the FO4 World Scan do and why does it matter?',
    ],
  },

  'ck-extensions': {
    pageId: 'ck-extensions',
    pageName: 'CK Extensions',
    route: '/tools/ck-extension',
    purpose: 'Creation Kit extensions and integrations for advanced modding workflows.',
    features: ['CK plugin list', 'Extension manager', 'CK integration'],
    controls: [
      { name: 'Enable Extension', type: 'toggle', description: 'Enable a CK extension', whenToUse: 'When adding CK functionality' },
    ],
    commonMistakes: ['Enabling incompatible extensions simultaneously'],
    guides: [{ title: 'Set up CK Extensions', steps: ['Open CK Extensions', 'Enable desired extensions', 'Restart CK if required'] }],
    tutorialSections: ['CK Integration'],
    suggestedQuestions: ['What CK extensions are available?'],
  },

  'comfyui-extensions': {
    pageId: 'comfyui-extensions',
    pageName: 'ComFyui Extensions',
    route: '/extensions/comfyui',
    purpose: 'ComfyUI workflow integration for AI-assisted texture and image generation.',
    features: ['ComfyUI workflow runner', 'Preset workflows', 'Output preview'],
    controls: [
      { name: 'Run Workflow', type: 'button', description: 'Execute a ComfyUI workflow', whenToUse: 'When generating AI textures' },
    ],
    commonMistakes: ['Not having ComfyUI installed locally before use'],
    guides: [{ title: 'Use ComfyUI Extension', steps: ['Install ComfyUI', 'Open ComfyUI Extensions', 'Run a preset workflow'] }],
    tutorialSections: ['AI Image Generation'],
    suggestedQuestions: ['How do I connect to my local ComfyUI instance?'],
  },

  'upscayl-extension': {
    pageId: 'upscayl-extension',
    pageName: 'Upscayl / Upscale Extension',
    route: '/extensions/upscayl',
    purpose: 'AI-powered texture upscaling using Upscayl for higher-resolution mod assets.',
    features: ['Batch upscaling', 'Model selection', 'Preview comparison'],
    controls: [
      { name: 'Upscale', type: 'button', description: 'Upscale selected textures', whenToUse: 'When improving texture resolution' },
    ],
    commonMistakes: ['Upscaling textures that are already high resolution'],
    guides: [{ title: 'Upscale textures', steps: ['Open Upscayl Extension', 'Select textures', 'Choose a model and upscale'] }],
    tutorialSections: ['Texture Upscaling'],
    suggestedQuestions: ['Which upscaling model should I use?'],
  },

  'mo2-extension': {
    pageId: 'mo2-extension',
    pageName: 'MO2 Extension',
    route: '/extensions/mo2',
    purpose: 'Mod Organizer 2 integration for managing mod load order and profiles.',
    features: ['MO2 connection', 'Load order sync', 'Profile management'],
    controls: [
      { name: 'Sync Load Order', type: 'button', description: 'Sync load order from MO2', whenToUse: 'After changing load order in MO2' },
    ],
    commonMistakes: ['Not pointing Mossy to the correct MO2 installation'],
    guides: [{ title: 'Connect MO2', steps: ['Open MO2 Extension', 'Set MO2 path', 'Sync profiles'] }],
    tutorialSections: ['MO2 Integration'],
    suggestedQuestions: ['How do I link Mossy to MO2?'],
  },

  'xedit-tools': {
    pageId: 'xedit-tools',
    pageName: 'xEdit Tools',
    route: '/tools/xedit',
    purpose: 'xEdit (FO4Edit) integration for editing ESP/ESL/ESM plugin records.',
    features: ['Record browser', 'Script runner', 'Conflict resolver'],
    controls: [
      { name: 'Open xEdit', type: 'button', description: 'Launch xEdit', whenToUse: 'When editing plugin records' },
    ],
    commonMistakes: ['Editing master files without a backup'],
    guides: [{ title: 'Use xEdit Tools', steps: ['Open xEdit Tools', 'Load your plugin', 'Browse or edit records'] }],
    tutorialSections: ['Plugin Editing'],
    suggestedQuestions: ['How do I resolve record conflicts in xEdit?'],
  },

  'textures': {
    pageId: 'textures',
    pageName: 'FO4 Textures & Materials',
    visualGuidePage: 10,
    route: '/textures',
    purpose: 'Unified platform for every texture and material task in Fallout 4 modding — 11 tabs covering DDS conversion, procedural and AI texture generation, PBR material authoring, real .bgsm binary editing, mesh/script optimization, and reference documentation.',
    features: [
      '11-tab consolidated workflow: DDS Converter, Texture Generator, Image Studio, FO4 Texture Guide, BGSM Editor, Mat Editor, Mat Definitions, Optimizer, Enhancer, Krita AI Paint, AI Image Studio',
      'Session tab persistence via sessionStorage (restores your last active tab)',
      'DDS Converter: batch BC1/BC3/BC4/BC5/BC7 conversion with mipmap control',
      'Texture Generator: PBR and procedural texture generation',
      'Image Studio: PBR map prep, format conversion, preview',
      'FO4 Texture Guide: embedded format picker, channel conventions, mipmap rules, PBR pipeline notes, and common mistakes',
      'BGSM Editor: writes a real binary .bgsm file (SF1/SF2 shader flags, PBR toggle) — not a JSON stand-in',
      'Mat Editor: node-based shader graph with a real 3D preview, real preset library, and real binary .bgsm export',
      'Mat Definitions: browse and edit a mod\'s .mossy_material.json RMAOS manifest (click "Browse Mod Folder" to load one)',
      'Optimizer: batch texture recompression (texconv), plus real mesh cleanup and Papyrus script recompilation when the right tools are configured',
      'Enhancer: detail-extraction and full PBR map generation (albedo, normal, roughness, metallic, AO, height) from a single source photo — not an upscaler',
      'Krita AI Paint / AI Image Studio: AI-assisted painting and image generation workflows',
    ],
    controls: [
      {
        name: 'DDS Converter Tab',
        type: 'button',
        description: 'Opens the batch DDS conversion panel with format and mipmap controls',
        whenToUse: 'When converting source images (PNG/TGA/etc.) to game-ready DDS before packaging',
      },
      {
        name: 'Texture Generator Tab',
        type: 'button',
        description: 'Opens the PBR and procedural texture generation tools',
        whenToUse: 'When you need to generate new diffuse, normal, or specular maps from scratch',
      },
      {
        name: 'Image Studio Tab',
        type: 'button',
        description: 'Opens the image processing panel for PBR map prep, channel splitting, and format conversion',
        whenToUse: 'When preparing or adjusting existing textures before export to DDS',
      },
      {
        name: 'FO4 Texture Guide Tab',
        type: 'button',
        description: 'Shows in-app reference covering format picker, channel conventions, mipmap rules, PBR pipeline, and common mistakes',
        whenToUse: 'When verifying format choices, channel packing, or PBR/ENB pipeline compatibility before release',
      },
      {
        name: 'BGSM Editor Tab',
        type: 'button',
        description: 'Full FO4 material flag editor — edit every SF1/SF2 shader flag, specular/emissive/wetness values, and save a real binary .bgsm (Fallout 4 version 2 only; other versions honestly fall back to a labeled JSON export)',
        whenToUse: 'When you need precise control over a material\'s shader flags rather than the node-graph workflow',
      },
      {
        name: 'Mat Editor Tab',
        type: 'button',
        description: 'Node-based shader graph editor with a live Three.js preview. Drag node headers to move them, click a node\'s output dot then a target node\'s input dot to wire a connection, and use Validate to check the graph is fully connected before saving',
        whenToUse: 'When building or tuning a material visually rather than editing raw flags',
      },
      {
        name: 'Mat Definitions Tab',
        type: 'button',
        description: 'Click "Browse Mod Folder" to load a .mossy_material.json manifest and browse/edit its material entries',
        whenToUse: 'When working with a mod that already has a Mossy material manifest',
      },
      {
        name: 'Optimizer Tab',
        type: 'button',
        description: 'Batch-optimize a mod folder: texture recompression always works if texconv.exe is configured in Settings; mesh cleanup and script recompilation need Blender+Mossy Link and the Papyrus Compiler configured respectively',
        whenToUse: 'Before packaging a mod, to shrink textures and clean up meshes/scripts in one pass',
      },
      {
        name: 'Enhancer Tab',
        type: 'button',
        description: 'Pick a single source texture (or a folder in batch mode) and run the full detail-extraction pipeline: de-lit albedo, normal map, roughness, metallic, AO, cavity, height, and a generated .bgsm referencing the outputs',
        whenToUse: 'When you have one good photo/texture and need a complete PBR material set from it',
      },
      {
        name: 'Tab Memory Restore',
        type: 'button',
        description: 'Remembers and restores your last active texture hub tab in-session',
        whenToUse: 'When returning to texture work mid-session without losing your place',
      },
    ],
    commonMistakes: [
      'Using non-power-of-2 texture dimensions (causes black textures or crash)',
      'Using BC1/DXT1 for normal maps — destroys quality; always use BC5 or DXT5nm',
      'Skipping mipmap generation on in-game textures',
      'Shipping uncompressed 32-bit DDS in a BA2 archive',
      'OpenGL normal handedness instead of DX (flip G channel for FO4)',
      'Ignoring the FO4 Texture Guide tab when choosing PBR vs vanilla format paths',
      'Expecting the Optimizer\'s mesh/script optimization to work without Blender+Mossy Link (mesh) or a configured Papyrus Compiler (scripts) — texture recompression works standalone, the other two need those tools connected',
      'Expecting the Enhancer to "upscale" a low-res texture — it extracts real PBR detail from what\'s already in the source image, it does not add resolution or invent detail that isn\'t there',
    ],
    guides: [
      {
        title: 'Convert and package textures for FO4',
        steps: [
          'Open FO4 Textures & Materials and select the DDS Converter tab',
          'Add source images and confirm target format (BC1/BC3/BC5/BC7 per use case)',
          'Enable mipmap generation and run conversion',
          'Verify output using Image Studio or NifSkope before packaging into BA2',
        ],
      },
      {
        title: 'Generate new PBR textures',
        steps: [
          'Switch to the Texture Generator tab',
          'Select a PBR or procedural preset matching your asset type',
          'Adjust parameters and generate the texture set (diffuse, normal, specular)',
          'Export outputs then convert via DDS Converter before game use',
        ],
      },
      {
        title: 'Build a real material with the Mat Editor',
        steps: [
          'Switch to the Mat Editor tab and pick a preset close to what you need, or start from a blank graph',
          'Add nodes from the palette and drag their headers to arrange them',
          'Click an output dot then an input dot to wire connections between nodes',
          'Click Validate to confirm every node is connected and the graph reaches an output',
          'Click Save — this writes a real binary .bgsm (version 2) via the same writer used by the BGSM Editor',
        ],
      },
      {
        title: 'Extract a full PBR set from one photo',
        steps: [
          'Switch to the Enhancer tab and pick Single Texture or Batch Folder mode',
          'Choose your source image (or folder) and a material surface preset (metal, wood, concrete, etc.)',
          'Run the pipeline — it produces albedo, normal, roughness, metallic, AO, cavity, height maps and a .bgsm',
          'Review outputs in Image Studio or the Mat Editor before packaging',
        ],
      },
      {
        title: 'Check format and channel rules before release',
        steps: [
          'Open the FO4 Texture Guide tab',
          'Confirm format selection in the Quick Format Picker for each texture type',
          'Verify channel conventions match your shader pipeline (vanilla vs CShaders PBR)',
          'Check the Common Mistakes list before packaging',
        ],
      },
    ],
    tutorialSections: [
      'DDS Converter (BC1/BC3/BC4/BC5/BC7)',
      'Texture Generator (PBR & Procedural)',
      'Image Studio (PBR Map Prep)',
      'FO4 Texture Guide (Formats, Channels, Mipmaps)',
      'BGSM Editor (Real Binary Material Flags)',
      'Mat Editor (Node-Based Shader Graph)',
      'Mat Definitions (RMAOS Manifest)',
      'Optimizer (Batch Texture/Mesh/Script Cleanup)',
      'Enhancer (Photo-to-PBR Detail Extraction)',
    ],
    suggestedQuestions: [
      'What DDS format should I use for diffuse vs normal textures?',
      'How do I set up PBR textures for Community Shaders?',
      'Why does my normal map look inverted in FO4?',
      'When should I use BC7 vs DXT5 for specular maps?',
      'What\'s the difference between the BGSM Editor and the Mat Editor?',
      'Why isn\'t the Optimizer cleaning up my meshes?',
      'Does the Enhancer work without Blender installed?',
    ],
  },

  'dds-converter': {
    pageId: 'dds-converter',
    pageName: 'DDS Converter',
    route: '/dds-converter',
    purpose: 'Convert image files to and from DDS format for Fallout 4 textures.',
    features: ['Batch conversion', 'Format selection', 'Mip map generation'],
    controls: [
      { name: 'Convert', type: 'button', description: 'Convert selected images to DDS', whenToUse: 'When preparing textures for the game' },
    ],
    commonMistakes: ['Using wrong compression format for the texture type'],
    guides: [{ title: 'Convert textures to DDS', steps: ['Open DDS Converter', 'Add source images', 'Select format and convert'] }],
    tutorialSections: ['Texture Conversion'],
    suggestedQuestions: ['What DDS format should I use for diffuse textures?'],
  },

  'texture-generator': {
    pageId: 'texture-generator',
    pageName: 'Texture Generator',
    route: '/texture-generator',
    purpose: 'Generate and edit textures for Fallout 4 mods using AI and manual tools.',
    features: ['AI generation', 'Manual editing', 'Template library'],
    controls: [
      { name: 'Generate', type: 'button', description: 'Generate a new texture', whenToUse: 'When creating new mod textures' },
    ],
    commonMistakes: ['Not checking texture dimensions match game requirements'],
    guides: [{ title: 'Generate a texture', steps: ['Open Texture Generator', 'Choose a template or describe the texture', 'Generate and export'] }],
    tutorialSections: ['Texture Creation'],
    suggestedQuestions: ['What resolution should my textures be?'],
  },

  'formid-remapper': {
    pageId: 'formid-remapper',
    pageName: 'FormID Remapper',
    route: '/tools/formid-remapper',
    purpose: 'Remap FormIDs in ESP/ESL/ESM plugins to resolve conflicts.',
    features: ['Conflict detection', 'Automatic remapping', 'Validation'],
    controls: [
      { name: 'Remap', type: 'button', description: 'Remap FormIDs to resolve conflicts', whenToUse: 'When plugins have FormID conflicts' },
    ],
    commonMistakes: ['Remapping without backing up plugins first'],
    guides: [{ title: 'Remap FormIDs', steps: ['Open FormID Remapper', 'Load conflicting plugins', 'Run remap'] }],
    tutorialSections: ['FormID Management'],
    suggestedQuestions: ['When should I remap FormIDs?'],
  },

  'precombine-generator': {
    pageId: 'precombine-generator',
    pageName: 'Precombine Generator',
    route: '/tools/precombine-generator',
    purpose: 'Two-in-one PRP toolset: (1) scan your full MO2 load order and generate a one-click PRP-compatible combined patch for everything; (2) rebuild precombines for a single mod you just built and generate a standalone PRP companion patch for it.',
    features: [
      'Full load order patch - reads MO2 plugins.txt, generates real FO4Edit Pascal script that copies winning overrides and clears XCRI/XCMO for PRP',
      'Single mod workflow - cell scan script, step-by-step Creation Kit precombine rebuild guide, PRP companion patch script',
      'Auto-launch FO4Edit with script if xEdit path is configured',
      'Save scripts to disk for manual use',
    ],
    controls: [
      { name: 'Pick MO2 Profile Folder', type: 'button', description: 'Browse to your active MO2 profile to read plugins.txt', whenToUse: 'Full Load Order tab - start here' },
      { name: 'Generate & Launch FO4Edit', type: 'button', description: 'Write the combined patch script and launch FO4Edit automatically', whenToUse: 'After reviewing your plugin list' },
      { name: 'Browse for Mod File', type: 'button', description: 'Select the ESP/ESM for the single mod you want to process', whenToUse: 'Single Mod tab - start here' },
      { name: 'Run Cell Scan in FO4Edit', type: 'button', description: 'Generate and launch the cell-listing prep script', whenToUse: 'Stage 1 of the single-mod workflow' },
      { name: 'Generate & Save PRP Patch Script', type: 'button', description: 'Generate the standalone PRP companion patch script', whenToUse: 'Stage 3 - after rebuilding precombines in CK' },
    ],
    commonMistakes: [
      'Not loading the full load order in FO4Edit before running the combined patch script',
      'Forgetting to rebuild previs after precombines in Creation Kit',
      'Placing the patch ESP in the wrong load order position - it must be at the very bottom, after PRP',
      'Running the single-mod PRP patch script before finishing the CK precombine rebuild',
    ],
    guides: [{
      title: 'Full Load Order: One-Click PRP Patch',
      steps: [
        'Set FO4Edit path in Settings → Tools → xEdit Path',
        'Open Full Load Order Patch tab',
        'Click Pick MO2 Profile Folder and select your active profile',
        'Review the active plugin list',
        'Click Generate & Launch FO4Edit',
        'Wait for FO4Edit background loading, then let the script run',
        'Save Mossy Combined Patch.esp, enable it at the bottom of MO2 load order',
        'Load PRP before the combined patch',
      ],
    }, {
      title: 'Single Mod: Rebuild Precombines + PRP Patch',
      steps: [
        'Open Single Mod Precombine + PRP tab',
        'Browse for your mod ESP/ESM file and pick your worldspace',
        'Run the Cell Scan script in FO4Edit to list all CELLs your mod touches',
        'Open Creation Kit, load your mod as active file',
        'Go to World → Precombine / Previs → Generate Precombined Data for your worldspace',
        'Wait for CK to finish and save the ESP',
        'Back in Mossy, click Generate & Launch FO4Edit to create YourMod_PRPPatch.esp',
        'Enable YourMod_PRPPatch.esp in MO2 after your mod, with PRP loading before both',
      ],
    }],
    tutorialSections: ['Precombine & Previs', 'PRP Compatibility', 'Load Order Patching'],
    suggestedQuestions: [
      'What is PRP and why do I need a compatibility patch?',
      'How long does precombine generation take in Creation Kit?',
      'What is the correct load order for PRP and my combined patch?',
      'What are XCRI and XCMO and why are they cleared?',
    ],
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
