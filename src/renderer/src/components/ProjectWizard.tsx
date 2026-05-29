import React, { useEffect, useState } from 'react';
import { ChevronRight, ChevronLeft, CheckCircle2, Circle, Play, Save, Info } from 'lucide-react';
import type { ProjectWizardState, WizardStep } from '../../../shared/types';

interface ProjectWizardProps {
  wizardId: string;
  onActionComplete?: (result: any) => void;
  className?: string;
}

const ProjectWizard: React.FC<ProjectWizardProps> = ({ wizardId, onActionComplete, className }) => {
  const [state, setState] = useState<ProjectWizardState | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const toSafeStepData = (value: unknown, seen: WeakSet<object> = new WeakSet()): unknown => {
    if (value === null || value === undefined) return undefined;
    const t = typeof value;
    if (t === 'string' || t === 'number' || t === 'boolean') return value;
    if (Array.isArray(value)) {
      return value.map((item) => toSafeStepData(item, seen));
    }
    if (t === 'object' && Object.getPrototypeOf(value) === Object.prototype) {
      if (seen.has(value as object)) return undefined;
      seen.add(value as object);
      const out: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
        out[String(k)] = toSafeStepData(v, seen);
      }
      return out;
    }
    return undefined;
  };

  const normalizeWizardState = (raw: unknown): ProjectWizardState | null => {
    if (!raw || typeof raw !== 'object') return null;
    const src = raw as Record<string, unknown>;

    const rawSteps = Array.isArray(src.steps) ? src.steps : [];
    const steps: WizardStep[] = rawSteps
      .filter((step): step is Record<string, unknown> => step !== null && typeof step === 'object')
      .map((step, idx) => {
        const status = step.status;
        const type = step.type;
        return {
          id: String(step.id || `${wizardId}-step-${idx}`),
          title: String(step.title || 'Untitled step'),
          description: String(step.description || ''),
          status: status === 'not-started' || status === 'in-progress' || status === 'completed' ? status : 'not-started',
          type: type === 'script' || type === 'blender' || type === 'audit' || type === 'setup' ? type : 'setup',
          data: toSafeStepData(step.data),
        };
      });

    const rawIndex = Number(src.currentStepIndex);
    const safeIndex = Number.isFinite(rawIndex)
      ? Math.max(0, Math.min(rawIndex, Math.max(steps.length - 1, 0)))
      : 0;

    return {
      id: String(src.id || wizardId),
      projectId: String(src.projectId || ''),
      name: String(src.name || 'Project Wizard'),
      steps,
      currentStepIndex: safeIndex,
      lastUpdated: Number(src.lastUpdated || Date.now()),
    };
  };

  useEffect(() => {
    const fetchState = async () => {
      try {
        const bridge = (window as any).electronAPI;
        if (bridge?.wizardGetState) {
          const s = await bridge.wizardGetState(wizardId);
          setState(normalizeWizardState(s));
        }
      } catch (e: any) {
        // "No handler registered" means the main process doesn't support this yet —
        // silently degrade rather than polluting the console with an error.
        const msg = String(e?.message || e);
        if (msg.includes('No handler registered') || msg.includes('no handler')) {
          console.warn('[ProjectWizard] wizard IPC not available — degraded mode');
        } else {
          console.warn('[ProjectWizard] Failed to fetch wizard state:', msg);
        }
      } finally {
        setLoading(false);
      }
    };
    fetchState();
  }, [wizardId]);

  const updateStep = async (stepId: string, status: WizardStep['status'], data?: any) => {
    try {
      const bridge = (window as any).electronAPI;
      if (bridge?.wizardUpdateStep) {
        const nextState = await bridge.wizardUpdateStep(wizardId, stepId, status, data);
        if (nextState) setState(normalizeWizardState(nextState));
      } else {
        // No IPC — update state locally so the UI still responds
        setState(prev => {
          if (!prev) return prev;
          return {
            ...prev,
            steps: prev.steps.map(s => s.id === stepId ? { ...s, status, data: data ?? s.data } : s),
            lastUpdated: Date.now(),
          };
        });
      }
    } catch (e: any) {
      console.warn('[ProjectWizard] Failed to update step:', String(e?.message || e));
      // Still update locally so the UI doesn't freeze
      setState(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          steps: prev.steps.map(s => s.id === stepId ? { ...s, status, data: data ?? s.data } : s),
          lastUpdated: Date.now(),
        };
      });
    }
  };

  const runAction = async (stepId: string, actionType: string, payload: any) => {
    setSubmitting(true);
    try {
      const bridge = (window as any).electronAPI;
      if (bridge?.wizardSubmitAction) {
        const result = await bridge.wizardSubmitAction(wizardId, actionType, payload);
        if (result.success) {
          await updateStep(stepId, 'completed', { result });
          if (onActionComplete) onActionComplete(result);
        }
      }
    } catch (e) {
      console.error('Action failed:', e);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="p-4 text-slate-400">Loading Wizard...</div>;
  if (!state) return <div className="p-4 text-slate-500 italic">No active wizard found. Start a project to enable guidance.</div>;

  const steps = Array.isArray(state.steps) ? state.steps : [];
  const safeCurrentStepIndex = Number.isFinite(state.currentStepIndex)
    ? Math.max(0, Math.min(state.currentStepIndex, Math.max(steps.length - 1, 0)))
    : 0;
  const currentStep = steps[safeCurrentStepIndex];
  if (!currentStep) return <div className="p-4 text-slate-400">Wizard error: no steps available</div>;

  return (
    <div className={`bg-slate-900 border border-slate-700 rounded-xl overflow-hidden ${className || ''}`}>
      <div className="bg-slate-800 px-4 py-3 border-b border-slate-700 flex justify-between items-center">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          {state.name}
        </h3>
        <div className="text-[10px] text-slate-500 font-mono uppercase tracking-tighter">
          Step {safeCurrentStepIndex + 1} of {steps.length}
        </div>
      </div>

      <div className="p-4 flex gap-4">
        {/* Step List */}
        <div className="w-1/3 space-y-2 border-r border-slate-800 pr-4">
          {steps.map((step, idx) => (
            <div 
              key={step?.id || idx}
              className={`flex items-center gap-3 p-2 rounded-lg transition-colors ${
                idx === safeCurrentStepIndex ? 'bg-emerald-500/10 text-emerald-400' : 'text-slate-500'
              }`}
            >
              {step?.status === 'completed' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              ) : idx === safeCurrentStepIndex ? (
                <div className="w-4 h-4 rounded-full border-2 border-emerald-500 animate-pulse" />
              ) : (
                <Circle className="w-4 h-4" />
              )}
              <span className="text-xs font-medium truncate">{step?.title}</span>
            </div>
          ))}
        </div>

        {/* Step Surface */}
        <div className="flex-1 flex flex-col justify-between min-h-[160px]">
          <div>
            <h4 className="text-sm font-bold text-white mb-1">{currentStep?.title}</h4>
            <p className="text-xs text-slate-400 mb-4">{currentStep?.description}</p>
            
            {/* Contextual Actions */}
            {wizardId === 'script-writer' && currentStep?.id === 'generate' && (
              <div className="space-y-3 p-3 bg-slate-800/50 rounded-lg border border-slate-700">
                <input 
                  type="text" 
                  placeholder="ScriptName (e.g. MyCoolScript)"
                  className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-xs text-white"
                  onChange={(e) => currentStep && updateStep(currentStep.id, 'in-progress', { scriptName: e.target.value })}
                  value={currentStep?.data?.scriptName || ''}
                />
                <select 
                  className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-xs text-white"
                  onChange={(e) => currentStep && updateStep(currentStep.id, 'in-progress', { type: e.target.value })}
                  value={currentStep?.data?.type || 'ObjectReference'}
                >
                  <option value="ObjectReference">ObjectReference</option>
                  <option value="Actor">Actor</option>
                  <option value="ReferenceAlias">ReferenceAlias</option>
                  <option value="Quest">Quest</option>
                </select>
              </div>
            )}

            {wizardId === 'blender-companion' && currentStep?.id === 'inject' && (
              <div className="flex items-center gap-3 p-3 bg-blue-900/20 rounded-lg border border-blue-700/30">
                <Info className="w-5 h-5 text-blue-400 flex-shrink-0" />
                <p className="text-[11px] text-blue-200">
                  This will apply Metric (cm), 60 FPS, and focal length standards to your current Blender session.
                </p>
              </div>
            )}
            
            {wizardId === 'audit-fixer' && currentStep?.id === 'fix' && (
              <div className="p-3 bg-emerald-900/20 rounded-lg border border-emerald-700/30">
                <p className="text-[11px] text-emerald-200">
                  Identified absolute path discrepancies. Use xEdit to locate the MODEL subrecords and remove the drive-letter prefix so paths are relative. Click &quot;Run Action&quot; to mark this step complete once you have applied the fix manually.
                </p>
              </div>
            )}
          </div>

          <div className="flex justify-between items-center mt-4">
            <button 
              disabled={safeCurrentStepIndex === 0}
              onClick={() => setState((prev) => {
                if (!prev) return prev;
                return {
                  id: prev.id,
                  projectId: prev.projectId,
                  name: prev.name,
                  steps: prev.steps,
                  currentStepIndex: Math.max(0, safeCurrentStepIndex - 1),
                  lastUpdated: Date.now(),
                };
              })}
              className="px-3 py-1 text-xs text-slate-400 hover:text-white disabled:opacity-30 flex items-center gap-1"
            >
              <ChevronLeft className="w-4 h-4" /> Back
            </button>
            
            <button
              disabled={submitting || (currentStep?.id === 'generate' && !currentStep?.data?.scriptName)}
              onClick={() => {
                if (currentStep?.status !== 'completed') {
                  const payload = currentStep?.data || {};
                  // Specific action triggers
                  if (wizardId === 'script-writer' && currentStep?.id === 'generate') {
                    runAction(currentStep.id, 'generate', { ...payload, targetPath: `Data/Scripts/Source/User/${payload.scriptName}.psc` });
                  } else if (wizardId === 'blender-companion' && currentStep?.id === 'inject') {
                    runAction(currentStep.id, 'inject', payload);
                  } else if (wizardId === 'audit-fixer' && currentStep?.id === 'fix') {
                    runAction(currentStep.id, 'fix', payload);
                  } else {
                    currentStep && updateStep(currentStep.id, 'completed');
                  }
                } else {
                  setState((prev) => {
                    if (!prev) return prev;
                    return {
                      id: prev.id,
                      projectId: prev.projectId,
                      name: prev.name,
                      steps: prev.steps,
                      currentStepIndex: Math.min(safeCurrentStepIndex + 1, Math.max(steps.length - 1, 0)),
                      lastUpdated: Date.now(),
                    };
                  });
                }
              }}
              className={`px-4 py-1.5 rounded font-bold text-xs flex items-center gap-2 transition-all shadow-lg ${
                currentStep?.status === 'completed' 
                  ? 'bg-slate-700 text-white hover:bg-slate-600' 
                  : 'bg-emerald-600 text-white hover:bg-emerald-500'
              }`}
            >
              {submitting ? 'Applying...' : currentStep?.status === 'completed' ? 'Next' : 'Run Action'} 
              {currentStep?.status === 'completed' ? <ChevronRight className="w-4 h-4" /> : <Play className="w-3 h-3 fill-current" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProjectWizard;
