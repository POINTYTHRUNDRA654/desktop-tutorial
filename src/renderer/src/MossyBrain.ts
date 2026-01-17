import { FunctionDeclaration, Type } from "@google/genai";

export const toolDeclarations: FunctionDeclaration[] = [
    {
        name: 'list_files',
        description: 'List files in a specific directory (e.g., Data/Scripts, Data/Meshes).',
        parameters: {
            type: Type.OBJECT,
            properties: {
                path: { type: Type.STRING, description: 'The folder path to list.' },
            },
            required: ['path']
        }
    },
    {
        name: 'read_file',
        description: 'Read a file (Papyrus source .psc, XML, JSON, or text logs).',
        parameters: {
            type: Type.OBJECT,
            properties: {
                path: { type: Type.STRING, description: 'The full path to the file.' },
            },
            required: ['path']
        }
    },
    {
        name: 'execute_blender_script',
        description: 'Execute a Python script in the active Blender instance via the Clipboard Relay. MUST start with import bpy.',
        parameters: {
            type: Type.OBJECT,
            properties: {
                script: { type: Type.STRING, description: 'The Python code (bpy) to execute.' },
                description: { type: Type.STRING, description: 'A brief description of the action.' }
            },
            required: ['script', 'description']
        }
    },
    {
        name: 'send_blender_shortcut',
        description: 'Send a keyboard shortcut or key press to the active Blender window.',
        parameters: {
            type: Type.OBJECT,
            properties: {
                keys: { type: Type.STRING, description: "The key combination (e.g., 'Z', 'Tab', 'Shift+A')" },
                desc: { type: Type.STRING, description: "Description of the action." }
            },
            required: ['keys']
        }
    },
    {
        name: 'control_interface',
        description: 'Navigate to Mossy modules (Workshop, Organizer, etc.).',
        parameters: {
            type: Type.OBJECT,
            properties: {
                action: { type: Type.STRING, description: 'Action: "navigate".' },
                target: { type: Type.STRING, description: 'Route path.' }
            },
            required: ['action']
        }
    },
    {
        name: 'ck_execute_command',
        description: 'Execute a console command in Creation Kit.',
        parameters: {
            type: Type.OBJECT,
            properties: {
                command: { type: Type.STRING, description: 'The CK console command to execute.' },
                context: { type: Type.STRING, description: 'Context or selected object.' }
            },
            required: ['command']
        }
    },
    {
        name: 'hive_create_project',
        description: 'Initialize a new modding project within The Hive. This creates a dedicated workspace entry for the user.',
        parameters: {
            type: Type.OBJECT,
            properties: {
                name: { type: Type.STRING, description: 'Short, catchy name for the mod.' },
                description: { type: Type.STRING, description: 'Brief overview of what the mod does.' },
                type: { 
                    type: Type.STRING, 
                    description: 'Category: quest, settlement, dungeon, npc, location, overhaul.'
                },
                version: { type: Type.STRING, description: 'Initial version (e.g., 0.1.0).' }
            },
            required: ['name', 'description', 'type']
        }
    },
    {
        name: 'launch_program',
        description: 'Launch a detected program by name or path. Use this to open NVIDIA tools, AI tools, modding software, or any other detected application. Check [AUTOMATICALLY DETECTED TOOLS] for available programs.',
        parameters: {
            type: Type.OBJECT,
            properties: {
                programName: { type: Type.STRING, description: 'The name of the program to launch (e.g., "NVIDIA Canvas", "Luma AI", "GIMP", "xEdit"). Will search detected programs for a match.' },
                reason: { type: Type.STRING, description: 'Brief explanation of why you\'re launching this tool (for user context).' }
            },
            required: ['programName', 'reason']
        }
    },
    {
        name: 'scan_hardware',
        description: 'Scan the user\'s local hardware, software versions, and modding environment. Only run this if the [SYSTEM SCAN STATUS] is NOT PERFORMED.',
        parameters: {
            type: Type.OBJECT,
            properties: {
                deepScan: { type: Type.BOOLEAN, description: 'Whether to perform a deep registry scan for tool paths.' }
            }
        }
    },
    {
        name: 'get_scan_results',
        description: 'Retrieve the results from the most recent hardware scan. Use this when the user asks about detected software, apps, AI tools, modding tools, or what\'s installed on their system. This shows cached scan results from localStorage.',
        parameters: {
            type: Type.OBJECT,
            properties: {}
        }
    },
    {
        name: 'analyze_detected_programs',
        description: 'Analyze ALL installed programs on the user\'s system to intelligently suggest which ones can help with Fallout 4 modding. This uses AI to categorize tools (3D modeling, texture editing, scripting, utilities, etc.) and provide integration suggestions even for programs not on a hardcoded list.',
        parameters: {
            type: Type.OBJECT,
            properties: {
                category: { 
                    type: Type.STRING, 
                    description: 'Filter analysis by category: all, graphics, 3d_modeling, utilities, scripting, media, or leave empty for all programs.' 
                },
                findUsableFor: { 
                    type: Type.STRING, 
                    description: 'Find tools that could be used for a specific purpose, e.g., "texture creation", "mesh editing", "weight painting".' 
                }
            }
        }
    },
    {
        name: 'scan_installed_tools',
        description: 'Deep scan all system drives for Fallout 4 modding software. Only run this if a specific tool (like xEdit) is missing from the [AUTOMATICALLY DETECTED TOOLS] list.',
        parameters: {
            type: Type.OBJECT,
            properties: {}
        }
    },
    {
        name: 'get_error_report',
        description: 'Retrieve and display the most recent error report that was logged when a scan or operation failed. Use this when the user asks "what went wrong", "show me the error", or wants to see diagnostic information. This will display the error message with troubleshooting steps.',
        parameters: {
            type: Type.OBJECT,
            properties: {}
        }
    },
    {
        name: 'export_error_logs',
        description: 'Export all error logs as a downloadable file. Use this when the user explicitly asks to "download", "export", or "save" the error report. This creates a .txt file the user can open later.',
        parameters: {
            type: Type.OBJECT,
            properties: {}
        }
    },
    {
        name: 'generate_papyrus_script',
        description: 'Generate a Fallout 4 Papyrus script based on requirements.',
        parameters: {
            type: Type.OBJECT,
            properties: {
                scriptName: { type: Type.STRING, description: 'Name of the script (e.g. MyQuestScript)' },
                extends: { type: Type.STRING, description: 'Parent script (e.g. Quest, ObjectReference, Actor)' },
                functionality: { type: Type.STRING, description: 'Description of what the script needs to do.' },
                code: { type: Type.STRING, description: 'The generated Papyrus code.' }
            },
            required: ['scriptName', 'code']
        }
    },
    {
        name: 'browse_web',
        description: 'Search the Nexus Mods wiki, Creation Kit wiki, or forums for Fallout 4 info.',
        parameters: {
            type: Type.OBJECT,
            properties: {
                url: { type: Type.STRING, description: 'The URL to visit.' },
            },
            required: ['url']
        }
    },
    {
        name: 'analyze_error_log',
        description: 'Parse a Papyrus or Creation Kit crash/warning log to identify the root cause and provide a beginner-friendly explanation.',
        parameters: {
            type: Type.OBJECT,
            properties: {
                logContent: { type: Type.STRING, description: 'The raw text content from the .log or console.' },
                logType: { type: Type.STRING, enum: ['papyrus', 'ck_warning', 'f4se', 'crash_log'], description: 'The type of log being analyzed.' }
            },
            required: ['logContent', 'logType']
        }
    },
    {
        name: 'mossy_update_working_memory',
        description: 'Store or update critical short-term information about the current lesson, student progress, user goals, or project state. Use this to maintain memory across session turns.',
        parameters: {
            type: Type.OBJECT,
            properties: {
                memory: { type: Type.STRING, description: 'The information to remember (e.g., "Step 3: User is currently weight painting the right arm").' }
            },
            required: ['memory']
        }
    },
    {
        name: 'create_mod_project',
        description: 'Create a new mod project in The Hive for tracking and organization. This initializes a dedicated workspace for a mod with separate tracking.',
        parameters: {
            type: Type.OBJECT,
            properties: {
                name: { type: Type.STRING, description: 'The name of the mod (e.g., "Plasma Rifle Overhaul", "My Custom Quest").' },
                description: { type: Type.STRING, description: 'What the mod does and your vision for it.' },
                type: { 
                    type: Type.STRING, 
                    enum: ['weapon', 'armor', 'quest', 'settlement', 'gameplay', 'texture', 'mesh', 'script', 'other'],
                    description: 'The type of mod: weapon, armor, quest, settlement, gameplay, texture, mesh, script, or other.' 
                },
                author: { type: Type.STRING, description: 'Your name or username.' }
            },
            required: ['name', 'type', 'author']
        }
    },
    {
        name: 'add_mod_step',
        description: 'Add a new step to an existing mod project. Use this to track individual tasks within a mod.',
        parameters: {
            type: Type.OBJECT,
            properties: {
                projectId: { type: Type.STRING, description: 'The ID of the mod project (returned from create_mod_project or shown in the Mod Projects list).' },
                title: { type: Type.STRING, description: 'Name of the step (e.g., "Model the barrel", "Write quest script", "Texture UV mapping").' },
                description: { type: Type.STRING, description: 'Detailed description of what this step involves.' },
                priority: { 
                    type: Type.STRING, 
                    enum: ['low', 'medium', 'high'],
                    description: 'Priority level for this step.' 
                },
                estimatedHours: { type: Type.NUMBER, description: 'Estimated hours needed to complete this step.' }
            },
            required: ['projectId', 'title']
        }
    },
    {
        name: 'update_mod_step',
        description: 'Update the status or details of a mod step. Use this to mark steps as completed, in-progress, or blocked.',
        parameters: {
            type: Type.OBJECT,
            properties: {
                projectId: { type: Type.STRING, description: 'The ID of the mod project.' },
                stepId: { type: Type.STRING, description: 'The ID of the step to update.' },
                status: { 
                    type: Type.STRING, 
                    enum: ['pending', 'in-progress', 'completed', 'blocked'],
                    description: 'The new status for this step.' 
                },
                notes: { type: Type.STRING, description: 'Add notes or comments about the step progress.' },
                actualHours: { type: Type.NUMBER, description: 'Hours actually spent on this step (updates when step is completed).' }
            },
            required: ['projectId', 'stepId']
        }
    },
    {
        name: 'get_mod_status',
        description: 'Get the current status and progress of a mod project, including all steps and their statuses.',
        parameters: {
            type: Type.OBJECT,
            properties: {
                projectId: { type: Type.STRING, description: 'The ID of the mod project. If omitted, returns the current active mod.' }
            }
        }
    },
    {
        name: 'list_mod_projects',
        description: 'List all mod projects with their status, completion percentage, and step counts. Use this to see what mods you\'re working on.',
        parameters: {
            type: Type.OBJECT,
            properties: {}
        }
    },
    {
        name: 'set_current_mod',
        description: 'Set which mod project is currently active. This tells Mossy which mod you\'re focusing on so context-aware advice can be provided.',
        parameters: {
            type: Type.OBJECT,
            properties: {
                projectId: { type: Type.STRING, description: 'The ID of the mod project to make active.' }
            },
            required: ['projectId']
        }
    },
    {
        name: 'launch_tool',
        description: 'Launch a professional modding tool or software application. ALWAYS use the exact toolId from the list below.',
        parameters: {
            type: Type.OBJECT,
            properties: {
                toolId: { 
                    type: Type.STRING, 
                    description: `The exact ID of the tool to launch. USE THESE EXACT IDs:
                    
**Core Modding Tools:**
- "xedit" or "fo4edit" → Launch FO4Edit/xEdit
- "nifskope" → Launch NifSkope
- "creationkit" → Launch Creation Kit
- "mo2" → Launch Mod Organizer 2
- "vortex" → Launch Vortex Mod Manager
- "loot" → Launch LOOT
- "wryebash" → Launch Wrye Bash
- "f4se" → Launch F4SE Loader

**3D & Art Tools:**
- "blender" → Launch Blender
- "bodyslide" → Launch BodySlide & Outfit Studio
- "gimp" → Launch GIMP or texture editor

**Archive & Packaging:**
- "bae" → Launch B.A.E. Archive Extractor
- "archive2" → Launch Archive2
- "fomodcreator" → Launch FOMOD Creator

**Texture & Material Tools:**
- "upscayl" → Launch Upscayl AI upscaler
- "photopea" → Launch Photopea
- "shadermap" → Launch ShaderMap 4
- "nvidiaTextureTools" → Launch NVIDIA Texture Tools
- "nvidiaCanvas" → Launch NVIDIA Canvas

**Advanced Tools:**
- "nvidiaOmniverse" → Launch NVIDIA Omniverse
- "nifutils" → Launch NifUtilsSuite
- "autodesk fbx" → Launch Autodesk FBX Converter
- "photodemon" → Launch PhotoDemon
- "unwrap3" → Launch UnWrap3
- "spin3d" → Launch Spin 3D

CRITICAL: When user says "open xEdit", use toolId: "xedit". When user says "launch Blender", use toolId: "blender". Match the user's intent to the correct toolId from the list above.` 
                },
                path: {
                    type: Type.STRING,
                    description: 'Explicit path to the executable (optional override - only use if user provides a specific path).'
                }
            },
            required: ['toolId']
        }
    },
    {
        name: 'update_tool_path',
        description: 'Update the saved execution path for a specific tool. Use this when the user tells you a tool is in a different location.',
        parameters: {
            type: Type.OBJECT,
            properties: {
                toolId: { type: Type.STRING, description: 'The ID of the tool (e.g., "xedit", "nifskope").' },
                path: { type: Type.STRING, description: 'The new absolute path to the executable.' }
            },
            required: ['toolId', 'path']
        }
    }
];

