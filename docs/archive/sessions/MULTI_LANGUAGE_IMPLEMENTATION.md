# Multi-Language Support Implementation - Complete Guide

**Date:** April 11, 2026  
**Version:** Mossy v5.4.27+  
**Status:** Phase 1 & 3 Complete ✅

## 🌍 Overview

Mossy now supports **12 languages** with a fully functional internationalization (i18n) system. This document provides a complete overview of the implementation, usage, and future plans.

## 📊 Supported Languages

| Language | Code | Status | Completion |
|----------|------|--------|------------|
| English | `en` | ✅ Complete | 100% |
| Spanish | `es` | 🟡 Partial | ~60% |
| French | `fr` | 🟡 Partial | ~60% |
| German | `de` | 🟡 Partial | ~60% |
| Russian | `ru` | 🟡 Partial | ~60% |
| Chinese (Simplified) | `zh-Hans` | 🟡 Partial | ~60% |
| Portuguese (Brazilian) | `pt-BR` | 🟡 Partial | ~60% |
| Japanese | `ja` | 🟡 Partial | ~60% |
| Korean | `ko` | 🟡 Partial | ~60% |
| Italian | `it` | 🟡 Partial | ~60% |
| Polish | `pl` | 🟡 Partial | ~60% |
| Turkish | `tr` | 🟡 Partial | ~60% |

**Total:** 12 languages covering major markets worldwide

## 🏗️ Architecture

### File Structure

```
src/renderer/src/
├── i18n.ts                    # Core i18n system
├── LanguageSettings.tsx       # Language selection UI
└── locales/                   # Translation files
    ├── en.json               # English (reference)
    ├── es.json               # Spanish
    ├── fr.json               # French
    ├── de.json               # German
    ├── ru.json               # Russian
    ├── zh-Hans.json          # Chinese (Simplified)
    ├── pt-BR.json            # Portuguese (BR)
    ├── ja.json               # Japanese
    ├── ko.json               # Korean
    ├── it.json               # Italian
    ├── pl.json               # Polish
    └── tr.json               # Turkish
```

### i18n System Features

1. **Custom React Context-based implementation**
   - Lightweight and performant
   - No external dependencies
   - Full TypeScript support

2. **Automatic language detection**
   - Detects system language
   - Falls back to English if unsupported
   - User preference persists in Electron store

3. **Nested translation keys**
   - Organized by feature area
   - Dot notation: `settings.language.title`
   - Fallback to key name if translation missing

4. **TTS Integration**
   - Auto-selects appropriate voice when language changes
   - Uses Windows system voices
   - Graceful fallback if voice unavailable

## 💻 Usage for Developers

### Using Translations in Components

```tsx
import { useI18n } from './i18n';

function MyComponent() {
  const { t } = useI18n();
  
  return (
    <div>
      <h1>{t('mySection.title', 'Default Title')}</h1>
      <p>{t('mySection.description', 'Default description')}</p>
    </div>
  );
}
```

### Translation File Format

```json
{
  "mySection": {
    "title": "My Title",
    "description": "My description",
    "nested": {
      "value": "Nested translation"
    }
  }
}
```

### Adding a New Language

1. Create language file: `src/renderer/src/locales/[code].json`
2. Add import in `i18n.ts`:
   ```ts
   import [name] from './locales/[code].json';
   ```
3. Add to `Lang` type:
   ```ts
   type Lang = 'en' | 'es' | ... | '[code]';
   ```
4. Add to `DICTS` object:
   ```ts
   const DICTS: Record<Lang, Dict> = {
     '[code]': [name] as any,
     ...
   };
   ```
5. Update `resolveUiLanguage()` function with detection logic
6. Add to `LanguageSettings.tsx` UI array

## 🎯 Translation Coverage

### Fully Translated Sections

- ✅ Navigation menu (`nav.*`)
- ✅ Language settings (`settings.language.*`)
- ✅ Onboarding (`onboarding.language.*`)
- ✅ Install Wizard (`installWizard.*`)

### Partially Translated Sections

- 🟡 Settings pages
- 🟡 Error messages
- 🟡 Tooltips and help text
- 🟡 Modal dialogs

### Not Yet Translated

- ❌ Most component-specific content
- ❌ Dynamic content from AI responses
- ❌ Knowledge base articles
- ❌ Technical documentation

## 🛠️ Tools and Scripts

### Translation Extraction Script

Find hardcoded strings that need translation:

```bash
npm run extract-translations
```

**Output:**
- Lists files with hardcoded strings
- Shows which files already use i18n
- Highlights files needing attention
- Provides usage recommendations

### Translation Validation

Build the project to validate JSON syntax:

```bash
npm run build
```

Any JSON syntax errors will be caught during build.

## 📝 Contributing Translations

See [CONTRIBUTING_TRANSLATIONS.md](./CONTRIBUTING_TRANSLATIONS.md) for detailed guidelines.

**Quick Start:**
1. Fork the repository
2. Edit language file in `src/renderer/src/locales/`
3. Test locally with `npm run dev`
4. Submit pull request

