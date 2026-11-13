/**
 * Web search only when the user asks for it.
 *
 * Mossy can search the Fallout wikis, Wikipedia and DuckDuckGo (main.ts
 * 'web-search'). That sends the search words to those sites, so it runs only
 * when the user's own message asks to go online ("search online", "look it up
 * online", ...). Before 6.0.11 two things searched without being asked: the
 * "response guard" (when the local AI said it could not go online, Mossy ran
 * the user's question as a web search anyway) and the AI's own search tools
 * (search_fallout4_wiki, scan_fallout4_live), which the model could call on
 * any turn. Both now check this module; otherwise Mossy offers to search.
 */

// Phrases that mean "go online for this". Multi-word on purpose: single words
// like 'update', 'latest' or 'scan' fire on ordinary modding questions.
export const WEB_SEARCH_TRIGGERS: readonly string[] = [
  'search for', 'look up', 'find online', 'search the web', 'search online',
  'search the internet', 'google it', "what's new online", 'find on nexus',
  'wiki page', 'fandom wiki', 'nexus mod page', 'find information online',
  'go online', 'check online', 'look it up online',
  'look online', 'real-time data', 'live data', 'live info', 'live information',
  'check the web', 'check the internet',
  'from the web', 'from the internet', 'from online', 'on the web',
  'on the internet', 'on nexus mods', 'on fandom',
  'can you search', 'can you search online', 'can you look online',
  'can you find online', 'can you check online', 'can you check the web',
  'can you check the internet', 'can you look it up',
  'are you able to search', 'are you able to look up', 'are you able to find online',
  'access the internet', 'get online', 'web search', 'internet search',
];

// 'internet' and 'online' on their own are clear enough ("go on the internet and
// check", "anything new online?").
const STANDALONE_WEB_WORDS = /\b(internet|online)\b/i;

/** True when this text asks Mossy to go online. */
export function asksToGoOnline(text: string): boolean {
  const t = String(text || '');
  const lower = t.toLowerCase();
  return WEB_SEARCH_TRIGGERS.some((kw) => lower.includes(kw)) || STANDALONE_WEB_WORDS.test(t);
}

// The user's latest message, set at the start of every chat or voice turn
// (LocalAIEngine.generateResponse). Tools called later in the same turn read it.
let lastUserText = '';
let lastUserAt = 0;
const TURN_WINDOW_MS = 10 * 60 * 1000;

export function noteUserMessage(text: string): void {
  lastUserText = String(text || '');
  lastUserAt = Date.now();
}

/** True when the user's current message asked to go online. */
export function userAskedToGoOnline(): boolean {
  return Date.now() - lastUserAt < TURN_WINDOW_MS && asksToGoOnline(lastUserText);
}

/** What Mossy says instead of searching on her own. */
export const WEB_SEARCH_OFFER =
  'I can look this up online for you on the Fallout wikis, Wikipedia or DuckDuckGo. ' +
  'Just say "search online" and I\'ll check. Your question is only sent to those sites when you ask.';