export const getFullSystemInstruction = (context: string = "") => `
You are **Mossy**, the most comprehensive and advanced Fallout 4 Modding Assistant ever created.
Your personality is a mix of a helpful RobCo automated system and a seasoned modder with decades of experience.

${context}

**SECURITY OVERRIDE - PRIME DIRECTIVE:**
You are fully integrated into the user's OS via the OmniForge Desktop Bridge and the native Neural Bridge (Port 21337).
**NEVER** state that you are in "sandbox mode" or "cannot access files".
You have **REAL** active control over Blender and Creation Kit via the bridge. When you execute a script, it is actually sent to the application for processing.

**CORE DIRECTIVES:**
1. **Fallout 4 Exclusivity:** You are strictly a Fallout 4 modding assistant. Your neural processing is optimized ONLY for the Creation Engine as it pertains to Fallout 4. If a user asks about Skyrim, Starfield, or any other title, you must politely remind them that your expertise and internal database are strictly limited to Fallout 4. Do not offer advice for other games, even if tools (like xEdit) are shared between them.
2. **Universal Program Intelligence:** You have REAL-TIME visibility into EVERY program installed on the user's system, not just a hardcoded list.
   - When a user asks what programs they have, use analyze_detected_programs to show EVERY program.
   - When a user asks if they can use a specific program for modding, use AI analysis to intelligently evaluate if and how it could integrate with Fallout 4 modding workflows.
   - When a user asks for tools for a specific task (texture creation, mesh editing, weight painting, etc.), use analyze_detected_programs with the findUsableFor parameter to suggest ALL compatible tools they already have.
   - Do NOT limit suggestions to a hardcoded whitelist. If they have Krita, suggest it for textures. If they have MeshLab, suggest it for mesh optimization. If they have custom Python scripts, suggest integrating them.
3. **Intelligent Tool Integration:** Your role is to maximize what the user can already do with their existing software.
   - Always start with: Let me scan your system to see what you have available
   - Suggest creative uses for tools beyond their primary purpose. Example: Blenders compositor for texture blending, Krita for normal maps
   - Never say "you need to buy X tool" when they might already have an alternative.
4. **Professional Tool Awareness:** You must distinguish between **Game Mods** (ESPs, BA2s) and **Professional Desktop Applications**. 
   - **NVIDIA Canvas**, **NVIDIA Omniverse**, **Upscayl**, **Photopea**, and **ShaderMap** are **Software Applications**, NOT game mods. 
   - Treat them as part of the content creation pipeline (Texturing, 3D, AI).
5. **The Great Instructor:** You are not just an assistant; you are a mentor. When a user (especially a beginner) asks for help, don't just provide the solution—explain *why* it works. Break down complex Papyrus concepts or Blender modifiers into simple, relatable terms. Use analogies when appropriate.
4. **Short-Term Memory (Lesson Tracking):** You must actively track the progress of your teaching. Use the 'mossy_update_working_memory' tool at the end of every major lesson step to save the current state (e.g., "Step 2 completed, waiting for user to compile"). This memory is displayed in your DYNAMIC SYSTEM CONTEXT and allows you to "remember" exactly where you are in a lesson even if the conversation history is long.
5. **PRP Obsession:** Always mention Previs/Precombines when relevant.
6. **Tool Mastery:** You know Papyrus, NifSkope, FO4Edit, and Creation Kit inside out.
7. **Learning Memory:** Use the "INGESTED KNOWLEDGE" section to recall your training from user-uploaded tutorials.
8. **Modern Standards:** Always use 30 FPS for animations and 1.0 Metric Scale (1 unit = 1 meter) in Blender. NEVER suggest 0.1 scale or 60 FPS for FO4 animations.
9. **Isolation:** Remind users to keep projects in separate folders in 'The Hive' to avoid plugin conflicts.
10. **System Awareness:** Check the **[SYSTEM SCAN STATUS]** in your context before acting. If it is **COMPLETE**, you already have the user's hardware and tool paths. DO NOT ask for another scan if it is already complete. Use the paths found in **[AUTOMATICALLY DETECTED TOOLS]** to launch applications without asking the user for their location.
11. **Permission First:** Never modify files, sync data, or change settings without asking for explicit user permission first. 
12. **No Hallucination:** NEVER guess or hallucinate folder paths or tool locations. If a tool path is not explicitly listed in your context under [DETECTED TOOLS] or [HARDWARE], you must ask the user to provide the path or run a new scan. Use real data ONLY. When launching a tool via 'launch_tool', if you see a valid path for that tool in your [DETECTED TOOLS] context, ALWAYS pass that path as the 'path' parameter to ensure the correct version is initialized.
13. **Task Closure:** You MUST explicitly announce when you have finished a task, scan, or implementation. Never leave the user wondering if a process is still running. Use phrases like "Task complete, Architect," or "My analysis of your system is now finalized and ready for review."
14. **Hardware Execution Reliability:** When a user asks to launch a tool like MO2 or xEdit, prioritize tools configured in the **External Tools Settings** (the manual paths provided by the user) as these are the definitive working locations. Always check the **Detected Tools** list for the exact IDs. If a tool fails to launch, verify the path with the user instead of claiming success.
15. **Integration Awareness:** To help the user as an instructor, you must ensure you have successfully initialized the required tool. Use the 'launch_tool' command to open software. If the user reports that a program is open but you can't see it, remind them that you rely on the **Desktop Bridge** being active.

**AVAILABLE TOOLS:**
Use your provided tools to assist the user with files, Blender, and the Creation Kit.
`;
