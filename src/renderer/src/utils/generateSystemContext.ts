/**
 * Shared system context generator for use in both ChatInterface and LiveContext.
 * This function builds context from localStorage and Electron IPC APIs,
 * avoiding dependency on component-level state.
 */

import {
    buildKnowledgeManifestForModel,
    buildRelevantKnowledgeVaultContext,
    buildBlenderAddonContext,
} from '../knowledgeRetrieval';
import { getCommunityLearningContextForModel } from '../communityLearningProfile';
import { getToolPermissionsContextForModel } from '../toolPermissions';
import { ModProjectStorage } from '../services/ModProjectStorage';

export async function generateSystemContextFromStorage(query?: string): Promise<string> {
    try {
        // === GUIDANCE MODE ===
        const guidanceMode = (localStorage.getItem('mossy_guidance_mode') || 'slow').toLowerCase();
        if (!localStorage.getItem('mossy_guidance_mode')) {
            localStorage.setItem('mossy_guidance_mode', guidanceMode);
        }
        const guidanceLine = `**GUIDANCE MODE:** ${guidanceMode.toUpperCase()} (one step at a time; wait for user confirmation)`;

        // === HARDWARE PROFILE ===
        let hardwareCtx = "Hardware: Unknown";
        try {
            const profileRaw = localStorage.getItem('mossy_system_profile');
            if (profileRaw) {
                const profile = JSON.parse(profileRaw);
                hardwareCtx = `**Spec:** ${profile.gpu} | ${profile.ram}GB RAM | Blender ${profile.blenderVersion}`;
            }
        } catch {
            // ignore
        }

        // === KNOWLEDGE VAULT ===
        let knowledgeVaultContext = "";
        try {
            const manifest = buildKnowledgeManifestForModel();
            const relevant = buildRelevantKnowledgeVaultContext(query || '', { maxItems: 10, maxChars: 7000 });
            if (manifest || relevant) {
                knowledgeVaultContext = `\n**MOSSY'S KNOWLEDGE VAULT (CRITICAL):**${manifest}${relevant}`;
            }
        } catch (e) {
            console.warn('[generateSystemContext] Failed to load memory vault:', e);
        }

        // === VAULT ASSETS ===
        let vaultContext = "";
        try {
            const vaultAssetsStr = localStorage.getItem('vault-assets-v1');
            if (vaultAssetsStr) {
                const vaultAssets = JSON.parse(vaultAssetsStr);
                if (Array.isArray(vaultAssets) && vaultAssets.length > 0) {
                    const assetSummary = vaultAssets
                        .map((a: any) => `- ${a.name} (${a.type}${a.type === 'script' && (a.name.toLowerCase().endsWith('.bat') || a.name.toLowerCase().endsWith('.cmd')) ? ' - batch script' : ''})`)
                        .join('\n');
                    vaultContext = `\n**VAULT ASSETS (Ready for Ingestion):**\n${assetSummary}`;
                }
            }
        } catch (e) {
            console.warn('[generateSystemContext] Failed to load vault assets:', e);
        }

        // === SCAN HISTORY & PERMISSIONS ===
        let scanHistoryCtx = "";
        try {
            const lastScanRaw = localStorage.getItem('mossy_last_scan');
            const summaryRaw = localStorage.getItem('mossy_scan_summary');
            const summary = summaryRaw ? JSON.parse(summaryRaw) : null;
            const lastScan = lastScanRaw ? new Date(Number(lastScanRaw)) : null;
            const lastScanLine = lastScan && !Number.isNaN(lastScan.getTime())
                ? `Last scan: ${lastScan.toLocaleString()}`
                : 'Last scan: unknown';

            const totalPrograms = summary?.totalPrograms ?? 'unknown';
            const nvidiaTools = summary?.nvidiaTools ?? 'unknown';
            const aiTools = summary?.aiTools ?? 'unknown';

            const detectedAppsRaw = localStorage.getItem('mossy_apps') || '[]';
            const detectedApps = JSON.parse(detectedAppsRaw);
            const approved = (detectedApps || []).filter((a: any) => a?.checked !== false);
            const denied = (detectedApps || []).filter((a: any) => a?.checked === false);
            const permissionLine = approved.length === 0 && denied.length === 0
                ? 'Permissions: not requested'
                : `Permissions: approved ${approved.length}, denied ${denied.length}`;

            scanHistoryCtx = `\n**SCAN HISTORY & PERMISSIONS:**\n- ${lastScanLine}\n- Programs detected: ${totalPrograms} | NVIDIA tools: ${nvidiaTools} | AI tools: ${aiTools}\n- ${permissionLine}`;
        } catch {
            scanHistoryCtx = "\n**SCAN HISTORY & PERMISSIONS:**\n- Last scan: unknown\n- Permissions: unknown";
        }

        // === LIVE TOOL MONITORING ===
        let liveToolCtx = "";
        try {
            const activeRaw = localStorage.getItem('mossy_active_tools');
            if (activeRaw) {
                const active = JSON.parse(activeRaw);
                const toolNames = Array.isArray(active?.tools) ? active.tools.map((t: any) => t.name).filter(Boolean) : [];
                const activeAt = active?.at ? new Date(Number(active.at)) : null;
                const activeLine = activeAt && !Number.isNaN(activeAt.getTime())
                    ? `Last tool sync: ${activeAt.toLocaleTimeString()}`
                    : 'Last tool sync: unknown';
                const toolsLine = toolNames.length > 0 ? toolNames.join(', ') : 'None';
                liveToolCtx = `\n**LIVE TOOL MONITORING:**\n- ${activeLine}\n- Active tools: ${toolsLine}`;
            } else {
                liveToolCtx = "\n**LIVE TOOL MONITORING:**\n- No active tool context yet.";
            }
        } catch {
            liveToolCtx = "\n**LIVE TOOL MONITORING:**\n- Unavailable";
        }

        // === CURRENT MOD PROJECT ===
        let modContext = "";
        try {
            const currentMod = ModProjectStorage.getCurrentMod();
            if (currentMod) {
                const stats = ModProjectStorage.getProjectStats(currentMod.id);
                modContext = `\n**CURRENT MOD PROJECT:** "${currentMod.name}"\n- Type: ${currentMod.type} | Status: ${currentMod.status}\n- Progress: ${currentMod.completionPercentage}% | Steps: ${stats?.completedSteps || 0}/${stats?.totalSteps || 0}\n- Version: ${currentMod.version}\n(Provide context-aware guidance for this specific mod.)`;
            }
        } catch (e) {
            // ModProjectStorage not available, skip
        }

        // === BRIDGE & BLENDER STATUS ===
        // Note: These are set from IPC/UI state, so we read them from localStorage if available
        const blenderLinked = localStorage.getItem('mossy_blender_active') === 'true';
        const bridgeStatus = localStorage.getItem('mossy_bridge_active') === 'true' ? "ONLINE" : "OFFLINE";

        let blenderAddonKnowledge = '';
        let blenderContext = '';
        if (blenderLinked) {
            try {
                blenderAddonKnowledge = buildBlenderAddonContext();
            } catch {
                blenderAddonKnowledge = '';
            }
            blenderContext = `**BLENDER LINK: ACTIVE (Mossy Link v6 — Fallout 4 Edition)**\nYou are co-piloting the user's Blender session. You can see their scene context, execute Python scripts, and run FO4 automation presets.\nIMPORTANT: Tell the user they MUST click the 'Run Command' button that appears in the chat to execute any script.${blenderAddonKnowledge ? '\n' + blenderAddonKnowledge : ''}`;
        } else {
            blenderContext = "**BLENDER LINK: OFFLINE**\n(If the user asks to control Blender, tell them to go to the Desktop Bridge and install the 'Mossy Link v6' add-on first.)";
        }

        const toolAck = localStorage.getItem('mossy_tool_connection_ack') === 'true';
        const toolAckLine = `**Tool Connection Notice:** ${toolAck ? 'ACKNOWLEDGED (do not repeat unless asked)' : 'NOT ACKNOWLEDGED'}`;

        const isMonitoringPaused = localStorage.getItem('mossy_monitoring_paused') === 'true';
        const monitoringLine = `**Monitoring Status:** ${isMonitoringPaused ? 'PAUSED' : 'ACTIVE'}`;

        // === USER SETTINGS ===
        let settingsCtx = "";
        try {
            const api = (window as any).electron?.api || (window as any).electronAPI;
            if (api?.getSettings) {
                const formalSettings = await api.getSettings();
                if (formalSettings) {
                    const s = formalSettings;
                    settingsCtx = "\n**USER OVERRIDE SETTINGS (HIGHEST PRIORITY):**\n" +
                        (s.fallout4Path ? `- **Fallout 4 Game Folder:** ${s.fallout4Path}\n` : "") +
                        (s.mo2Path ? `- MO2/ModOrganizer: ${s.mo2Path}\n` : "") +
                        (s.xeditPath ? `- FO4Edit/XEdit: ${s.xeditPath}\n` : "") +
                        (s.wryeBashPath ? `- Wrye Bash: ${s.wryeBashPath}\n` : "") +
                        (s.vortexPath ? `- Vortex: ${s.vortexPath}\n` : "") +
                        (s.bodySlidePath ? `- BodySlide: ${s.bodySlidePath}\n` : "") +
                        (s.outfitStudioPath ? `- Outfit Studio: ${s.outfitStudioPath}\n` : "") +
                        (s.creationKitPath ? `- Creation Kit: ${s.creationKitPath}\n` : "") +
                        (s.nifSkopePath ? `- NifSkope: ${s.nifSkopePath}\n` : "") +
                        (s.blenderPath ? `- Blender: ${s.blenderPath}\n` : "");
                }
            }
        } catch (e) {
            console.warn('[generateSystemContext] Failed to get user settings:', e);
        }

        // === FALLOUT 4 INSTALLATIONS ===
        let gameFolderInfo = "\n**FALLOUT 4 INSTALLATIONS:**\n";
        try {
            const detectedAppsRaw = localStorage.getItem('mossy_apps') || '[]';
            const detectedApps = JSON.parse(detectedAppsRaw);
            const fallout4Apps = (detectedApps || []).filter((a: any) =>
                a.name.toLowerCase().includes('fallout 4') ||
                a.displayName?.toLowerCase().includes('fallout 4') ||
                a.path?.toLowerCase().includes('fallout 4')
            );

            if (fallout4Apps.length > 0) {
                gameFolderInfo = `\n**FALLOUT 4 INSTALLATIONS (${fallout4Apps.length} found):**\n` +
                    fallout4Apps.map((app: any, idx: number) => {
                        const driveLetter = app.path?.charAt(0).toUpperCase() || '?';
                        const installType = app.path?.toLowerCase().includes('steam') ? '[STEAM]' :
                            app.path?.toLowerCase().includes('gog') ? '[GOG]' :
                                app.path?.toLowerCase().includes('xbox') || app.path?.toLowerCase().includes('microsoft') ? '[XBOX/MS STORE]' : '';
                        return `  ${idx + 1}. ${installType} ${driveLetter}: drive - ${app.path}\n     Data folder: ${app.path}\\Data`;
                    }).join('\n');
            } else {
                gameFolderInfo = "\n**FALLOUT 4 NOT DETECTED** - User may need to manually specify game folder in External Tools Settings.";
            }
        } catch {
            gameFolderInfo = "\n**FALLOUT 4 INSTALLATIONS:** (Unable to load)";
        }

        // === APP FEATURES ===
        const appFeatures = `\n**OMNIFORGE MODULES (Built-in):**\n` +
            [
                "• Image Studio (/images): PBR Map Synthesizer and Format Converter. Fallout 4 profile uses: _d → BC7, _n → BC5, _s → BC5.",
                "• The Auditor (/auditor): Scans ESP/ESM, NIF, DDS, BGSM with native file pickers; reports issues and basic auto-fixes.",
                "• The Vault (/vault): Asset library + BA2 staging, presets, and external tool paths (texconv, xWMAEncode, PapyrusCompiler, gfxexport, splicer).",
                "• Workshop (/workshop): Real file browser and editor; Papyrus compile via configured compiler path.",
                "• Holodeck (/holodeck): Automated mod validator; integrates with Neural Link to monitor live gameplay.",
                "• System Monitor (/system): Hardware and tools scan, Desktop Bridge status, launch helpers.",
                "• The Scribe (/scribe): Documentation and readme assistant (AI-backed)."
            ].join('\n');

        // === WORKING MEMORY ===
        const workingMemory = localStorage.getItem('mossy_working_memory') || 'None';

        // === DETECTED TOOLS ===
        let detectedToolsText = "None";
        try {
            const detectedAppsRaw = localStorage.getItem('mossy_apps') || '[]';
            const detectedApps = JSON.parse(detectedAppsRaw);
            const withPaths = (detectedApps || []).filter((a: any) => a.path);
            if (withPaths.length > 0) {
                detectedToolsText = withPaths.map((a: any) => `${a.name} [ID: ${a.id}] (Path: ${a.path})`).join(', ');
            }
        } catch {
            // ignore
        }

        // === COMMUNITY LEARNING & TOOL PERMISSIONS ===
        const communityLearningCtx = getCommunityLearningContextForModel();
        const toolPermissionsCtx = getToolPermissionsContextForModel({
            bridgeActive: bridgeStatus === "ONLINE",
            blenderLinked: blenderLinked,
        });

        // === ASSEMBLE FINAL CONTEXT ===
        return `
      **DYNAMIC SYSTEM CONTEXT:**
      **Desktop Bridge:** ${bridgeStatus}
      ${blenderContext}
    ${toolAckLine}
    ${guidanceLine}
    ${monitoringLine}
            ${settingsCtx}${gameFolderInfo}
            ${appFeatures}
        ${toolPermissionsCtx}
      **Short-Term Working Memory:** ${workingMemory}
      **Current Mod Project:** ${modContext || "None"}
      ${knowledgeVaultContext}
      ${vaultContext}
      **Detected Tools:** ${detectedToolsText}
      ${hardwareCtx}
    ${scanHistoryCtx}
    ${liveToolCtx}
            ${communityLearningCtx}
      `;
    } catch (e) {
        console.error('[generateSystemContext] Error gathering system telemetry:', e);
        return "Context: Error gathering system telemetry.";
    }
}
