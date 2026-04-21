import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Book, Code, Keyboard, Hash, ChevronDown, ChevronUp, Zap, FileCode, Terminal, Palette } from 'lucide-react';
import { ToolsInstallVerifyPanel } from './components/ToolsInstallVerifyPanel';

interface ReferenceSection {
  id: string;
  title: string;
  icon: React.ElementType;
  items: ReferenceItem[];
}

interface ReferenceItem {
  name: string;
  description: string;
  example?: string;
  category?: string;
}

type QuickReferenceProps = {
  embedded?: boolean;
};

export const QuickReference: React.FC<QuickReferenceProps> = ({ embedded = false }) => {
  const [expandedSections, setExpandedSections] = useState<string[]>(['papyrus']);
  const [searchQuery, setSearchQuery] = useState('');

  const toggleSection = (sectionId: string) => {
    setExpandedSections(prev =>
      prev.includes(sectionId)
        ? prev.filter(id => id !== sectionId)
        : [...prev, sectionId]
    );
  };

  const references: ReferenceSection[] = [
    {
      id: 'papyrus',
      title: 'Papyrus Keywords',
      icon: Code,
      items: [
        { name: 'Event', description: 'Defines an event handler', example: 'Event OnInit()', category: 'Core' },
        { name: 'Function', description: 'Defines a function', example: 'Function MyFunc()', category: 'Core' },
        { name: 'Property', description: 'Defines a property variable', example: 'Int Property MyCount Auto', category: 'Core' },
        { name: 'Auto', description: 'Auto property (no getter/setter)', example: 'Actor Property Player Auto', category: 'Modifier' },
        { name: 'AutoReadOnly', description: 'Read-only auto property', example: 'Int Property Version AutoReadOnly', category: 'Modifier' },
        { name: 'Conditional', description: 'Property conditional', example: 'Bool Property IsEnabled = True Auto Conditional', category: 'Modifier' },
        { name: 'Extends', description: 'Inherits from parent script', example: 'ScriptName MyScript extends Quest', category: 'Core' },
        { name: 'If/ElseIf/Else', description: 'Conditional logic', example: 'If health < 50\\n    ; code\\nEndIf', category: 'Control' },
        { name: 'While/EndWhile', description: 'Loop construct', example: 'While i < 10\\n    i += 1\\nEndWhile', category: 'Control' },
        { name: 'Return', description: 'Exit function/return value', example: 'Return true', category: 'Control' },
        { name: 'New', description: 'Create array', example: 'Int[] MyArray = new Int[5]', category: 'Array' },
        { name: 'As', description: 'Type cast', example: 'Actor npc = akRef as Actor', category: 'Cast' },
        { name: 'Self', description: 'Reference to this script', example: 'Self.RegisterForUpdate(1.0)', category: 'Reference' },
        { name: 'Parent', description: 'Call parent function', example: 'Parent.OnInit()', category: 'Reference' },
        { name: 'Import', description: 'Import external script', example: 'Import F4SE', category: 'Core' },
        { name: 'Global', description: 'Mark as global function', example: 'Function GlobalFunc() Global', category: 'Modifier' },
        { name: 'Native', description: 'Engine-defined function', example: 'Function NativeFunc() Native', category: 'Modifier' },
      ]
    },
    {
      id: 'f4se',
      title: 'F4SE Functions',
      icon: Zap,
      items: [
        { name: 'F4SE.GetVersion()', description: 'Returns F4SE version', example: 'Int version = F4SE.GetVersion()', category: 'Info' },
        { name: 'F4SE.GetVersionMinor()', description: 'Returns F4SE minor version', category: 'Info' },
        { name: 'F4SE.GetVersionBeta()', description: 'Returns F4SE beta version', category: 'Info' },
        { name: 'UI.OpenMenu()', description: 'Opens game menu', example: 'UI.OpenMenu("PipBoyMenu")', category: 'UI' },
        { name: 'UI.CloseMenu()', description: 'Closes game menu', example: 'UI.CloseMenu("PipBoyMenu")', category: 'UI' },
        { name: 'UI.IsMenuOpen()', description: 'Check if menu is open', example: 'Bool open = UI.IsMenuOpen("PipBoyMenu")', category: 'UI' },
        { name: 'Input.TapKey()', description: 'Simulates key press', example: 'Input.TapKey(57) ; Space', category: 'Input' },
        { name: 'Math.DegreesToRadians()', description: 'Convert degrees to radians', category: 'Math' },
        { name: 'Math.RadiansToDegrees()', description: 'Convert radians to degrees', category: 'Math' },
        { name: 'ObjectReference.AttachModToInventoryItem()', description: 'Attach mod to item', category: 'Item' },
        { name: 'ObjectReference.GetInventoryWeight()', description: 'Get total inventory weight', category: 'Inventory' },
        { name: 'Actor.GetEquippedItemType()', description: 'Get equipped item type', example: 'Int type = Player.GetEquippedItemType(0)', category: 'Actor' },
        { name: 'Actor.IsInPowerArmor()', description: 'Check if in power armor', category: 'Actor' },
        { name: 'Weapon.GetAmmoCapacity()', description: 'Get weapon ammo capacity', category: 'Weapon' },
        { name: 'InstanceData', description: 'F4SE instance data for items', example: 'InstanceData:Owner owner', category: 'Advanced' },
      ]
    },
    {
      id: 'ck-hotkeys',
      title: 'Creation Kit Hotkeys',
      icon: Keyboard,
      items: [
        { name: 'Ctrl + D', description: 'Duplicate selected object', category: 'Object' },
        { name: 'Ctrl + F', description: 'Find/Search', category: 'Navigation' },
        { name: 'F', description: 'Focus on selected object', category: 'Camera' },
        { name: 'C', description: 'Center on cell', category: 'Camera' },
        { name: 'T', description: 'Top view', category: 'Camera' },
        { name: 'Ctrl + Q', description: 'Toggle markers', category: 'View' },
        { name: 'M', description: 'Toggle move gizmo', category: 'Transform' },
        { name: 'R', description: 'Toggle rotate gizmo', category: 'Transform' },
        { name: 'S', description: 'Toggle scale gizmo', category: 'Transform' },
        { name: 'Z', description: 'Local/World space toggle', category: 'Transform' },
        { name: 'Q', description: 'Selection tool', category: 'Tool' },
        { name: 'B', description: 'Break prefab instance', category: 'Object' },
        { name: 'Ctrl + Alt + D', description: 'Duplicate in place', category: 'Object' },
        { name: 'Delete', description: 'Delete selected (mark as deleted)', category: 'Object' },
        { name: 'H', description: 'Snap to ground', category: 'Transform' },
        { name: 'Ctrl + S', description: 'Save plugin', category: 'File' },
        { name: 'Ctrl + N', description: 'New form', category: 'Edit' },
        { name: 'Ctrl + E', description: 'Edit current cell', category: 'Cell' },
      ]
    },
    {
      id: 'mossy-standards',
      title: 'Mossy\'s FO4 Standards',
      icon: Palette,
      items: [
        { name: 'Animation Rate', description: 'ALWAYS use 30 FPS for Fallout 4 animations.', example: '30 FPS', category: 'Animation' },
        { name: 'Metric Scale', description: 'Use 1.0 Scale (1 unit = 1 meter) in Blender.', example: '1.0 Scale', category: 'Modeling' },
        { name: 'Previs/Precombines', description: 'Never disable precombines. Rebuild them if you edit cells.', category: 'Optimization' },
        { name: 'Project Isolation', description: 'Keep each mod in its own folder in The Hive.', category: 'Workflow' },
        { name: 'ESPFE / ESL', description: 'Use ESL-flagged ESPs for small mods to save plugin slots.', category: 'Core' },
      ]
    },
    {
      id: 'formids',
      title: 'FormID Ranges',
      icon: Hash,
      items: [
        { name: '00000000-00FFFFFF', description: 'Fallout4.esm (base game)', category: 'Base' },
        { name: '01000000-01FFFFFF', description: 'DLC01: Automatron', category: 'DLC' },
        { name: '02000000-02FFFFFF', description: 'DLC02: Wasteland Workshop', category: 'DLC' },
        { name: '03000000-03FFFFFF', description: 'DLC03: Far Harbor', category: 'DLC' },
        { name: '04000000-04FFFFFF', description: 'DLC04: Contraptions', category: 'DLC' },
        { name: '05000000-05FFFFFF', description: 'DLC05: Vault-Tec', category: 'DLC' },
        { name: '06000000-06FFFFFF', description: 'DLC06: Nuka-World', category: 'DLC' },
        { name: 'FE000000-FE000FFF', description: 'ESL light plugins (index 000-FFF)', category: 'Light' },
        { name: 'FF000000-FFFFFFFF', description: 'Dynamic forms (runtime)', category: 'Runtime' },
        { name: '00000014', description: 'PlayerREF (player character)', category: 'Special' },
        { name: '00000007', description: 'Player base actor', category: 'Special' },
      ]
    },
    {
      id: 'xedit',
      title: 'xEdit/FO4Edit Shortcuts',
      icon: FileCode,
      items: [
        { name: 'Ctrl + Click', description: 'Add to selection', category: 'Selection' },
        { name: 'Shift + Click', description: 'Select range', category: 'Selection' },
        { name: 'Ctrl + F', description: 'Find', category: 'Search' },
        { name: 'Ctrl + S', description: 'Save', category: 'File' },
        { name: 'Alt + X', description: 'Exit', category: 'File' },
        { name: 'Ctrl + A', description: 'Apply filter', category: 'Filter' },
        { name: 'Right-click > Apply Script', description: 'Run automation script', category: 'Script' },
        { name: 'Right-click > Compare To', description: 'Compare records', category: 'Compare' },
        { name: 'Right-click > Copy As Override', description: 'Create override', category: 'Edit' },
        { name: 'Right-click > Remove', description: 'Remove record (mark as deleted)', category: 'Edit' },
        { name: 'Right-click > VWD', description: 'Generate Visible When Distant', category: 'LOD' },
        { name: 'F2', description: 'Rename/Edit', category: 'Edit' },
        { name: 'Delete', description: 'Delete record', category: 'Edit' },
      ]
    },
    {
      id: 'blender',
      title: 'Blender Python (bpy) Basics',
      icon: Palette,
      items: [
        { name: 'bpy.context', description: 'Current context (active object, etc.)', example: 'obj = bpy.context.active_object', category: 'Context' },
        { name: 'bpy.data', description: 'Access all data (meshes, materials, etc.)', example: 'mesh = bpy.data.meshes["Cube"]', category: 'Data' },
        { name: 'bpy.ops', description: 'Operators (actions)', example: 'bpy.ops.mesh.primitive_cube_add()', category: 'Operations' },
        { name: 'bpy.context.selected_objects', description: 'List of selected objects', example: 'for obj in bpy.context.selected_objects:', category: 'Selection' },
        { name: 'bpy.context.active_object', description: 'Currently active object', example: 'obj = bpy.context.active_object', category: 'Selection' },
        { name: 'bpy.ops.object.select_all()', description: 'Select all objects', example: 'bpy.ops.object.select_all(action="SELECT")', category: 'Selection' },
        { name: 'bpy.ops.export_scene.fbx()', description: 'Export FBX', example: 'bpy.ops.export_scene.fbx(filepath="output.fbx")', category: 'Export' },
        { name: 'bpy.ops.import_scene.fbx()', description: 'Import FBX', example: 'bpy.ops.import_scene.fbx(filepath="input.fbx")', category: 'Import' },
        { name: 'obj.location', description: 'Object position (x,y,z)', example: 'obj.location = (0, 0, 1)', category: 'Transform' },
        { name: 'obj.rotation_euler', description: 'Object rotation (euler)', example: 'obj.rotation_euler = (0, 0, 1.57)', category: 'Transform' },
        { name: 'obj.scale', description: 'Object scale', example: 'obj.scale = (2, 2, 2)', category: 'Transform' },
        { name: 'obj.data', description: 'Object data (mesh, etc.)', example: 'mesh = obj.data', category: 'Data' },
        { name: 'bpy.ops.object.modifier_add()', description: 'Add modifier', example: 'bpy.ops.object.modifier_add(type="SUBSURF")', category: 'Modifier' },
        { name: 'obj.modifiers', description: 'List of modifiers', example: 'for mod in obj.modifiers:', category: 'Modifier' },
      ]
    },
    {
      id: 'console',
      title: 'Console Commands',
      icon: Terminal,
      items: [
        { name: 'coc <cellID>', description: 'Center on cell (teleport)', example: 'coc RedRocketExt', category: 'Navigation' },
        { name: 'player.additem <formID> <count>', description: 'Add item to player', example: 'player.additem 0001f66a 100', category: 'Item' },
        { name: 'player.setav <attr> <value>', description: 'Set attribute value', example: 'player.setav health 1000', category: 'Stats' },
        { name: 'player.moveto <refID>', description: 'Move player to reference', example: 'player.moveto 00019d09', category: 'Navigation' },
        { name: 'setstage <questID> <stage>', description: 'Set quest stage', example: 'setstage MQ102 200', category: 'Quest' },
        { name: 'completequest <questID>', description: 'Complete quest', example: 'completequest MQ102', category: 'Quest' },
        { name: 'resetquest <questID>', description: 'Reset quest', example: 'resetquest MQ102', category: 'Quest' },
        { name: 'help "<search>" 4', description: 'Search for item', example: 'help \"power armor\" 4', category: 'Search' },
        { name: 'tmm 1', description: 'Toggle map markers (show all)', category: 'Map' },
        { name: 'tgm', description: 'Toggle god mode', category: 'Cheat' },
        { name: 'tcl', description: 'Toggle collision', category: 'Cheat' },
        { name: 'tfc', description: 'Toggle free camera', category: 'Camera' },
        { name: 'tm', description: 'Toggle menus (screenshot mode)', category: 'UI' },
        { name: 'csb', description: 'Clear screen blood', category: 'Visual' },
        { name: 'showlooksmenu player 1', description: 'Open character customization', category: 'Character' },
      ]
    },
  ];

  const filteredReferences = references.map(section => ({
    ...section,
    items: section.items.filter(item =>
      searchQuery === '' ||
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.example?.toLowerCase().includes(searchQuery.toLowerCase())
    )
  })).filter(section => section.items.length > 0);

  const containerClassName = embedded
    ? 'flex flex-col bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-lg border border-slate-800'
    : 'flex flex-col h-full bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900';

  return (
    <div className={containerClassName}>
      {/* Header */}
      <div className="p-6 border-b border-slate-700/50 bg-slate-800/50">
        <div className="flex items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-3">
            <Book className="w-8 h-8 text-emerald-400" />
            <div>
              <h1 className="text-2xl font-bold text-white">Quick Reference</h1>
              <p className="text-sm text-slate-400">Fallout 4 modding essentials</p>
            </div>
          </div>
          {!embedded && (
            <Link
              to="/reference"
              className="px-3 py-2 border border-emerald-500/30 text-[10px] font-black uppercase tracking-widest text-emerald-200 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 transition-colors"
            >
              Help
            </Link>
          )}
        </div>

        {/* Search */}
        <div className="relative">
          <input
            type="text"
            placeholder="Search references..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-2 pl-10 text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
          />
          <Book className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        <ToolsInstallVerifyPanel
          accentClassName="text-emerald-300"
          description="This page is a fast in-app cheat sheet. Use search to narrow down snippets and standards without needing external docs."
          verify={[
            'Type a keyword in search and confirm the list filters immediately.',
            'Expand/collapse a section and confirm it stays open while you browse.'
          ]}
          firstTestLoop={[
            'Search for one concept you are working on (e.g., “OnInit” or “precombines”).',
            'Copy the example into your notes and adapt it to your current script.'
          ]}
        />
        {filteredReferences.map((section) => {
          const isExpanded = expandedSections.includes(section.id);
          const Icon = section.icon;

          return (
            <div
              key={section.id}
              className="bg-slate-800/50 backdrop-blur-sm rounded-xl border border-slate-700/50 overflow-hidden"
            >
              {/* Section Header */}
              <button
                onClick={() => toggleSection(section.id)}
                className="w-full flex items-center justify-between p-4 hover:bg-slate-700/30 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Icon className="w-5 h-5 text-emerald-400" />
                  <h2 className="text-lg font-bold text-white">{section.title}</h2>
                  <span className="text-xs text-slate-500 bg-slate-900 px-2 py-1 rounded-full">
                    {section.items.length} items
                  </span>
                </div>
                {isExpanded ? (
                  <ChevronUp className="w-5 h-5 text-slate-400" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-slate-400" />
                )}
              </button>

              {/* Section Content */}
              {isExpanded && (
                <div className="p-4 pt-0 space-y-2">
                  {section.items.map((item, index) => (
                    <div
                      key={index}
                      className="bg-slate-900/50 rounded-lg p-3 border border-slate-700/30 hover:border-emerald-500/30 transition-colors group"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <code className="text-sm font-mono text-emerald-400 bg-slate-950 px-2 py-0.5 rounded">
                              {item.name}
                            </code>
                            {item.category && (
                              <span className="text-xs text-slate-500 bg-slate-800 px-2 py-0.5 rounded">
                                {item.category}
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-slate-300">{item.description}</p>
                          {item.example && (
                            <pre className="mt-2 text-xs font-mono text-slate-400 bg-slate-950 p-2 rounded border border-slate-800 overflow-x-auto">
                              {item.example}
                            </pre>
                          )}
                        </div>
                        <button
                          onClick={() => navigator.clipboard.writeText(item.example || item.name)}
                          className="opacity-0 group-hover:opacity-100 transition-opacity text-slate-500 hover:text-emerald-400"
                          title="Copy to clipboard"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}

        {filteredReferences.length === 0 && (
          <div className="text-center py-12 text-slate-500">
            <Book className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>No references found matching "{searchQuery}"</p>
          </div>
        )}
      </div>
    </div>
  );
};
