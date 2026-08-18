import React, { useState } from 'react';
import { Activity, Copy, Check, Loader2, PlayCircle } from 'lucide-react';
import { LocalAIEngine, TurnTraceEntry } from './LocalAIEngine';

/**
 * "Which layer is broken" in five seconds, not five hours. One panel, one
 * button, plain-text output — every check here traverses the real renderer
 * code path (bridgeFetch, getFullSystemInstruction, getLocalProviderStatus),
 * not a script or main-process shortcut, because a check that doesn't
 * traverse the real path validates nothing. See LocalAIEngine.ts's
 * runAIPipelinePreflight() docstring for the CSP incident that motivated
 * that rule specifically.
 */
const AIPipelinePreflight: React.FC<{ embedded?: boolean }> = ({ embedded }) => {
    const [running, setRunning] = useState(false);
    const [reportText, setReportText] = useState<string | null>(null);
    const [turns, setTurns] = useState<TurnTraceEntry[]>([]);
    const [copied, setCopied] = useState(false);

    const runPreflight = async () => {
        setRunning(true);
        setCopied(false);
        try {
            const result = await LocalAIEngine.runAIPipelinePreflight();
            setReportText(result.reportText);
            setTurns(LocalAIEngine.getRecentTurns());
        } catch (e: any) {
            setReportText(`Preflight itself failed to run: ${e?.message || e}`);
        } finally {
            setRunning(false);
        }
    };

    const formatTurnTrace = (entries: TurnTraceEntry[]): string => {
        if (!entries.length) return '(no turns recorded yet this session)';
        return entries.map((t, i) => {
            const when = new Date(t.timestamp).toLocaleTimeString();
            return [
                `#${i + 1} [${when}] "${t.queryPreview}"${t.voiceMode ? ' (voice)' : ''}`,
                `  provider: ${t.providerUsed}${t.preferCloud ? ' [preferCloud]' : ''}`,
                `  enrichment: ran=${t.enrichmentRan} unavailable=${t.enrichmentUnavailable} (${t.enrichMs ?? '?'}ms)`,
                `  mode=${t.mode ?? '-'} abstained=${t.abstained} sceneRelated=${t.sceneRelated ?? '-'} appHelpRelated=${t.appHelpRelated ?? '-'}`,
                `  retrieval: agreement=${t.retrievalAgreement ?? '-'} margin=${t.retrievalMargin ?? '-'} tier=${t.retrievalTier ?? '-'} hedged=${t.hedged ?? '-'}`,
                `  scene context: used=${t.usedSceneContext ?? '-'} bytes=${t.sceneContextBytes}`,
                `  localFallback=${t.usedLocalFallback}  generate=${t.generateMs ?? '?'}ms  total=${t.totalMs}ms`,
                `  contract: ${t.contractSuccess === null ? 'pending/none' : t.contractSuccess} (${t.contractLatencyMs ?? '?'}ms)`,
            ].join('\n');
        }).join('\n\n');
    };

    const fullReport = () => {
        const parts = [reportText || '(preflight not run yet)', '', '═══ TURN TRACE (last ' + turns.length + ') ═══', formatTurnTrace(turns)];
        return parts.join('\n');
    };

    const copyReport = async () => {
        const text = fullReport();
        try {
            const api = (window as any).electron?.api || (window as any).electronAPI;
            const result = await api?.copyToClipboard?.(text);
            if (result?.ok !== false) {
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
            }
        } catch { /* clipboard failure is non-fatal, button just won't confirm */ }
    };

    return (
        <div className={embedded ? '' : 'min-h-full bg-[#0b0f0b] text-slate-100 p-6'}>
            <div className="flex items-center justify-between gap-3 mb-4">
                <div>
                    <div className="text-sm font-black text-white flex items-center gap-2">
                        <Activity className="w-4 h-4 text-emerald-300" />
                        AI Pipeline Preflight
                    </div>
                    <p className="text-xs text-slate-400 mt-1">
                        Live state of Brain B, the Bridge, Blender, which provider is active, and whether Mossy's persona is actually loaded — plus the last {turns.length || '20'} turns' diagnostics.
                    </p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                        type="button"
                        onClick={runPreflight}
                        disabled={running}
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold rounded-lg text-xs flex items-center gap-2 transition-colors"
                    >
                        {running ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <PlayCircle className="w-3.5 h-3.5" />}
                        {running ? 'Running…' : 'Run Preflight'}
                    </button>
                    {reportText && (
                        <button
                            type="button"
                            onClick={copyReport}
                            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-bold rounded-lg text-xs flex items-center gap-2 transition-colors"
                        >
                            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                            {copied ? 'Copied' : 'Copy Report'}
                        </button>
                    )}
                </div>
            </div>

            {reportText && (
                <pre className="text-[11px] font-mono leading-relaxed text-slate-300 bg-black/40 border border-slate-800 rounded-lg p-4 overflow-x-auto whitespace-pre-wrap">
                    {reportText}
                </pre>
            )}

            {reportText && (
                <div className="mt-4">
                    <div className="text-xs font-black text-white mb-2">Turn Trace</div>
                    <pre className="text-[11px] font-mono leading-relaxed text-slate-300 bg-black/40 border border-slate-800 rounded-lg p-4 overflow-x-auto whitespace-pre-wrap">
                        {formatTurnTrace(turns)}
                    </pre>
                </div>
            )}

            {!reportText && !running && (
                <div className="text-xs text-slate-500 italic py-8 text-center border border-dashed border-slate-800 rounded-lg">
                    Click "Run Preflight" to check Brain B, the Bridge, Blender, the active provider, and the system instruction — all from the same code path the real app uses.
                </div>
            )}
        </div>
    );
};

export default AIPipelinePreflight;
