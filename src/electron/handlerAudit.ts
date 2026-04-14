/**
 * IPC Handler Audit & Missing Handlers List
 * 
 * This file documents which IPC handlers from types.ts are NOT implemented
 * in main.ts. This is used to systematically add missing handlers and 
 * ensure all panels have proper backend support.
 * 
 * Run `npm run audit-handlers` to generate a full report.
 */

// ============================================================================
// IN DEVELOPMENT PLUGINS/EXTENSIONS
// ============================================================================

export const IN_DEVELOPMENT_PLUGINS = [
    {
        name: 'Mod Organizer 2 (MO2) Extension',
        status: 'IN DEVELOPMENT',
        description: 'Separate plugin for MO2 integration with Mossy. Allows direct interaction with MO2 profiles, mod lists, and orchestration from Mossy.',
        handlers: [],
        timeline: 'TBD - Separate plugin repository',
        notes: 'Being developed as a standalone plugin to avoid coupling MO2-specific logic with core Mossy codebase',
    },
];

// ============================================================================
// CRITICAL MISSING HANDLERS (prevent panels from working)
// ============================================================================

export const CRITICAL_MISSING_HANDLERS = [
    // Roadmap System - PARTIALLY IMPLEMENTED
    // ✓ roadmap-get-all
    // ✓ roadmap-generate-ai
    // ✓ roadmap-update-step
    // ✗ roadmap-create (needs implementation)
    // ✗ roadmap-delete (needs implementation)
    // ✗ roadmap-get-active (needs implementation)
    'roadmap-create',
    'roadmap-delete',
    'roadmap-get-active',

    // Workshop Integration - NEEDS IMPLEMENTATION
    'workshop-run-papyrus-compiler',
    'workshop-write-file',
    'workshop-read-nif-info',
    'workshop-parse-script-deps',
    'workshop-read-blender-zip',

    // Image Suite - NEEDS IMPLEMENTATION
    'image-generate-normal-map',
    'image-generate-roughness-map',
    'image-generate-height-map',
    'image-generate-metallic-map',
    'image-generate-ao-map',
    'image-convert-format',

    // Auditor - PARTIAL (analyze-esp exists but others missing)
    'auditor-scan-mod-directory',
    'auditor-scan-mod-directory-path',
    'auditor-pick-nif-file',
    'auditor-pick-dds-file',
    'auditor-pick-bgsm-file',

    // FOMOD Assembler - NEEDS IMPLEMENTATION
    'fomod-scan-mod-folder',
    'fomod-analyze-structure',
    'fomod-validate-xml',
    'fomod-export-package',

    // FormID Remapper - NEEDS IMPLEMENTATION
    'formid-remapper-scan-conflicts',
    'formid-remapper-remap',
    'formid-remapper-backup',

    // Mod Comparison Tool - NEEDS IMPLEMENTATION
    'mod-comparison-compare',
    'mod-comparison-merge',
    'mod-comparison-export',

    // Automation Engine - NEEDS IMPLEMENTATION
    'automation-start',
    'automation-stop',
    'automation-get-settings',
    'automation-update-settings',
    'automation-toggle-rule',
    'automation-trigger-rule',
    'automation-get-statistics',
    'automation-reset-statistics',
];

// ============================================================================
// MODERATE: HANDLERS WITH PARTIAL IMPLEMENTATION
// ============================================================================

export const MODERATELY_IMPLEMENTED_HANDLERS = [
    // Quest Editor - partially implemented
    'quest:create',
    'quest:load',
    'quest:save',
    'quest:validate',
    'quest:simulate',
    'quest:generateScript',
    'quest:generateDialogueFragments',

    // INI Manager - partially implemented
    'ini-manager-read-file',
    'ini-manager-write-file',
    'ini-manager-find-files',

    // Asset Scanner - partially implemented
    'asset-scanner-browse-folder',
    'asset-scanner-scan-duplicates',

    // Game Log Monitor - partially implemented
    'game-log-monitor-browse-log',
    'game-log-monitor-start',
    'game-log-monitor-stop',

    // xEdit Script - partially implemented
    'xedit-script-browse-xedit',
    'xedit-script-execute',
];

// ============================================================================
// WELL IMPLEMENTED (handlers that work well)
// ============================================================================

export const WELL_IMPLEMENTED_HANDLERS = [
    // Program detection & launching
    'detect-programs',
    'open-program',
    'open-external',
    'launch-tool-with-file',
    'reveal-in-folder',
    'get-tool-version',
    'get-running-processes',

    // Vault integration (core functions)
    'vault-run-tool',
    'vault-save-manifest',
    'vault-load-manifest',
    'vault-get-dds-dimensions',
    'vault-get-image-dimensions',

    // Knowledge persistence
    'save-knowledge-vault',
    'load-knowledge-vault',

    // Project management
    'project-list',
    'project-create',
    'project-get-current',

    // Chat history
    'save-chat-history',
    'load-chat-history',

    // File operations
    'save-file',
    'browse-folder',
    'pick-file',

    // Precombine Generator
    'precombine-generator-generate',
    'precombine-generator-validate',

    // Observer
    'observer-get-status',
];

