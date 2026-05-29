import React, { useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Code, Upload, AlertTriangle, CheckCircle2, XCircle, Info, FileCode, Zap } from 'lucide-react';
import { openExternal } from './utils/openExternal';

// ============================================================================
// PAPYRUS SCRIPT ANALYZER — Real static analysis, no simulation delay
// Checks 20+ Papyrus-specific patterns: syntax, performance, FO4 best practices
// ============================================================================

interface AnalysisIssue {
    line: number;
    severity: 'error' | 'warning' | 'info';
    message: string;
    suggestion?: string;
}

interface AnalysisResult {
    scriptName: string;
    extends: string;
    properties: string[];
    events: string[];
    functions: string[];
    issues: AnalysisIssue[];
    lineCount: number;
    hasOnInit: boolean;
    hasSEQWarning: boolean;
}

type ScriptAnalyzerProps = { embedded?: boolean };

// ── Core analysis engine ─────────────────────────────────────────────────────

function analyzePapyrus(scriptContent: string): AnalysisResult {
    const lines = scriptContent.split('\n');
    const issues: AnalysisIssue[] = [];
    let scriptName = '';
    let extendsName = 'Form';
    const properties: string[] = [];
    const events: string[] = [];
    const functions: string[] = [];
    let hasOnInit = false;
    let onInitCallsParent = false;
    let hasSEQWarning = false;

    // Block depth tracking for EndIf / EndWhile / EndFunction / EndEvent
    const blockStack: { type: string; line: number }[] = [];
    let inFunction = false;
    let inEvent = false;
    let functionLineCount = 0;
    let inWhile = false;
    let whileVars: string[] = [];
    let currentFunctionName = '';

    // Pass 1 — line-by-line analysis
    lines.forEach((rawLine, idx) => {
        const lineNum = idx + 1;
        const line = rawLine.trim();
        const lower = line.toLowerCase();

        // Skip blank lines and pure comments
        if (!line || line.startsWith(';')) return;

        // Strip inline comments for keyword matching
        const noComment = line.replace(/;.*$/, '').trim();
        const lowerNoComment = noComment.toLowerCase();

        // ── ScriptName ──
        const scriptNameMatch = noComment.match(/^scriptname\s+(\w+)(?:\s+extends\s+(\w+))?/i);
        if (scriptNameMatch) {
            scriptName = scriptNameMatch[1];
            extendsName = scriptNameMatch[2] || 'Form';
        }

        // ── Properties ──
        const propMatch = noComment.match(/^(\w+)\s+property\s+(\w+)/i);
        if (propMatch) {
            const propDecl = `${propMatch[1]} ${propMatch[2]}`;
            properties.push(propDecl);

            // Property without Auto and no EndProperty block
            if (!/\bauto\b/i.test(noComment) && !/\bcondition\b/i.test(noComment)) {
                // Check for EndProperty within a few lines
                const hasEnd = lines.slice(idx + 1, idx + 10).some(l => /endproperty/i.test(l));
                if (!hasEnd) {
                    issues.push({
                        line: lineNum,
                        severity: 'warning',
                        message: `Property "${propMatch[2]}" has neither Auto nor an EndProperty block.`,
                        suggestion: 'Add "Auto" keyword, or supply matching EndProperty with getter/setter functions.',
                    });
                }
            }

            // Property not prefixed with type noun (common FO4 convention)
            if (!/^(Actor|Quest|Form|ObjectReference|Location|Cell|WorldSpace|Faction|MiscObject|Weapon|Armor|Keyword|Sound|Activator|Container|Message|Idle|Spell|Perk|Package|Race|LeveledItem|Int|Float|Bool|String|Var)\b/i.test(noComment)) {
                // Don't warn — just stylistic
            }
        }

        // ── Events ──
        const eventMatch = noComment.match(/^event\s+(\w+)/i);
        if (eventMatch) {
            events.push(eventMatch[1]);
            inEvent = true;
            blockStack.push({ type: 'event', line: lineNum });
            if (eventMatch[1].toLowerCase() === 'oninit') {
                hasOnInit = true;
            }
        }
        if (/^endevent\b/i.test(noComment)) {
            if (blockStack.length && blockStack[blockStack.length - 1].type === 'event') {
                blockStack.pop();
            } else {
                issues.push({ line: lineNum, severity: 'error', message: 'EndEvent without matching Event declaration.', suggestion: 'Ensure every EndEvent has a corresponding Event block above it.' });
            }
            inEvent = false;
        }

        // ── Functions ──
        const funcMatch = noComment.match(/^(?:(?:bool|int|float|string|form|actor|objectreference|quest|var|none)\s+)?function\s+(\w+)/i);
        if (funcMatch) {
            functions.push(funcMatch[1]);
            currentFunctionName = funcMatch[1];
            inFunction = true;
            functionLineCount = 0;
            blockStack.push({ type: 'function', line: lineNum });
        }
        if (/^endfunction\b/i.test(noComment)) {
            if (functionLineCount > 80) {
                issues.push({
                    line: lineNum,
                    severity: 'info',
                    message: `Function "${currentFunctionName}" is ${functionLineCount} lines long.`,
                    suggestion: 'Consider splitting large functions into smaller helpers. Papyrus has a stack depth limit and long functions are harder to debug.',
                });
            }
            if (blockStack.length && blockStack[blockStack.length - 1].type === 'function') {
                blockStack.pop();
            } else {
                issues.push({ line: lineNum, severity: 'error', message: 'EndFunction without matching Function declaration.' });
            }
            inFunction = false;
            functionLineCount = 0;
        }
        if (inFunction) functionLineCount++;

        // ── If / EndIf ──
        if (/^if\b/i.test(lowerNoComment)) blockStack.push({ type: 'if', line: lineNum });
        if (/^endif\b/i.test(lowerNoComment)) {
            if (blockStack.length && blockStack[blockStack.length - 1].type === 'if') {
                blockStack.pop();
            } else {
                issues.push({ line: lineNum, severity: 'error', message: 'EndIf without matching If.', suggestion: 'Check your If / ElseIf / Else / EndIf nesting.' });
            }
        }

        // ── While / EndWhile ──
        if (/^while\b/i.test(lowerNoComment)) {
            inWhile = true;
            whileVars = [];
            blockStack.push({ type: 'while', line: lineNum });

            // Detect while(true) — infinite loop risk
            if (/while\s*\(\s*true\s*\)/i.test(noComment)) {
                issues.push({
                    line: lineNum,
                    severity: 'warning',
                    message: 'while(True) detected — potential infinite loop.',
                    suggestion: 'Ensure a break condition exists, or use RegisterForSingleUpdate for repeating tasks instead.',
                });
            }
        }
        if (/^endwhile\b/i.test(lowerNoComment)) {
            if (blockStack.length && blockStack[blockStack.length - 1].type === 'while') {
                blockStack.pop();
            } else {
                issues.push({ line: lineNum, severity: 'error', message: 'EndWhile without matching While.', suggestion: 'Check your While / EndWhile nesting.' });
            }
            inWhile = false;
            whileVars = [];
        }

        // Detect loop variable not modified (simple heuristic)
        if (inWhile) {
            const assignMatch = noComment.match(/(\w+)\s*[+\-*]?=/);
            if (assignMatch) whileVars.push(assignMatch[1]);
        }

        // ── Performance: Utility.Wait() ──
        if (/\bUtility\.Wait\s*\(/i.test(noComment)) {
            issues.push({
                line: lineNum,
                severity: 'warning',
                message: 'Utility.Wait() blocks the Papyrus thread stack until it resolves.',
                suggestion: 'Replace with RegisterForSingleUpdate(delay) and handle logic in OnUpdate(). Wait() in loops or high-frequency events causes Papyrus stack stalls.',
            });
        }

        // ── Performance: GetDistance() in If condition ──
        if (/\bGetDistance\s*\(/i.test(noComment) && /^if\b/i.test(lowerNoComment)) {
            issues.push({
                line: lineNum,
                severity: 'warning',
                message: 'GetDistance() called directly in an If condition.',
                suggestion: 'Cache the result in a Float variable first. GetDistance() is moderately expensive and should not be called repeatedly in tight conditions.',
            });
        }

        // ── Performance: string concatenation in loops ──
        if (inWhile && /\+\s*"/.test(noComment)) {
            issues.push({
                line: lineNum,
                severity: 'warning',
                message: 'String concatenation inside a While loop.',
                suggestion: 'Build strings outside loops where possible. Papyrus string operations allocate new objects and can stress the garbage collector.',
            });
        }

        // ── Performance: Debug.Trace in production events ──
        if (/\bDebug\.Trace\s*\(/i.test(noComment) && (inEvent || inFunction)) {
            issues.push({
                line: lineNum,
                severity: 'info',
                message: 'Debug.Trace() present — disable or guard for release builds.',
                suggestion: 'Wrap with a conditional property: "If bDebugMode\\n  Debug.Trace(...)\\nEndIf". Excessive tracing noticeably impacts Papyrus performance.',
            });
        }

        // ── Nested OnActivate ──
        if (/\bOnActivate\b/i.test(noComment) && /event/i.test(lowerNoComment)) {
            if (!noComment.match(/^event\s+onactivate/i)) {
                issues.push({
                    line: lineNum,
                    severity: 'info',
                    message: 'OnActivate referenced inside another block.',
                    suggestion: 'Ensure you are not calling OnActivate() directly — it is an event, not a callable function.',
                });
            }
        }

        // ── OnInit: Parent.OnInit() ──
        if (hasOnInit && lower.includes('parent.oninit')) {
            onInitCallsParent = true;
        }

        // ── RegisterForSingleUpdate with 0 delay ──
        if (/RegisterForSingleUpdate\s*\(\s*0\s*\)/i.test(noComment) && (inEvent || inFunction)) {
            issues.push({
                line: lineNum,
                severity: 'info',
                message: 'RegisterForSingleUpdate(0) fires on the very next frame.',
                suggestion: 'A delay of 0 is valid for deferred init but can cause update storms if many scripts do this simultaneously. Use a small delay (0.1–0.5s) where possible.',
            });
        }

        // ── None comparison ──
        if (/==\s*none\b|!=\s*none\b/i.test(noComment) && /\bdebug\./i.test(lower)) {
            // Debug calls without None check — not a direct issue, but note it
        }

        // ── Self.GetFormID() — expensive when logged frequently ──
        if (/\bGetFormID\s*\(\s*\)/i.test(noComment) && /Debug\.Trace/i.test(noComment)) {
            issues.push({
                line: lineNum,
                severity: 'info',
                message: 'GetFormID() called inside a Debug.Trace.',
                suggestion: 'Cache the FormID once in a variable rather than calling it every trace.',
            });
        }

        // ── Comparing string to "" — use .Length == 0 instead ──
        if (/==\s*""\s*|!=\s*""/.test(noComment)) {
            issues.push({
                line: lineNum,
                severity: 'info',
                message: 'Comparing string to empty string literal "".',
                suggestion: 'Use myString.Length == 0 (or != 0) instead — more idiomatic Papyrus and avoids potential string allocation.',
            });
        }

        // ── Utility.GetCurrentRealTime used for long delays ──
        if (/Utility\.GetCurrentRealTime/i.test(noComment)) {
            issues.push({
                line: lineNum,
                severity: 'info',
                message: 'Utility.GetCurrentRealTime() returns wall-clock seconds, not game time.',
                suggestion: 'Use Game.GetRealHoursPassed() × 3600 for longer in-game elapsed time. GetCurrentRealTime() resets on load.',
            });
        }

        // ── Game.GetPlayer() stored without null check ──
        if (/Game\.GetPlayer\s*\(\s*\)/i.test(noComment) && /^\s*(actor|objectreference)\s+/i.test(noComment)) {
            // Storing player ref — good practice but note it's never None in FO4
        }

        // ── akActionRef == Game.GetPlayer() — correct pattern ──
        // (no issue to flag here)

        // ── ModEvent.Create without handle check ──
        if (/ModEvent\.Create\s*\(/i.test(noComment)) {
            const nextLines = lines.slice(idx + 1, idx + 5).map(l => l.trim().toLowerCase());
            const checksHandle = nextLines.some(l => /\bif\b.*handle/.test(l) || /\bif\s+\w+handle/.test(l));
            if (!checksHandle) {
                issues.push({
                    line: lineNum,
                    severity: 'warning',
                    message: 'ModEvent.Create() result not checked before use.',
                    suggestion: 'ModEvent.Create() can return 0 if the event system is unavailable. Always check: "If iHandle\\n  ModEvent.Send(iHandle)\\nEndIf".',
                });
            }
        }

        // ── AddForm on leveled list without null check ──
        if (/\.AddForm\s*\(/i.test(noComment) && !/if\s/i.test(lowerNoComment)) {
            // Mild: just ensure it isn't inside a null check further up — heuristic only, skip for now
        }

        // ── Actor.PlaceAtMe on a None reference ──
        if (/\.PlaceAtMe\s*\(/i.test(noComment)) {
            issues.push({
                line: lineNum,
                severity: 'info',
                message: 'PlaceAtMe() can crash if called on a None reference or during cell load transitions.',
                suggestion: 'Guard with: "If akRef != None && akRef.Is3DLoaded()\\n  akRef.PlaceAtMe(...)\\nEndIf".',
            });
        }

        // ── Deprecated: GetActorBase().GetVoiceType() ──
        if (/GetActorBase\s*\(\s*\)\.GetVoiceType/i.test(noComment)) {
            issues.push({
                line: lineNum,
                severity: 'info',
                message: 'GetActorBase().GetVoiceType() — ensure compatible with FO4 Next-Gen.',
                suggestion: 'This call is valid but behavior changed slightly in 1.10.980+. Test on both legacy and NG builds.',
            });
        }
    }); // end forEach

    // ── Post-pass checks ──

    if (!scriptName) {
        issues.push({
            line: 1,
            severity: 'error',
            message: 'No ScriptName declaration found.',
            suggestion: 'Every Papyrus script must begin with: ScriptName MyScriptName extends SomeType',
        });
    }

    if (hasOnInit && !onInitCallsParent) {
        const onInitLine = lines.findIndex(l => /\bevent\s+oninit\b/i.test(l.trim())) + 1;
        issues.push({
            line: onInitLine || 1,
            severity: 'warning',
            message: 'OnInit event does not call Parent.OnInit().',
            suggestion: 'Add "Parent.OnInit()" as the first line of your OnInit event to ensure inherited initialization runs.',
        });
    }

    // Quest script without SEQ warning
    if (extendsName.toLowerCase() === 'quest') {
        hasSEQWarning = true;
        const hasStartGameEnabled = scriptContent.toLowerCase().includes('startgameenabled') || scriptContent.includes('OnInit');
        issues.push({
            line: 1,
            severity: 'info',
            message: 'This script extends Quest. Remember to generate and include the .seq file.',
            suggestion: 'Quest SEQ files (Data/Seq/) make the quest Start-Game-Enabled. Without the .seq, the quest never initializes. Generate via CK: File → Generate Quest Stage SEQ.',
        });
    }

    // Unclosed blocks
    blockStack.forEach(block => {
        issues.push({
            line: block.line,
            severity: 'error',
            message: `Unclosed ${block.type} block starting at line ${block.line}.`,
            suggestion: `Add the matching End${block.type.charAt(0).toUpperCase() + block.type.slice(1)} to close this block.`,
        });
    });

    return {
        scriptName,
        extends: extendsName,
        properties,
        events,
        functions,
        issues,
        lineCount: lines.length,
        hasOnInit,
        hasSEQWarning,
    };
}

// ── Component ────────────────────────────────────────────────────────────────

export const ScriptAnalyzer: React.FC<ScriptAnalyzerProps> = ({ embedded = false }) => {
    const [scriptContent, setScriptContent] = useState('');
    const [fileName, setFileName] = useState('');
    const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);

    const openUrl = (url: string) => void openExternal(url);

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file && file.name.endsWith('.psc')) {
            setFileName(file.name);
            const reader = new FileReader();
            reader.onload = ev => {
                const text = ev.target?.result as string;
                setScriptContent(text);
                // Auto-analyze on upload
                setAnalysis(analyzePapyrus(text));
            };
            reader.readAsText(file);
        }
    };

    const runAnalysis = useCallback(() => {
        if (!scriptContent.trim()) return;
        setAnalysis(analyzePapyrus(scriptContent));
    }, [scriptContent]);

    const getSeverityIcon = (severity: string) => {
        switch (severity) {
            case 'error':   return <XCircle className="w-4 h-4 text-red-500 shrink-0" />;
            case 'warning': return <AlertTriangle className="w-4 h-4 text-yellow-500 shrink-0" />;
            default:        return <Info className="w-4 h-4 text-blue-400 shrink-0" />;
        }
    };

    const getSeverityBorder = (severity: string) => {
        switch (severity) {
            case 'error':   return 'border-red-500/40 bg-red-900/10';
            case 'warning': return 'border-yellow-500/40 bg-yellow-900/10';
            default:        return 'border-blue-500/30 bg-blue-900/10';
        }
    };

    const errorCount   = analysis?.issues.filter(i => i.severity === 'error').length ?? 0;
    const warningCount = analysis?.issues.filter(i => i.severity === 'warning').length ?? 0;
    const infoCount    = analysis?.issues.filter(i => i.severity === 'info').length ?? 0;

    const wrapper = (children: React.ReactNode) => embedded ? (
        <div className="space-y-4">{children}</div>
    ) : (
        <div className="min-h-screen bg-[#0b0f0b] text-slate-100 p-6 md:p-10">
            <div className="max-w-5xl mx-auto space-y-6">{children}</div>
        </div>
    );

    return wrapper(
        <>
            {!embedded && (
                <div className="flex flex-col gap-2">
                    <div className="text-[10px] font-mono tracking-[0.3em] text-emerald-400/70 uppercase">Mossy Dev — Analyzer</div>
                    <h1 className="text-3xl font-black text-white">Papyrus Script Analyzer</h1>
                    <p className="text-sm text-slate-300 max-w-2xl">Paste or upload a .psc file for instant static analysis — errors, warnings, performance patterns, and FO4-specific best practices.</p>
                </div>
            )}

            {/* Input area */}
            <div className="space-y-3">
                <div className="flex items-center gap-3 flex-wrap">
                    <label className="flex items-center gap-2 cursor-pointer px-3 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-xs font-bold text-slate-200 transition-colors">
                        <Upload className="w-4 h-4" />
                        Upload .psc File
                        <input type="file" accept=".psc" className="hidden" onChange={handleFileUpload} />
                    </label>
                    {fileName && <span className="text-xs text-slate-400 font-mono">{fileName}</span>}
                    {analysis && (
                        <div className="flex gap-2 ml-auto flex-wrap">
                            {errorCount > 0   && <span className="px-2 py-0.5 bg-red-900/40 border border-red-700/50 text-red-300 text-[11px] font-bold rounded">{errorCount} error{errorCount !== 1 ? 's' : ''}</span>}
                            {warningCount > 0 && <span className="px-2 py-0.5 bg-yellow-900/40 border border-yellow-700/50 text-yellow-300 text-[11px] font-bold rounded">{warningCount} warning{warningCount !== 1 ? 's' : ''}</span>}
                            {infoCount > 0    && <span className="px-2 py-0.5 bg-blue-900/40 border border-blue-700/50 text-blue-300 text-[11px] font-bold rounded">{infoCount} note{infoCount !== 1 ? 's' : ''}</span>}
                            {analysis.issues.length === 0 && <span className="px-2 py-0.5 bg-emerald-900/40 border border-emerald-700/50 text-emerald-300 text-[11px] font-bold rounded">✓ No issues found</span>}
                        </div>
                    )}
                </div>

                <textarea
                    value={scriptContent}
                    onChange={e => setScriptContent(e.target.value)}
                    className="w-full h-48 bg-[#0a0e0a] border border-slate-700 rounded-lg p-3 font-mono text-xs text-slate-300 resize-y focus:outline-none focus:border-emerald-500"
                    placeholder={`Paste your Papyrus script here (.psc) or upload above…\n\nExample:\nScriptName MyDoorScript extends ObjectReference\n\nEvent OnActivate(ObjectReference akActionRef)\n    If akActionRef == Game.GetPlayer()\n        Debug.Notification("Hello!")\n    EndIf\nEndEvent`}
                    spellCheck={false}
                />

                <button
                    onClick={runAnalysis}
                    disabled={!scriptContent.trim()}
                    className="flex items-center gap-2 px-4 py-2 bg-emerald-700 hover:bg-emerald-600 text-white rounded-lg text-sm font-bold transition-colors disabled:opacity-40"
                >
                    <Zap className="w-4 h-4" />
                    Analyze Script
                </button>
            </div>

            {/* Results */}
            {analysis && (
                <div className="space-y-4">
                    {/* Script summary */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        {[
                            { label: 'ScriptName', value: analysis.scriptName || '(missing)' },
                            { label: 'Extends', value: analysis.extends },
                            { label: 'Events', value: analysis.events.length },
                            { label: 'Functions', value: analysis.functions.length },
                        ].map(stat => (
                            <div key={stat.label} className="bg-slate-900/50 border border-slate-800 rounded-lg p-3">
                                <div className="text-[10px] text-slate-600 uppercase tracking-wider mb-0.5">{stat.label}</div>
                                <div className="text-sm font-bold text-white font-mono truncate">{String(stat.value)}</div>
                            </div>
                        ))}
                    </div>

                    {analysis.properties.length > 0 && (
                        <div>
                            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">Properties ({analysis.properties.length})</div>
                            <div className="flex flex-wrap gap-1">
                                {analysis.properties.map((p, i) => (
                                    <span key={i} className="px-2 py-0.5 bg-slate-800 text-[11px] text-slate-400 rounded font-mono">{p}</span>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Issues list — sorted: errors first, then warnings, then info */}
                    {analysis.issues.length === 0 ? (
                        <div className="flex items-center gap-3 p-4 bg-emerald-900/20 border border-emerald-700/40 rounded-lg">
                            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                            <div>
                                <div className="text-sm font-bold text-emerald-300">No issues detected</div>
                                <div className="text-xs text-slate-400">Script passed all {20}+ checks — looking good, Architect.</div>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Analysis Results ({analysis.issues.length} issue{analysis.issues.length !== 1 ? 's' : ''})</div>
                            {[...analysis.issues]
                                .sort((a, b) => {
                                    const order = { error: 0, warning: 1, info: 2 };
                                    return order[a.severity] - order[b.severity];
                                })
                                .map((issue, i) => (
                                <div key={i} className={`border rounded-lg p-3 ${getSeverityBorder(issue.severity)}`}>
                                    <div className="flex items-start gap-2">
                                        {getSeverityIcon(issue.severity)}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                                                <span className={`text-[10px] font-bold uppercase ${issue.severity === 'error' ? 'text-red-400' : issue.severity === 'warning' ? 'text-yellow-400' : 'text-blue-400'}`}>
                                                    {issue.severity}
                                                </span>
                                                {issue.line > 0 && (
                                                    <span className="text-[10px] text-slate-600 font-mono">Line {issue.line}</span>
                                                )}
                                            </div>
                                            <p className="text-sm text-white font-medium mb-1">{issue.message}</p>
                                            {issue.suggestion && (
                                                <p className="text-[11px] text-slate-400 leading-relaxed">{issue.suggestion}</p>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* External links */}
                    <div className="pt-2 border-t border-slate-800 flex flex-wrap gap-2">
                        <button
                            onClick={() => openUrl('https://www.creationkit.com/fallout4/index.php?title=Category:Papyrus')}
                            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[11px] font-bold border border-slate-700 transition-all"
                        >
                            Papyrus Wiki
                        </button>
                        <button
                            onClick={() => openUrl('https://www.creationkit.com/fallout4/index.php?title=Papyrus_Introduction')}
                            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[11px] font-bold border border-slate-700 transition-all"
                        >
                            Papyrus Introduction
                        </button>
                    </div>
                </div>
            )}
        </>
    );
};

export default ScriptAnalyzer;
