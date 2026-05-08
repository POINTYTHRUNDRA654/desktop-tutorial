# Type Definitions - Quick Reference Card

## 9 New Simplified Types Added ✅

```
SimpleScriptCode          → Simple version of ScriptCode
SimpleNameSuggestion      → Simple version of NameSuggestion  
SimpleWorkflowPlan        → Simple version of WorkflowPlan
SimpleWorkflowStep        → Simplified workflow step
SimpleWorkflowResult      → Execution result tracking
SimpleErrorDiagnosis      → Simplified error analysis
SimpleExplanation         → Simplified concept guide
SimpleTutorial            → Simplified tutorial container
SimpleTutorialStep        → Simplified step definition
```

## At a Glance

### SimpleScriptCode (4 fields)
```typescript
{ language, code, explanation, warnings }
```
**Use**: When you just need the code  
**vs**: `ScriptCode` (8 fields with imports, dependencies, complexity)

### SimpleNameSuggestion (4 fields)
```typescript
{ suggested, confidence, reasoning, convention }
```
**Use**: When you need a quick name  
**vs**: `NameSuggestion` (6 fields with format, consistency scores)

### SimpleWorkflowPlan (4 fields)
```typescript
{ intent, steps[], estimatedTime, requiredTools }
```
**Use**: Linear workflows  
**vs**: `WorkflowPlan` (8 fields with alternatives, prerequisites)

### SimpleWorkflowStep (6 fields)
```typescript
{ id, action, description, tool, parameters, dependsOn[] }
```
**Use**: In workflow steps  
**vs**: `WorkflowStep` (9 fields with inputs, outputs, difficulty)

### SimpleWorkflowResult (6 fields)
```typescript
{ success, stepsCompleted, totalSteps, outputs, errors[], duration }
```
**Use**: Tracking execution  
**vs**: `WorkflowResult` (5 fields without step tracking)

### SimpleErrorDiagnosis (6 fields)
```typescript
{ errorType, severity, rootCause, suggestedFixes[], relatedDocs, confidence }
```
**Use**: Quick diagnostics  
**vs**: `ErrorDiagnosis` (10+ fields with diagnostic steps)

### SimpleExplanation (6 fields)
```typescript
{ concept, summary, details, examples[], relatedTopics, difficulty }
```
**Use**: Learning content  
**vs**: `Explanation` (7 fields with complex example objects)

### SimpleTutorial (6 fields)
```typescript
{ title, description, steps[], estimatedTime, prerequisites, difficulty }
```
**Use**: Simple tutorials  
**vs**: `Tutorial` (with detailed metadata)

### SimpleTutorialStep (6 fields)
```typescript
{ id, title, instruction, code, image, checkpoints[] }
```
**Use**: Tutorial steps  
**vs**: `TutorialStep` (with detailed tracking)

---

## Import Them

```typescript
import type {
  SimpleScriptCode,
  SimpleNameSuggestion,
  SimpleWorkflowPlan,
  SimpleWorkflowStep,
  SimpleWorkflowResult,
  SimpleErrorDiagnosis,
  SimpleExplanation,
  SimpleTutorial,
  SimpleTutorialStep
} from '@/shared/types';
```

---

## Use Them

### In React Component
```typescript
const result = await window.electronAPI.aiAssistantGenerateScript(
  'Generate a notification script'
);

const code: SimpleScriptCode = result.scripts[0];
console.log(code.code);        // String
console.log(code.warnings);    // String[]
```

### In IPC Handler
```typescript
ipcMain.handle('ai-assistant:generate-script', async (event, description) => {
  return {
    success: true,
    scripts: [{
      language: 'papyrus',
      code: '...',
      explanation: '...',
      warnings: []
    } as SimpleScriptCode]
  };
});
```

### In Service Layer
```typescript
function simplifyScriptCode(comprehensive: ScriptCode): SimpleScriptCode {
  return {
    language: comprehensive.language,
    code: comprehensive.code,
    explanation: comprehensive.explanation,
    warnings: comprehensive.warnings
  };
}
```

---

## Field Mapping Summary

| Comprehensive | → | Simplified |
|---------------|---|-----------|
| ScriptCode (8) | → | SimpleScriptCode (4) |
| NameSuggestion (6) | → | SimpleNameSuggestion (4) |
| WorkflowPlan (8) | → | SimpleWorkflowPlan (4) |
| ErrorDiagnosis (10+) | → | SimpleErrorDiagnosis (6) |
| Explanation (7) | → | SimpleExplanation (6) |
| Tutorial | → | SimpleTutorial (6) |

---

## Handler Integration

| Handler | Input | Output |
|---------|-------|--------|
| `ai-assistant:generate-script` | `string` | `{ success, scripts: SimpleScriptCode[] }` |
| `ai-assistant:suggest-names` | `string, string` | `{ success, suggestions: SimpleNameSuggestion[] }` |
| `ai-assistant:parse-workflow` | `string` | `{ success, plan: SimpleWorkflowPlan }` |
| `ai-assistant:execute-workflow` | `plan: any` | `SimpleWorkflowResult` |
| `ai-assistant:diagnose-error` | `string, object` | `{ success, diagnosis: SimpleErrorDiagnosis }` |

---

## Location

**File**: `src/shared/types.ts`  
**Lines**: 5703-5803  
**Status**: ✅ Added and verified  

---

## Status

✅ Type definitions added  
✅ Comprehensive documentation created  
✅ Compiles without errors  
✅ No breaking changes  
✅ Ready to use  

---

**For Details**: See `TYPE_DEFINITIONS_GUIDE.md`  
**For Integration**: See `IPC_HANDLERS_IMPLEMENTATION.md`  
**For Quick API**: See `IPC_HANDLERS_QUICK_REFERENCE.md`
