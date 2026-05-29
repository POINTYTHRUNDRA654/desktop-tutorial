import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
    Gamepad2, Play, CheckCircle2, AlertTriangle, Copy, Target, BarChart3,
    BookOpen, Swords, Home, User, List, Loader2, ChevronDown,
    FileWarning, ShieldCheck, ClipboardList, Layers, PlayCircle,
} from 'lucide-react';
import { ToolsInstallVerifyPanel } from './components/ToolsInstallVerifyPanel';
import { useWheelScrollProxyFrom } from './components/useWheelScrollProxy';

interface TestScenario {
    id: string;
    name: string;
    description: string;
    category: 'quest' | 'combat' | 'settlement' | 'npc' | 'load_order';
    steps: TestStep[];
    expectedOutcome: string;
    severity: 'critical' | 'major' | 'minor';
}

interface TestStep {
    action: 'spawn' | 'teleport' | 'execute-console' | 'wait' | 'interact' | 'screenshot';
    parameters: Record<string, any>;
    description: string;
    expectedResult: string;
    riskAreas: string[];
}

interface TestRun {
    id: string;
    scenarioId: string;
    timestamp: string;
    status: 'pass' | 'fail' | 'partial' | 'skip' | 'error';
    issues: string[];
    duration: number;
}

const TEST_SCENARIOS: TestScenario[] = [
    // ── EXISTING SCENARIOS ────────────────────────────────────────────────────
    {
        id: 'bridge-check',
        name: 'Desktop Bridge Status',
        description: 'Verify the Desktop Bridge API is available and that Mossy can communicate with the game environment.',
        category: 'load_order',
        severity: 'critical',
        expectedOutcome: 'Desktop Bridge API is accessible. All required IPC methods (getRunningProcesses, readFile, getSettings) respond without error.',
        steps: [
            {
                action: 'wait',
                parameters: { check: 'bridge-api' },
                description: 'Check Desktop Bridge API availability via window.electronAPI. Confirm IPC methods getRunningProcesses and getSettings are present and callable.',
                expectedResult: 'electronAPI or electron.api object is accessible with IPC methods present',
                riskAreas: ['Bridge not started', 'Running as web-only (not packaged Electron app)']
            }
        ]
    },
    {
        id: 'game-process',
        name: 'Game Process Detection',
        description: 'Verify Fallout 4 or F4SE is detected as a running process before any in-game testing.',
        category: 'load_order',
        severity: 'critical',
        expectedOutcome: 'Fallout4.exe or f4se_loader.exe is found in the running process list.',
        steps: [
            {
                action: 'wait',
                parameters: { check: 'process', names: ['fallout4', 'f4se'] },
                description: 'Query getRunningProcesses() and scan for Fallout4.exe or f4se_loader.exe in the process list.',
                expectedResult: 'At least one game process is actively running',
                riskAreas: ['Game not launched', 'Wrong launcher name', 'Insufficient process permissions']
            }
        ]
    },
    {
        id: 'load-order-check',
        name: 'Load Order Integrity',
        description: 'Read and validate the active load order. Checks that Fallout4.esm loads first and scans for duplicate entries.',
        category: 'load_order',
        severity: 'major',
        expectedOutcome: 'plugins.txt is readable, Fallout4.esm is first, no duplicate plugin filenames.',
        steps: [
            {
                action: 'wait',
                parameters: { check: 'mo2-path' },
                description: 'Confirm MO2 path is configured in Settings → External Tools.',
                expectedResult: 'mo2Path is set and non-empty in settings',
                riskAreas: ['Path not configured', 'MO2 not installed']
            },
            {
                action: 'wait',
                parameters: { check: 'mo2-modlist' },
                description: 'Read active profile modlist.txt and plugins.txt from MO2 profile folder. Check Fallout4.esm ordering and scan for duplicate entries.',
                expectedResult: 'modlist.txt and plugins.txt are readable; Fallout4.esm is first in load order',
                riskAreas: ['Profile corruption', 'MO2 not yet run for this profile']
            }
        ]
    },
    {
        id: 'navmesh-risk',
        name: 'Navmesh CTD Risk Check',
        description: 'Cross-reference latest Auditor scan results for deleted NAVM records, which cause NPC pathfinding CTDs.',
        category: 'npc',
        severity: 'critical',
        expectedOutcome: 'Zero plugins flagged with deleted NAVM records in The Auditor scan.',
        steps: [
            {
                action: 'wait',
                parameters: { check: 'auditor-navmesh' },
                description: 'Read mossy_scan_auditor from localStorage and check for [Navmesh] error-severity issues. Direct to Auditor if scan data is missing.',
                expectedResult: 'No files have issues with category "Navmesh" at error severity',
                riskAreas: ['Deleted navmesh records', 'Unfinalized cell navmesh in CK']
            },
            {
                action: 'execute-console',
                parameters: { note: 'Run The Auditor first if no scan data is present' },
                description: 'If no scan data found, direct user to run an ESP scan in The Auditor.',
                expectedResult: 'Auditor scan data exists with at least one plugin scanned',
                riskAreas: ['No plugins uploaded to Auditor yet']
            }
        ]
    },
    {
        id: 'papyrus-log',
        name: 'Papyrus Log Health Check',
        description: 'Locate and analyse the most recent Papyrus script log for errors, missing .pex files, and VM freezes.',
        category: 'quest',
        severity: 'major',
        expectedOutcome: 'No VM terminated events, no "cannot open store for class" errors, script stack healthy.',
        steps: [
            {
                action: 'wait',
                parameters: { check: 'papyrus-log' },
                description: 'Call gameLogMonitor.getLastLogPath() to locate Papyrus.0.log, then verify it exists and is readable.',
                expectedResult: 'Papyrus.0.log path is found and the file is accessible',
                riskAreas: ['Game never launched', 'Non-standard Documents path', 'Log not yet generated']
            },
            {
                action: 'screenshot',
                parameters: { pattern: 'error|terminated|cannot open store' },
                description: 'Scan log content for critical error patterns: VM freeze, missing scripts, stack overflows.',
                expectedResult: 'Zero lines matching "VM is frozen", "cannot open store for class", or "stack overflow"',
                riskAreas: ['Script overload', 'Missing .pex files', 'F4SE version mismatch']
            }
        ]
    },
    {
        id: 'settlement-workshop',
        name: 'Settlement / Workshop Script Safety',
        description: 'Verify the settlement build environment is stable: correct DLC load order and no WorkshopScript override conflicts.',
        category: 'settlement',
        severity: 'major',
        expectedOutcome: 'DLC workshop ESMs load before any settlement-overhaul mods; no WorkshopScript conflicts in Papyrus log.',
        steps: [
            {
                action: 'wait',
                parameters: { check: 'mo2-modlist' },
                description: 'Check plugins.txt for DLCWorkshop01-03.esm ordering relative to settlement mods.',
                expectedResult: 'All DLCWorkshop*.esm entries appear before settlement overhaul plugins',
                riskAreas: ['Out-of-order DLC ESMs', 'Multiple settlement overhauls active simultaneously']
            },
            {
                action: 'wait',
                parameters: { check: 'papyrus-log', filter: 'workshop' },
                description: 'Scan Papyrus log for WorkshopScript errors from the last game session.',
                expectedResult: 'No "WorkshopScript" or "WorkshopParent" lines at error level',
                riskAreas: ['Sim Settlements + vanilla workshop conflicts', 'Missing F4SE for WSFW']
            }
        ]
    },

    // ── NEW SCENARIOS ─────────────────────────────────────────────────────────
    {
        id: 'f4se-version',
        name: 'F4SE Version Compatibility',
        description: 'Verify F4SE is installed and its loader is present in the Fallout 4 folder. A missing or outdated F4SE causes all script-extender mods to silently fail.',
        category: 'load_order',
        severity: 'critical',
        expectedOutcome: 'f4se_loader.exe is present in the Fallout 4 installation folder alongside Fallout4.exe.',
        steps: [
            {
                action: 'wait',
                parameters: { check: 'f4se-version' },
                description: 'Read fallout4Path from Settings. Use fsStat to verify both Fallout4.exe and f4se_loader.exe are present in the same directory. Attempt to read f4se_readme.txt for version details.',
                expectedResult: 'Both Fallout4.exe and f4se_loader.exe exist in the configured game folder',
                riskAreas: ['Game updated via Steam but F4SE not updated', 'F4SE installed in wrong folder', 'DLL version mismatch breaks all F4SE plugins']
            }
        ]
    },
    {
        id: 'seq-file-check',
        name: 'Quest SEQ File Presence',
        description: 'Verify that the Data\\Seq\\ folder exists and contains .seq files. Missing SEQ files are the #1 cause of quests that never start on save load.',
        category: 'quest',
        severity: 'critical',
        expectedOutcome: 'Data\\Seq\\ folder exists and contains at least one .seq file. All quest-enabled mods should have a matching Seq file.',
        steps: [
            {
                action: 'wait',
                parameters: { check: 'seq-files' },
                description: 'Verify the Data\\Seq\\ folder exists at the Fallout 4 installation path. Count .seq files. If none found, surface the xEdit "Generate Sequence File" fix.',
                expectedResult: 'Data\\Seq\\ is present with one or more .seq entries',
                riskAreas: ['Missing .seq causes quest to never start on save load', 'CK export skips SEQ generation step', 'Seq files accidentally deleted during MO2 reorganization']
            }
        ]
    },
    {
        id: 'plugin-count',
        name: 'Plugin Slot Limit Check',
        description: 'Count active ESP/ESM vs ESL plugins. Exceeding 254 full-weight slots causes an immediate CTD on game load — no error message, no warning.',
        category: 'load_order',
        severity: 'critical',
        expectedOutcome: 'Full-weight (ESP/ESM) plugin count ≤ 253. ESL-flagged plugins do not count against this limit.',
        steps: [
            {
                action: 'wait',
                parameters: { check: 'plugin-count' },
                description: 'Read plugins.txt from MO2 active profile (or via Bridge /loadorder/read fallback). Separate ESL from ESP/ESM. Warn at ≥244, error at ≥254.',
                expectedResult: 'ESP/ESM count is 253 or below; no overflow risk',
                riskAreas: ['Exceeding 254 ESP/ESM slots causes immediate CTD', 'ESL-flagging malformed plugins can corrupt saves', 'Merged patch not yet generated']
            }
        ]
    },
    {
        id: 'crash-log-scan',
        name: 'Recent Crash Log Detection',
        description: 'Scan the F4SE crash log folder (Documents\\My Games\\Fallout4\\F4SE\\) for files modified in the last 24 hours to surface recent CTD events.',
        category: 'load_order',
        severity: 'critical',
        expectedOutcome: 'No crash log files detected in the past 24 hours, or crash logs exist and the user has been alerted to review them.',
        steps: [
            {
                action: 'wait',
                parameters: { check: 'crash-logs' },
                description: 'Derive the My Games\\Fallout4 path from the stored Papyrus log path. Scan the F4SE subfolder for any .log files containing "crash" in the name. Alert on any file newer than 24 hours.',
                expectedResult: 'Zero crash log files found in the past 24 hours',
                riskAreas: ['Buffout 4 or Crash Logger DLL missing', 'Recent CTD caused by deleted navmesh or bad DLL', 'F4SE DLL API mismatch']
            }
        ]
    },
    {
        id: 'ini-papyrus-logging',
        name: 'Papyrus Logging INI Settings',
        description: 'Verify Fallout4Prefs.ini has bEnableLogging=1 and bLoadDebugInformation=1. Without these, Papyrus.0.log is empty and script errors are completely invisible.',
        category: 'quest',
        severity: 'major',
        expectedOutcome: '[Papyrus] section in Fallout4Prefs.ini contains both bEnableLogging=1 and bLoadDebugInformation=1.',
        steps: [
            {
                action: 'wait',
                parameters: { check: 'ini-papyrus' },
                description: 'Derive the My Games\\Fallout4 path from the Papyrus log monitor. Read Fallout4Prefs.ini and check the [Papyrus] section for the two required debug flags.',
                expectedResult: 'bEnableLogging=1 and bLoadDebugInformation=1 are both present',
                riskAreas: ['Papyrus log stays empty without these flags', 'Script errors undetectable', 'INI overwritten by MO2 or BethINI resetting defaults']
            }
        ]
    },
];

