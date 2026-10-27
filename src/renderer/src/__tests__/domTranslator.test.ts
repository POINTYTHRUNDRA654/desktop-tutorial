import { setDomTranslatorLanguage } from '../domTranslator';

const tick = () => new Promise((r) => setTimeout(r, 0));

describe('interface translation layer', () => {
  afterEach(async () => { await setDomTranslatorLanguage('en'); document.body.innerHTML = ''; });

  it('translates exact interface phrases, keeps spacing, and restores English', async () => {
    document.body.innerHTML = `<div><button> Check Status </button><span>Check Status now</span><input placeholder="Search plugins..." value="Check Status"><pre>Check Status</pre><div data-no-translate>Check Status</div></div>`;
    await setDomTranslatorLanguage('de');
    const btn = document.querySelector('button')!;
    expect(btn.textContent).toBe(' Status prüfen ');
    expect(document.querySelector('span')!.textContent).toBe('Check Status now'); // not an exact phrase
    expect(document.querySelector('input')!.getAttribute('placeholder')).toBe('Plugins durchsuchen...');
    expect((document.querySelector('input') as HTMLInputElement).value).toBe('Check Status'); // user value untouched
    expect(document.querySelector('pre')!.textContent).toBe('Check Status');
    expect(document.querySelector('[data-no-translate]')!.textContent).toBe('Check Status');

    await setDomTranslatorLanguage('en');
    expect(btn.textContent).toBe(' Check Status ');
    expect(document.querySelector('input')!.getAttribute('placeholder')).toBe('Search plugins...');
  });

  it('translates content added later and English re-rendered into a node', async () => {
    await setDomTranslatorLanguage('de');
    const p = document.createElement('p');
    p.textContent = 'Check Status';
    document.body.appendChild(p);
    await tick();
    expect(p.textContent).toBe('Status prüfen');
    p.firstChild!.nodeValue = 'Check Status'; // what a React re-render does
    await tick();
    expect(p.textContent).toBe('Status prüfen');
  });
});
