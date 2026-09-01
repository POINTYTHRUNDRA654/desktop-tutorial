/**
 * Trims a Groq/OpenAI-style chat `messages` array to fit inside a character
 * budget, in place, mutating and returning the same array reference.
 *
 * Extracted 2026-09-01 from an inline block in main.ts's 'ai-chat-groq'
 * handler specifically so this logic is unit-testable (see
 * messageBudget.test.ts) and can never again regress silently. The original
 * inline version caused a live, user-reported bug: mid-conversation memory
 * loss, where Mossy would forget something said just one message earlier.
 *
 * Root cause of that bug: the renderer-built system prompt (messages[0])
 * routinely runs 600K-746K characters on its own -- already past any
 * reasonable budget before a single history message is counted. The old
 * history-trimming loop had no floor and ran "while over budget AND history
 * remains", so whenever the system prompt alone already exceeded the
 * budget, that loop could never satisfy its own exit condition by removing
 * history alone -- it kept removing until history was completely empty,
 * every time. The request that actually reached Groq then carried zero
 * prior turns.
 *
 * Fix: `minHistoryMessagesToKeep` puts a hard floor on how much history the
 * first pass is allowed to remove. Once that floor is hit, the second pass
 * (trim whichever message is currently largest -- almost always the system
 * prompt) takes over instead, so recent conversational context is never
 * sacrificed to shrink an oversized system prompt.
 */

export interface ChatBudgetMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface HistoryRange {
  /** Index of the first history message in `messages` (inclusive). */
  start: number;
  /** Index one past the last history message in `messages` (exclusive). */
  end: number;
}

export interface TrimMessagesToBudgetOptions {
  /** Total character budget across all messages. Conservative vs. both a 131K and a 262K token model. */
  budget?: number;
  /** History messages within `historyRange` are never trimmed below this count. */
  minHistoryMessagesToKeep?: number;
}

const DEFAULT_BUDGET = 300_000;
const DEFAULT_MIN_HISTORY_MESSAGES_TO_KEEP = 6; // last ~3 user/assistant exchanges

export function trimMessagesToBudget(
  messages: ChatBudgetMessage[],
  historyRange: HistoryRange,
  options: TrimMessagesToBudgetOptions = {},
): ChatBudgetMessage[] {
  const budget = options.budget ?? DEFAULT_BUDGET;
  const minHistoryMessagesToKeep = options.minHistoryMessagesToKeep ?? DEFAULT_MIN_HISTORY_MESSAGES_TO_KEEP;

  const totalLen = () => messages.reduce((sum, m) => sum + (m.content ? m.content.length : 0), 0);

  // Pass 1: trim conversation history, oldest first, but never below the floor.
  // This is deliberately incapable of wiping out history on its own -- see the
  // module docstring for why that guarantee is the entire point of this function.
  let historyCount = historyRange.end - historyRange.start;
  while (totalLen() > budget && historyCount > minHistoryMessagesToKeep) {
    messages.splice(historyRange.start, 1);
    historyRange.end -= 1;
    historyCount -= 1;
  }

  // Pass 2: if still over budget (almost always because the system prompt
  // itself is oversized), shrink whichever message is currently largest,
  // repeatedly, until the request fits. Not scoped to a specific message
  // index so it's correct regardless of which block is the actual offender
  // on a given turn.
  let guardIterations = 0;
  while (totalLen() > budget && guardIterations < messages.length + 1) {
    guardIterations++;
    let largestIdx = -1;
    let largestLen = 0;
    for (let i = 0; i < messages.length; i++) {
      const len = messages[i].content ? messages[i].content.length : 0;
      if (len > largestLen) { largestLen = len; largestIdx = i; }
    }
    if (largestIdx === -1 || largestLen < 1000) break; // nothing left worth trimming
    const over = totalLen() - budget;
    const keep = Math.max(500, largestLen - over - 500);
    if (keep >= largestLen) break; // trimming this message alone won't help further
    messages[largestIdx].content = messages[largestIdx].content.slice(0, keep) + '\n\n[...truncated to fit context budget...]';
  }

  return messages;
}
