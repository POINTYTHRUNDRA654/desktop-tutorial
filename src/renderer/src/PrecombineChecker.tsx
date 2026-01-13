import React, { useState } from 'react';
import { AlertTriangle, CheckCircle2, Zap, ChevronDown } from 'lucide-react';

interface CheckItem {
  id: string;
  category: string;
  title: string;
  description: string;
  status: 'unchecked' | 'pass' | 'fail';
  solution?: string;
}

export const PrecombineChecker: React.FC = () => {
  const [checks, setChecks] = useState<CheckItem[]>([
    // Pre-Modification Checks
    {
      id: 'have-prp',
      category: 'preparation',
      title: 'PRP Tool Installed & Ready',
      description: 'Do you have PRP (Precombine & Previsibines) tool downloaded and available?',
      status: 'unchecked',
      solution: 'Download from Nexus Mods: search "Precombine & Previsibines"',
    },
    {
      id: 'backup-esp',
      category: 'preparation',
      title: 'Backup Your ESP Created',
      description: 'Have you backed up your ESP before making precombine-affecting changes?',
      status: 'unchecked',
      solution: 'Copy your ESP to a safe location. If rebuild fails, you can revert.',
    },
    {
      id: 'documented-cells',
      category: 'preparation',
      title: 'Documented Modified Cells',
      description: 'Have you listed all exterior cells you will modify?',
      status: 'unchecked',
      solution: 'Create a list: Cell Name, Type of Change (add/move/delete), Objects Affected',
    },

    // During Development
    {
      id: 'exterior-only',
      category: 'development',
      title: 'Only Modified Exterior Cells',
      description: 'Did you ONLY modify exterior worldspace cells (not interiors)?',
      status: 'unchecked',
      solution: 'Interior cells don\'t use precombines. Only exterior cells (Commonwealth, etc.) need rebuild.',
    },
    {
      id: 'placement-changes',
      category: 'development',
      title: 'Documented All Placement Changes',
      description: 'Have you recorded every object added, moved, or deleted?',
      status: 'unchecked',
      solution: 'Use Creation Kit: Edit > Selection > Use Filters. Track each object change.',
    },
    {
      id: 'no-custom-precombines',
      category: 'development',
      title: 'Did NOT Manually Edit Precombine Meshes',
      description: 'Did you avoid manually editing .nif precombine files?',
      status: 'unchecked',
      solution: 'Never manually edit precombine NIFs. Use PRP tool only. Manual edits break compatibility.',
    },
    {
      id: 'tested-in-ck',
      category: 'development',
      title: 'Loaded & Tested in Creation Kit',
      description: 'Have you loaded your ESP in Creation Kit and verified object placement?',
      status: 'unchecked',
      solution: 'Open CK → File > Data > Load your ESP. Verify objects appear correctly.',
    },

    // Pre-Rebuild Checks
    {
      id: 'esp-saved',
      category: 'pre-rebuild',
      title: 'ESP File Saved & Error-Free',
      description: 'Is your ESP saved with no Creation Kit errors?',
      status: 'unchecked',
      solution: 'Errors in CK = errors in PRP rebuild. Fix all CK errors first.',
    },
    {
      id: 'prp-config',
      category: 'pre-rebuild',
      title: 'PRP Settings Configured',
      description: 'Have you configured PRP with correct ESP file, output folder, and worldspace?',
      status: 'unchecked',
      solution: 'PRP Settings: Input = your ESP, Output = new folder, Worldspace = Commonwealth (or your target)',
    },
    {
      id: 'conflicts-identified',
      category: 'pre-rebuild',
      title: 'Identified Precombine Conflicts',
      description: 'Are you aware of other mods that modify same precombines (load order aware)?',
      status: 'unchecked',
      solution: 'Load other mods in CK → View > Precombines. If overlapping: plan PRP merge strategy.',
    },
    {
      id: 'disk-space',
      category: 'pre-rebuild',
      title: 'Sufficient Disk Space Available',
      description: 'Do you have at least 1GB free space for PRP output files?',
      status: 'unchecked',
      solution: 'PRP generates large NIF files. Free up disk space if needed.',
    },

    // Post-Rebuild Checks
    {
      id: 'prp-completed',
      category: 'post-rebuild',
      title: 'PRP Rebuild Completed Without Errors',
      description: 'Did PRP finish successfully with no crashes or error messages?',
      status: 'unchecked',
      solution: 'Check PRP log. Common errors: corrupted ESP, missing meshes, RAM issues.',
    },
    {
      id: 'files-generated',
      category: 'post-rebuild',
      title: 'Precombine Files Generated',
      description: 'Do Meshes\\Precombined\\ NIF files exist in PRP output folder?',
      status: 'unchecked',
      solution: 'Expected files: *.nif in Meshes/Precombined/ folder. If missing: rerun PRP.',
    },
    {
      id: 'files-copied',
      category: 'post-rebuild',
      title: 'Precombine Files Copied to Mod Folder',
      description: 'Have you copied generated precombine files to your mod data folder?',
      status: 'unchecked',
      solution: 'Copy: PRP_Output/Data/Meshes/Precombined/ → Your_Mod/Data/Meshes/Precombined/',
    },
    {
      id: 'esp-updated',
      category: 'post-rebuild',
      title: 'ESP Updated to Reference New Precombines',
      description: 'Did you update your ESP to use the new precombine NIF paths?',
      status: 'unchecked',
      solution: 'Load your ESP in CK, verify it points to Meshes/Precombined/ files.',
    },

    // In-Game Testing
    {
      id: 'game-loaded',
      category: 'testing',
      title: 'Mod Loaded in Fallout 4',
      description: 'Does your mod load without CTD in-game?',
      status: 'unchecked',
      solution: 'If CTD: corrupted precombine. Rerun PRP or check ESP for errors.',
    },
    {
      id: 'objects-visible',
      category: 'testing',
      title: 'All Objects Visible From All Angles',
      description: 'When you rotate camera around modified cells, do objects disappear or glitch?',
      status: 'unchecked',
      solution: 'If invisible: precombines broken. Check Creation Kit: View > Precombines > Show.',
    },
    {
      id: 'no-zfighting',
      category: 'testing',
      title: 'No Z-Fighting or Flickering',
      description: 'Do you see flickering/overlapping meshes in modified areas?',
      status: 'unchecked',
      solution: 'Z-fighting = overlapping precombines. Reposition conflicting objects, rebuild.',
    },
    {
      id: 'no-floaters',
      category: 'testing',
      title: 'No Floating or Detached Objects',
      description: 'Are objects properly placed on terrain (not floating above/below)?',
      status: 'unchecked',
      solution: 'Floating = position error in CK. Reposition in CK, rebuild precombines.',
    },
    {
      id: 'performance-ok',
      category: 'testing',
      title: 'Performance Stable (No FPS Drops)',
      description: 'Is FPS consistent in modified areas (no stuttering or drops)?',
      status: 'unchecked',
      solution: 'FPS drops = precombine not rebuilt. Check precombine files exist and are valid.',
    },
    {
      id: 'load-times',
      category: 'testing',
      title: 'Load Times Normal',
      description: 'Do cells load at normal speed (not significantly slower)?',
      status: 'unchecked',
      solution: 'Slow loads = large precombine file. Optimize: move objects to different cells.',
    },
    {
      id: 'tested-with-mods',
      category: 'testing',
      title: 'Tested With Other PRP Mods',
      description: 'If using other precombine mods, did you test compatibility (load both)?',
      status: 'unchecked',
      solution: 'Test: Load your mod + another PRP mod. Check for conflicts or missing objects.',
    },

    // Release Checklist
    {
      id: 'readme-updated',
      category: 'release',
      title: 'README Documents PRP Usage',
      description: 'Does your README mention "Rebuilt with PRP" and version?',
      status: 'unchecked',
      solution: 'Add: "Precombines rebuilt with PRP v[version]. Compatible with other PRP mods."',
    },
    {
      id: 'prp-files-included',
      category: 'release',
      title: 'Precombine Files Included in Release Package',
      description: 'Have you included Meshes\\Precombined\\ folder in your mod download?',
      status: 'unchecked',
      solution: 'Users MUST have precombine files. If missing: visual glitches everywhere.',
    },
    {
      id: 'no-conflicts-noted',
      category: 'release',
      title: 'Documented Known Precombine Conflicts',
      description: 'Have you noted which mods have precombine conflicts (if any)?',
      status: 'unchecked',
      solution: 'Example: "Conflicts with [Mod X] precombines. Use merged patch: [Link]"',
    },
    {
      id: 'version-tracked',
      category: 'release',
      title: 'Tracked PRP Version Used',
      description: 'Have you documented which PRP version you used?',
      status: 'unchecked',
      solution: 'Important for compatibility. Document: "Built with PRP v3.5"',
    },
  ]);

  const toggleCheck = (id: string) => {
    setChecks((prev) =>
      prev.map((check) =>
        check.id === id
          ? {
              ...check,
              status:
                check.status === 'unchecked'
                  ? 'pass'
                  : check.status === 'pass'
                    ? 'fail'
                    : 'unchecked',
            }
          : check
      )
    );
  };

  const getCategoryLabel = (category: string) => {
    const labels: Record<string, string> = {
      preparation: '📋 Preparation',
      development: '🛠️ During Development',
      'pre-rebuild': '⚙️ Pre-Rebuild',
      'post-rebuild': '✅ Post-Rebuild',
      testing: '🎮 In-Game Testing',
      release: '📦 Release',
    };
    return labels[category] || category;
  };

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      preparation: 'bg-blue-900/10 border-blue-700/30',
      development: 'bg-slate-800 border-slate-700',
      'pre-rebuild': 'bg-orange-900/10 border-orange-700/30',
      'post-rebuild': 'bg-green-900/10 border-green-700/30',
      testing: 'bg-purple-900/10 border-purple-700/30',
      release: 'bg-cyan-900/10 border-cyan-700/30',
    };
    return colors[category] || 'bg-slate-800 border-slate-700';
  };

  const groupedChecks = checks.reduce(
    (acc, check) => {
      if (!acc[check.category]) acc[check.category] = [];
      acc[check.category].push(check);
      return acc;
    },
    {} as Record<string, CheckItem[]>
  );

  const categories = [
    'preparation',
    'development',
    'pre-rebuild',
    'post-rebuild',
    'testing',
    'release',
  ];

  const totalChecks = checks.length;
  const passedChecks = checks.filter((c) => c.status === 'pass').length;
  const failedChecks = checks.filter((c) => c.status === 'fail').length;

  return (
    <div className="h-full bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 overflow-hidden flex flex-col">
      {/* Header */}
      <div className="p-6 border-b border-slate-700 bg-slate-800/50">
        <div className="flex items-center gap-3 mb-4">
          <AlertTriangle className="w-8 h-8 text-orange-400" />
          <div>
            <h1 className="text-2xl font-bold text-white">Precombine Checker</h1>
            <p className="text-sm text-slate-400">Verify your precombine rebuild before release</p>
          </div>
        </div>

        {/* Progress */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-slate-950/50 border border-slate-700 rounded p-3">
            <p className="text-xs text-slate-500 mb-1">Passed</p>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-green-400">{passedChecks}</span>
              <span className="text-sm text-slate-400">/ {totalChecks}</span>
            </div>
          </div>

          <div className="bg-slate-950/50 border border-slate-700 rounded p-3">
            <p className="text-xs text-slate-500 mb-1">Issues Found</p>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-red-400">{failedChecks}</span>
              <span className="text-sm text-slate-400">failures</span>
            </div>
          </div>

          <div className="bg-slate-950/50 border border-slate-700 rounded p-3">
            <p className="text-xs text-slate-500 mb-1">Status</p>
            <p
              className={`text-lg font-bold ${
                failedChecks === 0 && passedChecks === totalChecks
                  ? 'text-green-400'
                  : failedChecks > 0
                    ? 'text-red-400'
                    : 'text-yellow-400'
              }`}
            >
              {failedChecks === 0 && passedChecks === totalChecks
                ? 'Ready!'
                : failedChecks > 0
                  ? 'Fix Issues'
                  : 'In Progress'}
            </p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-4xl mx-auto space-y-4">
          {categories.map((category) => (
            <div
              key={category}
              className={`border rounded-lg overflow-hidden ${getCategoryColor(category)}`}
            >
              {/* Category Header */}
              <div className="px-6 py-3 bg-slate-900/50 border-b border-slate-700">
                <h3 className="font-bold text-white">{getCategoryLabel(category)}</h3>
                <p className="text-xs text-slate-400 mt-1">
                  {groupedChecks[category]?.filter((c) => c.status === 'pass').length} /{' '}
                  {groupedChecks[category]?.length} checks passed
                </p>
              </div>

              {/* Checks */}
              <div className="p-4 space-y-2">
                {(groupedChecks[category] || []).map((check) => (
                  <div
                    key={check.id}
                    onClick={() => toggleCheck(check.id)}
                    className={`p-3 rounded border cursor-pointer transition-all ${
                      check.status === 'pass'
                        ? 'bg-green-950/20 border-green-700/50'
                        : check.status === 'fail'
                          ? 'bg-red-950/20 border-red-700/50'
                          : 'bg-slate-950/50 border-slate-700 hover:bg-slate-900/50'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 mt-0.5">
                        {check.status === 'pass' ? (
                          <CheckCircle2 className="w-5 h-5 text-green-400" />
                        ) : check.status === 'fail' ? (
                          <AlertTriangle className="w-5 h-5 text-red-400" />
                        ) : (
                          <div className="w-5 h-5 border border-slate-500 rounded-full" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-white">{check.title}</p>
                        <p className="text-xs text-slate-400 mt-1">{check.description}</p>
                        {check.solution && check.status !== 'pass' && (
                          <p className="text-xs text-slate-300 mt-2">💡 {check.solution}</p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className="p-4 bg-orange-900/20 border-t border-slate-700">
        <p className="text-xs text-orange-300">
          ⚠️ All checks should be PASSED before releasing your mod. Failing items cause visual glitches and player complaints.
        </p>
      </div>
    </div>
  );
};
