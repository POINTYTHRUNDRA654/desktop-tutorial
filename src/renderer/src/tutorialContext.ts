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
