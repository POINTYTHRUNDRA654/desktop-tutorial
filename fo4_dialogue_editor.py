"""fo4_dialogue_editor.py — Visual dialogue tree editor for Fallout 4."""
import bpy, json, os
from bpy.types import NodeTree, Node, NodeSocket


class FO4DialogueTree(NodeTree):
    bl_idname = 'FO4DialogueTreeType'
    bl_label  = 'FO4 Dialogue Tree'
    bl_icon   = 'OUTLINER_DATA_FONT'


class FO4DialogueSocket(NodeSocket):
    bl_idname = 'FO4DialogueSocketType'
    bl_label  = 'Dialogue Line'
    def draw(self, context, layout, node, text):
        layout.label(text=text)
    def draw_color(self, context, node):
        return (0.4, 0.8, 0.4, 1.0)


class FO4DialogueNode(Node):
    bl_idname = 'FO4DialogueNodeType'
    bl_label  = 'Dialogue Line'
    bl_icon   = 'OUTLINER_DATA_FONT'

    speaker: bpy.props.EnumProperty(
        name="Speaker",
        items=[('PLAYER','Player',''),('NPC','NPC',''),('NARRATOR','Narrator','')],
        default='NPC',
    )
    dialogue_text: bpy.props.StringProperty(name="Text", default="Hello there.")
    voice_type: bpy.props.StringProperty(name="Voice Type", default="MaleBoston")
    condition: bpy.props.StringProperty(name="Condition", default="",
        description="Papyrus condition (e.g. 'GetQuestRunning MyQuest == 1')")
    result_script: bpy.props.StringProperty(name="Result Script", default="",
        description="Papyrus fragment run when this line plays")

    def init(self, context):
        self.inputs.new('FO4DialogueSocketType',  'Previous')
        self.outputs.new('FO4DialogueSocketType', 'Next')
        self.outputs.new('FO4DialogueSocketType', 'Branch A')
        self.outputs.new('FO4DialogueSocketType', 'Branch B')

    def draw_buttons(self, context, layout):
        layout.prop(self, "speaker")
        layout.prop(self, "dialogue_text", text="")
        layout.prop(self, "condition",     text="Condition")
        layout.prop(self, "result_script", text="Result")


class FO4TopicNode(Node):
    bl_idname = 'FO4TopicNodeType'
    bl_label  = 'Topic / DIAL'
    bl_icon   = 'SEQUENCE_COLOR_06'

    topic_name: bpy.props.StringProperty(name="Topic", default="MyTopic")
    topic_type: bpy.props.EnumProperty(
        name="Type",
        items=[('TOPIC','Topic',''),('SCENE','Scene',''),('GREETING','Greeting',''),
               ('COMBAT','Combat',''),('DETECTION','Detection','')],
        default='TOPIC',
    )
    priority: bpy.props.IntProperty(name="Priority", default=50, min=0, max=100)

    def init(self, context):
        self.outputs.new('FO4DialogueSocketType', 'Lines')

    def draw_buttons(self, context, layout):
        layout.prop(self, "topic_name")
        layout.prop(self, "topic_type")
        layout.prop(self, "priority")


