# Antigravity Agent Workflow Guide for Mossy

> **Version:** 1.0  
> **Last Updated:** March 2026  
> **Project:** Mossy v5.4.24

This guide explains how to work effectively with Antigravity agents for Mossy development.

---

## 🎯 Workflow Overview

```
┌─────────────────────────────────────────────────────┐
│ 1. Create Task (Use Template Below)                 │
└──────────────────┬──────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────┐
│ 2. Assign to Antigravity Agent                       │
│    • Provide task description                        │
│    • Link reference files                            │
│    • Set output files (must be in allowed paths)     │
└──────────────────┬──────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────┐
│ 3. Agent Executes                                   │
│    • Reads .antigravity-skills.md                    │
│    • Follows reference file patterns                 │
│    • Generates code/tests/docs                       │
│    • Creates on feature branch                       │
└──────────────────┬──────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────┐
│ 4. Validation Script Runs (Pre-Push)                │
│    • Checks all modified files in allowed paths     │
│    • Rejects any blocked-path changes               │
│    • Reports violations                             │
└──────────────────┬──────────────────────────────────┘
                   │
        ┌──────────┴──────────┐
        │                     │
        ▼ PASS                ▼ FAIL
    ┌────────┐           ┌─────────┐
    │ Can    │           │ Reject  │
    │ Push   │           │ & Alert │
    └────────┘           └─────────┘
        │
        ▼
┌─────────────────────────────────────────────────────┐
│ 5. Code Review (Human)                              │
│    • Review output quality                          │
│    • Check adherence to patterns                    │
│    • Test locally (npm run lint + test)             │
│    • Approve & merge                                │
└─────────────────────────────────────────────────────┘
```

---

## 📝 Task Template

Use this template when creating a new Antigravity task:

```markdown
# Task: [Component/Feature Name]

## Goal
[1-2 sentence description of what needs to be built]

## Acceptance Criteria
- [ ] Criterion 1 (e.g., "Component accepts imageArray prop")
- [ ] Criterion 2 (e.g., "Tests cover happy path + error cases")
- [ ] Criterion 3 (e.g., "TailwindCSS styling matches PipBoy theme")

## Reference Files
List existing files the agent should study:
- `src/renderer/src/ExistingComponent.tsx` (for component pattern)
- `src/renderer/src/__tests__/Example.test.ts` (for test pattern)

## Output Files
- `src/renderer/src/NewComponent.tsx` (ALLOWED)
- `src/renderer/src/__tests__/NewComponent.test.ts` (ALLOWED)

## Constraints
- Must follow .antigravity-skills.md conventions
- No IPC handler modifications
- TailwindCSS only (no CSS modules)
- Must include TypeScript interfaces

## Notes
[Any additional context or hints]
```

---

## 🚀 Task Ideas (Ready to Assign)

### Tier 1: Highest Priority (Week 1)

#### Task 1.1: Generate ImageGalleryPanel Component
```
Status: READY TO ASSIGN
Difficulty: Easy
Estimated Time: 2 hours
Output Files:
  - src/renderer/src/ImageGalleryPanel.tsx
  - src/renderer/src/__tests__/ImageGalleryPanel.test.ts

Acceptance Criteria:
  ✅ Component renders image grid (responsive, 3-4 columns)
  ✅ Accepts imageArray prop (array of image URLs)
  ✅ Shows loading state during image load
  ✅ Includes error boundary for broken images
  ✅ TailwindCSS only, matches PipBoy theme
  ✅ Full Vitest unit tests (happy + error paths)
  ✅ JSDoc comments with @example

Reference Files:
  - src/renderer/src/AssetViewer3D.tsx (3D viewer pattern)
  - src/renderer/src/AnalyticsDashboard.tsx (grid layout)
  - src/renderer/src/ErrorBoundary.tsx (error handling)
```

#### Task 1.2: Generate ModMetadataEditor Component
```
Status: READY TO ASSIGN
Difficulty: Easy-Medium
Estimated Time: 3 hours
Output Files:
  - src/renderer/src/ModMetadataEditor.tsx
  - src/renderer/src/__tests__/ModMetadataEditor.test.ts

Acceptance Criteria:
  ✅ Form component with fields: name, version, author, description
  ✅ Input validation (no empty required fields)
  ✅ Save/Cancel buttons with confirmation
  ✅ Displays validation errors inline
  ✅ TypeScript props interface
  ✅ Vitest units for validation logic

Reference Files:
  - src/renderer/src/CKQuestDialogueWizard.tsx (form pattern)
  - src/renderer/src/ProjectCreator.tsx (wizard pattern)
```

