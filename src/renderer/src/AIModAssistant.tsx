import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mic, Send, MessageCircle, Code, Zap, Book } from 'lucide-react';
import { LocalAIEngine } from './LocalAIEngine';
import { getFullSystemInstruction } from './MossyBrain';
import { useHorizontalScroll } from './components/useHorizontalScroll';

// prefer preload API when available, otherwise fall back to in-memory engine for dev
let bridge: any = (window as any).electron?.api || (window as any).electronAPI;
try {
  if (!bridge || !bridge.aiModAssistant) {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const local = require('../../mining/aiModAssistant');
    if (!bridge) {
      bridge = { aiModAssistant: local.aiModAssistant || local.default };
    } else {
      bridge.aiModAssistant = local.aiModAssistant || local.default;
    }
  }
} catch (err) {
  // ignore - UI will still render but actions will fail gracefully
}

const AIModAssistant: React.FC = () => {
  const navigate = useNavigate();
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Array<{ role: 'user' | 'assistant'; text: string }>>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [listening, setListening] = useState(false);
  const [codePreview, setCodePreview] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [learningMode, setLearningMode] = useState(false);
  const messagesRef = useRef<HTMLDivElement | null>(null); const wheelHandler = useHorizontalScroll(messagesRef);
  useEffect(() => { messagesRef.current?.scrollTo({ top: 99999, behavior: 'smooth' }); }, [messages]);

  const send = async () => {
    if (!input.trim() || isLoading) return;
    const userText = input;
    setMessages(m => [...m, { role: 'user', text: userText }]);
    setInput('');
    setIsLoading(true);
    try {
      const systemInstruction = getFullSystemInstruction(
        'The user is working on a Fallout 4 mod. Provide concise, practical modding guidance.'
      );
      const history = messages.map(m => ({ role: m.role as 'user' | 'assistant', content: m.text }));
      const result = await LocalAIEngine.generateResponse(userText, systemInstruction, history);
      const replyText = result.content || "I'm having trouble responding right now. Please check your AI settings.";
      setMessages(m => [...m, { role: 'assistant', text: replyText }]);
    } catch (err) {
      console.error('[AIModAssistant] send failed:', err);
      setMessages(m => [...m, { role: 'assistant', text: 'Error: could not reach the AI engine. Please check your settings.' }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickAction = async (action: any) => {
    if (action.type === 'create-file') {
      try {
        if (typeof bridge?.saveFile !== 'function') {
          setMessages(m => [...m, { role: 'assistant', text: 'Desktop Bridge file-save API is unavailable. Open Runtime Hub to verify bridge connectivity.' }]);
          return;
        }
        await bridge.saveFile(action.parameters.content || '// new file', action.parameters.name || 'new.txt');
        setMessages(m => [...m, { role: 'assistant', text: `File created: ${action.parameters.name || 'new.txt'}` }]);
      } catch (err) {
        console.error('[AIModAssistant] create-file action failed:', err);
        setMessages(m => [...m, { role: 'assistant', text: 'Failed to create file. Verify bridge permissions and try again.' }]);
      }
    }
    if (action.type === 'edit-code') {
      setCodePreview(action.parameters.patch || '// patched code');
    }
    if (action.type === 'open-panel') {
      const routeMap: Record<string, string> = {
        chat: '/chat',
        vault: '/memory-vault',
        auditor: '/asset-analysis',
        scribe: '/mod-builder',
        holo: '/runtime-hub',
        bridge: '/runtime-hub',
        settings: '/settings',
        knowledge: '/knowledge-hub',
        plugins: '/plugin-tools',
        textures: '/textures',
        ck: '/ck-tools',
        packaging: '/packaging-release',
        system: '/system-hub',
      };
      const route = routeMap[action.parameters.panel] || `/${action.parameters.panel}`;
      navigate(route);
    }
  };

  const generateCode = async (prompt: string) => {
    setMessages(m => [...m, { role: 'user', text: prompt }]);
    try {
      const systemInstruction = getFullSystemInstruction(
        'Generate Papyrus script code for Fallout 4. Return only the script block followed by a brief explanation. Use proper Papyrus syntax.'
      );
      const result = await LocalAIEngine.generateResponse(prompt, systemInstruction, []);
      const responseText = result.content || 'Could not generate script. Please check your AI settings.';
      // Extract a code block if present, otherwise display the full response
      const codeMatch = responseText.match(/```[\w]*\n?([\s\S]*?)```/);
      if (codeMatch) {
        setCodePreview(codeMatch[1].trim());
        const explanation = responseText.replace(/```[\w]*\n?[\s\S]*?```/, '').trim();
        setMessages(m => [...m, { role: 'assistant', text: explanation || 'Script generated — see Code Assistant panel.' }]);
      } else {
        setCodePreview(responseText);
        setMessages(m => [...m, { role: 'assistant', text: 'Script generated — see Code Assistant panel.' }]);
      }
    } catch (err) {
      console.error('[AIModAssistant] generateCode failed:', err);
      setMessages(m => [...m, { role: 'assistant', text: 'Error generating script. Please check your AI settings.' }]);
    }
  };

  const toggleListening = async () => {
    if (!listening) {
      setListening(true);
      try { await bridge.sttStart?.(); } catch (err) { console.warn('Voice start failed', err); }
    } else {
      setListening(false);
      try { await bridge.sttStop?.(); } catch (err) { console.warn('Voice stop failed', err); }
    }
  };

  return (
    <div className="p-6 min-h-full bg-[#08110e] text-slate-100">
      <div className="max-w-6xl mx-auto grid grid-cols-3 gap-6">
        <div className="col-span-2 bg-[#07100a] border border-slate-800 rounded p-4 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <MessageCircle className="w-5 h-5 text-emerald-300" />
              <h2 className="text-lg font-semibold">AI Mod Assistant — Chat</h2>
            </div>
            <div className="flex items-center gap-2">
              <button className={`px-3 py-1 rounded text-sm ${learningMode ? 'bg-amber-600/20' : 'bg-slate-700/10'}`} onClick={() => setLearningMode(l => !l)}><Book className="w-4 h-4 mr-2 inline" />Learning</button>
              <button className={`px-3 py-1 rounded text-sm ${listening ? 'bg-rose-600/20' : 'bg-emerald-700/10'}`} onClick={toggleListening}><Mic className="w-4 h-4 mr-2 inline" />{listening ? 'Stop' : 'Voice'}</button>
            </div>
          </div>

          <div ref={messagesRef} onWheel={wheelHandler} className="flex-1 overflow-auto overflow-x-auto mb-4 space-y-3 p-2 bg-[#05100d] rounded">
            {messages.length === 0 ? <div className="text-sm text-slate-500">Start a conversation — ask for code, fixes, or smart actions.</div> : messages.map((m, i) => (
              <div key={i} className={`p-3 rounded ${m.role === 'user' ? 'bg-black/20 self-end text-right' : 'bg-slate-900/30'}`}>
                <div className="text-sm">{m.text}</div>
              </div>
            ))}
          </div>

          <div className="flex gap-3 items-center">
            <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && !e.shiftKey && send()} className="flex-1 p-2 bg-black/10 border border-slate-800 rounded text-sm" placeholder="Ask Mossy a question..." disabled={isLoading} aria-label="Chat with Mossy" />
            <button className="px-3 py-2 bg-emerald-700/10 rounded text-sm flex items-center gap-2 disabled:opacity-50" onClick={send} disabled={isLoading} aria-label="Send message to Mossy"><Send className="w-4 h-4" />{isLoading ? '...' : 'Send'}</button>
          </div>

          <div className="mt-4 p-3 bg-[#06110e] border border-slate-800 rounded text-sm">
            <div className="flex items-center justify-between mb-2">
              <div className="font-semibold">Smart Actions</div>
              <div className="text-xs text-slate-500">One-click implementations</div>
            </div>
            <div className="flex gap-2 flex-wrap">
              <button className="px-3 py-1 bg-slate-700/10 rounded text-xs" onClick={() => generateCode('Create a basic dialogue script for an NPC')}><Code className="w-3 h-3 mr-1 inline" />Generate Script</button>
              <button className="px-3 py-1 bg-slate-700/10 rounded text-xs" onClick={() => setMessages(m => [...m, { role: 'assistant', text: 'Showing inline suggestions (stub)' }])}>Inline Suggestions</button>
              <button className="px-3 py-1 bg-slate-700/10 rounded text-xs" onClick={() => setMessages(m => [...m, { role: 'assistant', text: 'Refactor preview (stub)' }])}>Refactor</button>
              <button className="px-3 py-1 bg-slate-700/10 rounded text-xs" onClick={() => setMessages(m => [...m, { role: 'assistant', text: 'Run quick fix (simulated)' }])}>Quick Fix</button>
            </div>
          </div>
        </div>

        <div className="col-span-1 bg-[#06100a] border border-slate-800 rounded p-4 flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-amber-400" />
            <h3 className="font-semibold">Code Assistant</h3>
          </div>

          <div className="text-xs text-slate-400">Inline suggestions, quick fixes, and refactoring previews appear here.</div>

          <div className="mt-2 bg-[#07120f] rounded p-2 flex-1 overflow-auto">
            {codePreview ? <pre className="text-xs whitespace-pre-wrap">{codePreview}</pre> : <div className="text-xs text-slate-500">No code preview</div>}
          </div>

          <div>
            <div className="text-xs text-slate-300 mb-2">Suggestions</div>
            <div className="flex gap-2 flex-wrap">
              {suggestions.length === 0 ? <div className="text-xs text-slate-500">No suggestions</div> : suggestions.map((s: any, i: number) => (
                <button key={i} className="px-2 py-1 bg-emerald-700/10 rounded text-xs" onClick={() => handleQuickAction(s)}>{s.text || s.type}</button>
              ))}
            </div>
          </div>

          <div className="mt-2">
            <div className="text-xs text-slate-300 mb-2">Learning Mode</div>
            {learningMode ? (
              <div className="text-xs text-slate-400">Guided tutorials & practice exercises will be shown inline.</div>
            ) : (
              <div className="text-xs text-slate-500">Off</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AIModAssistant;
