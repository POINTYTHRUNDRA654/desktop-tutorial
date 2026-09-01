/**
 * Regression coverage for the 2026-09-01 mid-conversation memory loss bug.
 *
 * Live symptom (reported by the user, reproduced live during a QA pass):
 * Mossy would re-ask a question ("which Fallout 4 version are you running?")
 * immediately after already being told the answer one message earlier.
 *
 * Root cause: the budget-trimming pass in main.ts's 'ai-chat-groq' handler
 * trimmed conversation history with no floor. Because the renderer-built
 * system prompt routinely runs 600K-746K characters on its own -- already
 * past the 300K budget before any history is counted -- the old loop could
 * never satisfy its own exit condition by removing history alone, so it
 * silently deleted the entire history array every time.
 *
 * This test file exists so that bug can never reappear silently: any change
 * to trimMessagesToBudget that reintroduces the "history can be wiped out
 * while the system prompt is still untouched" behavior should fail here.
 */

import { describe, it, expect } from 'vitest';
import { trimMessagesToBudget, type ChatBudgetMessage } from '../messageBudget';

function buildTurn(n: number): ChatBudgetMessage[] {
  return [
    { role: 'user', content: `User turn ${n}` },
    { role: 'assistant', content: `Assistant reply ${n}` },
  ];
}

describe('trimMessagesToBudget', () => {
  it('never drops history below the floor, even when the system prompt alone exceeds the budget', () => {
    // Reproduces the exact live scenario: a system prompt far bigger than the
    // budget (measured live at 600K-746K chars), plus a normal-length
    // conversation history and final query.
    const oversizedSystemPrompt = 'x'.repeat(700_000);
    const history: ChatBudgetMessage[] = [
      ...buildTurn(1),
      ...buildTurn(2),
      ...buildTurn(3),
      ...buildTurn(4),
    ]; // 8 messages = 4 exchanges
    const messages: ChatBudgetMessage[] = [
      { role: 'system', content: oversizedSystemPrompt },
      ...history,
      { role: 'user', content: 'Yes continue - show me the actual code.' },
    ];

    const result = trimMessagesToBudget(
      messages,
      { start: 1, end: 1 + history.length },
      { budget: 300_000, minHistoryMessagesToKeep: 6 },
    );

    const remainingHistoryMessages = result.filter(
      m => m.role !== 'system' && m.content !== 'Yes continue - show me the actual code.',
    );

    // The floor must hold: at least 6 history messages (the most recent
    // exchanges) survive no matter how oversized the system prompt is.
    expect(remainingHistoryMessages.length).toBeGreaterThanOrEqual(6);

    // And specifically, the MOST RECENT exchange (turn 4) -- the one the
    // live bug lost -- must still be present verbatim.
    const contents = remainingHistoryMessages.map(m => m.content);
    expect(contents).toContain('User turn 4');
    expect(contents).toContain('Assistant reply 4');

    // The system prompt is what should have been shrunk instead.
    const systemMessage = result.find(m => m.role === 'system');
    expect(systemMessage).toBeDefined();
    expect(systemMessage!.content.length).toBeLessThan(oversizedSystemPrompt.length);

    // The final request must fit the budget.
    const totalLen = result.reduce((sum, m) => sum + m.content.length, 0);
    expect(totalLen).toBeLessThanOrEqual(300_000);
  });

  it('leaves everything untouched when already under budget', () => {
    const history = buildTurn(1);
    const messages: ChatBudgetMessage[] = [
      { role: 'system', content: 'Short system prompt.' },
      ...history,
      { role: 'user', content: 'Another question.' },
    ];
    const before = JSON.stringify(messages);

    const result = trimMessagesToBudget(messages, { start: 1, end: 1 + history.length });

    expect(JSON.stringify(result)).toBe(before);
  });

  it('trims oldest history first when the floor has not yet been reached', () => {
    const history: ChatBudgetMessage[] = [
      { role: 'user', content: 'a'.repeat(50_000) },
      { role: 'assistant', content: 'b'.repeat(50_000) },
      { role: 'user', content: 'c'.repeat(50_000) },
      { role: 'assistant', content: 'd'.repeat(50_000) },
      { role: 'user', content: 'MOST_RECENT_USER_TURN' },
      { role: 'assistant', content: 'MOST_RECENT_ASSISTANT_REPLY' },
      { role: 'user', content: 'SECOND_MOST_RECENT_USER_TURN' },
      { role: 'assistant', content: 'SECOND_MOST_RECENT_ASSISTANT_REPLY' },
    ];
    const messages: ChatBudgetMessage[] = [
      { role: 'system', content: 'sys'.repeat(1000) },
      ...history,
      { role: 'user', content: 'final query' },
    ];

    trimMessagesToBudget(messages, { start: 1, end: 1 + history.length }, { budget: 120_000, minHistoryMessagesToKeep: 4 });

    const contents = messages.map(m => m.content);
    // The oldest, largest history turns should be gone first...
    expect(contents).not.toContain('a'.repeat(50_000));
    // ...while the most recent exchanges survive.
    expect(contents).toContain('MOST_RECENT_USER_TURN');
    expect(contents).toContain('SECOND_MOST_RECENT_ASSISTANT_REPLY');
  });
});
