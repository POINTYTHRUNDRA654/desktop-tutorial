# AI Type Definitions - Comprehensive vs Simplified

## Overview

The AI Assistant Engine provides **two levels of type definitions**:
1. **Comprehensive Types** - Detailed, feature-rich interfaces with extensive metadata
2. **Simplified Types** - Streamlined, focused interfaces for simple use cases

## Type Mapping Reference

### 1. Script Code Types

#### Comprehensive: `ScriptCode`
```typescript
interface ScriptCode {
  code: string;
  language: 'papyrus' | 'xml' | 'python' | 'powershell';
  explanation: string;
  warnings: string[];
  imports?: string[];
  dependencies?: string[];
  estimatedComplexity: 'simple' | 'moderate' | 'complex';
  usageExample?: string;
}
```
**Use when**: You need detailed metadata about the generated code (complexity, imports, examples)

#### Simplified: `SimpleScriptCode`
```typescript
interface SimpleScriptCode {
  language: 'papyrus' | 'xml' | 'json';
  code: string;
  explanation: string;
  warnings: string[];
}
```
**Use when**: You only need the code, language, explanation, and warnings

---

### 2. Name Suggestion Types

#### Comprehensive: `NameSuggestion`
```typescript
interface NameSuggestion {
  name: string;
  format: 'ldformat' | 'camelcase' | 'snake_case' | 'other';
  explanation: string;
  consistency: number;      // 0-100, convention alignment
  uniquenessScore: number;  // 0-100, collision likelihood
  readability: number;      // 0-100
}
```
**Use when**: You need detailed scoring metrics and format information

#### Simplified: `SimpleNameSuggestion`
```typescript
interface SimpleNameSuggestion {
  suggested: string;
  confidence: number;  // 0-100
  reasoning: string;
  convention: string;  // e.g., "ld_format", "camelCase"
}
```
**Use when**: You just need the suggestion, confidence, and reasoning

**Field Mapping**:
- `name` → `suggested`
- `consistency` + `uniquenessScore` + `readability` → `confidence` (aggregated)
- `explanation` → `reasoning`
- `format` → `convention`

---

### 3. Workflow Types

#### Comprehensive: `WorkflowPlan` + `WorkflowStep`
```typescript
interface WorkflowPlan {
  id: string;
  goal: string;
  steps: WorkflowStep[];
  totalEstimatedTime: number;
  difficulty: 'easy' | 'medium' | 'hard';
  toolsRequired: string[];
  prerequisites: string[];
  warnings: string[];
}

interface WorkflowStep {
  order: number;
  action: string;
  description: string;
  tool?: string;
  inputs?: Record<string, any>;
  outputs?: string[];
  estimatedTime: number;      // minutes
  difficulty: 'easy' | 'medium' | 'hard';
  prerequisites?: number[];    // Step IDs
  alternatives?: WorkflowStep[];
}
```
**Use when**: You need comprehensive workflow information, prerequisites, alternatives, and detailed step metadata

#### Simplified: `SimpleWorkflowPlan` + `SimpleWorkflowStep`
```typescript
interface SimpleWorkflowPlan {
  intent: string;
  steps: SimpleWorkflowStep[];
  estimatedTime: number;
  requiredTools: string[];
}

interface SimpleWorkflowStep {
  id: string;
  action: string;
  description: string;
  tool?: string;
  parameters: Record<string, any>;
  dependsOn?: string[];  // Step IDs
}
```
**Use when**: You need a simple linear workflow without detailed metadata

**Field Mapping**:
- `goal` → `intent`
- `totalEstimatedTime` → `estimatedTime`
- `toolsRequired` → `requiredTools`
- WorkflowStep `order` → Step `id` (simplified)
- WorkflowStep `inputs` → Step `parameters`
- WorkflowStep `prerequisites` (numeric) → Step `dependsOn` (string IDs)

---

### 4. Workflow Result Types

#### Comprehensive: `WorkflowResult`
```typescript
interface WorkflowResult {
  success: boolean;
  plan: WorkflowPlan;
  confidence: number;
  timestamp: number;
  alternativePlans?: WorkflowPlan[];
  error?: string;
}
```

#### Simplified: `SimpleWorkflowResult`
```typescript
interface SimpleWorkflowResult {
  success: boolean;
  stepsCompleted: number;
  totalSteps: number;
  outputs: Record<string, any>;
  errors: string[];
  duration: number;  // milliseconds
}
```
**Use when**: You only care about execution status and results, not the plan details

