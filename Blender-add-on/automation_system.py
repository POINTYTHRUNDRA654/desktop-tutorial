"""
Automation System for Fallout 4 Add-on
Record and replay operations for automated workflows
"""

import bpy
import json
import os
from bpy.props import StringProperty, BoolProperty, IntProperty, CollectionProperty
from bpy.types import PropertyGroup
import datetime

class RecordedAction(PropertyGroup):
    """Represents a single recorded action"""
    operator: StringProperty(
        name="Operator",
        description="Operator ID that was executed",
        default=""
    )
    
    parameters: StringProperty(
        name="Parameters",
        description="JSON string of operator parameters",
        default="{}"
    )
    
    timestamp: StringProperty(
        name="Timestamp",
        description="When this action was recorded",
        default=""
    )

class MacroDefinition(PropertyGroup):
    """Represents a saved macro"""
    name: StringProperty(
        name="Macro Name",
        description="Name of the macro",
        default="Unnamed Macro"
    )
    
    description: StringProperty(
        name="Description",
        description="Description of what this macro does",
        default=""
    )
    
    filepath: StringProperty(
        name="File Path",
        description="Path to macro file",
        default="",
        subtype='FILE_PATH'
    )
    
    action_count: IntProperty(
        name="Action Count",
        description="Number of actions in this macro",
        default=0
    )
    
    use_count: IntProperty(
        name="Use Count",
        description="Number of times executed",
        default=0
    )

