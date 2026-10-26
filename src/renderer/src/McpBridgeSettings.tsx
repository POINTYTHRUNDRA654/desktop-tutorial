/**
 * Settings > Claude / MCP bridge: one switch for the optional MCP bridge
 * (src/electron/mcpBridge.ts). Off by default; takes effect on restart, which
 * is when the bridge decides whether to listen.
 */
import React, { useEffect, useState } from 'react';
import { Plug, ExternalLink } from 'lucide-react';

const api = () => (window as any).electron?.api || (window as any).electronAPI;

const McpBridgeSettings: React.FC = () => {
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [saved, setSaved] = useState('');

  useEffect(() => {
    api()?.getSettings?.().then((s: any) => setEnabled(Boolean((s?.settings ?? s)?.mcpBridgeEnabled))).catch(() => setEnabled(false));
  }, []);

  const toggle = async () => {
    const next = !enabled;
    await api()?.setSettings?.({ mcpBridgeEnabled: next });
    setEnabled(next);
    setSaved(next ? 'Turned on. Restart Mossy to open the bridge.' : 'Turned off. Restart Mossy to close the bridge.');
  };

  return (
    <div className="space-y-3 text-sm">
      <p className="text-slate-300">
        Lets Claude Code, the Claude desktop app or any MCP client use Mossy's real tools on this PC, with the same permission checks her chat uses.
        It only answers on this computer (127.0.0.1), needs a new secret token every launch, and refuses requests from web pages.
      </p>
      <label className="flex items-center gap-3 cursor-pointer select-none">
        <input type="checkbox" checked={!!enabled} disabled={enabled === null} onChange={toggle} className="w-4 h-4 accent-emerald-500" />
        <span className="flex items-center gap-1.5 text-white font-semibold"><Plug className="w-4 h-4 text-emerald-400" />Allow MCP clients to use Mossy's tools</span>
      </label>
      {saved && <div className="text-xs text-amber-300">{saved}</div>}
      <div className="text-xs text-slate-400">
        Then register the server with your client, for example:
        <code className="block mt-1 p-2 bg-slate-950 border border-slate-800 rounded text-[11px] text-slate-300 break-all">claude mcp add mossy -- node "&lt;Mossy install folder&gt;\resources\tools\mossy-mcp\server.mjs"</code>
        <a href="https://github.com/POINTYTHRUNDRA654/desktop-tutorial/blob/master/tools/mossy-mcp/README.md" target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 mt-1 text-blue-400 hover:text-blue-300"><ExternalLink className="w-3 h-3" />Full setup guide</a>
      </div>
    </div>
  );
};

export default McpBridgeSettings;
