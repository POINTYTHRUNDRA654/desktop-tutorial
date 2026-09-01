# Mossy Internet Access Implementation Guide

## Overview
Mossy has **full internet access** capabilities built into the application. This document explains how the system works and how to troubleshoot issues when users report that "Mossy can't access the internet."

## Architecture

### 1. Three-Layer Internet Access System

#### Layer 1: Automatic Web Search Injection (Transparent to User)
**File**: `src/renderer/src/LocalAIEngine.ts` (lines 232-281)

The system automatically detects when a user query needs web information and fetches it BEFORE the AI sees the query.

**40+ Trigger Keywords**:
- Basic: `search`, `look up`, `find`, `online`, `internet`, `browse`
- Action: `go online`, `check online`, `get online`, `access the internet`
- Explicit: `can you search`, `can you find`, `are you able to search`
- Temporal: `latest`, `recent`, `current`, `up to date`, `newest`
- Full list at `LocalAIEngine.ts:232-251`

**How It Works**:
```typescript
// 1. User types: "Can you search for info about Papyrus scripting?"
// 2. System detects "search" keyword
// 3. System calls webSearch API before AI sees the query
// 4. Results injected into system prompt as context
// 5. AI responds with real web data, never sees original limitation
```

**Console Logging**:
- `🌐 Web search triggered for query:` - Trigger detected
- `Calling webSearch with type:` - API call initiated
- `✅ Web search successful, injecting results` - Data retrieved

#### Layer 2: Response Guard Interceptor (Safety Net)
**File**: `src/renderer/src/LocalAIEngine.ts` (lines 286-309, 383-419)

If the AI somehow claims it can't access the internet despite Layer 1, this guard catches it and retries.

**21 Refusal Patterns Detected**:
```regex
/i\s+cannot\s+access\s+the\s+internet/i
/i\s+can'?t\s+access\s+the\s+internet/i
/i\s+don'?t\s+have\s+internet\s+access/i
/i\s+can'?t\s+go\s+online/i
/as\s+an?\s+(ai|language\s+model).*(cannot|can'?t).*(internet|web)/i
... and 16 more patterns
```

**Retry Flow**:
1. AI responds with text
2. Guard checks response against 21 patterns
3. If match found AND no web search was already done:
   - Fetch web results immediately
   - Rebuild system prompt with live data
   - Retry LLM call once
   - Return response with real information
4. One retry limit prevents infinite loops

**Console Logging**:
- `⚠️ RESPONSE GUARD TRIGGERED` - False refusal detected
- `Response snippet:` - What the AI said
- `Fetching web results for retry...` - Initiating fetch
- `✅ Retry successful with web results` - Success

#### Layer 3: scan_fallout4_live Tool (User-Invoked)
**File**: `src/renderer/src/MossyTools.ts` (lines 1492-1564)

When users explicitly ask Mossy to "go online" or "search the web," the AI can call this tool.

**Capabilities**:
- Searches Fallout 4 Fandom Wiki (MediaWiki API)
- Searches DuckDuckGo (Instant Answer API)
- Saves results to Knowledge Vault for persistence
- Returns formatted results with sources

**Tool Declaration**: `src/renderer/src/MossyBrain.ts:441-451`
```typescript
{
  name: 'scan_fallout4_live',
  description: '🌐 **PRIMARY INTERNET ACCESS TOOL** - Go online RIGHT NOW...',
  // Marked as primary tool with emoji and bold formatting
}
```

### 2. System Prompt Enhancements

**File**: `src/renderer/src/MossyBrain.ts` (lines 456-528)

#### Prominent Notice at Start (NEW)
Added highly visible internet capability notice at the very beginning of the system prompt:

```
🌐 **CRITICAL SYSTEM CAPABILITY**: You have FULL INTERNET ACCESS via the
`scan_fallout4_live` tool. You can search the web RIGHT NOW for any Fallout 4
information. NEVER say you cannot access the internet - this is FALSE. When users
ask for online information, IMMEDIATELY use the scan_fallout4_live tool.

═══════════════════════════════════════════════════════════
```