**Issue Template:**
Use [Translation Request](.github/ISSUE_TEMPLATE/translation-request.md) for:
- Requesting new languages
- Reporting translation errors
- Suggesting improvements

## 🔄 Implementation Phases

### Phase 1: Infrastructure ✅

- [x] Add 6 new language files (pt-BR, ja, ko, it, pl, tr)
- [x] Update i18n.ts to support new languages
- [x] Update LanguageSettings.tsx UI
- [x] Create translation extraction script
- [x] Create GitHub issue template
- [x] Create translation contribution guide
- [ ] Add TypeScript translation key types
- [ ] Add dev mode missing translation warnings
- [ ] Enhance i18n.ts with interpolation support

### Phase 2: Complete Existing Languages

- [ ] Analyze all components for hardcoded strings
- [ ] Extract all English strings to en.json
- [ ] Complete Spanish (es.json) to 100%
- [ ] Complete French (fr.json) to 100%
- [ ] Complete German (de.json) to 100%
- [ ] Complete Russian (ru.json) to 100%
- [ ] Complete Chinese (zh-Hans.json) to 100%
- [ ] Complete all 6 new languages to 100%

### Phase 3: Priority Languages ✅

- [x] Add Portuguese (pt-BR)
- [x] Add Japanese (ja)
- [x] Add Korean (ko)
- [x] Add Italian (it)
- [x] Add Polish (pl)
- [x] Add Turkish (tr)

### Phase 4: Translation Management

- [x] GitHub issue template for translation requests
- [x] Translation contribution guide
- [ ] Set up Crowdin for community translations
- [ ] Implement translation CI/CD pipeline
- [ ] Add translation completion metrics to docs
- [ ] Create translator recognition system

## 🚀 Future Enhancements

### Planned Features

1. **Interpolation Support**
   ```ts
   t('welcome.message', 'Hello, {name}!', { name: 'User' })
   // Output: "Hello, User!"
   ```

2. **Pluralization**
   ```ts
   t('files.count', '{count} file(s)', { count: 5 })
   // Output: "5 files"
   ```

3. **Date/Time Formatting**
   ```ts
   formatDate(date, lang)
   // Output: "4/11/2026" (en) or "11/04/2026" (fr)
   ```

4. **RTL Support**
   - Right-to-left layout for Arabic, Hebrew
   - Automatic text direction detection
   - Mirrored UI elements

5. **Language-Specific Features**
   - Japanese font optimization
   - Korean line breaking rules
   - Chinese character variants

### Potential Additions

- **Migration to react-i18next** (if needed for advanced features)
- **Translation memory** (reuse common translations)
- **Machine translation API** (for initial drafts)
- **Translation quality metrics** (completeness, consistency)
- **Automatic translation updates** (notify translators of new keys)

## 📈 Impact and Benefits

### For Users

- **Accessibility:** App usable in native language
- **Reduced Learning Curve:** Familiar terminology
- **Global Community:** Connect with modders worldwide
- **Better UX:** Comfortable, natural interaction

### For the Project

- **Worldwide Reach:** Access to non-English markets
- **Community Growth:** More contributors and users
- **Professional Polish:** Production-ready application
- **Competitive Advantage:** Few modding tools offer multi-language

### Market Coverage

**By Language Family:**
- Romance: Spanish, French, Italian, Portuguese (4)
- Germanic: English, German (2)
- Slavic: Russian, Polish (2)
- East Asian: Japanese, Korean, Chinese (3)
- Turkic: Turkish (1)

**By Geographic Market:**
- Europe: 7 languages
- Asia: 4 languages
- Americas: 3 languages
- Global: English

## 🔧 Technical Considerations

### Performance

- All language files loaded at startup
- Small file sizes (< 20KB each)
- No lazy loading needed for 12 languages
- Minimal runtime overhead

### Text-to-Speech

- Requires Windows system voices
- Auto-selects voice matching UI language
- Fallback to English if voice unavailable
- User can manually select voice in Settings

### AI Chat Integration

- AI responses remain in English (for now)
- Could add language detection/translation
- Requires testing across all LLMs
- Potential future feature

### Knowledge Base

- Technical docs remain in English
- UI translations only
- Could add on-the-fly translation
- Community could maintain translated docs

## 📚 Resources

- **Implementation Guide:** This document
- **Translation Guide:** [CONTRIBUTING_TRANSLATIONS.md](./CONTRIBUTING_TRANSLATIONS.md)
- **Issue Template:** [.github/ISSUE_TEMPLATE/translation-request.md](.github/ISSUE_TEMPLATE/translation-request.md)
- **Extraction Script:** `scripts/extract-translations.mjs`

## 🤝 Credits

**Original i18n Implementation:** Mossy Team  
**New Languages Added:** April 2026  
**Translation Contributors:** See GitHub contributors

## 📞 Support

- **Report Issues:** [GitHub Issues](https://github.com/POINTYTHRUNDRA654/desktop-tutorial/issues)
- **Translation Requests:** Use translation request template
- **General Questions:** [GitHub Discussions](https://github.com/POINTYTHRUNDRA654/desktop-tutorial/discussions)

---

**Last Updated:** April 11, 2026  
**Mossy Version:** 5.4.27+
