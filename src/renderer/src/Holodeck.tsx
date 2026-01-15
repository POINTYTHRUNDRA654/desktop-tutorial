import { useState } from 'react';
import { Gamepad2, Play, Pause, SkipForward, CheckCircle2, AlertTriangle, Copy, Zap, Target, BarChart3, Settings } from 'lucide-react';

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
    action: string;
    expectedResult: string;
    riskAreas: string[];
}

interface TestRun {
    id: string;
    scenarioId: string;
    timestamp: string;
    status: 'passed' | 'failed' | 'partial';
    issues: string[];
    duration: number;
}

const TEST_SCENARIOS: TestScenario[] = [];

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

    const handleCopyStep = (id: string, text: string) => {
        navigator.clipboard.writeText(text);
        setCopiedId(id);
        setTimeout(() => setCopiedId(null), 2000);
    };

    const simulateTestRun = (scenarioId: string) => {
        const scenario = TEST_SCENARIOS.find(s => s.id === scenarioId);
        if (!scenario) return;

        const passed = Math.random() > 0.3;
        const newRun: TestRun = {
            id: `run-${Date.now()}`,
            scenarioId,
            timestamp: new Date().toLocaleTimeString(),
            status: passed ? 'passed' : 'failed',
            issues: !passed ? [
                'Quest stage 20 did not trigger on cell enter',
                'NPC dialogue showed condition = 0 (never)',
                'Expected FormID 00ABCD12 but got none'
            ] : [],
            duration: Math.floor(Math.random() * 600) + 60
        };
        
        setTestRuns(prev => [newRun, ...prev]);
    };

    return (
        <div className="h-full flex flex-col bg-[#1e1e1e] text-slate-200 font-sans overflow-hidden">
            {/* Header */}
            <div className="p-4 border-b border-black bg-[#2d2d2d] flex justify-between items-center shadow-md">
                <div>
                    <h2 className="text-lg font-bold text-white flex items-center gap-2">
                        <Gamepad2 className="w-5 h-5 text-purple-400" />
                        Holodeck
                    </h2>
                    <p className="text-[10px] text-slate-400 font-mono mt-0.5">Mod Testing Simulator - Run scenarios before release</p>
                </div>
                <div className="flex gap-2">
                    <button className="px-3 py-1.5 bg-black rounded border border-slate-600 hover:border-purple-500 transition-colors text-xs text-purple-400 flex items-center gap-2">
                        <BarChart3 className="w-3 h-3" /> Report
                    </button>
                </div>
            </div>

            {/* Main Layout */}
            <div className="flex-1 flex overflow-hidden">
                {/* Scenarios List */}
                <div className="w-80 border-r border-slate-800 overflow-y-auto bg-[#252526] flex flex-col">
                    <div className="sticky top-0 p-4 border-b border-slate-800 bg-[#2d2d2d]">
                        <h3 className="text-xs font-bold text-white uppercase tracking-wide">Test Scenarios</h3>
                    </div>
                    <div className="flex-1 space-y-2 p-3 overflow-y-auto">
                        {TEST_SCENARIOS.map((scenario) => (
                            <button
                                key={scenario.id}
                                onClick={() => setActiveScenario(scenario)}
                                className={`w-full text-left p-3 rounded-lg border transition-all ${
                                    activeScenario?.id === scenario.id
                                        ? 'bg-purple-900/30 border-purple-700/50 ring-1 ring-purple-500/50'
                                        : 'bg-slate-800/30 border-slate-700/30 hover:border-slate-700'
                                }`}
                            >
                                <div className="flex items-start justify-between gap-2 mb-1">
                                    <span className="text-sm">{getCategoryIcon(scenario.category)}</span>
                                    <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded ${
                                        scenario.severity === 'critical' ? 'bg-red-900/50' :
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
                <div className="flex-1 flex flex-col overflow-hidden">
                    {activeScenario ? (
                        <>
                            {/* Scenario Details */}
                            <div className="flex-1 overflow-y-auto p-6 space-y-6">
                                {/* Header */}
                                <div>
                                    <div className="flex items-center justify-between mb-4">
                                        <div>
                                            <h3 className="text-xl font-bold text-white mb-1">{activeScenario.name}</h3>
                                            <p className="text-sm text-slate-300">{activeScenario.description}</p>
                                        </div>
                                        <button
                                            onClick={() => simulateTestRun(activeScenario.id)}
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
                                            <p className="text-[10px] text-slate-500">No test runs yet. Click "Run Test" above to start.</p>
                                        </div>
                                    ) : (
                                        testRuns.filter(r => r.scenarioId === activeScenario.id).map((run) => (
                                            <div
                                                key={run.id}
                                                className={`p-3 rounded border text-xs ${
                                                    run.status === 'passed'
                                                        ? 'bg-green-900/20 border-green-700/50'
                                                        : 'bg-red-900/20 border-red-700/50'
                                                }`}
                                            >
                                                <div className="flex items-center justify-between mb-1">
                                                    <span className={`font-bold ${run.status === 'passed' ? 'text-green-300' : 'text-red-300'}`}>
                                                        {run.status === 'passed' ? '✓ PASSED' : '✗ FAILED'}
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
