# Progress Marker
- Last completed page: Page 42 - Support Mossy
- Next page to add: Page 43 (pending)
- Notes: Add new page blocks as provided by user (title, image filename, page number, insert location).

# Mossy Onboarding Visual Guide

## Page Visuals

## How to Use This Guide

This guide explains every page in Mossy, what it is for, and how to use it. Each page section includes: what the page does, how to use it step-by-step, a quick map of UI parts, and beginner tips.

If you are brand new, start with the Newbie First Run Checklist below, then read the page sections in order.

## Newbie First Run Checklist

1. Open the home dashboard (Page 01) and confirm all health badges are green.
2. Run the First Success Wizard (Page 03) so your tools are detected.
3. Use Tools (Page 15) and Tool Verify (Page 39) to confirm paths and versions.
4. Run System Monitor (Page 25) to re-scan after installs.
5. Start a chat in AI Chat (Page 02) with a small, specific question.
6. Create your first project in Mod Projects (Page 06).
7. Generate a plan in Modding Roadmaps (Page 04).
8. Use Packaging and Release (Page 11) only after your tests pass.

## Common UI Patterns (What You Will See Often)

- Tools / Install / Verify: means you should confirm tool paths before continuing.
- Verify or Scan buttons: re-check tool detection or project health.
- Status badges: green is OK, yellow is fix soon, red is stop and repair.
- Logs or results panels: read errors first, then warnings.
- Save, Export, or Pin: store work so you can return quickly.

## If Something Feels Broken

1. Open System Monitor (Page 25) and run a scan.
2. Open Tool Verify (Page 39) and fix missing paths.
3. Check Desktop Bridge (Page 36) if tools will not connect.
4. Use Crash Triage (Page 10) and Diagnostic Tools (Page 41) for deeper checks.

## Where to Go Based on Your Goal

- I want to start a mod: Mod Projects (Page 06) and Modding Roadmaps (Page 04).
- I want to build a quest: Quest Mod Authorizing (Page 13) and The LoreKeeper (Page 14).
- I need to package: The Assembler (Page 18) and Packaging and Release (Page 11).
- I need to fix issues: The Auditor (Page 21) and Advanced Analysis (Page 23).
- I want to learn: Community Learning (Page 38) and Knowledge Search (Page 08).

## Page 01 - Mossy.Space (Home Dashboard)

