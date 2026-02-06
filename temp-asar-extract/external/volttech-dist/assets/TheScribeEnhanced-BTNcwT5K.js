import{r as b,j as e,v as _,K as F,Z as K,X,N as Y}from"./index-CEqdjNqX.js";import{F as J}from"./file-code-BmPtfYDB.js";import{P as ee}from"./palette-DF8k-7ED.js";import{P as te}from"./play-txtn9UkQ.js";import{C as se}from"./copy-D3A4jLxT.js";import{T as z}from"./triangle-alert-zWUHrt1_.js";const pe=()=>{const[r,S]=b.useState("papyrus"),[j,v]=b.useState(""),[C,y]=b.useState([]),[k,T]=b.useState(!1),[w,A]=b.useState(null),[$,D]=b.useState(!1),[O,E]=b.useState("");b.useEffect(()=>((async()=>{try{const s=await window.electronAPI.getSettings();A(s),window.electronAPI.onSettingsUpdated(a=>A(a))}catch(s){console.warn("[TheScribe] Failed to load settings",s)}})(),()=>{}),[]),b.useEffect(()=>{(async()=>{var a;const s=N();if(!s.trim()){E("");return}try{const n=(a=window.electron)==null?void 0:a.api;if(n!=null&&n.getToolVersion){const d=await n.getToolVersion(s);E(d||"")}else E("")}catch(n){console.warn("Tool version lookup failed",n),E("")}})()},[r,w]);const N=()=>w?r==="papyrus"?w.creationKitPath||"":r==="xedit"?w.xeditPath||"":r==="blender"&&w.blenderPath||"":"",B=()=>r==="papyrus"?"Creation Kit":r==="xedit"?"xEdit":r==="blender"?"Blender":"Tool",M=async()=>{var a;const t=N(),s=B();if(!t||!t.trim()){alert(`Set a path for ${s} in Tool Settings before launching.`);return}D(!0);try{const n=(a=window.electron)==null?void 0:a.api;n!=null&&n.openExternal?await n.openExternal(t):alert("Launching external tools requires the Desktop Bridge (Electron).")}catch(n){console.error("Failed to launch tool:",n),alert(`Could not launch ${s}. Check the configured path in Tool Settings.`)}finally{D(!1)}},V=t=>{const s=[],a=t.split(`
`),n=a.findIndex(i=>i.trim()&&!i.trim().startsWith(";")),d=n>=0?a[n].trim():"";let m;if(!d||!/^ScriptName\s+\w+/i.test(d))s.push({line:Math.max(1,n+1),message:'Script must start with "ScriptName <Name>" declaration',severity:"error"});else{const i=d.match(/ScriptName\s+\w+(?:\s+extends\s+(\w+))?/i);i&&(i[1]?/^(Quest|Actor|ObjectReference)$/i.test(i[1])?m=i[1]:s.push({line:n+1,message:`Unknown extends type "${i[1]}"; common bases are Quest, Actor, ObjectReference`,severity:"info"}):s.push({line:n+1,message:'Script should declare base type with "extends" (e.g., Quest/Actor/ObjectReference)',severity:"warning"}))}const u=[],h=(i,l,o)=>u.push({kind:i,name:l,line:o}),p=(i,l,o)=>{const c=[...u].reverse().findIndex(I=>I.kind===i);c===-1?s.push({line:l,message:`${o} without matching start`,severity:"error"}):u.splice(u.length-1-c,1)},g={Quest:["OnQuestInit","OnStoryScript","OnStageSet"],Actor:["OnInit","OnCombatStateChanged","OnDeath","OnLocationChange"],ObjectReference:["OnActivate","OnContainerChanged","OnInit","OnLoad"]},x=i=>new RegExp(`^\\s*Import\\s+${i}\\b`,"im").test(t);a.forEach((i,l)=>{const o=l+1,c=i.trim();if(!c||c.startsWith(";"))return;const I=c.match(/^Event\s+([A-Za-z0-9_.]+)/),P=c.match(/^Function\s+([A-Za-z0-9_]+)\s*\(/);if(I){const f=I[1],L=f.includes(".")?f.split(".")[1]:f;h("Event",L,o),m&&g[m]&&(g[m].map(Z=>Z.toLowerCase()).includes(L.toLowerCase())||s.push({line:o,message:`Event "${f}" may not be valid for base ${m}`,severity:"warning"}))}else P&&h("Function",P[1],o);/^EndEvent\b/.test(c)&&p("Event",o,"EndEvent"),/^EndFunction\b/.test(c)&&p("Function",o,"EndFunction"),/^EndIf\b/.test(c)&&p("If",o,"EndIf"),/^EndWhile\b/.test(c)&&p("While",o,"EndWhile"),/^If\b/.test(c)&&h("If",void 0,o),/^While\b/.test(c)&&h("While",void 0,o);const R=c.match(/^([A-Za-z0-9_]+)\s+Property\s+([A-Za-z0-9_]+)(.*)$/i);if(R){const f=R[3]||"";!/\bAuto\b/i.test(f)&&!/=/.test(f)&&s.push({line:o,message:"Property should use Auto or explicit getter/setter implementation",severity:"info"})}/(\bF4SE\b|\bUI\.|\bInput\.|\bConsoleUtil\.)/.test(c)&&!(x("F4SE")||x("UI")||x("Input")||x("ConsoleUtil"))&&s.push({line:o,message:"Using F4SE/UI/Input/ConsoleUtil functions requires Import at script top",severity:"error"}),/\bGetDistance\s*\(/.test(c)&&s.push({line:o,message:"Prefer GetDistance(ObjectReference) or vector math over deprecated forms",severity:"warning"})});for(const i of u){const l=i.kind==="Event"?"EndEvent":i.kind==="Function"?"EndFunction":i.kind==="If"?"EndIf":"EndWhile";s.push({line:i.line,message:`${i.kind} started here is missing matching ${l}`,severity:"error"})}return s},U=t=>{const s=[],a=t.split(`
`),n=a.findIndex(l=>l.trim()),d=n>=0?a[n].trim():"";/^unit\s+\w+;?/i.test(d)||s.push({line:Math.max(1,n+1),message:'xEdit script must start with "unit <Name>;"',severity:"error"});const m=/function\s+Initialize\s*:\s*integer\s*;/i.test(t),u=/function\s+Process\s*\(.*IInterface.*\)\s*:\s*integer\s*;/i.test(t),h=/function\s+Finalize\s*:\s*integer\s*;/i.test(t);!m&&!u&&s.push({line:1,message:"Script should implement Initialize or Process function",severity:"warning"}),h||s.push({line:1,message:"Consider adding Finalize for cleanup/logging",severity:"info"}),/end\./i.test(t.trim())||s.push({line:a.length,message:'Script should end with "end."',severity:"error"});const p=/function\s+(Initialize|Process|Finalize)[\s\S]*?begin([\s\S]*?)end\s*;/gi;let g;const x=[];for(;(g=p.exec(t))!==null;){const l=g[1];x.push(l.toLowerCase());const o=g[2];/Result\s*:=\s*0\s*;/.test(o)||s.push({line:1,message:`${l} should set Result := 0;`,severity:"info"})}const i=(t.match(/function\s+(Initialize|Process|Finalize)/gi)||[]).map(l=>l.toLowerCase());for(const l of i)x.includes(l)||s.push({line:1,message:`Function ${l} missing begin/end; block`,severity:"error"});return s},G=t=>{const s=[],a=t.split(`
`);/\bimport\s+bpy\b/.test(t)||s.push({line:1,message:"Blender scripts must import bpy",severity:"error"}),a.forEach((m,u)=>{const h=u+1,p=m.trim();p&&(/\bbpy\.context\.object\b/.test(p)&&!/if\s+bpy\.context\.object/.test(t)&&s.push({line:h,message:'Guard access: use "if bpy.context.object:" before bpy.context.object',severity:"warning"}),/\bbpy\.ops\.object\.select_name\b/.test(p)&&s.push({line:h,message:"select_name is deprecated; use obj.select_set(True)",severity:"warning"}))});const n=/\bbpy\.ops\./.test(t),d=/(bpy\.context\.view_layer\.objects\.active\s*=|obj\.select_set\(|with\s+bpy\.context\.temp_override)/.test(t);return n&&!d&&s.push({line:1,message:"bpy.ops calls usually require active object or context override",severity:"info"}),/\bbpy\.ops\.export_/.test(t)&&!/os\.path\.join\(/.test(t)&&s.push({line:1,message:"Use os.path.join() for stable export file paths",severity:"info"}),s},Q=()=>{let t=[];switch(r){case"papyrus":t=V(j);break;case"xedit":t=U(j);break;case"blender":t=G(j);break}y(t)},W=()=>{navigator.clipboard.writeText(j),T(!0),setTimeout(()=>T(!1),2e3)},q={papyrus:{quest:`ScriptName MyQuestScript extends Quest

Event OnQuestInit()
    Debug.Trace("Quest initialized")
    RegisterForRemoteEvent(Game.GetPlayer(), "OnLocationChange")
EndEvent

Event Actor.OnLocationChange(Actor akSender, Location akOldLoc, Location akNewLoc)
    Debug.Notification("Location changed!")
EndEvent`,actor:`ScriptName MyActorScript extends Actor

Event OnInit()
    Debug.Trace("Actor initialized")
EndEvent

Event OnCombatStateChanged(Actor akTarget, int aeCombatState)
    If aeCombatState == 1
        Debug.Notification("Entering combat!")
    EndIf
EndEvent

Event OnDeath(Actor akKiller)
    Debug.Trace("Actor died")
EndEvent`,objectReference:`ScriptName MyObjectScript extends ObjectReference

Event OnActivate(ObjectReference akActionRef)
    If akActionRef == Game.GetPlayer()
        Debug.Notification("Player activated object")
        ; Your code here
    EndIf
EndEvent

Event OnContainerChanged(ObjectReference akNewContainer, ObjectReference akOldContainer)
    Debug.Trace("Container changed")
EndEvent`},xedit:{basic:`unit UserScript;

function Initialize: integer;
begin
  Result := 0;
  AddMessage('Script initialized');
end;

function Process(e: IInterface): integer;
begin
  Result := 0;
  
  // Process each record
  AddMessage('Processing: ' + GetEditValue(e, 'EDID'));
  
  // Your code here
  
end;

function Finalize: integer;
begin
  Result := 0;
  AddMessage('Script complete');
end;

end.`,renumber:`unit RenumberFormIDs;

var
  targetPlugin: IInterface;
  newFormIDBase: integer;

function Initialize: integer;
begin
  Result := 0;
  targetPlugin := FileByName('MyMod.esp');
  newFormIDBase := $01000800; // New FormID base
end;

function Process(e: IInterface): integer;
var
  oldFormID, newFormID: integer;
begin
  Result := 0;
  
  if GetFile(e) <> targetPlugin then
    Exit;
  
  oldFormID := GetLoadOrderFormID(e);
  newFormID := newFormIDBase;
  Inc(newFormIDBase);
  
  // Renumber
  SetLoadOrderFormID(e, newFormID);
  AddMessage(Format('Changed %s from %s to %s', [GetEditValue(e, 'EDID'), IntToHex(oldFormID, 8), IntToHex(newFormID, 8)]));
end;

end.`},blender:{basic:`import bpy

# Get active object
obj = bpy.context.active_object

if obj:
    print(f"Selected object: {obj.name}")
    
    # Modify object
    obj.location = (0, 0, 0)
    obj.scale = (1, 1, 1)
else:
    print("No object selected")`,export:`import bpy
import os

# Export settings
export_path = "D:/FO4/Data/Meshes/"
export_name = "my_mesh.nif"

# Select all mesh objects
bpy.ops.object.select_all(action='DESELECT')
for obj in bpy.data.objects:
    if obj.type == 'MESH':
        obj.select_set(True)

# Export as NIF (requires PyNifly plugin)
filepath = os.path.join(export_path, export_name)
bpy.ops.export_scene.nif(
    filepath=filepath,
    use_selection=True,
    apply_scale=True
)

print(f"Exported to {filepath}")`,batch:`import bpy

# Batch process all meshes
for obj in bpy.data.objects:
    if obj.type != 'MESH':
        continue
    
    # Select object
    bpy.context.view_layer.objects.active = obj
    obj.select_set(True)
    
    # Apply transformations
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    
    # Add modifier
    mod = obj.modifiers.new(name="EdgeSplit", type='EDGE_SPLIT')
    mod.split_angle = 0.523599  # 30 degrees
    
    # Apply modifier
    bpy.ops.object.modifier_apply(modifier="EdgeSplit")
    
    obj.select_set(False)
    print(f"Processed: {obj.name}")

print("Batch processing complete")`}},H=t=>{const s=q[r];s&&t in s&&(v(s[t]),y([]))};return e.jsxs("div",{className:"flex flex-col h-full bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900",children:[e.jsx("div",{className:"p-6 border-b border-slate-700/50 bg-slate-800/50",children:e.jsxs("div",{className:"flex items-center justify-between",children:[e.jsxs("div",{className:"flex items-center gap-3",children:[e.jsx(_,{className:"w-8 h-8 text-purple-400"}),e.jsxs("div",{children:[e.jsx("h1",{className:"text-2xl font-bold text-white",children:"The Scribe"}),e.jsx("p",{className:"text-sm text-slate-400",children:"Script Writing & Validation"})]})]}),e.jsxs("div",{className:"flex gap-2 bg-slate-900 rounded-lg p-1",children:[e.jsxs("button",{onClick:()=>{S("papyrus"),v(""),y([])},className:`flex items-center gap-2 px-4 py-2 rounded-md transition-all ${r==="papyrus"?"bg-purple-600 text-white":"text-slate-400 hover:text-white hover:bg-slate-800"}`,children:[e.jsx(_,{className:"w-4 h-4"}),"Papyrus"]}),e.jsxs("button",{onClick:()=>{S("xedit"),v(""),y([])},className:`flex items-center gap-2 px-4 py-2 rounded-md transition-all ${r==="xedit"?"bg-amber-600 text-white":"text-slate-400 hover:text-white hover:bg-slate-800"}`,children:[e.jsx(J,{className:"w-4 h-4"}),"xEdit"]}),e.jsxs("button",{onClick:()=>{S("blender"),v(""),y([])},className:`flex items-center gap-2 px-4 py-2 rounded-md transition-all ${r==="blender"?"bg-blue-600 text-white":"text-slate-400 hover:text-white hover:bg-slate-800"}`,children:[e.jsx(ee,{className:"w-4 h-4"}),"Blender"]})]})]})}),e.jsxs("div",{className:"flex-1 flex overflow-hidden",children:[e.jsxs("div",{className:"flex-1 flex flex-col border-r border-slate-700/50",children:[e.jsxs("div",{className:"p-3 border-b border-slate-700/50 bg-slate-800/30 flex items-center justify-between",children:[e.jsx("div",{className:"flex gap-2",children:e.jsxs("select",{onChange:t=>H(t.target.value),className:"bg-slate-900 border border-slate-600 rounded px-3 py-1.5 text-sm text-white focus:border-emerald-500 focus:outline-none",children:[e.jsx("option",{value:"",children:"Load Template..."}),r==="papyrus"&&e.jsxs(e.Fragment,{children:[e.jsx("option",{value:"quest",children:"Quest Script"}),e.jsx("option",{value:"actor",children:"Actor Script"}),e.jsx("option",{value:"objectReference",children:"Object Reference"})]}),r==="xedit"&&e.jsxs(e.Fragment,{children:[e.jsx("option",{value:"basic",children:"Basic Script"}),e.jsx("option",{value:"renumber",children:"Renumber FormIDs"})]}),r==="blender"&&e.jsxs(e.Fragment,{children:[e.jsx("option",{value:"basic",children:"Basic Script"}),e.jsx("option",{value:"export",children:"Export NIF"}),e.jsx("option",{value:"batch",children:"Batch Process"})]})]})}),e.jsxs("div",{className:"flex gap-2",children:[e.jsxs("button",{onClick:M,disabled:$||!N().trim(),className:"flex items-center gap-2 px-3 py-1.5 bg-blue-700 hover:bg-blue-600 text-white rounded text-sm font-medium transition-colors disabled:opacity-50",children:[e.jsx(te,{className:"w-4 h-4"}),r==="papyrus"&&"Launch CK",r==="xedit"&&"Launch xEdit",r==="blender"&&"Launch Blender"]}),N().trim()&&e.jsx("span",{className:"text-[11px] text-slate-400 px-2 py-1 bg-slate-800 border border-slate-700 rounded",children:O?`Version: ${O}`:"Version: unknown"}),e.jsxs("button",{onClick:Q,className:"flex items-center gap-2 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-sm font-medium transition-colors",children:[e.jsx(F,{className:"w-4 h-4"}),"Validate"]}),e.jsxs("button",{onClick:W,className:"flex items-center gap-2 px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-white rounded text-sm font-medium transition-colors",children:[k?e.jsx(F,{className:"w-4 h-4"}):e.jsx(se,{className:"w-4 h-4"}),k?"Copied!":"Copy"]})]})]}),e.jsx("div",{className:"flex-1 p-4 overflow-auto bg-slate-950",children:e.jsx("textarea",{value:j,onChange:t=>v(t.target.value),placeholder:`Enter your ${r} code here...`,className:"w-full h-full bg-transparent text-emerald-400 font-mono text-sm resize-none focus:outline-none",spellCheck:!1,style:{minHeight:"100%",lineHeight:"1.5",tabSize:4}})})]}),e.jsxs("div",{className:"w-96 flex flex-col bg-slate-900/50",children:[e.jsx("div",{className:"p-4 border-b border-slate-700/50",children:e.jsxs("h2",{className:"text-lg font-bold text-white flex items-center gap-2",children:[e.jsx(z,{className:"w-5 h-5 text-amber-400"}),"Validation Results"]})}),e.jsxs("div",{className:"flex-1 overflow-auto p-4 space-y-2",children:[C.length===0&&e.jsxs("div",{className:"text-center py-12 text-slate-500",children:[e.jsx(F,{className:"w-12 h-12 mx-auto mb-3 opacity-50"}),e.jsx("p",{children:"No issues detected"}),e.jsx("p",{className:"text-sm mt-1",children:'Click "Validate" to check your code'})]}),C.map((t,s)=>{const a={error:"border-red-500/50 bg-red-900/20 text-red-400",warning:"border-amber-500/50 bg-amber-900/20 text-amber-400",info:"border-blue-500/50 bg-blue-900/20 text-blue-400"},d={error:X,warning:z,info:K}[t.severity];return e.jsx("div",{className:`border rounded-lg p-3 ${a[t.severity]}`,children:e.jsxs("div",{className:"flex items-start gap-2",children:[e.jsx(d,{className:"w-4 h-4 flex-shrink-0 mt-0.5"}),e.jsxs("div",{className:"flex-1",children:[e.jsxs("div",{className:"flex items-center gap-2 mb-1",children:[e.jsx("span",{className:"text-xs font-bold uppercase",children:t.severity}),e.jsxs("span",{className:"text-xs opacity-70",children:["Line ",t.line]})]}),e.jsx("p",{className:"text-sm",children:t.message})]})]})},s)})]}),e.jsxs("div",{className:"p-4 border-t border-slate-700/50 bg-slate-800/30",children:[e.jsxs("h3",{className:"text-sm font-bold text-white mb-2 flex items-center gap-2",children:[e.jsx(Y,{className:"w-4 h-4 text-emerald-400"}),"Quick Tips"]}),e.jsxs("div",{className:"space-y-1 text-xs text-slate-400",children:[r==="papyrus"&&e.jsxs(e.Fragment,{children:[e.jsx("p",{children:"• Always start with ScriptName declaration"}),e.jsx("p",{children:"• Close all Event/Function blocks"}),e.jsx("p",{children:"• Import F4SE if using F4SE functions"}),e.jsx("p",{children:'• Use "Auto" for simple properties'})]}),r==="xedit"&&e.jsxs(e.Fragment,{children:[e.jsx("p",{children:'• Start with "unit" declaration'}),e.jsx("p",{children:"• Implement Initialize/Process/Finalize"}),e.jsx("p",{children:"• Use AddMessage() for logging"}),e.jsx("p",{children:'• End with "end."'})]}),r==="blender"&&e.jsxs(e.Fragment,{children:[e.jsx("p",{children:"• Always import bpy first"}),e.jsx("p",{children:"• Check if objects exist before accessing"}),e.jsx("p",{children:"• Use bpy.context for active objects"}),e.jsx("p",{children:"• Use bpy.data for all data"})]})]})]})]})]})]})};export{pe as TheScribe};
