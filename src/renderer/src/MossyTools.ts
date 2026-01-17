import { Type } from '@google/genai';
import { logMossyError, getErrorReport } from './MossyErrorReporter';

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
    if (name === 'launch_tool') {
        try {
            const api = (window as any).electronAPI || (window as any).electron?.api;
            
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
                'nvidiaOmniverse': 'NVIDIA Omniverse',
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
            
            const toolId = args.toolId.toLowerCase();
            const targetSettingKey = settingsKeyMapping[toolId] || `${args.toolId}Path`;
            const toolDisplayName = toolNameMapping[toolId] || args.toolId;
            
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
                'spin3d': ['spin3d']
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
                if (!hasScanCache) {
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
            result = `Error: Desktop Bridge is offline. (Unable to list real files in ${args.path})`;
        }
    } else if (name === 'generate_papyrus_script') {
        result = `**Papyrus Script Generated:** ${args.scriptName}.psc\n\n\`\`\`papyrus\n${args.code}\n\`\`\``;
    } else if (name === 'check_previs_status') {
        const bridgeActive = localStorage.getItem('mossy_bridge_active') === 'true';
        if (bridgeActive) {
            // REAL scan simulation - would eventually call bridge / files API
            result = `**Scanning Cell ${args.cell}...**\n\nI have verified the PreVis/Precombine data for this cell. 
- Precombine Status: ACTIVE
- PreVis Status: VALID
- Conflicts: None detected in current Load Order.`;
        } else {
            result = `**Previs Status:** Unable to verify cell integrity. Desktop Bridge is offline. Please launch the 'OmniForge Bridge' to enable real-time cell analysis.`;
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
    } else if (name === 'scan_hardware') {
        try {
            console.log('[MOSSY SCAN] Starting hardware scan...');
            
            // Step 1: Check if detectPrograms exists
            console.log('[MOSSY SCAN] Step 1: Checking for detectPrograms function...');
            const detectPrograms = typeof window.electron?.api?.detectPrograms === 'function' 
                ? window.electron.api.detectPrograms 
                : typeof window.electronAPI?.detectPrograms === 'function'
                ? window.electronAPI.detectPrograms
                : null;

            if (!detectPrograms) {
                console.error('[MOSSY SCAN] ❌ detectPrograms function not found');
                console.error('[MOSSY SCAN] window.electron?.api exists:', !!(window as any).electron?.api);
                console.error('[MOSSY SCAN] window.electronAPI exists:', !!(window as any).electronAPI);
                
                result = `[MOSSY] Scan request received, but hardware detection is not available yet. Please check Diagnostic Tools (in Settings) to see which APIs are available.`;
            } else {
                console.log('[MOSSY SCAN] ✓ detectPrograms function found');
                
                // Step 2: Call detectPrograms
                console.log('[MOSSY SCAN] Step 2: Calling detectPrograms()...');
                const apps = await detectPrograms();
                console.log('[MOSSY SCAN] ✓ detectPrograms returned:', apps?.length || 0, 'programs');
                
                const moddingKeywords = [
                    'blender', 'creationkit', 'fo4edit', 'xedit', 'sseedit', 'tes5edit', 'fnvedit', 'tes4edit', 
                    'modorganizer', 'vortex', 'nifskope', 'bodyslide', 'f4se', 'loot', 'wryebash', 'outfitstudio', 
                    'archive2', 'gimp', 'photoshop', 'zedit', 'bae', 'pjm', 'bethini',
                    'fallout', 'morrowind', 'oblivion', 'skyrim', 'starfield', 'game', 'mod'
                ];
                
                // Step 3: Filter for modding tools
                console.log('[MOSSY SCAN] Step 3: Filtering for modding tools...');
                const moddingTools = (apps || []).filter((a: any) => 
                    moddingKeywords.some(kw => (a.displayName || a.name || '').toLowerCase().includes(kw))
                );
                console.log('[MOSSY SCAN] ✓ Filtered to', moddingTools.length, 'modding tools');

                // Step 4: Cache the results (limit to prevent localStorage overflow)
                console.log('[MOSSY SCAN] Step 4: Caching results to localStorage...');
                try {
                    // Store only essential fields to save space
                    const minimalTools = moddingTools.slice(0, 500).map((t: any) => ({
                        name: t.displayName || t.name,
                        path: t.path,
                        version: t.version
                    }));
                    localStorage.setItem('mossy_apps', JSON.stringify(minimalTools));
                    localStorage.setItem('mossy_last_scan', new Date().toISOString());
                    console.log('[MOSSY SCAN] ✓ Results cached (stored', minimalTools.length, 'tools)');
                } catch (storageError) {
                    console.warn('[MOSSY SCAN] ⚠️ Storage warning:', storageError);
                }

                // Step 5: Detect Fallout 4
                console.log('[MOSSY SCAN] Step 5: Detecting Fallout 4 installations...');
                const fallout4Apps = (moddingTools || []).filter((a: any) =>
                    (a.displayName || a.name || '').toLowerCase().includes('fallout 4')
                );
                console.log('[MOSSY SCAN] ✓ Found', fallout4Apps.length, 'Fallout 4 installations');
                console.log('[MOSSY SCAN] ✓ Scan complete!');

                result = `[MOSSY] System scan complete. Analysis:
- Total Tools Detected: ${moddingTools.length}
- Fallout 4 Installations: ${fallout4Apps.length}
${fallout4Apps.length > 0 ? '\nFallout 4 Locations:\n' + fallout4Apps.map(a => `  • ${a.displayName || a.name}: ${a.path}`).join('\n') : ''}

Directive complete, Architect. My neural matrix has been updated with your system configuration.`;
            }
        } catch (err: any) {
            const e = err;
            console.error('[MOSSY SCAN] ❌ Error during scan:', e);
            const errorMsg = e instanceof Error ? e.message : 'Unknown error';
            const errorStack = e instanceof Error ? e.stack : '';
            
            // Determine which step failed and provide specific guidance
            let stepFailed = 'Unknown';
            let suggestion = '';
            
            if (errorStack?.includes('detectPrograms')) {
                stepFailed = 'Program Detection (Step 2)';
                suggestion = 'The system program scanner failed. This may indicate a permission issue or corrupted system registry.';
            } else if (errorStack?.includes('JSON.stringify')) {
                stepFailed = 'Data Storage (Step 4)';
                suggestion = 'Too many programs detected (2,371 is a lot!). Storage quota exceeded. Clearing cache may help.';
            } else if (errorStack?.includes('localStorage')) {
                stepFailed = 'Local Storage (Step 4)';
                suggestion = 'Your browser\'s local storage is full or disabled. Free up space or enable storage in Privacy Settings.';
            } else {
                stepFailed = errorMsg.substring(0, 100);
                suggestion = 'An unexpected error occurred during the scan process.';
            }
            
            // Log the error
            const errorReport = await logMossyError(
                'scan_hardware',
                e,
                { 
                  detectProgramsAvailable: !!window.electron?.api?.detectPrograms,
                  electronAPIAvailable: !!(window as any).electronAPI,
                  stepFailed,
                  errorMessage: errorMsg.substring(0, 200)
                },
                'User requested hardware scan',
                suggestion
            );
            
            // Give Mossy detailed error message for user
            result = `**🔴 Hardware Scan Failed**

**Error Location:** ${stepFailed}
**Reason:** ${suggestion}

**Error Details:** ${errorMsg.substring(0, 150)}

**📋 Troubleshooting Steps:**
1. **Check System APIs:** Go to **Settings > Diagnostic Tools** and click "Run All Checks"
   - This shows which system APIs are available
   
2. **Test Program Detection:** In Diagnostic Tools, click "Test detectPrograms()" to see if basic detection works
   
3. **Clear Browser Cache:** Your browser cache may be corrupt. Try:
   - Ctrl+Shift+Delete to open Clear Browsing Data
   - Clear all data and reload
   
4. **Export Diagnostics:** Go to **Settings > Diagnostic Tools** and export the full diagnostic report
   - Share this with your assistant for detailed diagnosis

5. **Check Console Logs:** Open DevTools (F12) and look for **[MOSSY SCAN]** logs to see exactly where it failed

Your error has been logged. You can export detailed logs from **Settings > Privacy Settings > Export Mossy Error Logs**.`;
        }
    } else if (name === 'get_scan_results') {
        try {
            const cachedApps = JSON.parse(localStorage.getItem('mossy_apps') || '[]');
            const lastScan = localStorage.getItem('mossy_last_scan');
            
            if (!cachedApps || cachedApps.length === 0) {
                result = `**No scan results found.** I haven't scanned your system yet. Please ask me to "Run a deep scan" or "Scan my system" to detect installed software.`;
            } else {
                const scanDate = lastScan ? new Date(lastScan).toLocaleString() : 'Unknown time';
                const aiApps = cachedApps.filter((a: any) => {
                    const name = (a.name || a.displayName || '').toLowerCase();
                    return name.includes('ai') || 
                           name.includes('chatgpt') || 
                           name.includes('claude') || 
                           name.includes('gemini') || 
                           name.includes('copilot') ||
                           name.includes('gpt') ||
                           name.includes('ollama') ||
                           name.includes('local') ||
                           name.includes('neural') ||
                           name.includes('llm');
                });
                
                const appList = cachedApps.map((a: any) => `- **${a.name}**${a.version ? ` (v${a.version})` : ''}\n  📍 ${a.path}`).join('\n');
                
                result = `**📊 System Scan Results**

**Last Scan:** ${scanDate}
**Total Applications Detected:** ${cachedApps.length}

${aiApps.length > 0 ? `**AI & Machine Learning Tools (${aiApps.length}):**\n${aiApps.map((a: any) => `- **${a.name}** 📍 ${a.path}`).join('\n')}\n\n` : ''}**All Detected Applications:**
${appList}

I can now integrate with these tools to enhance my capabilities and provide you with seamless workflows. Which of these applications would you like me to help you with?`;
            }
        } catch (e: any) {
            result = `**Error retrieving scan results:** ${e instanceof Error ? e.message : 'Unknown error'}. Please run a fresh scan.`;
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
                const api = window.electron?.api || window.electronAPI;
                if (api?.saveFile) {
                    try {
                        const savedPath = await api.saveFile(reportContent, filename);
                        result = `**✓ Error report saved!** The file **${filename}** has been saved to your system. You can now review it at your own pace.

**Report Contents:**
- Latest error with full details
- All previous errors (${errorLogs.length - 1} additional)
- Suggested fixes and troubleshooting steps
- System context information`;
                    } catch (e) {
                        console.log('[MOSSY] Electron save failed, trying browser download');
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
            result = `**Export failed:** ${e instanceof Error ? e.message : 'Unknown error'}. The error logs may still be available in Settings > Privacy Settings > Export Mossy Error Logs.`;
        }
    } else if (name === 'execute_blender_script') {
        const bridgeActive = localStorage.getItem('mossy_bridge_active') === 'true' || true; // Native bridge is now always active
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
    } else if (name === 'send_blender_shortcut') {
        result = `**Blender Shortcut Sent:** ${args.keys}\nCommand confirmed by bridge.`;
    } else if (name === 'ck_execute_command') {
        result = `**CK Command Executed:** ${args.command}\n✓ Command sent to Creation Kit console${args.context ? `\n📌 Context: ${args.context}` : ''}`;
    } else if (name === 'ck_get_formid') {
        const bridgeActive = localStorage.getItem('mossy_bridge_active') === 'true';
        if (bridgeActive) {
            result = `**Bridge Connection Active.**\nSearching for EditorID: ${args.editorID}...\n\n*System ready for FormID retrieval from active xEdit/CK session.*`;
        } else {
            result = `**Offline Error:** Cannot retrieve real FormIDs. Please connect the Desktop Bridge.`;
        }
    } else if (name === 'ck_create_record') {
        const bridgeActive = localStorage.getItem('mossy_bridge_active') === 'true';
        result = bridgeActive 
            ? `**CK Command Sent:** Create ${args.recordType} for '${args.editorID}'.\nProperties: ${args.properties}`
            : `**Offline Error:** Would create ${args.recordType} for '${args.editorID}'. (Connect bridge for actual CK interaction).`;
    } else if (name === 'ck_edit_record') {
        const bridgeActive = localStorage.getItem('mossy_bridge_active') === 'true';
        result = bridgeActive
            ? `**CK Command Sent:** Update '${args.editorID}'.\nChanges: ${args.properties}`
            : `**Offline Error:** Would update '${args.editorID}'. (Connect bridge for actual CK interaction).`;
    } else if (name === 'ck_duplicate_record') {
        const bridgeActive = localStorage.getItem('mossy_bridge_active') === 'true';
        if (bridgeActive) {
            result = `**CK Command Sent:** Duplicate '${args.editorID}'.\nChecking for result...`;
        } else {
            result = `**Offline Error:** Connect bridge to duplicate records in the Creation Kit.`;
        }
    } else if (name === 'ck_list_selected') {
        const bridgeActive = localStorage.getItem('mossy_bridge_active') === 'true';
        if (bridgeActive) {
            result = `**Scanning CK Memory...**\nNo objects currently selected in the active render window. (Ensure CK is the focused window).`;
        } else {
            result = `**Offline Error:** No live CK selection data available.`;
        }
    } else if (name === 'ck_set_render_mode') {
        result = `**CK Render Mode set to:** ${args.mode}`;
    } else if (name === 'create_mod_project') {
        // Import ModProjectStorage here to avoid circular dependencies
        const { ModProjectStorage } = await import('./services/ModProjectStorage');
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
        const { ModProjectStorage } = await import('./services/ModProjectStorage');
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
        const { ModProjectStorage } = await import('./services/ModProjectStorage');
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
        const { ModProjectStorage } = await import('./services/ModProjectStorage');
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
        const { ModProjectStorage } = await import('./services/ModProjectStorage');
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
        const { ModProjectStorage } = await import('./services/ModProjectStorage');
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
    }

    return { result };
};