---

### 5. Error Diagnosis Types

#### Comprehensive: `ErrorDiagnosis`
```typescript
interface ErrorDiagnosis {
  errorType: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  rootCause: string;
  explanation: string;
  affectedSystems: string[];
  diagnosticSteps: DiagnisticStep[];
  possibleFixes: Array<{
    fix: string;
    difficulty: 'easy' | 'medium' | 'hard';
    riskLevel: 'safe' | 'moderate' | 'risky';
    steps: string[];
    successRate: number;
  }>;
  relatedIssues?: string[];
  knowledgeBaseLinks?: string[];
}
```
**Use when**: You need detailed diagnostic steps, multiple fixes with risk assessment, and related documentation

#### Simplified: `SimpleErrorDiagnosis`
```typescript
interface SimpleErrorDiagnosis {
  errorType: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  rootCause: string;
  suggestedFixes: string[];
  relatedDocs: string[];
  confidence: number;  // 0-100
}
```
**Use when**: You need just the basics: what broke, why, quick fixes, and confidence level

**Field Mapping**:
- `explanation` (merged with rootCause)
- `diagnosticSteps` → (omitted in simplified)
- `possibleFixes[].fix` → `suggestedFixes[]`
- `knowledgeBaseLinks` → `relatedDocs`

---

### 6. Explanation Types

#### Comprehensive: `Explanation`
```typescript
interface Explanation {
  title: string;
  summary: string;
  fullExplanation: string;
  keyPoints: string[];
  examples?: Array<{
    title: string;
    code?: string;
    description: string;
  }>;
  visualsDescription?: string;
  relatedConcepts: string[];
}
```

#### Simplified: `SimpleExplanation`
```typescript
interface SimpleExplanation {
  concept: string;
  summary: string;
  details: string;
  examples: string[];
  relatedTopics: string[];
  difficulty: 'beginner' | 'intermediate' | 'advanced';
}
```
**Use when**: You want a simpler structure without complex example objects

**Field Mapping**:
- `title` → `concept`
- `fullExplanation` → `details`
- `examples[].code + description` → `examples[]` (strings)
- `relatedConcepts` → `relatedTopics`
- (simplified adds) `difficulty` level indicator

---

### 7. Tutorial Types

#### Comprehensive: `Tutorial` (not shown in detail above)
Comprehensive tutorials have more detailed step metadata

#### Simplified: `SimpleTutorial` + `SimpleTutorialStep`
```typescript
interface SimpleTutorial {
  title: string;
  description: string;
  steps: SimpleTutorialStep[];
  estimatedTime: number;
  prerequisites: string[];
  difficulty: string;
}

interface SimpleTutorialStep {
  id: string;
  title: string;
  instruction: string;
  code?: string;
  image?: string;
  checkpoints: string[];
}
```
**Use when**: You need a straightforward tutorial structure

---

## When to Choose Which Type Set

### Use **Comprehensive Types** When:
- ✅ Building advanced AI features with rich metadata
- ✅ Generating detailed reports or analysis
- ✅ Building multi-step automation with alternatives
- ✅ Creating educational content with detailed examples
- ✅ Working with the core `AIAssistantEngine`
- ✅ Implementing complex workflow orchestration

### Use **Simplified Types** When:
- ✅ Building simple UI components
- ✅ Creating quick-access APIs for common tasks
- ✅ Implementing lightweight CLI tools
- ✅ Exposing APIs to non-expert users
- ✅ Reducing data transfer/processing overhead
- ✅ Working with simplified IPC handlers like `ai-assistant:*`

---

## Usage in IPC Handlers

### Primary API Handlers (`ai:*`)
Use **Comprehensive Types** with full request/result wrapper objects:
```typescript
ipcMain.handle('ai:generate-script', async (event, request: ScriptGenerationRequest) => {
  const result: ScriptGenerationResult = {
    success: true,
    scripts: [/* ScriptCode[] */],
    timestamp: Date.now(),
    confidence: 0.95
  };
  return result;
});
```

### Alternative API Handlers (`ai-assistant:*`) — NEW
Use **Simplified Types** with direct parameters:
```typescript
ipcMain.handle('ai-assistant:generate-script', async (event, description: string) => {
  const script: SimpleScriptCode = {
    language: 'papyrus',
    code: '...',
    explanation: '...',
    warnings: []
  };
  return { success: true, scripts: [script] };
});
```

