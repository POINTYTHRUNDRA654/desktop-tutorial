import React from 'react';
import { Link } from 'react-router-dom';
import { Activity, Wrench, Book, Brain, MessageSquare, CheckCircle2 } from 'lucide-react';

const FirstSuccessWizard: React.FC = () => {
    const exampleQuestion = 'How do I build a simple quest in the Creation Kit?';

    return (
        <div className="h-full min-h-0 flex flex-col bg-[#0f120f] text-slate-200 font-sans overflow-hidden">
            <div className="p-6 border-b border-emerald-900/30 bg-[#141814]">
                <div className="flex items-center justify-between gap-4">
                    <div>
                        <h2 className="text-xl font-bold text-white flex items-center gap-2">
                            <CheckCircle2 className="w-5 h-5 text-emerald-400" /> First Success Wizard
                        </h2>
                        <p className="text-xs text-slate-400 mt-1">
                            A quick path to your first win. Each step uses real tools already in Mossy.
                        </p>
                    </div>
                    <Link
                        to="/reference"
                        className="px-3 py-2 border border-emerald-500/30 text-[10px] font-black uppercase tracking-widest text-emerald-300 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 transition-colors"
                    >
                        Help
                    </Link>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-4">
                <div className="bg-[#141814] border border-emerald-900/30 rounded-xl p-4 flex items-start gap-3">
                    <Activity className="w-5 h-5 text-cyan-400 mt-0.5" />
                    <div className="flex-1">
                        <div className="text-sm font-semibold text-white">1) Run a system scan</div>
                        <div className="text-xs text-slate-400 mt-1">
                            Detect installed tools so Mossy can personalize her guidance.
                        </div>
                        <div className="text-[11px] text-slate-500 mt-2">
                            Open the System Monitor from the sidebar and run the scan once.
                        </div>
                    </div>
                </div>

                <div className="bg-[#141814] border border-emerald-900/30 rounded-xl p-4 flex items-start gap-3">
                    <Wrench className="w-5 h-5 text-emerald-400 mt-0.5" />
                    <div className="flex-1">
                        <div className="text-sm font-semibold text-white">2) Verify your tools</div>
                        <div className="text-xs text-slate-400 mt-1">
                            Confirm key modding tools are detected and configured.
                        </div>
                        <div className="text-[11px] text-slate-500 mt-2">
                            Use the Tool Verify page to confirm paths and versions.
                        </div>
                    </div>
                </div>

                <div className="bg-[#141814] border border-emerald-900/30 rounded-xl p-4 flex items-start gap-3">
                    <Book className="w-5 h-5 text-amber-400 mt-0.5" />
                    <div className="flex-1">
                        <div className="text-sm font-semibold text-white">3) Index your guides</div>
                        <div className="text-xs text-slate-400 mt-1">
                            Build the knowledge index or add your own notes to the Memory Vault.
                        </div>
                        <div className="text-[11px] text-slate-500 mt-2">
                            Use Knowledge Search to review built-in docs, then add your own notes to Memory Vault.
                        </div>
                    </div>
                </div>

                <div className="bg-[#141814] border border-emerald-900/30 rounded-xl p-4 flex items-start gap-3">
                    <Brain className="w-5 h-5 text-emerald-400 mt-0.5" />
                    <div className="flex-1">
                        <div className="text-sm font-semibold text-white">4) Ask your first question</div>
                        <div className="text-xs text-slate-400 mt-1">
                            Mossy will use your scans and knowledge vault to answer precisely.
                        </div>
                        <div className="mt-3 flex items-center gap-2 text-xs text-slate-300 bg-[#0f120f] border border-emerald-900/40 rounded-lg px-3 py-2">
                            <MessageSquare className="w-3.5 h-3.5 text-emerald-400" />
                            <span className="font-semibold text-slate-200">Example:</span>
                            <span className="text-slate-400">{exampleQuestion}</span>
                        </div>
                    </div>
                </div>

                <div className="bg-[#111511] border border-emerald-900/20 rounded-xl p-4">
                    <div className="text-xs text-slate-400">
                        Done with the basics? Explore advanced modules when you are ready using the sidebar.
                    </div>
                </div>
            </div>
        </div>
    );
};

export default FirstSuccessWizard;
