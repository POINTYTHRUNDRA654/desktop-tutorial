import{r as d,j as e,N as r,Z as a,n as i}from"./index-CEqdjNqX.js";import{C as p}from"./chevron-down-HPljEmI-.js";import{C as n}from"./circle-check-big-Cwj_A10u.js";import{F as f}from"./file-code-BmPtfYDB.js";const b=()=>{const[o,l]=d.useState("overview"),m=[{id:"overview",title:"Fallout 4 Animation Pipeline Overview (2026 Standards)",icon:e.jsx(r,{className:"w-5 h-5"}),content:`The modern Fallout 4 animation pipeline uses Blender 4.1+: 

1. Blender (4.1+) → Animation creation using PyNifly or FBX
2. Havok Content Tools 2014 → Build HKX (2010.2.0-r1)
3. HKXPackUI → Pack for Fallout 4

Key constraint: Do NOT rename deform bones in vanilla skeletons.
Key requirement: All animations must be 30 FPS for correct game playback.`,steps:["Import FO4 skeleton rig into Blender via PyNifly","Create animation at 30 FPS","Annotate events with Pose Markers","Export as FBX with Only Deform Bones","Build HKX for FO4 2010.2.0-r1 profile"]},{id:"import-skeleton",title:"Importing FO4 Skeleton into Blender",icon:e.jsx(a,{className:"w-5 h-5"}),content:`Steps to import the Fallout 4 skeleton:

1. Tool: Use PyNifly (latest release)
2. Process:
   - File → Import → NetImmerse/Gamebryo (.nif)
   - Select skeleton NIF from Data\\Meshes\\Actors\\Character\\_Skeleton.nif
   - Set Scale: 1.0 (PyNifly uses Meters natively)

3. Result: Full skeleton with bone names and constraints

Common issue: Using 0.1 scale with modern exporters. Stick to 1.0 (Meters) for Blender 4.x.`,steps:["Download and install PyNifly Blender plugin","Navigate to FO4 data\\meshes\\actors\\character","File → Import → NIF","Select skeleton.nif","Verify scale setting: 1.0 (Meters)","Import and confirm all bones (Root, COM, Pelvis, etc.)"]},{id:"bone-hierarchy",title:"Understanding FO4 Bone Hierarchy",icon:e.jsx(f,{className:"w-5 h-5"}),content:`FO4 skeleton structure (critical for rigging):

ROOT
├─ NPC Root [NPC:\\_0]
├─ Pelvis
│  ├─ Spine1
│  ├─ Spine2
│  ├─ Chest
│  │  ├─ Neck
│  │  │  └─ Head
│  │  ├─ L_Shoulder → L_Upperarm → L_Forearm → L_Hand
│  │  └─ R_Shoulder → R_Upperarm → R_Forearm → R_Hand
├─ L_Thigh → L_Calf → L_Foot
├─ R_Thigh → R_Calf → R_Foot

Key points:
• 60+ bones total (including fingers, toes, facial bones)
• Pelvis is parent to all upper body
• Root bone should NOT animate (world anchor)
• NPC Root drives character movement
• Every bone name must match EXACTLY (case-sensitive)`,steps:["Open skeleton in Blender","Switch to Outliner view","Expand hierarchy fully","Verify bone names match FO4 standard","Check for extra/missing bones","Note: Custom bones will cause export errors"]},{id:"custom-rigging",title:"Custom Skeletal Rigging (Advanced)",icon:e.jsx(i,{className:"w-5 h-5"}),content:`For custom character rigs (armor, clothing, custom bodies):

1. DO NOT create new bones - FO4 won't recognize them
2. Instead: Parent your geometry to EXISTING bones

Process:
   a) Import FO4 skeleton
   b) Add your custom mesh (armor/body/cloth)
   c) Enable Armature modifier on mesh
   d) Set armature target: FO4 Skeleton
   e) Parent mesh to armature (Ctrl+P → With Armature Deformation)
   f) Weight paint: assign vertices to bones

3. Weight painting:
   - Switch to Weight Paint mode
   - Select each bone and paint influence
   - Use soft brush for smooth deformation
   - Avoid creating hard edges (exception: sharp armor seams)
   - Test: Rotate bones in Pose mode to verify deformation

4. Common mistake: Forgetting to remove duplicate bone constraints → causes export errors`,steps:["Import skeleton AND your custom mesh","Select mesh, then skeleton (Shift+click)","Ctrl+P → With Armature Deformation","Switch to Weight Paint mode","Select each bone group (Left arm, Right arm, etc.)","Paint weights (green = full influence, blue = no influence)","Test in Pose mode by rotating bones","Refine weights until satisfied","Verify no bones added to skeleton"]},{id:"animation-creation",title:"Creating Animations",icon:e.jsx(n,{className:"w-5 h-5"}),content:`Step-by-step animation workflow:

1. Setup:
   - Import skeleton (already rigged)
   - Set timeline length: Your animation duration (e.g., 90 frames = 3.0 sec at 30fps)
   - Frame rate: Set to 30 fps (Fallout 4 Standard)

2. Keyframing:
   - Select armature (not mesh)
   - Switch to Pose mode (Tab)
   - Rotate bones to create keyframes
   - Press 'i' to insert keyframe at each pose

3. Annotations:
   - Add Pose Markers (Shift+Alt+M) for annotations
   - Common: "Hit" for impact, "FootstepL" for audio

4. Common pitfall: Animating root bone → will offset character position in-game.
   Solution: Animate NPC Root for movement, keep Root at origin.`,steps:["Set timeline: 1 - [frame count]","Set frame rate: 30 fps (Output → FPS: 30)","Select armature, Tab to Pose mode","Create poses and keyframe (I)","Add Pose Markers for annotations","Verify first and last frames match for loops"]},{id:"nif-export",title:"Exporting to HKX/NIF",icon:e.jsx(a,{className:"w-5 h-5"}),content:`Exporting from Blender 4.1 to Fallout 4:

1. Prep:
   - Select Armature
   - Ensure all keyframes are on deform bones

2. Export process:
   - File → Export → FBX (.fbx)
   - Settings:
     ✓ Only Deform Bones: YES
     ✓ Bake Animation: YES
     ✓ Scale: 1.0

3. Havok Build:
   - Open Havok Content Tools 2014
   - File → Import FBX
   - Filter: Export to HKX
   - Profile: Fallout 4 (2010.2.0-r1)

4. Verification:
   - Open final HKX in HKXPackUI
   - Check for annotation list`,steps:["Select armature","File → Export → FBX","Check Only Deform Bones","Open Havok Content Tools","Build as HKX for FO4 profile","Pack using HKXPackUI"]},{id:"validation",title:"Validation Checklist",icon:e.jsx(n,{className:"w-5 h-5"}),content:`Before importing into Fallout 4, verify:

✓ Bone names: Exact match to FO4 skeleton (case-sensitive)
✓ No extra bones: Only deform bones exported
✓ Scale: 1.0 (Meters)
✓ Root bone: at 0,0,0
✓ NPC Root: check for correct movement translation
✓ Loop detection: First frame = last frame (if looping)
✓ Frame rate: 30 fps
✓ Weight painting: Normalization check (Sum = 1.0)
✓ HKX Build: Using profile 2010.2.0-r1`,steps:["Run Mossy Animation Validator","Fix any weight normalization errors","Export to FBX","Check annotations in HKXPackUI","Test in-game on actual character"]},{id:"common-errors",title:"Common Errors & Solutions",icon:e.jsx(i,{className:"w-5 h-5"}),content:`Problem: Animation plays too fast/slow
Solution: Check scene FPS. FO4 expects 30 FPS. Re-bake animations at 30 FPS.

Problem: Mesh explodes or stretches
Solution: Weight normalization error or extra bones. Ensure sum of weights is 1.0 and export ONLY deform bones.

Problem: Character stays static
Solution: Missing annotations or incorrect HKX build profile. Use 2010.2.0-r1.

Problem: T-Pose in-game
Solution: Skeleton mismatch. Ensure armature wasn't renamed and bone hierarchy is intact.

Problem: FBX Import fails in Havok
Solution: Use Binary FBX 2014/2015 format instead of ASCII.`},{id:"tools",title:"Required Production Tools (2026)",icon:e.jsx(a,{className:"w-5 h-5"}),content:`Essential tools for modern FO4 modding:

1. Blender 4.1+
   - Support for modern geometry and PBR workflows.

2. PyNifly Blender Add-on
   - Best-in-class NIF import/export for modern Blender.

3. Havok Content Tools 2014 (64-bit)
   - Required for converting FBX to HKX animations.

4. HKXPackUI
   - Required for packing animations into the final format.

5. BAE (Bethesda Archive Extractor)
   - For extracting vanilla assets to use as references.`,steps:["Install Blender 4.1+","Enable PyNifly in Preferences","Set up Havok Content Tools paths","Extract skeleton.nif for reference","Begin first project at 30 FPS"]}];return e.jsxs("div",{className:"h-full bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 overflow-hidden flex flex-col",children:[e.jsx("div",{className:"p-6 border-b border-slate-700 bg-slate-800/50",children:e.jsxs("div",{className:"flex items-center gap-3",children:[e.jsx(r,{className:"w-8 h-8 text-cyan-400"}),e.jsxs("div",{children:[e.jsx("h1",{className:"text-2xl font-bold text-white",children:"Blender Animation & Rigging Guide"}),e.jsx("p",{className:"text-sm text-slate-400",children:"Complete pipeline for custom Fallout 4 animations"})]})]})}),e.jsx("div",{className:"flex-1 overflow-y-auto p-6",children:e.jsx("div",{className:"max-w-4xl mx-auto space-y-3",children:m.map(t=>e.jsxs("div",{className:"bg-slate-900 border border-slate-700 rounded-lg overflow-hidden hover:border-cyan-500/50 transition-colors",children:[e.jsxs("button",{onClick:()=>l(o===t.id?"":t.id),className:"w-full px-6 py-4 flex items-center gap-4 hover:bg-slate-800/50 transition-colors text-left",children:[e.jsx("div",{className:"text-cyan-400 flex-shrink-0",children:t.icon}),e.jsx("div",{className:"flex-1",children:e.jsx("h2",{className:"font-bold text-white text-lg",children:t.title})}),e.jsx(p,{className:`w-5 h-5 text-slate-500 transition-transform ${o===t.id?"rotate-180":""}`})]}),o===t.id&&e.jsxs("div",{className:"px-6 py-4 bg-slate-950/50 border-t border-slate-700",children:[e.jsx("div",{className:"text-sm text-slate-300 whitespace-pre-wrap mb-4",children:t.content}),t.steps&&t.steps.length>0&&e.jsxs("div",{className:"mt-4 pt-4 border-t border-slate-700",children:[e.jsxs("h4",{className:"font-semibold text-white mb-3 flex items-center gap-2",children:[e.jsx(n,{className:"w-4 h-4 text-green-400"}),"Step-by-Step"]}),e.jsx("ol",{className:"space-y-2",children:t.steps.map((c,s)=>e.jsxs("li",{className:"flex gap-3 text-sm",children:[e.jsx("span",{className:"text-cyan-400 font-bold flex-shrink-0",children:String(s+1).padStart(2,"0")}),e.jsx("span",{className:"text-slate-300",children:c})]},s))})]})]})]},t.id))})}),e.jsx("div",{className:"p-4 bg-cyan-900/20 border-t border-slate-700",children:e.jsx("p",{className:"text-xs text-cyan-300",children:"💡 Pro Tip: Start with simple looping idle animations before attempting complex combat animations. Practice the pipeline with vanilla animations first."})})]})};export{b as BlenderAnimationGuide};