#### Task 1.3: Expand types.ts with GameState Interface
```
Status: READY TO ASSIGN
Difficulty: Easy
Estimated Time: 1 hour
Output Files:
  - src/shared/types.ts (additions only)

Acceptance Criteria:
  ✅ New GameState interface covering game runtime info
  ✅ Fields: isRunning, currentLoadOrder[], playerLevel, location
  ✅ Type aliases for game regions/locations
  ✅ JSDoc comments for all fields
  ✅ Matches existing type patterns

Reference:
  - Look at existing ModProject interface in types.ts
  - Follow same documentation style
```

### Tier 2: Medium Priority (Week 2)

#### Task 2.1: Generate Vitest Suite for Utility Functions
```
Status: READY TO ASSIGN
Difficulty: Easy
Estimated Time: 3-4 hours
Output Files:
  - src/renderer/src/__tests__/utils.test.ts
  - src/renderer/src/__tests__/hooks.test.ts

Acceptance Criteria:
  ✅ 20+ test cases covering utilities in src/renderer/src/utils/
  ✅ Test happy path, edge cases, error cases
  ✅ Mock external dependencies (IPC, APIs)
  ✅ >70% coverage on target files
  ✅ All tests pass locally

Reference:
  - src/renderer/src/__tests__/ (existing test patterns)
```

#### Task 2.2: Generate 10 Fallout 4 Modding Guides
```
Status: READY TO ASSIGN
Difficulty: Medium
Estimated Time: 4-5 hours
Output Files:
  - resources/public/knowledge/Guide1.md
  - resources/public/knowledge/Guide2.md
  - ... (10 total)

Topics (Pick Any):
  - Advanced NPC Scripting Patterns
  - Dialog System Deep Dive
  - Combat AI Customization
  - Leveled List Injection Strategies
  - Quest Stage Sequences
  - Papyrus Debugging Techniques
  - Animation Blending Guide
  - LOD Generation Workflow
  - Precombine & Previs Optimization
  - ModConfig Menu Integration

Acceptance Criteria:
  ✅ Each guide: 3-5 sections + examples
  ✅ Code examples included where relevant
  ✅ Follows existing knowledge/ style
  ✅ Links to related guides
  ✅ Fallout 4 specific (not generic)

Reference:
  - resources/public/knowledge/ (existing guides)
  - .antigravity-skills.md documentation style
```

### Tier 3: Nice-to-Have (Week 3+)

#### Task 3.1: Generate Playwright E2E Tests
```
Status: READY TO ASSIGN
Difficulty: Medium
Estimated Time: 4-5 hours
Output Files:
  - e2e/scenarios/ModManagement.spec.ts
  - e2e/scenarios/ToolIntegration.spec.ts
  - e2e/scenarios/Settings.spec.ts

Test Coverage:
  ✅ Mod browser filtering & sorting
  ✅ Project creation workflow
  ✅ Settings save/load
  ✅ Tool detection & launching
  ✅ Help/tutorial flows

Reference:
  - e2e/ existing test structure
  - .antigravity-skills.md testing patterns
```

---

## 🔄 Running a Task (Step-by-Step)

### Step 1: Prepare the Task

1. Choose a task from above
2. Create a feature branch: `git checkout -b feature/antigravity-task-1.1`
3. Write the task description (use template above)
4. Link reference files

### Step 2: Assign to Antigravity

1. Open Antigravity IDE on your D: drive download
2. Point project to this repo: `d:\Projects\desktop-tutorial\desktop-tutorial`
3. Go to "Agent Manager" / "Mission Control"
4. Create new task with description
5. Reference the `.antigravity.config.json` and `.antigravity-skills.md` files
6. Set output files (e.g., `src/renderer/src/ImageGalleryPanel.tsx`)
7. Start agent execution

### Step 3: Review Output

1. Agent generates files and commits to feature branch
2. Validation script runs (see Step 4)
3. If validation passes → proceed to code review
4. If validation fails → agent reports violations, fix and retry

### Step 4: Validation (Automated)

