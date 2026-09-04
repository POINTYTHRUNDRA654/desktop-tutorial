"""
Quest and dialogue system helpers for Fallout 4 mod creation
"""

import bpy
from bpy.props import StringProperty, IntProperty, BoolProperty, EnumProperty, CollectionProperty
from bpy.types import PropertyGroup

class FO4_QuestStage(PropertyGroup):
    """Represents a quest stage"""
    stage_index: IntProperty(
        name="Stage Index",
        description="Quest stage number",
        default=10,
        min=0
    )
    
    log_entry: StringProperty(
        name="Log Entry",
        description="Text shown in quest log",
        default=""
    )
    
    complete_quest: BoolProperty(
        name="Complete Quest",
        description="This stage completes the quest",
        default=False
    )
    
    fail_quest: BoolProperty(
        name="Fail Quest",
        description="This stage fails the quest",
        default=False
    )

class FO4_QuestObjective(PropertyGroup):
    """Represents a quest objective"""
    index: IntProperty(
        name="Index",
        description="Objective number",
        default=10,
        min=0
    )
    
    display_text: StringProperty(
        name="Display Text",
        description="Text shown to player",
        default="New Objective"
    )
    
    target_ref: StringProperty(
        name="Target Reference",
        description="Reference ID of target object/location",
        default=""
    )

class FO4_DialogueLine(PropertyGroup):
    """Represents a dialogue line"""
    speaker: EnumProperty(
        name="Speaker",
        items=[
            ('PLAYER', "Player", "Player character speaks"),
            ('NPC', "NPC", "NPC speaks"),
        ],
        default='NPC'
    )
    
    text: StringProperty(
        name="Dialogue Text",
        description="What is said",
        default=""
    )
    
    emotion: EnumProperty(
        name="Emotion",
        items=[
            ('NEUTRAL', "Neutral", "Normal tone"),
            ('HAPPY', "Happy", "Positive emotion"),
            ('SAD', "Sad", "Sad emotion"),
            ('ANGRY', "Angry", "Angry emotion"),
            ('FEAR', "Fear", "Fearful emotion"),
            ('DISGUST', "Disgust", "Disgusted emotion"),
            ('SURPRISE', "Surprise", "Surprised emotion"),
        ],
        default='NEUTRAL'
    )
    
    condition: StringProperty(
        name="Condition",
        description="Condition for this line to appear",
        default=""
    )

class FO4_NPCData(PropertyGroup):
    """NPC configuration data"""
    npc_name: StringProperty(
        name="NPC Name",
        description="Display name of the NPC",
        default="Unnamed NPC"
    )
    
    race: EnumProperty(
        name="Race",
        items=[
            ('HUMAN', "Human", "Human NPC"),
            ('GHOUL', "Ghoul", "Ghoul NPC"),
            ('SYNTH', "Synth", "Synth NPC"),
            ('SUPERMUTANT', "Super Mutant", "Super Mutant"),
            ('ROBOT', "Robot", "Robot/Protectron"),
        ],
        default='HUMAN'
    )
    
    faction: EnumProperty(
        name="Faction",
        items=[
            ('NONE', "None", "No faction"),
            ('MINUTEMEN', "Minutemen", "Minutemen faction"),
            ('BOS', "Brotherhood of Steel", "BoS faction"),
            ('RAILROAD', "Railroad", "Railroad faction"),
            ('INSTITUTE', "Institute", "Institute faction"),
            ('RAIDER', "Raider", "Raider faction"),
            ('GUNNER', "Gunner", "Gunner faction"),
            ('SETTLER', "Settler", "Settler/Civilian"),
        ],
        default='NONE'
    )
    
    is_essential: BoolProperty(
        name="Essential",
        description="Cannot be killed",
        default=False
    )
    
    is_unique: BoolProperty(
        name="Unique",
        description="Only one can exist",
        default=False
    )
    
    level: IntProperty(
        name="Level",
        description="NPC level",
        default=1,
        min=1,
        max=100
    )

