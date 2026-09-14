"""
Tutorial system for guiding users through Fallout 4 mod creation
"""

import bpy
from bpy.props import StringProperty, IntProperty

class TutorialStep:
    """Represents a single tutorial step"""
    def __init__(self, title, description, action=None, validation=None):
        self.title = title
        self.description = description
        self.action = action
        self.validation = validation

class Tutorial:
    """Represents a complete tutorial"""
    def __init__(self, name, description, steps):
        self.name = name
        self.description = description
        self.steps = steps
        self.current_step = 0
    
    def get_current_step(self):
        if self.current_step < len(self.steps):
            return self.steps[self.current_step]
        return None
    
    def next_step(self):
        if self.current_step < len(self.steps) - 1:
            self.current_step += 1
            return True
        return False
    
    def previous_step(self):
        if self.current_step > 0:
            self.current_step -= 1
            return True
        return False

# Tutorial definitions
TUTORIALS = {}

def create_basic_mesh_tutorial():
    """Tutorial for creating a basic mesh for Fallout 4"""
    steps = [
        TutorialStep(
            "Create Base Mesh",
            "Start by creating a base mesh. Use Shift+A to add a mesh object.",
        ),
        TutorialStep(
            "Apply Scale",
            "Apply the object's scale by pressing Ctrl+A and selecting 'Scale'.",
        ),
        TutorialStep(
            "Add UV Map",
            "Add a UV map by entering Edit mode (Tab), pressing U, and selecting 'Unwrap'.",
        ),
        TutorialStep(
            "Optimize Mesh",
            "Use the 'Optimize for FO4' button to ensure mesh meets Fallout 4 requirements.",
        ),
        TutorialStep(
            "Add Materials",
            "Add materials to your mesh using the 'Setup FO4 Materials' button.",
        ),
    ]
    return Tutorial("Basic Mesh Creation", "Learn to create a basic mesh for Fallout 4", steps)

def create_texture_tutorial():
    """Tutorial for setting up textures"""
    steps = [
        TutorialStep(
            "Prepare Textures",
            "Prepare your texture files (diffuse, normal, specular) in DDS format.",
        ),
        TutorialStep(
            "Setup Material",
            "Use 'Setup FO4 Materials' to create a Fallout 4 compatible material.",
        ),
        TutorialStep(
            "Install Textures",
            "Use 'Install Texture' to load your texture files into the material.",
        ),
        TutorialStep(
            "Validate",
            "Validate your textures using the 'Validate Textures' button.",
        ),
    ]
    return Tutorial("Texture Setup", "Learn to setup textures for Fallout 4", steps)

def create_animation_tutorial():
    """Tutorial for creating animations"""
    steps = [
        TutorialStep(
            "Setup Armature",
            "Use 'Setup FO4 Armature' to create a Fallout 4 compatible skeleton.",
        ),
        TutorialStep(
            "Weight Paint",
            "Enter Weight Paint mode and paint vertex weights for each bone."
        ),
        TutorialStep(
            "Wind Weights",
            "Use 'Generate Wind Weights' to automatically prepare vegetation meshes."
        ),
        TutorialStep(
            "Wind Animation",
            "Use 'Apply Wind Animation' to add a swaying action for Fallout 4."
        ),
        TutorialStep(
            "Create Animation",
            "Switch to Animation workspace and create your animation keyframes.",
        ),
        TutorialStep(
            "Validate",
            "Use 'Validate Animation' to check for common issues.",
        ),
    ]
    return Tutorial("Animation Setup", "Learn to create animations for Fallout 4", steps)


def create_weapon_tutorial():
    """Tutorial for creating a weapon mod"""
    steps = [
        TutorialStep(
            "Create Weapon Preset",
            "Use 'Smart Presets > Create Weapon' to start with an optimized base mesh.",
        ),
        TutorialStep(
            "Model the Weapon",
            "Edit the mesh in Edit Mode (Tab). Model your weapon parts using extrude (E), scale (S), and other tools.",
        ),
        TutorialStep(
            "Quick Prepare",
            "Use 'Automation > Quick Prepare for Export' to automatically optimize and validate your mesh.",
        ),
        TutorialStep(
            "Auto-Load Textures",
            "Prepare textures in a folder. Use 'Smart Material Setup' to automatically detect and load them.",
        ),
        TutorialStep(
            "Generate Collision",
            "Use 'Generate Collision Mesh' to create a simplified collision version of your weapon.",
        ),
        TutorialStep(
            "Export",
            "Use 'Export Mesh' to export your weapon as FBX. Convert to NIF using external tools.",
        ),
    ]
    return Tutorial("Weapon Creation Workflow", "Complete workflow for creating a Fallout 4 weapon", steps)


