export function redactSensitiveText(input: string): string {
  let text = input ?? '';

  // Windows paths like C:\Users\Name\...
  text = text.replace(/[A-Za-z]:\\[^\s"']+/g, '[REDACTED_PATH]');

  // POSIX-ish home paths like /Users/name/... or /home/name/...
  text = text.replace(/\/(Users|home)\/[\w.\-]+\/[\S]+/g, '/[REDACTED_PATH]');

  // Email addresses
  text = text.replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, '[REDACTED_EMAIL]');

  // Phone-ish numbers (very loose; catches common formats)
  text = text.replace(/\b(?:\+?\d{1,3}[\s.-]?)?(?:\(\d{3}\)|\d{3})[\s.-]?\d{3}[\s.-]?\d{4}\b/g, '[REDACTED_PHONE]');

  // IPv4 addresses
  text = text.replace(/\b(?:(?:25[0-5]|2[0-4]\d|1?\d?\d)\.){3}(?:25[0-5]|2[0-4]\d|1?\d?\d)\b/g, '[REDACTED_IP]');

  // Common API key prefixes
  text = text.replace(/\bsk-[A-Za-z0-9_\-]{10,}\b/g, '[REDACTED_KEY]');
  text = text.replace(/\bgsk_[A-Za-z0-9_\-]{10,}\b/g, '[REDACTED_KEY]');
  text = text.replace(/\bdg_[A-Za-z0-9_\-]{10,}\b/g, '[REDACTED_KEY]');

  // Authorization headers / bearer tokens
  text = text.replace(/\bAuthorization\s*:\s*Bearer\s+[A-Za-z0-9._\-]+\b/gi, 'Authorization: Bearer [REDACTED_TOKEN]');
  text = text.replace(/\bBearer\s+[A-Za-z0-9._\-]{20,}\b/gi, 'Bearer [REDACTED_TOKEN]');

  return text;
}

export function redactSensitiveValue(value: unknown): unknown {
  if (typeof value === 'string') return redactSensitiveText(value);
  if (value == null) return value;

  if (Array.isArray(value)) {
    return value.map((v) => redactSensitiveValue(v));
  }

  if (typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      // Redact key-like fields aggressively.
      if (/key|token|secret|password|auth/i.test(k)) {
        out[k] = '[REDACTED_FIELD]';
        continue;
      }
      out[k] = redactSensitiveValue(v);
    }
    return out;
  }

  return value;
}

export function redactSensitiveObject<T>(input: T): T {
  return redactSensitiveValue(input) as T;
}
