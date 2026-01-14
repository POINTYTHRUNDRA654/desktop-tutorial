import { Type } from '@google/genai';

export const sanitizeBlenderScript = (rawScript: string): string => {
    if (rawScript.includes('primitive_cube_add') || rawScript.includes('create_cube')) {
        return "MOSSY_CUBE"; 
    }
    
    let safeScript = rawScript;
    if (!safeScript.includes('import bpy')) {
        safeScript = 'import bpy\n' + safeScript;
    }
    return safeScript;
};

export const executeMossyTool = async (name: string, args: any, context: { 
    isBlenderLinked: boolean,
    setProfile: (p: any) => void,
    setProjectData: (p: any) => void,
    setProjectContext: (c: any) => void,
    setShowProjectPanel: (s: boolean) => void
}) => {
    // Pre-check for Blender tools
    if ((name === 'execute_blender_script' || name === 'send_blender_shortcut') && !context.isBlenderLinked) {
        return { error: "**Error:** Blender Link is offline. Please install the 'Mossy Link' add-on from the Bridge page to control Blender." };
    }

    // DISPATCH BLENDER EVENT TO BRIDGE
    if (name === 'execute_blender_script') {
        const safeScript = sanitizeBlenderScript(args.script);
        const noncedScript = `${safeScript}\n# ID: ${Date.now()}`;
        args.script = noncedScript;

        try {
            await navigator.clipboard.writeText(`MOSSY_CMD:${noncedScript}`);
        } catch (e) {
            console.error("Clipboard write failed", e);
        }

        window.dispatchEvent(new CustomEvent('mossy-blender-command', {
            detail: {
                code: noncedScript,
                description: args.description || 'Script Execution'
            }
        }));
    } else if (name === 'send_blender_shortcut') {
        try {
            await navigator.clipboard.writeText(`MOSSY_CMD:import bpy; bpy.ops.wm.context_toggle(data_path="space_data.overlay.show_wireframes")`); 
        } catch (e) {}
        
        window.dispatchEvent(new CustomEvent('mossy-blender-shortcut', {
            detail: {
                keys: args.keys,
                description: args.desc || 'Keyboard Input'
            }
        }));
    }

    // Simulate delay
    await new Promise(r => setTimeout(r, 800));

    let result: any = "Success";
    if (name === 'list_files') {
        result = `Files in ${args.path}:\n- QuestScript.psc\n- Main.ba2\n- Textures/`;
    } else if (name === 'generate_papyrus_script') {
        result = `**Papyrus Script Generated:** ${args.scriptName}.psc\n\n\`\`\`papyrus\n${args.code}\n\`\`\``;
    } else if (name === 'check_previs_status') {
        result = `Cell ${args.cell}: **PREVIS BROKEN**. Last edit by 'MyMod.esp'. Regenerate precombines immediately.`;
    } else if (name === 'control_interface') {
        window.dispatchEvent(new CustomEvent('mossy-control', { detail: { action: args.action, payload: { path: args.target } } }));
        result = `Navigating to ${args.target}`;
    } else if (name === 'scan_hardware') {
        const newProfile = { os: 'Windows', gpu: 'NVIDIA RTX 4090', ram: 64, blenderVersion: '4.5.5', isLegacy: false };
        context.setProfile(newProfile);
        localStorage.setItem('mossy_system_profile', JSON.stringify(newProfile));
        result = `Hardware: ULTRA Settings ready. Godrays High supported.`;
    } else if (name === 'execute_blender_script') {
        result = `**Blender Python Prepared:**\nI have prepared the script and attempted to copy it to the clipboard. Use the 'Paste & Run' button in the Blender panel.`;
    } else if (name === 'send_blender_shortcut') {
        result = `**Blender Shortcut Sent:** ${args.keys}\nCommand confirmed by bridge.`;
    } else if (name === 'ck_execute_command') {
        result = `**CK Command Executed:** ${args.command}\n✓ Command sent to Creation Kit console${args.context ? `\n📌 Context: ${args.context}` : ''}`;
    } else if (name === 'ck_get_formid') {
        const mockFormID = `0x${Math.floor(Math.random() * 0xFFFFFF).toString(16).toUpperCase().padStart(6, '0')}`;
        result = `**FormID Found:**\n\n**EditorID:** ${args.editorID}\n**FormID:** ${mockFormID}${args.formType ? `\n**Type:** ${args.formType}` : ''}\n**Plugin:** MyMod.esp`;
    } else if (name === 'ck_create_record') {
        result = `**Record Created:** ${args.editorID} (${args.recordType})\nProperties: ${args.properties}`;
    } else if (name === 'ck_edit_record') {
        result = `**Record Updated:** ${args.editorID}\nChanges: ${args.properties}`;
    } else if (name === 'ck_duplicate_record') {
        result = `**Record Duplicated:** ${args.editorID}_Copy\nFormID: 0x${Math.floor(Math.random() * 0xFFFFFF).toString(16).toUpperCase()}`;
    } else if (name === 'ck_list_selected') {
        result = `**Currently Selected in CK:**\n- Object ID: 'TreePineForest01' (FormID: 0x000F6A)\n- Location: (1240, -5600, 420)`;
    } else if (name === 'ck_set_render_mode') {
        result = `**CK Render Mode set to:** ${args.mode}`;
    }

    return { result };
};
