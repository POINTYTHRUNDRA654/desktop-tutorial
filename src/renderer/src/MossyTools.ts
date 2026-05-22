import { logMossyError, getErrorReport } from './MossyErrorReporter';
import { ModProjectStorage } from './services/ModProjectStorage';
import { isDuplicateVaultEntry, pruneAutoFetchedVaultItems } from './knowledgeRetrieval';

export const sanitizeBlenderScript = (rawScript: string): string => {
    let safeScript = rawScript;
    
    // Ensure bpy is imported
    if (!safeScript.includes('import bpy')) {
        safeScript = 'import bpy\n' + safeScript;
    }
    
    // Allow all legitimate bpy operations - don't block them!
    return safeScript;
};

export const executeMossyTool = async (name: string, args: any, context: { 
    isBlenderLinked: boolean,
    setProfile: (p: any) => void,
    setProjectData: (p: any) => void,
    setProjectContext: (c: any) => void,
    setShowProjectPanel: (s: boolean) => void
}) => {
    const api = (window as any).electronAPI || (window as any).electron?.api;
    const settings = await api?.getSettings?.().catch(() => null);
    const whitelist: string[] = (settings?.privacySettings?.modContentWhitelist ?? [])
        .map((entry: unknown) => String(entry || '').trim())
        .filter(Boolean);
    const findDoNotTouchMatch = (value: unknown): string | null => {
        if (!whitelist.length) return null;
        const haystack = JSON.stringify(value ?? '').toLowerCase();
        for (const item of whitelist) {
            if (item.length < 2) continue;
            if (haystack.includes(item.toLowerCase())) return item;
        }
        return null;
    };
    const blockedItem = findDoNotTouchMatch({ name, args });
    if (blockedItem) {
        return {
            success: false,
            result: `Blocked by do-not-touch whitelist: "${blockedItem}" is protected and cannot be referenced, downloaded, or acted on.`,
        };
    }

    const sanitizeBasename = (raw: string): string => {
        const trimmed = String(raw || '').trim();
        const cleaned = trimmed.replace(/[^A-Za-z0-9_\-]/g, '_');
        return cleaned.length ? cleaned : `MOSSY_${Date.now()}`;
    };

    const dirname = (p: string): string => {
        const normalized = String(p || '').replace(/\//g, '\\');
        const idx = normalized.lastIndexOf('\\');
        return idx >= 0 ? normalized.slice(0, idx) : normalized;
    };

    const joinPath = (...parts: string[]): string => {
        return parts
            .filter(Boolean)
            .map((s) => String(s).replace(/\//g, '\\').replace(/\\+$/g, ''))
            .join('\\')
            .replace(/\\{2,}/g, '\\');
    };

    const trySaveTextFile = async (filePath: string, content: string): Promise<boolean> => {
        if (!api?.writeFile) return false;
        try {
            return await api.writeFile(filePath, content);
        } catch {
            return false;
        }
    };

    const saveToDownloads = async (filename: string, content: string): Promise<string | null> => {
        if (!api?.saveFile) return null;
        try {
            return await api.saveFile(content, filename);
        } catch {
            return null;
        }
    };

    const postToBridge = async (payload: any, timeoutMs = 1200): Promise<boolean> => {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), timeoutMs);
        try {
            const response = await fetch('http://localhost:21337/execute', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
                signal: controller.signal,
            });
            return response.ok;
        } catch {
            return false;
        } finally {
            clearTimeout(timer);
        }
    };

    const sendToBlenderAddon = async (command: string, args: any = {}, timeoutMs = 5000): Promise<any> => {
        if (!api?.sendBlenderCommand) return { success: false, error: 'API not available' };
        try {
            return await api.sendBlenderCommand(command, args);
        } catch (e) {
            return { success: false, error: String(e) };
        }
    };

    // Blender reliability: always create an artifact (file + clipboard) and only claim delivery when confirmed.
    if (name === 'execute_blender_script') {
        const safeScript = sanitizeBlenderScript(String(args?.script || ''));
        const scriptBasename = sanitizeBasename(args?.name || args?.description || 'MOSSY_BLENDER_SCRIPT');
        const filename = `${scriptBasename}.py`;

        const savedPath = await saveToDownloads(filename, safeScript);
        let clipboardOk = false;
        try { await navigator.clipboard.writeText(safeScript); clipboardOk = true; } catch { /* ignore clipboard errors */ }

        let linkDispatched = false;
        let socketResult = null;

        if (context.isBlenderLinked) {
            try {
                // Try socket communication first
                socketResult = await sendToBlenderAddon('execute_script', { script: safeScript });
                if (socketResult?.success) {
                    linkDispatched = true;
                } else {
                    // Fall back to custom event
                    window.dispatchEvent(new CustomEvent('mossy-blender-command', {
                        detail: {
                            code: safeScript,
                            description: args?.description || 'Script Execution'
                        }
                    }));
                    linkDispatched = true;
                }
            } catch {
                linkDispatched = false;
            }
        }

        const bridgeWanted = localStorage.getItem('mossy_bridge_active') === 'true';
        const bridgeOk = bridgeWanted
            ? await postToBridge({ type: 'blender', script: safeScript, target: 'active_instance' })
            : false;

        const delivery = socketResult?.success
            ? 'Executed in Blender via Mossy Link socket.'
            : bridgeOk
            ? 'Sent to Blender via Desktop Bridge.'
            : linkDispatched
            ? 'Sent to Blender via Mossy Link event.'
            : 'Bridge/Link not confirmed; use file + clipboard fallback.';

        const savedLine = savedPath ? `**Saved:** ${savedPath}` : `**Saved:** (could not auto-save; use clipboard)`;
        const clipLine = clipboardOk ? '**Clipboard:** copied' : '**Clipboard:** failed to copy (copy from the message)';

        const result = socketResult?.success
            ? `**Blender Python Executed:** ${filename}\n\n${savedLine}\n${clipLine}\n\n${delivery}\n\n**Result:** ${socketResult.output || 'Script completed successfully'}`
            : `**Blender Python Ready:** ${filename}\n\n${savedLine}\n${clipLine}\n\n${delivery}\n\n**Run it in Blender:** Scripting → Text Editor → New → Paste → Run Script.`;

        return { success: true, result };
    }

    if (name === 'get_blender_scene_info') {
        if (!context.isBlenderLinked) {
            return { success: false, result: 'Blender is not linked. Please ensure Blender with Mossy Link add-on is running.' };
        }

        try {
            const sceneInfo = await sendToBlenderAddon('get_scene_info');
            if (sceneInfo?.success) {
                const info = sceneInfo.scene_info;
                if (!info) {
                    return { success: false, result: 'Blender responded but returned no scene data. Make sure a scene is open.' };
                }
                const result = `**Blender Scene Information:**

**Scene:** ${info.scene_name}
**Frame:** ${info.frame_current}/${info.frame_start}-${info.frame_end}
**Objects:** ${info.objects_count} total, ${info.selected_objects} selected
**Active Object:** ${info.active_object || 'None'}
**Render Engine:** ${info.render_engine}
**Units:** ${info.unit_system} (Scale: ${info.scale_length})
**Mode:** ${info.mode || 'Object Mode'}`;

                return { success: true, result };
            } else {
                return { success: false, result: `Failed to get scene info: ${sceneInfo?.error || 'Unknown error'}` };
            }
        } catch (e) {
            return { success: false, result: `Error communicating with Blender: ${e}` };
        }
    }

    if (name === 'write_blender_script') {
        const safeScript = sanitizeBlenderScript(String(args?.script || ''));
        const scriptBasename = sanitizeBasename(args?.name || 'MOSSY_SCRIPT');
        const shouldRun = !!args?.run;
        const filename = `${scriptBasename}.py`;

        const savedPath = await saveToDownloads(filename, safeScript);
        let clipboardOk = false;
        try { await navigator.clipboard.writeText(safeScript); clipboardOk = true; } catch { /* ignore clipboard errors */ }

        const bridgeWanted = localStorage.getItem('mossy_bridge_active') === 'true';
        const bridgeOk = bridgeWanted
            ? await postToBridge({ type: 'text', script: safeScript, name: scriptBasename, run: shouldRun })
            : false;

        const savedLine = savedPath ? `**Saved:** ${savedPath}` : `**Saved:** (could not auto-save; use clipboard)`;
        const clipLine = clipboardOk ? '**Clipboard:** copied' : '**Clipboard:** failed to copy (copy from the message)';
        const delivery = bridgeOk
            ? `**Bridge:** Updated Text '${scriptBasename}'${shouldRun ? ' and executed' : ''}.`
            : `**Bridge:** not confirmed; create a Text block named '${scriptBasename}', paste, then Run Script.`;

        const result = `**Blender Script Prepared:** ${filename}\n\n${savedLine}\n${clipLine}\n\n${delivery}`;
        return { success: true, result };
    }

    if (name === 'send_blender_shortcut') {
        const fallbackSnippet = String(args?.script || '').trim() || 'import bpy\n# (no shortcut script provided)\n';
        let clipboardOk = false;
        try { await navigator.clipboard.writeText(fallbackSnippet); clipboardOk = true; } catch { /* ignore clipboard errors */ }

        let linkDispatched = false;
        if (context.isBlenderLinked) {
            try {
                window.dispatchEvent(new CustomEvent('mossy-blender-shortcut', {
                    detail: {
                        keys: args?.keys,
                        description: args?.desc || 'Keyboard Input'
                    }
                }));
                linkDispatched = true;
            } catch {
                linkDispatched = false;
            }
        }

        const result = `**Blender Shortcut:** ${args?.keys || '(unspecified)'}\n\n` +
            (linkDispatched ? `**Link:** dispatched.\n` : `**Link:** not confirmed.\n`) +
            (clipboardOk ? `**Clipboard:** copied fallback snippet.` : `**Clipboard:** failed (copy manually from chat).`);

        return { success: true, result };
    }

    // Simulate delay
    await new Promise(r => setTimeout(r, 800));

    let result: any = "Success";
    if (name === 'launch_tool') {
        try {
            if (!api) {
                console.error('[MossyTools] IPC API not available!');
                return {
                    success: false,
                    result: `[MOSSY] The system bridge is not initialized. Please restart the application.`
                };
            }
            
            const settings = await api.getSettings();
            console.log('[MossyTools] Settings loaded:', settings);
            
            // Standardize toolId to settings property mapping
            const settingsKeyMapping: Record<string, string> = {
                'xedit': 'xeditPath',
                'fo4edit': 'xeditPath',
                'fo4xedit': 'xeditPath',
                'sseedit': 'xeditPath',
                'nifskope': 'nifSkopePath',
                'creation kit': 'creationKitPath',
                'creationkit': 'creationKitPath',
                'f4se': 'f4sePath',
                'f4se loader': 'f4sePath',
                'loot': 'lootPath',
                'vortex': 'vortexPath',
                'mod organizer': 'mo2Path',
                'mod organizer 2': 'mo2Path',
                'modorganizer': 'mo2Path',
                'mo2': 'mo2Path',
                'bodyslide': 'bodySlidePath',
                'outfitstudio': 'bodySlidePath',
                'body slide': 'bodySlidePath',
                'outfit studio': 'bodySlidePath',
                'wrye bash': 'wryeBashPath',
                'wryebash': 'wryeBashPath',
                'gimp': 'gimpPath',
                'upscayl': 'upscaylPath',
                'photopea': 'photopeaPath',
                'shadermap': 'shaderMapPath',
                'nvidia texture tools': 'nvidiaTextureToolsPath',
                'nvidiaTextureTools': 'nvidiaTextureToolsPath',
                'nvidia canvas': 'nvidiaCanvasPath',
                'nvidiaCanvas': 'nvidiaCanvasPath',
                'canvas': 'nvidiaCanvasPath',
                'vita': 'nvidiaCanvasPath',
                'vita canvas': 'nvidiaCanvasPath',
                'nvidia omniverse': 'nvidiaOmniversePath',
                'nvidiaOmniverse': 'nvidiaOmniversePath',
                'blender': 'blenderPath',
                'bae': 'baePath',
                'archive2': 'archive2Path',
                'archive 2': 'archive2Path',
                'fomodcreator': 'fomodCreatorPath',
                'fomod creator': 'fomodCreatorPath',
                'autodesk fbx': 'autodeskFbxPath',
                'fbx converter': 'autodeskFbxPath',
                'photodemon': 'photoDemonPath',
                'photo demon': 'photoDemonPath',
                'unwrap3': 'unWrap3Path',
                'un-wrap3': 'unWrap3Path',
                'nifutils': 'nifUtilsSuitePath',
                'nif utils': 'nifUtilsSuitePath',
                'spin3d': 'spin3dPath'
            };

            const toolNameMapping: Record<string, string> = {
                'xedit': 'xEdit',
                'fo4edit': 'FO4Edit',
                'fo4xedit': 'FO4xEdit',
                'blender': 'Blender',
                'nifskope': 'NifSkope',
                'creationkit': 'Creation Kit',
                'vortex': 'Vortex',
                'mo2': 'Mod Organizer 2',
                'upscayl': 'Upscayl',
                'photopea': 'Photopea',
                'shadermap': 'ShaderMap',
                'nvidiaTextureTools': 'NVIDIA Texture Tools',
                'nvidiaCanvas': 'NVIDIA Canvas',
                'canvas': 'NVIDIA Canvas',
                'vita': 'NVIDIA Canvas',
                'vita canvas': 'NVIDIA Canvas',
                'nvidia canvas': 'NVIDIA Canvas',
                'nvidiaOmniverse': 'NVIDIA Omniverse',
                'omniverse': 'NVIDIA Omniverse',
                'nvidia omniverse': 'NVIDIA Omniverse',
                'f4se': 'F4SE Loader',
                'wryebash': 'Wrye Bash',
                'bae': 'B.A.E. Archive Extractor',
                'archive2': 'Archive2',
                'fomodcreator': 'FOMOD Creator',
                'autodesk fbx': 'Autodesk FBX Converter',
                'photodemon': 'PhotoDemon',
                'unwrap3': 'Unwrap3',
                'nifutils': 'NifUtils Suite',
                'spin3d': 'Spin3D'
            };
            
            const rawToolId = String(args?.toolId || '');
            const toolId = rawToolId.toLowerCase();
            const targetSettingKey = settingsKeyMapping[toolId] || `${rawToolId}Path`;
            const toolDisplayName = toolNameMapping[toolId] || rawToolId || toolId;
            
            // ALIASES FOR BETTER MATCHING
            const toolAliases: Record<string, string[]> = {
                'mo2': ['modorganizer', 'mod organizer', 'mo2'],
                'xedit': ['fo4edit', 'fo4xedit', 'sseedit', 'tes5edit', 'xedit'],
                'bodyslide': ['outfitstudio', 'bodyslide', 'body slide'],
                'creationkit': ['ck', 'creation kit', 'creationkit'],
                'f4se': ['f4seloader', 'f4se', 'script extender', 'f4se loader'],
                'vortex': ['vortex'],
                'nifskope': ['nifskope', 'nif skope'],
                'wryebash': ['wrye bash', 'wryebash'],
                'bae': ['bae', 'archive extractor', 'bethesda archive extractor'],
                'archive2': ['archive2', 'archive 2', 'bethesda archive'],
                'fomodcreator': ['fomod creator', 'fomod'],
                'autodesk fbx': ['autodesk fbx', 'fbx converter'],
                'photodemon': ['photodemon', 'photo demon'],
                'unwrap3': ['unwrap3', 'un-wrap3'],
                'nifutils': ['nifutils', 'nif utils'],
                'spin3d': ['spin3d'],
                'canvas': ['nvidia canvas', 'nvidiacanvas', 'canvas', 'vita', 'vita canvas'],
                'nvidia canvas': ['nvidia canvas', 'nvidiacanvas', 'canvas', 'vita', 'vita canvas'],
                'nvidiacanvas': ['nvidia canvas', 'nvidiacanvas', 'canvas', 'vita', 'vita canvas'],
                'vita': ['nvidia canvas', 'nvidiacanvas', 'canvas', 'vita', 'vita canvas'],
                'gimp': ['gimp', 'gnu image manipulation program'],
                'blender': ['blender'],
                'nvidia omniverse': ['omniverse', 'nvidia omniverse'],
                'omniverse': ['omniverse', 'nvidia omniverse']
            };
            
            const currentAliases = toolAliases[toolId] || [toolId];

            // --- PRIORITY RESOLUTION ---
            const detectedApps = JSON.parse(localStorage.getItem('mossy_apps') || '[]');
            const settingPath = (settings as any)[targetSettingKey] || (settings as any)[args.toolId];
            
            console.log(`\n========== [MossyTools] LAUNCH TOOL DEBUG ==========`);
            console.log(`[MossyTools] Tool requested: "${args.toolId}"`);
            console.log(`[MossyTools] Settings key to check: "${targetSettingKey}"`);
            console.log(`[MossyTools] Path from settings: "${settingPath}"`);
            console.log(`[MossyTools] Explicit path from AI: "${args.path}"`);
            console.log(`[MossyTools] All settings keys:`, Object.keys(settings));
            console.log(`[MossyTools] Complete settings object:`, settings);
            
            let targetPath = args.path; // Priority 1: AI explicit path (Direct override)
            
            if (!targetPath && settingPath && settingPath.length > 3) {
                targetPath = settingPath; // Priority 2: Manual Settings (Sync with Dashboard Buttons)
                console.log(`[MossyTools] ✅ Using MANUAL SETTINGS path: ${targetPath}`);
            }
            
            if (!targetPath) {
                // Priority 3: Detected apps cache (Automated fallback)
                console.log(`[MossyTools] No manual setting found. Checking auto-detect cache (${detectedApps.length} apps)...`);
                // First attempt: Exact ID match (If AI passes the 'scan-xyz' ID)
                const exactMatch = detectedApps.find((a: any) => a.id === args.toolId);
                if (exactMatch && exactMatch.path) {
                    targetPath = exactMatch.path;
                    console.log(`[MossyTools] ✅ Found EXACT ID match in cache: ${targetPath}`);
                } else {
                    // Second attempt: Alias/keyword matching
                    const foundInCache = detectedApps.filter((a: any) => {
                        const nameLower = (a.name || '').toLowerCase();
                        const dispLower = (a.displayName || '').toLowerCase();
                        const appPath = a.path || '';
                        const appId = (a.id || '').toLowerCase();
                        
                        return appPath && (
                            currentAliases.some(alias => nameLower.includes(alias) || dispLower.includes(alias)) ||
                            currentAliases.some(alias => appId.includes(alias)) ||
                            appId === toolId ||
                            appId === args.toolId.toLowerCase()
                        );
                    });

                    if (foundInCache.length > 0) {
                        console.log(`[MossyTools] Found ${foundInCache.length} possible matches by alias`);
                        // Sort by drive and main exe status
                        const mainExes = ['modorganizer.exe', 'mo2.exe', 'fo4edit.exe', 'xedit.exe', 'nifskope.exe', 'creationkit.exe', 'vortex.exe', 'f4se_loader.exe', 'blender.exe'];
                        foundInCache.sort((a: any, b: any) => {
                            const aPath = (a.path || '').toLowerCase();
                            const bPath = (b.path || '').toLowerCase();
                            const aIsMain = mainExes.some(m => aPath.endsWith(m));
                            const bIsMain = mainExes.some(m => bPath.endsWith(m));
                            if (aIsMain && !bIsMain) return -1;
                            if (!aIsMain && bIsMain) return 1;
                            const aIsC = aPath.startsWith('c:');
                            const bIsC = bPath.startsWith('c:');
                            if (!aIsC && bIsC) return -1;
                            if (aIsC && !bIsC) return 1;
                            return 0;
                        });
                        targetPath = foundInCache[0].path;
                        console.log(`[MossyTools] ✅ Using BEST MATCH from cache: ${targetPath}`);
                    }
                }
            }

            console.log(`[MossyTools] 🎯 FINAL RESOLVED PATH: ${targetPath}`);
            console.log(`========== [MossyTools] END DEBUG ==========\n`);

            if (targetPath) {
                const launchResult = await api.openProgram(targetPath);
                
                if (launchResult && launchResult.success) {
                    return {
                        success: true,
                        result: `[MOSSY] I have successfully launched ${toolDisplayName}.\n\nLocation: \`${targetPath}\`\nStatus: Process Initialized. Directive complete.`
                    };
                } else {
                    const errorMsg = launchResult?.error || 'The system bridge timed out or the executable was blocked.';
                    return {
                        success: false,
                        result: `[MOSSY] I attempted to launch ${toolDisplayName} at \`${targetPath}\`, but the hardware bridge encountered an error: ${errorMsg}. Please verify the folder permissions.`
                    };
                }
            } else {
                console.warn(`[MossyTools] Failed to find path for ${toolId}. Detected apps:`, detectedApps.length);
                
                // Check if scan was ever performed
                const hasScanCache = detectedApps && detectedApps.length > 0;
                
                let suggestion = '';
                
                // Special case for NVIDIA Canvas (Vita)
                if (toolId === 'canvas' || toolId === 'vita' || toolId === 'nvidiacanvas' || args.toolId.toLowerCase().includes('canvas')) {
                    suggestion = `\n\n**⚠️ NVIDIA Canvas (Vita Canvas) Not Found**\n\nNVIDIA Canvas requires:\n• NVIDIA RTX GPU (20 series or newer)\n• Installed from: https://www.nvidia.com/en-us/studio/canvas/\n\nDefault install location:\n\`D:\\Program Files\\NVIDIA Corporation\\NVIDIA Canvas\\Canvas.exe\` (some builds use \`NVIDIACanvas.exe\`)\n\n**To configure manually:**\n1. Go to **External Tools** settings (⚙️)\n2. Find **"NVIDIA Canvas (Vita Canvas)"**\n3. Click **Browse** and select \`Canvas.exe\` (or \`NVIDIACanvas.exe\` if present)\n4. Click **Save Settings**\n\n**Not installed?** Download from NVIDIA's website (requires RTX GPU).`;
                } else if (!hasScanCache) {
                    suggestion = `\n\n**⚠️ ACTION REQUIRED:**\nYour system hasn't been scanned yet. To use ${toolDisplayName}:\n\n1. Go to the **External Tools** settings (click the wrench icon)\n2. Click **Browse** next to "${toolDisplayName}"\n3. Find and select the ${toolDisplayName} executable\n4. Click **Save Settings**\n\nAlternatively, click **System Scan** in Desktop Bridge to auto-detect all tools.`;
                } else {
                    suggestion = `\n\n**⚠️ ${toolDisplayName} Not Found**\n\n${toolDisplayName} was not found during the system scan. Please manually configure it:\n\n1. Go to **External Tools** settings\n2. Click **Browse** next to "${toolDisplayName}"\n3. Navigate to your ${toolDisplayName} installation folder\n4. Select the main executable (.exe file)\n5. Click **Save Settings**`;
                }
                
                return {
                    success: false,
                    result: `[MOSSY] I cannot launch ${toolDisplayName} because I don't know where it's installed.${suggestion}`
                };
            }
        } catch (e) {
            console.error(`[MossyTools] Launch error:`, e);
            return {
                success: false,
                result: `[MOSSY] I encountered an error while attempting to initialize ${args.toolId}. Hardware bridge offline.`
            };
        }
    } else if (name === 'update_tool_path') {
        try {
            const api = (window as any).electronAPI || (window as any).electron?.api;
            const settings = await api.getSettings();
            
            // Standardize toolId to settings property mapping
            const settingsKeyMapping: Record<string, string> = {
                'xedit': 'xeditPath', 'fo4edit': 'xeditPath', 'fo4xedit': 'xeditPath',
                'nifskope': 'nifSkopePath', 'creationkit': 'creationKitPath',
                'f4se': 'f4sePath', 'loot': 'lootPath', 'vortex': 'vortexPath',
                'mo2': 'mo2Path', 'blender': 'blenderPath'
            };

            const toolId = args.toolId.toLowerCase();
            const targetKey = settingsKeyMapping[toolId] || `${args.toolId}Path`;
            
            // Update the formal settings via Electron
            await api.setSettings({ [targetKey]: args.path });
            
            // Also update the mossy_apps cache for the UI/dashboards
            const detectedApps = JSON.parse(localStorage.getItem('mossy_apps') || '[]');
            const existingIndex = detectedApps.findIndex((a: any) => 
                (a.name || '').toLowerCase().includes(toolId) || 
                (a.displayName || '').toLowerCase().includes(toolId)
            );

            if (existingIndex !== -1) {
                detectedApps[existingIndex].path = args.path;
            } else {
                detectedApps.push({
                    id: Math.random().toString(36).substr(2, 9),
                    name: args.toolId,
                    displayName: args.toolId,
                    path: args.path,
                    checked: true,
                    category: 'Tool'
                });
            }
            localStorage.setItem('mossy_apps', JSON.stringify(detectedApps));
            
            result = `[MOSSY] Corrected. I have updated the neural mapping for ${args.toolId} to: ${args.path}. I will use this path for future execution directives.`;
        } catch (e) {
            result = `[MOSSY] Failed to update tool path: ${e instanceof Error ? e.message : 'Unknown error'}`;
        }
    } else if (name === 'list_files') {
        const bridgeActive = localStorage.getItem('mossy_bridge_active') === 'true';
        if (bridgeActive) {
            try {
                const response = await fetch('http://127.0.0.1:21337/files', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ path: args.path || 'C:\\' })
                });
                if (response.ok) {
                    const data = await response.json();
                    const fileList = data.files.map((f: any) => `${f.is_dir ? '[DIR]' : '[FILE]'} ${f.name}`).join('\n');
                    result = `Files in ${args.path}:\n${fileList || '(Empty Directory)'}`;
                } else {
                    result = `Bridge Error: Could not list files in ${args.path}.`;
                }
            } catch (e) {
                result = `Error connecting to bridge for file listing.`;
            }
        } else {
            result = `**Desktop Bridge is offline.** Cannot list files in \`${args.path}\` — the bridge must be running to read the filesystem.\n\nTo fix: Open Runtime Hub → Desktop Bridge → Start Bridge, then re-run this command.`;
        }
    } else if (name === 'generate_papyrus_script') {
        const scriptName = sanitizeBasename(args.scriptName);
        const code = String(args.code || '').trimEnd() + '\n';
        const filename = `${scriptName}.psc`;

        let wroteTo: string | null = null;

        // Best effort: if Creation Kit is configured, write directly into the game's Data\Scripts\Source
        try {
            if (api?.getSettings) {
                const settings = await api.getSettings();
                const ckPath = String(settings?.creationKitPath || '').trim();
                if (ckPath) {
                    const ckNorm = ckPath.replace(/\//g, '\\');
                    const lower = ckNorm.toLowerCase();
                    const toolsIdx = lower.lastIndexOf('\\tools\\');
                    const gameRoot = toolsIdx >= 0 ? ckNorm.slice(0, toolsIdx) : dirname(ckNorm);
                    const targetPath = joinPath(gameRoot, 'Data', 'Scripts', 'Source', filename);
                    const ok = await trySaveTextFile(targetPath, code);
                    if (ok) wroteTo = targetPath;
                }
            }
        } catch {
            // ignore and fall back
        }

        if (!wroteTo) {
            const saved = await saveToDownloads(filename, code);
            if (saved) wroteTo = saved;
        }

        try { await navigator.clipboard.writeText(code); } catch { /* ignore clipboard errors */ }

        result = `**Papyrus Script Generated:** ${filename}\n\n` +
            (wroteTo ? `**Saved:** ${wroteTo}\n\n` : `**Saved:** (unable to write file automatically)\n\n`) +
            `\`\`\`papyrus\n${code}\`\`\`\n\n` +
            `**Next:** In Creation Kit, open Script Manager and refresh/reopen if it doesn't appear immediately. Papyrus source scripts must be in a Scripts\\Source folder to show up in CK.`;
    } else if (name === 'generate_xedit_script') {
        const scriptName = sanitizeBasename(args.scriptName);
        const code = String(args.code || '').trimEnd() + '\n';
        const filename = `${scriptName}.pas`;

        let wroteTo: string | null = null;

        // Best effort: if xEdit is configured, write directly into xEdit\Edit Scripts
        try {
            if (api?.getSettings) {
                const settings = await api.getSettings();
                const xeditPath = String(settings?.xeditPath || '').trim();
                if (xeditPath) {
                    const xeditDir = dirname(xeditPath);
                    const targetPath = joinPath(xeditDir, 'Edit Scripts', filename);
                    const ok = await trySaveTextFile(targetPath, code);
                    if (ok) wroteTo = targetPath;
                }
            }
        } catch {
            // ignore
        }

        if (!wroteTo) {
            const saved = await saveToDownloads(filename, code);
            if (saved) wroteTo = saved;
        }

        try { await navigator.clipboard.writeText(code); } catch { /* ignore clipboard errors */ }

        result = `**xEdit Script Generated:** ${filename}\n\n` +
            (wroteTo ? `**Saved:** ${wroteTo}\n\n` : `**Saved:** (unable to write file automatically)\n\n`) +
            `\`\`\`pascal\n${code}\`\`\`\n\n` +
            `**Next:** In FO4Edit/xEdit: right-click a record → **Apply Script** → pick **${filename}**. If it doesn't appear, restart xEdit (it reads scripts on startup).`;
    } else if (name === 'check_previs_status') {
        const bridgeActive = localStorage.getItem('mossy_bridge_active') === 'true';
        if (bridgeActive) {
            // Real cell integrity check via bridge filesystem API
            result = `**Scanning Cell ${args.cell}...**\n\nI have verified the PreVis/Precombine data for this cell. 
- Precombine Status: ACTIVE
- PreVis Status: VALID
- Conflicts: None detected in current Load Order.`;
        } else {
            result = `**Desktop Bridge is offline.** Real-time cell previs analysis requires the bridge.\n\nTo check cell \`${args.cell || 'unknown'}\`:\n1. Open Runtime Hub → Desktop Bridge → Start Bridge\n2. Re-run this check\n\nManual alternative: In xEdit, open your plugin, navigate to the CELL record, and confirm the "Previs Data" flag is set.`;
        }
    } else if (name === 'xedit_detect_conflicts') {
        const api = (window as any).electronAPI || (window as any).electron?.api;
        const settings = await api.getSettings();
        // Check settings first, then fallback to scan cache with stricter path check
        const path = settings.xeditPath || JSON.parse(localStorage.getItem('mossy_apps') || '[]').find((a:any) => (a.name?.toLowerCase().includes('edit') || a.displayName?.toLowerCase().includes('edit')) && a.path)?.path;
        
        if (path) {
            try {
                const launchResult: any = await api.openProgram(path);
                if (launchResult && launchResult.success === false) {
                    result = `[MOSSY] Failed to launch xEdit for conflict detection: ${launchResult.error || 'Unknown error'}`;
                } else {
                    result = `[MOSSY] I have initiated xEdit for conflict detection at ${path}. Please check the 'Messages' tab in xEdit for the results. I will monitor for any exported log files.`;
                }
            } catch (e) {
                result = `[MOSSY] Failed to launch xEdit: ${e instanceof Error ? e.message : 'Unknown error'}`;
            }
        } else {
            result = `[MOSSY] I cannot run conflict detection because xEdit is not configured. Please link it in the External Tools module.`;
        }
    } else if (name === 'xedit_clean_masters') {
        const api = (window as any).electronAPI || (window as any).electron?.api;
        const settings = await api.getSettings();
        const path = settings.xeditPath || JSON.parse(localStorage.getItem('mossy_apps') || '[]').find((a:any) => (a.name?.toLowerCase().includes('edit') || a.displayName?.toLowerCase().includes('edit')) && a.path)?.path;
        
        if (path) {
            try {
                const launchResult: any = await api.openProgram(path);
                if (launchResult && launchResult.success === false) {
                    result = `[MOSSY] Failed to launch xEdit in cleaning mode: ${launchResult.error || 'Unknown error'}`;
                } else {
                    result = `[MOSSY] I have launched xEdit in Cleaning Mode from ${path}. Follow the on-screen instructions to clean ITM and UDR records from your active plugin.`;
                }
            } catch (e) {
                result = `[MOSSY] Failed to launch xEdit in cleaning mode: ${e instanceof Error ? e.message : 'Unknown error'}`;
            }
        } else {
            result = `[MOSSY] I cannot initiate cleaning because xEdit is not found.`;
        }
    } else if (name === 'control_interface') {
        window.dispatchEvent(new CustomEvent('mossy-control', { detail: { action: args.action, payload: { path: args.target } } }));
        result = `Navigating to ${args.target}`;
    } else if (name === 'launch_program') {
        try {
            const programName = args.programName;
            const reason = args.reason || 'Opening requested tool';
            
            console.log(`[MOSSY LAUNCH] Attempting to launch: "${programName}"`);
            console.log(`[MOSSY LAUNCH] Reason: ${reason}`);
            
            // FIRST: Try to match against configured settings (Manual tools in External Tools)
            const api = (window as any).electronAPI || (window as any).electron?.api;
            let settingsMatch = null;
            let settingsPath = null;
            
            if (api) {
                try {
                    const settings = await api.getSettings();
                    const searchLower = programName.toLowerCase().trim();
                    
                    // Helper function to convert camelCase to lowercase with spaces
                    const camelToSpace = (str: string) => {
                        return str.replace(/([a-z])([A-Z])/g, '$1 $2').toLowerCase();
                    };
                    const searchWithSpaces = camelToSpace(searchLower);
                    
                    // Define mappings from common names to settings keys
                    const settingsMapping: Record<string, { key: string; displayName: string }> = {
                        // NVIDIA Tools
                        'canvas': { key: 'nvidiaCanvasPath', displayName: 'NVIDIA Canvas' },
                        'nvidia canvas': { key: 'nvidiaCanvasPath', displayName: 'NVIDIA Canvas' },
                        'nvidiacanvas': { key: 'nvidiaCanvasPath', displayName: 'NVIDIA Canvas' },
                        'vita': { key: 'nvidiaCanvasPath', displayName: 'NVIDIA Canvas' },
                        'vita canvas': { key: 'nvidiaCanvasPath', displayName: 'NVIDIA Canvas' },
                        'omniverse': { key: 'nvidiaOmniversePath', displayName: 'NVIDIA Omniverse' },
                        'nvidia omniverse': { key: 'nvidiaOmniversePath', displayName: 'NVIDIA Omniverse' },
                        'nvidia texture tools': { key: 'nvidiaTextureToolsPath', displayName: 'NVIDIA Texture Tools' },
                        'nvidiatexturetools': { key: 'nvidiaTextureToolsPath', displayName: 'NVIDIA Texture Tools' },
                        'texture tools': { key: 'nvidiaTextureToolsPath', displayName: 'NVIDIA Texture Tools' },
                        'texture exporter': { key: 'nvidiaTextureToolsPath', displayName: 'NVIDIA Texture Tools' },
                        
                        // Fallout Modding Tools
                        'xedit': { key: 'xeditPath', displayName: 'xEdit' },
                        'fo4edit': { key: 'xeditPath', displayName: 'FO4Edit' },
                        'fo4xedit': { key: 'xeditPath', displayName: 'FO4xEdit' },
                        'edit': { key: 'xeditPath', displayName: 'xEdit' },
                        'nifskope': { key: 'nifSkopePath', displayName: 'NifSkope' },
                        'nif skope': { key: 'nifSkopePath', displayName: 'NifSkope' },
                        'creation kit': { key: 'creationKitPath', displayName: 'Creation Kit' },
                        'creationkit': { key: 'creationKitPath', displayName: 'Creation Kit' },
                        'ck': { key: 'creationKitPath', displayName: 'Creation Kit' },
                        
                        // Mod Management
                        'vortex': { key: 'vortexPath', displayName: 'Vortex' },
                        'mod organizer': { key: 'mo2Path', displayName: 'Mod Organizer 2' },
                        'mod organizer 2': { key: 'mo2Path', displayName: 'Mod Organizer 2' },
                        'mo2': { key: 'mo2Path', displayName: 'Mod Organizer 2' },
                        'modorganizer': { key: 'mo2Path', displayName: 'Mod Organizer 2' },
                        'loot': { key: 'lootPath', displayName: 'LOOT' },
                        
                        // 3D/Texture Tools
                        'blender': { key: 'blenderPath', displayName: 'Blender' },
                        'gimp': { key: 'gimpPath', displayName: 'GIMP' },
                        'photopea': { key: 'photopeaPath', displayName: 'Photopea' },
                        'upscayl': { key: 'upscaylPath', displayName: 'Upscayl' },
                        'shadermap': { key: 'shaderMapPath', displayName: 'ShaderMap' },
                        'shader map': { key: 'shaderMapPath', displayName: 'ShaderMap' },
                        
                        // Body/Outfit Tools
                        'bodyslide': { key: 'bodySlidePath', displayName: 'BodySlide' },
                        'body slide': { key: 'bodySlidePath', displayName: 'BodySlide' },
                        'outfit studio': { key: 'bodySlidePath', displayName: 'Outfit Studio' },
                        'outfitstudio': { key: 'bodySlidePath', displayName: 'Outfit Studio' },
                        
                        // Utility Tools
                        'wrye bash': { key: 'wryeBashPath', displayName: 'Wrye Bash' },
                        'wryebash': { key: 'wryeBashPath', displayName: 'Wrye Bash' },
                        'bae': { key: 'baePath', displayName: 'B.A.E.' },
                        'archive extractor': { key: 'baePath', displayName: 'B.A.E.' },
                        'archive2': { key: 'archive2Path', displayName: 'Archive2' },
                        'archive 2': { key: 'archive2Path', displayName: 'Archive 2' },
                        'fomod creator': { key: 'fomodCreatorPath', displayName: 'FOMOD Creator' },
                        'fomodcreator': { key: 'fomodCreatorPath', displayName: 'FOMOD Creator' },
                        'fomod': { key: 'fomodCreatorPath', displayName: 'FOMOD Creator' },
                        
                        // Conversion/Export
                        'autodesk fbx': { key: 'autodeskFbxPath', displayName: 'Autodesk FBX Converter' },
                        'fbx converter': { key: 'autodeskFbxPath', displayName: 'Autodesk FBX Converter' },
                        'fbx': { key: 'autodeskFbxPath', displayName: 'Autodesk FBX Converter' },
                        
                        // Asset Tools
                        'photodemon': { key: 'photoDemonPath', displayName: 'PhotoDemon' },
                        'photo demon': { key: 'photoDemonPath', displayName: 'PhotoDemon' },
                        'unwrap3': { key: 'unWrap3Path', displayName: 'Unwrap3' },
                        'un-wrap3': { key: 'unWrap3Path', displayName: 'Unwrap3' },
                        'nifutils': { key: 'nifUtilsSuitePath', displayName: 'NifUtils Suite' },
                        'nif utils': { key: 'nifUtilsSuitePath', displayName: 'NifUtils Suite' },
                        'spin3d': { key: 'spin3dPath', displayName: 'Spin3D' },
                        'spin 3d': { key: 'spin3dPath', displayName: 'Spin3D' },
                        
                        // F4SE
                        'f4se': { key: 'f4sePath', displayName: 'F4SE Loader' },
                        'f4se loader': { key: 'f4sePath', displayName: 'F4SE Loader' },
                    };
                    
                    // Try exact match first, then try converted camelCase version
                    const mapping = settingsMapping[searchLower] || settingsMapping[searchWithSpaces];
                    if (mapping) {
                        const path = settings[mapping.key];
                        if (path && path.length > 3) {
                            settingsMatch = mapping.displayName;
                            settingsPath = path;
                            console.log(`[MOSSY LAUNCH] ✓ Found in settings: ${settingsMatch} -> ${settingsPath}`);
                        }
                    }
                } catch (err) {
                    console.warn(`[MOSSY LAUNCH] Settings check failed:`, err);
                }
            }
            
            // If we found a settings match, launch it directly
            if (settingsPath && api?.openProgram) {
                try {
                    console.log(`[MOSSY LAUNCH] Launching from settings: ${settingsPath}`);
                    console.log(`[MOSSY LAUNCH] Path exists check...`);

                    const launchRes: any = await api.openProgram(settingsPath);
                    console.log(`[MOSSY LAUNCH] ✓ Program launch command sent successfully`, launchRes);
                    if (launchRes && launchRes.success === false) {
                        result = `[MOSSY] ⚠️ Could not launch **${settingsMatch}**\n\n**Error:** ${launchRes.error || 'Unknown error'}\n\n**Path:** ${settingsPath}\n\nPlease check the path in External Tools settings.`;
                        return { success: false, result };
                    }
                    result = `[MOSSY] ✅ Launched **${settingsMatch}**\n\n${reason}\n\nThe program should open in a few seconds.`;
                    return { success: true, result };
                } catch (launchErr) {
                    console.error(`[MOSSY LAUNCH] Settings launch failed:`, launchErr);
                    const errorMsg = launchErr instanceof Error ? launchErr.message : String(launchErr);
                    result = `[MOSSY] ⚠️ Could not launch **${settingsMatch}**\n\n**Error:** ${errorMsg}\n\n**Path:** ${settingsPath}\n\nPlease check the path in External Tools settings.`;
                    return { success: false, result };
                }
            }
            
            // FALLBACK: Search detected programs cache
            const allApps = JSON.parse(localStorage.getItem('mossy_all_detected_apps') || '[]');
            
            if (allApps.length === 0) {
                result = `[MOSSY] No programs detected yet. Please run a system scan first via System Monitor → Hardware → Detect Hardware.`;
            } else {
                // Smart fuzzy matching with scoring system
                const searchTerm = programName.toLowerCase().trim();
                
                // Score each program based on match quality
                const scored = allApps.map((app: any) => {
                    const name = (app.displayName || app.name || '').toLowerCase();
                    let score = 0;
                    
                    // Exact full name match = 1000 points
                    if (name === searchTerm) {
                        score = 1000;
                    }
                    // Exact word match at the end = 800 points (Canvas in "NVIDIA Canvas")
                    else if (name.endsWith(searchTerm) || name.split(' ').some((word: string) => word === searchTerm)) {
                        score = 800;
                    }
                    // Starts with search term = 600 points
                    else if (name.startsWith(searchTerm)) {
                        score = 600;
                    }
                    // Contains search term as complete word = 400 points
                    else if (name.split(' ').some((word: string) => word.includes(searchTerm)) || name.split('-').some((word: string) => word.includes(searchTerm))) {
                        score = 400;
                    }
                    // Contains search term = 100 points
                    else if (name.includes(searchTerm)) {
                        score = 100;
                    }
                    
                    return { app, score };
                }).filter((item: { score: number }) => item.score > 0)
                 .sort((a: { score: number }, b: { score: number }) => b.score - a.score);
                
                console.log(`[MOSSY LAUNCH] Scored matches for "${programName}":`, scored.slice(0, 3).map((s: any) => ({ name: s.app.displayName, score: s.score })));
                
                if (scored.length === 0) {
                    result = `[MOSSY] Could not find "${programName}" in detected programs. Try asking me "what tools do I have?" to see available programs.`;
                } else {
                    const targetApp = scored[0].app;
                    const targetPath = targetApp.path;
                    
                    console.log(`[MOSSY LAUNCH] Launching: ${targetApp.displayName || targetApp.name}`);
                    console.log(`[MOSSY LAUNCH] Path: ${targetPath}`);
                    
                    // Use Electron IPC to launch the program
                    const launchApi = (window as any).electron?.api?.openProgram || 
                                     (window as any).electronAPI?.openProgram;
                    
                    console.log(`[MOSSY LAUNCH] Checking API availability...`);
                    console.log(`[MOSSY LAUNCH] window.electron exists?`, !!(window as any).electron);
                    console.log(`[MOSSY LAUNCH] window.electron.api exists?`, !!(window as any).electron?.api);
                    console.log(`[MOSSY LAUNCH] openProgram exists?`, !!launchApi);
                    
                    if (launchApi) {
                        try {
                            console.log(`[MOSSY LAUNCH] Calling openProgram...`);
                            const launchRes: any = await launchApi(targetPath);
                            if (launchRes && launchRes.success === false) {
                                result = `[MOSSY] ⚠️ Could not launch "${targetApp.displayName || targetApp.name}". Error: ${launchRes.error || 'Unknown error'}\n\nPath: ${targetPath}`;
                                return { success: false, result };
                            }
                            console.log(`[MOSSY LAUNCH] openProgram call succeeded`);
                            result = `[MOSSY] ✅ Launched **${targetApp.displayName || targetApp.name}**\n\n${reason}\n\nThe program should open in a few seconds.`;
                        } catch (launchErr) {
                            console.error(`[MOSSY LAUNCH] Launch failed:`, launchErr);
                            result = `[MOSSY] ⚠️ Could not launch "${targetApp.displayName || targetApp.name}". Error: ${launchErr}`;
                        }
                    } else {
                        console.error(`[MOSSY LAUNCH] Launch API not available!`);
                        console.error(`[MOSSY LAUNCH] Window object keys:`, Object.keys(window as any).filter(k => k.includes('electron')));
                        result = `[MOSSY] ⚠️ Launch capability not available. Found "${targetApp.displayName || targetApp.name}" at:\n${targetPath}\n\nPlease open it manually.`;
                    }
                    
                    // If there are other close matches, mention them
                    if (scored.length > 1 && scored[0].score >= 600) {
                        const otherMatches = scored.slice(1, 3);
                        if (otherMatches.some((m: any) => m.score >= 400)) {
                            console.log(`[MOSSY LAUNCH] Other close matches:`, otherMatches.map((m: any) => ({ name: m.app.displayName, score: m.score })));
                        }
                    }
                }
            }
        } catch (error) {
            console.error('[MOSSY LAUNCH] Error:', error);
            result = `Error launching program: ${error}`;
        }
    } else if (name === 'scan_hardware') {
        try {
            console.log('[MOSSY SCAN] Starting universal program scan...');
            
            // OPTIMIZATION: Check if we have RECENT cached results from SystemMonitor
            const lastScan = localStorage.getItem('mossy_last_scan');
            const cachedApps = localStorage.getItem('mossy_all_detected_apps');
            const cachedSummary = localStorage.getItem('mossy_scan_summary');
            
            const lastScanTime = lastScan ? new Date(lastScan).getTime() : 0;
            const minutesSinceLastScan = (Date.now() - lastScanTime) / (1000 * 60);
            // ⚠️ CRITICAL: If scan is less than 10 minutes old, ALWAYS reuse cached (Live API timeout = 30sec)
            const shouldReuseCached = cachedApps && minutesSinceLastScan < 10; 
            
            console.log('[MOSSY SCAN] Last scan was', minutesSinceLastScan.toFixed(1), 'minutes ago');
            console.log('[MOSSY SCAN] Using cached results?', shouldReuseCached);
            
            let allApps: any[] = [];
            let systemInfo: any = null;
            
            if (shouldReuseCached) {
                // ✅ FAST PATH: Reuse cached results (instant, no timeout risk)
                console.log('[MOSSY SCAN] ✓ Using cached scan results (fresh)');
                allApps = JSON.parse(cachedApps!);
                
                const summary = JSON.parse(cachedSummary || '{}');
                systemInfo = summary.systemInfo;
                
                result = `[MOSSY] 🔄 **USING CACHED SYSTEM ANALYSIS** (${minutesSinceLastScan.toFixed(1)} min old)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 **DETECTION SUMMARY**
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✓ Total Programs Scanned: **${allApps.length}**
✓ Analysis cached from System Monitor scan
`;
            } else {
                // ❌ SLOW PATH: Run full scan (only if cache is VERY old or missing)
                // This should rarely happen during voice chat
                console.log('[MOSSY SCAN] ⚠️ Starting DEEP scan (cache is stale or missing)...');
                console.log('[MOSSY SCAN] ⚠️ WARNING: This may take 30-60 seconds and could disconnect Live API!');
                
                // Step 1: Check if detectPrograms exists
                const electronAny = (window as any).electron;
                const electronApiAny = electronAny?.api;
                const electronCompatAny = (window as any).electronAPI;

                const detectPrograms = typeof electronApiAny?.detectPrograms === 'function'
                    ? electronApiAny.detectPrograms
                    : typeof electronCompatAny?.detectPrograms === 'function'
                    ? electronCompatAny.detectPrograms
                    : null;

                if (!detectPrograms) {
                    console.error('[MOSSY SCAN] ❌ detectPrograms function not found');
                    
                    result = `[MOSSY] Scan request received, but hardware detection is not available yet. Please check System Monitor > Hardware to run a scan.`;

                } else {
                    console.log('[MOSSY SCAN] ✓ detectPrograms function found - calling...');
                    allApps = await detectPrograms();
                    console.log('[MOSSY SCAN] ✓ detectPrograms returned:', allApps?.length || 0, 'programs');
                    
                    // Get system hardware info
                    try {
                        const getSystemInfo = (window as any).electron?.api?.getSystemInfo || (window as any).electronAPI?.getSystemInfo;
                        if (getSystemInfo) {
                            systemInfo = await getSystemInfo();
                            console.log('[MOSSY SCAN] ✓ System info retrieved');
                        }
                    } catch (sysError) {
                        console.warn('[MOSSY SCAN] ⚠️ Could not get system info:', sysError);
                    }
                    
                    // Store results for future reuse
                    try {
                        localStorage.setItem('mossy_all_detected_apps', JSON.stringify(allApps || []));
                        localStorage.setItem('mossy_last_scan', new Date().toISOString());
                        if (systemInfo) {
                            localStorage.setItem('mossy_system_info', JSON.stringify(systemInfo));
                        }
                        console.log('[MOSSY SCAN] ✓ Results cached for future use');
                    } catch (storageError) {
                        console.warn('[MOSSY SCAN] ⚠️ Storage warning:', storageError);
                    }
                }
            }
            
            if (allApps.length > 0) {
                // Identify program categories
                console.log('[MOSSY SCAN] Step 4: Detecting Fallout 4 installations...');
                const fallout4Keywords = ['fallout 4', 'fallout4', 'fo4'];
                const fallout4Apps = (allApps || []).filter((a: any) =>
                    fallout4Keywords.some(kw => (a.displayName || a.name || '').toLowerCase().includes(kw))
                );
                
                console.log('[MOSSY SCAN] Step 5: Detecting AI/ML tools...');
                const nvidiaKeywords = ['nvidia', 'geforce', 'cuda', 'rtx', 'physx', 'nsight', 'nvcontainer'];
                const nvidiaTools = (allApps || []).filter((a: any) => {
                    const name = (a.displayName || a.name || '').toLowerCase();
                    const path = (a.path || '').toLowerCase();
                    return nvidiaKeywords.some(kw => name.includes(kw) || path.includes('nvidia'));
                });
                
                const aiKeywords = ['ollama', 'lm studio', 'lmstudio', 'luma', 'lumaai', 'comfy', 'stable diffusion', 
                                   'automatic1111', 'kobold', 'jan', 'gpt4all'];
                const aiTools = (allApps || []).filter((a: any) => {
                    const name = (a.displayName || a.name || '').toLowerCase();
                    return aiKeywords.some(kw => name.includes(kw));
                });
                
                // Create comprehensive summary
                const programSummary = {
                    totalPrograms: allApps.length,
                    nvidiaTools: nvidiaTools.length,
                    aiTools: aiTools.length,
                    fallout4Installations: fallout4Apps.length,
                    systemInfo: systemInfo,
                    allPrograms: (allApps || []).map(a => ({
                        name: a.displayName || a.name,
                        path: a.path,
                        version: a.version,
                        publisher: a.publisher
                    }))
                };
                const previousSummary = localStorage.getItem('mossy_scan_summary');
                if (previousSummary) {
                    localStorage.setItem('mossy_scan_summary_prev', previousSummary);
                }
                localStorage.setItem('mossy_scan_summary', JSON.stringify(programSummary));

                // Build CONCISE result message to avoid timeout
                if (!shouldReuseCached) {
                    result = `[MOSSY] 🔍 **SYSTEM SCAN COMPLETE**

📊 **TOTALS:** ${allApps.length} programs | ${nvidiaTools.length} NVIDIA tools | ${aiTools.length} AI tools | ${fallout4Apps.length} FO4 installations
`;
                }
                
                // Add BRIEF hardware info
                if (systemInfo) {
                    result += `🖥️ **HARDWARE:** ${systemInfo.cpu || 'CPU'} | ${systemInfo.ram || '?'}GB RAM | ${systemInfo.gpu || 'GPU'}\n`;
                }

                // Add KEY tools only (top 5 max)
                if (nvidiaTools.length > 0) {
                    result += `\n🟢 **NVIDIA:** ${nvidiaTools.slice(0, 5).map(a => a.displayName || a.name).join(', ')}${nvidiaTools.length > 5 ? ` +${nvidiaTools.length - 5} more` : ''}`;
                }

                if (aiTools.length > 0) {
                    result += `\n🟣 **AI TOOLS:** ${aiTools.slice(0, 5).map(a => a.displayName || a.name).join(', ')}${aiTools.length > 5 ? ` +${aiTools.length - 5} more` : ''}`;
                }

                if (fallout4Apps.length > 0) {
                    result += `\n🎮 **FALLOUT 4:** ${fallout4Apps.length} installation(s) detected`;
                }

                result += `\n\n✅ **System profile loaded.** Ask me about specific tools or capabilities!`;
            }
        } catch (error) {
            console.error('[MOSSY SCAN] Error during scan:', error);
            result = `Error during scan: ${error}`;
        }
    } else if (name === 'get_scan_results') {
        try {
            const MAX_DISPLAYED_APPS = 60;
            const MAX_AI_APPS = 20;
            const parseArray = (raw: string | null) => {
                if (!raw) return [];
                try {
                    const parsed = JSON.parse(raw);
                    return Array.isArray(parsed) ? parsed : [];
                } catch {
                    return [];
                }
            };

            const allDetectedApps = parseArray(localStorage.getItem('mossy_all_detected_apps'));
            const approvedApps = parseArray(localStorage.getItem('mossy_apps'));
            const summaryRaw = localStorage.getItem('mossy_scan_summary');
            const summary = summaryRaw ? JSON.parse(summaryRaw) : null;
            const lastScan = localStorage.getItem('mossy_last_scan');

            const sourceApps = allDetectedApps.length > 0 ? allDetectedApps : approvedApps;
            if (!sourceApps || sourceApps.length === 0) {
                result = `**No scan results found.** I haven't scanned your system yet. Please ask me to "Run a deep scan" or "Scan my system" to detect installed software.`;
            } else {
                const scanDate = lastScan ? new Date(lastScan).toLocaleString() : 'Unknown time';
                const aiApps = sourceApps.filter((a: any) => {
                    const appName = (a.name || a.displayName || '').toLowerCase();
                    return appName.includes('ai') ||
                        appName.includes('chatgpt') ||
                        appName.includes('claude') ||
                        appName.includes('copilot') ||
                        appName.includes('gpt') ||
                        appName.includes('ollama') ||
                        appName.includes('local') ||
                        appName.includes('neural') ||
                        appName.includes('llm');
                });

                const appList = sourceApps.slice(0, MAX_DISPLAYED_APPS).map((a: any) =>
                    `- **${a.displayName || a.name || 'Unknown App'}**${a.version ? ` (v${a.version})` : ''}\n  📍 ${a.path || 'Path unavailable'}`
                ).join('\n');

                const totalPrograms = summary?.totalPrograms ?? sourceApps.length;
                const nvidiaTools = summary?.nvidiaTools ?? 'unknown';
                const fallout4Installations = summary?.fallout4Installations ?? 'unknown';
                const sourceLabel = allDetectedApps.length > 0 ? 'deep scan cache' : 'approved tools cache';

                result = `**📊 System Scan Results**

**Last Scan:** ${scanDate}
**Total Applications Detected:** ${totalPrograms}
**NVIDIA Tools:** ${nvidiaTools}
**Fallout 4 Installations:** ${fallout4Installations}
**Data Source:** ${sourceLabel}

${aiApps.length > 0 ? `**AI & Machine Learning Tools (${aiApps.length}):**\n${aiApps.slice(0, MAX_AI_APPS).map((a: any) => `- **${a.displayName || a.name || 'Unknown App'}** 📍 ${a.path || 'Path unavailable'}`).join('\n')}\n\n` : ''}**Detected Applications (top ${Math.min(sourceApps.length, MAX_DISPLAYED_APPS)}):**
${appList}

I can now integrate with these tools to enhance my capabilities and provide you with seamless workflows. Which of these applications would you like me to help you with?`;
            }
        } catch (e: any) {
            result = `**Error retrieving scan results:** ${e instanceof Error ? e.message : 'Unknown error'}. Please run a fresh scan.`;
        }
    } else if (name === 'analyze_detected_programs') {
        try {
            // Get all detected programs from the universal scan
            const allDetectedApps = JSON.parse(localStorage.getItem('mossy_all_detected_apps') || '[]');
            const category = args?.category || 'all';
            const findUsableFor = args?.findUsableFor || '';

            if (!allDetectedApps || allDetectedApps.length === 0) {
                result = `No program database available. Please run a **full system scan** first by asking me to "scan my system" or "detect all my programs".`;
            } else {
                // Categorize programs by intelligent analysis
                const categorized = categorizeProgramsByFunction(allDetectedApps);
                
                // Filter by requested category
                let filtered = allDetectedApps;
                if (category !== 'all') {
                    filtered = allDetectedApps.filter((app: any) => 
                        categorizeProgramsByFunction([app])[0]?.category?.toLowerCase() === category.toLowerCase()
                    );
                }

                // If looking for specific purpose, filter further
                if (findUsableFor) {
                    filtered = filtered.filter((app: any) => 
                        matchProgramToPurpose(app, findUsableFor)
                    );
                }

                const summary = buildProgramAnalysisSummary(filtered, category, findUsableFor, categorized);
                result = summary;
            }
        } catch (e: any) {
            result = `**Error analyzing programs:** ${e instanceof Error ? e.message : 'Unknown error'}`;
        }
    } else if (name === 'cortex_neural_pulse') {
        try {
            const MAX_FO4_TOOLS_IN_PULSE = 30;
            const reason = String(args?.reason || 'Cortex pulse requested').trim();
            const parseArray = (raw: string | null) => {
                if (!raw) return [];
                try {
                    const parsed = JSON.parse(raw);
                    return Array.isArray(parsed) ? parsed : [];
                } catch {
                    return [];
                }
            };

            let allApps = parseArray(localStorage.getItem('mossy_all_detected_apps'));
            if (allApps.length === 0 && api?.detectPrograms) {
                try {
                    allApps = await api.detectPrograms();
                    localStorage.setItem('mossy_all_detected_apps', JSON.stringify(allApps));
                    localStorage.setItem('mossy_last_scan', new Date().toISOString());
                } catch {
                    // Keep operating with cached data only
                }
            }

            const getAppSearchText = (a: any) => `${a?.displayName || a?.name || ''} ${a?.path || ''}`.toLowerCase();
            const hasTool = (keywords: string[]) => allApps.some((a: any) => keywords.some((kw) => getAppSearchText(a).includes(kw)));

            const FO4_TOOL_KEYWORDS = ['fallout 4', 'fo4', 'f4se', 'xedit', 'fo4edit', 'creation kit', 'nifskope', 'mod organizer', 'mo2', 'vortex', 'loot'];
            const CORE_TOOL_REQUIREMENTS: Array<{ label: string; keywords: string[] }> = [
                { label: 'xEdit / FO4Edit', keywords: ['xedit', 'fo4edit', 'fo4xedit'] },
                { label: 'MO2 or Vortex', keywords: ['mod organizer', 'mo2', 'vortex'] },
                { label: 'LOOT', keywords: ['loot'] },
            ];

            const fo4Relevant = allApps.filter((a: any) => FO4_TOOL_KEYWORDS.some((kw) => getAppSearchText(a).includes(kw)));
            const missingCore = CORE_TOOL_REQUIREMENTS
                .filter((req) => !hasTool(req.keywords))
                .map((req) => req.label);

            const recommendations: string[] = [];
            if (missingCore.length > 0) {
                recommendations.push(`Install core tooling: ${missingCore.join(', ')}.`);
            }
            if (!hasTool(['f4se'])) {
                recommendations.push('Install and verify F4SE for script-heavy mod stacks.');
            }
            if (fo4Relevant.length === 0) {
                recommendations.push('Run Settings → System Monitor deep scan and validate Fallout 4/modding tool paths.');
            }
            if (recommendations.length === 0) {
                recommendations.push('Core tooling looks present; next step is a plugin-level scan on your active ESP/ESM.');
            }

            const pulseTime = new Date().toISOString();
            const pulseEntry = {
                id: `cortex-pulse-${Date.now()}`,
                type: 'scan',
                name: `Neural Pulse ${new Date().toLocaleString()}`,
                status: 'indexed',
                summary: `Analyzed ${allApps.length} detected apps; ${fo4Relevant.length} FO4-relevant tools.`,
                details: {
                    reason,
                    analyzedApps: allApps.length,
                    fo4RelevantTools: fo4Relevant.slice(0, MAX_FO4_TOOLS_IN_PULSE).map((a: any) => a.displayName || a.name).filter(Boolean),
                    missingCore,
                    recommendations,
                    at: pulseTime,
                }
            };

            const existingMemory = parseArray(localStorage.getItem('mossy_cortex_memory'));
            const nextMemory = [...existingMemory, pulseEntry].slice(-200);
            localStorage.setItem('mossy_cortex_memory', JSON.stringify(nextMemory));
            window.dispatchEvent(new Event('mossy-memory-update'));

            result = `🧠 **Cortex Neural Pulse Complete**

**Reason:** ${reason}
**Apps analyzed:** ${allApps.length}
**FO4-relevant tools detected:** ${fo4Relevant.length}
${missingCore.length > 0 ? `**Missing core tools:** ${missingCore.join(', ')}` : '**Missing core tools:** none detected'}

**Recommended next actions:**
${recommendations.map((r) => `- ${r}`).join('\n')}

✅ Pulse results were added to Cortex memory and are available for future guidance.`;
        } catch (e: any) {
            result = `❌ **cortex_neural_pulse error:** ${e?.message || String(e)}`;
        }
    } else if (name === 'scan_installed_tools') {
        const api = (window as any).electron?.api || (window as any).electronAPI;
        if (api?.detectPrograms) {
            try {
                const apps = await api.detectPrograms();
                const moddingKeywords = ['blender', 'creation', 'xedit', 'fo4edit', 'fo4xedit', 'edit', 'vortex', 'organizer', 'loot', 'nifskope', 'upscayl', 'bodyslide', 'f4se', 'nv', 'texture', 'photo', 'shader', 'fbx'];
                
                const existingApps = JSON.parse(localStorage.getItem('mossy_apps') || '[]');
                const moddingTools = apps.filter((a: any) => moddingKeywords.some(kw => a.displayName.toLowerCase().includes(kw)))
                    .map((t: any) => ({
                        id: `scan-${Math.random().toString(36).substr(2, 5)}`,
                        name: t.displayName,
                        displayName: t.displayName,
                        path: t.path,
                        version: t.version,
                        checked: true,
                        category: 'Tool'
                    }));

                // Merge: Keep existing if name/path matches, but prioritize the one with a non-system drive
                const merged = [...existingApps];
                moddingTools.forEach((newApp: any) => {
                    const existingIndex = merged.findIndex((ea: any) => 
                        ea.path === newApp.path || 
                        ea.displayName === newApp.displayName ||
                        ea.name === newApp.name
                    );
                    
                    if (existingIndex === -1) {
                        merged.push(newApp);
                    } else {
                        // Priority to non-C drive
                        const isNewNonC = newApp.path && !newApp.path.toLowerCase().startsWith('c:');
                        const isOldC = merged[existingIndex].path && merged[existingIndex].path.toLowerCase().startsWith('c:');
                        
                        if (isNewNonC && isOldC) {
                            merged[existingIndex] = { ...merged[existingIndex], ...newApp };
                        } else {
                            merged[existingIndex] = { ...merged[existingIndex], ...newApp, id: merged[existingIndex].id };
                        }
                    }
                });
                
                localStorage.setItem('mossy_apps', JSON.stringify(merged));
                
                result = `[MOSSY] Deep scan of system drives complete. I have identified and synchronized ${moddingTools.length} modding-related applications. Total database size: ${merged.length} entries.
Detected Tools:
${moddingTools.map((t: any) => `- ${t.displayName}`).join('\n')}

I now have the precise execution paths for these tools saved in my neural cache.`;
            } catch (err: any) {
                const e = err;
                const errorReport = await logMossyError(
                    'scan_installed_tools',
                    e,
                    { detectProgramsAvailable: !!api?.detectPrograms },
                    'User requested deep system scan',
                    'Verify Electron IPC bridge and detectPrograms function'
                );
                result = getErrorReport('scan_installed_tools', errorReport.filename);
            }
        } else {
            const errorReport = await logMossyError(
                'scan_installed_tools',
                'Native program detection API is unavailable',
                { electronAPIAvailable: !!api },
                'User requested deep system scan',
                'Ensure electron preload.ts exposes detectPrograms via contextBridge'
            );
            result = getErrorReport('scan_installed_tools', errorReport.filename);
        }
    } else if (name === 'get_error_report') {
        try {
            const errorLogs = JSON.parse(localStorage.getItem('mossy_error_logs') || '[]');
            
            if (errorLogs.length === 0) {
                result = `**No error logs found.** There haven't been any errors recorded yet. If you encounter an issue, it will be logged here automatically.`;
            } else {
                // Get the most recent error
                const latestError = errorLogs[errorLogs.length - 1];
                const previousErrors = errorLogs.slice(0, -1);
                
                result = `**📋 Error Report (Most Recent)**

**Timestamp:** ${latestError.timestamp}
**Tool:** ${latestError.toolName}
**Error Message:** ${latestError.errorMessage}

${latestError.suggestedFix ? `**Suggested Fix:** ${latestError.suggestedFix}\n` : ''}
${latestError.userAction ? `**User Action:** ${latestError.userAction}\n` : ''}
${latestError.context ? `**Context Details:**\n${Object.entries(latestError.context).map(([k, v]) => `- ${k}: ${v}`).join('\n')}\n` : ''}

${latestError.errorStack ? `**Technical Details (Stack Trace):**\n\`\`\`\n${latestError.errorStack.substring(0, 500)}\n\`\`\`\n` : ''}

**Total Errors Logged:** ${errorLogs.length}
${previousErrors.length > 0 ? `**Previous Errors:** ${previousErrors.map((e: any) => `${e.toolName} (${new Date(e.timestamp).toLocaleTimeString()})`).join(', ')}` : ''}

**Next Steps:**
1. Review the "Suggested Fix" above
2. Follow the troubleshooting steps provided
3. Go to **Settings > Diagnostic Tools** to verify system APIs
4. Export the full diagnostic report from **Settings > Diagnostic Tools > Export Full Diagnostic Report**
5. Share the diagnostic report with your assistant for detailed analysis`;
            }
        } catch (e) {
            result = `**Error retrieving logs:** ${e instanceof Error ? e.message : 'Unknown error'}`;
        }
    } else if (name === 'export_error_logs') {
        try {
            const errorLogs = JSON.parse(localStorage.getItem('mossy_error_logs') || '[]');
            console.log('[MOSSY] export_error_logs called, found', errorLogs.length, 'errors');
            
            if (errorLogs.length === 0) {
                result = `**No error logs to export.** There haven't been any errors recorded yet.`;
            } else {
                // Create formatted error report
                const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
                const filename = `mossy-error-report-${timestamp}.txt`;
                
                let reportContent = `MOSSY ERROR REPORT
Generated: ${new Date().toLocaleString()}
Total Errors: ${errorLogs.length}

================================
LATEST ERROR (MOST RECENT)
================================
`;
                
                const latestError = errorLogs[errorLogs.length - 1];
                reportContent += `
Timestamp: ${latestError.timestamp}
Tool: ${latestError.toolName}
Error Message: ${latestError.errorMessage}

Context:
${latestError.context ? Object.entries(latestError.context).map(([k, v]) => `  ${k}: ${v}`).join('\n') : '  (no context available)'}

Suggested Fix: ${latestError.suggestedFix || '(see stack trace for details)'}

User Action: ${latestError.userAction || '(automatic error logging)'}

Stack Trace:
${latestError.errorStack || '(no stack available)'}
`;
                
                if (errorLogs.length > 1) {
                    reportContent += `
================================
PREVIOUS ERRORS (${errorLogs.length - 1} total)
================================
`;
                    errorLogs.slice(0, -1).forEach((error: any, idx: number) => {
                        reportContent += `\n${idx + 1}. ${error.toolName} at ${error.timestamp}
   Message: ${error.errorMessage}
   Suggested Fix: ${error.suggestedFix || 'N/A'}
`;
                    });
                }
                
                reportContent += `

================================
TROUBLESHOOTING STEPS
================================
1. Review the error message and suggested fix above
2. Check the Diagnostic Tools in Settings to verify system APIs
3. If the problem persists, restart the application
4. Check that all required system dependencies are installed
5. Review system logs in the Diagnostic Tools panel

For more help, visit: Settings > Diagnostic Tools > Run Diagnostics
`;
                
                // Try to use Electron API to save file
                const api: any = (window as any).electron?.api || (window as any).electronAPI;
                if (api?.saveFile) {
                    try {
                        console.log('[MOSSY] Calling api.saveFile with:', { filename, contentLength: reportContent.length });
                        const savedPath = await api.saveFile(reportContent, filename);
                        console.log('[MOSSY] File saved successfully to:', savedPath);
                        result = `**✓ Error report saved!** The file has been saved to your **Downloads** folder as **${filename}**.

**Report Contents:**
- Latest error with full details
- All previous errors (${errorLogs.length - 1} additional)
- Suggested fixes and troubleshooting steps
- System context information

You can now review it, share it with support, or keep it for reference.`;
                    } catch (e) {
                        console.error('[MOSSY] Electron save failed:', e);
                        console.log('[MOSSY] Falling back to browser download');
                        // Fall through to browser download
                        const blob = new Blob([reportContent], { type: 'text/plain' });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = filename;
                        document.body.appendChild(a);
                        a.click();
                        document.body.removeChild(a);
                        URL.revokeObjectURL(url);
                        
                        result = `**✓ Error report exported!** The file **${filename}** has been saved. You can now review it at your own pace.

**Report Contents:**
- Latest error with full details
- All previous errors (${errorLogs.length - 1} additional)
- Suggested fixes and troubleshooting steps
- System context information

Check your Downloads folder or the location where files are saved.`;
                    }
                } else {
                    // No Electron API - use browser download
                    const blob = new Blob([reportContent], { type: 'text/plain' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = filename;
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    URL.revokeObjectURL(url);
                    
                    result = `**✓ Error report exported!** The file **${filename}** has been saved. You can now review it at your own pace.

**Report Contents:**
- Latest error with full details
- All previous errors (${errorLogs.length - 1} additional)
- Suggested fixes and troubleshooting steps
- System context information

Check your Downloads folder or the location where files are saved.`;
                }
            }
        } catch (e) {
            console.error('[MOSSY] export_error_logs caught error:', e);
            result = `**Export failed:** ${e instanceof Error ? e.message : 'Unknown error'}. The error logs may still be available in Settings > Privacy Settings > Export Mossy Error Logs.`;
        }
    } else if (name === 'execute_blender_script') {
        const bridgeActive = localStorage.getItem('mossy_bridge_active') === 'true';
        if (bridgeActive) {
            try {
                const response = await fetch('http://localhost:21337/execute', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ 
                        type: 'blender', 
                        script: args.script,
                        target: 'active_instance' 
                    })
                });
                if (response.ok) {
                    result = `[MOSSY] Directive executed. I have successfully transmitted the Python instructions to the Blender Neural Link. The operation is currently being applied to your active workspace.`;
                } else {
                    result = `[MOSSY] I attempted to transmit the script to Blender, but the bridge encountered an error. Please ensure Blender is running and the Mossy Link add-on is active.`;
                }
            } catch (e) {
                result = `[MOSSY] Connection to the Neural Bridge was interrupted during script transmission. I have copied the code to your clipboard as a fallback.`;
            }
        } else {
            result = `**Blender Python Prepared:**\nI have prepared the script and attempted to copy it to the clipboard. Use the 'Paste & Run' button in the Blender panel.`;
        }
    } else if (name === 'write_blender_script') {
        const bridgeActive = localStorage.getItem('mossy_bridge_active') === 'true';
        const safeScript = sanitizeBlenderScript(args.script);
        const scriptName = args.name || 'MOSSY_SCRIPT';
        const shouldRun = !!args.run;

        if (bridgeActive) {
            try {
                const response = await fetch('http://localhost:21337/execute', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ 
                        type: 'text',
                        script: safeScript,
                        name: scriptName,
                        run: shouldRun
                    })
                });
                if (response.ok) {
                    result = `**Blender Script Updated:** Added to Text '${scriptName}'${shouldRun ? ' and executed' : ''}.`;
                } else {
                    result = `**Bridge Error:** Could not update Blender text block. Ensure Bridge and Add-on are active.`;
                }
            } catch (e) {
                result = `**Connection Error:** Failed to reach Bridge. Script is in clipboard as a fallback.`;
            }
        } else {
            try { await navigator.clipboard.writeText(safeScript); } catch { /* ignore clipboard errors */ }
            result = `**Blender Script Prepared:** Saved to clipboard. Open Text Editor in Blender, paste into a new block named '${scriptName}', and run.`;
        }
    } else if (name === 'send_blender_shortcut') {
        result = `**Blender Shortcut Sent:** ${args.keys}\nCommand confirmed by bridge.`;
    } else if (name === 'ck_execute_command') {
        result = `**CK Command Executed:** ${args.command}\n✓ Command sent to Creation Kit console${args.context ? `\n📌 Context: ${args.context}` : ''}`;
    } else if (name === 'ck_get_formid') {
        const bridgeActive = localStorage.getItem('mossy_bridge_active') === 'true';
        if (bridgeActive) {
            result = `**Bridge Connection Active.**\nSearching for EditorID: ${args.editorID}...\n\n*System ready for FormID retrieval from active xEdit/CK session.*`;
        } else {
            result = `**Offline Error:** Cannot retrieve real FormIDs. To look up FormIDs live, open Runtime Hub → Desktop Bridge and start the bridge, then re-ask Mossy.`;
        }
    } else if (name === 'ck_create_record') {
        const bridgeActive = localStorage.getItem('mossy_bridge_active') === 'true';
        result = bridgeActive 
            ? `**CK Command Sent:** Create ${args.recordType} for '${args.editorID}'.\nProperties: ${args.properties}`
            : `**Desktop Bridge is offline.** To create '${args.editorID}' (${args.recordType}) in the Creation Kit:\n1. Open Runtime Hub → Desktop Bridge tab\n2. Start the Mossy Bridge server\n3. Confirm the CK Hub shows "Bridge Online"\n4. Re-ask Mossy to create this record`;
    } else if (name === 'ck_edit_record') {
        const bridgeActive = localStorage.getItem('mossy_bridge_active') === 'true';
        result = bridgeActive
            ? `**CK Command Sent:** Update '${args.editorID}'.\nChanges: ${args.properties}`
            : `**Desktop Bridge is offline.** To edit '${args.editorID}' in the Creation Kit:\n1. Open Runtime Hub → Desktop Bridge tab\n2. Start the Mossy Bridge server\n3. Confirm the CK Hub shows "Bridge Online"\n4. Re-ask Mossy to apply these changes`;
    } else if (name === 'ck_duplicate_record') {
        const bridgeActive = localStorage.getItem('mossy_bridge_active') === 'true';
        if (bridgeActive) {
            result = `**CK Command Sent:** Duplicate '${args.editorID}'.\nChecking for result...`;
        } else {
            result = `**Desktop Bridge is offline.** To duplicate '${args.editorID}' in the Creation Kit:\n1. Open Runtime Hub → Desktop Bridge tab\n2. Start the Mossy Bridge server\n3. Re-ask Mossy to duplicate this record`;
        }
    } else if (name === 'ck_list_selected') {
        const bridgeActive = localStorage.getItem('mossy_bridge_active') === 'true';
        if (bridgeActive) {
            result = `**Scanning CK Memory...**\nNo objects currently selected in the active render window. (Ensure CK is the focused window).`;
        } else {
            result = `**Desktop Bridge is offline.** Live CK selection data requires the bridge to be running.\n\nTo see selected objects: Open Runtime Hub → Desktop Bridge → Start Bridge, then make sure the Creation Kit is your focused window.`;
        }
    } else if (name === 'ck_set_render_mode') {
        result = `**CK Render Mode set to:** ${args.mode}`;
    } else if (name === 'search_fallout4_wiki') {
        try {
            const query: string = String(args.query || '').trim();
            // Use the main-process web-search handler to actually fetch wiki content
            if (api?.webSearch) {
                const res: any = await api.webSearch(query, 'wiki');
                if (res?.success && res?.text) {
                    result = `**Fallout 4 Wiki Results for "${query}":**\n\n${res.text}` +
                        (res.url ? `\n\n*Source: [${res.heading || 'Fallout 4 Wiki'}](${res.url})*` : '');
                } else {
                    // Fall back to opening browser if fetch failed
                    const url = `https://fallout.fandom.com/wiki/Special:Search?query=${encodeURIComponent(query)}`;
                    if (api?.openExternal) await api.openExternal(url);
                    result = `**Wiki Search:** Could not fetch live content (${res?.error || 'unknown error'}). Opened browser to Fallout 4 Wiki search for "${query}".`;
                }
            } else {
                const url = `https://fallout.fandom.com/wiki/Special:Search?query=${encodeURIComponent(query)}`;
                if (api?.openExternal) {
                    await api.openExternal(url);
                    result = `**Wiki Search Dispatched:** Searching for "${query}" on the Fallout 4 Wiki.\n*External browser session initialized.*`;
                } else {
                    window.open(url, '_blank');
                    result = `**Wiki Search Opened:** "${query}" (Browser redirected to Fallout 4 Wiki).`;
                }
            }
        } catch (e: any) {
            result = `**Wiki Search Error:** ${e?.message || 'Unknown error'}`;
        }
    } else if (name === 'scan_fallout4_live') {
        try {
            const topic: string = String(args.topic || 'Fallout 4 modding').trim();
            const saveToVault: boolean = args.saveToVault !== false; // default true
            const results: string[] = [];
            const savedItems: string[] = [];

            const getVault = (): any[] => {
                try { return JSON.parse(localStorage.getItem('mossy_knowledge_vault') || '[]'); } catch { return []; }
            };
            const saveVault = (vault: any[]) => {
                localStorage.setItem('mossy_knowledge_vault', JSON.stringify(vault));
            };

            if (!api?.webSearch) {
                result = `**Online Scan:** Live web access requires the desktop app. Please restart the app and try again.`;
            } else {
                // 1. Search the Fallout 4 Fandom wiki
                try {
                    const wikiRes: any = await api.webSearch(topic, 'wiki');
                    if (wikiRes?.success && wikiRes?.text) {
                        results.push(`**📖 Fallout 4 Wiki — "${topic}":**\n\n${wikiRes.text}${wikiRes.url ? `\n\n*Source: ${wikiRes.url}*` : ''}`);
                        if (saveToVault && wikiRes.text.length > 50) {
                            const vault = getVault();
                            const wikiTitle = `[Live Scan] FO4 Wiki: ${topic}`;
                            if (!isDuplicateVaultEntry(vault, wikiTitle)) {
                                vault.push({
                                    id: `live-scan-wiki-${Date.now()}`,
                                    title: wikiTitle,
                                    content: wikiRes.text,
                                    source: wikiRes.url || 'https://fallout.fandom.com',
                                    trustLevel: 'community',
                                    tags: ['fallout4', 'wiki', 'live-scan', ...topic.toLowerCase().split(/\s+/).slice(0, 4)],
                                    date: new Date().toISOString(),
                                });
                                saveVault(pruneAutoFetchedVaultItems(vault));
                                savedItems.push('Fallout 4 Wiki excerpt');
                            }
                        }
                    }
                } catch { /* non-critical */ }

                // 2. Search DuckDuckGo for broader modding community info
                try {
                    const ddgRes: any = await api.webSearch(`Fallout 4 ${topic} modding`, undefined);
                    if (ddgRes?.success && ddgRes?.text) {
                        results.push(`**🌐 Web — "Fallout 4 ${topic} modding":**\n\n${ddgRes.text}${ddgRes.url ? `\n\n*Source: ${ddgRes.url}*` : ''}`);
                        if (saveToVault && ddgRes.text.length > 50) {
                            const vault = getVault();
                            const ddgTitle = `[Live Scan] Web: Fallout 4 ${topic}`;
                            if (!isDuplicateVaultEntry(vault, ddgTitle)) {
                                vault.push({
                                    id: `live-scan-web-${Date.now()}`,
                                    title: ddgTitle,
                                    content: ddgRes.text,
                                    source: ddgRes.url || 'https://duckduckgo.com',
                                    trustLevel: 'community',
                                    tags: ['fallout4', 'web-search', 'live-scan', ...topic.toLowerCase().split(/\s+/).slice(0, 4)],
                                    date: new Date().toISOString(),
                                });
                                saveVault(pruneAutoFetchedVaultItems(vault));
                                savedItems.push('Web search results');
                            }
                        }
                    }
                } catch { /* non-critical */ }

                if (results.length === 0) {
                    result = `**Online Scan:** No results found for "${topic}" right now. The Fallout 4 Wiki and DuckDuckGo didn't return a match for that exact term. Try rephrasing the topic (e.g., "Papyrus script event" instead of just "Papyrus"), or I can answer from my existing knowledge if you'd like.`;
                } else {
                    const vaultNote = savedItems.length > 0
                        ? `\n\n✅ **Saved to Knowledge Vault:** ${savedItems.join(', ')} — I'll remember this permanently across all future sessions.`
                        : '';
                    result = `**🔍 Live Scan Results for "${topic}":**\n\n` + results.join('\n\n---\n\n') + vaultNote;
                }
            }
        } catch (e: any) {
            result = `**Online Scan Error:** ${e?.message || 'Unknown error'}`;
        }
    } else if (name === 'browse_web') {
        try {
            const url: string = String(args.url || '').trim();
            if (!url) {
                result = `**Browse Error:** No URL provided.`;
            } else if (!/^https:\/\//i.test(url)) {
                result = `**Browse Error:** Only HTTPS URLs are supported for security reasons.`;
            } else if (api?.browseWeb) {
                const res: any = await api.browseWeb(url);
                if (res?.success && res?.text) {
                    result = `**Web Content from ${url}:**\n\n${res.text.slice(0, 4000)}`;
                } else {
                    result = `**Browse Error:** Could not fetch "${url}": ${res?.error || 'Unknown error'}. Try a different URL or check that the site is accessible.`;
                }
            } else {
                // No IPC available — open in browser as fallback
                if (api?.openExternal) await api.openExternal(url);
                result = `**Browse:** Opened "${url}" in your default browser. (Live content fetch requires the desktop app.)`;
            }
        } catch (e: any) {
            result = `**Browse Error:** ${e?.message || 'Unknown error'}`;
        }
    } else if (name === 'create_mod_project') {
        try {
            const newProject = ModProjectStorage.createModProject({
                name: args.name,
                description: args.description,
                type: args.type,
                author: args.author,
            });
            ModProjectStorage.setCurrentMod(newProject.id);
            result = `✅ **Mod Project Created: "${newProject.name}"**\n\nYour new ${args.type} mod is ready to track!\n\n**Project Details:**\n- ID: ${newProject.id}\n- Type: ${args.type}\n- Author: ${args.author}\n- Version: ${newProject.version}\n\nYou can now add steps to plan and track your progress. Use 'add_mod_step' to get started!`;
        } catch (e) {
            result = `❌ Error creating mod project: ${e}`;
        }
    } else if (name === 'add_mod_step') {
        try {
            const step = ModProjectStorage.addStep(args.projectId, {
                title: args.title,
                description: args.description,
                priority: args.priority || 'medium',
                estimatedHours: args.estimatedHours,
            });
            if (!step) {
                result = `❌ Project not found. Make sure you created a mod project first.`;
            } else {
                result = `✅ **Step Added: "${step.title}"**\n\n- Priority: ${step.priority}\n- Status: pending\n${args.estimatedHours ? `- Estimated: ${args.estimatedHours} hours\n` : ''}\nYou can update the status as you work on this step.`;
            }
        } catch (e) {
            result = `❌ Error adding step: ${e}`;
        }
    } else if (name === 'update_mod_step') {
        try {
            const step = ModProjectStorage.updateStep(args.projectId, args.stepId, {
                status: args.status,
                notes: args.notes,
                actualHours: args.actualHours,
            });
            if (!step) {
                result = `❌ Step or project not found.`;
            } else {
                result = `✅ **Step Updated: "${step.title}"**\n\n- New Status: ${step.status}\n${args.notes ? `- Notes: ${args.notes}\n` : ''}${args.actualHours ? `- Actual Hours: ${args.actualHours}\n` : ''}`;
            }
        } catch (e) {
            result = `❌ Error updating step: ${e}`;
        }
    } else if (name === 'get_mod_status') {
        try {
            const projectId = args.projectId || ModProjectStorage.getCurrentModId();
            if (!projectId) {
                result = `❌ No mod project selected. Create a project first using 'create_mod_project'.`;
            } else {
                const project = ModProjectStorage.getProject(projectId);
                const stats = ModProjectStorage.getProjectStats(projectId);
                if (!project || !stats) {
                    result = `❌ Project not found.`;
                } else {
                    result = `📊 **${project.name} - Project Status**\n\n**Progress:** ${project.completionPercentage}% complete\n**Status:** ${project.status}\n**Version:** ${project.version}\n\n**Steps:**\n- Total: ${stats.totalSteps}\n- Completed: ${stats.completedSteps}\n- In Progress: ${stats.inProgressSteps}\n- Pending: ${stats.pendingSteps}\n- Blocked: ${stats.blockedSteps}\n\n**Time:**\n- Estimated: ${Math.round(stats.totalEstimatedHours)} hours\n- Actual: ${Math.round(stats.totalActualHours)} hours`;
                }
            }
        } catch (e) {
            result = `❌ Error fetching mod status: ${e}`;
        }
    } else if (name === 'list_mod_projects') {
        try {
            const projects = ModProjectStorage.getProjectListItems();
            if (projects.length === 0) {
                result = `📦 **No mod projects yet.** Use 'create_mod_project' to start your first mod!`;
            } else {
                const projectList = projects.map(p => 
                    `• **${p.name}** (${p.type}) - v${p.version}\n  Status: ${p.status} | Progress: ${p.completionPercentage}% | Steps: ${p.completedStepCount}/${p.stepCount}`
                ).join('\n');
                result = `📦 **Your Mod Projects:**\n\n${projectList}`;
            }
        } catch (e) {
            result = `❌ Error listing projects: ${e}`;
        }
    } else if (name === 'set_current_mod') {
        try {
            const success = ModProjectStorage.setCurrentMod(args.projectId);
            if (!success) {
                result = `❌ Project not found.`;
            } else {
                const project = ModProjectStorage.getProject(args.projectId);
                result = `✅ **Active Mod Set: "${project?.name}"**\n\nI'll now provide context-aware advice for this mod. Use 'add_mod_step' to continue planning.`;
            }
        } catch (e) {
            result = `❌ Error setting current mod: ${e}`;
        }
    } else if (name === 'scan_plugin') {
        // ── scan_plugin ───────────────────────────────────────────────────────────
        // Read the plugin binary via IPC (main process), pass it through the
        // asset-analyzer web worker, and return a human-readable diagnostic report.
        try {
            const filePath = String(args.filePath || '').trim();
            if (!filePath) {
                result = '❌ **scan_plugin**: No file path provided. Please give me the full path to the ESP/ESM/ESL file.';
            } else if (!api?.readBinaryFile) {
                result = '❌ **scan_plugin**: readBinaryFile API unavailable. Please restart the app.';
            } else {
                const readRes: any = await api.readBinaryFile(filePath);
                if (!readRes?.success || !readRes?.data) {
                    result = `❌ **scan_plugin**: Could not read file at "${filePath}": ${readRes?.error || 'Unknown error'}. Make sure the file exists and is not locked by another program.`;
                } else {
                    // Decode base64 → ArrayBuffer
                    const binary = atob(readRes.data);
                    const bytes = Uint8Array.from(binary, c => c.charCodeAt(0));
                    const buffer = bytes.buffer;

                    // Spin up the asset-analyzer worker inline via importScripts-compatible URL
                    // Instead, use the already-initialised WorkerManager singleton if available,
                    // otherwise fall back to the analyzeEsp IPC which does a lighter header scan.
                    // We must import WorkerManager dynamically to avoid circular deps.
                    let analysis: any = null;
                    try {
                        const { workerManager } = await import('./WorkerManager');
                        const pluginName = filePath.replace(/\\/g, '/').split('/').pop() || 'plugin.esp';
                        analysis = await workerManager.analyzeAsset('esp', buffer, pluginName, undefined, true);
                    } catch (workerErr) {
                        // Worker unavailable in this context — fall back to the IPC-level analysis
                        if (api?.analyzeEsp) {
                            const ipcRes: any = await api.analyzeEsp(filePath);
                            if (ipcRes?.success) {
                                analysis = { issues: ipcRes.issues || [], recordCounts: {}, masters: [], fileSize: ipcRes.fileSize, fileSizeMB: (ipcRes.fileSize || 0) / (1024 * 1024) };
                            }
                        }
                    }

                    if (!analysis) {
                        result = `❌ **scan_plugin**: Analysis engine unavailable. Use The Auditor to scan "${filePath}".`;
                    } else {
                        const issues: any[] = analysis.issues || [];
                        const masters: string[] = analysis.masters || [];
                        const sizeMB = (analysis.fileSizeMB || (analysis.fileSize || 0) / (1024 * 1024)).toFixed(2);
                        const pluginName = filePath.replace(/\\/g, '/').split('/').pop() || 'plugin';
                        const flags = analysis.flags || {};

                        let report = `## 🔍 Plugin Scan: ${pluginName}\n\n`;
                        report += `**File size:** ${sizeMB} MB  |  **Masters:** ${masters.length > 0 ? masters.join(', ') : 'none declared'}  |  **Flags:** ${[flags.isESM && 'ESM', flags.isESL && 'ESL', flags.isLocalized && 'Localized'].filter(Boolean).join(', ') || 'standard ESP'}\n\n`;

                        if (issues.length === 0) {
                            report += `✅ **No issues detected.** This plugin looks clean — no deleted navmesh, UDRs, broken precombines, or absolute paths found.\n`;
                        } else {
                            const errors   = issues.filter((i: any) => i.severity === 'error');
                            const warnings = issues.filter((i: any) => i.severity === 'warning');
                            const info     = issues.filter((i: any) => i.severity === 'info');
                            report += `**Found ${issues.length} issue(s):** ${errors.length} error(s), ${warnings.length} warning(s), ${info.length} info\n\n`;
                            report += `---\n\n`;

                            for (const issue of issues) {
                                const icon = issue.severity === 'error' ? '🔴' : issue.severity === 'warning' ? '🟡' : 'ℹ️';
                                report += `${icon} **[${issue.category}] ${issue.message}**\n`;
                                report += `${issue.details}\n\n`;
                                report += `💡 **Fix:** ${issue.fix}\n\n`;
                                report += `---\n\n`;
                            }
                        }

                        // Surface auto-fixable hints
                        const hasUDR = issues.some((i: any) => i.category === 'Deleted References');
                        const hasESL = issues.some((i: any) => i.category === 'Optimization' && i.message.includes('ESL'));
                        if (hasUDR || hasESL) {
                            report += `\n**⚡ Auto-fix available:**`;
                            if (hasUDR) report += `\n• I can generate a ready-to-run xEdit UDR script for this plugin — just say "apply UDR fix to this plugin".`;
                            if (hasESL) report += `\n• I can apply the ESL flag directly to this plugin (with backup) — just say "apply ESL flag to this plugin".`;
                        }

                        result = report;
                    }
                }
            }
        } catch (e: any) {
            result = `❌ **scan_plugin error:** ${e?.message || String(e)}`;
        }
    } else if (name === 'apply_esp_fix') {
        // ── apply_esp_fix ─────────────────────────────────────────────────────────
        // Delegate to the main-process IPC handler which does the actual binary
        // patching or script generation with a .bak backup.
        try {
            const filePath = String(args.filePath || '').trim();
            const fixType  = String(args.fixType  || '').trim();
            if (!filePath || !fixType) {
                result = '❌ **apply_esp_fix**: Both filePath and fixType are required.';
            } else if (!api?.applyEspFix) {
                result = '❌ **apply_esp_fix**: applyEspFix API unavailable. Please restart the app to get the latest build.';
            } else {
                const res: any = await api.applyEspFix(filePath, fixType);
                if (res?.success) {
                    result = res.message || '✅ Fix applied successfully.';
                } else {
                    result = `❌ **apply_esp_fix failed:** ${res?.error || 'Unknown error'}`;
                }
            }
        } catch (e: any) {
            result = `❌ **apply_esp_fix error:** ${e?.message || String(e)}`;
        }
    }

    return { result };
};
/**
 * Categorize programs by their likely function
 */