---

## React Component Usage

### With Comprehensive Types
```typescript
const result = await window.electronAPI.aiGenerateScript({
  description: 'quest script',
  language: 'papyrus',
  context: { projectType: 'Fallout4 mod' },
  style: 'commented'
});

const script: ScriptCode = result.scripts[0];
console.log(script.estimatedComplexity, script.imports);
```

### With Simplified Types
```typescript
const result = await window.electronAPI.aiAssistantGenerateScript(
  'quest script'
);

const script: SimpleScriptCode = result.scripts[0];
console.log(script.code, script.warnings);
```

---

## Conversion Guide

### Convert Comprehensive → Simplified
```typescript
// ScriptCode → SimpleScriptCode
function toSimpleScriptCode(comprehensive: ScriptCode): SimpleScriptCode {
  return {
    language: comprehensive.language,
    code: comprehensive.code,
    explanation: comprehensive.explanation,
    warnings: comprehensive.warnings
  };
}

// NameSuggestion → SimpleNameSuggestion
function toSimpleNameSuggestion(comprehensive: NameSuggestion): SimpleNameSuggestion {
  return {
    suggested: comprehensive.name,
    confidence: Math.round((comprehensive.consistency + comprehensive.uniquenessScore + comprehensive.readability) / 3),
    reasoning: comprehensive.explanation,
    convention: comprehensive.format
  };
}
```

### Convert Simplified → Comprehensive
```typescript
// SimpleScriptCode → ScriptCode
function toScriptCode(simple: SimpleScriptCode): ScriptCode {
  return {
    ...simple,
    imports: [],
    dependencies: [],
    estimatedComplexity: 'moderate',  // Estimated
    usageExample: undefined
  };
}
```

---

## Type Coexistence

Both type sets **coexist peacefully**:
- Comprehensive types remain the default for `AIAssistantEngine`
- Simplified types are available for simpler use cases
- No breaking changes to existing code
- New code can adopt simplified types gradually
- TypeScript provides full type safety with either choice

---

## File Locations

| Type Set | Location | Export Names |
|----------|----------|--------------|
| Comprehensive | `src/shared/types.ts` | `ScriptCode`, `NameSuggestion`, `WorkflowPlan`, `WorkflowStep`, `ErrorDiagnosis`, `Explanation`, etc. |
| Simplified | `src/shared/types.ts` | `SimpleScriptCode`, `SimpleNameSuggestion`, `SimpleWorkflowPlan`, `SimpleWorkflowStep`, `SimpleErrorDiagnosis`, `SimpleExplanation`, `SimpleTutorial`, `SimpleTutorialStep` |

---

## Import Examples

```typescript
// Import comprehensive types
import type {
  ScriptCode,
  NameSuggestion,
  WorkflowPlan,
  ErrorDiagnosis,
  Explanation,
  Tutorial,
  TutorialStep
} from '@/shared/types';

// Import simplified types
import type {
  SimpleScriptCode,
  SimpleNameSuggestion,
  SimpleWorkflowPlan,
  SimpleWorkflowStep,
  SimpleErrorDiagnosis,
  SimpleExplanation,
  SimpleTutorial,
  SimpleTutorialStep
} from '@/shared/types';

// Use both in same file if needed
const comprehensive: ScriptCode = ...;
const simplified: SimpleScriptCode = ...;
```

---

## Summary Table

| Concept | Comprehensive | Simplified | Best For |
|---------|---------------|-----------|----------|
| Script | `ScriptCode` (8 fields) | `SimpleScriptCode` (4 fields) | Details vs. Simplicity |
| Names | `NameSuggestion` (6 fields) | `SimpleNameSuggestion` (4 fields) | Scoring vs. Quick result |
| Workflow | `WorkflowPlan` + alternatives | `SimpleWorkflowPlan` (direct) | Complex vs. Linear |
| Errors | `ErrorDiagnosis` + fixes | `SimpleErrorDiagnosis` (4 fields) | Detailed vs. Quick fix |
| Learning | `Explanation` + examples | `SimpleExplanation` (flat) | Rich vs. Simple |
| Tutorials | `Tutorial` (complex) | `SimpleTutorial` (direct) | Detailed vs. Straightforward |

---

**Updated**: February 13, 2026  
**Status**: ✅ Type definitions complete and verified