class QuestHelpers:
    """Helper functions for quest creation"""
    
    @staticmethod
    def create_quest_template():
        """Create a basic quest template structure"""
        quest_data = {
            "quest_id": "MyQuest01",
            "quest_name": "My First Quest",
            "stages": [],
            "objectives": [],
            "dialogue": []
        }
        return quest_data
    
    @staticmethod
    def export_quest_data(quest_data, filepath):
        """Export quest data to JSON format"""
        import json
        try:
            with open(filepath, 'w') as f:
                json.dump(quest_data, f, indent=2)
            return True, "Quest data exported successfully"
        except Exception as e:
            return False, f"Failed to export: {str(e)}"
    
    @staticmethod
    def generate_papyrus_script(quest_id, quest_name, stages=None):
        """Generate a Papyrus script for the quest.

        *stages*: optional iterable of objects/dicts with stage_index,
        log_entry, complete_quest, fail_quest (matches FO4_QuestStage /
        the scene.fo4_quest_stages collection). Every stage actually
        authored in the Quest panel is emitted as its own OnStageSet
        branch -- previously this always emitted a fixed, hardcoded
        stage-10/stage-100 skeleton no matter what stages the user had
        actually added, so anything beyond two stages (or different
        stage numbers) silently never made it into the generated script.
        """
        first_stage = 10
        if stages:
            indices = [getattr(s, "stage_index", None) if not isinstance(s, dict)
                       else s.get("stage_index") for s in stages]
            indices = [i for i in indices if i is not None]
            if indices:
                first_stage = min(indices)

        script = f'''Scriptname {quest_id}Script extends Quest

; Quest: {quest_name}

Event OnStoryScript(Keyword akKeyword, Location akLocation, ObjectReference akRef1, ObjectReference akRef2, int aiValue1, int aiValue2)
    ; Quest start logic here
    SetStage({first_stage})
EndEvent

Event OnStageSet(int auiStageID, int auiItemID)
    ; Handle stage changes
'''
        if stages:
            for i, s in enumerate(stages):
                idx = getattr(s, "stage_index", None) if not isinstance(s, dict) else s.get("stage_index")
                log_entry = (getattr(s, "log_entry", "") if not isinstance(s, dict) else s.get("log_entry", "")) or ""
                complete_quest = getattr(s, "complete_quest", False) if not isinstance(s, dict) else s.get("complete_quest", False)
                fail_quest = getattr(s, "fail_quest", False) if not isinstance(s, dict) else s.get("fail_quest", False)
                if idx is None:
                    continue
                keyword = "if" if i == 0 else "elseif"
                script += f'    {keyword} auiStageID == {idx}\n'
                log_text = log_entry.replace('"', "'") or f"Stage {idx}"
                script += f'        Debug.Notification("{log_text}")\n'
                if complete_quest:
                    script += '        CompleteQuest()\n'
                if fail_quest:
                    # FailAllObjectives() + Stop() -- verified against the
                    # real Fallout4 CreationKit Quest script reference:
                    # both are genuine native Quest functions, and
                    # FailAllObjectives() is the documented call for marking
                    # a quest failed (Stop() alone only halts tracking, it
                    # doesn't flag the quest as failed in the journal).
                    script += '        FailAllObjectives()\n'
                    script += '        Stop()\n'
            script += '    endif\n'
        else:
            # No stages authored yet -- fall back to the original
            # placeholder skeleton so the generated file is still valid
            # Papyrus and gives the modder something to build from.
            script += (
                '    if auiStageID == 10\n'
                '        ; Stage 10 logic\n'
                f'        Debug.Notification("Quest started: {quest_name}")\n'
                '    elseif auiStageID == 100\n'
                '        ; Quest completion\n'
                f'        Debug.Notification("Quest completed: {quest_name}")\n'
                '        CompleteQuest()\n'
                '    endif\n'
            )
        script += 'EndEvent\n'
        return script

def register():
    """Register quest-related property groups"""
    bpy.utils.register_class(FO4_QuestStage)
    bpy.utils.register_class(FO4_QuestObjective)
    bpy.utils.register_class(FO4_DialogueLine)
    bpy.utils.register_class(FO4_NPCData)
    
    # Add properties to Scene
    bpy.types.Scene.fo4_quest_stages = CollectionProperty(type=FO4_QuestStage)
    bpy.types.Scene.fo4_quest_objectives = CollectionProperty(type=FO4_QuestObjective)
    bpy.types.Scene.fo4_dialogue_lines = CollectionProperty(type=FO4_DialogueLine)
    bpy.types.Scene.fo4_npc_data = CollectionProperty(type=FO4_NPCData)
    bpy.types.Scene.fo4_quest_name = StringProperty(
        name="Quest Name", default="My First Quest",
        description="Name shown in the CK / quest log",
    )
    bpy.types.Scene.fo4_quest_id = StringProperty(
        name="Quest ID", default="MyQuest01",
        description="Editor ID for the Quest record",
    )

def unregister():
    """Unregister quest-related property groups"""
    if hasattr(bpy.types.Scene, 'fo4_quest_stages'):
        del bpy.types.Scene.fo4_quest_stages
    if hasattr(bpy.types.Scene, 'fo4_quest_objectives'):
        del bpy.types.Scene.fo4_quest_objectives
    if hasattr(bpy.types.Scene, 'fo4_dialogue_lines'):
        del bpy.types.Scene.fo4_dialogue_lines
    if hasattr(bpy.types.Scene, 'fo4_npc_data'):
        del bpy.types.Scene.fo4_npc_data
    if hasattr(bpy.types.Scene, 'fo4_quest_name'):
        del bpy.types.Scene.fo4_quest_name
    if hasattr(bpy.types.Scene, 'fo4_quest_id'):
        del bpy.types.Scene.fo4_quest_id
    
    bpy.utils.unregister_class(FO4_NPCData)
    bpy.utils.unregister_class(FO4_DialogueLine)
    bpy.utils.unregister_class(FO4_QuestObjective)
    bpy.utils.unregister_class(FO4_QuestStage)
