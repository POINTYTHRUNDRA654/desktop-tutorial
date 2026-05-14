import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Gamepad2, Play, CheckCircle2, AlertTriangle, Copy, Target, BarChart3 } from 'lucide-react';
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
                description: 'Check Desktop Bridge API availability via window.electronAPI',
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
                description: 'Query getRunningProcesses() and scan for Fallout4.exe or f4se_loader.exe',
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
                description: 'Confirm MO2 path is configured in Settings → External Tools',
                expectedResult: 'mo2Path is set and non-empty in settings',
                riskAreas: ['Path not configured', 'MO2 not installed']
            },
            {
                action: 'wait',
                parameters: { check: 'mo2-modlist' },
                description: 'Read active profile modlist.txt and plugins.txt from MO2 profile folder',
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
                description: 'Read mossy_scan_auditor from localStorage and check for [Navmesh] error-severity issues',
                expectedResult: 'No files have issues with category "Navmesh" at error severity',
                riskAreas: ['Deleted navmesh records', 'Unfinalized cell navmesh in CK']
            },
            {
                action: 'execute-console',
                parameters: { note: 'Run The Auditor first if no scan data is present' },
                description: 'If no scan data found, direct user to run an ESP scan in The Auditor',
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
                description: 'Call gameLogMonitor.getLastLogPath() to locate Papyrus.0.log, then check it exists',
                expectedResult: 'Papyrus.0.log path is found and the file is accessible',
                riskAreas: ['Game never launched', 'Non-standard Documents path', 'Log not yet generated']
            },
            {
                action: 'screenshot',
                parameters: { pattern: 'error|terminated|cannot open store' },
                description: 'Scan log content for critical error patterns: VM freeze, missing scripts, stack overflows',
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
                description: 'Check plugins.txt for DLCWorkshop01-03.esm ordering relative to settlement mods',
                expectedResult: 'All DLCWorkshop*.esm entries appear before settlement overhaul plugins',
                riskAreas: ['Out-of-order DLC ESMs', 'Multiple settlement overhauls active simultaneously']
            },
            {
                action: 'wait',
                parameters: { check: 'papyrus-log', filter: 'workshop' },
                description: 'Scan Papyrus log for WorkshopScript errors from the last game session',
                expectedResult: 'No "WorkshopScript" or "WorkshopParent" lines at error level',
                riskAreas: ['Sim Settlements + vanilla workshop conflicts', 'Missing F4SE for WSFW']
            }
        ]
    },
];

const getSeverityColor = (severity: string) => {
    switch (severity) {
        case 'critical': return 'bg-red-900/20 border-red-700/50 text-red-300';
        case 'major': return 'bg-yellow-900/20 border-yellow-700/50 text-yellow-300';
        case 'minor': return 'bg-blue-900/20 border-blue-700/50 text-blue-300';
        default: return 'bg-slate-900/20 border-slate-700/50 text-slate-300';
    }
};

const getCategoryIcon = (category: string) => {
    switch (category) {
        case 'quest': return '📜';
        case 'combat': return '⚔️';
        case 'settlement': return '🏗️';
        case 'npc': return '👤';
        case 'load_order': return '📋';
        default: return '🎮';
    }
};

