/**
 * Clipboard access gate — enforces the real "Allow Clipboard Access" toggle
 * in Privacy Settings (settings.privacySettings.allowClipboardAccess).
 *
 * Rather than threading a permission check through the ~26 individual
 * `navigator.clipboard.writeText(...)` call sites across the app, this wraps
 * the actual browser Clipboard API once at startup — a single real
 * enforcement point that every existing and future call site automatically
 * goes through, since they all ultimately call `navigator.clipboard.writeText`.
 */

let installed = false;
let allowed = true;
let originalWriteText: ((text: string) => Promise<void>) | null = null;
let originalReadText: (() => Promise<string>) | null = null;

async function readAllowClipboardSetting(): Promise<boolean> {
  try {
    const api = (window as any).electron?.api ?? (window as any).electronAPI;
    const settings = await api?.getSettings?.();
    // Default to allowed when the setting has never been set, matching the
    // toggle's own default state in DEFAULT_SETTINGS.
    return settings?.privacySettings?.allowClipboardAccess !== false;
  } catch {
    return true;
  }
}

export async function refreshClipboardGate(): Promise<void> {
  allowed = await readAllowClipboardSetting();
}

export function initClipboardGate(): void {
  if (installed || !navigator.clipboard) return;
  installed = true;

  originalWriteText = navigator.clipboard.writeText.bind(navigator.clipboard);
  originalReadText = navigator.clipboard.readText?.bind(navigator.clipboard) ?? null;

  void refreshClipboardGate();

  Object.defineProperty(navigator.clipboard, 'writeText', {
    configurable: true,
    value: async (text: string) => {
      if (!allowed) {
        (window as any).__toast?.error?.('Clipboard access is disabled in Privacy Settings.');
        throw new Error('Clipboard access disabled by user privacy settings (allowClipboardAccess).');
      }
      return originalWriteText!(text);
    },
  });

  if (originalReadText) {
    Object.defineProperty(navigator.clipboard, 'readText', {
      configurable: true,
      value: async () => {
        if (!allowed) {
          (window as any).__toast?.error?.('Clipboard access is disabled in Privacy Settings.');
          throw new Error('Clipboard access disabled by user privacy settings (allowClipboardAccess).');
        }
        return originalReadText!();
      },
    });
  }
}