def create_armor_tutorial():
    """Tutorial for creating an armor mod"""
    steps = [
        TutorialStep(
            "Create Armor Preset",
            "Use 'Smart Presets > Create Armor' to start with an optimized base mesh.",
        ),
        TutorialStep(
            "Model the Armor",
            "Edit the mesh to match the body part. Consider using reference images for better fitting.",
        ),
        TutorialStep(
            "Auto-Fix Issues",
            "Use 'Auto-Fix Common Issues' to automatically fix scale, normals, and other common problems.",
        ),
        TutorialStep(
            "Setup Textures",
            "Use 'Smart Material Setup' to load diffuse, normal, and specular maps automatically.",
        ),
        TutorialStep(
            "Validate Everything",
            "Run 'Validate Before Export' to check for any issues before exporting.",
        ),
        TutorialStep(
            "Export",
            "Export your armor piece. Remember to follow FO4's naming conventions for armor.",
        ),
    ]
    return Tutorial("Armor Creation Workflow", "Complete workflow for creating Fallout 4 armor", steps)


def create_batch_workflow_tutorial():
    """Tutorial for batch processing multiple objects"""
    steps = [
        TutorialStep(
            "Select Multiple Objects",
            "Hold Shift and click multiple objects in the outliner, or use Box Select (B) in the viewport.",
        ),
        TutorialStep(
            "Batch Optimize",
            "Use 'Batch Processing > Batch Optimize' to optimize all selected meshes at once.",
        ),
        TutorialStep(
            "Batch Validate",
            "Use 'Batch Validate' to check all selected meshes for issues in one go.",
        ),
        TutorialStep(
            "Batch Export",
            "Use 'Batch Export' to export all selected meshes to a folder. Choose your export directory.",
        ),
        TutorialStep(
            "Review Results",
            "Check the info bar for success/failure counts and any warnings about specific objects.",
        ),
    ]
    return Tutorial("Batch Processing Workflow", "Learn to efficiently process multiple objects", steps)


def create_troubleshooting_tutorial():
    """Tutorial for troubleshooting common issues"""
    steps = [
        TutorialStep(
            "Check Notifications",
            "Look at the Notifications section in the main panel for recent errors or warnings.",
        ),
        TutorialStep(
            "Run Validation",
            "Use 'Validate Mesh' to get detailed information about what's wrong with your mesh.",
        ),
        TutorialStep(
            "Auto-Fix Common Issues",
            "Try 'Auto-Fix Common Issues' which automatically fixes scale, normals, loose geometry, and UV issues.",
        ),
        TutorialStep(
            "Check Poly Count",
            "Use 'Analyze Mesh Quality' to check if your mesh exceeds FO4's 65,535 polygon limit.",
        ),
        TutorialStep(
            "Use Smart Decimate",
            "If poly count is too high, use 'Smart Decimate' to intelligently reduce polygons while preserving detail.",
        ),
        TutorialStep(
            "Final Validation",
            "Run 'Validate Before Export' to do a comprehensive check before exporting.",
        ),
    ]
    return Tutorial("Troubleshooting Common Issues", "Learn to diagnose and fix common problems", steps)