def export_dialogue_tree_json(node_tree, output_path: str) -> tuple:
    """Export the dialogue node tree to a JSON file + xEdit script."""
    if not node_tree:
        return False, "No node tree provided"

    topics = []
    lines  = []

    for node in node_tree.nodes:
        if node.bl_idname == 'FO4TopicNodeType':
            topics.append({
                "id":       node.name,
                "topic":    node.topic_name,
                "type":     node.topic_type,
                "priority": node.priority,
            })
        elif node.bl_idname == 'FO4DialogueNodeType':
            # Collect branches (connected Next/Branch A/B outputs)
            branches = []
            for out in node.outputs:
                for link in out.links:
                    branches.append(link.to_node.name)
            lines.append({
                "id":            node.name,
                "speaker":       node.speaker,
                "text":          node.dialogue_text,
                "voice_type":    node.voice_type,
                "condition":     node.condition,
                "result_script": node.result_script,
                "branches":      branches,
            })

    data = {"topics": topics, "lines": lines}
    os.makedirs(os.path.dirname(os.path.abspath(output_path)), exist_ok=True)
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2)

    # Generate xEdit script
    pas_lines = [
        "; Dialogue tree export — run in FO4Edit",
        "unit UserScript;",
        "function Initialize: Integer;",
        "var esp, grp, rec: IInterface; begin",
    ]
    for topic in topics:
        pas_lines += [
            f"  // DIAL: {topic['topic']}",
            f"  grp := Add(esp, 'DIAL', True);",
            f"  rec := Add(grp, 'DIAL', True);",
            f"  SetElementEditValues(rec, 'EDID', '{topic['topic']}');",
            f"  SetElementEditValues(rec, 'QNAM', ''); // Set quest FormID",
        ]
    for line in lines:
        pas_lines += [
            f"  // INFO: {line['text'][:40]}",
            f"  grp := Add(esp, 'INFO', True);",
            f"  rec := Add(grp, 'INFO', True);",
            f"  SetElementEditValues(rec, 'NAM1 - Response Text', '{line['text']}');",
            f"  SetElementEditValues(rec, 'ANAM - Speaker', '{line['voice_type']}');",
        ]
    pas_lines += ["  Result := 0; end; end."]

    pas_path = output_path.replace(".json", ".pas")
    with open(pas_path, "w", encoding="utf-8") as f:
        f.write("\n".join(pas_lines))

    return True, f"Exported {len(topics)} topics, {len(lines)} lines → {output_path}"


class FO4_OT_NewDialogueTree(bpy.types.Operator):
    """Create a new FO4 Dialogue Tree node tree."""
    bl_idname  = "fo4.new_dialogue_tree"
    bl_label   = "New Dialogue Tree"
    bl_options = {'REGISTER', 'UNDO'}

    tree_name: bpy.props.StringProperty(name="Tree Name", default="MyDialogue")

    def execute(self, context):
        tree = bpy.data.node_groups.new(self.tree_name, 'FO4DialogueTreeType')
        # Add starter topic and greeting node
        topic = tree.nodes.new('FO4TopicNodeType')
        topic.location = (-200, 0)
        topic.topic_name = self.tree_name + "_Greeting"
        first = tree.nodes.new('FO4DialogueNodeType')
        first.location = (100, 0)
        first.dialogue_text = "Hello, wanderer. What brings you here?"
        tree.links.new(topic.outputs[0], first.inputs[0])
        self.report({'INFO'}, f"Dialogue tree '{self.tree_name}' created — open Node Editor to edit")
        return {'FINISHED'}


class FO4_OT_ExportDialogueTree(bpy.types.Operator):
    """Export active dialogue tree to JSON + xEdit script."""
    bl_idname  = "fo4.export_dialogue_tree"
    bl_label   = "Export Dialogue Tree"
    bl_options = {'REGISTER'}

    output_path: bpy.props.StringProperty(
        name="Output Path", subtype='FILE_PATH', default="//dialogue.json",
    )

    def execute(self, context):
        # Find FO4 dialogue trees
        trees = [t for t in bpy.data.node_groups
                 if t.bl_idname == 'FO4DialogueTreeType']
        if not trees:
            self.report({'ERROR'}, "No FO4 Dialogue Tree found — create one first")
            return {'CANCELLED'}
        ok, msg = export_dialogue_tree_json(trees[0], bpy.path.abspath(self.output_path))
        self.report({'INFO'} if ok else {'ERROR'}, msg)
        return {'FINISHED'}


_CLASSES = [
    FO4DialogueTree, FO4DialogueSocket, FO4DialogueNode, FO4TopicNode,
    FO4_OT_NewDialogueTree, FO4_OT_ExportDialogueTree,
]


def register():
    for cls in _CLASSES:
        try: bpy.utils.register_class(cls)
        except Exception: pass


def unregister():
    for cls in reversed(_CLASSES):
        try: bpy.utils.unregister_class(cls)
        except Exception: pass