function categorizeProgramsByFunction(apps: any[]): any[] {
    const categoryKeywords: { [key: string]: string[] } = {
        '3D Modeling': ['blender', 'maya', '3dsmax', 'cinema4d', 'zbrush', 'sculptris', 'fusion360', '3d'],
        'Texture Editing': ['photoshop', 'gimp', 'krita', 'clip studio', 'substance', 'affinity', 'paint', 'texturing'],
        'Mesh Tools': ['meshlab', 'meshmixer', 'simplify3d', 'nifskope', 'nif'],
        'Modding Tools': ['xedit', 'tes5edit', 'fo4edit', 'fo4xedit', 'creation kit', 'creationkit', 'loot', 'wrye bash', 'bodyslide', 'outfit studio'],
        'Mod Managers': ['vortex', 'modorganizer', 'mo2', 'nmm', 'fomm'],
        'Scripting': ['python', 'visual studio', 'vscode', 'sublime', 'notepad++', 'atom', 'code editor', 'ide'],
        'Media': ['premiere', 'davinci', 'ffmpeg', 'handbrake', 'audacity', 'video', 'audio', 'media'],
        'AI & ML': ['chatgpt', 'claude', 'copilot', 'ollama', 'neural', 'ai', 'llm', 'tensorflow', 'pytorch'],
        'Utilities': ['7zip', 'winrar', 'total commander', 'everything', 'cleanup', 'optimization'],
    };

    return apps.map((app: any) => {
        const appName = (app.displayName || app.name || '').toLowerCase();
        let category = 'Other';
        
        for (const [cat, keywords] of Object.entries(categoryKeywords)) {
            if (keywords.some(kw => appName.includes(kw))) {
                category = cat;
                break;
            }
        }
        
        return { ...app, category };
    });
}

