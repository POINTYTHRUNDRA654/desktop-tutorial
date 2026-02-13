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
    ],
    commonMistakes: [
      'Clicking "Start New Project" when they should open an existing one',
      'Not checking Neural Link status before asking tool-specific questions',
      'Ignoring system health warnings',
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
    ],
    tutorialSections: [
      'Understanding the Interface',
      'The Nexus - Your Home Base',
    ],
    suggestedQuestions: [
      'What does each module card do?',
      'How do I start a new project?',
      'What does Neural Link mean?',
      'Why is my bridge status showing WEB MODE?',
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
      'Code generation',
      'Step-by-step guidance',
      'Chat history with memory',
    ],
    controls: [
      {
        name: 'Clear History Button',
        type: 'button',
        description: 'Deletes all messages in the current chat',
        whenToUse: 'When starting a completely new topic that\'s unrelated to previous conversation',
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
    ],
    tutorialSections: [
      'Chat Interface - Talk to Mossy',
      'Getting Help',
    ],
    suggestedQuestions: [
      'How do I ask good questions?',
      'Can you write code for me?',
      'What should I do if I don\'t understand your answer?',
      'Do you remember our previous conversation?',
    ],
  },
  
  'live-voice': {
    pageId: 'live-voice',
    pageName: 'Live Voice Chat',
    route: '/live',
    purpose: 'Voice-based interaction with Mossy AI',
    features: [
      'Real-time voice conversation',
      'Smart silence detection',
      'Multiple STT/TTS providers',
      'Conversation memory',
      'Visual status indicators',
    ],
    controls: [
      {
        name: 'Microphone Button',
        type: 'button',
        description: 'Turns voice chat on/off',
        whenToUse: 'Click to start listening, click again to stop the session',
      },
      {
        name: 'Mute Button',
        type: 'toggle',
        description: 'Temporarily silences your microphone',
        whenToUse: 'Quick mute during conversation (someone interrupts, phone rings, etc.)',
      },
      {
        name: 'Settings Button',
        type: 'button',
        description: 'Opens voice settings panel',
        whenToUse: 'To configure STT/TTS providers, select microphone, adjust voice settings',
      },
      {
        name: 'STT Provider Dropdown',
        type: 'dropdown',
        description: 'Choose how Mossy hears you (Deepgram, Whisper, Browser)',
        whenToUse: 'In settings - select based on accuracy needs and API key availability',
      },
      {
        name: 'TTS Provider Dropdown',
        type: 'dropdown',
        description: 'Choose Mossy\'s voice quality (OpenAI, ElevenLabs, Browser)',
        whenToUse: 'In settings - select based on desired voice quality and budget',
      },
      {
        name: 'Volume Slider',
        type: 'slider',
        description: 'Controls how loud Mossy speaks',
        whenToUse: 'Adjust if Mossy is too quiet or too loud',
      },
      {
        name: 'Speech Rate Slider',
        type: 'slider',
        description: 'Controls how fast Mossy talks',
        whenToUse: 'Slow down if you\'re following along with instructions, speed up if you\'re experienced',
      },
    ],
    commonMistakes: [
      'Not granting microphone permissions',
      'Interrupting Mossy while she\'s speaking',
      'Expecting instant response (takes 1-2 seconds)',
      'Using voice chat in noisy environment',
      'Not selecting the correct microphone in settings',
    ],
    guides: [
      {
        title: 'First Time Voice Chat Setup',
        steps: [
          'Click the microphone button',
          'Grant microphone permission when browser asks',
          'Say clearly: "Hello Mossy, can you hear me?"',
          'Wait for Mossy to respond',
          'If no response, click Settings and check microphone selection',
        ],
      },
      {
        title: 'Having a Voice Conversation',
        steps: [
          'Click microphone button (it turns red)',
          'Wait for "Listening..." status',
          'Speak your question clearly',
          'Stop talking and wait (Mossy detects silence)',
          'Wait for Mossy to process (avatar turns purple)',
          'Listen to Mossy\'s response (avatar turns bright green)',
          'When avatar returns to listening state, continue conversation',
        ],
      },
    ],
    tutorialSections: [
      'Live Voice Chat - Speak to Mossy',
      'Voice Settings Explained',
    ],
    suggestedQuestions: [
      'Why can\'t Mossy hear me?',
      'How do I make Mossy\'s voice sound more natural?',
      'What\'s the difference between STT providers?',
      'Can I use voice chat offline?',
    ],
  },
  
  'auditor': {
    pageId: 'auditor',
    pageName: 'The Auditor',
    route: '/tools/auditor',
    purpose: 'Validate and analyze mod assets for errors and issues',
    features: [
      'ESP file analysis',
      'NIF file validation',
      'DDS texture checking',
      'Batch folder scanning',
      'Auto-fix for common issues',
      'Detailed error reports',
    ],
    controls: [
      {
        name: 'Select File Button',
        type: 'button',
        description: 'Opens file browser to pick one file to analyze',
        whenToUse: 'When checking a specific ESP, NIF, or DDS file',
      },
      {
        name: 'Select Folder Button',
        type: 'button',
        description: 'Scans entire folder and all compatible files inside',
        whenToUse: 'When checking your whole mod at once',
      },
      {
        name: 'Scan Again Button',
        type: 'button',
        description: 'Re-analyzes current file(s)',
        whenToUse: 'After fixing issues to verify they\'re resolved',
      },
      {
        name: 'Details Button',
        type: 'button',
        description: 'Shows expanded technical information about an issue',
        whenToUse: 'When you need to understand exactly what\'s wrong',
      },
      {
        name: 'Auto-Fix Button',
        type: 'button',
        description: 'Automatically fixes the issue if possible',
        whenToUse: 'For simple fixes like resizing textures (backup files first!)',
      },
      {
        name: 'Ask Mossy Button',
        type: 'button',
        description: 'Opens chat with pre-filled question about specific issue',
        whenToUse: 'When you don\'t understand the issue or how to fix it',
      },
    ],
    commonMistakes: [
      'Ignoring error messages',
      'Using Auto-Fix without backup',
      'Scanning while files are open in other programs',
      'Not understanding the difference between errors and warnings',
      'Trying to fix warnings before fixing errors',
    ],
    guides: [
      {
        title: 'Checking a Single File',
        steps: [
          'Click "Select File" button',
          'Navigate to your file in the browser',
          'Select the file and click "Open"',
          'Wait for analysis to complete',
          'Review results in right panel',
          'Click any issue to see details',
          'Fix issues and click "Scan Again" to verify',
        ],
      },
      {
        title: 'Scanning Your Entire Mod',
        steps: [
          'Click "Select Folder" button',
          'Navigate to your mod folder',
          'Click "Select Folder"',
          'Wait for analysis (can take several minutes)',
          'Files with errors appear at top of list',
          'Fix errors first, then warnings',
          'Use "Export Report" to save issue list',
        ],
      },
    ],
    tutorialSections: [
      'The Auditor - Check Your Files',
      'What The Auditor Checks',
      'Common Auditor Issues and Solutions',
    ],
    suggestedQuestions: [
      'What\'s the difference between errors and warnings?',
      'How do I fix [specific error]?',
      'Should I use Auto-Fix?',
      'What order should I fix issues in?',
    ],
  },
  
  'image-suite': {
    pageId: 'image-suite',
    pageName: 'Image Suite',
    route: '/media/images',
    purpose: 'PBR texture generation and image processing',
    features: [
      'Normal map generation',
      'Roughness map creation',
      'Height map extraction',
      'Metallic map generation',
      'Ambient Occlusion maps',
      'Batch processing',
      'DDS conversion',
    ],
    controls: [
      {
        name: 'Upload Image Button',
        type: 'button',
        description: 'Opens file browser to select source texture',
        whenToUse: 'When starting a new PBR generation or conversion task',
      },
      {
        name: 'Generate PBR Button',
        type: 'button',
        description: 'Creates all PBR maps from source image',
        whenToUse: 'After uploading a diffuse texture to generate full PBR set',
      },
      {
        name: 'Map Type Selector',
        type: 'dropdown',
        description: 'Choose which type of map to generate (Normal, Roughness, etc.)',
        whenToUse: 'When you only need specific map types, not the full set',
      },
      {
        name: 'Save/Download Button',
        type: 'button',
        description: 'Exports generated map(s) to your computer',
        whenToUse: 'After generating maps and being satisfied with preview',
      },
      {
        name: 'Format Selector',
        type: 'dropdown',
        description: 'Choose output format (PNG or DDS)',
        whenToUse: 'Select DDS for game-ready textures, PNG for further editing',
      },
      {
        name: 'DDS Compression Dropdown',
        type: 'dropdown',
        description: 'Choose DDS compression type (BC1, BC3, BC5, BC7)',
        whenToUse: 'When saving as DDS - BC1 for diffuse, BC5 for normal maps',
      },
    ],
    commonMistakes: [
      'Not using power-of-2 dimensions for source images',
      'Using wrong DDS compression (BC1 for normal maps)',
      'Generating PBR from low-quality source image',
      'Not previewing before saving',
      'Forgetting to generate mipmaps for DDS files',
    ],
    guides: [
      {
        title: 'Creating a Normal Map',
        steps: [
          'Click "Upload Image"',
          'Select your diffuse texture',
          'Click "Generate PBR" or select "Normal" from Map Type',
          'Wait for generation (a few seconds)',
          'Preview the result',
          'Adjust intensity if needed',
          'Click "Save" and choose format',
        ],
      },
      {
        title: 'Full PBR Workflow',
        steps: [
          'Start with a high-quality diffuse texture',
          'Upload to Image Suite',
          'Click "Generate PBR" to create all maps',
          'Review each generated map',
          'Save each map with appropriate naming (e.g., _n for normal, _s for specular)',
          'Use BC1 compression for color maps, BC5 for normal maps',
        ],
      },
    ],
    tutorialSections: [
      'Image Suite - Create Textures',
      'PBR Texture Workflow',
    ],
    suggestedQuestions: [
      'What\'s a normal map and why do I need it?',
      'Which DDS compression should I use?',
      'How do I create a full PBR material?',
      'Why does my normal map look weird?',
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