const Holodeck = () => {
    const [activeScenario, setActiveScenario] = useState<TestScenario | null>(null);
    const [expandedStep, setExpandedStep] = useState<number | null>(null);
    const [testRuns, setTestRuns] = useState<TestRun[]>([]);
    const [copiedId, setCopiedId] = useState<string | null>(null);
    const [reportCopied, setReportCopied] = useState(false);

    const scenariosScrollRef = useRef<HTMLDivElement | null>(null);
    const detailsScrollRef = useRef<HTMLDivElement | null>(null);

    const wheelProxy = useWheelScrollProxyFrom(() => (activeScenario ? detailsScrollRef.current : scenariosScrollRef.current));

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

    const handleTestRun = async (scenarioId: string) => {
        const api: any = (window as any).electron?.api || (window as any).electronAPI;
        const scenario = TEST_SCENARIOS.find((s) => s.id === scenarioId);
        if (!scenario) return;

        const startMs = Date.now();
        const issues: string[] = [];
        let allPassed = true;

        for (const step of scenario.steps) {
            const check = step.parameters.check as string | undefined;

            if (check === 'bridge-api') {
                if (!api) {
                    issues.push('Desktop Bridge API not available — launch the packaged Electron app, not the web build.');
                    allPassed = false;
                } else if (!api.getRunningProcesses || !api.getSettings) {
                    issues.push('Desktop Bridge is present but missing required methods (getRunningProcesses / getSettings).');
                    allPassed = false;
                }

            } else if (check === 'process') {
                if (!api?.getRunningProcesses) {
                    issues.push('getRunningProcesses not available — Desktop Bridge required.');
                    allPassed = false;
                    continue;
                }
                const procs: any[] = await api.getRunningProcesses().catch(() => []);
                const names: string[] = step.parameters.names ?? [];
                const found = procs.some((p) => names.some((n) => String(p?.name ?? '').toLowerCase().includes(n)));
                if (!found) {
                    issues.push(`Game process not detected (looked for: ${names.join(', ')}). Launch Fallout 4 or F4SE first.`);
                    allPassed = false;
                }

            } else if (check === 'mo2-path') {
                const settings = await api?.getSettings?.().catch(() => null);
                if (!settings?.mo2Path) {
                    issues.push('MO2 path not configured. Go to Settings → External Tools and set the Mod Organizer 2 path.');
                    allPassed = false;
                }

            } else if (check === 'mo2-modlist') {
                const settings = await api?.getSettings?.().catch(() => null);
                const mo2Root: string = settings?.mo2Path ?? '';
                if (!mo2Root) {
                    issues.push('MO2 path not set — cannot validate load order.');
                    allPassed = false;
                    continue;
                }
                // Determine the active profile name (mirrors MO2Extension logic)
                let profileName = 'Default';
                try {
                    const iniText: string = await api.readFile(`${mo2Root}\\ModOrganizer.ini`);
                    const byteArr = iniText.match(/selected_profile\s*=\s*@ByteArray\(([^)]+)\)/);
                    if (byteArr) {
                        profileName = byteArr[1];
                    } else {
                        const plain = iniText.match(/selected_profile\s*=\s*(.+)/);
                        if (plain) profileName = plain[1].trim();
                    }
                } catch { /* default to 'Default' */ }
                // Try to read plugins.txt from the active profile
                try {
                    const pluginsText: string = await api.readFile(`${mo2Root}\\profiles\\${profileName}\\plugins.txt`);
                    const plugins = pluginsText
                        .split('\n')
                        .map((l: string) => l.replace(/^\*/, '').trim())
                        .filter((l: string) => /\.(esp|esm|esl)$/i.test(l));
                    if (!plugins.some((p: string) => p.toLowerCase() === 'fallout4.esm')) {
                        issues.push('Fallout4.esm not found in plugins.txt — the load order may be corrupt.');
                        allPassed = false;
                    }
                    const seen = new Set<string>();
                    plugins.forEach((p: string) => {
                        const key = p.toLowerCase();
                        if (seen.has(key)) {
                            issues.push(`Duplicate plugin entry: ${p}`);
                            allPassed = false;
                        }
                        seen.add(key);
                    });
                } catch {
                    issues.push(`Could not read plugins.txt from profile "${profileName}" at: ${mo2Root}\\profiles\\`);
                    allPassed = false;
                }

            } else if (check === 'auditor-navmesh') {
                const raw = localStorage.getItem('mossy_scan_auditor');
                if (!raw) {
                    issues.push('No Auditor scan found. Upload and scan plugins in The Auditor first.');
                    allPassed = false;
                    continue;
                }
                const files: any[] = JSON.parse(raw);
                const navIssues = files.flatMap((f) =>
                    (f.issues ?? []).filter((i: any) =>
                        i.severity === 'error' &&
                        String(i.message ?? '').toLowerCase().includes('navmesh')
                    )
                );
                if (navIssues.length > 0) {
                    issues.push(`${navIssues.length} deleted navmesh error(s) found in scanned plugins — CTD risk. Open The Auditor for fix steps.`);
                    allPassed = false;
                }

            } else if (check === 'papyrus-log') {
                const logPath: string | null = await api?.gameLogMonitor?.getLastLogPath?.().catch(() => null);
                if (!logPath) {
                    issues.push('Papyrus log path unknown. Open the Debug tab in The Auditor and browse to your Papyrus.0.log first.');
                    allPassed = false;
                    continue;
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
            }
        }

        const run: TestRun = {
            id: `run-${Date.now()}`,
            scenarioId,
            timestamp: new Date().toLocaleTimeString(),
            status: allPassed ? 'pass' : (issues.length < scenario.steps.length ? 'partial' : 'fail'),
            issues,
            duration: Math.round((Date.now() - startMs) / 1000),
        };
        setTestRuns((prev) => [...prev, run]);
    };

    return (
        <div className="h-full flex flex-col bg-[#1e1e1e] text-slate-200 font-sans overflow-hidden min-h-0" onWheel={wheelProxy}>
            {/* Header */}
            <div className="p-4 border-b border-black bg-[#2d2d2d] flex justify-between items-center shadow-md">
                <div>
                    <h2 className="text-lg font-bold text-white flex items-center gap-2">
                        <Gamepad2 className="w-5 h-5 text-purple-400" />
                        Holodeck
                    </h2>
                    <p className="text-[10px] text-slate-400 font-mono mt-0.5">Automated Mod Validator - Real-time Game Analysis</p>
                </div>
                <div className="flex gap-2">
                    <Link
                        to="/reference"
                        className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest rounded border border-purple-500/30 bg-purple-900/20 text-purple-100 hover:bg-purple-900/30 transition-colors"
                        title="Open help"
                    >
                        Help
                    </Link>
                    <button
                        onClick={handleExportReport}
                        disabled={!testRuns.length}
                        title={testRuns.length ? 'Copy all test run results to clipboard' : 'Run at least one test first'}
                        className="px-3 py-1.5 bg-black rounded border border-slate-600 hover:border-purple-500 transition-colors text-xs text-purple-400 flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                        <BarChart3 className="w-3 h-3" /> {reportCopied ? 'Copied!' : 'Report'}
                    </button>
                </div>
            </div>

            <div className="p-4 border-b border-black bg-[#1e1e1e]">
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                    <ToolsInstallVerifyPanel
                        accentClassName="text-purple-300"
                        description="Holodeck is a test harness UI. Real-time checks require Desktop Bridge access and (for some scenarios) the game process running."
                        tools={[]}
                        verify={[
                            'Select a scenario and confirm the details panel updates.',
                            'Start a run and confirm you either get a success path or a clear error message.',
                        ]}
                        firstTestLoop={[
                            'Start Desktop Bridge and confirm it is ONLINE.',
                            'Launch Fallout 4 (or F4SE) and then try a single simple scenario.',
                            'If the run starts, stop it and confirm the UI returns to idle cleanly.',
                        ]}
                        troubleshooting={[
                            'If you get “connection failed”, verify Desktop Bridge is running and permissions are allowed.',
                            'If it can’t find the game, confirm the process name matches your launcher (FO4/F4SE).',
                        ]}
                    />
                </div>
            </div>

            {/* Main Layout */}
            <div className="flex-1 min-h-0 flex overflow-hidden">
                {/* Scenarios List */}
                <div className="w-80 border-r border-slate-800 overflow-y-auto bg-[#252526] flex flex-col min-h-0">
                    <div className="sticky top-0 p-4 border-b border-slate-800 bg-[#2d2d2d]">
                        <h3 className="text-xs font-bold text-white uppercase tracking-wide">Test Scenarios</h3>
                    </div>
                    <div ref={scenariosScrollRef} className="flex-1 min-h-0 space-y-2 p-3 overflow-y-auto overflow-x-auto">
                        {TEST_SCENARIOS.map((scenario) => (
                            <button
                                key={scenario.id}
                                onClick={() => setActiveScenario(scenario)}
                                className={`w-full text-left p-3 rounded-lg border transition-all ${activeScenario?.id === scenario.id
                                        ? 'bg-purple-900/30 border-purple-700/50 ring-1 ring-purple-500/50'
                                        : 'bg-slate-800/30 border-slate-700/30 hover:border-slate-700'
                                    }`}
                            >
                                <div className="flex items-start justify-between gap-2 mb-1">
                                    <span className="text-sm">{getCategoryIcon(scenario.category)}</span>
                                    <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded ${scenario.severity === 'critical' ? 'bg-red-900/50' :
                                            scenario.severity === 'major' ? 'bg-yellow-900/50' :
                                                'bg-blue-900/50'
                                        }`}>
                                        {scenario.severity}
                                    </span>
                                </div>
                                <h4 className="text-xs font-semibold text-white">{scenario.name}</h4>
                                <p className="text-[10px] text-slate-400 mt-1 line-clamp-2">{scenario.description}</p>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Main Content */}
                <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
                    {activeScenario ? (
                        <>
                            {/* Scenario Details */}
                            <div ref={detailsScrollRef} className="flex-1 min-h-0 overflow-y-auto overflow-x-auto p-6 space-y-6">
                                {/* Header */}
                                <div>
                                    <div className="flex items-center justify-between mb-4">
                                        <div>
                                            <h3 className="text-xl font-bold text-white mb-1">{activeScenario.name}</h3>
                                            <p className="text-sm text-slate-300">{activeScenario.description}</p>
                                        </div>
                                        <button
                                            onClick={() => handleTestRun(activeScenario.id)}
                                            className="px-4 py-2 bg-purple-900/30 hover:bg-purple-900/50 rounded border border-purple-700/50 text-xs font-semibold text-purple-300 flex items-center gap-2 transition-colors flex-shrink-0"
                                        >
                                            <Play className="w-3 h-3" /> Run Test
                                        </button>
                                    </div>
                                </div>

                                {/* Test Steps */}
                                <div className="space-y-3">
                                    <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wide">Test Steps</h4>
                                    {activeScenario.steps.map((step, idx) => (
                                        <div
                                            key={idx}
                                            className="bg-slate-800/50 border border-slate-700/50 rounded-lg overflow-hidden"
                                        >
                                            <button
                                                onClick={() => setExpandedStep(expandedStep === idx ? null : idx)}
                                                className="w-full text-left p-4 hover:bg-slate-800 transition-colors flex items-start justify-between gap-3"
                                            >
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-2 mb-2">
                                                        <span className="text-xs font-bold text-purple-400">Step {idx + 1}</span>
                                                    </div>
                                                    <p className="text-sm text-white font-medium">{step.action}</p>
                                                </div>
                                                <div className={`transition-transform flex-shrink-0 text-slate-500 ${expandedStep === idx ? 'rotate-180' : ''}`}>
                                                    ▼
                                                </div>
                                            </button>

                                            {expandedStep === idx && (
                                                <div className="border-t border-slate-700/50 bg-black/30 p-4 space-y-4">
                                                    <div>
                                                        <div className="text-[10px] font-semibold text-slate-300 mb-2 flex items-center gap-2">
                                                            <CheckCircle2 className="w-3 h-3" /> Expected Result
                                                        </div>
                                                        <p className="text-xs text-slate-300 bg-slate-900/50 p-2 rounded border border-slate-700/50">{step.expectedResult}</p>
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
                                                        onClick={() => handleCopyStep(`step-${idx}`, step.action)}
                                                        className="w-full px-3 py-2 bg-slate-700/30 hover:bg-slate-700/50 rounded border border-slate-600/50 text-xs font-semibold text-slate-300 flex items-center justify-center gap-2 transition-colors"
                                                    >
                                                        {copiedId === `step-${idx}` ? (
                                                            <>
                                                                <CheckCircle2 className="w-3 h-3" /> Copied!
                                                            </>
                                                        ) : (
                                                            <>
                                                                <Copy className="w-3 h-3" /> Copy Command
                                                            </>
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

                            {/* Test Results Panel */}
                            <div className="border-t border-slate-800 bg-[#252526] max-h-[35%] flex flex-col">
                                <div className="sticky top-0 p-4 border-b border-slate-800 bg-[#2d2d2d] flex justify-between items-center">
                                    <h4 className="text-xs font-bold text-white uppercase tracking-wide">Test Runs ({testRuns.filter(r => r.scenarioId === activeScenario.id).length})</h4>
                                </div>
                                <div className="flex-1 overflow-y-auto space-y-2 p-3">
                                    {testRuns.filter(r => r.scenarioId === activeScenario.id).length === 0 ? (
                                        <div className="text-center py-6">
                                            <p className="text-[10px] text-slate-500">No test runs yet. Click &quot;Run Test&quot; above to start.</p>
                                        </div>
                                    ) : (
                                        testRuns.filter(r => r.scenarioId === activeScenario.id).map((run) => (
                                            <div
                                                key={run.id}
                                                className={`p-3 rounded border text-xs ${run.status === 'pass'
                                                        ? 'bg-green-900/20 border-green-700/50'
                                                        : 'bg-red-900/20 border-red-700/50'
                                                    }`}
                                            >
                                                <div className="flex items-center justify-between mb-1">
                                                    <span className={`font-bold ${run.status === 'pass' ? 'text-green-300' : 'text-red-300'}`}>
                                                        {run.status === 'pass' ? '✓ PASSED' : '✗ FAILED'}
                                                    </span>
                                                    <span className="text-slate-400">{run.duration}s</span>
                                                </div>
                                                <div className="text-[9px] text-slate-400">{run.timestamp}</div>
                                                {run.issues.length > 0 && (
                                                    <div className="mt-2 pt-2 border-t border-current/20 space-y-1">
                                                        {run.issues.map((issue, i) => (
                                                            <div key={i} className="text-[9px] text-red-300">• {issue}</div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="flex-1 flex items-center justify-center">
                            <div className="text-center text-slate-500">
                                <Gamepad2 className="w-12 h-12 mx-auto mb-3 opacity-50" />
                                <p>Select a scenario to begin testing</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Holodeck;
