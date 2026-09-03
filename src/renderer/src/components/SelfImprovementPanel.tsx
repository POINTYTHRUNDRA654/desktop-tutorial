import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { Brain, TrendingUp, Lightbulb, CheckCircle, AlertTriangle, Target, FileText, Code, Download, ShieldCheck, Library, Trash2, ScrollText, FolderOpen, Play, Square, Loader2 } from 'lucide-react';
import { selfImprovementEngine, ImprovementOpportunity, ScriptGenerationRequest, GeneratedScript } from '../SelfImprovementEngine';

// The SS2 "Reality Check" grading engine is a local-only dev tool (see .gitignore) —
// its source isn't tracked in the public repo. import.meta.glob resolves at build
// time without requiring the file to exist, so a fresh clone of the public repo
// still builds; the grading UI below just no-ops when the local-only file isn't present.
const gradingEngineModules = import.meta.glob('../grading/GradingEngine.ts');
async function loadGradingEngine(): Promise<any | null> {
  const loader = (gradingEngineModules as Record<string, () => Promise<any>>)['../grading/GradingEngine.ts'];
  if (!loader) return null;
  const mod = await loader();
  return mod.gradingEngine;
}

type GradableScriptType = 'ss2-plot' | 'city-plan';
const GRADABLE_TYPES: GradableScriptType[] = ['ss2-plot', 'city-plan'];

interface LocalGradeRecord {
  id: string;
  scriptId: string;
  scriptType: GradableScriptType;
  score: number | null;
  deterministicScore: number | null;
  llmScore: number | null;
  deficiencies: string[];
  referenceModsUsed: string[];
  gradedAt: string;
  message?: string;
}

interface LocalReferenceModSummary {
  modId: string;
  modName?: string;
  buildingPlanCount: number;
  cityPlanCount: number;
  addedAt: number;
}

interface SelfImprovementPanelProps {
  isVisible: boolean;
  onClose: () => void;
}

