/**
 * Interface translation layer for screens that don't call t() themselves.
 *
 * Mossy has ~170 screens with hard-coded English. Rather than rewriting each one,
 * this swaps EXACT interface phrases (buttons, labels, headings, short messages)
 * for the chosen language, using phrase lists in ./locales/ui/<lang>.json that
 * were extracted from the source (English phrase -> translation).
 *
 * Rules that keep it safe:
 *  - exact match of a whole text node / attribute (trimmed); never partial text
 *  - never touches inputs, textareas, code, pre, scripts, contenteditable, or
 *    anything inside [data-no-translate] (chat messages, file paths, user data)
 *  - remembers every original string, so switching back to English restores it
 *  - when React re-renders a node with English, the observer translates it again
 * Long-form guides are intentionally not in the phrase lists (planned for 6.1).
 */
type Dict = Record<string, string>;

const loaders = import.meta.glob('./locales/ui/*.json');
const SKIP_TAGS = new Set(['SCRIPT', 'STYLE', 'TEXTAREA', 'INPUT', 'CODE', 'PRE', 'KBD', 'SAMP', 'NOSCRIPT']);
const ATTRS = ['placeholder', 'title', 'aria-label', 'alt'] as const;

let dict: Dict | null = null;
let current = 'en';
let observer: MutationObserver | null = null;
/** English original of each text node / attribute we changed (for switching back). */
const originalText = new WeakMap<Text, string>();
const originalAttr = new WeakMap<Element, Map<string, string>>();
/** Exactly what we wrote last, so our own writes aren't mistaken for new English. */
const writtenText = new WeakMap<Text, string>();
const writtenAttr = new WeakMap<Element, Map<string, string>>();
const touched = new Set<WeakRef<Node>>();

const spaces = (v: string) => [v.match(/^\s*/)?.[0] ?? '', v.match(/\s*$/)?.[0] ?? ''] as const;

function skipped(el: Element | null): boolean {
  for (let e = el; e; e = e.parentElement) {
    if (SKIP_TAGS.has(e.tagName)) return true;
    if (e.hasAttribute('data-no-translate') || (e as HTMLElement).isContentEditable) return true;
  }
  return false;
}

function translateText(node: Text): void {
  if (!dict) return;
  const value = node.nodeValue || '';
  if (writtenText.get(node) === value) return;
  const key = value.trim();
  const tr = key && key.length <= 200 ? dict[key] : undefined;
  if (!tr || tr === key || skipped(node.parentElement)) return;
  const [lead, trail] = spaces(value);
  const out = lead + tr + trail;
  originalText.set(node, value);
  writtenText.set(node, out);
  touched.add(new WeakRef(node));
  node.nodeValue = out;
}

function translateAttrs(el: Element): void {
  if (!dict) return;
  for (const a of ATTRS) {
    const v = el.getAttribute(a);
    if (!v || writtenAttr.get(el)?.get(a) === v) continue;
    const tr = dict[v.trim()];
    // Inputs/textareas: their placeholder and title are interface text; only the typed value is off-limits.
    if (!tr || tr === v || el.hasAttribute('data-no-translate') || skipped(el.parentElement)) continue;
    if (!originalAttr.has(el)) originalAttr.set(el, new Map());
    if (!writtenAttr.has(el)) writtenAttr.set(el, new Map());
    originalAttr.get(el)!.set(a, v);
    writtenAttr.get(el)!.set(a, tr);
    touched.add(new WeakRef(el));
    el.setAttribute(a, tr);
  }
}

function walk(root: Node): void {
  if (root.nodeType === Node.TEXT_NODE) { translateText(root as Text); return; }
  if (root.nodeType !== Node.ELEMENT_NODE) return;
  const el = root as Element;
  translateAttrs(el);
  if (skipped(el)) return;
  const tw = document.createTreeWalker(el, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT);
  for (let n = tw.nextNode(); n; n = tw.nextNode()) {
    if (n.nodeType === Node.TEXT_NODE) translateText(n as Text);
    else translateAttrs(n as Element);
  }
}

function restoreEnglish(): void {
  for (const ref of touched) {
    const n = ref.deref();
    if (!n) continue;
    if (n.nodeType === Node.TEXT_NODE) {
      const t = n as Text;
      if (writtenText.get(t) === t.nodeValue) t.nodeValue = originalText.get(t) ?? t.nodeValue;
      writtenText.delete(t);
    } else {
      const el = n as Element;
      originalAttr.get(el)?.forEach((en, a) => { if (writtenAttr.get(el)?.get(a) === el.getAttribute(a)) el.setAttribute(a, en); });
      writtenAttr.delete(el);
    }
  }
  touched.clear();
}

/** Called by I18nProvider whenever the UI language changes. */
export async function setDomTranslatorLanguage(lang: string): Promise<void> {
  if (lang === current && (dict || lang === 'en')) return;
  observer?.disconnect();
  observer = null;
  if (dict) restoreEnglish();
  dict = null;
  current = lang;
  if (lang === 'en' || typeof document === 'undefined' || typeof MutationObserver === 'undefined') return;
  const load = loaders[`./locales/ui/${lang}.json`];
  if (!load) return;
  try {
    const mod: any = await load();
    if (current !== lang) return; // language changed again while loading
    dict = (mod?.default ?? mod) as Dict;
  } catch {
    return; // no phrase list: the interface stays in English
  }
  walk(document.body);
  observer = new MutationObserver((records) => {
    for (const r of records) {
      if (r.type === 'characterData') translateText(r.target as Text);
      else if (r.type === 'attributes') translateAttrs(r.target as Element);
      else r.addedNodes.forEach((n) => walk(n));
    }
  });
  observer.observe(document.body, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: [...ATTRS] });
}
