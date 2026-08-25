/**
 * Strips code/markdown/punctuation noise from text before it reaches the TTS
 * engine. Applied ONLY on the voice-audio path (LiveContext.tsx's call to
 * voiceServiceRef.current.speak()) — the written answer (chat history, the
 * on-screen "last response" text) is never passed through this and keeps its
 * full fidelity, code blocks included.
 *
 * Fixes a problem that was previously solved in the wrong layer: a system-
 * prompt rule telling the model to never write raw code syntax on voice
 * turns. That degraded the actual answer (a Papyrus question genuinely needs
 * its function signature) to work around a speech problem, and couldn't even
 * fully solve it — a model doesn't reliably avoid every symbol on request,
 * and the fix is unenforceable for a game-data lookup whose grounding text
 * (game_data_index.py's formatted results) already contains real signatures
 * before generation even starts. Sanitizing downstream instead means the
 * model writes its best, most useful answer — including code, using its
 * normal markdown instincts — and only what reaches the speaker changes.
 */
export function sanitizeForSpeech(text: string): string {
  let result = text ?? '';

  // Fenced code blocks -> a short spoken placeholder, never read verbatim.
  result = result.replace(/```[\s\S]*?```/g, ' Code is shown on screen. ');

  // Inline code spans -> the content, with backticks removed. Usually a
  // short identifier/value that's fine to read directly once the ticks
  // (which a TTS engine has no sensible reading for) are gone.
  result = result.replace(/`([^`]+)`/g, '$1');

  // URLs and file paths -> a speakable placeholder rather than read out
  // character by character (protocol, slashes, dots, extension and all).
  result = result.replace(/https?:\/\/\S+/g, ' a link ');
  result = result.replace(/(?:[A-Za-z]:)?(?:[\\/][\w.\-]+){2,}/g, ' a file path ');

  // Markdown structural markers: emphasis/heading/strikethrough characters,
  // blockquote markers, and HTML/angle-bracket tags.
  result = result.replace(/[*_#~]+/g, '');
  result = result.replace(/^>+\s?/gm, '');
  result = result.replace(/<\/?[^>]+>/g, '');

  // Long separator runs (markdown horizontal rules, ASCII dividers).
  result = result.replace(/[-=_]{3,}/g, ' ');

  // Unicode punctuation a TTS engine's phonemizer doesn't reliably normalize,
  // unlike its plain-ASCII equivalent which every engine already handles —
  // confirmed directly during the 2026-08-24 Piper evaluation: feeding an
  // em-dash/curly-quote/ellipsis sentence straight to Piper synthesized
  // without erroring, meaning whatever the punctuation-reading bug sounds
  // like is just whichever engine's own guess at an unrecognized glyph, not
  // something switching engines fixes. This project's own persona/comment
  // writing style uses em-dashes constantly, so this isn't a rare edge case.
  result = result.replace(/[—–]/g, ' '); // em dash, en dash -> space, same treatment as a standalone ASCII "-" below
  result = result.replace(/[‘’]/g, "'"); // curly single quotes/apostrophe -> straight ASCII
  result = result.replace(/[“”]/g, '"'); // curly double quotes -> straight ASCII
  result = result.replace(/…/g, '...'); // single-character ellipsis glyph -> three ASCII periods, collapsed below

  // Standalone slashes, dashes, and pipes — the ones a TTS engine reads as
  // "slash" / "dash" / "pipe" because they aren't part of a word (a hyphen
  // inside "well-known" stays; one sitting alone between spaces, as in a
  // path fragment or code arrow leftover, goes).
  result = result.replace(/\s[/|]\s/g, ' ');
  result = result.replace(/\s-\s/g, ' ');
  result = result.replace(/->/g, ' to ');

  // Collapse repeated punctuation (ellipses, doubled emphasis marks like
  // "!!" or "??") down to a single mark — leaves normal single sentence
  // punctuation (one period, one comma) untouched, since TTS needs that for
  // natural pacing.
  result = result.replace(/([.!?,;:])\1+/g, '$1');

  // Collapse whitespace left behind by all of the above.
  result = result.replace(/[ \t]{2,}/g, ' ').trim();

  return result;
}