def create_vegetation_tutorial():
    """Tutorial for creating vegetation and landscaping"""
    steps = [
        TutorialStep(
            "Create Vegetation Base",
            "Use 'Vegetation > Create Vegetation' to create a base vegetation object (tree, bush, grass, etc.).",
        ),
        TutorialStep(
            "Customize the Mesh",
            "Edit the mesh to match your desired look. Add details, adjust proportions, etc.",
        ),
        TutorialStep(
            "Scatter Vegetation",
            "Use 'Scatter Vegetation' to create multiple instances across an area. Adjust count and radius.",
        ),
        TutorialStep(
            "Combine for Performance",
            "Select all scattered vegetation and use 'Combine Selected' to merge into one mesh. This dramatically improves FPS!",
        ),
        TutorialStep(
            "Optimize for FPS",
            "Use 'Optimize for FPS' to reduce polygon count and remove hidden faces that won't be visible.",
        ),
        TutorialStep(
            "Create LOD Chain",
            "Use 'Create LOD Chain' to generate multiple detail levels (LOD0-LOD3) for distance rendering.",
        ),
        TutorialStep(
            "Setup Materials",
            "Use 'Smart Material Setup' to load vegetation textures. The combined mesh can share one material.",
        ),
        TutorialStep(
            "Export",
            "Export your optimized vegetation as a single mesh. One mesh = minimal FPS impact in FO4!",
        ),
    ]
    return Tutorial("Vegetation & Landscaping", "Create performance-optimized vegetation for Fallout 4", steps)

def create_creature_rig_tutorial():
    """Tutorial for rigging and animating a brand-new custom creature from a
    static, unrigged mesh (no existing skeleton) — e.g. a scavenged asset
    with disjoint/non-manifold geometry that heat-weighting can't handle."""
    steps = [
        TutorialStep(
            "Check the starting point",
            "In the Scripting tab console, run: obj=bpy.context.object; print(len(obj.data.vertices), obj.vertex_groups[:], obj.find_armature()). "
            "Zero vertex groups and no armature means you're starting from scratch.",
        ),
        TutorialStep(
            "Build a starting armature",
            "Use one of 'Build Flora Rig', 'Build Tentacle Rig', 'Build Quadruped Rig', or a body-plan-specific "
            "builder as your starting skeleton, then rename/add bones to match your creature's real anatomy. "
            "Creature bones don't need the 'NPC ' prefix biped bones require — name them for the anatomy "
            "(e.g. Stem, Jaw_Upper, Tendril_L).",
        ),
        TutorialStep(
            "(Blender 5.2+) Duplicate and Rename for mirrored/repeated chains",
            "If you're building a limb/tentacle chain that repeats (front leg -> rear leg, "
            "Tendril_L -> Tendril_R, or a deform chain that needs an MCH_ prefix copy), duplicate "
            "it and use Armature menu > Duplicate and Rename instead of renaming Bone.001, Bone.002, "
            "etc. by hand -- one Find/Replace pass renames the whole duplicated chain. Also worth "
            "knowing: Shift+A's redo panel now has an 'Align to Axis' option for world-aligned new "
            "bones, and Auto IK can now reach through a disconnected parent down the spine for quick "
            "pose sanity-checks. See fo4_blender_5_2_new_features.md. Skip this step on Blender <5.2.",
        ),
        TutorialStep(
            "Subdivide limbs meant to whip or reach",
            "For any vine/tentacle/whip-like limb, select its bone in Edit Mode and use "
            "Armature > Subdivide (2 cuts) BEFORE weight painting. A single rigid bone looks stiff; "
            "a 3-segment chain animates far more convincingly.",
        ),
        TutorialStep(
            "Try automatic (heat) weighting first",
            "Select mesh, then armature, Ctrl+P > Armature Deform > With Automatic Weights. "
            "If the console warns 'Bone Heat Weighting: failed to find solution for one or more bones' and "
            "every vertex group ends up empty, your mesh is non-manifold/disjoint and heat weighting cannot "
            "solve it — move to the next step instead of retrying it.",
        ),
        TutorialStep(
            "Fall back to envelope weighting, then tighten radii",
            "Re-parent with Ctrl+P > Armature Deform > With Envelope Weights. The default envelope radii are "
            "far too large for small creature bones and will make one bone swallow most of the mesh — scale "
            "each bone's envelope_distance/head_radius/tail_radius proportional to that bone's own length "
            "(roughly 0.5x / 0.22x / 0.16x of bone length) rather than using one fixed value for all bones.",
        ),
        TutorialStep(
            "Close remaining weight gaps",
            "Even tuned envelopes usually miss some thin tips (spikes, small terminal bones) — check for "
            "vertices with zero total weight and assign each one to its geometrically nearest bone at full "
            "weight as a fallback pass. Confirm zero unweighted vertices before moving on.",
        ),
        TutorialStep(
            "Verify deformation for real",
            "Don't trust 'success' messages. Compare the mesh's evaluated (posed) vertex positions against "
            "rest pose using bpy.context.evaluated_depsgraph_get() and obj.evaluated_get(depsgraph).to_mesh() "
            "— if positions are identical, that part of the rig isn't actually deforming.",
        ),
        TutorialStep(
            "Author animations as separate named actions",
            "Create each animation (idle, attack, death, etc.) as its own bpy.data.actions.new(name) so clips "
            "don't overwrite each other. If you reuse an existing animation-generator button, first check what "
            "bone names it expects — a generator written for one naming convention (e.g. 'branch_*') will "
            "silently do nothing on bones named differently, and can overwrite your active action in the process.",
        ),
        TutorialStep(
            "Export FBX for conversion",
            "Export two things: a skeleton-only FBX in bind pose (no baked animation), and one baked, "
            "armature-only FBX per animation clip.",
        ),
        TutorialStep(
            "Convert with ck-cmd — know the current limitation",
            "The correct command for a brand-new creature is 'ck-cmd importrig <skeleton.fbx> -a <anim_folder> "
            "-e <output_dir>' (NOT importanimation, which needs a skeleton.hkx that a new creature doesn't have "
            "yet). As of this writing, importrig can crash on some fully custom skeletons when animations are "
            "included. 'ck-cmd RetargetCreature' is NOT a fix for this — it's a Skyrim LE havok-project tool "
            "bundled in this ck-cmd build and needs a Skyrim install folder, it doesn't apply to FO4 creatures. "
            "If importrig crashes, the real fallback is rebuilding your rig on an EXISTING FO4 creature's "
            "skeleton (which already has a working skeleton.hkx) instead of a from-scratch one.",
        ),
        TutorialStep(
            "Scope the Creation Kit side separately",
            "Getting a creature to actually fight/be killed/dropped loot in-game additionally needs a CK actor/race "
            "record, a behavior graph wired to your exported animations, and Papyrus or keyword-based damage/loot "
            "scripting — this is separate work from the Blender rig/animation pipeline above.",
        ),
    ]
    return Tutorial(
        "Custom Creature Rig (From Scratch)",
        "Rig, weight-paint, and animate a brand-new creature mesh that has no existing skeleton",
        steps,
    )


