/**
 * Mossy Quick Reference: Common Fallout 4 Modding Operations
 * This file contains quick action patterns for the AI assistant
 */

export const MossyQuickActions = {
  
  // === COMMON USER REQUESTS → TOOL MAPPING ===
  intentMap: {
    // When user says these phrases, use these tools
    
    "create weapon": {
      tools: ["ck_create_record"],
      params: { recordType: "WEAP" },
      followUp: "Would you like me to attach a custom script or add it to a leveled list?"
    },

    "create quest": {
      tools: ["ck_create_record", "generate_papyrus_script"],
      params: { recordType: "QUST" },
      followUp: "I'll create the quest record and generate a quest script template."
    },

    "check conflicts": {
      tools: ["xedit_detect_conflicts"],
      followUp: "Scanning for conflicts with other mods..."
    },

    "clean mod": {
      tools: ["xedit_clean_masters"],
      params: { mode: "auto" },
      followUp: "Cleaning ITM and UDR records..."
    },

    "optimize textures": {
      tools: ["texture_batch_optimize"],
      followUp: "Batch optimizing textures for better performance..."
    },

    "fix previs": {
      tools: ["check_previs_status"],
      response: "PreVis issues detected. Recommend regenerating PreVis data in Creation Kit: Worldspace → Generate PreVis Data"
    },

    "test mod": {
      tools: ["test_launch_game"],
      params: { skipIntro: true },
      followUp: "Launching Fallout 4 with console enabled and test configuration..."
    },

    "pack archive": {
      tools: ["archive_pack"],
      params: { format: "ba2", compression: "normal" },
      followUp: "Creating optimized BA2 archive..."
    },

    "validate mesh": {
      tools: ["nif_validate"],
      followUp: "Checking mesh for errors..."
    },

    "create readme": {
      tools: ["docs_generate_readme"],
      params: { includeChangelog: true },
      followUp: "Generating comprehensive README with changelog..."
    },

    "sort load order": {
      tools: ["loot_sort_load_order"],
      followUp: "Running LOOT to optimize load order..."
    }
  },

  // === WORKFLOW TEMPLATES ===
  workflows: {
    
    newWeaponComplete: {
      name: "Complete Weapon Creation Workflow",
      steps: [
        {
          action: "Create weapon record in CK",
          tool: "ck_create_record",
          params: { recordType: "WEAP" }
        },
        {
          action: "Validate weapon mesh",
          tool: "nif_validate"
        },
        {
          action: "Optimize weapon textures",
          tool: "texture_convert_dds",
          params: { format: "BC1", mipmaps: true }
        },
        {
          action: "Add to leveled list",
          tool: "ck_edit_record"
        },
        {
          action: "Test in-game",
          tool: "test_launch_game"
        }
      ]
    },

    newQuestComplete: {
      name: "Complete Quest Creation Workflow",
      steps: [
        {
          action: "Create quest record",
          tool: "ck_create_record",
          params: { recordType: "QUST" }
        },
        {
          action: "Generate quest script",
          tool: "generate_papyrus_script",
          params: { extends: "Quest" }
        },
        {
          action: "Attach script to quest",
          tool: "ck_attach_script"
        },
        {
          action: "Compile script",
          note: "Use Workshop Compile button"
        },
        {
          action: "Test quest progression",
          tool: "test_create_save"
        }
      ]
    },

    modRelease: {
      name: "Mod Release Preparation",
      steps: [
        {
          action: "Clean plugin",
          tool: "xedit_clean_masters",
          params: { mode: "auto" }
        },
        {
          action: "Check conflicts",
          tool: "xedit_detect_conflicts"
        },
        {
          action: "Validate assets",
          tool: "asset_validate_paths"
        },
        {
          action: "Optimize textures",
          tool: "texture_batch_optimize"
        },
        {
          action: "Pack archives",
          tool: "archive_pack",
          params: { format: "ba2" }
        },
        {
          action: "Generate documentation",
          tool: "docs_generate_readme",
          params: { includeChangelog: true }
        },
        {
          action: "Scan permissions",
          tool: "docs_scan_permissions"
        },
        {
          action: "Create version tag",
          tool: "git_commit_version"
        }
      ]
    },

    debugCrash: {
      name: "Crash Debugging Workflow",
      steps: [
        {
          action: "Check Papyrus log for errors",
          tool: "test_monitor_papyrus_log"
        },
        {
          action: "Validate all meshes",
          tool: "nif_validate"
        },
        {
          action: "Check for conflicts",
          tool: "xedit_detect_conflicts"
        },
        {
          action: "Verify asset paths",
          tool: "asset_validate_paths"
        },
        {
          action: "Check PreVis status",
          tool: "check_previs_status"
        },
        {
          action: "Test with minimal load order",
          tool: "test_launch_game"
        }
      ]
    }
  },

  // === SMART SUGGESTIONS ===
  contextualSuggestions: {
    
    whenUserMentions: {
      "crash": [
        "Would you like me to analyze your Papyrus log for errors?",
        "Let me check for mesh validation issues.",
        "Should I verify your mod load order with LOOT?"
      ],

      "conflict": [
        "Running conflict detection with xEdit...",
        "I can create a compatibility patch if needed.",
        "Would you like me to forward winning records?"
      ],

      "performance": [
        "I can optimize your textures to improve FPS.",
        "Should I check for PreVis issues?",
        "Let me validate mesh poly counts."
      ],

      "script": [
        "Would you like me to generate a Papyrus template?",
        "I can validate syntax before compilation.",
        "Should I check for common scripting errors?"
      ],

      "release": [
        "Let's run through the mod release checklist.",
        "I'll help you clean and validate everything.",
        "Should I generate documentation?"
      ],

      "testing": [
        "I can launch the game with your test configuration.",
        "Would you like me to create a test save?",
        "Should I monitor the Papyrus log during testing?"
      ]
    }
  },

  // === ERROR SOLUTIONS ===
  errorSolutions: {
    
    "Stack Overflow": {
      diagnosis: "Papyrus script has infinite loop or too many recursive calls",
      solutions: [
        "Add Utility.Wait() inside loops",
        "Check for infinite recursion in functions",
        "Reduce RegisterForUpdate frequency",
        "Use RegisterForSingleUpdate instead of continuous updates"
      ],
      codeExample: `; BAD
Event OnUpdate()
    DoSomething()
    RegisterForUpdate(0.1) ; Too frequent!
EndEvent

; GOOD
Event OnUpdate()
    DoSomething()
    Utility.Wait(0.5) ; Prevent overflow
    RegisterForSingleUpdate(5.0) ; Use single update
EndEvent`
    },

    "Cannot call X() on a None object": {
      diagnosis: "Script property is not filled or object doesn't exist",
      solutions: [
        "Fill property in Creation Kit",
        "Add None checks before calling methods",
        "Verify object exists in game world",
        "Check if property type matches form type"
      ],
      codeExample: `; Add None check
if MyProperty != None
    MyProperty.DoSomething()
else
    Debug.Trace("MyProperty is None!")
endif`
    },

    "Yellow Precombined Meshes": {
      diagnosis: "PreVis/PreCombines are broken",
      solutions: [
        "Regenerate PreVis in Creation Kit",
        "Load worldspace → Worldspace → Generate PreVis Data",
        "Use PRP (PreVis Repair Pack) for common areas",
        "Disable PreVis for edited cells (performance cost)"
      ]
    },

    "Missing Texture": {
      diagnosis: "NIF references texture that doesn't exist",
      solutions: [
        "Use nif_fix_texture_paths to auto-correct paths",
          "Manually set paths in NifSkope (Download: https://www.nexusmods.com/newvegas/mods/75969)",
        "Create missing DDS texture",
        "Verify texture is in correct Data folder structure"
      ]
    },

    "Script Won't Compile": {
      diagnosis: "Papyrus syntax error or missing dependencies",
      solutions: [
        "Use papyrus_validate_syntax to find errors",
        "Check parent script exists and is compiled",
        "Verify all properties have correct types",
        "Ensure all Events have matching EndEvent",
        "Check for typos in function/property names"
      ]
    },

    "FormID Conflict": {
      diagnosis: "Two mods use same FormID",
      solutions: [
        "Use xedit_change_formid to renumber",
        "Check conflict with xedit_detect_conflicts",
        "Create compatibility patch",
        "Adjust load order with LOOT"
      ]
    }
  },

  // === BEST PRACTICE REMINDERS ===
  bestPractices: {
    
    beforeRelease: [
      "✓ Clean ITM/UDR with xEdit (Download: https://www.nexusmods.com/fallout4/mods/2737)",
      "✓ Validate all asset paths",
      "✓ Test from clean save",
      "✓ Check for conflicts",
      "✓ Optimize textures and meshes",
      "✓ Generate documentation",
      "✓ Verify permissions for all assets",
      "✓ Create version tag in git"
    ],

    papyrusScripting: [
      "✓ Cache Game.GetPlayer() as property",
      "✓ Always add None checks",
      "✓ Use Utility.Wait() in loops",
      "✓ Unregister from updates when done",
      "✓ Use Debug.Trace() for logging",
      "✓ Avoid string operations in hot paths",
      "✓ Test scripts with Papyrus Profiler"
    ],

    meshCreation: [
      "✓ Keep weapons under 5000 triangles",
      "✓ Use BSTriShape blocks (FO4 format)",
      "✓ Always include collision for physics",
      "✓ Use BC1/BC3/BC5 compressed textures",
      "✓ Texture paths relative to Data folder",
      "✓ Create LODs for environment objects",
      "✓ Test meshes with nif_validate"
    ],

    creationKit: [
      "✓ Use unique EditorID prefix (e.g., MMM_)",
      "✓ Fill all required properties",
      "✓ Set appropriate keywords",
      "✓ Test in-game before finalizing",
      "✓ Regenerate PreVis if editing worldspace",
      "✓ Save often (CK can crash)",
      "✓ Keep backups of ESP files"
    ]
  },

  // === QUICK CONSOLE COMMANDS ===
  quickCommands: {
    
    testing: {
      "Go to test cell": "coc qasmoke",
      "Add item by ID": "player.additem [FormID] [count]",
      "Set quest stage": "setstage [QuestID] [stage]",
      "Toggle god mode": "tgm",
      "Toggle collision": "tcl",
      "Show quest stages": "sqv [QuestID]",
      "Reset quest": "resetquest [QuestID]"
    },

    debugging: {
      "Find item FormID": 'help "ItemName" 4',
      "Select object": "prid [RefID]",
      "Show object info": "showinventory",
      "Check script status": "sqv [QuestID]",
      "Force script update": "stopquest [QuestID] + startquest [QuestID]"
    },

    placement: {
      "Spawn object": "player.placeatme [FormID]",
      "Move object": "setpos x/y/z [value]",
      "Rotate object": "setangle x/y/z [angle]",
      "Disable object": "disable",
      "Delete object": "markfordelete"
    }
  },

  // === FILE STRUCTURE TEMPLATES ===
  fileStructures: {
    
    basicMod: {
      "Data/": {
        "Scripts/": {
          "Source/": {
            "User/": {
              "MyModScript.psc": "Papyrus source code"
            }
          },
          "MyModScript.pex": "Compiled Papyrus"
        },
        "Meshes/": {
          "MyMod/": {
            "weapon.nif": "3D mesh"
          }
        },
        "Textures/": {
          "MyMod/": {
            "weapon_d.dds": "Diffuse texture",
            "weapon_n.dds": "Normal map",
            "weapon_s.dds": "Specular map"
          }
        },
        "MyMod.esp": "Plugin file"
      }
    },

    withArchive: {
      "Data/": {
        "MyMod - Main.ba2": "Archive with meshes/textures",
        "MyMod - Textures.ba2": "Separate texture archive",
        "Scripts/": {
          "MyModScript.pex": "Scripts stay loose"
        },
        "MyMod.esp": "Plugin file"
      }
    }
  }
};

export default MossyQuickActions;