#### Detailed Internet Access Section (lines 480-528)
- Visual section markers with borders (`═══════`)
- Numbered instructions (1-4) on how internet access works
- List of 18 forbidden statements with ❌ markers
- 3 concrete examples with ✅ markers showing correct behavior
- Emphasis that Mossy is "NOT A BARE LLM" but a "DESKTOP APP WITH LIVE INTERNET TOOLS"

### 3. Backend Implementation

**File**: `src/electron/main.ts`

#### `web-search` Handler (lines 6335-6390)
```typescript
ipcMain.handle('web-search', async (event, query, type) => {
  // Auto-detects Fallout 4 terms and routes to wiki
  if (useWiki) {
    // Query: https://fallout.fandom.com/api.php
  } else {
    // Query: https://api.duckduckgo.com
  }
  // Returns: { success, text, source, url }
})
```

#### `browse-web` Handler (lines 6396-6411)
```typescript
ipcMain.handle('browse-web', async (event, url) => {
  // Fetch any HTTPS URL
  // Strip HTML, return plain text
  // 50KB limit for safety
})
```

**Security**:
- HTTPS only (no HTTP)
- Renderer has NO direct network access
- All web requests go through main process IPC
- contextIsolation: true, nodeIntegration: false, sandbox: true

### 4. API Exposure

**File**: `src/main/preload.ts` (lines 565-571)

```typescript
webSearch: (query, type) => ipcRenderer.invoke('web-search', query, type),
browseWeb: (url) => ipcRenderer.invoke('browse-web', url),
```

Available via `window.electron.api.webSearch()` in renderer.

---

## Troubleshooting Guide

### Issue: "Mossy keeps saying she can't access the internet"

**Step 1: Check Console Logs**

Open Developer Tools (F12) and check for:

```
✅ GOOD - Web search is working:
[LocalAIEngine] 🌐 Web search triggered for query: Can you search...
[LocalAIEngine] Calling webSearch with type: wiki
[LocalAIEngine] ✅ Web search successful, injecting results

⚠️ WARNING - Response guard needed to catch refusal:
[LocalAIEngine] ⚠️ RESPONSE GUARD TRIGGERED - AI falsely refused internet access
[LocalAIEngine] Response snippet: I cannot access the internet...
[LocalAIEngine] ✅ Retry successful with web results

❌ BAD - API not available:
[LocalAIEngine] webSearch API not available
```

**Step 2: Verify Trigger Keywords**

Test with explicit trigger phrases:
- ❌ "Tell me about Papyrus scripting" (might not trigger)
- ✅ "Search for information about Papyrus scripting" (will trigger)
- ✅ "Can you go online and find info on Papyrus?" (will trigger)
- ✅ "Look up the latest mods for Fallout 4" (will trigger)

**Step 3: Check API Configuration**

1. Verify Groq API key is configured (required for AI functionality)
2. Test network connectivity to:
   - `https://api.duckduckgo.com`
   - `https://fallout.fandom.com`
3. Check firewall/proxy settings

**Step 4: Test Web Search Directly**

Open Developer Tools Console and run:
```javascript
const result = await window.electron.api.webSearch('Fallout 4 modding', 'wiki');
console.log(result);
// Expected: { success: true, text: "...", url: "..." }
```

### Issue: Web search returns no results

**Possible Causes**:

1. **Network blocked**: Corporate firewall blocking external APIs
   - Solution: Whitelist `api.duckduckgo.com` and `fallout.fandom.com`

2. **API rate limiting**: DuckDuckGo rate limits exceeded
   - Solution: Wait 1-2 minutes, queries are cached briefly

3. **Query too generic**: Empty or very short queries
   - Solution: Be more specific (e.g., "Fallout 4 weapon modding" not just "weapons")

