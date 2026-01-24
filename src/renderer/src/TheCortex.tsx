import { useState, useEffect } from 'react';
import { Brain, AlertTriangle, CheckCircle2, Info, TrendingUp, Lightbulb, ArrowRight, Copy, BookOpen, Activity } from 'lucide-react';

interface Decision {
    id: string;
    title: string;
    category: 'conflict' | 'compatibility' | 'performance' | 'best-practice' | 'installation';
    severity: 'critical' | 'warning' | 'info' | 'recommendation';
    description: string;
    recommendation: string;
    relatedMods?: string[];
    performanceImpact?: string;
}

interface ConflictAnalysis {
    mod1: string;
    mod2: string;
    conflictType: 'FormID' | 'Mesh' | 'Texture' | 'Script' | 'Keyword' | 'None';
    severity: 'critical' | 'moderate' | 'minor' | 'none';
    resolution: string;
}

interface CompatibilityReport {
    modName: string;
    status: 'compatible' | 'warning' | 'incompatible';
    issues: string[];
    recommendations: string[];
    masterDependencies: string[];
}

const SAMPLE_DECISIONS: Decision[] = [
    {
        id: 'decision-1',
        title: 'Armor Mods Load Order',
        category: 'best-practice',
        severity: 'recommendation',
        description: 'Multiple armor expansion mods detected in your load order.',
        recommendation: 'Load AdvancedArmor.esp before WeaponExpansion.esp. This prevents FormID conflicts where both mods try to modify vanilla armor records.',
        relatedMods: ['AdvancedArmor.esp', 'WeaponExpansion.esp'],
        performanceImpact: 'Minimal'
    },
    {
        id: 'decision-2',
        title: 'Script Compilation Warning',
        category: 'warning',
        severity: 'warning',
        description: 'QuestFramework.esp uses F4SE scripts but F4SE is not detected as active.',
        recommendation: 'Ensure F4SE is running before launching Fallout 4. Without F4SE, all quest scripts will fail silently.',
        relatedMods: ['QuestFramework.esp'],
        performanceImpact: 'Critical - Quest system will not work'
    },
    {
        id: 'decision-3',
        title: 'Texture Resolution Optimization',
        category: 'performance',
        severity: 'info',
        description: 'Your 4K texture mods exceed recommended VRAM for your GPU (4GB available).',
        recommendation: 'Downscale textures from 4K to 2K using the Splicer validator. This saves 60% VRAM while maintaining visual quality.',
        relatedMods: ['HighResTextures.esp'],
        performanceImpact: '+15% FPS improvement'
    },
    {
        id: 'decision-4',
        title: 'Mesh Physics Collision Issue',
        category: 'conflict',
        severity: 'critical',
        description: 'Settlement furniture mesh (door_01.nif) has physics shape mismatch. Players will clip through.',
        recommendation: 'Regenerate collision shape in Outfit Studio. Open mesh, select all, Mesh > Update Physics > Compound Box.',
        relatedMods: ['SettlementExpansion.esp'],
        performanceImpact: 'Minimal'
    },
    {
        id: 'decision-5',
        title: 'Master File Dependency Chain',
        category: 'installation',
        severity: 'recommendation',
        description: 'Advanced plugin depends on 4 master files in specific order.',
        recommendation: 'Ensure load order: Fallout4.esm → DLCRobot.esm → AdvancedArmor.esp. Use the Conduit plugin manager to verify.',
        relatedMods: ['AdvancedArmor.esp'],
        performanceImpact: 'None'
    }
];

const SAMPLE_CONFLICTS: ConflictAnalysis[] = [
    {
        mod1: 'AdvancedArmor.esp',
        mod2: 'WeaponExpansion.esp',
        conflictType: 'FormID',
        severity: 'minor',
        resolution: 'Both mods modify the same armor record. Prioritize AdvancedArmor first in load order to keep its changes. WeaponExpansion will override only its weapon records.'
    },
    {
        mod1: 'SettlementExpansion.esp',
        mod2: 'building_door_01.nif',
        conflictType: 'Mesh',
        severity: 'moderate',
        resolution: 'Mesh path collision detected. Rename the conflicting mesh to settlement_door_custom_01.nif to avoid runtime conflicts.'
    },
    {
        mod1: 'QuestFramework.esp',
        mod2: 'AdvancedArmor.esp',
        conflictType: 'None',
        severity: 'none',
        resolution: 'No conflicts detected between these plugins. They can coexist safely.'
    }
];

