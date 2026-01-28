export const parseArgs = (input: string): string[] => {
  const s = (input || '').trim();
  if (!s) return [];

  const out: string[] = [];
  let current = '';
  let quote: '"' | "'" | null = null;

  for (let i = 0; i < s.length; i++) {
    const ch = s[i];

    if (quote) {
      if (ch === quote) {
        quote = null;
      } else if (ch === '\\' && i + 1 < s.length) {
        // allow escaping quotes/backslashes
        const next = s[i + 1];
        if (next === quote || next === '\\') {
          current += next;
          i++;
        } else {
          current += ch;
        }
      } else {
        current += ch;
      }
      continue;
    }

    if (ch === '"' || ch === "'") {
      quote = ch;
      continue;
    }

    if (/\s/.test(ch)) {
      if (current.length) {
        out.push(current);
        current = '';
      }
      continue;
    }

    current += ch;
  }

  if (current.length) out.push(current);
  return out;
};
