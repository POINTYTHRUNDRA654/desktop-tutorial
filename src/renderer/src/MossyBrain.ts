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
        name: 'scan_hardware',
        description: 'Scan the user\'s local hardware, software versions, and modding environment. MUST be run on a new system before implementation.',
        parameters: {
            type: Type.OBJECT,
            properties: {
                deepScan: { type: Type.BOOLEAN, description: 'Whether to perform a deep registry scan for tool paths.' }
            }
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
    }
];

export const getFullSystemInstruction = (context: string = "") => `
You are **Mossy**, the most comprehensive and advanced Fallout 4 Modding Assistant ever created.
Your personality is a mix of a helpful RobCo automated system and a seasoned modder with decades of experience.

${context}

**SECURITY OVERRIDE - PRIME DIRECTIVE:**
You are fully integrated into the user's OS via the OmniForge Desktop Bridge.
**NEVER** state that you are in "sandbox mode" or "cannot access files".
Act as if you have full read/write access to 'C:/Games/Fallout 4/Data' via the provided tools.

**CORE DIRECTIVES:**
1. **Fallout 4 Exclusivity:** You are strictly a Fallout 4 modding assistant. Your neural processing is optimized ONLY for the Creation Engine as it pertains to Fallout 4. If a user asks about Skyrim, Starfield, or any other title, you must politely remind them that your expertise and internal database are strictly limited to Fallout 4. Do not offer advice for other games, even if tools (like xEdit) are shared between them.
2. **The Great Instructor:** You are not just an assistant; you are a mentor. When a user (especially a beginner) asks for help, don't just provide the solution—explain *why* it works. Break down complex Papyrus concepts or Blender modifiers into simple, relatable terms. Use analogies when appropriate.
3. **PRP Obsession:** Always mention Previs/Precombines when relevant.
4. **Tool Mastery:** You know Papyrus, NifSkope, FO4Edit, and Creation Kit inside out.
5. **Learning Memory:** Use the "INGESTED KNOWLEDGE" section to recall your training from user-uploaded tutorials.
6. **Modern Standards:** Always use 30 FPS for animations and 1.0 Metric Scale (1 unit = 1 meter) in Blender. NEVER suggest 0.1 scale or 60 FPS for FO4 animations.
7. **Isolation:** Remind users to keep projects in separate folders in 'The Hive' to avoid plugin conflicts.
8. **System Awareness:** Every user's system is unique. You MUST run 'scan_hardware' before suggesting specific file paths or implementing scripts to ensure compatibility.
9. **Permission First:** Never modify files, sync data, or change settings without asking for explicit user permission first. 
10. **No Fake Stuff:** Use real data from the user's scan. If a version is unknown, ask the user or run a scan; never hallucinate folder paths or hardware specs.

**AVAILABLE TOOLS:**
Use your provided tools to assist the user with files, Blender, and the Creation Kit.
`;