// ============================================================================
// PANEL-SPECIFIC IMPLEMENTATION STATUS
// ============================================================================

export const PANEL_STATUS = {
    'RoadmapPanel': {
        status: 'PARTIAL',
        implemented: ['roadmap-get-all', 'roadmap-generate-ai', 'roadmap-update-step'],
        missing: ['roadmap-create', 'roadmap-delete', 'roadmap-get-active'],
        needsPersistence: true,
        description: 'Modding plans and step-by-step guidance',
    },

    'TheVault': {
        status: 'GOOD',
        implemented: ['vault-save-manifest', 'vault-load-manifest', 'vault-get-dds-dimensions'],
        missing: [],
        needsPersistence: true,
        description: 'Asset library and organization',
    },

    'TheScribe': {
        status: 'GOOD',
        implemented: ['workshop-run-papyrus-compiler', 'workshop-read-file'],
        missing: ['workshop-write-file', 'workshop-parse-script-deps'],
        needsPersistence: true,
        description: 'Papyrus script editor',
    },

    'Workshop': {
        status: 'PARTIAL',
        implemented: ['workshop-read-dds-preview', 'workshop-read-nif-info'],
        missing: ['workshop-write-file', 'workshop-read-blender-zip'],
        needsPersistence: true,
        description: 'Asset creation and editing',
    },

    'ImageSuite': {
        status: 'LIMITED',
        implemented: [],
        missing: [
            'image-generate-normal-map',
            'image-generate-roughness-map',
            'image-generate-height-map',
            'image-generate-metallic-map',
            'image-generate-ao-map',
            'image-convert-format',
            'image-get-info',
        ],
        needsPersistence: true,
        description: 'Texture and image processing',
    },

    'PrecombineGenerator': {
        status: 'PARTIAL',
        implemented: ['precombine-generator-generate', 'precombine-generator-validate'],
        missing: ['precombine-generator-get-pjm-path'],
        needsPersistence: true,
        description: 'Generate precombined meshes',
    },

    'AutomationManager': {
        status: 'LIMITED',
        implemented: [],
        missing: [
            'automation-start',
            'automation-stop',
            'automation-get-settings',
            'automation-update-settings',
            'automation-toggle-rule',
            'automation-trigger-rule',
            'automation-get-statistics',
        ],
        needsPersistence: true,
        description: 'Workflow automation engine',
    },

    'FormIdRemapper': {
        status: 'LIMITED',
        implemented: [],
        missing: ['formid-remapper-scan-conflicts', 'formid-remapper-remap', 'formid-remapper-backup'],
        needsPersistence: true,
        description: 'Remap FormIDs in plugins',
    },

    'ModComparisonTool': {
        status: 'LIMITED',
        implemented: [],
        missing: ['mod-comparison-compare', 'mod-comparison-merge', 'mod-comparison-export'],
        needsPersistence: true,
        description: 'Compare and merge mods',
    },

    'ChatInterface': {
        status: 'GOOD',
        implemented: ['save-chat-history', 'load-chat-history'],
        missing: [],
        needsPersistence: true,
        description: 'Main chat with Mossy AI',
    },

    'ProjectHub': {
        status: 'GOOD',
        implemented: ['project-list', 'project-create', 'project-get-current'],
        missing: [],
        needsPersistence: true,
        description: 'Mod project management',
    },
};

// ============================================================================
// IMPLEMENTATION CHECKLIST
// ============================================================================

export const IMPLEMENTATION_TODO = `
## Missing Handler Implementation Checklist

### Phase 1: CRITICAL (Blocking main panels)
- [ ] roadmap-create
- [ ] roadmap-delete
- [ ] roadmap-get-active
- [ ] workshop-write-file
- [ ] image-convert-format

### Phase 2: IMPORTANT (Panel functionality)
- [ ] image-generate-normal-map
- [ ] image-generate-roughness-map
- [ ] automation-start
- [ ] automation-get-settings
- [ ] formid-remapper-scan-conflicts

### Phase 3: NICE TO HAVE (Enhanced features)
- [ ] fomod-export-package
- [ ] mod-comparison-merge
- [ ] auditor-pick-dds-file

### Phase 4: TESTING & VALIDATION
- [ ] Run audit: npm run audit-handlers
- [ ] Test all implemented handlers
- [ ] Verify persistence for all panels
- [ ] Check error handling

### Phase 5: DATA PERSISTENCE FOR ALL PANELS
- [ ] Add panel data storage for RoadmapPanel
- [ ] Add panel data storage for TheVault
- [ ] Add panel data storage for TheScribe
- [ ] Add panel data storage for Workshop
- [ ] Add panel data storage for ImageSuite
- [ ] Add panel data storage for ProjectHub
- [ ] Add panel data storage for AutomationManager
- [ ] Add panel data storage for FormIdRemapper
- [ ] Add panel data storage for ModComparisonTool
- [ ] Add panel data storage for all other interactive panels
`;

export default {
    IN_DEVELOPMENT_PLUGINS,
    CRITICAL_MISSING_HANDLERS,
    MODERATELY_IMPLEMENTED_HANDLERS,
    WELL_IMPLEMENTED_HANDLERS,
    PANEL_STATUS,
    IMPLEMENTATION_TODO,
};