// ── Helpers ────────────────────────────────────────────────────────────────────

const getSeverityColor = (severity: string) => {
    switch (severity) {
        case 'critical': return 'bg-red-900/20 border-red-700/50 text-red-300';
        case 'major':    return 'bg-yellow-900/20 border-yellow-700/50 text-yellow-300';
        case 'minor':    return 'bg-blue-900/20 border-blue-700/50 text-blue-300';
        default:         return 'bg-slate-900/20 border-slate-700/50 text-slate-300';
    }
};

const getStatusStyle = (status: TestRun['status']) => {
    switch (status) {
        case 'pass':    return { bg: 'bg-green-900/20 border-green-700/50',  label: '✓ PASSED',   color: 'text-green-300' };
        case 'fail':    return { bg: 'bg-red-900/20 border-red-700/50',      label: '✗ FAILED',   color: 'text-red-300' };
        case 'partial': return { bg: 'bg-yellow-900/20 border-yellow-700/50',label: '⚠ PARTIAL',  color: 'text-yellow-300' };
        case 'error':   return { bg: 'bg-orange-900/20 border-orange-700/50',label: '⚡ ERROR',    color: 'text-orange-300' };
        case 'skip':    return { bg: 'bg-slate-800/50 border-slate-600/50',  label: '— SKIPPED',  color: 'text-slate-400' };
        default:        return { bg: 'bg-slate-800/50 border-slate-600/50',  label: status,       color: 'text-slate-400' };
    }
};

