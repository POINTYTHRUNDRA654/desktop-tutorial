# AI Assistant IPC Handlers - Quick Reference

## 🚀 What Was Added

### 6 New IPC Handler Channels
Simple, intuitive API for AI Assistant capabilities:

```
ai-assistant:generate-script      → Generate scripts from descriptions
ai-assistant:suggest-names        → Get asset naming suggestions  
ai-assistant:parse-workflow       → Convert goals to action plans
ai-assistant:execute-workflow     → Run multi-step workflows
ai-assistant:generate-readme      → Create project documentation
ai-assistant:diagnose-error       → Fix errors with AI diagnostics
```

### 6 New Preload API Methods
Available as `window.electronAPI`:

```typescript
aiAssistantGenerateScript(description: string)
aiAssistantSuggestNames(assetType: string, context: string)
aiAssistantParseWorkflow(naturalLanguage: string)
aiAssistantExecuteWorkflow(plan: any)
aiAssistantGenerateReadme(projectData: any)
aiAssistantDiagnoseError(errorLog: string, context: any)
```

## 📍 File Changes

| File | Change | Impact |
|------|--------|--------|
| `src/electron/aiHandlers.ts` | +120 lines | 6 new IPC handlers registered |
| `src/main/preload.ts` | +6 methods | 6 new API methods exposed to renderer |
| (no main.ts changes needed) | Already initialized | Existing init code handles both APIs |

## 💡 Usage Pattern

### From React Component
```typescript
// Example: Generate script
const result = await window.electronAPI.aiAssistantGenerateScript(
  'Create a quest start script'
);

if (result.success) {
  console.log('Generated:', result.scripts[0].code);
} else {
  console.error('Error:', result.error);
}
```

### All Handlers Return
```typescript
{
  success: boolean,
  error?: string,
  // ... type-specific response fields
}
```

## ✅ Compilation Status

- **aiHandlers.ts**: ✅ No type errors
- **preload.ts**: ✅ No handler-specific errors  
- **Type Safety**: ✅ Full TypeScript support
- **Integration**: ✅ Ready to use

## 🔗 Integration Checklist

- [x] IPC handlers registered
- [x] Preload API methods added
- [x] Type definitions correct
- [x] Error handling in place
- [x] Compilation successful
- [ ] Update React components to use new methods
- [ ] Add error UI feedback
- [ ] Test with real LLM responses
- [ ] Deploy to production

## 📊 Comparison: Old vs New API

### Old API (still works)
```typescript
// More parameters, needs request objects
const result = await window.electronAPI.aiGenerateScript({
  description: 'my script',
  language: 'papyrus',
  context: { projectType: 'Fallout4 mod' },
  style: 'commented'
});
```

### New API (simpler, recommended)
```typescript
// Fewer parameters, auto-configured  
const result = await window.electronAPI.aiAssistantGenerateScript(
  'my script'
);
```

## 📝 Handler Details

### 1. Generate Script
**Purpose**: Create code from natural language  
**Input**: `description: string`  
**Output**: Script code with warnings and imports  
**Best for**: Quick code generation without specifying all options

### 2. Suggest Names
**Purpose**: Get naming suggestions following conventions  
**Input**: `assetType: string`, `context: string`  
**Output**: Multiple name suggestions with scores  
**Best for**: Batch asset organization

### 3. Parse Workflow
**Purpose**: Break down goals into steps  
**Input**: `naturalLanguage: string`  
**Output**: WorkflowPlan with time estimates  
**Best for**: Complex multi-step projects

### 4. Execute Workflow
**Purpose**: Run a workflow plan  
**Input**: `plan: WorkflowPlan`  
**Output**: Execution results per step  
**Best for**: Automation and monitoring

### 5. Generate README
**Purpose**: Create project documentation  
**Input**: `projectData: { name, description, features }`  
**Output**: Formatted markdown README  
**Best for**: Documentation generation

### 6. Diagnose Error
**Purpose**: Analyze and fix errors  
**Input**: `errorLog: string`, `context: any`  
**Output**: Root cause + multiple fixes  
**Best for**: Troubleshooting

## 🎯 Architecture Overview

```
Renderer (React)
     ↓
window.electronAPI.aiAssistant*() ← Preload API
     ↓
ipcRenderer.invoke('ai-assistant:*')
     ↓
Main Process (Electron)
     ↓
ipcMain.handle('ai-assistant:*') ← IPC Handler
     ↓
AIAssistantEngineImpl ← Engine Implementation
     ↓
LLM Provider (OpenAI/Groq/Ollama)
```

## 🔐 Error Handling

All handlers catch and return errors gracefully:

```typescript
{
  success: false,
  error: 'Detailed error message',
  // ... type-specific fields with defaults
}
```

No unhandled rejections - renderer always gets result object.

## 🚦 Next Actions

### For Component Developers
1. Replace old `aiGenerateScript` calls with `aiAssistantGenerateScript`
2. Simplify request objects to plain parameters
3. Add error UI when `success: false`
4. Test with real AI responses

### For Backend Developers  
1. Implement real LLM integration (replace mock)
2. Add rate limiting and request throttling
3. Implement caching for repeated requests
4. Add monitoring/telemetry for handler calls

### For QA/Testing
1. Test each handler with sample inputs
2. Verify error handling with invalid inputs
3. Test with various AI model responses
4. Verify type safety in TypeScript

## 📚 Related Documentation

- [AIAssistant Component](AIAssistant.tsx) - React UI component
- [AIAssistant Styling](AIAssistant.css) - Component styling
- [Type Definitions](src/shared/types.ts) - All AI types
- [Engine Implementation](src/mining/aiAssistant.ts) - Core logic

## 🎓 Learning Path

1. **Understand the handlers** - Read this file
2. **Check the types** - Review type definitions in shared/types.ts
3. **See an example** - Check AIAssistant.tsx for usage
4. **Test locally** - Make a test component
5. **Integrate** - Use in your feature

---

**Quick Start**: Use `window.electronAPI.aiAssistantGenerateScript()` in any React component!