![Page 01 - Mossy.Space](visual-guide-images/Page%20one.%20Mossy's%20space..png)

**What this page is for**
The Mossy.Space page is your home dashboard. It shows quick health signals (Electron, storage, vault, mic/tts), a short orientation panel, and your current system status so you can confirm the app is running correctly.

**How to use it**
1. Check the health badges at the top to confirm your environment is OK.
2. Read the Tools / Install / Verify panel for the recommended first steps.
3. Use the sidebar to jump to specific modules (Chat, Tools, Diagnostics, etc.).
4. Return here whenever you need a quick status check.

**Page functions (what each part does)**
- Health badges: show green/yellow/red status for core systems (Electron, storage, vault, mic/tts).
- Tools / Install / Verify panel: gives the next best action based on what is missing.
- System status strip: confirms the app is running and shows current state at a glance.
- Sidebar navigation: your main way to open any module or tool page.

**Beginner tips**
- If any badge shows WARN/BAD, open Diagnostics to see what is missing.
- Run the Install Wizard once so the tool paths are detected and saved.
- If Mic/TTS show WARN, check your OS permissions and refresh the page.

## Page 02 - AI Chat

![Page 02 - AI Chat](visual-guide-images/Page%20two.%20AI%20Chat..png)

**What this page is for**
The AI Chat page is the main conversation hub. Use it to ask questions, get modding help, generate text, and manage Mossy responses.

**How to use it**
1. Type your question in the message box and press Enter or click Send.
2. Use the toolbar buttons to toggle voice, copy responses, or clear the chat.
3. If you need a fresh start, use the reset/clear option to wipe the current thread.
4. Return here anytime you want direct help or step-by-step guidance.

**Page functions (what each part does)**
- Message box: where you write your question or command.
- Send action: submits the message to Mossy.
- Voice toggle: enables or disables voice features for the chat.
- Copy button: copies the most recent response for notes or sharing.
- Clear/reset: removes the current thread so you can start clean.

**Beginner tips**
- Start with a simple prompt like "Help me set up my first Fallout 4 mod".
- If a response is long, ask for a shorter checklist.
- For tool actions, confirm your Desktop Bridge is ONLINE.

## Page 03 - First Success Wizard

![Page 03 - First Success Wizard](visual-guide-images/Page%20three.%20First%20success..png)

**What this page is for**
The First Success Wizard is a fast onboarding checklist that gets your tools scanned, verified, and ready for real help.

**How to use it**
1. Run the System Monitor scan so Mossy can detect installed tools.
2. Verify tool paths and versions in Tool Verify.
3. Build the Knowledge Search index and add your own notes to the Memory Vault.
4. Ask your first question using a tight, specific prompt.

**Page functions (what each part does)**
- Step cards: each card is a required setup task in the right order.
- Step descriptions: explain why the step matters and where to click next.
- Example prompt box: shows a starter question format you can copy.
- Help button: opens the reference page if you are stuck.

**Beginner tips**
- If scans show missing tools, run the Install Wizard before continuing.
- Keep your first question narrow so Mossy can answer precisely.
- Add at least one personal note to the Memory Vault so results feel tailored.

## Page 04 - Modding Roadmaps

![Page 04 - Modding Roadmaps](visual-guide-images/Page%204%20Modding%20RoadMaps..png)

**What this page is for**
Modding Roadmaps turn a big idea into a clear checklist, with progress tracking and tool hints so you always know the next step.

**How to use it**
1. Click New Goal to open the goal input.
2. Type what you want to build (keep it specific) and press Enter.
3. Use the lightning button to generate a roadmap.
4. Open a roadmap card to see the full step-by-step path.
5. Click the circle icon on a step to mark it complete.
6. Use Back to Roadmap List to return to all your goals.

**Page functions (what each part does)**
- New Goal button: switches from list view to goal creation.
- Goal input field: where you describe the mod you want to make.
- Lightning button: asks Mossy to generate a roadmap from your goal.
- Roadmap cards: show each goal with a progress bar and completion count.
- Progress bar: visual percent of finished steps.
- Active Objective header: shows the selected roadmap title and goal.
- Step list: ordered tasks; each step includes a tool badge.
- Status icon: click to toggle a step between not started and completed.
- Tool badge: hints which app/tool is used for that step.
- Back to Roadmap List: returns to the grid view.

## Page 05 - What's New

![Page 05 - What's New](visual-guide-images/Page%205.%20What's%20New.png)

**What this page is for**
What's New is your release notes hub. It highlights new features, changes, and tips so you can quickly see what changed since your last visit.

**How to use it**
1. Read the Highlights list to understand the newest features.
2. Scan Navigation Tips for quick keyboard shortcuts and workflow hints.
3. Use the Back to Mossy button to return to your dashboard.
4. If you do not want to see this page automatically, disable the auto-open option at the bottom.

**Page functions (what each part does)**
- Highlights list: shows major new features and improvements.
- Update badge: confirms the page reflects the latest release notes.
- Navigation Tips: quick reminders for shortcuts and common flows.
- Stay in the loop section: explains how release notes are surfaced.
- Auto-open toggle: controls whether this page appears on startup.
- Continue to dashboard button: returns you to the main home screen.

## Page 06 - Mod Projects

![Page 06 - Mod Projects](visual-guide-images/Page%206%20mod%20projects..png)

**What this page is for**
Mod Projects is your project hub. It organizes mod plans, progress, and collaboration in one place so you can manage everything from idea to release.

**How to use it**
1. Click New Mod (or Create First Mod) to start a project.
2. Fill out the project basics and save.
3. Expand each step to follow the guided flow in order.
4. Review the tips panel before you begin work.
5. Return here to track progress or edit your project details.

**Page functions (what each part does)**
- Project Hub header: names the all-in-one flow and lists the recommended order.
- Step sections: collapsible stages that break work into smaller milestones.
- New Mod button: creates a fresh mod project entry.
- Project list: shows existing projects and their status.
- Tools / Install / Verify note: reminds you to confirm tool setup first.
- Tips panel: quick best practices for testing and iteration.
- Create First Mod button: shortcut when you have no projects yet.

## Page 07 - Quick Reference

![Page 07 - Quick Reference](visual-guide-images/Page%207.%20Quick%20reference.png)

**What this page is for**
Quick Reference is a fast lookup page for common actions, shortcuts, and first-aid steps when you are stuck. It is the place you open when you want immediate guidance without reading a full guide.

**How to use it**
1. Scan the top section to identify the category you need (setup, tools, chat, files, troubleshooting).
2. Click a card or link to jump to the exact help topic.
3. Use the quick actions to open Diagnostics, Tool Verify, or the Install Wizard.
4. Return here when you forget a shortcut or need a fast reminder.

**Page functions (what each part does)**
- Category tiles: group help by purpose (setup, tools, chat, assets, troubleshooting).
- Shortcut list: shows the most-used keyboard shortcuts and mouse tips.
- Quick actions: one-click links to common fixes (Diagnostics, Install Wizard, Refresh Index).
- Mini checklist: tiny, do-this-first steps for new users.

**Beginner tips**
- If something feels broken, start with Diagnostics from this page.
- Use the shortcuts list to speed up your workflow early.
- Keep this page open in another window while you learn the UI.

## Page 08 - Knowledge Search

![Page 08 - Knowledge Search](visual-guide-images/Page%208%20knowledge%20search..png)

**What this page is for**
Knowledge Search is the built-in library browser. It lets you search the guides, docs, and vault notes so you can find answers without leaving Mossy.

**How to use it**
1. Type a specific topic in the search bar (example: "precombine visibility" or "Papyrus OnInit").
2. Use filters to narrow results by type (guide, doc, tutorial, vault note).
3. Click a result to open the full page in the viewer.
4. Save useful pages to your favorites or vault for quick recall.

**Page functions (what each part does)**
- Search bar: your main input for finding topics.
- Filter chips: limit results to the content type you need.
- Result list: shows the title, snippet, and source.
- Preview panel: lets you read without leaving the search page.
- Save/Favorite action: stores key pages in your vault for later.

**Beginner tips**
- Use two or three keywords instead of a whole sentence.
- If results feel noisy, add the tool name ("xEdit", "CK", "Blender").
- Save your top 3 references so you can return in one click.

## Page 09 - Wizards

![Page 09 - Wizards](visual-guide-images/Page%209%20wizards..png)

**What this page is for**
Wizards is the guided workflow hub. Each wizard is a step-by-step flow that sets up tools, validates prerequisites, and walks you through complex tasks without guessing.

**How to use it**
1. Read the short summary at the top to understand the goal of the active wizard.
2. Follow the steps in order and mark each one complete before moving on.
3. Click a wizard card in the list to switch to a different workflow.
4. Use the suggested Tools / Install / Verify link if a prerequisite is missing.

**Page functions (what each part does)**
- Wizard header: shows the active wizard name and a one-line description.
- Step checklist: ordered tasks with short instructions and a progress state.
- Wizard list: categories like Crash Triage, Install Wizard, PRP Patch Builder.
- Tool hint line: points to required tools and verification shortcuts.
- Scrollable content area: keeps long workflows usable on one page.

**Beginner tips**
- Start with Install Wizard if you are brand new or tools are missing.
- If the app feels unstable, run Crash Triage before anything else.
- Stick to one wizard at a time so your progress stays consistent.

## Page 10 - Crash Triage

![Page 10 - Crash Triage](visual-guide-images/Page%2010%20crash%20triage..png)

**What this page is for**
Crash Triage is the stability first-aid station. It helps you confirm system health, verify tool paths, and diagnose crashes or freezes before you start modding work.

**How to use it**
1. Start with System Monitor to confirm core services are healthy.
2. Run the full scan so the app can detect missing tools or permissions.
3. Review integrations and external tools to confirm they are detected.
4. If something is missing, open Install Wizard or Tool Verify from the links.
5. Rerun the scan after fixes to make sure the issue is cleared.

**Page functions (what each part does)**
- Diagnostics header: shows the active triage hub and its purpose.
- System Monitor section: displays telemetry and module status.
- Full system scan: checks tool paths, permissions, and bridge status.
- Active integrations list: confirms detected software and plug-ins.
- External modding tools list: shows key apps and their launch state.
- Launch buttons: open a detected tool directly if configured.

**Beginner tips**
- Run Crash Triage first if the app feels slow or unstable.
- Green status means safe to continue; yellow means fix soon; red means stop and repair.
- If a tool shows "not detected", confirm install path in Tool Verify.

## Page 11 - Packaging and Release

![Page 11 - Packaging and Release](visual-guide-images/Page%2011.%20Packaging%20and%20release..png)

**What this page is for**
Packaging and Release is the final checkpoint before you publish. It walks you through packaging, sanity checks, test installs, and release notes so your mod ships cleanly.

**How to use it**
1. Follow the packaging checklist from top to bottom.
2. Open the Tools / Install / Verify links if a required tool is missing.
3. Build your archive or installer and run a clean test install.
4. Review the distribution choices and generate your release notes.
5. Only publish after the verification loop passes.

**Page functions (what each part does)**
- Packaging hub header: confirms you are in the release workflow.
- Checklist panel: ordered steps for packaging and validation.
- Tool links: quick opens for required tools like Archive2 or 7-Zip.
- Verify (quick): fast sanity checks to catch missing masters or bad paths.
- Distribution section: helps pick a release target and readiness level.
- Install & verify list: the minimum steps to prove your package works.

**Beginner tips**
- Always test in a clean profile before uploading.
- If assets are missing, re-check archive paths and file structure.
- Keep release notes short and list changes plus requirements.

## Page 12 - Animation Guide

![Page 12 - Animation Guide](visual-guide-images/Page%2012%20Animation%20Guide..png)

**What this page is for**
Animation Guide is the end-to-end pipeline page for Fallout 4 animations. It keeps the required tools, reference files, and validation steps in one ordered flow so you can build animations that import and play correctly in game.

**How to use it**
1. Use the Tools / Install / Verify list to confirm Blender and required add-ons.
2. Follow the pipeline steps in order, starting with reference skeleton setup.
3. Run the quick test loop before committing to a full animation set.
4. Use the troubleshooting notes if scale or bone names are wrong in game.

**Page functions (what each part does)**
- Pipeline header: explains the goal and the recommended order.
- Tools list: links to required downloads and add-ons.
- Verify (quick): small checks to confirm your environment is correct.
- Step cards: guide each stage (reference skeleton, export, conversion, test).
- Troubleshooting notes: common fixes for scale, bone names, and HKX issues.

**Beginner tips**
- Always start from the correct FO4 reference skeleton.
- Test a short clip first to validate scale and bone names.
- If animations do nothing in game, double-check export settings and target skeleton.

## Page 13 - Quest Mod Authorizing

![Page 13 - Quest Mod Authorizing](visual-guide-images/Page%2013.%20Quest%20mod%20authorizing.%20.png)

**What this page is for**
Quest Mod Authorizing is the all-in-one workflow hub for building a quest mod. It organizes your Creation Kit steps, validation checks, and first-test loop so you can create a working quest without missing required setup.

**How to use it**
1. Start with the Tools / Install / Verify list to confirm CK, xEdit, and a mod manager are detected.
2. Follow the Setup & First Test Loop checklist from top to bottom.
3. Use the minimal working quest steps to build the smallest playable quest first.
4. Run the quick validation steps before adding extra stages or dialogue.
5. Return to this page whenever you need the exact order of operations.

**Page functions (what each part does)**
- Header and workflow label: shows the quest authoring focus and the recommended order.
- Tools / Install / Verify block: lists required apps and where to get them safely.
- Setup & First Test Loop: the required setup to prove your toolchain works end-to-end.
- Minimal Working Quest list: the smallest quest that still runs in game.
- Validation notes: common checks to catch missing masters or bad stage setup.
- Troubleshooting hints: quick fixes for common failures (stages not firing, wrong plugin order).

**Beginner tips**
- Keep the first quest tiny: one start stage, one trigger, one objective.
- Test in a clean profile so you know your plugin is the only variable.
- If the quest never starts, check stage indexes and confirm the plugin is enabled.

## Page 14 - The LoreKeeper

![Page 14 - The LoreKeeper](visual-guide-images/Page%2014%20The%20LoreKeeper..png)

**What this page is for**
The LoreKeeper is your worldbuilding and canon guardrail. It helps you keep factions, timelines, locations, and character details consistent so your quest mod feels like it belongs in Fallout 4.

**How to use it**
1. Start by scanning the overview for the current lore scope (region, era, faction focus).
2. Use the sections to validate your quest premise against established canon.
3. Add notes or tags for anything you are inventing so you can track it later.
4. Cross-check names, dates, and locations before you write dialogue or objectives.
5. Return here when you need to confirm consistency or resolve conflicts.

**Page functions (what each part does)**
- Lore scope header: defines the setting boundaries your quest should respect.
- Faction references: lists key groups, goals, and relationships that impact your quest.
- Timeline notes: shows when major events occur so you can avoid contradictions.
- Location checks: helps verify places, ownership, and lore-accurate naming.
- Character consistency: ensures NPC backstories and motivations stay aligned.
- Custom notes area: tracks your original additions and why they fit.

**Beginner tips**
- If you invent something new, write a short justification so it stays consistent.
- Use the timeline before scripting events or dialogue.
- Keep a running list of names so you do not accidentally duplicate or conflict.

## Page 15 - Tools

![Page 15 - Tools](visual-guide-images/Page%2015%20tools..png)

**What this page is for**
Tools is your command center for launching and verifying the modding apps Mossy integrates with. It shows what is installed, what is missing, and gives you safe launch and config shortcuts.

**How to use it**
1. Scan the status list to see which tools are detected and ready.
2. Use the Install or Verify actions if a tool shows missing or unverified.
3. Click a tool card to open settings, launch it, or view version details.
4. Re-run detection after you install or move a tool.
5. Return here anytime a workflow says "Tools / Install / Verify".

**Page functions (what each part does)**
- Tools status list: shows installed, missing, or warning states.
- Tool cards: open details, config paths, and launch actions.
- Install links: jump to official sources or setup guides.
- Verify actions: check versions, paths, and required plug-ins.
- Refresh detection: re-scan your system for changes.
- Notes panel: explains why each tool matters in your workflow.

**Beginner tips**
- Verify tools right after installing so Mossy can detect paths.
- Keep tools in stable locations to avoid broken paths.
- If a tool is missing, install it before starting any wizard.

## Page 16 - Cosmos Workflow

![Page 16 - Cosmos Workflow](visual-guide-images/Page%2016%20Cosmos%20Workflow..png)

**What this page is for**
Cosmos Workflow is the structured pipeline for building larger, story-driven mods. It connects lore, quest design, asset creation, and testing into a single ordered flow so you can move from concept to playable build without losing track.

**How to use it**
1. Read the workflow header to understand the intended order of steps.
2. Start with the planning phase and confirm your lore and scope.
3. Move through each stage one at a time, completing checks before the next.
4. Use the tool hints to open the correct app for each step.
5. Return here whenever you are unsure what the next stage is.

**Page functions (what each part does)**
- Workflow header: describes the goal and overall sequence.
- Stage cards: group tasks by phase (plan, build, test, polish).
- Step checklists: show the exact actions to complete each stage.
- Tool hints: map steps to required software (CK, xEdit, Blender).
- Progress markers: help track what is done and what is next.
- Notes and warnings: call out common pitfalls before they happen.

**Beginner tips**
- Do not skip the planning stage; it prevents rework later.
- Keep builds small until your first end-to-end test passes.
- If you get stuck, jump back to Tools or Quick Reference for help.

## Page 17 - Dev Tools

![Page 17 - Dev Tools](visual-guide-images/Page%2017%20dev%20tools..png)

**What this page is for**
Dev Tools is the advanced utilities hub. It surfaces diagnostic, profiling, and automation helpers used to validate mods, inspect assets, and streamline repetitive tasks.

**How to use it**
1. Pick a tool category based on your current problem (debug, validate, optimize, automate).
2. Open a tool card to see what it does and how to run it safely.
3. Run a small test first, then expand to full scans or batch runs.
4. Save results and return here when you need deeper inspection.

**Page functions (what each part does)**
- Tool categories: groups utilities by purpose (diagnostics, validation, automation).
- Tool cards: open the utility, show inputs, and explain expected output.
- Run controls: start or stop a tool with clear status feedback.
- Output panel: shows logs, warnings, and next-step hints.
- Safety notes: explain when a tool can change files or needs backups.

**Beginner tips**
- Always back up before running batch or cleanup tools.
- Start with diagnostics before assuming a tool is broken.
- If a tool reports warnings, fix those before continuing your build.

## Page 18 - The Assembler

![Page 18 - The Assembler](visual-guide-images/Page%2018%20the%20assembler..png)

**What this page is for**
The Assembler is your build-and-bundle workspace. It helps you gather assets, validate structure, and assemble a clean, release-ready package without missing required files.

**How to use it**
1. Review the input list to confirm which folders and files are being included.
2. Run the structure checks to validate paths and required assets.
3. Use the assemble action to build your staging output.
4. Inspect the output summary for warnings before packaging.
5. Return here when you change assets or add new content.

**Page functions (what each part does)**
- Input sources list: shows what assets and plugins will be included.
- Structure checks: validates folder layout and required files.
- Assemble button: builds a clean staging output.
- Output summary: lists what was built and any warnings.
- Quick links: shortcuts to fixes (missing files, bad paths, failed checks).

**Beginner tips**
- Keep assets organized before assembling to avoid missing references.
- Fix warnings early; they often become in-game errors later.
- Rebuild the staging output after any asset change.

## Page 19 - The Workshop

![Page 19 - The Workshop](visual-guide-images/Page%2019%2C%20the%20workshop..png)

**What this page is for**
The Workshop is your hands-on creation space. It is where you shape assets, configure files, and iterate quickly before sending content to packaging or release.

**How to use it**
1. Pick the task area you need (assets, scripts, UI, or testing).
2. Follow the checklist in order so changes stay organized.
3. Use the quick actions to open the right tool for each task.
4. Validate changes after each small iteration.
5. Return here whenever you need to refine or polish content.

**Page functions (what each part does)**
- Task area list: groups workshop work by type (assets, scripts, UI, testing).
- Step checklist: ordered actions to keep changes consistent.
- Tool shortcuts: one-click open to the tool used for that task.
- Status notes: show which steps are done or still pending.
- Output preview: quick view of recent changes or builds.

**Beginner tips**
- Make small changes and test often.
- Keep notes on what you changed so you can undo or repeat.
- If a step is unclear, jump to Quick Reference for a fast reminder.

## Page 20 - The Blueprint

![Page 20 - The Blueprint](visual-guide-images/Page%2020%20the%20blueprint..png)

**What this page is for**
The Blueprint is the planning and specification page. It helps you define scope, dependencies, and required assets before you build, so your mod stays consistent and manageable.

**How to use it**
1. Start with the scope section to define what the mod will and will not include.
2. List required tools, assets, and plugins you plan to depend on.
3. Break the work into stages you can complete and test individually.
4. Use the checklist to validate that your plan is realistic.
5. Return here whenever you change the project direction.

**Page functions (what each part does)**
- Scope definition: documents the boundaries of the mod.
- Dependencies list: tracks required tools, DLC, and other mods.
- Asset inventory: names the files and resources you must create.
- Milestone checklist: splits the plan into testable steps.
- Risk notes: flags known problems before you start building.

**Beginner tips**
- Keep the first blueprint small; you can expand later.
- If you add a dependency, note why it is required.
- Use the milestones as checkpoints for playtests.

## Page 21 - The Auditor

![Page 21 - The Auditor](visual-guide-images/Page%2021%20the%20auditor..png)

**What this page is for**
The Auditor is your quality control checkpoint. It scans assets, plugins, and references to detect errors early, so you can fix issues before packaging or release.

**How to use it**
1. Choose what you want to audit (plugin, assets, or full project).
2. Run the scan and wait for the report to finish.
3. Review errors first, then warnings, then informational notes.
4. Use the suggested fixes or jump to the linked tools.
5. Re-run the audit after each fix to confirm it is clean.

**Page functions (what each part does)**
- Audit targets: lets you pick what to scan.
- Run audit button: starts the validation process.
- Results list: groups errors, warnings, and notes.
- Fix suggestions: gives next steps or tool links.
- Export report: saves results for tracking or sharing.

**Beginner tips**
- Always fix errors before moving on to packaging.
- Do not ignore warnings; they often become in-game bugs.
- Audit after any large content change or merge.

## Page 22 - Mining Dashboard

![Page 22 - Mining Dashboard](visual-guide-images/Page%2022%20Mining%20dashboard..png)

**What this page is for**
Mining Dashboard is the data discovery hub. It helps you scan docs, files, and references to surface useful patterns, common fixes, and related topics for your current modding task.

**How to use it**
1. Select a source or topic to mine (guides, vault notes, tool logs).
2. Run a scan to build a summary of relevant insights.
3. Review the highlights and open any linked references.
4. Save useful findings to your vault or project notes.
5. Re-run mining when your focus changes.

**Page functions (what each part does)**
- Source picker: choose which content to scan.
- Run mining button: starts the discovery process.
- Highlights panel: shows the most relevant findings first.
- Related links: jumps to full guides or notes.
- Save to vault: stores insights for later use.

**Beginner tips**
- Mine a narrow topic first for cleaner results.
- Save the top 3 findings so you can reuse them later.
- If results feel broad, add a tool name or keyword.

## Page 23 - Advanced Analysis

![Page 23 - Advanced Analysis](visual-guide-images/Page%2023%20Advanced%20Analysis.png)

**What this page is for**
Advanced Analysis is the deep-dive diagnostics area. It helps you inspect complex issues across plugins, assets, and workflows so you can pinpoint root causes and plan precise fixes.

**How to use it**
1. Choose the analysis type that matches your problem (plugin, asset, performance, or consistency).
2. Set the scope so the scan stays focused and fast.
3. Run the analysis and review the grouped results.
4. Drill into any flagged item to see details and recommended actions.
5. Re-run after fixes to confirm the issue is resolved.

**Page functions (what each part does)**
- Analysis type selector: picks the tool or method for the scan.
- Scope controls: limit the scan to specific files or folders.
- Results explorer: groups findings by severity and category.
- Detail panel: shows why a flag occurred and how to fix it.
- Export option: saves results for tracking or sharing.

**Beginner tips**
- Start with a narrow scope to avoid noisy results.
- Fix errors first, then tackle warnings.
- Keep notes on changes so you can compare results after re-runs.

## Page 24 - The Scribe

![Page 24 - The Scribe](visual-guide-images/Page%2024%20The%20Scribe..png)

**What this page is for**
The Scribe is your writing and documentation workspace. It helps you draft quest dialogue, notes, changelogs, and internal documentation so your mod stays consistent and easy to maintain.

**How to use it**
1. Choose the writing task you need (dialogue, notes, changelog, or documentation).
2. Use the templates to keep formatting consistent.
3. Draft text in small sections and review for clarity and lore accuracy.
4. Save or export your text to your project notes.
5. Return here whenever you need to update or polish written content.

**Page functions (what each part does)**
- Writing templates: structured formats for dialogue and docs.
- Draft editor: the main area to write and edit text.
- Reference links: quick access to lore or quest data.
- Version notes: tracks changes between drafts.
- Export options: saves text to your vault or project files.

**Beginner tips**
- Keep dialogue short and test it in game early.
- Use consistent naming across notes and scripts.
- Write a quick changelog after each major edit.

## Page 25 - System Monitor

![Page 25 - System Monitor](visual-guide-images/Page%2025%20System%20Monitor..png)

**What this page is for**
System Monitor shows the live health of Mossy and your modding environment. It tracks bridge status, tool detection, and system signals so you can confirm everything is ready before you build.

**How to use it**
1. Check the main status tiles for green/yellow/red indicators.
2. Run a full scan if you just installed or moved tools.
3. Review each module status to see what is missing or misconfigured.
4. Use the quick links to fix issues (Install Wizard, Tool Verify).
5. Return here whenever something feels slow or unstable.

**Page functions (what each part does)**
- Status tiles: quick health view for core systems.
- Full scan button: re-checks tools, paths, and permissions.
- Module list: shows which integrations are detected and active.
- Error details: explains why a status is warning or failed.
- Quick fix links: jumps to the exact tool to resolve a problem.

**Beginner tips**
- Always run a scan after changing tool installs.
- Yellow means fix soon; red means stop and repair before continuing.
- If the bridge is offline, restart Mossy before troubleshooting deeper.

## Page 26 - The Orchestrator

![Page 26 - The Orchestrator](visual-guide-images/Page%2026%20the%20Orchestrator..png)

**What this page is for**
The Orchestrator coordinates complex, multi-tool workflows. It keeps long processes in order, tracks dependencies, and makes sure each stage runs in the correct sequence.

**How to use it**
1. Select the workflow you want to run (build, test, package, or diagnose).
2. Review the dependency list and confirm all required tools are online.
3. Start the run and monitor each stage as it completes.
4. Pause if a step fails, fix the issue, then resume.
5. Save the run log for later reference.

**Page functions (what each part does)**
- Workflow selector: chooses the multi-step process to run.
- Dependency checklist: confirms required tools and data are ready.
- Stage runner: executes each step in order with status feedback.
- Log panel: records actions, warnings, and errors.
- Resume controls: let you continue after fixing a problem.

**Beginner tips**
- Start with a shorter workflow before running a full build pipeline.
- Do not skip failed steps; fix and resume to keep results clean.
- Keep logs from successful runs so you can repeat them later.

## Page 27 - Workflow Runner

![Page 27 - Workflow Runner](visual-guide-images/Page%2027%20workflow%20runner..png)

**What this page is for**
Workflow Runner is the execution console for predefined tasks. It lets you run a specific workflow end-to-end while showing live progress, outputs, and any required actions.

**How to use it**
1. Select the workflow you want to execute.
2. Review the steps list so you know what will run.
3. Click Run to start and monitor progress in the status panel.
4. If a step fails, open the details, fix the issue, and retry that step.
5. Save or export the run log when complete.

**Page functions (what each part does)**
- Workflow picker: chooses which task sequence to run.
- Steps list: shows each action and its current status.
- Run controls: start, pause, or retry steps.
- Live output panel: displays logs and results as they happen.
- Action hints: gives fix guidance when a step fails.

**Beginner tips**
- Run one workflow at a time to avoid conflicts.
- Read the steps first so you are not surprised by tool prompts.
- Save logs from failed runs to help troubleshooting.

## Page 28 - The Holodeck

![Page 28 - The Holodeck](visual-guide-images/Page%2028.%20The%20holodeck..png)

**What this page is for**
The Holodeck is your safe test space. It lets you simulate workflows, preview outcomes, and run sandbox checks before you commit changes to your live project.

**How to use it**
1. Choose the scenario you want to simulate (build, test, or packaging).
2. Configure the inputs to match your real project state.
3. Run the simulation and watch the results panel.
4. Review any warnings or failures and adjust your plan.
5. Apply the fixes in your real project only after the simulation passes.

**Page functions (what each part does)**
- Scenario selector: picks the type of simulation to run.
- Input configuration: sets mock data or paths for the test.
- Run simulation button: starts the sandbox process.
- Results panel: shows success, warnings, and errors.
- Action recommendations: suggests what to fix before going live.

**Beginner tips**
- Use the holodeck before big changes or releases.
- Treat warnings as signals to improve stability.
- Keep test inputs close to your real setup for accurate results.

## Page 29 - The Vault

![Page 29 - The Vault](visual-guide-images/Page%2029%20the%20Vault..png)

**What this page is for**
The Vault is your personal knowledge store. It keeps notes, saved answers, references, and project context so you can reuse what you learn across multiple modding sessions.

**How to use it**
1. Use the search bar to find saved notes or references.
2. Create a new note for each major decision or fix.
3. Tag notes by tool, topic, or project.
4. Pin your most important references for quick access.
5. Update notes after you discover better fixes or workflows.

**Page functions (what each part does)**
- Search and filter: find notes by keyword or tag.
- Note list: shows all saved entries with dates.
- Note editor: write or update your saved knowledge.
- Tags and folders: organize by project or tool.
- Pinning: keep top references at the top of the list.

**Beginner tips**
- Write down fixes the moment you solve a problem.
- Use consistent tags so searches stay fast.
- Keep one note per issue so it is easy to update later.

## Page 30 - BA2 Manager

![Page 30 - BA2 Manager](visual-guide-images/Page%2030%20BA2%20Manager..png)

**What this page is for**
BA2 Manager handles Fallout 4 archive files. It helps you pack, inspect, and verify BA2 archives so your assets load correctly in game.

**How to use it**
1. Choose whether you want to build a new BA2 or inspect an existing one.
2. Add the folders or files you want to include.
3. Run the build and review the archive summary.
4. Use the verify option to confirm paths and asset types.
5. Rebuild the archive whenever you update assets.

**Page functions (what each part does)**
- Build section: create new BA2 archives from selected assets.
- Inspect section: open an existing BA2 to review contents.
- Verify checks: validates paths, file types, and missing assets.
- Output settings: controls archive name and location.
- Log panel: shows warnings and build results.

**Beginner tips**
- Keep textures, meshes, and materials in the correct folder structure.
- Verify after every build to catch missing files early.
- Use clear archive names so you can identify them later.

## Page 31 - Workflow Recorder

![Page 31 - Workflow Recorder](visual-guide-images/Page%2031.%20Workflow%20recorder..png)

**What this page is for**
Workflow Recorder captures your steps as you work so you can replay, share, or automate them later. It helps turn your manual process into a repeatable workflow.

**How to use it**
1. Click Record to start capturing your actions.
2. Perform the steps you want to reuse or document.
3. Click Stop and review the recorded sequence.
4. Edit or label steps so they are clear.
5. Save the workflow for reuse in Workflow Runner.

**Page functions (what each part does)**
- Record controls: start, pause, and stop capturing.
- Step list: shows each captured action in order.
- Step editor: rename or remove steps.
- Save workflow: stores the sequence for later playback.
- Export option: share or back up the workflow.

**Beginner tips**
- Record short sequences first so they are easy to debug.
- Add labels that describe why each step matters.
- Test the recorded workflow once before relying on it.

## Page 32 - Plugin Manager

![Page 32 - Plugin Manager](visual-guide-images/Page%2032.%20Plugin%20manager..png)

**What this page is for**
Plugin Manager helps you organize and validate your ESP/ESM/ESL files. It keeps load order clean, highlights conflicts, and ensures required masters are present before you test.

**How to use it**
1. Review the plugin list to see what is active and in what order.
2. Enable or disable plugins as needed for your current test.
3. Check for missing masters or conflicts shown in warnings.
4. Use the sort or rules controls to keep load order stable.
5. Save your load order before launching the game.

**Page functions (what each part does)**
- Plugin list: shows all detected ESP/ESM/ESL files.
- Status indicators: flags missing masters or conflicts.
- Enable/disable toggles: control which plugins are active.
- Load order tools: sort, lock, or apply rules.
- Save/load profiles: store different setups for testing.

**Beginner tips**
- Keep only the plugins you need active for testing.
- Fix missing masters before launching the game.
- Save a clean baseline profile you can return to.

## Page 33 - Local Capabilities

![Page 33 - Local Capabilities](visual-guide-images/Page%2033.%20Local%20capabilities..png)

**What this page is for**
Local Capabilities shows what Mossy can do on your machine right now. It summarizes detected tools, available integrations, and permissions so you know which features are ready to use.

**How to use it**
1. Scan the capability list to see what is enabled, limited, or unavailable.
2. Check permissions and paths if a capability is missing.
3. Use the fix links to enable a capability safely.
4. Re-scan after installing or moving tools.
5. Return here when a feature says it is not available.

**Page functions (what each part does)**
- Capability list: shows features and their current readiness.
- Status badges: indicate OK, warning, or missing states.
- Permission details: explains what access is required.
- Fix links: point to Install Wizard or Tool Verify.
- Refresh scan: re-checks your system for changes.

**Beginner tips**
- Capabilities depend on installed tools and permissions.
- Fix warnings before starting complex workflows.
- Use this page as your first check when a feature is disabled.

## Page 34 - Image Studio

![Page 34 - Image Studio](visual-guide-images/Page%2034%20image%20Studio..png)

**What this page is for**
Image Studio is your texture and UI art workspace. It helps you prepare images for Fallout 4 by resizing, converting formats, and validating texture rules before you ship.

**How to use it**
1. Import a texture or UI image you want to edit.
2. Choose the target format and size needed for the game.
3. Run the conversion or optimization step.
4. Preview the result and check for artifacts.
5. Save the output to the correct folder path.

**Page functions (what each part does)**
- Import panel: selects images to process.
- Format selector: sets DDS or other required output types.
- Size and mip settings: controls resolution and mipmap generation.
- Preview window: shows the processed result before saving.
- Export controls: saves to a chosen folder with correct naming.

**Beginner tips**
- Use power-of-two sizes for textures (512, 1024, 2048).
- Always preview before saving to avoid compression artifacts.
- Keep a backup of the original source image.

## Page 35 - Live Synapse

![Page 35 - Live Synapse](visual-guide-images/Page%2035%20Live%20Synapse..png)

**What this page is for**
Live Synapse is the real-time activity feed. It monitors tool activity, file changes, and workflow events so you can see what Mossy is detecting as you work.

**How to use it**
1. Watch the live feed while you open tools or change files.
2. Use filters to focus on the event type you care about.
3. Click an event to view details or jump to the source.
4. Pause the feed if it is too noisy.
5. Export logs when troubleshooting.

**Page functions (what each part does)**
- Live event feed: shows real-time activity and detections.
- Filters: narrow events by tool, file, or severity.
- Event detail panel: explains what changed and why it matters.
- Pause/resume: controls the flow of incoming events.
- Export log: saves a timeline for later review.

**Beginner tips**
- Use filters to reduce noise when debugging.
- If nothing appears, confirm your integrations are enabled.
- Export logs before asking for help.

## Page 36 - Desktop Bridge

![Page 36 - Desktop Bridge](visual-guide-images/Page%2036%2C%20Desktop%20Bridge..png)

**What this page is for**
Desktop Bridge is the connection layer between Mossy and your installed tools. It manages permissions, detects running apps, and enables safe automation.

**How to use it**
1. Check the bridge status to confirm it is online.
2. Review the detected tools list and permissions.
3. Grant access to the tools you want Mossy to use.
4. Use the test actions to confirm the bridge can launch or talk to tools.
5. Return here if any automation or tool actions fail.

**Page functions (what each part does)**
- Bridge status indicator: shows online/offline state.
- Detected tools list: confirms connected apps.
- Permissions panel: manages access controls.
- Test actions: verifies communication with tools.
- Troubleshooting hints: common fixes if the bridge is offline.

**Beginner tips**
- Keep the bridge online before running workflows.
- Only grant permissions for tools you actively use.
- If a tool is missing, re-scan in System Monitor.

## Page 37 - Duplicate Finder

![Page 37 - Duplicate Finder](visual-guide-images/Page%2037.%20Duplicate.%20Finder..png)

**What this page is for**
Duplicate Finder helps you detect repeated or conflicting assets. It scans files and plugins to find duplicates so you can avoid wasted space and in-game overrides you did not intend.

**How to use it**
1. Choose what you want to scan (assets, plugins, or full project).
2. Run the duplicate scan and wait for results.
3. Review duplicates by category and decide what to keep.
4. Use the suggested actions to remove or merge duplicates.
5. Re-scan after cleanup to confirm it is resolved.

**Page functions (what each part does)**
- Scan scope selector: targets specific folders or plugins.
- Run scan button: starts detection.
- Results list: groups duplicates by type and location.
- Action hints: suggests which file to keep or remove.
- Export report: saves the duplicate list for review.

**Beginner tips**
- Duplicates can cause texture or mesh overrides.
- Always back up before removing files.
- Rebuild archives after deleting duplicates.

## Page 38 - Community Learning

![Page 38 - Community Learning](visual-guide-images/Page%2038.%20Community%20learning..png)

**What this page is for**
Community Learning is the shared knowledge hub. It helps you discover tutorials, proven workflows, and community tips so you can learn faster and avoid common mistakes.

**How to use it**
1. Browse the featured topics or search for a specific tool or problem.
2. Open a guide to read the full steps.
3. Save useful entries to your Vault for quick access.
4. Use the filters to narrow by difficulty or category.
5. Return here when you want new ideas or troubleshooting help.

**Page functions (what each part does)**
- Featured topics: highlights popular or recommended guides.
- Search bar: find specific community content.
- Filters: narrow by tool, difficulty, or topic.
- Guide list: shows titles with brief summaries.
- Save action: adds a guide to your Vault.

**Beginner tips**
- Start with beginner-tagged guides to avoid overload.
- Save anything that solves a current problem.
- Compare two guides if steps conflict.

## Page 39 - Tool Verify

![Page 39 - Tool Verify](visual-guide-images/Page%2039%20Tool%20verify..png)

**What this page is for**
Tool Verify confirms your external modding tools are installed correctly. It checks paths, versions, and required components so workflows can run without errors.

**How to use it**
1. Review the list of required tools and their status.
2. Click Verify to run checks on paths and versions.
3. Fix any errors using the suggested actions.
4. Re-run Verify to confirm issues are resolved.
5. Return here after any install or update.

**Page functions (what each part does)**
- Tool list: shows required apps and detection status.
- Verify button: runs validation checks.
- Status details: explains missing files or mismatched versions.
- Fix links: open setup guides or settings.
- Refresh scan: re-checks after changes.

**Beginner tips**
- Verify tools before starting any wizard.
- Keep tool installs in stable locations to avoid broken paths.
- If verification fails, use Install Wizard or Settings to update paths.

## Page 40 - Settings

![Page 40 - Settings](visual-guide-images/Page%2039%20settings..png)

**What this page is for**
Settings is where you customize how Mossy behaves. It controls preferences like integrations, storage, privacy options, and UI defaults so the app matches your workflow.

**How to use it**
1. Review the sections to see what you can configure.
2. Update paths, permissions, and integrations as needed.
3. Adjust UI or accessibility options for comfort.
4. Save or apply changes and test a workflow to confirm.
5. Return here after installing new tools or changing hardware.

**Page functions (what each part does)**
- Integrations: toggle connections to external tools.
- Paths and storage: set where Mossy stores data and scans files.
- Privacy controls: manage data sharing and local-only options.
- UI preferences: change display or behavior settings.
- Reset options: restore defaults if something breaks.

**Beginner tips**
- Only enable integrations you plan to use.
- Keep storage paths in a safe, backed-up location.
- If something feels off, reset that section and reconfigure.

## Page 41 - Diagnostic Tools

![Page 41 - Diagnostic Tools](visual-guide-images/Page%2041%20Diagnostic%20Tools..png)

**What this page is for**
Diagnostic Tools provides focused utilities to troubleshoot problems. It helps you isolate crashes, missing assets, and tool integration issues before they block your workflow.

**How to use it**
1. Pick the diagnostic tool that matches your problem.
2. Run the check and watch the results panel.
3. Follow the recommended fixes or open linked tools.
4. Re-run the diagnostic to confirm the fix worked.
5. Save or export the report if you need to share it.

**Page functions (what each part does)**
- Tool list: groups diagnostics by problem type.
- Run controls: start and stop checks safely.
- Results panel: shows errors, warnings, and next steps.
- Fix links: jump to the exact repair flow.
- Export report: saves results for later review.

**Beginner tips**
- Start with the simplest diagnostic first.
- Fix errors before chasing warnings.
- Keep reports for issues that repeat.

## Page 42 - Support Mossy

![Page 42 - Support Mossy](visual-guide-images/Page%2042%20support%20Mossy..png)

**What this page is for**
Support Mossy is the community support and sustainability page. It explains how you can contribute, share feedback, and help keep the project active.

**How to use it**
1. Read the support options to see what fits your situation.
2. Choose a method (donation, feedback, or sharing).
3. Follow the provided link or steps to complete support.
4. Return here any time you want to contribute or report issues.

**Page functions (what each part does)**
- Support options list: outlines ways to help.
- Contribution links: opens the official support channels.
- Feedback section: directs you to report bugs or ideas.
- Community notes: explains how contributions are used.

**Beginner tips**
- Feedback is just as valuable as donations.
- Share clear bug reports with steps to reproduce.
- Support only through official links.

## Onboarding Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│  USER LAUNCHES MOSSY FOR FIRST TIME                         │
└─────────────────────────┬───────────────────────────────────┘
                          │
                          ↓
        ┌─────────────────────────────────────┐
        │ Check localStorage flag:             │
        │ 'mossy_onboarding_completed'        │
        └─────────┬──────────────────┬────────┘
                  │                  │
         NOT FOUND│              FOUND
                  │                  │
        ┌─────────↓────────┐  ┌──────↓──────────────┐
        │ SHOW ONBOARDING  │  │ LOAD APP NORMALLY   │
        │ MODAL (OVERLAY)  │  │ Skip onboarding     │
        └────────┬─────────┘  └─────────────────────┘
                 │
                 ↓
    ┌────────────────────────────────────────┐
    │ STEP 1: WELCOME TO MOSSY               │
    ├────────────────────────────────────────┤
    │ ┌──────────────────────────────────────┐│
    │ │ 👋 Hello, Vault Dweller!             ││
    │ │                                      ││
    │ │ I'm Mossy, your AI assistant        ││
    │ │                                      ││
    │ │ Setup Steps:                         ││
    │ │ ✓ Welcome & Introduction             ││
    │ │ ✓ Connect Your Tools                 ││
    │ │ ✓ Privacy Settings                   ││
    │ │ ✓ You're All Set!                    ││
    │ │                                      ││
    │ │ [Previous] [Progress] [Next →]       ││
    │ └──────────────────────────────────────┘│
    └────────────────────────────────────────┘
                 │
    (user clicks Next)
                 │
                 ↓
    ┌────────────────────────────────────────┐
    │ STEP 2: CONNECT YOUR TOOLS              │
    ├────────────────────────────────────────┤
    │ ┌──────────────────────────────────────┐│
    │ │ Select which tools you have:         ││
    │ │                                      ││
    │ │ ☐ Creation Kit                       ││
    │ │ ☑ xEdit                              ││
    │ │ ☑ Blender                            ││
    │ │ ☐ NifSkope                           ││
    │ │ ☐ Papyrus Compiler                   ││
    │ │ ☐ Wrye Bash                          ││
    │ │                                      ││
    │ │ [Previous] [Progress] [Next →]       ││
    │ └──────────────────────────────────────┘│
    │                                          │
    │ (Selections saved to localStorage)      │
    └────────────────────────────────────────┘
                 │
    (user clicks Next)
                 │
                 ↓
    ┌────────────────────────────────────────┐
    │ STEP 3: YOUR PRIVACY SETTINGS           │
    ├────────────────────────────────────────┤
    │ ┌──────────────────────────────────────┐│
    │ │ 🔒 Privacy First                     ││
    │ │ All data stays local by default      ││
    │ │                                      ││
    │ │ Data Storage:                        ││
    │ │ [●] Keep All Data Local              ││
    │ │     All data stays on your computer  ││
    │ │                                      ││
    │ │ Knowledge Sharing (Optional):        ││
    │ │ [○] Contribute to Knowledge Base     ││
    │ │ [○] Share Script Patterns            ││
    │ │ [○] Share Mesh Optimizations         ││
    │ │                                      ││
    │ │ Quality:                             ││
    │ │ [○] Share Bug Reports                ││
    │ │                                      ││
    │ │ [Previous] [Progress] [Next →]       ││
    │ └──────────────────────────────────────┘│
    │                                          │
    │ (All settings saved immediately)        │
    └────────────────────────────────────────┘
                 │
    (user clicks Next)
                 │
                 ↓
    ┌────────────────────────────────────────┐
    │ STEP 4: YOU'RE ALL SET!                 │
    ├────────────────────────────────────────┤
    │ ┌──────────────────────────────────────┐│
    │ │ ✓ Setup Complete!                    ││
    │ │                                      ││
    │ │ ✓ 2 tools connected                  ││
    │ │ ✓ Privacy settings configured        ││
    │ │ ✓ Your data is secure                ││
    │ │                                      ││
    │ │ Next Steps:                          ││
    │ │ 1. Create your first mod project     ││
    │ │ 2. Start a conversation with Mossy  ││
    │ │ 3. Get help with modding!            ││
    │ │                                      ││
    │ │ [Previous] [Start Using Mossy →]     ││
    │ └──────────────────────────────────────┘│
    │                                          │
    │ (Flag set: mossy_onboarding_completed)  │
    └────────────────────────────────────────┘
                 │
    (user clicks "Start Using Mossy")
                 │
                 ↓
    ┌─────────────────────────────────────────┐
    │ APP LOADS NORMALLY                       │
    │                                          │
    │ ┌──────────────────────────────────────┐│
    │ │ Sidebar:                              ││
    │ │ • The Nexus                           ││
    │ │ • Talk to Mossy                       ││
    │ │ • ...other modules...                 ││
    │ │ • Privacy Settings     ← NEW!         ││
    │ │                                       ││
    │ │ Main Content:                         ││
    │ │ [Mossy Dashboard - Hero Section]      ││
    │ │                                       ││
    │ │ User can now use Mossy!               ││
    │ └──────────────────────────────────────┘│
    └─────────────────────────────────────────┘
```

## Privacy Settings Page Diagram

```
┌────────────────────────────────────────────────────────────────┐
│ PRIVACY & DATA SETTINGS                                        │
├────────────────────────────────────────────────────────────────┤
│                                                                 │
│ 🛡️ MOSSY'S PRIVACY PROMISE                                    │
│ ┌───────────────────────────────────────────────────────────┐  │
│ │ ✓ Your data is yours                                      │  │
│ │ ✓ We never sell or monetize                              │  │
│ │ ✓ Permission required before sharing                     │  │
│ │ ✓ Local storage is primary                               │  │
│ │ ✓ Transparent & anonymized sharing                       │  │
│ └───────────────────────────────────────────────────────────┘  │
│                                                                 │
├────────────────────────────────────────────────────────────────┤
│ 💾 DATA STORAGE                                                │
├────────────────────────────────────────────────────────────────┤
│                                                                 │
│ 🔒 Keep All Data Local                                        │
│    [●════════════════════════════════════════════════○]        │
│    Store all data exclusively on your computer                │
│    ℹ️ Recommended for maximum privacy                          │
│                                                                 │
├────────────────────────────────────────────────────────────────┤
│ 📚 KNOWLEDGE BASE CONTRIBUTIONS                                │
├────────────────────────────────────────────────────────────────┤
│                                                                 │
│ 📖 Contribute to Shared Knowledge Base                        │
│    [○════════════════════════════════════════════════●]        │
│    Share patterns that help all Mossy users                   │
│    ℹ️ No personal data included                                │
│                                                                 │
│    📄 Share Script Patterns                   [Learn more ▼]  │
│    [○════════════════════════════════════════════════●]        │
│    Papyrus patterns and techniques                            │
│    ℹ️ Requires Knowledge Base to be enabled                    │
│                                                                 │
│    🎨 Share Mesh Optimizations                [Learn more ▼]  │
│    [○════════════════════════════════════════════════●]        │
│    3D optimization techniques                                 │
│    ℹ️ Requires Knowledge Base to be enabled                    │
│                                                                 │
├────────────────────────────────────────────────────────────────┤
│ ✨ QUALITY & SUPPORT                                           │
├────────────────────────────────────────────────────────────────┤
│                                                                 │
│ 🐛 Share Bug Reports                          [Learn more ▼]  │
│    [○════════════════════════════════════════════════●]        │
│    Help improve Mossy for everyone                            │
│    ℹ️ Reviewed for privacy before analysis                     │
│                                                                 │
├────────────────────────────────────────────────────────────────┤
│ ⚙️ DATA MANAGEMENT                                             │
├────────────────────────────────────────────────────────────────┤
│                                                                 │
│ Local Storage Used: 2.45 MB                                   │
│ (Project data, conversations, settings)                       │
│                                                                 │
│ Encryption: ✓ Enabled                                        │
│ Your local data is encrypted at rest                          │
│                                                                 │
│ [Export My Data]  [Delete All Local Data]                    │
│                                                                 │
└────────────────────────────────────────────────────────────────┘
```

## Sidebar Navigation Update

```
┌─────────────────────────────────┐
│       MOSSY.AI 🟢               │
│     (Avatar core)               │
├─────────────────────────────────┤
│                                  │
│ The Nexus                        │
│ Talk to Mossy                    │
│ The Organizer                    │
│ The Assembler                    │
│ ...other modules...              │
│                                  │
│ System Map                       │
│ Live Voice                       │
│ Desktop Bridge                   │
│ Privacy Settings        ← NEW!   │  ⚙️ Users click here
│                                  │      to access full
├─────────────────────────────────┤      privacy control
│ v2.4.2        [🔴 Theme Toggle]  │
└─────────────────────────────────┘
```

## Data Storage Visualization

```
USER'S COMPUTER (Protected)
┌──────────────────────────────────────────────────┐
│                                                   │
│  🔒 ENCRYPTED LOCAL STORAGE                      │
│  ┌────────────────────────────────────────────┐  │
│  │ Key: Value                                 │  │
│  ├────────────────────────────────────────────┤  │
│  │ mossy_onboarding_completed:  "true"        │  │
│  │ mossy_privacy_settings: {                  │  │
│  │   keepLocalOnly: true,                     │  │
│  │   shareScriptPatterns: false,              │  │
│  │   shareMeshOptimizations: false,           │  │
│  │   shareBugReports: false,                  │  │
│  │   ...                                      │  │
│  │ }                                          │  │
│  │ mossy_connections: [                       │  │
│  │   { id: "xedit", selected: true },         │  │
│  │   { id: "blender", selected: true },       │  │
│  │   ...                                      │  │
│  │ ]                                          │  │
│  │ mossy_projects: [{...}, {...}]             │  │
│  │ mossy_conversations: [{...}, {...}]        │  │
│  │ [User's personal mod files & projects]     │  │
│  │                                            │  │
│  └────────────────────────────────────────────┘  │
│                                                   │
│  ALL DATA STAYS HERE UNLESS USER CHOOSES        │
│  TO SHARE (opt-in only)                         │
│                                                   │
└──────────────────────────────────────────────────┘
                      │
        ┌─────────────┴─────────────┐
        │                            │
        ▼                            ▼
   ┌─────────────┐          ┌──────────────────┐
   │  PRIVACY    │          │  IF USER OPTS IN │
   │  SETTINGS   │          │  TO SHARING:     │
   │  BLOCK IT   │          │  ANONYMIZE &     │
   │             │          │  SEND TO CLOUD   │
   └─────────────┘          └──────────────────┘
                                     │
                                     ▼
                        ┌──────────────────────┐
                        │ CLOUD KNOWLEDGE DB   │
                        │                      │
                        │ Pattern: "Event      │
                        │ listeners improve    │
                        │ performance"         │
                        │                      │
                        │ (No project names,   │
                        │  no personal data)   │
                        │                      │
                        │ Shared with all      │
                        │ Mossy users          │
                        └──────────────────────┘
```

## Privacy Settings Toggle States

```
DISABLED (Default - Maximum Privacy)
┌─────────────────────────────────────┐
│ 📖 Share Script Patterns             │
│ [○═════════════════════════════════] │
│ ℹ️ No sharing (completely private)   │
│ Papyrus patterns stay local only     │
└─────────────────────────────────────┘

ENABLED (User Opts In)
┌─────────────────────────────────────┐
│ 📖 Share Script Patterns             │
│ [═════════════════════════════════●] │
│ ℹ️ Sharing enabled                   │
│ Patterns will be anonymized and      │
│ shared with community when uploaded  │
└─────────────────────────────────────┘

DEPENDENCY NOT MET (Grayed Out)
┌─────────────────────────────────────┐
│ 📖 Share Script Patterns             │
│ [○═════════════════════════════════] │ (disabled/grayed)
│ ℹ️ Requires Knowledge Base enabled    │
│ Enable "Contribute to Knowledge      │
│ Base" first                          │
└─────────────────────────────────────┘
```

## Onboarding Progress Bar

```
STEP 1: WELCOME
[████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░] 25%

STEP 2: TOOLS
[████████████████████░░░░░░░░░░░░░░░░░░░░] 50%

STEP 3: PRIVACY
[████████████████████████████████░░░░░░░░] 75%

STEP 4: COMPLETE
[████████████████████████████████████████] 100%
```

## Color Scheme

### Onboarding Modal
```
Background:      Slate-900 (#111827)
Border:          Emerald-500 (#10b981) with glow
Header BG:       Slate-800 (#1f2937)
Text Primary:    White (#ffffff)
Text Secondary:  Slate-400 (#9ca3af)
Progress Bar:    Emerald-500 (#10b981)
Buttons:         Emerald-600 hover Emerald-500
```

### Privacy Settings Page
```
Background:      Slate-950 (#030712)
Card BG:         Slate-900 (#111827)
Header BG:       Slate-800 (#1f2937)
Text Primary:    White (#ffffff)
Text Secondary:  Slate-400 (#9ca3af)
Success:         Emerald-400 (#4ade80)
Warning:         Amber-400 (#facc15)
Info:            Blue-400 (#60a5fa)
```

## Icons Used

```
Onboarding:
🔒 Lock (privacy)
📚 BookOpen (learning)
✓ CheckCircle2 (complete)
⚡ Zap (tools)
🛡️ Shield (security)

Privacy Settings:
🔒 Lock (data)
📖 Database (knowledge)
📤 Share2 (sharing)
🛡️ Shield (security)
⚙️ Settings (config)
👁️ Eye (visibility)
❌ X (close/delete)
✓ CheckCircle2 (complete)
```

---

This visual guide shows:
- Complete onboarding flow
- Privacy settings organization
- Sidebar navigation update
- Data storage architecture
- Toggle states
- Progress visualization
- Color and icon references

All visually integrated into the Mossy Pip-Boy aesthetic! 🎨✨
