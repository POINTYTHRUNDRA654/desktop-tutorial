# Contributing Translations to Mossy

Thank you for your interest in helping translate Mossy! This guide will help you contribute high-quality translations to make Mossy accessible to users worldwide.

## 📋 Table of Contents

- [Getting Started](#getting-started)
- [Translation Guidelines](#translation-guidelines)
- [File Structure](#file-structure)
- [How to Contribute](#how-to-contribute)
- [Translation Keys](#translation-keys)
- [Testing Your Translations](#testing-your-translations)
- [Currently Supported Languages](#currently-supported-languages)

## 🚀 Getting Started

### Prerequisites

- Proficiency in both English and your target language
- Basic understanding of JSON format
- GitHub account (for submitting contributions)

### Quick Start

1. **Fork the repository** on GitHub
2. **Clone your fork** locally
3. **Navigate to** `src/renderer/src/locales/`
4. **Edit or create** your language file (e.g., `es.json` for Spanish)
5. **Test your changes** locally
6. **Submit a pull request**

## 📖 Translation Guidelines

### General Principles

1. **Preserve Meaning**: Translate the meaning, not just the words
2. **Be Concise**: Match the original text's length when possible
3. **Maintain Tone**: Keep the friendly, helpful tone of the original
4. **Consistency**: Use the same translation for repeated terms
5. **Context Matters**: Consider where the text appears in the UI

### What NOT to Translate

- **Brand Names**: Mossy, Fallout, Bethesda
- **Technical Terms**: xEdit, CK, PRP, Precombine, Previs, DDS, BA2
- **Mod Names**: Sim Settlements, Address Library, F4SE
- **File Extensions**: .esp, .esm, .esl, .nif, .dds
- **Tool Names**: LOOT, NifSkope, BodySlide, ComfyUI
- **URLs and Email Addresses**

### What TO Translate

- **UI Labels**: Buttons, menu items, headings
- **Descriptions**: Help text, tooltips, instructions
- **Messages**: Success/error messages, notifications
- **Documentation**: In-app guides and tutorials

### Special Cases

#### Punctuation
- Adapt punctuation to your language's conventions
- Spanish: Use ¿ and ¡ where appropriate
- French: Use spaces before ? ! : ;
- Japanese/Chinese: Use full-width punctuation

#### Pluralization
Currently, our system doesn't support automatic pluralization. Use the most common form or a neutral construction.

**Example:**
- English: "file(s)" → Spanish: "archivo(s)" or "archivos"
- Consider: "1 or more files" → "1 o más archivos"

#### Gender
For languages with grammatical gender, use neutral forms when possible or default to the most common gender for the term.

## 📁 File Structure

Translation files are JSON files located in `src/renderer/src/locales/`.

```
src/renderer/src/locales/
├── en.json      # English (reference)
├── es.json      # Spanish
├── fr.json      # French
├── de.json      # German
├── ru.json      # Russian
├── zh-Hans.json # Chinese (Simplified)
├── pt-BR.json   # Portuguese (Brazilian)
├── ja.json      # Japanese
├── ko.json      # Korean
├── it.json      # Italian
├── pl.json      # Polish
└── tr.json      # Turkish
```

### JSON Structure

Each file follows this structure:

```json
{
  "nav": {
    "home": "Home",
    "chat": "AI Chat",
    "settings": "Settings"
  },
  "settings": {
    "language": {
      "title": "Language Settings",
      "subtitle": "Choose your interface language"
    }
  }
}
```

**Important:** 
- Use **straight quotes** `"` not smart quotes `"` or `"`
- Escape quotes within strings: `"He said \"hello\""`
- Maintain the exact same key structure as en.json

## 🤝 How to Contribute

### For New Languages

1. **Request the language** by opening a [translation request issue](https://github.com/POINTYTHRUNDRA654/mossy-ai/issues/new?template=translation-request.md)
2. **Wait for approval** (we'll add the language to the system)
3. **Create the translation file** based on `en.json`
4. **Submit a pull request** with your completed translation

### For Existing Languages

1. **Find missing translations** by comparing your language file to `en.json`
2. **Check the extraction script** output: `npm run extract-translations`
3. **Improve existing translations** if you find errors or better phrasings
4. **Submit a pull request** with your improvements

### Pull Request Guidelines

**Title Format:** `[i18n] Update [language] translations`
- Example: `[i18n] Update Spanish translations`

**Description Should Include:**
- List of keys added/modified
- Percentage of completion (if known)
- Any questions or notes about specific translations

**Example PR Description:**
```markdown
## Changes
- Completed installWizard section (35 keys)
- Updated settings.language section for clarity
- Fixed typo in nav.crashTriage

## Completion
Spanish (es.json): ~75% complete

## Notes
- "Crash Triage" translated as "Diagnóstico de fallos" - please review
- Some technical modding terms kept in English per guidelines
```

## 🔑 Translation Keys

### Naming Convention

Keys use dot notation to organize related translations:

- `nav.*` - Navigation menu items
- `settings.*` - Settings page content
- `installWizard.*` - Install Wizard UI
- `onboarding.*` - First-run onboarding
- `common.*` - Reusable common phrases

### Common Patterns

#### Buttons and Actions
```json
"save": "Save",
"cancel": "Cancel",
"delete": "Delete",
"confirm": "Confirm"
```

#### Status Messages
```json
"loading": "Loading...",
"success": "Success!",
"error": "Error occurred"
```

#### Titles and Labels
```json
"title": "Page Title",
"subtitle": "Brief description",
"label": "Field Label",
"help": "Help text"
```

## 🧪 Testing Your Translations

### Local Testing

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Run the development server:**
   ```bash
   npm run dev
   ```

3. **Change language in app:**
   - Navigate to Settings → Language Settings
   - Select your language
   - Verify all translated text appears correctly

### Things to Check

- ✅ Text fits in UI elements (not too long)
- ✅ No encoding issues (accents, special characters display correctly)
- ✅ Punctuation is appropriate for the language
- ✅ Translations make sense in context
- ✅ Consistent terminology throughout

### Visual Testing Checklist

Test these areas of the app:
- [ ] Navigation sidebar
- [ ] Settings pages
- [ ] Install Wizard
- [ ] Onboarding flow
- [ ] Tooltips and help text
- [ ] Error messages
- [ ] Success notifications

## 🌍 Currently Supported Languages

| Language | Code | Status | Contributors Needed |
|----------|------|--------|---------------------|
| English | en | 100% ✅ | Reference language |
| Spanish | es | ~60% 🟡 | Yes |
| French | fr | ~60% 🟡 | Yes |
| German | de | ~60% 🟡 | Yes |
| Russian | ru | ~60% 🟡 | Yes |
| Chinese (Simplified) | zh-Hans | ~60% 🟡 | Yes |
| Portuguese (BR) | pt-BR | ~60% 🟡 | Yes |
| Japanese | ja | ~60% 🟡 | Yes |
| Korean | ko | ~60% 🟡 | Yes |
| Italian | it | ~60% 🟡 | Yes |
| Polish | pl | ~60% 🟡 | Yes |
| Turkish | tr | ~60% 🟡 | Yes |

**Legend:**
- ✅ Complete (90%+)
- 🟡 In Progress (30-89%)
- 🔴 Started (<30%)

## 📞 Getting Help

- **Questions?** Open an [issue](https://github.com/POINTYTHRUNDRA654/mossy-ai/issues)
- **Discussion?** Use [GitHub Discussions](https://github.com/POINTYTHRUNDRA654/mossy-ai/discussions)
- **Found a bug in existing translations?** Open a [translation request issue](https://github.com/POINTYTHRUNDRA654/mossy-ai/issues/new?template=translation-request.md)

## 🙏 Thank You!

Your contributions help make Mossy accessible to Fallout 4 modders worldwide. Every translation, no matter how small, makes a difference!

---

**Last Updated:** April 2026
**Maintainer:** POINTYTHRUNDRA654
