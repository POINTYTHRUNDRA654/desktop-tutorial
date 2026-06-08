import React, { useEffect, useState, useRef } from 'react';
import { Mic, Send, MessageCircle, Code, Zap, Book, Wrench, Lightbulb, ChevronRight } from 'lucide-react';
import { LocalAIEngine } from './LocalAIEngine';
import { getFullSystemInstruction } from './MossyBrain';
import { useHorizontalScroll } from './components/useHorizontalScroll';

// Preload API — dual-path for compatibility (window.electron.api or window.electronAPI)
// The `require('../../mining/aiModAssistant')` path was removed: Vite does not bundle
// raw Node require() paths and the mining module does not exist in the renderer bundle.
// All AI mod assistant capabilities are routed through LocalAIEngine and the preload API.
const bridge: any = (window as any).electron?.api || (window as any).electronAPI;

// When Generate Script is clicked, Mossy enters "script wizard" mode.
// The next user message is treated as the description of what to build.
type WizardMode = 'none' | 'awaitingScriptDescription' | 'awaitingQuickFixCode';

const AIModAssistant: React.FC = () => {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Array<{ role: 'user' | 'assistant'; text: string }>>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [listening, setListening] = useState(false);
  const [codePreview, setCodePreview] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [learningMode, setLearningMode] = useState(false);
  const [wizardMode, setWizardMode] = useState<WizardMode>('none');
  const messagesRef = useRef<HTMLDivElement | null>(null);
  const wheelHandler = useHorizontalScroll(messagesRef);
  useEffect(() => { messagesRef.current?.scrollTo({ top: 99999, behavior: 'smooth' }); }, [messages]);

  // ─── Core AI call ────────────────────────────────────────────────────────────
  const callAI = async (userText: string, systemExtra: string, useHistory = true): Promise<string> => {
    const systemInstruction = getFullSystemInstruction(systemExtra);
    const history = useHistory
      ? messages.map(m => ({ role: m.role as 'user' | 'assistant', content: m.text }))
      : [];
    const result = await LocalAIEngine.generateResponse(userText, systemInstruction, history);
    return result.content || "I'm having trouble responding right now. Please check your AI settings.";
  };

  const extractCodeBlock = (text: string): string | null => {
    const match = text.match(/```[\w]*\n?([\s\S]*?)```/);
    return match ? match[1].trim() : null;
  };

  // ─── Send (regular chat + wizard routing) ────────────────────────────────────
  const send = async () => {
    if (!input.trim() || isLoading) return;
    const userText = input.trim();
    setMessages(m => [...m, { role: 'user', text: userText }]);
    setInput('');
    setIsLoading(true);

    try {
      // If Mossy asked what to create, this message is the answer — generate the script
      if (wizardMode === 'awaitingScriptDescription') {
        setWizardMode('none');
        await generateScriptFromDescription(userText);
        return;
      }

      // If Mossy asked for broken code, this message is the code to fix
      if (wizardMode === 'awaitingQuickFixCode') {
        setWizardMode('none');
        const fixPrompt = `Find and fix any bugs or errors in this Fallout 4 Papyrus/modding code. Return the corrected version in a code block, then a short bullet list of what was fixed.\n\n${userText}`;
        const response = await callAI(fixPrompt,
          'You are Mossy, a Fallout 4 modding assistant. Fix the code the user pasted. Be precise and practical.', false);
        const code = extractCodeBlock(response);
        if (code) setCodePreview(code);
        const explanation = code ? response.replace(/```[\w]*\n?[\s\S]*?```/, '').trim() : response;
        setMessages(m => [...m, { role: 'assistant', text: explanation || 'Code fixed — see Code Assistant panel.' }]);
        return;
      }

      // Regular chat
      const response = await callAI(userText,
        'You are Mossy, a Fallout 4 modding assistant. Help the user with modding questions, Papyrus scripting, Creation Kit, mod tools, and best practices. Be practical and specific.');
      const code = extractCodeBlock(response);
      if (code) setCodePreview(code);
      setMessages(m => [...m, { role: 'assistant', text: response }]);
    } catch (err) {
      console.error('[AIModAssistant] send failed:', err);
      setMessages(m => [...m, { role: 'assistant', text: 'Error: could not reach the AI engine. Please check your settings.' }]);
    } finally {
      setIsLoading(false);
    }
  };

  // ─── Generate Script — asks first, generates after ───────────────────────────
  const startGenerateScript = () => {
    if (isLoading) return;
    setWizardMode('awaitingScriptDescription');
    const question =
      "What would you like me to create a script for? Tell me what you have in mind — for example:\n\n" +
      "• A quest script (stages, objectives, rewards)\n" +
      "• An NPC dialogue (greetings, conditions, responses)\n" +
      "• A weapon or armor mod effect\n" +
      "• A perk or ability\n" +
      "• A custom spell or magic effect\n" +
      "• A trap or environmental trigger\n" +
      "• Something else entirely\n\n" +
      "Describe what you want and I'll generate the Papyrus script for it.";
    setMessages(m => [...m, { role: 'assistant', text: question }]);
  };

  const generateScriptFromDescription = async (description: string) => {
    // already inside a try/finally from send()
    const prompt =
      `Create a complete Fallout 4 Papyrus script based on this description:\n\n${description}\n\n` +
      `Return the full script in a Papyrus code block, then a short explanation of how it works and any Creation Kit steps needed to wire it up.`;
    const response = await callAI(prompt,
      'You are Mossy, a Fallout 4 Papyrus scripting expert. Generate complete, valid Papyrus scripts with proper syntax, ScriptName declarations, properties, and event handlers. Include comments explaining key sections.', false);
    const code = extractCodeBlock(response);
    if (code) setCodePreview(code);
    const explanation = code ? response.replace(/```[\w]*\n?[\s\S]*?```/, '').trim() : response;
    setMessages(m => [...m, {
      role: 'assistant',
      text: (code ? 'Script generated — see Code Assistant panel on the right.\n\n' : '') + (explanation || '')
    }]);
  };

  // ─── Inline Suggestions — real modding advice based on conversation ───────────
  const runInlineSuggestions = async () => {
    if (isLoading) return;
    setIsLoading(true);
    try {
      const context = messages.length > 0
        ? messages.slice(-6).map(m => `${m.role === 'user' ? 'User' : 'Mossy'}: ${m.text}`).join('\n')
        : input.trim() || 'general Fallout 4 modding';
      const prompt =
        `Based on this conversation context, give the user 4 specific, actionable suggestions for their Fallout 4 modding work. ` +
        `Each suggestion should be a concrete next step, tool recommendation, or potential issue to check. ` +
        `Format as a numbered list.\n\nContext:\n${context}`;
      const response = await callAI(prompt,
        'You are Mossy, a Fallout 4 modding expert. Give practical, specific suggestions — not generic advice. Reference real tools and workflows (xEdit, CK, Bodyslide, Nifskope, etc.) where relevant.', false);
      setMessages(m => [...m, { role: 'assistant', text: response }]);

      // Clear any old navigation suggestions — they navigated away from this page
      // and left the user stuck. The AI chat response already contains the suggestions.
      setSuggestions([]);
    } catch (err) {
      console.error('[AIModAssistant] inline suggestions failed:', err);
      setMessages(m => [...m, { role: 'assistant', text: 'Could not generate suggestions. Please check AI settings.' }]);
    } finally {
      setIsLoading(false);
    }
  };

  // ─── Refactor — improve existing code ────────────────────────────────────────
  const runRefactor = async () => {
    if (isLoading) return;
    const context = codePreview?.trim();
    if (!context) {
      setMessages(m => [...m, {
        role: 'assistant',
        text: 'Refactor needs code to work with. Paste your Papyrus script in the chat or use Generate Script first, then I\'ll clean it up and improve it.'
      }]);
      return;
    }
    setIsLoading(true);
    try {
      const prompt = `Refactor and improve this Fallout 4 Papyrus script. Clean up the structure, improve variable names, add missing comments, and fix any obvious issues. Return the improved script in a code block followed by a brief summary of changes.\n\n${context}`;
      const response = await callAI(prompt,
        'You are a Fallout 4 Papyrus scripting expert. Refactor the code for clarity, correctness, and best practices. Preserve the original intent exactly.', false);
      const code = extractCodeBlock(response);
      if (code) setCodePreview(code);
      const explanation = code ? response.replace(/```[\w]*\n?[\s\S]*?```/, '').trim() : response;
      setMessages(m => [...m, { role: 'assistant', text: explanation || 'Code refactored — see Code Assistant panel.' }]);
    } catch (err) {
      console.error('[AIModAssistant] refactor failed:', err);
      setMessages(m => [...m, { role: 'assistant', text: 'Refactor failed. Please check AI settings and try again.' }]);
    } finally {
      setIsLoading(false);
    }
  };

  // ─── Quick Fix — finds and fixes bugs ────────────────────────────────────────
  const runQuickFix = async () => {
    if (isLoading) return;
    const context = codePreview?.trim();
    if (!context) {
      // Nothing to fix yet — ask the user to paste their broken code
      setWizardMode('awaitingQuickFixCode');
      setMessages(m => [...m, {
        role: 'assistant',
        text: 'Paste your broken code in the chat and I\'ll find and fix the errors for you.'
      }]);
      return;
    }
    setIsLoading(true);
    try {
      const prompt = `Find and fix any bugs, errors, or problems in this Fallout 4 Papyrus/modding code. Return the corrected version in a code block, then a checklist of exactly what was fixed and why.\n\n${context}`;
      const response = await callAI(prompt,
        'You are a Fallout 4 Papyrus debugging expert. Identify real bugs — syntax errors, missing properties, wrong event names, logic errors. Fix them precisely and explain each fix.', false);
      const code = extractCodeBlock(response);
      if (code) setCodePreview(code);
      const explanation = code ? response.replace(/```[\w]*\n?[\s\S]*?```/, '').trim() : response;
      setMessages(m => [...m, { role: 'assistant', text: explanation || 'Code fixed — see Code Assistant panel.' }]);
    } catch (err) {
      console.error('[AIModAssistant] quickfix failed:', err);
      setMessages(m => [...m, { role: 'assistant', text: 'Quick Fix failed. Please check AI settings and try again.' }]);
    } finally {
      setIsLoading(false);
    }
  };


  const toggleListening = async () => {
    // Voice commands are under bridge.voiceCommands — not bridge.sttStart/sttStop
    const voiceApi = bridge?.voiceCommands;
    if (!listening) {
      setListening(true);
      try { await voiceApi?.startListening?.(); } catch (err) { console.warn('Voice start failed', err); }
    } else {
      setListening(false);
      try { await voiceApi?.stopListening?.(); } catch (err) { console.warn('Voice stop failed', err); }
    }
  };

  // ─── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="p-6 min-h-full bg-[#08110e] text-slate-100">
      <div className="max-w-6xl mx-auto grid grid-cols-3 gap-6">

        {/* ── Left: Chat + Smart Actions ── */}
        <div className="col-span-2 bg-[#07100a] border border-slate-800 rounded p-4 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <MessageCircle className="w-5 h-5 text-emerald-300" />
              <h2 className="text-lg font-semibold">AI Mod Assistant — Chat</h2>
            </div>
            <div className="flex items-center gap-2">
              <button
                className={`px-3 py-1 rounded text-sm ${learningMode ? 'bg-amber-600/20 text-amber-300' : 'bg-slate-700/10 text-slate-400'}`}
                onClick={() => setLearningMode(l => !l)}
                title="Learning Mode: Mossy explains concepts step by step">
                <Book className="w-4 h-4 mr-2 inline" />Learning
              </button>
              <button
                className={`px-3 py-1 rounded text-sm ${listening ? 'bg-rose-600/20 text-rose-300' : 'bg-emerald-700/10 text-slate-400'}`}
                onClick={toggleListening}
                title="Voice input">
                <Mic className="w-4 h-4 mr-2 inline" />{listening ? 'Stop' : 'Voice'}
              </button>
            </div>
          </div>

          {/* Message feed */}
          <div ref={messagesRef} onWheel={wheelHandler} className="flex-1 overflow-auto mb-4 space-y-3 p-2 bg-[#05100d] rounded min-h-[200px]">
            {messages.length === 0 ? (
              <div className="text-sm text-slate-500 space-y-2">
                <p>Start a conversation — ask for code, fixes, or smart actions.</p>
                <p className="text-xs text-slate-600">Try: "How do I make an NPC follow the player?" or click <strong>Generate Script</strong> to build something from scratch.</p>
              </div>
            ) : messages.map((m, i) => (
              <div key={i} className={`p-3 rounded ${m.role === 'user' ? 'bg-emerald-900/10 border border-emerald-900/20' : 'bg-slate-900/30'}`}>
                {m.role === 'assistant' && <div className="text-xs text-emerald-400 mb-1">Mossy</div>}
                <div className="text-sm whitespace-pre-wrap">{m.text}</div>
              </div>
            ))}
            {isLoading && (
              <div className="p-3 rounded bg-slate-900/30">
                <div className="text-xs text-emerald-400 mb-1">Mossy</div>
                <div className="text-sm text-slate-500 animate-pulse">Thinking...</div>
              </div>
            )}
          </div>

          {/* Input row */}
          <div className="flex gap-3 items-center">
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !e.shiftKey && send()}
              className="flex-1 p-2 bg-black/10 border border-slate-800 rounded text-sm focus:outline-none focus:border-emerald-700"
              placeholder={
                wizardMode === 'awaitingScriptDescription' ? 'Describe what you want to create...' :
                wizardMode === 'awaitingQuickFixCode' ? 'Paste your broken code here...' :
                'Ask Mossy a question...'
              }
              disabled={isLoading}
              aria-label="Chat with Mossy"
            />
            <button
              className="px-3 py-2 bg-emerald-700/20 border border-emerald-800/30 rounded text-sm flex items-center gap-2 disabled:opacity-50 hover:bg-emerald-700/30 transition-colors"
              onClick={send}
              disabled={isLoading || !input.trim()}
              aria-label="Send message to Mossy">
              <Send className="w-4 h-4" />{isLoading ? '...' : 'Send'}
            </button>
          </div>

          {/* Smart Actions bar */}
          <div className="mt-4 p-3 bg-[#06110e] border border-slate-800 rounded text-sm">
            <div className="flex items-center justify-between mb-3">
              <div className="font-semibold text-xs text-slate-300">Smart Actions</div>
              <div className="text-xs text-slate-600">One-click implementations</div>
            </div>
            <div className="flex gap-2 flex-wrap">

              {/* Generate Script — interactive wizard */}
              <button
                className="px-3 py-2 bg-emerald-700/10 border border-emerald-900/20 rounded text-xs flex items-center gap-1 hover:bg-emerald-700/20 transition-colors disabled:opacity-50"
                onClick={startGenerateScript}
                disabled={isLoading}
                title="Mossy will ask what you want to create, then generate the Papyrus script">
                <Code className="w-3 h-3" />Generate Script
              </button>

              {/* Inline Suggestions — real advice based on context */}
              <button
                className="px-3 py-2 bg-slate-700/10 border border-slate-700/20 rounded text-xs flex items-center gap-1 hover:bg-slate-700/20 transition-colors disabled:opacity-50"
                onClick={runInlineSuggestions}
                disabled={isLoading}
                title="Get specific modding suggestions based on your current conversation">
                <Lightbulb className="w-3 h-3" />Inline Suggestions
              </button>

              {/* Refactor — clean up existing code */}
              <button
                className="px-3 py-2 bg-slate-700/10 border border-slate-700/20 rounded text-xs flex items-center gap-1 hover:bg-slate-700/20 transition-colors disabled:opacity-50"
                onClick={runRefactor}
                disabled={isLoading}
                title="Clean up and improve code that's already in the Code Assistant panel">
                <ChevronRight className="w-3 h-3" />Refactor Code
              </button>

              {/* Quick Fix — find and fix bugs */}
              <button
                className="px-3 py-2 bg-slate-700/10 border border-slate-700/20 rounded text-xs flex items-center gap-1 hover:bg-slate-700/20 transition-colors disabled:opacity-50"
                onClick={runQuickFix}
                disabled={isLoading}
                title="Find and fix bugs in your code — uses Code panel if populated, otherwise asks you to paste the broken code">
                <Wrench className="w-3 h-3" />Quick Fix
              </button>

            </div>
          </div>
        </div>

        {/* ── Right: Code Assistant ── */}
        <div className="col-span-1 bg-[#06100a] border border-slate-800 rounded p-4 flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-amber-400" />
            <h3 className="font-semibold text-sm">Code Assistant</h3>
          </div>

          <div className="text-xs text-slate-500">
            Generated scripts, refactored code, and quick fixes appear here. Use <strong>Generate Script</strong> to start building.
          </div>

          {/* Code preview */}
          <div className="bg-[#07120f] rounded p-2 flex-1 overflow-auto min-h-[120px]">
            {codePreview
              ? <pre className="text-xs whitespace-pre-wrap text-emerald-200 font-mono">{codePreview}</pre>
              : <div className="text-xs text-slate-600">No code preview yet</div>
            }
          </div>

          {/* Copy button */}
          {codePreview && (
            <button
              className="px-2 py-1 bg-slate-700/20 rounded text-xs text-slate-400 hover:bg-slate-700/40 transition-colors"
              onClick={() => navigator.clipboard?.writeText(codePreview || '')}
              title="Copy code to clipboard">
              Copy to clipboard
            </button>
          )}

          {/* Button reference */}
          <div>
            <div className="text-xs text-slate-400 mb-2">What each button does</div>
            <div className="flex flex-col gap-2 text-xs text-slate-500">
              <div><span className="text-emerald-400">Generate Script</span> — Mossy asks what you want to build, then writes the Papyrus script for it.</div>
              <div><span className="text-slate-300">Inline Suggestions</span> — Get 4 specific next-step tips based on your conversation.</div>
              <div><span className="text-slate-300">Refactor Code</span> — Clean up and improve code in this panel.</div>
              <div><span className="text-slate-300">Quick Fix</span> — Find and fix bugs. Paste broken code in chat if panel is empty.</div>
            </div>
          </div>

          {/* Learning mode */}
          <div className="mt-auto">
            <div className="text-xs text-slate-400 mb-1">Learning Mode</div>
            {learningMode ? (
              <div className="text-xs text-amber-400/80 bg-amber-900/10 rounded p-2">
                On — Mossy will explain each step as it works, so you learn while you build.
              </div>
            ) : (
              <div className="text-xs text-slate-600">Off — toggle at top to enable</div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};

export default AIModAssistant;