### Issue: Tool not being called

**Check**:

1. System prompt is being used (not overridden)
2. Tool declarations are loaded in `MossyBrain.ts:441-451`
3. Tool execution handler exists in `MossyTools.ts:1492-1564`
4. Console shows tool call attempts

**Test Tool Call Manually**:
```javascript
// In Developer Tools Console
const api = window.electron.api;
const result = await api.webSearch('test query', undefined);
console.log('Direct call result:', result);
```

---

## Implementation Timeline

### Original Implementation
- `web-search` handler: main.ts (lines 6335-6390)
- `browse-web` handler: main.ts (lines 6396-6411)
- Auto web search: LocalAIEngine.ts (lines 232-268)
- Response guard: LocalAIEngine.ts (lines 273-390)
- System prompt: MossyBrain.ts (lines 480-490)
- scan_fallout4_live tool: MossyTools.ts (lines 1492-1564)

### Recent Enhancements (2026-03-14)
1. **System Prompt Improvements**:
   - Added prominent internet notice at start of prompt (line 456)
   - Enhanced forbidden statements with visual markers (❌)
   - Added concrete usage examples (✅)
   - Upgraded tool description to "PRIMARY INTERNET ACCESS TOOL"

2. **Trigger Keyword Expansion**:
   - Added 15+ new trigger phrases
   - Total now: 40+ keywords
   - Better coverage of natural language patterns

3. **Response Guard Enhancement**:
   - Expanded from 15 to 21 refusal patterns
   - Added patterns for "as an AI/LLM" refusals
   - Added training data cutoff refusals

4. **Logging Improvements**:
   - Added detailed console logging throughout
   - Emoji markers for easy visual scanning
   - Response snippets for debugging
   - API availability checks

---

## Testing Checklist

Use these test queries to verify internet access:

### Basic Triggers
- [ ] "Can you search for information about Papyrus scripting?"
- [ ] "Look up the latest Fallout 4 mods"
- [ ] "Find information about Creation Kit"
- [ ] "Go online and check the wiki for Settlement building"

### Expected Behaviors
- [ ] Console shows "🌐 Web search triggered"
- [ ] Console shows "✅ Web search successful"
- [ ] Response includes actual web information
- [ ] Response does NOT say "I cannot access the internet"
- [ ] If AI initially refuses, response guard should retry

### Tool Usage
- [ ] "Scan the Fallout 4 wiki for Sim Settlements 2"
- [ ] Response should mention using scan_fallout4_live tool
- [ ] Results should be saved to Knowledge Vault
- [ ] Console shows vault save confirmation

### Fallback Behavior
- [ ] Without network: Should explain connection issue gracefully
- [ ] With rate limit: Should suggest retry or use cached info
- [ ] With API error: Should fall back to Knowledge Vault

---

## Configuration

No special configuration needed! Internet access is enabled by default.

**Requirements**:
- Groq API key configured (for AI functionality overall)
- Network connectivity to public APIs
- No special permissions or API keys for web search

**Optional**:
- Nexus Mods API key (for mod browsing, separate feature)

---

## Future Enhancements

Potential improvements if issues persist:

1. **Add direct system prompt injection**: Before every query, inject "REMINDER: You have internet access via scan_fallout4_live"
2. **Tool forcing**: Auto-call scan_fallout4_live for certain query patterns
3. **Response filtering**: Strip out refusal patterns entirely before showing to user
4. **Capability probe**: Have AI confirm internet access at session start
5. **Alternative search engines**: Add Brave Search, Bing, etc. as fallbacks

---

## Support

If users still report internet access issues after these enhancements:

1. Ask for browser console logs (F12 → Console tab)
2. Check network connectivity to external APIs
3. Verify Groq API key is configured and working
4. Test web search handler directly via console
5. Review recent system prompt changes

The three-layer approach (auto-injection + response guard + tool) should catch virtually all scenarios where the AI tries to refuse internet access.