class AutomationSystem:
    """Main automation system for recording and replaying operations"""
    
    # Class variable to track if recording is active
    is_recording = False
    recorded_actions = []
    
    @staticmethod
    def get_macros_path():
        """Get path to macros directory"""
        config_path = bpy.utils.user_resource('CONFIG')
        macros_path = os.path.join(config_path, 'fo4_macros')
        os.makedirs(macros_path, exist_ok=True)
        return macros_path
    
    @staticmethod
    def get_macro_index_path():
        """Get path to macro index file"""
        macros_path = AutomationSystem.get_macros_path()
        return os.path.join(macros_path, 'macro_index.json')
    
    @staticmethod
    def start_recording():
        """Start recording user actions"""
        AutomationSystem.is_recording = True
        AutomationSystem.recorded_actions = []
        print("Recording started...")
        return True
    
    @staticmethod
    def stop_recording():
        """Stop recording user actions"""
        AutomationSystem.is_recording = False
        print(f"Recording stopped. Captured {len(AutomationSystem.recorded_actions)} actions")
        return True
    
    @staticmethod
    def record_action(operator_id, parameters=None):
        """Record a single action"""
        if not AutomationSystem.is_recording:
            return
        
        action = {
            'operator': operator_id,
            'parameters': parameters or {},
            'timestamp': datetime.datetime.now().isoformat()
        }
        
        AutomationSystem.recorded_actions.append(action)
        print(f"Recorded: {operator_id}")
    
    @staticmethod
    def save_macro(name, description=""):
        """Save recorded actions as a macro"""
        if not AutomationSystem.recorded_actions:
            return False, "No actions recorded"
        
        macros_path = AutomationSystem.get_macros_path()
        
        # Create safe filename
        safe_name = "".join(c for c in name if c.isalnum() or c in (' ', '-', '_')).rstrip()
        safe_name = safe_name.replace(' ', '_')
        macro_file = os.path.join(macros_path, f"{safe_name}.json")
        
        # Prepare macro data
        macro_data = {
            'name': name,
            'description': description,
            'actions': AutomationSystem.recorded_actions,
            'created': datetime.datetime.now().isoformat(),
            'action_count': len(AutomationSystem.recorded_actions)
        }
        
        # Save macro file
        try:
            with open(macro_file, 'w') as f:
                json.dump(macro_data, f, indent=2)
        except Exception as e:
            return False, f"Failed to save macro: {e}"
        
        # Update index
        index = AutomationSystem.load_macro_index()
        
        # Check if macro exists
        existing = None
        for m in index.get('macros', []):
            if m['filepath'] == macro_file:
                existing = m
                break
        
        if existing:
            existing['name'] = name
            existing['description'] = description
            existing['action_count'] = len(AutomationSystem.recorded_actions)
            existing['modified'] = datetime.datetime.now().isoformat()
        else:
            macro_entry = {
                'name': name,
                'description': description,
                'filepath': macro_file,
                'action_count': len(AutomationSystem.recorded_actions),
                'use_count': 0,
                'created': datetime.datetime.now().isoformat()
            }
            if 'macros' not in index:
                index['macros'] = []
            index['macros'].append(macro_entry)
        
        AutomationSystem.save_macro_index(index)
        
        return True, f"Macro saved: {name}"
    
    @staticmethod
    def load_macro_index():
        """Load macro index"""
        index_path = AutomationSystem.get_macro_index_path()
        
        if os.path.exists(index_path):
            try:
                with open(index_path, 'r') as f:
                    return json.load(f)
            except Exception as e:
                print(f"Error loading macro index: {e}")
                return {'macros': []}
        
        return {'macros': []}
    
    @staticmethod
    def save_macro_index(index_data):
        """Save macro index"""
        index_path = AutomationSystem.get_macro_index_path()
        
        try:
            with open(index_path, 'w') as f:
                json.dump(index_data, f, indent=2)
            return True
        except Exception as e:
            print(f"Error saving macro index: {e}")
            return False
    
    @staticmethod
    def load_macro(filepath):
        """Load macro from file"""
        try:
            with open(filepath, 'r') as f:
                return json.load(f)
        except Exception as e:
            print(f"Error loading macro: {e}")
            return None
    
    @staticmethod
    def execute_macro(filepath):
        """Execute a saved macro"""
        macro_data = AutomationSystem.load_macro(filepath)
        
        if not macro_data:
            return False, "Failed to load macro"
        
        actions = macro_data.get('actions', [])
        success_count = 0
        error_count = 0
        
        for action in actions:
            operator_id = action.get('operator', '')
            parameters = action.get('parameters', {})
            
            try:
                # Parse operator ID (e.g., "fo4.create_weapon_preset")
                parts = operator_id.split('.')
                if len(parts) == 2:
                    module_name = parts[0]
                    op_name = parts[1]
                    
                    # Get operator module
                    if hasattr(bpy.ops, module_name):
                        module = getattr(bpy.ops, module_name)
                        if hasattr(module, op_name):
                            operator = getattr(module, op_name)
                            
                            # Execute operator
                            if parameters:
                                operator(**parameters)
                            else:
                                operator()
                            
                            success_count += 1
                        else:
                            print(f"Operator not found: {operator_id}")
                            error_count += 1
                    else:
                        print(f"Module not found: {module_name}")
                        error_count += 1
                else:
                    print(f"Invalid operator ID: {operator_id}")
                    error_count += 1
                    
            except Exception as e:
                print(f"Error executing {operator_id}: {e}")
                error_count += 1
        
        # Update use count
        index = AutomationSystem.load_macro_index()
        for macro in index.get('macros', []):
            if macro['filepath'] == filepath:
                macro['use_count'] = macro.get('use_count', 0) + 1
                break
        AutomationSystem.save_macro_index(index)
        
        result_msg = f"Executed {success_count} actions"
        if error_count > 0:
            result_msg += f", {error_count} errors"
        
        return success_count > 0, result_msg
    
    @staticmethod
    def delete_macro(filepath):
        """Delete a macro"""
        try:
            if os.path.exists(filepath):
                os.remove(filepath)
        except Exception as e:
            return False, f"Failed to delete macro: {e}"
        
        # Update index
        index = AutomationSystem.load_macro_index()
        index['macros'] = [m for m in index.get('macros', []) if m['filepath'] != filepath]
        AutomationSystem.save_macro_index(index)
        
        return True, "Macro deleted"
    
    @staticmethod
    def get_all_macros():
        """Get all saved macros"""
        index = AutomationSystem.load_macro_index()
        return index.get('macros', [])
    
    @staticmethod
    def get_recent_macros(count=5):
        """Get recently used macros"""
        macros = AutomationSystem.get_all_macros()
        macros.sort(key=lambda m: m.get('use_count', 0), reverse=True)
        return macros[:count]