export const SelfImprovementPanel: React.FC<SelfImprovementPanelProps> = ({ isVisible, onClose }) => {
  const [opportunities, setOpportunities] = useState<ImprovementOpportunity[]>([]);
  const [metrics, setMetrics] = useState<any>(null);
  const [selectedOpportunity, setSelectedOpportunity] = useState<ImprovementOpportunity | null>(null);
  const [generatedScripts, setGeneratedScripts] = useState<GeneratedScript[]>([]);
  const [scriptRequest, setScriptRequest] = useState<ScriptGenerationRequest>({
    type: 'papyrus',
    name: '',
    description: '',
    requirements: []
  });
  const [showScriptGenerator, setShowScriptGenerator] = useState(false);

  // SS2 "Reality Check" grading state — local-only feature, see loadGradingEngine() above.
  const [referenceMods, setReferenceMods] = useState<LocalReferenceModSummary[]>([]);
  const [newReferenceFolder, setNewReferenceFolder] = useState('');
  const [addingReferenceFolder, setAddingReferenceFolder] = useState(false);
  const [gradingScriptId, setGradingScriptId] = useState<string | null>(null);
  const [gradeResults, setGradeResults] = useState<Record<string, LocalGradeRecord>>({});
  const [expandedLogModId, setExpandedLogModId] = useState<string | null>(null);
  const [logText, setLogText] = useState('');
  const [buildingDataset, setBuildingDataset] = useState(false);
  const [datasetResultMsg, setDatasetResultMsg] = useState('');

  // Practice-until-passing: the actual closed refine loop, not one-shot grading.
  const [refiningType, setRefiningType] = useState<GradableScriptType | null>(null);
  const [refineAttempts, setRefineAttempts] = useState<Array<{ attempt: number; score: number | null; name: string }>>([]);
  const [refineDone, setRefineDone] = useState<{ passed: boolean; finalScore: number | null } | null>(null);

  useEffect(() => {
    if (isVisible) {
      loadData();
    }
  }, [isVisible]);

  const loadData = () => {
    setOpportunities(selfImprovementEngine.generateImprovementSuggestions());
    setMetrics(selfImprovementEngine.getPerformanceMetrics());
    setGeneratedScripts(selfImprovementEngine.getGeneratedScripts());
    loadReferenceMods();
    loadGradeHistory();
  };

  const loadReferenceMods = async () => {
    const engine = await loadGradingEngine();
    if (!engine) return;
    setReferenceMods(await engine.listReferenceMods());
  };

  const loadGradeHistory = async () => {
    const engine = await loadGradingEngine();
    if (!engine) return;
    const history: LocalGradeRecord[] = engine.getHistory();
    const latestByScript: Record<string, LocalGradeRecord> = {};
    for (const record of history) latestByScript[record.scriptId] = record; // append-order history — last wins = latest grade
    setGradeResults(latestByScript);
  };

  const handleRemoveReferenceMod = async (modId: string) => {
    const engine = await loadGradingEngine();
    if (!engine) return;
    await engine.removeReferenceMod(modId);
    await loadReferenceMods();
  };

  const handleToggleLog = async (modId: string) => {
    if (expandedLogModId === modId) {
      setExpandedLogModId(null);
      return;
    }
    const engine = await loadGradingEngine();
    if (!engine) return;
    const log = await engine.getReferenceModLog(modId);
    setLogText(log || 'No log recorded for this reference mod.');
    setExpandedLogModId(modId);
  };

  const handleRevealLog = async (modId: string) => {
    const engine = await loadGradingEngine();
    if (!engine) return;
    const ok = await engine.revealReferenceModLog(modId);
    if (!ok) toast.error('No log file found for this reference mod.');
  };

  const handleBuildFineTuneDataset = async () => {
    setBuildingDataset(true);
    setDatasetResultMsg('');
    try {
      const bridge = (window as any).electron?.api;
      const result = await bridge?.referenceCorpus?.buildFineTuneDataset?.();
      if (result?.success) {
        toast.success(`Dataset built: ${result.exampleCount} training examples.`);
        setDatasetResultMsg(
          `${result.exampleCount} examples (${result.buildingPlanExampleCount} plot, ${result.cityPlanExampleCount} city-plan) ` +
          `from ${result.buildingPlanTotal + result.cityPlanTotal} real mined records.\nSaved to: ${result.outputPath}`
        );
      } else {
        toast.error(result?.error || 'Failed to build fine-tune dataset.');
      }
    } catch (error) {
      toast.error(`Error building dataset: ${error}`);
    } finally {
      setBuildingDataset(false);
    }
  };

  const handleBrowseReferenceFolder = async () => {
    const picked = await (window as any).electronAPI?.pickDirectory?.('Select an installed SS2 mod folder (e.g. an MO2 mod folder)');
    if (picked) setNewReferenceFolder(picked);
  };

  const handleAddReferenceFolder = async () => {
    if (!newReferenceFolder.trim()) {
      toast.error('Pick or enter a local folder first.');
      return;
    }
    setAddingReferenceFolder(true);
    try {
      const engine = await loadGradingEngine();
      if (!engine) {
        toast.error('Reality Check grading engine is not available in this build.');
        return;
      }
      const result = await engine.addReferenceModFromFolder(newReferenceFolder.trim());
      if (result?.success) {
        toast.success(`Added "${result.modName}" — ${result.buildingPlanCount || 0} plot(s), ${result.cityPlanCount || 0} city plan(s) mined from local folder.`);
        setNewReferenceFolder('');
        await loadReferenceMods();
      } else {
        toast.error(`Failed to add reference folder: ${result?.error || 'unknown error'}`);
      }
    } catch (error) {
      toast.error(`Error adding reference folder: ${error}`);
    } finally {
      setAddingReferenceFolder(false);
    }
  };

  const handleGradeScript = async (script: GeneratedScript) => {
    setGradingScriptId(script.id);
    try {
      const engine = await loadGradingEngine();
      if (!engine) {
        toast.error('Reality Check grading engine is not available in this build.');
        return;
      }
      const record: LocalGradeRecord = await engine.gradeScript(script);
      setGradeResults(prev => ({ ...prev, [script.id]: record }));
      if (record.score === null) {
        toast.error(record.message || 'No reference data available yet.');
      } else {
        toast.success(`Graded "${script.name}": ${record.score}/100`);
      }
      setOpportunities(selfImprovementEngine.generateImprovementSuggestions());
      setMetrics(selfImprovementEngine.getPerformanceMetrics());
    } catch (error) {
      toast.error(`Error grading script: ${error}`);
    } finally {
      setGradingScriptId(null);
    }
  };

  const implementOpportunity = (opportunityId: string) => {
    selfImprovementEngine.implementImprovement(opportunityId);
    loadData(); // Refresh data
  };

  const [generatingScript, setGeneratingScript] = useState(false);

  // Real, verified base-game Fallout 4 workshop settlements (no DLC required) —
  // grounds City Plan practice scenarios in actual places instead of a small
  // fixed list of invented ones, so a long-running continuous session gets
  // genuine variety rather than cycling the same handful of scenarios.
  const REAL_FO4_SETTLEMENTS = [
    'Sanctuary Hills', 'Red Rocket Truck Stop', 'Abernathy Farm', 'Starlight Drive-In',
    'Sunshine Tidings Co-op', 'The Castle', 'County Crossing', 'Coastal Cottage',
    'Croup Manor', 'Egret Tours Marina', 'Finch Farm', 'Graygarden',
    'Greentop Mustard Farm', "Hangman's Alley", 'Jamaica Plain', 'Kingsport Lighthouse',
    'Nordhagen Beach', 'Oberland Station', 'Spectacle Island', 'Taffington Boathouse',
    'Tenpines Bluff', 'Warwick Homestead', 'Bunker Hill', 'Somerville Place',
    'Outpost Zimonja', 'Murkwater Construction Site', 'Boston Airport',
  ];

  // Real SS2 plot Type/Tier/Size axes — the same real values already used and
  // verified in the ss2-plot system prompt above (Type keywords, Tier levels
  // 1-3, plot sizes 1x1/2x2/3x3). Combining them generates many distinct real
  // scenarios instead of 5 fixed strings that would repeat every 5 rounds.
  const REAL_PLOT_TYPES = [
    { type: 'Residential', flavor: 'a settler home' },
    { type: 'Commercial', flavor: 'a shop or trading post' },
    { type: 'Agricultural', flavor: 'a farming or food-production operation' },
    { type: 'Industrial', flavor: 'a manufacturing or salvage operation' },
    { type: 'Military', flavor: 'a defensive or guard post' },
  ];
  const REAL_PLOT_SIZES = ['1x1', '2x2', '3x3'];
  const REAL_PLOT_TIERS = [1, 2, 3];

  const generateSS2PlotScenario = () => {
    const pt = REAL_PLOT_TYPES[Math.floor(Math.random() * REAL_PLOT_TYPES.length)];
    const size = REAL_PLOT_SIZES[Math.floor(Math.random() * REAL_PLOT_SIZES.length)];
    const tier = REAL_PLOT_TIERS[Math.floor(Math.random() * REAL_PLOT_TIERS.length)];
    return {
      description: `Design a Tier ${tier} ${pt.type} plot (${size}): ${pt.flavor}, built from kit-bashed vanilla Workshop pieces.`,
      requirements: [pt.type.toLowerCase(), `tier ${tier}`, `${size} size`, 'kit-bash from existing meshes'],
    };
  };

  const generateCityPlanScenario = () => {
    const settlement = REAL_FO4_SETTLEMENTS[Math.floor(Math.random() * REAL_FO4_SETTLEMENTS.length)];
    const leveled = Math.random() < 0.5;
    const levels = leveled ? [2, 3, 4][Math.floor(Math.random() * 3)] : 1;
    return {
      description: leveled
        ? `Design a ${levels}-level leveled City Plan for ${settlement}: an original settlement design that evolves coherently across levels using the "build in reverse" technique.`
        : `Design a single-level City Plan for ${settlement}: an original, coherent settlement design suited to this location's real geography and starting conditions.`,
      requirements: leveled ? [`${levels} levels`, 'build in reverse'] : ['single level'],
    };
  };

  const startPracticeDrill = () => {
    const pick = generateSS2PlotScenario();
    setScriptRequest({ type: 'ss2-plot', name: '', description: pick.description, requirements: pick.requirements });
    setShowScriptGenerator(true);
  };

  const startCityPlanPracticeDrill = () => {
    const pick = generateCityPlanScenario();
    setScriptRequest({ type: 'city-plan', name: '', description: pick.description, requirements: pick.requirements });
    setShowScriptGenerator(true);
  };

  // Continuous session: generate → grade against real mods → if short of the
  // target, regenerate with the specific deficiencies fed back in — repeated
  // per scenario until it converges (or plateaus after maxAttempts), then
  // automatically picks a NEW random scenario and does it again. Keeps going
  // until the user hits Stop. sessionStopRef is a ref (not state) because the
  // loop below is a long-running async closure — state updates wouldn't be
  // visible inside it without a re-render, a ref is checked live every attempt.
  const sessionStopRef = React.useRef(false);
  const [sessionRunning, setSessionRunning] = useState<GradableScriptType | null>(null);
  const [sessionHistory, setSessionHistory] = useState<Array<{ scenario: string; attempts: number; finalScore: number | null; passed: boolean }>>([]);

  const stopSession = () => {
    sessionStopRef.current = true;
  };

  const startContinuousSession = async (scriptType: GradableScriptType) => {
    const engine = await loadGradingEngine();
    if (!engine) {
      toast.error('Reality Check grading engine is not available in this build.');
      return;
    }
    const pickScenario = scriptType === 'ss2-plot' ? generateSS2PlotScenario : generateCityPlanScenario;

    sessionStopRef.current = false;
    setSessionRunning(scriptType);
    setSessionHistory([]);
    setRefineAttempts([]);
    setRefineDone(null);

    try {
      while (!sessionStopRef.current) {
        const pick = pickScenario();
        setRefineAttempts([]);
        setRefineDone(null);

        const result = await engine.practiceUntilPassing(
          { type: scriptType, name: '', description: pick.description, requirements: pick.requirements },
          {
            maxAttempts: 8,
            targetScore: 100,
            shouldStop: () => sessionStopRef.current,
            onAttempt: (attempt: number, script: GeneratedScript, grade: LocalGradeRecord) => {
              setRefineAttempts(prev => [...prev, { attempt, score: grade.score, name: script.name }]);
              setGeneratedScripts(selfImprovementEngine.getGeneratedScripts());
              setGradeResults(prev => ({ ...prev, [script.id]: grade }));
            },
          }
        );

        setRefineDone({ passed: result.passed, finalScore: result.finalGrade.score });
        setSessionHistory(prev => [...prev, { scenario: pick.description, attempts: result.attemptCount, finalScore: result.finalGrade.score, passed: result.passed }]);

        if (result.finalGrade.score === null) {
          toast.error(result.finalGrade.message || 'No reference data available yet — stopping session.');
          break;
        }
        if (sessionStopRef.current) break;
      }
      setOpportunities(selfImprovementEngine.generateImprovementSuggestions());
      setMetrics(selfImprovementEngine.getPerformanceMetrics());
    } catch (error) {
      toast.error(`Error during practice session: ${error}`);
    } finally {
      setSessionRunning(null);
    }
  };

  const generateScript = async () => {
    if (!scriptRequest.description.trim()) {
      toast.error('Describe what the script should do first.');
      return;
    }
    setGeneratingScript(true);
    try {
      const generatedScript = await selfImprovementEngine.generateScript(scriptRequest);
      setGeneratedScripts(selfImprovementEngine.getGeneratedScripts());
      setScriptRequest({
        type: 'papyrus',
        name: '',
        description: '',
        requirements: []
      });
      toast.success(`Script "${generatedScript.name}" generated successfully!`);
    } catch (error) {
      toast.error(`Error generating script: ${error}`);
    } finally {
      setGeneratingScript(false);
    }
  };

  const downloadScript = (script: GeneratedScript) => {
    const blob = new Blob([script.content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${script.name}.${getFileExtension(script.type)}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const deleteScript = async (scriptId: string) => {
    const ok = await window.electronAPI?.showConfirm?.('Are you sure you want to delete this script?');
    if (!ok) return;
    selfImprovementEngine.deleteScript(scriptId);
    setGeneratedScripts(selfImprovementEngine.getGeneratedScripts());
  };

  const getFileExtension = (type: string): string => {
    switch (type) {
      case 'papyrus': return 'psc';
      case 'xedit': return 'pas';
      case 'blender': return 'py';
      case 'quest': return 'psc';
      case 'automation': return 'py';
      case 'ss2-plot': return 'md';
      case 'city-plan': return 'md';
      default: return 'txt';
    }
  };

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case 'high': return 'text-red-400';
      case 'medium': return 'text-yellow-400';
      case 'low': return 'text-green-400';
      default: return 'text-gray-400';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'knowledge_gap': return <AlertTriangle className="w-4 h-4 text-orange-400" />;
      case 'response_improvement': return <TrendingUp className="w-4 h-4 text-blue-400" />;
      case 'new_feature': return <Lightbulb className="w-4 h-4 text-purple-400" />;
      case 'efficiency_gain': return <Target className="w-4 h-4 text-green-400" />;
      default: return <Brain className="w-4 h-4 text-gray-400" />;
    }
  };

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg p-6 max-w-4xl w-full mx-4 max-h-[80vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Brain className="w-6 h-6 text-purple-400" />
            <h2 className="text-xl font-bold text-white">Mossy's Self-Improvement Center</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Performance Metrics */}
        {metrics && (
          <div className="bg-gray-700 rounded-lg p-4 mb-6">
            <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-green-400" />
              Performance Metrics
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-400">{metrics.totalInteractions}</div>
                <div className="text-sm text-gray-300">Total Interactions</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-400">{metrics.totalPatterns}</div>
                <div className="text-sm text-gray-300">Learned Patterns</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-400">{(metrics.averageSuccessRate * 100).toFixed(0)}%</div>
                <div className="text-sm text-gray-300">Avg Success Rate</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-yellow-400">{metrics.averageFeedbackRating.toFixed(1)}/5</div>
                <div className="text-sm text-gray-300">Avg User Rating</div>
              </div>
            </div>
          </div>
        )}

        {/* Improvement Opportunities */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
            <Lightbulb className="w-5 h-5 text-yellow-400" />
            Suggested Improvements ({opportunities.length})
          </h3>

          {opportunities.length === 0 ? (
            <div className="bg-gray-700 rounded-lg p-4 text-center text-gray-400">
              No improvement opportunities identified yet. Keep interacting with Mossy to generate suggestions!
            </div>
          ) : (
            <div className="space-y-3">
              {opportunities.map((opportunity) => (
                <div
                  key={opportunity.id}
                  className="bg-gray-700 rounded-lg p-4 hover:bg-gray-600 transition-colors cursor-pointer"
                  onClick={() => setSelectedOpportunity(opportunity)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3 flex-1">
                      {getTypeIcon(opportunity.type)}
                      <div className="flex-1">
                        <h4 className="text-white font-medium mb-1">{opportunity.description}</h4>
                        <p className="text-gray-300 text-sm mb-2">{opportunity.proposedSolution}</p>
                        <div className="flex items-center gap-4 text-sm">
                          <span className="text-gray-400">
                            Confidence: {(opportunity.confidence * 100).toFixed(0)}%
                          </span>
                          <span className={`font-medium ${getImpactColor(opportunity.impact)}`}>
                            Impact: {opportunity.impact}
                          </span>
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        implementOpportunity(opportunity.id);
                      }}
                      className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-sm flex items-center gap-1 transition-colors"
                    >
                      <CheckCircle className="w-3 h-3" />
                      Implement
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Selected Opportunity Details */}
        {selectedOpportunity && (
          <div className="bg-gray-700 rounded-lg p-4">
            <h4 className="text-white font-semibold mb-2">Improvement Details</h4>
            <div className="text-gray-300 text-sm space-y-2">
              <p><strong>Type:</strong> {selectedOpportunity.type.replace('_', ' ')}</p>
              <p><strong>Description:</strong> {selectedOpportunity.description}</p>
              <p><strong>Proposed Solution:</strong> {selectedOpportunity.proposedSolution}</p>
              <p><strong>Confidence:</strong> {(selectedOpportunity.confidence * 100).toFixed(0)}%</p>
              <p><strong>Impact:</strong> {selectedOpportunity.impact}</p>
              <p><strong>Created:</strong> {new Date(selectedOpportunity.createdAt).toLocaleDateString()}</p>
            </div>
          </div>
        )}

        {/* Learning Insights */}
        <div className="bg-gray-700 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-white mb-3">Current Learning Insights</h3>
          <div className="text-gray-300 text-sm whitespace-pre-line">
            {selfImprovementEngine.getLearningInsights() || 'No insights available yet. Continue interacting to generate learning data!'}
          </div>
        </div>

        {/* Script Generation */}
        <div className="bg-gray-700 rounded-lg p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              <Code className="w-5 h-5 text-blue-400" />
              Autonomous Script Generation
            </h3>
            <div className="flex gap-2">
              <button
                onClick={startPracticeDrill}
                title="Fill in a random Sim Settlements 2 plot scenario to practice"
                className="bg-purple-600 hover:bg-purple-700 text-white px-3 py-1 rounded text-sm transition-colors"
              >
                Practice: SS2 Plot
              </button>
              <button
                onClick={startCityPlanPracticeDrill}
                title="Fill in a random Sim Settlements 2 City Plan (full settlement) scenario to practice"
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1 rounded text-sm transition-colors"
              >
                Practice: City Plan
              </button>
              <button
                onClick={() => setShowScriptGenerator(!showScriptGenerator)}
                className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm transition-colors"
              >
                {showScriptGenerator ? 'Hide Generator' : 'Generate Script'}
              </button>
            </div>
          </div>

          {/* Continuous Practice Session — generate, grade vs real mods, refine with the
              actual deficiencies fed back in, repeat until it hits the target score, then
              auto-start a new real scenario and keep going until Stop is clicked. */}
          <div className="bg-gray-800/60 border border-purple-700/40 rounded-lg p-4 mb-4 space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="text-sm font-semibold text-purple-200">Continuous Practice Session (target: 100/100)</div>
              <div className="flex gap-2">
                <button
                  onClick={() => startContinuousSession('ss2-plot')}
                  disabled={!!sessionRunning}
                  className="flex items-center gap-1.5 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white px-3 py-1 rounded text-sm transition-colors"
                >
                  <Play className="w-3 h-3" /> Run SS2 Plot Session
                </button>
                <button
                  onClick={() => startContinuousSession('city-plan')}
                  disabled={!!sessionRunning}
                  className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white px-3 py-1 rounded text-sm transition-colors"
                >
                  <Play className="w-3 h-3" /> Run City Plan Session
                </button>
                {sessionRunning && (
                  <button
                    onClick={stopSession}
                    className="flex items-center gap-1.5 bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-sm transition-colors"
                  >
                    <Square className="w-3 h-3" /> Stop
                  </button>
                )}
              </div>
            </div>

            {sessionRunning && (
              <div className="text-xs text-purple-300 flex items-center gap-2">
                <Loader2 className="w-3 h-3 animate-spin" />
                Running {sessionRunning === 'ss2-plot' ? 'SS2 Plot' : 'City Plan'} session — generating, grading against real mods, and refining until it hits 100/100 (or plateaus after 8 attempts), then moving to a new scenario automatically.
              </div>
            )}

            {refineAttempts.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {refineAttempts.map(a => (
                  <span
                    key={a.attempt}
                    className={`text-xs px-2 py-0.5 rounded font-mono ${
                      a.score === null ? 'bg-gray-600 text-gray-300' :
                      a.score >= 100 ? 'bg-emerald-600 text-white' :
                      a.score >= 80 ? 'bg-green-700 text-green-100' :
                      a.score >= 40 ? 'bg-yellow-700 text-yellow-100' : 'bg-red-800 text-red-100'
                    }`}
                    title={a.name}
                  >
                    #{a.attempt}: {a.score === null ? '—' : `${a.score}/100`}
                  </span>
                ))}
                {refineDone && (
                  <span className={`text-xs px-2 py-0.5 rounded font-semibold ${refineDone.passed ? 'bg-emerald-500 text-white' : 'bg-amber-600 text-white'}`}>
                    {refineDone.passed ? `Converged at ${refineDone.finalScore}/100` : `Plateaued at ${refineDone.finalScore ?? '—'}/100`}
                  </span>
                )}
              </div>
            )}

            {sessionHistory.length > 0 && (
              <div className="text-xs text-gray-400 space-y-1 max-h-32 overflow-y-auto border-t border-gray-700 pt-2">
                <div className="font-semibold text-gray-300">This session ({sessionHistory.length} scenario{sessionHistory.length === 1 ? '' : 's'} completed):</div>
                {sessionHistory.slice().reverse().map((h, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <span className={h.passed ? 'text-emerald-400' : 'text-amber-400'}>{h.passed ? '✓' : '~'}</span>
                    <span className="truncate flex-1">{h.scenario}</span>
                    <span className="font-mono flex-shrink-0">{h.finalScore ?? '—'}/100 ({h.attempts} attempt{h.attempts === 1 ? '' : 's'})</span>
                  </div>
                ))}
              </div>
            )}

            {referenceMods.length > 0 && (
              <div className="mt-3 pt-3 border-t border-gray-600">
                <p className="text-gray-400 text-xs mb-2">
                  Build a real Unsloth fine-tune training dataset from these mods' actual EditorIDs/property
                  names — teaches the real naming conventions directly instead of relying on in-context prompting
                  every generation. Load the resulting .jsonl in Settings → Local Capabilities → Fine-Tuning.
                </p>
                <button
                  onClick={handleBuildFineTuneDataset}
                  disabled={buildingDataset}
                  className="bg-emerald-700 hover:bg-emerald-600 disabled:bg-gray-600 disabled:cursor-not-allowed text-white px-3 py-2 rounded text-sm whitespace-nowrap"
                >
                  {buildingDataset ? 'Building…' : 'Build Fine-Tune Dataset from These Mods'}
                </button>
                {datasetResultMsg && <div className="text-xs text-emerald-300 mt-2 whitespace-pre-line">{datasetResultMsg}</div>}
              </div>
            )}
          </div>

          {showScriptGenerator && (
            <div className="space-y-4 mb-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Script Type</label>
                  <select
                    value={scriptRequest.type}
                    onChange={(e) => setScriptRequest({...scriptRequest, type: e.target.value as any})}
                    className="w-full bg-gray-600 border border-gray-500 rounded px-3 py-2 text-white"
                  >
                    <option value="papyrus">Papyrus (Fallout 4)</option>
                    <option value="xedit">xEdit Script</option>
                    <option value="blender">Blender Python</option>
                    <option value="quest">Quest Script</option>
                    <option value="automation">Automation Script</option>
                    <option value="ss2-plot">Sim Settlements 2 Plot (practice)</option>
                    <option value="city-plan">Sim Settlements 2 City Plan (practice)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">Script Name (Optional)</label>
                  <input
                    type="text"
                    value={scriptRequest.name}
                    onChange={(e) => setScriptRequest({...scriptRequest, name: e.target.value})}
                    placeholder="Auto-generated if empty"
                    className="w-full bg-gray-600 border border-gray-500 rounded px-3 py-2 text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Description</label>
                <textarea
                  value={scriptRequest.description}
                  onChange={(e) => setScriptRequest({...scriptRequest, description: e.target.value})}
                  placeholder="Describe what the script should do..."
                  className="w-full bg-gray-600 border border-gray-500 rounded px-3 py-2 text-white h-20 resize-none"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Requirements (Optional)</label>
                <input
                  type="text"
                  value={scriptRequest.requirements?.join(', ') || ''}
                  onChange={(e) => setScriptRequest({
                    ...scriptRequest,
                    requirements: e.target.value.split(',').map(r => r.trim()).filter(r => r)
                  })}
                  placeholder="quest, combat, dialogue (comma-separated)"
                  className="w-full bg-gray-600 border border-gray-500 rounded px-3 py-2 text-white"
                />
              </div>

              <button
                onClick={generateScript}
                disabled={!scriptRequest.description.trim() || generatingScript}
                className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white px-4 py-2 rounded transition-colors flex items-center justify-center gap-2"
              >
                <FileText className="w-4 h-4" />
                {generatingScript ? 'Generating…' : 'Generate Script'}
              </button>
            </div>
          )}

          {/* Generated Scripts List */}
          {generatedScripts.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-md font-medium text-white mb-2">Generated Scripts ({generatedScripts.length})</h4>
              {generatedScripts.slice(0, 5).map((script) => {
                const isGradable = GRADABLE_TYPES.includes(script.type as GradableScriptType);
                const grade = gradeResults[script.id];
                return (
                <div key={script.id} className="bg-gray-600 rounded p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="text-white font-medium">{script.name}</div>
                      <div className="text-gray-300 text-sm">{script.description}</div>
                      <div className="text-gray-400 text-xs">
                        {script.type} • {new Date(script.generatedAt).toLocaleDateString()} • AI-generated — review before use
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {isGradable && (
                        <button
                          onClick={() => handleGradeScript(script)}
                          disabled={gradingScriptId === script.id}
                          className="bg-purple-600 hover:bg-purple-700 disabled:bg-gray-500 text-white px-2 py-1 rounded text-xs flex items-center gap-1"
                          title="Grade this design doc against real downloaded Sim Settlements 2 mods"
                        >
                          <ShieldCheck className="w-3 h-3" />
                          {gradingScriptId === script.id ? 'Grading…' : 'Grade vs Real Mods'}
                        </button>
                      )}
                      <button
                        onClick={() => downloadScript(script)}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-2 py-1 rounded text-xs flex items-center gap-1"
                        title="Download Script"
                      >
                        <Download className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() => deleteScript(script.id)}
                        className="bg-red-600 hover:bg-red-700 text-white px-2 py-1 rounded text-xs"
                        title="Delete Script"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                  {grade && (
                    <div className="mt-2 pt-2 border-t border-gray-500 text-xs">
                      {grade.score === null ? (
                        <div className="text-yellow-300">{grade.message}</div>
                      ) : (
                        <>
                          <div className={`font-semibold ${grade.score >= 70 ? 'text-green-400' : grade.score >= 40 ? 'text-yellow-400' : 'text-red-400'}`}>
                            Reality Check score: {grade.score}/100
                            <span className="text-gray-400 font-normal"> (structure {grade.deterministicScore}/100, AI review {grade.llmScore}/100)</span>
                          </div>
                          <div className="text-gray-400 mt-1">vs. real mod(s): {grade.referenceModsUsed.join(', ')}</div>
                          {grade.deficiencies.length > 0 && (
                            <ul className="list-disc list-inside text-gray-300 mt-1 space-y-0.5">
                              {grade.deficiencies.slice(0, 5).map((d, i) => <li key={i}>{d}</li>)}
                            </ul>
                          )}
                        </>
                      )}
                    </div>
                  )}
                </div>
                );
              })}
            </div>
          )}

          {/* SS2 "Reality Check" Reference Library — local-only feature. Nexus-mod-ID-based
              downloading was removed 2026-09-03 (Nexus Mods data must not be used for AI
              training/grading) -- mining an already-installed local folder is now the only way
              to add ground truth here; Mossy performs no download of its own for this. */}
          <div className="bg-gray-700/50 rounded-lg p-4 mt-4">
            <h4 className="text-md font-medium text-white mb-2 flex items-center gap-2">
              <Library className="w-4 h-4 text-purple-400" />
              Reality Check Reference Library
            </h4>
            <p className="text-gray-400 text-xs mb-3">
              Mine a Sim Settlements 2 Building Plan or City Plan addon mod you already have installed as ground
              truth. Mossy's generated plot/city-plan design docs get graded against the actual parsed records
              from these mods. Point it at an already-installed local mod folder (e.g. an MO2 mod folder) below —
              Mossy doesn't download anything for this itself.
            </p>
            <div className="flex gap-2 mb-3">
              <input
                type="text"
                value={newReferenceFolder}
                onChange={(e) => setNewReferenceFolder(e.target.value)}
                placeholder="e.g. E:\Mod.Organizer-2.5.2 Game Mods\Some SS2 Addon Pack"
                className="flex-1 bg-gray-600 border border-gray-500 rounded px-3 py-2 text-white text-sm"
              />
              <button
                onClick={handleBrowseReferenceFolder}
                className="bg-gray-600 hover:bg-gray-500 text-white px-3 py-2 rounded text-sm whitespace-nowrap"
              >
                Browse…
              </button>
              <button
                onClick={handleAddReferenceFolder}
                disabled={addingReferenceFolder || !newReferenceFolder.trim()}
                className="bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white px-3 py-2 rounded text-sm whitespace-nowrap"
              >
                {addingReferenceFolder ? 'Mining…' : 'Add Folder'}
              </button>
            </div>
            {referenceMods.length === 0 ? (
              <div className="text-gray-500 text-xs italic">No reference mods cached yet.</div>
            ) : (
              <div className="space-y-1">
                {referenceMods.map((mod) => (
                  <div key={mod.modId} className="bg-gray-600 rounded px-3 py-2 text-xs">
                    <div className="flex items-center justify-between">
                      <div className="text-gray-200">
                        {mod.modName || mod.modId}
                        <span className="text-gray-400"> — {mod.buildingPlanCount} plot(s), {mod.cityPlanCount} city plan(s)</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleToggleLog(mod.modId)}
                          className="text-gray-300 hover:text-white"
                          title="View mining log (per-file record counts, resolution stats, errors)"
                        >
                          <ScrollText className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => handleRevealLog(mod.modId)}
                          className="text-gray-300 hover:text-white"
                          title="Open log file location (to attach/upload it)"
                        >
                          <FolderOpen className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => handleRemoveReferenceMod(mod.modId)}
                          className="text-red-400 hover:text-red-300"
                          title="Remove reference mod"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                    {expandedLogModId === mod.modId && (
                      <pre className="mt-2 max-h-48 overflow-y-auto bg-black/30 rounded p-2 text-gray-300 whitespace-pre-wrap">{logText}</pre>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};