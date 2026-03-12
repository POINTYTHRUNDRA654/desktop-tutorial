import re

with open("d:/Blender addon/preferences.py", "r", encoding="utf-8") as f:
    code = f.read()

# Pattern: match `bpy.props.[Type]Property(` and insert `options={'HIDDEN'}, `
new_code = re.sub(r'(bpy\.props\.\w+Property\()', r"\1options={'HIDDEN'}, ", code)

with open("d:/Blender addon/preferences.py", "w", encoding="utf-8") as f:
    f.write(new_code)
print("Properties hidden.")