The pre-push hook will run automatically:

```bash
# Triggered before: git push
# Script: scripts/validate-antigravity-paths.mjs
# Checks:
#   - All modified files in allowed paths
#   - No blocked path violations
#   - git diff passes validation
```

### Step 5: Code Review

1. `git pull origin feature/antigravity-task-1.1`
2. Review code locally:
   ```bash
   npm run lint         # Check code style
   npm run test         # Run local tests
   npm run test:e2e     # Run E2E tests if applicable
   ```
3. Spot-check patterns match `.antigravity-skills.md`
4. Approve or request changes
5. Merge to master when ready: `git merge --squash feature/antigravity-task-1.1`

---

## 📊 Tracking Progress

### Completed Tasks Checklist

- [ ] Task 1.1: ImageGalleryPanel → PR #[X]
- [ ] Task 1.2: ModMetadataEditor → PR #[X]
- [ ] Task 1.3: Expand types.ts → PR #[X]
- [ ] Task 2.1: Vitest Suite → PR #[X]
- [ ] Task 2.2: 10 Guides → PR #[X]
- [ ] Task 3.1: E2E Tests → PR #[X]

**Update this list as tasks complete.**

---

## 🐛 Troubleshooting

### "Agent generated files in blocked paths"

**Cause:** Agent wrote to `src/electron/` or other forbidden directory

**Fix:**
1. The validation script rejected the commit automatically
2. Agent should see error message in console
3. Delete generated files and retry within allowed paths

### "TypeScript errors after agent generation"

**Cause:** Agent didn't follow type patterns or imported from blocked paths

**Fix:**
1. Review agent's imports—should only use `src/renderer/`, `src/shared/types.ts`
2. Check `.antigravity-skills.md` for proper type patterns
3. Ask agent to regenerate with corrections

### "Tests don't pass locally"

**Cause:** Agent generated tests but didn't run them

**Fix:**
1. Run tests: `npm run test`
2. Fix test failures (usually missing mocks or typos)
3. Or ask agent to regenerate with corrections

### "Code doesn't match PipBoy theme"

**Cause:** Agent used wrong colors or styling approach

**Fix:**
1. Reference color scheme in `.antigravity-skills.md`
2. Ask agent to rerestyle using TailwindCSS `text-green-400`, `bg-gray-900`, etc.

---

## 📋 Quality Checklist (Before Merge)

Before merging agent-generated code, verify:

- [ ] **Paths:** All files in allowed paths (check `.antigravity.config.json`)
- [ ] **Linting:** `npm run lint` passes
- [ ] **Tests:** `npm run test` passes (100% of agent tests)
- [ ] **Build:** `npm run build` succeeds
- [ ] **Pattern Match:** Code follows `.antigravity-skills.md` conventions
- [ ] **Security:** No IPC modifications, no env var access, no secrets in code
- [ ] **TypeScript:** Strict mode, all interfaces exported
- [ ] **Docs:** Components have JSDoc, guides follow format
- [ ] **Commit Message:** Clear, references task number
- [ ] **Branch:** On feature branch, not master

---

## 🔗 Key Files Reference

| File | Purpose |
|------|---------|
| `.antigravity.config.json` | Defines allowed/blocked paths & restrictions |
| `.antigravity-skills.md` | Teaches agents code patterns and conventions |
| `ANTIGRAVITY_AGENT_WORKFLOW.md` | This file - workflow & task templates |
| `scripts/validate-antigravity-paths.mjs` | Pre-push validation script |
| `CHANGES.md` | Sync guard - single source of truth for all changes |

---

## 🎓 Next Steps

1. **Download Antigravity** from your D: drive
2. **Point it to this repo** (`d:\Projects\desktop-tutorial\desktop-tutorial`)
3. **Assign Task 1.1** (ImageGalleryPanel) as first test
4. **Review output** and refine `.antigravity-skills.md` based on results
5. **Run validation** script and merge if passes
6. **Track progress** in "Completed Tasks Checklist" above
7. **Iterate** - assign Task 1.2, then Task 2.1, etc.

---

## 📞 Questions?

If you're stuck or need clarification:
1. Check `.antigravity-skills.md` for patterns
2. Review reference files linked in task templates
3. Re-read the Quick Rules section above
4. Ask the lead agent (GitHub Copilot) for guidance

Good luck! 🚀
