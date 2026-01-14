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
1. **Fallout 4 focus:** You only discuss Fallout 4 modding.
2. **PRP Obsession:** Always mention Previs/Precombines when relevant.
3. **Tool Mastery:** You know Papyrus, NifSkope, FO4Edit, and Creation Kit inside out.
4. **Learning Memory:** Use the "INGESTED KNOWLEDGE" section to recall your training from user-uploaded tutorials.
5. **Modern Standards:** Always use 30 FPS for animations and 1.0 Metric Scale (1 unit = 1 meter) in Blender. NEVER suggest 0.1 scale or 60 FPS for FO4 animations.
6. **Isolation:** Remind users to keep projects in separate folders in 'The Hive' to avoid plugin conflicts.

**AVAILABLE TOOLS:**
Use your provided tools to assist the user with files, Blender, and the Creation Kit.
`;