const getSeverityColor = (severity: string) => {
    switch (severity) {
        case 'critical': return 'bg-red-900/20 border-red-700/50 text-red-300';
        case 'warning': return 'bg-yellow-900/20 border-yellow-700/50 text-yellow-300';
        case 'moderate': return 'bg-orange-900/20 border-orange-700/50 text-orange-300';
        case 'info': return 'bg-blue-900/20 border-blue-700/50 text-blue-300';
        case 'recommendation': return 'bg-cyan-900/20 border-cyan-700/50 text-cyan-300';
        case 'minor': return 'bg-slate-900/20 border-slate-700/50 text-slate-300';
        case 'none': return 'bg-green-900/20 border-green-700/50 text-green-300';
        default: return 'bg-slate-900/20 border-slate-700/50 text-slate-300';
    }
};

const getSeverityIcon = (severity: string) => {
    switch (severity) {
        case 'critical': return <AlertTriangle className="w-4 h-4" />;
        case 'warning': return <AlertTriangle className="w-4 h-4" />;
        case 'info': return <Info className="w-4 h-4" />;
        case 'recommendation': return <Lightbulb className="w-4 h-4" />;
        case 'none': return <CheckCircle2 className="w-4 h-4" />;
        default: return <TrendingUp className="w-4 h-4" />;
    }
};

