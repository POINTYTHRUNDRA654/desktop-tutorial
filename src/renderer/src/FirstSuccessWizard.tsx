import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Activity, Wrench, Book, Brain, MessageSquare, CheckCircle2, ArrowRight } from 'lucide-react';

const CHAT_PREFILL_KEY = 'mossy_chat_prefill_v1';

const FirstSuccessWizard: React.FC = () => {
    const navigate = useNavigate();
    const [question, setQuestion] = useState('How do I build a simple quest in the Creation Kit?');

    const handlePrefillChat = () => {
        const trimmed = question.trim();
        if (trimmed) {
            localStorage.setItem(CHAT_PREFILL_KEY, trimmed);
        }
        navigate('/chat');
    };

    return (
        <div className="h-full min-h-0 flex flex-col bg-[#0f120f] text-slate-200 font-sans overflow-hidden">
            <div className="p-6 border-b border-emerald-900/30 bg-[#141814]">
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-emerald-400" /> First Success Wizard
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                    A quick path to your first win. Each step uses real tools already in Mossy.
                </p>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-4">
                <div className="bg-[#141814] border border-emerald-900/30 rounded-xl p-4 flex items-start gap-3">
                    <Activity className="w-5 h-5 text-cyan-400 mt-0.5" />
                    <div className="flex-1">
                        <div className="text-sm font-semibold text-white">1) Run a system scan</div>
                        <div className="text-xs text-slate-400 mt-1">
                            Detect installed tools so Mossy can personalize her guidance.
                        </div>
                    </div>
                    <button
                        onClick={() => navigate('/monitor')}
                        className="px-3 py-1.5 text-xs font-semibold rounded bg-slate-800 hover:bg-slate-700 text-slate-200"
                    >
                        Open System Monitor
                    </button>
                </div>

                <div className="bg-[#141814] border border-emerald-900/30 rounded-xl p-4 flex items-start gap-3">
                    <Wrench className="w-5 h-5 text-emerald-400 mt-0.5" />
                    <div className="flex-1">
                        <div className="text-sm font-semibold text-white">2) Verify your tools</div>
                        <div className="text-xs text-slate-400 mt-1">
                            Confirm key modding tools are detected and configured.
                        </div>
                    </div>
                    <button
                        onClick={() => navigate('/tool-verify')}
                        className="px-3 py-1.5 text-xs font-semibold rounded bg-slate-800 hover:bg-slate-700 text-slate-200"
                    >
                        Open Tool Verify
                    </button>
                </div>

                <div className="bg-[#141814] border border-emerald-900/30 rounded-xl p-4 flex items-start gap-3">
                    <Book className="w-5 h-5 text-amber-400 mt-0.5" />
                    <div className="flex-1">
                        <div className="text-sm font-semibold text-white">3) Index your guides</div>
                        <div className="text-xs text-slate-400 mt-1">
                            Build the knowledge index or add your own notes to the Memory Vault.
                        </div>
                        <div className="mt-3 flex flex-wrap gap-2">
                            <button
                                onClick={() => navigate('/knowledge')}
                                className="px-3 py-1.5 text-xs font-semibold rounded bg-slate-800 hover:bg-slate-700 text-slate-200"
                            >
                                Open Knowledge Search
                            </button>
                            <button
                                onClick={() => navigate('/memory-vault')}
                                className="px-3 py-1.5 text-xs font-semibold rounded bg-slate-800 hover:bg-slate-700 text-slate-200"
                            >
                                Open Memory Vault
                            </button>
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
                        <div className="mt-3 flex flex-col md:flex-row gap-2">
                            <input
                                type="text"
                                value={question}
                                onChange={(e) => setQuestion(e.target.value)}
                                className="flex-1 bg-[#0f120f] border border-emerald-900/40 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500/50"
                            />
                            <button
                                onClick={handlePrefillChat}
                                className="px-3 py-2 text-xs font-semibold rounded bg-emerald-600 hover:bg-emerald-500 text-white flex items-center gap-2"
                            >
                                <MessageSquare className="w-3.5 h-3.5" />
                                Ask in Chat
                            </button>
                        </div>
                    </div>
                </div>

                <div className="bg-[#111511] border border-emerald-900/20 rounded-xl p-4 flex items-center justify-between">
                    <div className="text-xs text-slate-400">
                        Done with the basics? Jump into advanced modules when you are ready.
                    </div>
                    <button
                        onClick={() => navigate('/roadmap')}
                        className="px-3 py-1.5 text-xs font-semibold rounded bg-slate-800 hover:bg-slate-700 text-slate-200 flex items-center gap-2"
                    >
                        Explore Roadmaps <ArrowRight className="w-3 h-3" />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default FirstSuccessWizard;