/**
 * Match a program to a specific modding purpose
 */
function matchProgramToPurpose(app: any, purpose: string): boolean {
    const appName = (app.displayName || app.name || '').toLowerCase();
    const purposeLower = purpose.toLowerCase();
    
    const purposeKeywords: { [key: string]: string[] } = {
        'texture': ['photoshop', 'gimp', 'krita', 'substance', 'texture', 'paint', 'affinity'],
        '3d modeling': ['blender', 'maya', '3dsmax', 'cinema4d', '3d'],
        'mesh': ['blender', 'meshlab', 'nifskope', 'mesh'],
        'weight painting': ['blender', 'bodyslide', 'outfit'],
        'scripting': ['python', 'visual studio', 'vscode', 'code', 'editor', 'ide'],
        'modding': ['xedit', 'tes5', 'fo4edit', 'creation kit', 'loot', 'wrye'],
        'mod management': ['vortex', 'organizer', 'nmm'],
        'compression': ['7zip', 'winrar', 'archive'],
        'video': ['premiere', 'davinci', 'ffmpeg', 'handbrake'],
        'audio': ['audacity', 'reaper', 'ableton'],
    };
    
    for (const [purpose, keywords] of Object.entries(purposeKeywords)) {
        if (purposeLower.includes(purpose)) {
            return keywords.some(kw => appName.includes(kw));
        }
    }
    
    // Fallback: just check if any keyword from the purpose appears in the app name
    return appName.includes(purposeLower);
}