class WorkflowTemplate:
    """Pre-defined workflow templates for common tasks"""
    
    @staticmethod
    def get_templates():
        """Get all available workflow templates"""
        return {
            'complete_weapon': {
                'name': 'Complete Weapon Workflow',
                'description': 'Create, texture, and export a weapon',
                'steps': [
                    {'operator': 'fo4.create_weapon_preset', 'params': {}},
                    {'operator': 'fo4.smart_material_setup', 'params': {}},
                    {'operator': 'fo4.optimize_mesh', 'params': {}},
                    {'operator': 'fo4.validate_mesh', 'params': {}},
                    {'operator': 'fo4.generate_collision_mesh', 'params': {}},
                ]
            },
            'vegetation_patch': {
                'name': 'Vegetation Patch Workflow',
                'description': 'Create optimized vegetation area',
                'steps': [
                    {'operator': 'fo4.create_vegetation_preset', 'params': {}},
                    {'operator': 'fo4.scatter_vegetation', 'params': {'count': 50}},
                    {'operator': 'fo4.combine_vegetation_meshes', 'params': {}},
                    {'operator': 'fo4.optimize_vegetation_fps', 'params': {}},
                    {'operator': 'fo4.create_vegetation_lod_chain', 'params': {}},
                ]
            },
            'npc_creation': {
                'name': 'NPC Creation Workflow',
                'description': 'Create and setup an NPC',
                'steps': [
                    {'operator': 'fo4.create_npc', 'params': {}},
                    {'operator': 'fo4.smart_material_setup', 'params': {}},
                    {'operator': 'fo4.optimize_mesh', 'params': {}},
                ]
            },
            'batch_export': {
                'name': 'Batch Export Workflow',
                'description': 'Optimize and export multiple objects',
                'steps': [
                    {'operator': 'fo4.batch_optimize_meshes', 'params': {}},
                    {'operator': 'fo4.batch_validate_meshes', 'params': {}},
                    {'operator': 'fo4.batch_export_meshes', 'params': {}},
                ]
            }
        }
    
    @staticmethod
    def execute_template(template_id, context):
        """Execute a workflow template"""
        templates = WorkflowTemplate.get_templates()
        
        if template_id not in templates:
            return False, "Template not found"
        
        template = templates[template_id]
        steps = template['steps']
        
        success_count = 0
        for step in steps:
            operator_id = step['operator']
            params = step.get('params', {})
            
            try:
                parts = operator_id.split('.')
                if len(parts) == 2:
                    module = getattr(bpy.ops, parts[0])
                    operator = getattr(module, parts[1])
                    
                    if params:
                        operator(**params)
                    else:
                        operator()
                    
                    success_count += 1
            except Exception as e:
                print(f"Error in template step {operator_id}: {e}")
        
        return success_count > 0, f"Executed {success_count}/{len(steps)} steps"

def register():
    """Register automation system classes"""
    bpy.utils.register_class(RecordedAction)
    bpy.utils.register_class(MacroDefinition)
    
    # Add properties to scene
    bpy.types.Scene.fo4_recorded_actions = CollectionProperty(type=RecordedAction)
    bpy.types.Scene.fo4_is_recording = BoolProperty(default=False)
    bpy.types.Scene.fo4_macro_name = StringProperty(
        name="Macro Name",
        description="Name for the macro",
        default="New Macro"
    )
    bpy.types.Scene.fo4_macro_description = StringProperty(
        name="Description",
        description="Description of what the macro does",
        default=""
    )

def unregister():
    """Unregister automation system classes"""
    if hasattr(bpy.types.Scene, 'fo4_recorded_actions'):
        del bpy.types.Scene.fo4_recorded_actions
    if hasattr(bpy.types.Scene, 'fo4_is_recording'):
        del bpy.types.Scene.fo4_is_recording
    if hasattr(bpy.types.Scene, 'fo4_macro_name'):
        del bpy.types.Scene.fo4_macro_name
    if hasattr(bpy.types.Scene, 'fo4_macro_description'):
        del bpy.types.Scene.fo4_macro_description
    
    bpy.utils.unregister_class(MacroDefinition)
    bpy.utils.unregister_class(RecordedAction)