/** Lucide icon per category — no emoji in UI components */
const CategoryIcon: React.FC<{ category: TestScenario['category'] }> = ({ category }) => {
    const cls = 'w-4 h-4 flex-shrink-0';
    switch (category) {
        case 'quest':      return <BookOpen      className={`${cls} text-blue-400`} />;
        case 'combat':     return <Swords        className={`${cls} text-red-400`} />;
        case 'settlement': return <Home          className={`${cls} text-yellow-400`} />;
        case 'npc':        return <User          className={`${cls} text-purple-400`} />;
        case 'load_order': return <List          className={`${cls} text-emerald-400`} />;
        default:           return <Gamepad2      className={`${cls} text-slate-400`} />;
    }
};

// ── localStorage key ───────────────────────────────────────────────────────────
const RUNS_KEY = 'mossy_holodeck_runs';

// ── Component ─────────────────────────────────────────────────────────────────
const Holodeck = () => {
    const [activeScenario, setActiveScenario] = useState<TestScenario | null>(null);
    const [expandedStep, setExpandedStep] = useState<number | null>(null);
    const [testRuns, setTestRuns] = useState<TestRun[]>(() => {
        try { return JSON.parse(localStorage.getItem(RUNS_KEY) ?? '[]'); } catch { return []; }
    });
    const [copiedId, setCopiedId] = useState<string | null>(null);
    const [reportCopied, setReportCopied] = useState(false);
    const [runningId, setRunningId] = useState<string | null>(null);   // scenario currently executing
    const [isRunningAll, setIsRunningAll] = useState(false);

    const scenariosScrollRef = useRef<HTMLDivElement | null>(null);
    const detailsScrollRef   = useRef<HTMLDivElement | null>(null);

    const wheelProxy = useWheelScrollProxyFrom(
        () => (activeScenario ? detailsScrollRef.current : scenariosScrollRef.current)
    );

    // Persist runs to localStorage whenever they change
    useEffect(() => {
        try { localStorage.setItem(RUNS_KEY, JSON.stringify(testRuns.slice(-200))); } catch { /* ignore */ }
    }, [testRuns]);

    const handleCopyStep = (id: string, text: string) => {
        navigator.clipboard.writeText(text);
        setCopiedId(id);
        setTimeout(() => setCopiedId(null), 2000);
    };

    const handleExportReport = () => {
        if (!testRuns.length) return;
        const lines: string[] = [
            'HOLODECK TEST REPORT',
            `Generated: ${new Date().toLocaleString()}`,
            '='.repeat(60),
            '',
        ];
        const byScenario = new Map<string, TestRun[]>();
        testRuns.forEach((r) => {
            const arr = byScenario.get(r.scenarioId) ?? [];
            arr.push(r);
            byScenario.set(r.scenarioId, arr);
        });
        for (const scenario of TEST_SCENARIOS) {
            const runs = byScenario.get(scenario.id);
            if (!runs?.length) continue;
            lines.push(`SCENARIO: ${scenario.name} [${scenario.severity.toUpperCase()}]`);
            lines.push(`  Category : ${scenario.category}`);
            lines.push(`  Expected : ${scenario.expectedOutcome}`);
            runs.forEach((r) => {
                lines.push(`  Run ${r.timestamp} → ${r.status.toUpperCase()} (${r.duration}s)`);
                r.issues.forEach((issue) => lines.push(`    ⚠ ${issue}`));
            });
            lines.push('');
        }
        navigator.clipboard.writeText(lines.join('\n'));
        setReportCopied(true);
        setTimeout(() => setReportCopied(false), 2000);
    };

    // ── Core test runner ──────────────────────────────────────────────────────
    const runScenario = async (scenarioId: string): Promise<TestRun> => {
        const api: any = (window as any).electron?.api || (window as any).electronAPI;
        const scenario = TEST_SCENARIOS.find((s) => s.id === scenarioId)!;

        const startMs = Date.now();
        const issues: string[] = [];
        let allPassed = true;

        for (const step of scenario.steps) {
            const check = step.parameters.check as string | undefined;

            // ── bridge-api ──────────────────────────────────────────────────
            if (check === 'bridge-api') {
                if (!api) {
                    issues.push('Desktop Bridge API not available — launch the packaged Electron app, not the web build.');
                    allPassed = false;
                } else if (!api.getRunningProcesses || !api.getSettings) {
                    issues.push('Bridge is present but missing required methods (getRunningProcesses / getSettings).');
                    allPassed = false;
                }

            // ── process ─────────────────────────────────────────────────────
            } else if (check === 'process') {
                if (!api?.getRunningProcesses) {
                    issues.push('getRunningProcesses not available — Desktop Bridge required.');
                    allPassed = false; continue;
                }
                const procs: any[] = await api.getRunningProcesses().catch(() => []);
                const names: string[] = step.parameters.names ?? [];
                const found = procs.some((p) => names.some((n) => String(p?.name ?? '').toLowerCase().includes(n)));
                if (!found) {
                    issues.push(`Game process not detected (looked for: ${names.join(', ')}). Launch Fallout 4 or F4SE first.`);
                    allPassed = false;
                }

            // ── mo2-path ────────────────────────────────────────────────────
            } else if (check === 'mo2-path') {
                const settings = await api?.getSettings?.().catch(() => null);
                if (!settings?.mo2Path) {
                    issues.push('MO2 path not configured. Go to Settings → External Tools and set the Mod Organizer 2 path.');
                    allPassed = false;
                }

            // ── mo2-modlist ─────────────────────────────────────────────────
            } else if (check === 'mo2-modlist') {
                const settings = await api?.getSettings?.().catch(() => null);
                const mo2Root: string = settings?.mo2Path ?? '';
                if (!mo2Root) {
                    issues.push('MO2 path not set — cannot validate load order.'); allPassed = false; continue;
                }
                let profileName = 'Default';
                try {
                    const iniText: string = await api.readFile(`${mo2Root}\\ModOrganizer.ini`);
                    const byteArr = iniText.match(/selected_profile\s*=\s*@ByteArray\(([^)]+)\)/);
                    if (byteArr) profileName = byteArr[1];
                    else { const plain = iniText.match(/selected_profile\s*=\s*(.+)/); if (plain) profileName = plain[1].trim(); }
                } catch { /* use Default */ }
                try {
                    const pluginsText: string = await api.readFile(`${mo2Root}\\profiles\\${profileName}\\plugins.txt`);
                    const plugins = pluginsText
                        .split('\n')
                        .map((l: string) => l.replace(/^\*/, '').trim())
                        .filter((l: string) => /\.(esp|esm|esl)$/i.test(l));
                    if (!plugins.some((p: string) => p.toLowerCase() === 'fallout4.esm')) {
                        issues.push('Fallout4.esm not found in plugins.txt — the load order may be corrupt.'); allPassed = false;
                    }
                    const seen = new Set<string>();
                    plugins.forEach((p: string) => {
                        const key = p.toLowerCase();
                        if (seen.has(key)) { issues.push(`Duplicate plugin entry: ${p}`); allPassed = false; }
                        seen.add(key);
                    });
                    // DLC workshop order check (for settlement scenario)
                    const filterWord: string | undefined = step.parameters.filter;
                    if (filterWord === 'workshop') {
                        const workshopIdx = plugins.findIndex((p: string) => /^DLCWorkshop/i.test(p));
                        if (workshopIdx > -1) {
                            const settlementMods = plugins.filter((p: string) =>
                                /sim.settlements|Sim.Settlement|Workshop.Framework|wsfw/i.test(p)
                            );
                            for (const sm of settlementMods) {
                                const smIdx = plugins.indexOf(sm);
                                if (smIdx < workshopIdx) {
                                    issues.push(`Settlement mod "${sm}" loads before DLCWorkshop ESMs — reorder in MO2 load order.`);
                                    allPassed = false;
                                }
                            }
                        }
                    }
                } catch {
                    issues.push(`Could not read plugins.txt from profile "${profileName}" at: ${mo2Root}\\profiles\\`);
                    allPassed = false;
                }

            // ── auditor-navmesh ─────────────────────────────────────────────
            } else if (check === 'auditor-navmesh') {
                const raw = localStorage.getItem('mossy_scan_auditor');
                if (!raw) {
                    issues.push('No Auditor scan found. Upload and scan plugins in The Auditor first.');
                    allPassed = false; continue;
                }
                const files: any[] = JSON.parse(raw);
                const navIssues = files.flatMap((f) =>
                    (f.issues ?? []).filter((i: any) =>
                        i.severity === 'error' && String(i.message ?? '').toLowerCase().includes('navmesh')
                    )
                );
                if (navIssues.length > 0) {
                    issues.push(`${navIssues.length} deleted navmesh error(s) found — CTD risk. Open The Auditor for fix steps.`);
                    allPassed = false;
                }

            // ── papyrus-log ─────────────────────────────────────────────────
            } else if (check === 'papyrus-log') {
                const logPath: string | null = await api?.gameLogMonitor?.getLastLogPath?.().catch(() => null);
                if (!logPath) {
                    issues.push('Papyrus log path unknown. Open the Debug tab in The Auditor and browse to your Papyrus.0.log first.');
                    allPassed = false; continue;
                }
                try {
                    const content: string = await api.readFile(logPath);
                    const filterWord: string | undefined = step.parameters.filter;
                    const lines = content.split('\n').filter((l: string) =>
                        /error|terminated|cannot open store|stack overflow|vm is frozen/i.test(l) &&
                        (!filterWord || l.toLowerCase().includes(filterWord.toLowerCase()))
                    );
                    if (lines.length > 0) {
                        issues.push(`${lines.length} error-level line(s) in Papyrus log${filterWord ? ` (filter: "${filterWord}")` : ''}. Open the Debug tab for details.`);
                        allPassed = false;
                    }
                } catch {
                    issues.push(`Could not read Papyrus log at: ${logPath}`);
                    allPassed = false;
                }

            // ── f4se-version ────────────────────────────────────────────────
            } else if (check === 'f4se-version') {
                const settings = await api?.getSettings?.().catch(() => null);
                const fo4Path: string = (settings?.fallout4Path ?? '').trim();
                if (!fo4Path) {
                    issues.push('Fallout 4 path not configured — set it in Settings → External Tools.');
                    allPassed = false; continue;
                }
                const fo4Stat  = await api?.fsStat?.(`${fo4Path}\\Fallout4.exe`).catch(() => null);
                const f4seStat = await api?.fsStat?.(`${fo4Path}\\f4se_loader.exe`).catch(() => null);
                if (!fo4Stat?.exists) {
                    issues.push(`Fallout4.exe not found at: ${fo4Path} — verify the game installation path in Settings.`);
                    allPassed = false;
                } else if (!f4seStat?.exists) {
                    issues.push('F4SE not detected — f4se_loader.exe missing from the game folder. Download F4SE from f4se.silverlock.org and extract to the same folder as Fallout4.exe.');
                    allPassed = false;
                } else {
                    // Both present — try to surface F4SE version from readme
                    try {
                        const readme: string = await api.readFile(`${fo4Path}\\f4se_readme.txt`);
                        const verMatch = readme.match(/(?:runtime\s+version|working with)\s+(\d+\.\d+\.\d+)/i);
                        if (verMatch) {
                            // Noted in issues as informational — test still passes
                        }
                    } catch { /* readme optional */ }
                }

            // ── seq-files ───────────────────────────────────────────────────
            } else if (check === 'seq-files') {
                const settings = await api?.getSettings?.().catch(() => null);
                const fo4Path: string = (settings?.fallout4Path ?? '').trim();
                if (!fo4Path) {
                    issues.push('Fallout 4 path not configured — set it in Settings → External Tools to enable SEQ checks.');
                    allPassed = false; continue;
                }
                const seqDir = `${fo4Path}\\Data\\Seq`;
                const seqStat = await api?.fsStat?.(seqDir).catch(() => null);
                if (!seqStat?.exists) {
                    issues.push(`Data\\Seq\\ folder not found at: ${seqDir}. If your mod has quest records, generate SEQ files via xEdit: right-click ESP → "Generate Sequence File".`);
                    allPassed = false;
                } else {
                    try {
                        const files = await api?.browseDirectory?.(seqDir).catch(() => []);
                        const seqFiles = (files ?? []).filter((f: any) => f.name?.toLowerCase().endsWith('.seq'));
                        if (seqFiles.length === 0) {
                            issues.push('Data\\Seq\\ folder is empty — no .seq files found. Quest mods MUST have a matching .seq or quests will not start on save load.');
                            allPassed = false;
                        }
                        // no issues → test passes
                    } catch {
                        issues.push(`Could not list files in Data\\Seq\\ — verify read permissions on: ${seqDir}`);
                        allPassed = false;
                    }
                }

            // ── plugin-count ────────────────────────────────────────────────
            } else if (check === 'plugin-count') {
                let pluginsText = '';

                // First try MO2 active profile
                const settings = await api?.getSettings?.().catch(() => null);
                const mo2Root: string = settings?.mo2Path ?? '';
                if (mo2Root) {
                    let profileName = 'Default';
                    try {
                        const iniText: string = await api.readFile(`${mo2Root}\\ModOrganizer.ini`);
                        const byteArr = iniText.match(/selected_profile\s*=\s*@ByteArray\(([^)]+)\)/);
                        if (byteArr) profileName = byteArr[1];
                        else { const plain = iniText.match(/selected_profile\s*=\s*(.+)/); if (plain) profileName = plain[1].trim(); }
                    } catch { /* default */ }
                    try {
                        pluginsText = await api.readFile(`${mo2Root}\\profiles\\${profileName}\\plugins.txt`);
                    } catch { /* fall through to Bridge */ }
                }

                // Fallback: ask Bridge server for AppData Plugins.txt
                if (!pluginsText) {
                    try {
                        const resp = await fetch('http://127.0.0.1:21337/loadorder/read', {
                            signal: AbortSignal.timeout(2000),
                        });
                        if (resp.ok) {
                            const data = await resp.json();
                            const active: string[] = data.active ?? [];
                            pluginsText = active.map((p: string) => `*${p}`).join('\n');
                        }
                    } catch { /* ignore */ }
                }

                if (!pluginsText) {
                    issues.push('Could not read plugins.txt. Configure MO2 path in Settings, or start Desktop Bridge to read from AppData\\Local\\Fallout4.');
                    allPassed = false;
                } else {
                    const lines = pluginsText
                        .split('\n')
                        .map((l: string) => l.replace(/^\*/, '').trim())
                        .filter((l: string) => /\.(esp|esm|esl)$/i.test(l));

                    const eslPlugins  = lines.filter((l: string) => l.toLowerCase().endsWith('.esl'));
                    const fullPlugins = lines.filter((l: string) => !l.toLowerCase().endsWith('.esl'));
                    const WARN_THRESHOLD  = 244;
                    const HARD_LIMIT      = 254;

                    if (fullPlugins.length >= HARD_LIMIT) {
                        issues.push(`CRITICAL: ${fullPlugins.length} full-weight plugins loaded — AT or ABOVE the 254 slot limit. Game will CTD immediately on load. Merge or ESL-flag safe plugins NOW.`);
                        allPassed = false;
                    } else if (fullPlugins.length >= WARN_THRESHOLD) {
                        issues.push(`WARNING: ${fullPlugins.length} full-weight plugins — within ${HARD_LIMIT - fullPlugins.length} slot(s) of the limit. ESL-flag or merge some plugins before adding more.`);
                        allPassed = false;
                    }

                    if (eslPlugins.length > 4000) {
                        issues.push(`${eslPlugins.length} ESL plugins loaded — approaching the 4096 ESL limit. FormID space is becoming critical.`);
                        allPassed = false;
                    }
                }

            // ── crash-logs ──────────────────────────────────────────────────
            } else if (check === 'crash-logs') {
                // Derive Documents/My Games/Fallout4 from stored Papyrus log path
                const logPath: string | null = await api?.gameLogMonitor?.getLastLogPath?.().catch(() => null);
                const match = logPath ? logPath.match(/^(.*?[/\\]My Games[/\\]Fallout4)[/\\]/i) : null;

                if (!match) {
                    issues.push('Could not determine My Games\\Fallout4 path. Set up the Papyrus log monitor in The Auditor first to enable crash log detection.');
                    allPassed = false;
                } else {
                    const docsBase = match[1];
                    const f4seFolder = `${docsBase}\\F4SE`;
                    const folderStat = await api?.fsStat?.(f4seFolder).catch(() => null);

                    if (!folderStat?.exists) {
                        issues.push(`F4SE log folder not found at: ${f4seFolder}. Install Buffout 4 or Crash Logger to generate crash logs (highly recommended).`);
                        allPassed = false;
                    } else {
                        try {
                            const files = await api?.browseDirectory?.(f4seFolder).catch(() => []);
                            const cutoff = Date.now() - 24 * 60 * 60 * 1000;
                            // browseDirectory doesn't return mtime, so we flag any crash-named files as a warning
                            const crashFiles = (files ?? []).filter((f: any) => {
                                const n: string = f.name?.toLowerCase() ?? '';
                                return n.includes('crash') || /crash-\d/.test(n);
                            });
                            if (crashFiles.length > 0) {
                                issues.push(`${crashFiles.length} crash log file(s) found in the F4SE folder. Open them to identify the offending DLL or missing master plugin.`);
                                allPassed = false;
                            }
                        } catch {
                            issues.push(`Could not list files in F4SE log folder: ${f4seFolder}`);
                            allPassed = false;
                        }
                    }
                }

            // ── ini-papyrus ─────────────────────────────────────────────────
            } else if (check === 'ini-papyrus') {
                const logPath: string | null = await api?.gameLogMonitor?.getLastLogPath?.().catch(() => null);
                const match = logPath ? logPath.match(/^(.*?[/\\]My Games[/\\]Fallout4)[/\\]/i) : null;

                if (!match) {
                    issues.push('Could not determine My Games\\Fallout4 path. Set up the Papyrus log monitor in The Auditor first.');
                    allPassed = false;
                } else {
                    const iniPath = `${match[1]}\\Fallout4Prefs.ini`;
                    try {
                        const iniText: string = await api.readFile(iniPath);
                        const papyrusSection = iniText.match(/\[Papyrus\]([\s\S]*?)(?:\[|$)/i)?.[1] ?? '';
                        const loggingEnabled  = /bEnableLogging\s*=\s*1/i.test(papyrusSection);
                        const debugInfo       = /bLoadDebugInformation\s*=\s*1/i.test(papyrusSection);

                        if (!loggingEnabled) {
                            issues.push('bEnableLogging=0 in [Papyrus] section — Papyrus.0.log will remain empty. Add "bEnableLogging=1" under [Papyrus] in Fallout4Prefs.ini.');
                            allPassed = false;
                        }
                        if (!debugInfo) {
                            issues.push('bLoadDebugInformation=0 in [Papyrus] section — script line numbers missing from error output. Add "bLoadDebugInformation=1" under [Papyrus].');
                            allPassed = false;
                        }
                    } catch {
                        issues.push(`Could not read Fallout4Prefs.ini at: ${iniPath}. Ensure the game has been launched at least once.`);
                        allPassed = false;
                    }
                }
            }
        }

        return {
            id: `run-${Date.now()}`,
            scenarioId,
            timestamp: new Date().toLocaleTimeString(),
            status: allPassed
                ? 'pass'
                : issues.length < scenario.steps.length
                    ? 'partial'
                    : 'fail',
            issues,
            duration: Math.round((Date.now() - startMs) / 1000),
        };
    };

    const handleTestRun = async (scenarioId: string) => {
        setRunningId(scenarioId);
        try {
            const run = await runScenario(scenarioId);
            setTestRuns((prev) => [...prev, run]);
        } finally {
            setRunningId(null);
        }
    };

    const handleRunAll = async () => {
        setIsRunningAll(true);
        for (const scenario of TEST_SCENARIOS) {
            setRunningId(scenario.id);
            setActiveScenario(scenario);
            try {
                const run = await runScenario(scenario.id);
                setTestRuns((prev) => [...prev, run]);
            } catch { /* continue on error */ }
        }
        setRunningId(null);
        setIsRunningAll(false);
    };

    // ── JSX ───────────────────────────────────────────────────────────────────
    return (
        <div
            className="h-full flex flex-col bg-[#1e1e1e] text-slate-200 font-sans overflow-hidden min-h-0"
            onWheel={wheelProxy}
        >
            {/* Header */}
            <div className="p-4 border-b border-black bg-[#2d2d2d] flex justify-between items-center shadow-md">
                <div>
                    <h2 className="text-lg font-bold text-white flex items-center gap-2">
                        <Gamepad2 className="w-5 h-5 text-purple-400" />
                        Holodeck
                    </h2>
                    <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                        Automated Mod Validator — Real-time Game Analysis
                    </p>
                </div>
                <div className="flex gap-2 flex-wrap justify-end">
                    <Link
                        to="/reference"
                        className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest rounded border border-purple-500/30 bg-purple-900/20 text-purple-100 hover:bg-purple-900/30 transition-colors"
                        title="Open help"
                    >
                        Help
                    </Link>
                    <button
                        onClick={handleRunAll}
                        disabled={isRunningAll || !!runningId}
                        title="Run every scenario in sequence"
                        className="px-3 py-1.5 bg-black rounded border border-purple-600 hover:border-purple-400 transition-colors text-xs text-purple-300 flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                        {isRunningAll
                            ? <><Loader2 className="w-3 h-3 animate-spin" /> Running All…</>
                            : <><PlayCircle className="w-3 h-3" /> Run All</>
                        }
                    </button>
                    <button
                        onClick={handleExportReport}
                        disabled={!testRuns.length}
                        title={testRuns.length ? 'Copy all test run results to clipboard' : 'Run at least one test first'}
                        className="px-3 py-1.5 bg-black rounded border border-slate-600 hover:border-purple-500 transition-colors text-xs text-purple-400 flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                        <BarChart3 className="w-3 h-3" />
                        {reportCopied ? 'Copied!' : 'Report'}
                    </button>
                </div>
            </div>

            {/* Tools panel */}
            <div className="p-4 border-b border-black bg-[#1e1e1e]">
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                    <ToolsInstallVerifyPanel
                        accentClassName="text-purple-300"
                        description="Holodeck is a real-time test harness. Checks use Desktop Bridge IPC, localStorage Auditor scan data, and the MO2 profile folder. No external tools required for most scenarios."
                        tools={[]}
                        verify={[
                            'Select a scenario and confirm the details panel updates.',
                            'Click "Run Test" — you should get a clear pass or a specific error message.',
                        ]}
                        firstTestLoop={[
                            'Start Desktop Bridge and confirm it shows ONLINE.',
                            'Run "Desktop Bridge Status" — should pass immediately.',
                            'Run "Plugin Slot Limit Check" to verify your load order is safe.',
                        ]}
                        troubleshooting={[
                            'If bridge-api fails: launch MOSSY.SPACE as the packaged Electron app, not a browser tab.',
                            'If path checks fail: configure Fallout 4 and MO2 paths in Settings → External Tools.',
                            'If Papyrus checks fail: browse to your Papyrus.0.log in The Auditor debug tab first.',
                        ]}
                    />
                </div>
            </div>

            {/* Main layout */}
            <div className="flex-1 min-h-0 flex overflow-hidden">
                {/* Scenario list */}
                <div className="w-80 border-r border-slate-800 overflow-y-auto bg-[#252526] flex flex-col min-h-0">
                    <div className="sticky top-0 p-4 border-b border-slate-800 bg-[#2d2d2d]">
                        <h3 className="text-xs font-bold text-white uppercase tracking-wide">
                            Test Scenarios
                            <span className="ml-2 text-slate-500 font-normal normal-case">({TEST_SCENARIOS.length})</span>
                        </h3>
                    </div>
                    <div ref={scenariosScrollRef} className="flex-1 min-h-0 space-y-2 p-3 overflow-y-auto overflow-x-auto">
                        {TEST_SCENARIOS.map((scenario) => {
                            const isRunning  = runningId === scenario.id;
                            const lastRun    = [...testRuns].reverse().find((r) => r.scenarioId === scenario.id);
                            const style      = lastRun ? getStatusStyle(lastRun.status) : null;
                            const isSelected = activeScenario?.id === scenario.id;

                            return (
                                <button
                                    key={scenario.id}
                                    onClick={() => setActiveScenario(scenario)}
                                    className={`w-full text-left p-3 rounded-lg border transition-all ${
                                        isSelected
                                            ? 'bg-purple-900/30 border-purple-700/50 ring-1 ring-purple-500/50'
                                            : 'bg-slate-800/30 border-slate-700/30 hover:border-slate-700'
                                    }`}
                                >
                                    <div className="flex items-start justify-between gap-2 mb-1">
                                        <CategoryIcon category={scenario.category} />
                                        <div className="flex items-center gap-1.5 ml-auto">
                                            {isRunning && (
                                                <Loader2 className="w-3 h-3 text-purple-400 animate-spin" />
                                            )}
                                            {!isRunning && lastRun && (
                                                <span className={`text-[9px] font-bold ${style!.color}`}>
                                                    {style!.label}
                                                </span>
                                            )}
                                            <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded ${
                                                scenario.severity === 'critical' ? 'bg-red-900/50 text-red-300' :
                                                scenario.severity === 'major'    ? 'bg-yellow-900/50 text-yellow-300' :
                                                                                   'bg-blue-900/50 text-blue-300'
                                            }`}>
                                                {scenario.severity}
                                            </span>
                                        </div>
                                    </div>
                                    <h4 className="text-xs font-semibold text-white mt-1">{scenario.name}</h4>
                                    <p className="text-[10px] text-slate-400 mt-1 line-clamp-2">{scenario.description}</p>
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Detail + results pane */}
                <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
                    {activeScenario ? (
                        <>
                            <div ref={detailsScrollRef} className="flex-1 min-h-0 overflow-y-auto overflow-x-auto p-6 space-y-6">
                                {/* Scenario header */}
                                <div>
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-1">
                                                <CategoryIcon category={activeScenario.category} />
                                                <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded border ${getSeverityColor(activeScenario.severity)}`}>
                                                    {activeScenario.severity}
                                                </span>
                                            </div>
                                            <h3 className="text-xl font-bold text-white mb-1">{activeScenario.name}</h3>
                                            <p className="text-sm text-slate-300">{activeScenario.description}</p>
                                        </div>
                                        <button
                                            onClick={() => handleTestRun(activeScenario.id)}
                                            disabled={!!runningId}
                                            className="px-4 py-2 bg-purple-900/30 hover:bg-purple-900/50 disabled:opacity-50 disabled:cursor-not-allowed rounded border border-purple-700/50 text-xs font-semibold text-purple-300 flex items-center gap-2 transition-colors flex-shrink-0 ml-4"
                                        >
                                            {runningId === activeScenario.id
                                                ? <><Loader2 className="w-3 h-3 animate-spin" /> Running…</>
                                                : <><Play className="w-3 h-3" /> Run Test</>
                                            }
                                        </button>
                                    </div>
                                </div>

                                {/* Steps */}
                                <div className="space-y-3">
                                    <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wide">
                                        Test Steps ({activeScenario.steps.length})
                                    </h4>
                                    {activeScenario.steps.map((step, idx) => (
                                        <div key={idx} className="bg-slate-800/50 border border-slate-700/50 rounded-lg overflow-hidden">
                                            <button
                                                onClick={() => setExpandedStep(expandedStep === idx ? null : idx)}
                                                className="w-full text-left p-4 hover:bg-slate-800 transition-colors flex items-start justify-between gap-3"
                                            >
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-2 mb-2">
                                                        <span className="text-xs font-bold text-purple-400">Step {idx + 1}</span>
                                                        <span className="text-[10px] px-1.5 py-0.5 bg-purple-900/40 text-purple-300 rounded font-mono">
                                                            {step.action}
                                                        </span>
                                                    </div>
                                                    <p className="text-sm text-white font-medium">{step.description}</p>
                                                </div>
                                                <ChevronDown className={`w-4 h-4 text-slate-500 flex-shrink-0 transition-transform ${expandedStep === idx ? 'rotate-180' : ''}`} />
                                            </button>

                                            {expandedStep === idx && (
                                                <div className="border-t border-slate-700/50 bg-black/30 p-4 space-y-4">
                                                    <div>
                                                        <div className="text-[10px] font-semibold text-slate-300 mb-2 flex items-center gap-2">
                                                            <CheckCircle2 className="w-3 h-3" /> Expected Result
                                                        </div>
                                                        <p className="text-xs text-slate-300 bg-slate-900/50 p-2 rounded border border-slate-700/50">
                                                            {step.expectedResult}
                                                        </p>
                                                    </div>
                                                    <div>
                                                        <div className="text-[10px] font-semibold text-slate-300 mb-2 flex items-center gap-2">
                                                            <AlertTriangle className="w-3 h-3 text-yellow-400" /> Risk Areas
                                                        </div>
                                                        <div className="flex flex-wrap gap-2">
                                                            {step.riskAreas.map((area, i) => (
                                                                <span key={i} className="text-[9px] bg-yellow-900/30 border border-yellow-700/50 text-yellow-200 px-2 py-1 rounded">
                                                                    {area}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    </div>
                                                    <button
                                                        onClick={() => handleCopyStep(`step-${idx}`, step.description)}
                                                        className="w-full px-3 py-2 bg-slate-700/30 hover:bg-slate-700/50 rounded border border-slate-600/50 text-xs font-semibold text-slate-300 flex items-center justify-center gap-2 transition-colors"
                                                    >
                                                        {copiedId === `step-${idx}` ? (
                                                            <><CheckCircle2 className="w-3 h-3" /> Copied!</>
                                                        ) : (
                                                            <><Copy className="w-3 h-3" /> Copy Step Description</>
                                                        )}
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>

                                {/* Expected Outcome */}
                                <div className="bg-purple-900/20 border border-purple-700/50 rounded-lg p-4">
                                    <h4 className="text-xs font-bold text-purple-300 uppercase tracking-wide mb-2 flex items-center gap-2">
                                        <Target className="w-3 h-3" /> Expected Outcome
                                    </h4>
                                    <p className="text-sm text-slate-300">{activeScenario.expectedOutcome}</p>
                                </div>
                            </div>

                            {/* Results panel */}
                            <div className="border-t border-slate-800 bg-[#252526] max-h-[35%] flex flex-col">
                                <div className="sticky top-0 p-4 border-b border-slate-800 bg-[#2d2d2d] flex justify-between items-center">
                                    <h4 className="text-xs font-bold text-white uppercase tracking-wide">
                                        Test Runs ({testRuns.filter((r) => r.scenarioId === activeScenario.id).length})
                                    </h4>
                                    {testRuns.some((r) => r.scenarioId === activeScenario.id) && (
                                        <button
                                            onClick={() =>
                                                setTestRuns((prev) => prev.filter((r) => r.scenarioId !== activeScenario.id))
                                            }
                                            className="text-[10px] text-slate-500 hover:text-red-400 transition-colors"
                                        >
                                            Clear
                                        </button>
                                    )}
                                </div>
                                <div className="flex-1 overflow-y-auto space-y-2 p-3">
                                    {testRuns.filter((r) => r.scenarioId === activeScenario.id).length === 0 ? (
                                        <div className="text-center py-6">
                                            <p className="text-[10px] text-slate-500">No test runs yet. Click "Run Test" above to start.</p>
                                        </div>
                                    ) : (
                                        [...testRuns.filter((r) => r.scenarioId === activeScenario.id)].reverse().map((run) => {
                                            const style = getStatusStyle(run.status);
                                            return (
                                                <div key={run.id} className={`p-3 rounded border text-xs ${style.bg}`}>
                                                    <div className="flex items-center justify-between mb-1">
                                                        <span className={`font-bold ${style.color}`}>{style.label}</span>
                                                        <span className="text-slate-400">{run.duration}s</span>
                                                    </div>
                                                    <div className="text-[9px] text-slate-400">{run.timestamp}</div>
                                                    {run.issues.length > 0 && (
                                                        <div className="mt-2 pt-2 border-t border-slate-700/30 space-y-1">
                                                            {run.issues.map((issue, i) => (
                                                                <div key={i} className={`text-[9px] ${style.color} flex gap-1`}>
                                                                    <span className="flex-shrink-0">•</span>
                                                                    <span>{issue}</span>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })
                                    )}
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="flex-1 flex items-center justify-center">
                            <div className="text-center text-slate-500">
                                <Gamepad2 className="w-12 h-12 mx-auto mb-3 opacity-50" />
                                <p className="text-sm">Select a scenario to begin testing</p>
                                <p className="text-[10px] mt-1 text-slate-600">
                                    {TEST_SCENARIOS.length} scenarios available — or click Run All to execute every check
                                </p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Holodeck;
