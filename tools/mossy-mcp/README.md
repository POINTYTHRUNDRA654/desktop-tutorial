# mossy-mcp

Lets Claude Code, the Claude desktop app or any MCP client use Mossy's real tools on your PC: the same tools her chat and voice use, with the same do-not-touch list and permission checks.

## Pieces

- `src/electron/mcpBridge.ts`: the main-process server. It listens on `127.0.0.1:21340` and uses a new random token every launch.
- `src/renderer/src/mcpRunner.ts`: runs each call through `executeMossyTool()`.
- `tools/mossy-mcp/server.mjs`: the MCP stdio server your AI client launches. It has no npm dependencies; Node 18 or newer is enough.

## Turn it on

1. In Mossy, open **Settings > Claude / MCP bridge**, switch it on, and restart Mossy.
2. Register the server with your client. Replace `<path>` with where this file lives. In an installed Mossy that is `resources\tools\mossy-mcp` inside the install folder.

   Claude Code:

       claude mcp add mossy -- node "<path>\server.mjs"

   Claude desktop app (`%APPDATA%\Claude\claude_desktop_config.json`):

       { "mcpServers": { "mossy": { "command": "node", "args": ["<path>\\server.mjs"] } } }

Mossy's window has to be open for her tools to run.

## Security

- The bridge only answers on `127.0.0.1`.
- Every request needs the per-launch token, which is written to `mcp-bridge.json` in Mossy's data folder and deleted when she quits.
- Requests from a web browser (anything with an `Origin` header, or a wrong `Host`) are refused.
- Switching it off in Settings and restarting Mossy closes it.