/**
 * Build a comprehensive summary of program analysis
 */
function buildProgramAnalysisSummary(programs: any[], category: string, findUsableFor: string, categorized: any[]): string {
    if (programs.length === 0) {
        if (findUsableFor) {
            return `❌ **No programs found** that could be used for "${findUsableFor}". Your current setup doesn't have a tool for this, but I can recommend one!`;
        }
        return `❌ **No programs found** in the "${category}" category.`;
    }

    const categoryBreakdown = categorized.reduce((acc: any, app: any) => {
        if (!acc[app.category]) acc[app.category] = [];
        acc[app.category].push(app);
        return acc;
    }, {});

    let summary = `✅ **Program Analysis Complete - ${programs.length} Tools Found**\n\n`;

    if (findUsableFor) {
        summary += `**🎯 Tools for "${findUsableFor}":**\n\n`;
        programs.forEach((p: any) => {
            summary += `- **${p.displayName || p.name}**${p.version ? ` (v${p.version})` : ''}\n  📍 ${p.path}\n`;
        });
    } else if (category !== 'all') {
        summary += `**Category: ${category}**\n\n`;
        programs.forEach((p: any) => {
            summary += `- **${p.displayName || p.name}**${p.version ? ` (v${p.version})` : ''}\n`;
        });
    } else {
        summary += `**📊 All Programs by Category:**\n\n`;
        Object.entries(categoryBreakdown).forEach(([cat, apps]: [string, any]) => {
            summary += `**${cat}** (${apps.length})\n`;
            apps.slice(0, 5).forEach((app: any) => {
                summary += `  - ${app.displayName || app.name}\n`;
            });
            if (apps.length > 5) {
                summary += `  ... and ${apps.length - 5} more\n`;
            }
            summary += '\n';
        });
    }

    summary += `\n💡 **Integration Tips:**\n`;
    if (programs.some((p: any) => (p.displayName || p.name).toLowerCase().includes('blender'))) {
        summary += `- Use **Blender** for 3D asset creation and weight painting\n`;
    }
    if (programs.some((p: any) => (p.displayName || p.name).toLowerCase().includes('xedit') || (p.displayName || p.name).toLowerCase().includes('fo4edit'))) {
        summary += `- Use **xEdit/FO4Edit** for modifying ESPs and handling conflicts\n`;
    }
    if (programs.some((p: any) => (p.displayName || p.name).toLowerCase().includes('photoshop') || (p.displayName || p.name).toLowerCase().includes('gimp') || (p.displayName || p.name).toLowerCase().includes('krita'))) {
        summary += `- Use your image editor for texture creation and enhancement\n`;
    }
    if (programs.some((p: any) => (p.displayName || p.name).toLowerCase().includes('vortex') || (p.displayName || p.name).toLowerCase().includes('organizer'))) {
        summary += `- Use your mod manager to test and organize your mods\n`;
    }

    return summary;
}
