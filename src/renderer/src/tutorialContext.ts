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
      | 'input/button';
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
    purpose: 'Central dashboard showing all 22 platforms via Quick Hub Access grid, live health badges, and FO4 beginner steps',
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
      'Missing the Ctrl+K command palette for fast navigation across all 22 platforms',
      'Clicking "Help" and expecting it to open external docs — it opens the in-app FO4 Knowledge Hub',
      'Not checking the UPLINK badge before expecting local tool integrations to work',
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
          'Or use the sidebar on the left — all 22 platforms are listed there',
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
      'Quick FO4 prompt chips (load order, ESL, BA2, FOMOD, precombines, DDS formats, crash triage, etc.)',
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
          'Open Settings → Local AI → Export Training Data to download the JSONL file',
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
    visualGuidePage: 39,
    route: '/runtime-hub',
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
          'Deepgram/remote STT can occasionally fail – Mossy will now automatically fall back to browser/Whisper if errors recur',
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
    visualGuidePage: 22,
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
    pageName: 'Image Studio',
    visualGuidePage: 35,
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
    visualGuidePage: 20,
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
    visualGuidePage: 27,
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
    visualGuidePage: 29,
    route: '/runtime-hub',
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
    pageName: 'FO4 Packaging & Release',
    visualGuidePage: 12, // synced from VISUAL_GUIDE.md
    route: '/packaging-release',
    purpose: 'Unified FO4 release pipeline for packaging and validation: BA2 archive prep, release checklist, conflict analysis, mod comparison, and FOMOD installer export.',
    features: [
      'Five-step consolidated workflow in one hub (BA2, checklist, conflicts, comparison, assembler)',
      'BA2 Archive Manager for listing, extracting, packing, and merging BA2 files',
      'Packaging checklist wizard for release readiness and distribution sanity checks',
      'Conflict analysis for visualizing mod conflicts before shipping',
      'Mod comparison tooling for compatibility checks against similar mods',
      'FOMOD installer assembly and export as the release packaging finalization step',
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
        whenToUse: 'Use as the final packaging stage before test install and publication',
      },
    ],
    commonMistakes: [
      'Skipping BA2 validation and shipping broken or incomplete archives',
      'Running checklist but skipping conflict/comparison validation',
      'Publishing without test-installing the exported package/FOMOD',
      'Packaging with debug/dev artifacts still included',
      'Ignoring section deep-links and reopening the wrong stage in long sessions',
    ],
    guides: [
      {
        title: 'FO4 Packaging & Release End-to-End',
        steps: [
          'Open /packaging-release and start with Step 0 BA2 Archive Manager',
          'Run Step 1 Packaging Checklist to validate release structure and required files',
          'Use Step 2 Conflict Analysis to detect compatibility issues',
          'Use Step 3 Mod Comparison for overlap/risk review against similar mods',
          'Build Step 4 FOMOD Installer, export package, then perform a clean test install',
        ],
      },
    ],
    tutorialSections: [
      'Step 0: BA2 Archive Manager',
      'Step 1: Packaging Checklist',
      'Step 2: Conflict Analysis',
      'Step 3: Mod Comparison',
      'Step 4: FOMOD Installer',
    ],
    suggestedQuestions: [
      'When should I use BA2 merge vs pack in this release flow?',
      'What order should I run checklist, conflicts, and comparison before publishing?',
      'How do I validate my FOMOD installer before Nexus release?',
      'Can I deep-link directly to a packaging step with ?section= ?',
    ],
  },

  'learning-hub': {
    pageId: 'knowledge-hub',
    pageName: 'FO4 Knowledge Hub',
    visualGuidePage: 8,
    route: '/knowledge-hub',
    purpose: 'Unified FO4 knowledge workspace for quick references, semantic search, and community learning notes.',
    features: [
      'Three-tab layout: Quick Reference, Knowledge Search, and Community Learning',
      'Tab selection persists for the session via sessionStorage key `knowledge_hub_tab`',
      'Quick Reference for Papyrus, FormIDs, and practical FO4 cheatsheets',
      'Knowledge Search for semantic retrieval and indexed in-app docs',
      'Community Learning for shared tips and curated knowledge',
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
    ],
    guides: [
      {
        title: 'Using FO4 Knowledge Hub efficiently',
        steps: [
          'Open FO4 Knowledge Hub from the sidebar (`/knowledge-hub`)',
          'Start in Quick Reference for immediate command/record lookups',
          'Switch to Knowledge Search for deeper indexed documentation queries',
          'Use Community Learning for implementation tips and workflow ideas',
          'Return later and confirm your previous tab restores automatically',
        ],
      },
    ],
    tutorialSections: [
      'FO4 Knowledge Hub Overview',
      'Quick Reference + Search + Community Tabs',
      'Tab Persistence Behavior',
    ],
    suggestedQuestions: [
      'Which tab should I use for fast FO4 lookup vs deep search?',
      'Why did the hub reopen on the same tab I used earlier?',
      'Where can I find in-app FO4 references before asking chat?',
      'How do I search indexed knowledge from this hub?',
    ],
  },

  'settings': {
    pageId: 'settings',
    pageName: 'Settings',
    visualGuidePage: 41,
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
    pageName: 'Mod Projects',
    visualGuidePage: 7,
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
          'Open the project and add 1–3 small steps to get started',
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
    visualGuidePage: 26,
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
    visualGuidePage: 16, // synced from VISUAL_GUIDE.md
    route: '/system-hub',
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
    visualGuidePage: 18,
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
    visualGuidePage: 10, // synced from VISUAL_GUIDE.md
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
    ],
  },

  'ck-tools': {
    pageId: 'ck-tools',
    pageName: 'FO4 Creation Kit Hub',
    visualGuidePage: 44,
    route: '/ck-tools',
    purpose: 'Unified Creation Kit workspace for safety checks, extension tooling, and an embedded FO4 CK reference guide.',
    features: [
      'Three-tab consolidated workflow: CK Safety, CK Extension, FO4 CK Guide',
      'Session tab persistence via sessionStorage (restores last active tab)',
      'Deep-link support with query param routing (/ck-tools?tab=safety|extension|guide)',
      'Embedded FO4 Creation Kit reference: crash causes, best practices, Papyrus tips, and ESL/FormID rules',
      'Integrated tool references for CK Platform Extended, Buffout 4, CLASSIC, xEdit, and related utilities',
    ],
    controls: [
      {
        name: 'CK Safety Tab',
        type: 'button',
        description: 'Opens crash-prevention and validation workflows for CK editing stability',
        whenToUse: 'Use first when preparing a CK session or troubleshooting reproducible editor/game crashes',
      },
      {
        name: 'CK Extension Tab',
        type: 'button',
        description: 'Opens extension utilities for auto-save and script-compilation support',
        whenToUse: 'Use while actively authoring to reduce data loss risk and keep compile loops consistent',
      },
      {
        name: 'FO4 CK Guide Tab',
        type: 'button',
        description: 'Shows in-app CK reference content (pitfalls, practices, tooling, ESL/FormID quick reference)',
        whenToUse: 'Use when confirming workflow rules before editing cells, navmesh, scripts, or load-order dependencies',
      },
      {
        name: 'Tab Memory Restore',
        type: 'button',
        description: 'Remembers and restores your last active CK hub tab in-session',
        whenToUse: 'Use when returning to CK work and you want to continue exactly where you left off',
      },
      {
        name: 'Deep Link Tab Query',
        type: 'button',
        description: 'Directly opens a specific tab using URL query (e.g., ?tab=extension)',
        whenToUse: 'Use for support handoff links or repeat workflows that should start on a specific tab',
      },
    ],
    commonMistakes: [
      'Editing CK data without first checking safety/crash prevention guidance',
      'Skipping extension setup and losing progress during unstable CK sessions',
      'Ignoring master/plugin dependency order before script or cell edits',
      'Treating the FO4 CK Guide as optional and missing ESL/FormID or precombine rules',
    ],
    guides: [
      {
        title: 'Start with CK Safety before editing',
        steps: [
          'Open FO4 Creation Kit Hub and select the CK Safety tab',
          'Run through crash-prevention checks and confirm your working profile is stable',
          'Only then move into active CK editing tasks',
        ],
      },
      {
        title: 'Use CK Extension during active authoring',
        steps: [
          'Switch to the CK Extension tab',
          'Configure auto-save and script-compilation helpers for your current project',
          'Keep extension support active while iterating on scripts/cell edits',
        ],
      },
      {
        title: 'Reference FO4 CK Guide for release-safe workflows',
        steps: [
          'Open the FO4 CK Guide tab before packaging/releasing edits',
          'Validate ESL/FormID boundaries, crash-risk patterns, and toolchain prerequisites',
          'Apply the checklist to final QA before handing off to packaging/load-order stages',
        ],
      },
    ],
    tutorialSections: [
      'CK Safety (Crash Prevention)',
      'CK Extension (Auto-save & Script Compile)',
      'FO4 CK Guide (Best Practices & Tooling)',
    ],
    suggestedQuestions: [
      'When should I use CK Safety versus CK Extension?',
      'How do I deep-link directly to the CK Extension tab?',
      'What does the FO4 CK Guide cover before release?',
      'Why does the CK hub reopen on the last tab I used?',
    ],
  },

  'blueprint': {
    pageId: 'blueprint',
    pageName: 'The Blueprint',
    visualGuidePage: 21,
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
          'Run Diagnostics/Tools Verify if the project doesn’t behave as expected',
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
    visualGuidePage: 25,
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
    visualGuidePage: 30,
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
    visualGuidePage: 38,
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
    visualGuidePage: 17,
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
    visualGuidePage: 18,
    route: '/mod-builder',
    purpose: 'FO4 Mod Builder Hub unifies the authoring workflow for planning a mod, working with project files, generating scripts, and producing documentation inside one four-tab workspace.',
    features: [
      'Four-tab workflow: Blueprint, Workshop, Devtools, and Scribe',
      'Session tab persistence via `builder_hub_tab` so the last active tab restores automatically',
      'Lazy-loaded panels keep heavyweight builder tools responsive inside the unified hub',
      'Combines planning, file/compile workflows, script tooling, and documentation authoring in one route',
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
        description: 'Opens the Papyrus/script tooling workspace',
        whenToUse: 'Switch here for script generation, analysis, or iteration on developer-focused tooling',
      },
      {
        name: 'Scribe tab',
        type: 'tab',
        description: 'Loads the documentation authoring workspace',
        whenToUse: 'Use after planning/building to write guides, notes, changelogs, or release-facing documentation',
      },
    ],
    commonMistakes: [
      'Treating the hub as a single page instead of switching to the tab that matches your current task',
      'Skipping Blueprint and jumping straight into implementation without defining structure first',
      'Forgetting that the active tab is persisted in session storage under `builder_hub_tab`',
      'Packaging directly from builder steps without reviewing Packaging & Release afterward',
    ],
    guides: [
      {
        title: 'Plan to implementation workflow',
        steps: [
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
          'If the wrong tab opens, switch to the correct workspace manually',
          'Continue the workflow from the appropriate stage rather than duplicating work in the wrong tab',
        ],
      },
    ],
    tutorialSections: [
      'FO4 Mod Builder Hub - Four Tab Workflow',
      'Blueprint, Workshop, Devtools & Scribe',
    ],
    suggestedQuestions: [
      'Which Mod Builder tab should I use first for a new Fallout 4 mod?',
      'What is the difference between Blueprint, Workshop, Devtools, and Scribe?',
      'Why did Mod Builder reopen on the same tab as last time?',
      'When should I move from Mod Builder to Packaging & Release?',
    ],
  },

  'asset-analysis': {
    pageId: 'asset-analysis',
    pageName: 'FO4 Asset Analysis Hub',
    visualGuidePage: 19,
    route: '/asset-analysis',
    purpose: 'FO4 Asset Analysis Hub centralizes quality workflows for Fallout 4 assets: mining dependency data, conflict/performance analysis, duplicate reduction, and in-app optimization guidance.',
    features: [
      'Four-tab workflow: Mining Dashboard, Advanced Analysis, Asset Deduplicator, and FO4 Asset Guide',
      'Session tab persistence via `asset_hub_tab` so the last active tab restores automatically',
      'Lazy-loaded analysis panels for heavy workflows while keeping the hub responsive',
      'Unified QA flow from scan/mining insights to dedupe cleanup and optimization reference',
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
        name: 'Asset Deduplicator tab',
        type: 'tab',
        description: 'Opens duplicate detection and consolidation workflow',
        whenToUse: 'Switch here when reducing repeated assets and trimming VRAM/storage waste',
      },
      {
        name: 'FO4 Asset Guide tab',
        type: 'tab',
        description: 'Built-in Fallout 4 reference covering budgets, conflicts, and optimization practices',
        whenToUse: 'Use as the authoritative in-app reference while triaging and fixing asset issues',
      },
    ],
    commonMistakes: [
      'Only running one tab workflow and missing issues visible in the other analysis tabs',
      'Skipping deduplication after analysis, leaving avoidable VRAM and archive bloat',
      'Forgetting that active tab state persists in session storage under `asset_hub_tab`',
      'Treating guide recommendations as optional when troubleshooting severe performance conflicts',
    ],
    guides: [
      {
        title: 'End-to-end asset QA pass',
        steps: [
          'Open Mining Dashboard to map plugin/assets and identify suspicious hotspots',
          'Switch to Advanced Analysis to inspect conflicts, memory pressure, and performance warnings',
          'Use Asset Deduplicator to consolidate repeated files and reduce runtime overhead',
          'Review FO4 Asset Guide thresholds before final packaging and release checks',
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
      'Mining, Analysis, Deduplication & FO4 Guide',
    ],
    suggestedQuestions: [
      'Which tab should I start with in FO4 Asset Analysis Hub?',
      'When do I use Mining Dashboard versus Advanced Analysis?',
      'How does Asset Deduplicator help with VRAM and archive size?',
      'Why does FO4 Asset Analysis Hub reopen on the previous tab?',
    ],
  },

  'workflow-runner': {
    pageId: 'workflow-runner',
    pageName: 'FO4 Automation Runner',
    visualGuidePage: 28,
    route: '/dev/workflow-runner',
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
    visualGuidePage: 39,
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
    visualGuidePage: 37,
    route: '/runtime-hub',
    purpose: 'Local system bridge that connects Mossy (renderer) to OS tools, editors, and runtime services — exposes drivers, hardware info, file/clipboard access, and special integrations (Blender, CK, xEdit).',
    features: [
      'Bridge heartbeat & connection status (online/offline)',
      'Driver detection with versions, permissions and latency',
      'System & hardware scanning (GPU/CPU/drivers)',
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
        name: 'Drivers Panel',
        type: 'list',
        description: "View detected drivers (Windows Shell, FS watcher, xEdit, CK, etc.) with status, version and permissions",
        whenToUse: 'Confirm required tool drivers are active before running workflows',
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

  'guides-hub': {
    pageId: 'guides-hub',
    pageName: 'FO4 Guides Hub',
    visualGuidePage: 12,
    route: '/guides-hub',
    purpose: 'Three-tab consolidated guide hub covering the three deepest FO4 mod authoring disciplines: Animation & Rigging, Quest Authoring, and LOD & Precombine.',
    features: [
      'Three-tab layout: Animation & Rigging, Quest Authoring, LOD & Precombine',
      'Tab selection persists for the session via sessionStorage key `guides_hub_tab`',
      'Animation & Rigging — full Blender + Havok pipeline (skeleton, weights, FBX export, HKX conversion)',
      'Quest Authoring — CK + Papyrus + F4SE workflow from smoke test to release',
      'LOD & Precombine — xLODGen + DynDOLOD + PRP end-to-end generation and validation',
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
    ],
    suggestedQuestions: [
      'Which Guides Hub tab covers Blender FBX to HKX conversion?',
      'How do I start a quest smoke test in the CK?',
      'What is the correct order for LOD generation and PRP precombine rebuilds?',
      'How do I switch between Animation, Quest, and LOD guides without losing my place?',
    ],
  },

  'blender-animation-guide': {
    pageId: 'blender-animation-guide',
    pageName: 'Animation Guide',
    visualGuidePage: 13, // synced from VISUAL_GUIDE.md
    route: '/guides-hub',
    purpose: 'End-to-end Fallout 4 animation pipeline: skeleton import, rigging, authoring, FBX export and HKX conversion, validation and in‑game testing.',
    features: [
      'Reference & skeleton import (preserve vanilla bone names)',
      'Rigging & weight painting checklists',
      'Authoring best practices (FPS, root handling, looping)',
      'FBX export guidance and Havok (FBX → HKX) conversion notes',
      'Animation Validator + common error troubleshooting',
      'Embedded helper panels (skeleton reference, export settings, rigging gallery, Havok guides)',
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
    ],
  },

  // pageName: 'Quest Mod Authorizing', (parity helper)
  'quest-authoring-guide': {
    pageId: 'quest-authoring-guide',
    pageName: 'Quest Authoring Guide (Quest Mod Authorizing)', // VISUAL_GUIDE title: Quest Mod Authorizing
    route: '/guides-hub',
    purpose: 'Authoritative Creation Kit hub: install/verify CK toolchain, author quests & dialogue, manage leveled lists, precombine exteriors, validate, and publish.',
    features: [
      'Tools & install verification (CK, FO4Edit, mod manager, Archive2)',
      'Minimal Working Quest (first test loop) to prove the toolchain',
      'Dialogue authoring wizard and scene tips',
      'Leveled-list injection guidance and safety checks',
      'Precombine / PRP rebuild checklist and helper utilities',
      'Papyrus scripting patterns, logging and debug workflows',
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
          'Adjust sliders gradually (5–10% increments)',
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
    route: '/system-hub',
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
    visualGuidePage: 23,
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
    visualGuidePage: 33,
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
    visualGuidePage: 5,
    route: '/journey-hub',
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
    visualGuidePage: 31,
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
    visualGuidePage: 32,
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
    visualGuidePage: 4,
    route: '/journey-hub',
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
  'whats-new': {
    pageId: 'whats-new',
    pageName: "FO4 What's New", // VISUAL_GUIDE title: What's New
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
    visualGuidePage: 24,
    route: '/tools/analysis',
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
    visualGuidePage: 34,
    route: '/local',
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
    visualGuidePage: 39,
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
    visualGuidePage: 40,
    route: '/tools/verify',
    purpose: 'Verify configured tool paths and versions (Creation Kit, Blender, MO2, xEdit).',
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
    visualGuidePage: 53,
    route: '/tours',
    purpose: 'Curated guided tours through common workflows and multi-step tutorials.',
    features: [
      'Step-by-step tours',
      'Progress saved',
    ],
    controls: [
      { name: 'Start Tour', type: 'button', description: 'Begin a guided tour', whenToUse: 'When learning a new workflow' },
    ],
    commonMistakes: [
      'Skipping steps in a tour',
    ],
    guides: [
      { title: 'Start a guided tour', steps: ['Open Guided Tours', 'Pick a tour and click Start'] },
    ],
    tutorialSections: [
      'Tours & Walkthroughs',
    ],
    suggestedQuestions: [
      'How long does a guided tour take?',
    ],
  },

  'fallout4-wiki': {
    pageId: 'fallout4-wiki',
    pageName: 'Fallout 4 Wiki (Reference)',
    visualGuidePage: 52,
    route: '/reference/wiki',
    purpose: 'Quick links and reference to community and official Fallout 4 resources.',
    features: [
      'External links',
      'Search shortcuts',
    ],
    controls: [
      { name: 'Open Wiki', type: 'button', description: 'Open the Fallout 4 Wiki link', whenToUse: 'When looking up game data' },
    ],
    commonMistakes: [
      'Relying on outdated wiki pages',
    ],
    guides: [
      { title: 'Open wiki reference', steps: ['Open Fallout 4 Wiki page', 'Use search to find the entry you need'] },
    ],
    tutorialSections: [
      'External Reference Links',
    ],
    suggestedQuestions: [
      'Where can I find physics/animation references?',
    ],
  },

  'pip-boy-mode': {
    pageId: 'pip-boy-mode',
    pageName: 'Pip‑Boy Mode',
    visualGuidePage: 54,
    route: '/pip-boy',
    purpose: 'Toggle the Pip‑Boy UI mode for an immersive, game-like view of Mossy.',
    features: [
      'Pip‑Boy theme',
      'Compact HUD',
    ],
    controls: [
      { name: 'Toggle Pip‑Boy', type: 'toggle', description: 'Enable or disable pip‑boy mode', whenToUse: 'When you want the compact, themed UI' },
    ],
    commonMistakes: [
      'Expecting full feature parity with standard UI in Pip‑Boy mode',
    ],
    guides: [
      { title: 'Enable Pip‑Boy mode', steps: ['Open Settings → Appearance', 'Enable Pip‑Boy Mode', 'Restart UI if required'] },
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
    visualGuidePage: 9,
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
    visualGuidePage: 11,
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
    visualGuidePage: 15,
    route: '/guides-hub',
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
    visualGuidePage: 16,
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
    visualGuidePage: 19,
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

  'ck-extensions': {
    pageId: 'ck-extensions',
    pageName: 'CK Extensions',
    visualGuidePage: 44,
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
    visualGuidePage: 45,
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
    visualGuidePage: 46,
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
    visualGuidePage: 47,
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
    visualGuidePage: 48,
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
    visualGuidePage: 49,
    route: '/textures',
    purpose: 'Unified platform for all texture and material work in Fallout 4 modding — DDS conversion, procedural generation, image processing, and an embedded FO4 texture reference guide.',
    features: [
      'Four-tab consolidated workflow: DDS Converter, Texture Generator, Image Studio, FO4 Texture Guide',
      'Session tab persistence via sessionStorage (restores last active tab)',
      'Embedded FO4 Texture Guide: format picker, channel conventions (BC1/BC3/BC5/BC7), mipmap rules, PBR pipeline notes, and common mistakes',
      'Lazy-loaded tool panels for fast startup',
      'DDS Converter: batch BC1/BC3/BC5/BC7 conversion with mipmap control',
      'Texture Generator: PBR and procedural texture generation',
      'Image Studio: PBR map prep, format conversion, preview',
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
      'DDS Converter (BC1/BC3/BC5/BC7)',
      'Texture Generator (PBR & Procedural)',
      'Image Studio (PBR Map Prep)',
      'FO4 Texture Guide (Formats, Channels, Mipmaps)',
    ],
    suggestedQuestions: [
      'What DDS format should I use for diffuse vs normal textures?',
      'How do I set up PBR textures for Community Shaders?',
      'Why does my normal map look inverted in FO4?',
      'When should I use BC7 vs DXT5 for specular maps?',
    ],
  },

  'dds-converter': {
    pageId: 'dds-converter',
    pageName: 'DDS Converter',
    visualGuidePage: 49,
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
    visualGuidePage: 50,
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
    visualGuidePage: 54,
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
    visualGuidePage: 55,
    route: '/tools/precombine-generator',
    purpose: 'Two-in-one PRP toolset: (1) scan your full MO2 load order and generate a one-click PRP-compatible combined patch for everything; (2) rebuild precombines for a single mod you just built and generate a standalone PRP companion patch for it.',
    features: [
      'Full load order patch – reads MO2 plugins.txt, generates real FO4Edit Pascal script that copies winning overrides and clears XCRI/XCMO for PRP',
      'Single mod workflow – cell scan script, step-by-step Creation Kit precombine rebuild guide, PRP companion patch script',
      'Auto-launch FO4Edit with script if xEdit path is configured',
      'Save scripts to disk for manual use',
    ],
    controls: [
      { name: 'Pick MO2 Profile Folder', type: 'button', description: 'Browse to your active MO2 profile to read plugins.txt', whenToUse: 'Full Load Order tab – start here' },
      { name: 'Generate & Launch FO4Edit', type: 'button', description: 'Write the combined patch script and launch FO4Edit automatically', whenToUse: 'After reviewing your plugin list' },
      { name: 'Browse for Mod File', type: 'button', description: 'Select the ESP/ESM for the single mod you want to process', whenToUse: 'Single Mod tab – start here' },
      { name: 'Run Cell Scan in FO4Edit', type: 'button', description: 'Generate and launch the cell-listing prep script', whenToUse: 'Stage 1 of the single-mod workflow' },
      { name: 'Generate & Save PRP Patch Script', type: 'button', description: 'Generate the standalone PRP companion patch script', whenToUse: 'Stage 3 – after rebuilding precombines in CK' },
    ],
    commonMistakes: [
      'Not loading the full load order in FO4Edit before running the combined patch script',
      'Forgetting to rebuild previs after precombines in Creation Kit',
      'Placing the patch ESP in the wrong load order position – it must be at the very bottom, after PRP',
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
