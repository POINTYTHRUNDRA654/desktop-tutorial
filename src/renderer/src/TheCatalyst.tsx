import React, { useState } from 'react';
import { GoogleGenAI } from "@google/genai";
import { FlaskConical, Play, Plus, Trash2, Wand2, RefreshCw, Beaker, Check, AlertTriangle, Settings, ArrowRight } from 'lucide-react';

interface TestCase {
    id: string;
    variables: { key: string, value: string }[];
    status: 'idle' | 'running' | 'complete' | 'error';
    output?: string;
    temperature: number;
}

const TheCatalyst: React.FC = () => {
    // Core Prompt with Variables using {{syntax}}
    const [masterPrompt, setMasterPrompt] = useState('Write a {{tone}} product description for a {{product}} that targets {{audience}}.');
    
    // Extracted variables from the master prompt
    const [variableKeys, setVariableKeys] = useState<string[]>(['tone', 'product', 'audience']);
    
    // Test Cases
    const [testCases, setTestCases] = useState<TestCase[]>([
        { id: '1', variables: [{key: 'tone', value: 'sarcastic'}, {key: 'product', value: 'smart toaster'}, {key: 'audience', value: 'tech nerds'}], status: 'idle', temperature: 0.9 },
        { id: '2', variables: [{key: 'tone', value: 'elegant'}, {key: 'product', value: 'smart toaster'}, {key: 'audience', value: 'luxury home owners'}], status: 'idle', temperature: 0.5 },
    ]);

    const [isOptimizing, setIsOptimizing] = useState(false);

    // Update keys when prompt changes (simple regex)
    const handlePromptChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const val = e.target.value;
        setMasterPrompt(val);
        const matches = val.match(/{{\s*[\w]+\s*}}/g);
        if (matches) {
            const keys = Array.from(new Set(matches.map(m => m.replace(/[{}]/g, '').trim())));
            setVariableKeys(keys);
        } else {
            setVariableKeys([]);
        }
    };

    const addTestCase = () => {
        setTestCases([...testCases, {
            id: Date.now().toString(),
            variables: variableKeys.map(k => ({ key: k, value: '' })),
            status: 'idle',
            temperature: 0.7
        }]);
    };

    const removeTestCase = (id: string) => {
        setTestCases(testCases.filter(t => t.id !== id));
    };

    const updateVariable = (testId: string, key: string, value: string) => {
        setTestCases(prev => prev.map(t => {
            if (t.id !== testId) return t;
            // Update existing variable or add new one if key logic changed
            const existingVar = t.variables.find(v => v.key === key);
            let newVars;
            if (existingVar) {
                newVars = t.variables.map(v => v.key === key ? { ...v, value } : v);
            } else {
                newVars = [...t.variables, { key, value }];
            }
            return { ...t, variables: newVars };
        }));
    };

    const updateTemperature = (testId: string, temp: number) => {
        setTestCases(prev => prev.map(t => t.id === testId ? { ...t, temperature: temp } : t));
    };

    const runTests = async () => {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

        // Run sequential for simplicity in demo (parallel in prod)
        for (const test of testCases) {
            setTestCases(prev => prev.map(t => t.id === test.id ? { ...t, status: 'running' } : t));
            
            try {
                // Interpolate Variables
                let finalPrompt = masterPrompt;
                test.variables.forEach(v => {
                    finalPrompt = finalPrompt.replace(new RegExp(`{{\\s*${v.key}\\s*}}`, 'g'), v.value);
                });

                // If variables missing in test case but present in prompt, fill with [MISSING]
                variableKeys.forEach(k => {
                    if (!test.variables.find(v => v.key === k)) {
                        finalPrompt = finalPrompt.replace(new RegExp(`{{\\s*${k}\\s*}}`, 'g'), `[MISSING ${k}]`);
                    }
                });

                const response = await ai.models.generateContent({
                    model: 'gemini-3-flash-preview',
                    contents: finalPrompt,
                    config: {
                        temperature: test.temperature,
                    }
                });

                setTestCases(prev => prev.map(t => t.id === test.id ? { ...t, status: 'complete', output: response.text } : t));

            } catch (e) {
                setTestCases(prev => prev.map(t => t.id === test.id ? { ...t, status: 'error', output: 'Generation failed.' } : t));
            }
        }
    };

    const optimizePrompt = async () => {
        if (!masterPrompt) return;
        setIsOptimizing(true);
        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const response = await ai.models.generateContent({
                model: 'gemini-3-flash-preview',
                contents: `Act as a Prompt Engineer. Rewrite the following prompt to be more clear, concise, and effective for an LLM. 
                Keep the variable syntax {{variable}} intact.
                Original Prompt: "${masterPrompt}"
                Return ONLY the optimized prompt text.`,
            });
            setMasterPrompt(response.text.trim());
        } catch (e) {
            console.error(e);
        } finally {
            setIsOptimizing(false);
        }
    };

    return (
        <div className="h-full flex flex-col bg-[#0b121e] text-slate-200 font-sans">
            {/* Header */}
            <div className="p-6 border-b border-slate-700 bg-slate-900/80 flex justify-between items-center shadow-md z-10">
                <div>
                    <h1 className="text-2xl font-bold text-white flex items-center gap-3">
                        <FlaskConical className="w-8 h-8 text-lime-400" />
                        The Catalyst
                    </h1>
                    <p className="text-xs text-slate-400 font-mono mt-1">Prompt Engineering & A/B Testing Lab</p>
                </div>
                <button 
                    onClick={runTests}
                    className="flex items-center gap-2 px-6 py-3 bg-lime-600 hover:bg-lime-500 text-slate-900 font-bold rounded-xl shadow-[0_0_20px_rgba(132,204,22,0.3)] transition-all hover:scale-105"
                >
                    <Play className="w-5 h-5 fill-current" /> Run Experiment
                </button>
            </div>

            <div className="flex-1 flex overflow-hidden">
                
                {/* Left: Master Prompt Editor */}
                <div className="w-1/3 border-r border-slate-700 flex flex-col bg-slate-900/50">
                    <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-900">
                        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                            <Settings className="w-3 h-3" /> Master Template
                        </h3>
                        <button 
                            onClick={optimizePrompt}
                            disabled={isOptimizing}
                            className="text-xs text-lime-400 hover:text-white flex items-center gap-1 transition-colors"
                        >
                            {isOptimizing ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Wand2 className="w-3 h-3" />}
                            AI Optimize
                        </button>
                    </div>
                    <div className="flex-1 p-4 relative">
                        <textarea 
                            value={masterPrompt}
                            onChange={handlePromptChange}
                            placeholder="Enter your prompt here. Use {{variable}} to insert dynamic slots."
                            className="w-full h-full bg-slate-800/50 border border-slate-700 rounded-xl p-4 text-sm text-slate-200 focus:outline-none focus:border-lime-500/50 resize-none font-mono leading-relaxed custom-scrollbar"
                        />
                        {/* Variable Tags Overlay */}
                        <div className="absolute bottom-6 left-6 right-6 flex flex-wrap gap-2 pointer-events-none">
                            {variableKeys.map(key => (
                                <span key={key} className="px-2 py-1 bg-lime-900/30 text-lime-400 text-xs rounded border border-lime-500/30 font-mono">
                                    {`{{${key}}}`}
                                </span>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Right: Test Cases */}
                <div className="flex-1 flex flex-col bg-[#0f172a]">
                    <div className="p-4 border-b border-slate-800 bg-slate-900 flex justify-between items-center">
                        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                            <Beaker className="w-3 h-3" /> Test Matrix
                        </h3>
                        <button 
                            onClick={addTestCase}
                            className="flex items-center gap-1 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-600 rounded text-xs transition-colors"
                        >
                            <Plus className="w-3 h-3" /> Add Case
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
                        {testCases.map((test, index) => (
                            <div key={test.id} className="flex gap-4 animate-fade-in">
                                {/* Configuration Side */}
                                <div className="w-80 bg-slate-900 border border-slate-700 rounded-xl p-4 flex flex-col gap-3 shrink-0 h-fit">
                                    <div className="flex justify-between items-center mb-1">
                                        <span className="text-xs font-bold text-white bg-slate-700 px-2 py-0.5 rounded">Case {index + 1}</span>
                                        <div className="flex items-center gap-2">
                                            <span className="text-[10px] text-slate-500">Temp: {test.temperature}</span>
                                            <input 
                                                type="range" min="0" max="1" step="0.1" 
                                                value={test.temperature}
                                                onChange={(e) => updateTemperature(test.id, parseFloat(e.target.value))}
                                                className="w-16 h-1 accent-lime-500 bg-slate-700 rounded-lg appearance-none cursor-pointer"
                                            />
                                            <button onClick={() => removeTestCase(test.id)} className="text-slate-600 hover:text-red-400">
                                                <Trash2 className="w-3 h-3" />
                                            </button>
                                        </div>
                                    </div>
                                    
                                    {variableKeys.length > 0 ? (
                                        variableKeys.map(key => (
                                            <div key={key}>
                                                <label className="text-[10px] text-slate-500 uppercase font-bold mb-1 block">{key}</label>
                                                <input 
                                                    type="text" 
                                                    value={test.variables.find(v => v.key === key)?.value || ''}
                                                    onChange={(e) => updateVariable(test.id, key, e.target.value)}
                                                    className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1 text-xs text-white focus:border-lime-500 outline-none"
                                                />
                                            </div>
                                        ))
                                    ) : (
                                        <div className="text-xs text-slate-600 italic py-2">No variables in master prompt.</div>
                                    )}
                                </div>

                                {/* Output Side */}
                                <div className="flex-1 bg-black/40 border border-slate-800 rounded-xl p-4 relative min-h-[200px]">
                                    {test.status === 'running' && (
                                        <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-xl backdrop-blur-sm z-10">
                                            <RefreshCw className="w-8 h-8 text-lime-500 animate-spin" />
                                        </div>
                                    )}
                                    
                                    {test.status === 'complete' ? (
                                        <div className="prose prose-invert prose-sm max-w-none text-slate-300">
                                            {test.output?.split('\n').map((line, i) => <p key={i} className="mb-2">{line}</p>)}
                                        </div>
                                    ) : test.status === 'error' ? (
                                        <div className="flex items-center gap-2 text-red-400 text-sm h-full justify-center">
                                            <AlertTriangle className="w-4 h-4" /> Error generating response.
                                        </div>
                                    ) : (
                                        <div className="flex flex-col items-center justify-center h-full text-slate-600 gap-2">
                                            <Beaker className="w-8 h-8 opacity-20" />
                                            <span className="text-xs">Ready to synthesize</span>
                                        </div>
                                    )}
                                    
                                    {/* Copy Button */}
                                    {test.status === 'complete' && (
                                        <button 
                                            onClick={() => navigator.clipboard.writeText(test.output || '')}
                                            className="absolute top-2 right-2 p-1.5 bg-slate-800 hover:bg-white hover:text-black rounded text-slate-400 transition-colors"
                                            title="Copy Output"
                                        >
                                            <Check className="w-3 h-3" />
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TheCatalyst;