def initialize_tutorials():
    """Initialize all available tutorials (populate the TUTORIALS dict only)."""
    TUTORIALS['basic_mesh'] = create_basic_mesh_tutorial()
    TUTORIALS['textures'] = create_texture_tutorial()
    TUTORIALS['animation'] = create_animation_tutorial()
    TUTORIALS['weapon'] = create_weapon_tutorial()
    TUTORIALS['armor'] = create_armor_tutorial()
    TUTORIALS['batch_workflow'] = create_batch_workflow_tutorial()
    TUTORIALS['troubleshooting'] = create_troubleshooting_tutorial()
    TUTORIALS['vegetation'] = create_vegetation_tutorial()
    TUTORIALS['creature_rig'] = create_creature_rig_tutorial()

def get_current_tutorial(context):
    """Get the currently active tutorial"""
    tutorial_name = context.scene.fo4_current_tutorial
    if tutorial_name in TUTORIALS:
        tutorial = TUTORIALS[tutorial_name]
        tutorial.current_step = context.scene.fo4_tutorial_step
        return tutorial
    return None

def register():
    """Register tutorial properties"""
    bpy.types.Scene.fo4_current_tutorial = StringProperty(
        name="Current Tutorial",
        default=""
    )
    bpy.types.Scene.fo4_tutorial_step = IntProperty(
        name="Tutorial Step",
        default=0
    )
    initialize_tutorials()

def unregister():
    """Unregister tutorial properties"""
    if hasattr(bpy.types.Scene, 'fo4_current_tutorial'):
        del bpy.types.Scene.fo4_current_tutorial
    if hasattr(bpy.types.Scene, 'fo4_tutorial_step'):
        del bpy.types.Scene.fo4_tutorial_step