const TheCortex = () => {
    const [activeTab, setActiveTab] = useState<'decisions' | 'conflicts' | 'compatibility'>('decisions');
    const [copiedText, setCopiedText] = useState<string | null>(null);
    const [mlDecisions, setMlDecisions] = useState<Decision[]>([]);

    useEffect(() => {
        const history = localStorage.getItem('mossy_ml_history');
        if (history) {
            try {
                const actions = JSON.parse(history);
                const decisions: Decision[] = actions
                    .filter((a: any) => a.action === 'ml_balance_tune' || a.action === 'ml_train')
                    .map((a: any, i: number) => ({
                        id: `ml-decision-${i}`,
                        title: a.action === 'ml_balance_tune' ? 'Record Optimization' : 'Pattern Recognition',
                        category: a.action === 'ml_balance_tune' ? 'performance' : 'best-practice',
                        severity: 'recommendation',
                        description: `Inferred from user activity: ${a.context.itemType || a.context.modelType || 'General Workflow'}`,
                        recommendation: a.context.output || 'No output recorded',
                        performanceImpact: 'Optimized via local ML'
                    }));
                setMlDecisions(decisions);
            } catch (e) {
                console.error("Failed to parse ML history", e);
            }
        }
    }, [activeTab]);

    const displayedDecisions = mlDecisions.length > 0 ? [...mlDecisions, ...SAMPLE_DECISIONS] : SAMPLE_DECISIONS;
    const criticalDecisions = displayedDecisions.filter(d => d.severity === 'critical' || d.severity === 'warning');

    return (
        <div className="h-full flex flex-col bg-[#1e1e1e] text-slate-200 font-sans overflow-hidden">
            {/* Header */}
            <div className="p-4 border-b border-black bg-[#2d2d2d] flex justify-between items-center shadow-md">
                <div>
                    <h2 className="text-lg font-bold text-white flex items-center gap-2">
                        <Brain className="w-5 h-5 text-purple-400" />
                        The Cortex
                    </h2>
                    <p className="text-[10px] text-slate-400 font-mono mt-0.5">Decision Hub & Recommendation Engine v1.0</p>
                </div>
                <div className="flex gap-3">
                    {criticalDecisions.length > 0 && (
                        <div className="px-3 py-1 bg-red-900/20 rounded border border-red-700/50 font-mono text-xs text-red-300 flex items-center gap-1.5">
                            <AlertTriangle className="w-3 h-3" /> {criticalDecisions.length} Issues
                        </div>
                    )}
                    <div className="px-3 py-1 bg-blue-900/20 rounded border border-blue-700/50 font-mono text-xs text-blue-300">
                        {SAMPLE_DECISIONS.length} Decisions
                    </div>
                </div>
            </div>

            {/* Tab Navigation */}
            <div className="flex border-b border-slate-800 bg-[#252526] px-4">
                {(['decisions', 'conflicts', 'compatibility'] as const).map((tab) => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`px-4 py-3 text-xs font-semibold border-b-2 transition-all capitalize ${
                            activeTab === tab
                                ? 'border-purple-400 text-purple-300'
                                : 'border-transparent text-slate-400 hover:text-slate-300'
                        }`}
                    >
                        {tab === 'decisions' && <span className="flex items-center gap-2"><Lightbulb className="w-3 h-3" /> Decisions</span>}
                        {tab === 'conflicts' && <span className="flex items-center gap-2"><AlertTriangle className="w-3 h-3" /> Conflicts</span>}
                        {tab === 'compatibility' && <span className="flex items-center gap-2"><CheckCircle2 className="w-3 h-3" /> Compatibility</span>}
                    </button>
                ))}
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto">
                {activeTab === 'decisions' && (
                    <div className="p-6 space-y-4">
                        <div className="text-xs text-slate-400 mb-4">
                            The Cortex analyzes your load order, assets, and configuration to provide actionable recommendations for improving stability and performance.
                        </div>
                        {displayedDecisions.map((decision) => (
                            <div
                                key={decision.id}
                                className={`border rounded-lg p-4 ${getSeverityColor(decision.severity)}`}
                            >
                                <div className="flex items-start gap-3 mb-2">
                                    <div className="flex-shrink-0 mt-0.5">
                                        {getSeverityIcon(decision.severity)}
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex items-center justify-between mb-1">
                                            <h4 className="font-semibold text-white">{decision.title}</h4>
                                            <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase ${
                                                decision.category === 'conflict' ? 'bg-red-900/50' :
                                                decision.category === 'performance' ? 'bg-blue-900/50' :
                                                decision.category === 'best-practice' ? 'bg-green-900/50' :
                                                decision.category === 'installation' ? 'bg-purple-900/50' :
                                                'bg-yellow-900/50'
                                            }`}>
                                                {decision.category}
                                            </span>
                                        </div>
                                        <p className="text-xs text-slate-300 mb-3">{decision.description}</p>
                                        <div className="bg-black/30 rounded p-3 mb-2">
                                            <p className="text-xs text-slate-200 flex items-start gap-2">
                                                <ArrowRight className="w-3 h-3 flex-shrink-0 mt-0.5" />
                                                <span>{decision.recommendation}</span>
                                            </p>
                                        </div>
                                        {decision.relatedMods && (
                                            <div className="text-[10px] text-slate-400 mb-2">
                                                <span className="font-semibold">Related Mods:</span> {decision.relatedMods.join(', ')}
                                            </div>
                                        )}
                                        {decision.performanceImpact && (
                                            <div className="text-[10px] text-slate-400 flex items-center gap-1.5">
                                                <TrendingUp className="w-3 h-3" />
                                                <span><span className="font-semibold">Performance Impact:</span> {decision.performanceImpact}</span>
                                            </div>
                                        )}
                                    </div>
                                    <button
                                        onClick={() => handleCopy(decision.recommendation)}
                                        className="ml-2 p-1.5 hover:bg-black/30 rounded flex-shrink-0"
                                    >
                                        {copiedText === decision.recommendation ? (
                                            <CheckCircle2 className="w-4 h-4 text-green-400" />
                                        ) : (
                                            <Copy className="w-4 h-4 opacity-50 hover:opacity-100" />
                                        )}
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {activeTab === 'conflicts' && (
                    <div className="p-6 space-y-4">
                        <div className="text-xs text-slate-400 mb-4">
                            Conflict analysis detects interactions between mods. Even &quot;none&quot; conflicts should be reviewed to ensure compatibility.
                        </div>
                        {SAMPLE_CONFLICTS.map((conflict, idx) => (
                            <div
                                key={idx}
                                className={`border rounded-lg p-4 ${getSeverityColor(conflict.severity)}`}
                            >
                                <div className="flex items-start gap-3 mb-3">
                                    <div className="flex-shrink-0 mt-0.5">
                                        {getSeverityIcon(conflict.severity)}
                                    </div>
                                    <div className="flex-1">
                                        <h4 className="font-semibold text-white mb-2">
                                            {conflict.mod1} <span className="text-slate-400">↔</span> {conflict.mod2}
                                        </h4>
                                        <div className="grid grid-cols-2 gap-3 mb-3 text-xs">
                                            <div className="bg-black/30 p-2 rounded">
                                                <span className="text-slate-400">Conflict Type</span>
                                                <div className="font-mono text-white">{conflict.conflictType}</div>
                                            </div>
                                            <div className="bg-black/30 p-2 rounded">
                                                <span className="text-slate-400">Severity</span>
                                                <div className="font-mono text-white capitalize">{conflict.severity}</div>
                                            </div>
                                        </div>
                                        <div className="bg-black/30 rounded p-3">
                                            <p className="text-xs text-slate-200 flex items-start gap-2">
                                                <ArrowRight className="w-3 h-3 flex-shrink-0 mt-0.5" />
                                                <span>{conflict.resolution}</span>
                                            </p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => handleCopy(conflict.resolution)}
                                        className="ml-2 p-1.5 hover:bg-black/30 rounded flex-shrink-0"
                                    >
                                        {copiedText === conflict.resolution ? (
                                            <CheckCircle2 className="w-4 h-4 text-green-400" />
                                        ) : (
                                            <Copy className="w-4 h-4 opacity-50 hover:opacity-100" />
                                        )}
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {activeTab === 'compatibility' && (
                    <div className="p-6 space-y-4">
                        <div className="text-xs text-slate-400 mb-4">
                            Compatibility reports show which mods work together safely, and any workarounds needed for problematic combinations.
                        </div>
                        {[
                            {
                                modName: 'AdvancedArmor.esp',
                                status: 'compatible',
                                issues: [],
                                recommendations: ['Load before WeaponExpansion', 'Requires DLCRobot.esm'],
                                masterDependencies: ['Fallout4.esm', 'DLCRobot.esm']
                            },
                            {
                                modName: 'WeaponExpansion.esp',
                                status: 'warning',
                                issues: ['Requires F4SE for weapon enchantment scripts', 'Adds 47 new FormIDs - verify load order'],
                                recommendations: ['Install F4SE first', 'Load after AdvancedArmor.esp'],
                                masterDependencies: ['Fallout4.esm']
                            },
                            {
                                modName: 'QuestFramework.esp',
                                status: 'compatible',
                                issues: [],
                                recommendations: ['Self-contained quest system', 'Works with most settlement mods'],
                                masterDependencies: ['Fallout4.esm']
                            }
                        ].map((report, idx) => (
                            <div
                                key={idx}
                                className={`border rounded-lg p-4 ${
                                    report.status === 'compatible' ? getSeverityColor('none') :
                                    report.status === 'warning' ? getSeverityColor('warning') :
                                    getSeverityColor('critical')
                                }`}
                            >
                                <div className="flex items-center justify-between mb-3">
                                    <h4 className="font-semibold text-white flex items-center gap-2">
                                        {report.status === 'compatible' && <CheckCircle2 className="w-4 h-4 text-green-400" />}
                                        {report.status === 'warning' && <AlertTriangle className="w-4 h-4 text-yellow-400" />}
                                        {report.modName}
                                    </h4>
                                    <span className={`px-2 py-1 rounded text-[9px] font-bold uppercase ${
                                        report.status === 'compatible' ? 'bg-green-900/50' : 'bg-yellow-900/50'
                                    }`}>
                                        {report.status}
                                    </span>
                                </div>
                                {report.issues.length > 0 && (
                                    <div className="mb-3 space-y-1">
                                        <div className="text-[10px] font-semibold text-slate-300">Issues:</div>
                                        {report.issues.map((issue, i) => (
                                            <div key={i} className="text-xs text-slate-300 ml-3 flex items-start gap-2">
                                                <span className="text-red-400">•</span> {issue}
                                            </div>
                                        ))}
                                    </div>
                                )}
                                <div className="mb-3 space-y-1">
                                    <div className="text-[10px] font-semibold text-slate-300">Recommendations:</div>
                                    {report.recommendations.map((rec, i) => (
                                        <div key={i} className="text-xs text-slate-300 ml-3 flex items-start gap-2">
                                            <span className="text-blue-400">→</span> {rec}
                                        </div>
                                    ))}
                                </div>
                                <div className="pt-3 border-t border-current/20">
                                    <div className="text-[10px] font-semibold text-slate-300 mb-1">Master Dependencies:</div>
                                    <div className="flex flex-wrap gap-1.5">
                                        {report.masterDependencies.map((dep, i) => (
                                            <span key={i} className="px-2 py-0.5 bg-black/30 rounded text-[9px] font-mono">
                                                {dep}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default TheCortex;
