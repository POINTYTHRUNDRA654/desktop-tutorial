"""
fo4_texture_resolver.py

Make importing a Fallout 4 asset show its real materials/textures — the way the
game (and MO2's virtual file system) does it — even though Blender isn't running
through MO2's VFS.

Fallout 4 meshes that use a BGSM material store *no* texture paths in the NIF;
the NIF just references a ``.bgsm`` material file, and the texture paths live
inside that BGSM.  On top of that, mod assets live in real mod folders
(e.g. ``E:\\Mod.Organizer-3 ...\\Plants\\Textures\\...``), not the game Data
folder.  This module:

  1. Scans the imported NIF for its ``.bgsm`` (and any inline ``.dds``) refs.
  2. Locates the BGSM under the asset's own mod folder (auto-detected from the
     mesh path: the folder that holds Meshes/Textures/Materials) plus any extra
     search roots the caller supplies.
  3. Parses it with bgsm_helpers.read_bgsm to get diffuse/normal/spec/glow.
  4. Resolves each texture the same way and wires it directly onto the material's
     Principled BSDF — by socket, NOT by node name (PyNifly doesn't name nodes
     'Normal', which is why the addon's old node-name lookup failed on normals).

Nothing here modifies geometry or scale.
"""

from __future__ import annotations

import os
import re
from pathlib import Path

try:
    import bpy
except Exception:
    bpy = None

_IMG_EXTS = ['.dds', '.png', '.tga', '.jpg', '.jpeg', '.tif', '.tiff', '.bmp']


# ---------------------------------------------------------------------------
# NIF reference scan (no full parser needed — texture/material paths are plain
# length-prefixed strings in the file)
# ---------------------------------------------------------------------------
def _scan_nif_refs(nif_path):
    try:
        raw = open(nif_path, 'rb').read()
    except Exception:
        return [], []
    bgsm, dds = [], []
    for m in re.findall(rb'[ -~]{4,}', raw):
        t = m.decode('latin1', 'replace').strip()
        low = t.lower()
        # Trim any leading bytes so the ref starts at a resource root token.
        for tok in ('textures\\', 'materials\\', 'textures/', 'materials/'):
            i = low.find(tok)
            if i > 0:
                t = t[i:]
                low = t.lower()
                break
        if low.endswith('.bgsm') or low.endswith('.bgem'):
            if t not in bgsm:
                bgsm.append(t)
        elif low.endswith('.dds'):
            if t not in dds:
                dds.append(t)
    return bgsm, dds


# ---------------------------------------------------------------------------
# Search roots + file lookup
# ---------------------------------------------------------------------------
def _candidate_roots(source_path, extra_roots=None):
    roots = []

    def add(d):
        try:
            d = Path(d)
            # Never search a bare drive/filesystem root (e.g. 'F:\\'): an rglob
            # over that can crawl the whole drive and hang the import for minutes.
            if len(d.parts) <= 1 or str(d) == d.anchor:
                return
            if d.exists() and d.is_dir() and d not in roots:
                roots.append(d)
        except Exception:
            pass

    p = Path(source_path)
    parts = list(p.parts)
    # Mod root = the folder that contains 'Meshes' (siblings: Textures, Materials)
    for i in range(len(parts) - 1, -1, -1):
        if parts[i].lower() == 'meshes':
            add(Path(*parts[:i]))
            break
    add(p.parent)
    for up in list(p.parents)[:6]:
        add(up)
    for r in (extra_roots or []):
        if not r:
            continue
        p_extra = Path(r)
        add(p_extra)
        # If this looks like an MO2 mods parent directory (its immediate children
        # have Textures/, Meshes/, or Materials/ inside them), expand one level so
        # each individual mod folder is added as its own search root.
        # This way setting fo4_mo2_mods_root to the parent 'mods\' folder works
        # without the user having to know which specific mod subfolder to pick.
        try:
            if p_extra.is_dir():
                _expanded = 0
                for sub in p_extra.iterdir():
                    if _expanded >= 50:          # safety cap — never add hundreds of roots
                        break
                    if not sub.is_dir():
                        continue
                    if any((sub / tok).is_dir()
                           for tok in ('Textures', 'Materials', 'Meshes',
                                       'textures', 'materials', 'meshes')):
                        add(sub)
                        _expanded += 1
        except Exception:
            pass
    return roots


def _find_file(ref, roots, deep_roots=None):
    """Resolve a game-relative path (e.g. 'Textures\\Landscape\\x_d.dds') or a
    bare filename to a real file under one of *roots*.  Exact relative match is
    tried first (fast); a bounded name search is the fallback."""
    if not ref:
        return None
    rel = ref.replace('\\', '/').lstrip('/')
    # If the ref carries extra leading segments, also try from the resource token.
    _low = rel.lower()
    for tok in ('textures/', 'materials/'):
        i = _low.find(tok)
        if i > 0:
            rel = rel[i:]
            break
    name = Path(rel).name
    stem = Path(name).stem.lower()
    ext = Path(name).suffix.lower()
    exts = [ext] + [e for e in _IMG_EXTS + ['.bgsm', '.bgem'] if e != ext]

    # 1. exact relative path under each root (handles the normal MO2 mod layout)
    for root in roots:
        cand = root / rel
        if cand.exists():
            return cand
    # 2. same relative path but with an alternate image extension present
    for root in roots:
        relp = Path(rel)
        for e in exts:
            cand = root / relp.with_suffix(e)
            if cand.exists():
                return cand
    # 3. bounded recursive search by stem — ONLY within the Textures/ and
    #    Materials/ subfolders of each root (never the whole root/drive), and
    #    capped at a fixed number of entries so a large FO4 working folder can
    #    never stall the import for minutes.
    _MAX_SCAN = 20000
    _deep = deep_roots if deep_roots is not None else roots
    for root in _deep:
        for sub in ('Textures', 'Materials'):
            base = root / sub
            if not base.is_dir():
                continue
            scanned = 0
            try:
                for f in base.rglob('*'):
                    scanned += 1
                    if scanned > _MAX_SCAN:
                        break
                    if f.suffix.lower() in exts and f.stem.lower() == stem and f.is_file():
                        return f
            except Exception:
                pass
    return None


# ---------------------------------------------------------------------------
# Material wiring (by socket, not node name)
# ---------------------------------------------------------------------------
def _load_image(path):
    try:
        return bpy.data.images.load(str(path), check_existing=True)
    except Exception as exc:
        print(f"[FO4Tex] could not load '{path}': {exc}")
        return None


def _get_principled(mat):
    nt = mat.node_tree
    bsdf = next((n for n in nt.nodes if n.type == 'BSDF_PRINCIPLED'), None)
    if bsdf is None:
        bsdf = nt.nodes.new('ShaderNodeBsdfPrincipled')
        out = next((n for n in nt.nodes if n.type == 'OUTPUT_MATERIAL'), None)
        if out is None:
            out = nt.nodes.new('ShaderNodeOutputMaterial')
        nt.links.new(bsdf.outputs['BSDF'], out.inputs['Surface'])
    return bsdf


def _apply(obj, tex_map, alpha_cutout=False, mat=None):
    if mat is None:
        if not obj.data.materials:
            _newmat = bpy.data.materials.new(obj.name + "_FO4")
            _newmat.use_nodes = True
            obj.data.materials.append(_newmat)
        mat = obj.data.materials[0]
    mat.use_nodes = True
    nt = mat.node_tree
    bsdf = _get_principled(mat)
    applied = []
    y = 400

    def _mk(path, label, non_color=False):
        nonlocal y
        img = _load_image(path)
        if img is None:
            return None
        if non_color:
            try:
                img.colorspace_settings.name = 'Non-Color'
            except Exception:
                pass
        n = nt.nodes.new('ShaderNodeTexImage')
        n.image = img
        n.label = label
        n.location = (-700, y)
        y -= 300
        return n

    if tex_map.get('diffuse'):
        n = _mk(tex_map['diffuse'], 'FO4 Diffuse')
        if n:
            nt.links.new(n.outputs['Color'], bsdf.inputs['Base Color'])
            if alpha_cutout:
                a = bsdf.inputs.get('Alpha')
                if a:
                    nt.links.new(n.outputs['Alpha'], a)
                try:
                    mat.blend_method = 'CLIP'
                    mat.shadow_method = 'CLIP'
                    mat.alpha_threshold = 0.5
                    mat.use_backface_culling = False
                except Exception:
                    pass
            applied.append('diffuse')

    if tex_map.get('normal'):
        n = _mk(tex_map['normal'], 'FO4 Normal', non_color=True)
        if n:
            nm = nt.nodes.new('ShaderNodeNormalMap')
            nm.location = (n.location[0] + 300, n.location[1])
            nt.links.new(n.outputs['Color'], nm.inputs['Color'])
            ninput = bsdf.inputs.get('Normal')
            if ninput:
                nt.links.new(nm.outputs['Normal'], ninput)
            applied.append('normal')

    if tex_map.get('specular'):
        n = _mk(tex_map['specular'], 'FO4 Specular', non_color=True)
        if n:
            si = bsdf.inputs.get('Specular IOR Level') or bsdf.inputs.get('Specular')
            if si:
                nt.links.new(n.outputs['Color'], si)
            applied.append('specular')

    if tex_map.get('glow'):
        n = _mk(tex_map['glow'], 'FO4 Glow', non_color=True)
        if n:
            ei = bsdf.inputs.get('Emission Color') or bsdf.inputs.get('Emission')
            if ei:
                nt.links.new(n.outputs['Color'], ei)
                es = bsdf.inputs.get('Emission Strength')
                if es:
                    es.default_value = 1.0
            applied.append('glow')

    return applied


# ---------------------------------------------------------------------------
# Public entry point
# ---------------------------------------------------------------------------
def _name_tokens(name):
    """Lowercase alphanumeric tokens (len>=3) of a name, dropping PyNifly's
    ':N' shape-index suffix — used to match a mesh to its BGSM.

    FO4 mesh/material names are almost always camelCase
    ("BlastedForestBurntTreeStump01") with no delimiters at all, while BGSM
    filenames are typically snake_case ("tree_atlas.bgsm"). Splitting on
    non-alphanumeric characters alone (the original approach) treats a whole
    camelCase name as one single token, so it can never overlap with a
    delimited filename's tokens — silently making every name-based match
    fail. Insert word breaks at lower→upper transitions BEFORE lowercasing
    so "TreeStump" tokenizes as {"tree", "stump"} instead of one blob.
    """
    import re as _re
    raw = (name or '').split(':')[0]
    raw = _re.sub(r'(?<=[a-z0-9])(?=[A-Z])', ' ', raw)
    base = raw.lower()
    return set(t for t in _re.split(r'[^a-z0-9]+', base) if len(t) >= 3)


def _obj_already_textured(obj):
    """True if a diffuse image is already wired to the object's material (e.g.
    PyNifly imported the per-shape material) — so we don't clobber it."""
    try:
        for slot in obj.material_slots:
            mat = slot.material
            if not mat or not mat.use_nodes or not mat.node_tree:
                continue
            for node in mat.node_tree.nodes:
                if node.type == 'BSDF_PRINCIPLED':
                    sock = node.inputs.get('Base Color')
                    if sock and sock.links:
                        fn = sock.links[0].from_node
                        if fn.type == 'TEX_IMAGE' and getattr(fn, 'image', None):
                            return True
    except Exception:
        pass
    return False


def _pick_bgsm_for_obj(obj, bgsm_refs, roots, deep_roots):
    """Choose the resolvable BGSM whose filename best matches THIS mesh (so a
    multi-material NIF gives each mesh its own material).  Falls back to the
    first resolvable BGSM when nothing matches by name."""
    obj_tokens = _name_tokens(getattr(obj, 'name', ''))
    try:
        for slot in getattr(obj, 'material_slots', []):
            if slot.material:
                obj_tokens |= _name_tokens(slot.material.name)
    except Exception:
        pass
    best = None          # (score, ref, file)
    first = None         # (ref, file) — fallback
    for ref in bgsm_refs:
        f = _find_file(ref, roots, deep_roots)
        if not f:
            continue
        if first is None:
            first = (ref, f)
        score = len(obj_tokens & _name_tokens(Path(ref).stem))
        if best is None or score > best[0]:
            best = (score, ref, f)
    if best and best[0] > 0:
        return best[1], best[2]
    return first if first else (None, None)


def _mat_already_textured(mat):
    """True if a diffuse image is already wired to *mat*'s Base Color."""
    try:
        if not mat or not mat.use_nodes or not mat.node_tree:
            return False
        for node in mat.node_tree.nodes:
            if node.type == 'BSDF_PRINCIPLED':
                sock = node.inputs.get('Base Color')
                if sock and sock.links:
                    fn = sock.links[0].from_node
                    if fn.type == 'TEX_IMAGE' and getattr(fn, 'image', None):
                        return True
    except Exception:
        pass
    return False


def _pick_bgsm_by_name(name, bgsm_refs, roots, deep_roots):
    """Choose the resolvable BGSM whose filename best matches *name* (a material
    or mesh name).  Falls back to the first resolvable BGSM.

    Returns (ref, file, confident) — ``confident`` is True only when a BGSM
    actually scored a name-token match; a "first resolvable" fallback is
    marked unconfident so callers can avoid overwriting an already-correct
    material with a low-confidence guess (see resolve_and_apply — this
    matters in multi-mesh NIFs, where blindly falling back would otherwise
    force-apply the same wrong mesh's BGSM onto every material that fails
    to score against its own name).
    """
    tokens = _name_tokens(name)
    best = None
    first = None
    for ref in bgsm_refs:
        f = _find_file(ref, roots, deep_roots)
        if not f:
            continue
        if first is None:
            first = (ref, f)
        score = len(tokens & _name_tokens(Path(ref).stem))
        if best is None or score > best[0]:
            best = (score, ref, f)
    if best and best[0] > 0:
        return best[1], best[2], True
    if first:
        return first[0], first[1], False
    return None, None, False


def resolve_and_apply(obj, source_path, extra_roots=None, force=False):
    """Resolve an imported FO4 asset's BGSM textures and wire them onto *obj*.

    ``force`` re-resolves even if the mesh already has a textured material (used
    by the manual operator); the automatic import path leaves an already-
    textured mesh untouched so PyNifly's correct per-shape materials survive.

    Returns (success: bool, message: str).  Safe/no-op if nothing is found.
    """
    if bpy is None or obj is None or getattr(obj, 'type', None) != 'MESH':
        return False, "no mesh object"

    roots = _candidate_roots(source_path, extra_roots)
    if not roots:
        return False, "no search roots found near the asset"

    # Deep (recursive) search is reserved for the asset's OWN mod folder.  The
    # global data/MO2 roots passed as extra_roots are used only for fast exact-
    # path lookups — never recursively crawled (they can hold every game asset
    # and would stall the import for minutes).
    _extra_set = set()
    for _r in (extra_roots or []):
        try:
            _extra_set.add(Path(_r).resolve())
        except Exception:
            pass
    deep_roots = [r for r in roots if r.resolve() not in _extra_set]

    src = Path(source_path)
    bgsm_refs, dds_refs = ([], [])
    if src.suffix.lower() == '.nif':
        bgsm_refs, dds_refs = _scan_nif_refs(src)

    def _texmap_from_shape(shape_name):
        """Read the exact per-shape texture set straight from PyNifly's own
        NIF parse — no name-matching heuristics involved at all, since this
        is the literal data that shape's BSLightingShaderProperty carries.

        Some FO4 NIFs embed texture paths directly in the shader's own
        BSShaderTextureSet (not only via an external .bgsm), which is a
        per-SHAPE field the raw byte-scan (_scan_nif_refs, which only finds
        `.bgsm` file references) has no way to see — confirmed on a real
        multi-shape landscape NIF where only ONE `.bgsm` existed in the
        whole file (shared/irrelevant to one of the two shapes) while each
        shape's actual Diffuse/Normal/Specular came from its own shader
        block. Returns tex_map dict or None if unavailable/not found.
        """
        if src.suffix.lower() != '.nif' or not shape_name:
            return None
        try:
            from io_scene_nifly.pyn import pynifly as _pyn
        except Exception:
            return None
        try:
            _nf = _pyn.NifFile(str(src))
        except Exception:
            return None
        _shape = next((s for s in _nf.shapes if s.name == shape_name), None)
        if _shape is None or _shape.shader is None:
            return None
        _tex = getattr(_shape.shader, 'textures', None) or {}
        tex_map = {}
        for key, slot in (('Diffuse', 'diffuse'), ('Normal', 'normal'),
                          ('Specular', 'specular'), ('Glow', 'glow')):
            rel = (_tex.get(key) or '').strip()
            if not rel:
                continue
            hit = _find_file(rel, roots, deep_roots)
            if hit:
                tex_map[slot] = str(hit)
        return tex_map or None

    def _texmap_for(name_hint, shape_name=None):
        """Resolve (tex_map, alpha_cutout, bgsm_file, confident) for one
        material. Tries the exact per-shape texture set first (see
        _texmap_from_shape); falls back to choosing the BGSM that best
        matches *name_hint* (the material/mesh name). ``confident`` is False
        when nothing scored a name match and this fell back to "first
        resolvable BGSM" — see _pick_bgsm_by_name."""
        tex_map = {}
        alpha_cutout = False
        bgsm_file = None
        confident = False

        _direct = _texmap_from_shape(shape_name)
        if _direct:
            return _direct, alpha_cutout, bgsm_file, True

        if bgsm_refs:
            _ref, bgsm_file, confident = _pick_bgsm_by_name(name_hint, bgsm_refs, roots, deep_roots)
        if bgsm_file:
            try:
                from . import bgsm_helpers
                _raw = open(bgsm_file, 'rb').read()
                try:
                    data = bgsm_helpers.read_bgsm(_raw)
                except Exception:
                    data = bgsm_helpers._bgsm_scrape_textures(_raw)
                    if data is None:
                        raise
                for key, attr in (('diffuse', 'diffuse_texture'),
                                  ('normal', 'normal_texture'),
                                  ('specular', 'smooth_spec_texture'),
                                  ('glow', 'glow_texture')):
                    rel = (getattr(data, attr, '') or '').strip()
                    if rel:
                        hit = _find_file(rel, roots, deep_roots)
                        if hit:
                            tex_map[key] = str(hit)
                name_l = (src.name + str(getattr(data, 'diffuse_texture', ''))).lower()
                if (getattr(data, 'tree', False)
                        or 'grass' in name_l or 'plant' in name_l
                        or 'leaf' in name_l or 'foliage' in name_l
                        or 'ivy' in name_l or 'vine' in name_l or 'bush' in name_l):
                    alpha_cutout = True
                print(f"[FO4Tex] BGSM '{Path(bgsm_file).name}' -> {list(tex_map)}")
            except Exception as exc:
                print(f"[FO4Tex] BGSM read failed ({exc})")
        if 'diffuse' not in tex_map:
            for ref in dds_refs:
                hit = _find_file(ref, roots, deep_roots)
                if not hit:
                    continue
                low = ref.lower()
                if low.endswith('_n.dds'):
                    tex_map.setdefault('normal', str(hit))
                elif low.endswith('_s.dds'):
                    tex_map.setdefault('specular', str(hit))
                elif low.endswith('_g.dds'):
                    tex_map.setdefault('glow', str(hit))
                else:
                    tex_map.setdefault('diffuse', str(hit))

        # If still no diffuse, infer it from the normal or specular path.
        # Many FO4 NIFs only embed _n/_s paths; the _d lives at the same
        # location with the suffix swapped.
        if 'diffuse' not in tex_map:
            for key in ('normal', 'specular'):
                ref_path = tex_map.get(key) or next(
                    (r for r in dds_refs
                     if r.lower().endswith(f'_{key[0]}.dds')), None
                )
                if not ref_path:
                    continue
                low = ref_path.lower()
                for suffix in ('_n.dds', '_s.dds', '_g.dds', '_e.dds'):
                    if low.endswith(suffix):
                        candidate = ref_path[:-len(suffix)] + '_d.dds'
                        hit = _find_file(candidate, roots, deep_roots)
                        if hit:
                            tex_map['diffuse'] = str(hit)
                            print(f"[FO4Tex] inferred diffuse: {hit}")
                        break
                if 'diffuse' in tex_map:
                    break

        return tex_map, alpha_cutout, bgsm_file, confident

    # Texture EVERY material slot so a merged multi-material mesh gets each slot
    # textured, not just slot 0 (the old behaviour left extra slots white).
    # Slots that already have a diffuse image are preserved unless force=True.
    slots = list(getattr(obj, 'material_slots', []))
    applied_all = []
    skipped = 0
    if slots:
        for slot in slots:
            mat = slot.material
            if mat is None:
                continue
            _was_textured = _mat_already_textured(mat)
            if not force and _was_textured:
                skipped += 1
                continue
            tex_map, alpha_cutout, bgsm_file, confident = _texmap_for(
                mat.name, shape_name=(obj.get('fo4_original_name') or obj.name)
            )
            if not tex_map:
                continue
            # A force re-resolve that couldn't confidently match a BGSM to
            # THIS specific material would otherwise fall back to "first
            # resolvable BGSM" and silently overwrite an already-correct
            # material with the wrong mesh's texture (confirmed real case:
            # a multi-shape vegetation NIF where one shape's BGSM couldn't be
            # matched by name, so its sibling's texture got force-applied to
            # both). Only allow the low-confidence fallback when there was
            # nothing worth preserving in the first place.
            if force and _was_textured and not confident:
                skipped += 1
                continue
            got = _apply(obj, tex_map, alpha_cutout=alpha_cutout, mat=mat)
            if got:
                applied_all.extend(got)
                # Stash the source .bgsm path so export can preserve fields
                # Blender's node graph has no equivalent for (see bgsm_helpers
                # .blender_mat_to_bgsm, which reads this back as a baseline).
                if bgsm_file:
                    try:
                        mat["fo4_bgsm_path"] = str(bgsm_file)
                    except Exception:
                        pass
    else:
        _shape_name = obj.get('fo4_original_name') or getattr(obj, 'name', '')
        tex_map, alpha_cutout, bgsm_file, _confident = _texmap_for(
            getattr(obj, 'name', ''), shape_name=_shape_name
        )
        if tex_map:
            got = _apply(obj, tex_map, alpha_cutout=alpha_cutout)
            if got:
                applied_all.extend(got)
                if bgsm_file and obj.data.materials and obj.data.materials[0]:
                    try:
                        obj.data.materials[0]["fo4_bgsm_path"] = str(bgsm_file)
                    except Exception:
                        pass

    if not applied_all:
        if skipped:
            return True, f"kept existing textures on {skipped} material slot(s)"
        return False, ("no textures resolved - checked the BGSM and NIF refs "
                       f"under {roots[0]}")
    msg = "textures applied: " + ", ".join(sorted(set(applied_all)))
    if skipped:
        msg += f"  ({skipped} already-textured slot(s) kept)"
    return True, msg


# ---------------------------------------------------------------------------
# Manual operator (works on any selected imported mesh, any import path)
# ---------------------------------------------------------------------------
if bpy is not None:

    class FO4_OT_ResolveTextures(bpy.types.Operator):
        """Follow the selected mesh's BGSM material and load its FO4 textures
        from the asset's mod folder onto the material."""
        bl_idname = "fo4.resolve_textures"
        bl_label = "Resolve FO4 Textures (BGSM)"
        bl_options = {'REGISTER', 'UNDO'}

        source_path: bpy.props.StringProperty(
            name="Source NIF",
            description="Path to the imported .nif (leave blank to use the object's stored path)",
            subtype='FILE_PATH',
            default="",
        )

        def execute(self, context):
            obj = context.active_object
            if not obj or obj.type != 'MESH':
                self.report({'WARNING'}, "Select the imported mesh first")
                return {'CANCELLED'}
            path = self.source_path or obj.get("fo4_source_nif", "")
            if not path:
                self.report({'WARNING'},
                            "No source NIF path — set it in the operator field")
                return {'CANCELLED'}
            extra = []
            # Read from addon preferences (persistent across sessions) first,
            # fall back to scene properties for backwards compat.
            try:
                from . import preferences as _prefs_mod
                _p = _prefs_mod.get_preferences()
                root = (getattr(_p, "fo4_mo2_mods_root", "") or "") if _p else ""
                gdata = (getattr(_p, "fo4_game_data_path", "") or "") if _p else ""
            except Exception:
                root = ""
                gdata = ""
            if not root:
                root = getattr(context.scene, "fo4_mo2_mods_root", "") or ""
            if not gdata:
                gdata = getattr(context.scene, "fo4_game_data_path", "") or ""
            if root:
                extra.append(bpy.path.abspath(root))
            if gdata:
                extra.append(bpy.path.abspath(gdata))
            ok, msg = resolve_and_apply(obj, bpy.path.abspath(path), extra_roots=extra, force=True)
            self.report({'INFO'} if ok else {'WARNING'}, msg)
            return {'FINISHED'} if ok else {'CANCELLED'}

    _classes = (FO4_OT_ResolveTextures,)
else:
    _classes = ()


def register():
    if bpy is None:
        return
    try:
        bpy.types.Scene.fo4_mo2_mods_root = bpy.props.StringProperty(
            name="MO2 Mods Root",
            description="Optional extra root to search for textures/materials "
                        "(e.g. your MO2 mods or Overwrite folder). The asset's own "
                        "mod folder is detected automatically.",
            subtype='DIR_PATH',
            default="",
        )
        bpy.types.Scene.fo4_game_data_path = bpy.props.StringProperty(
            name="FO4 Game Data Path",
            description="Path to your Fallout 4 Data folder "
                        "(e.g. E:\\Steam\\steamapps\\common\\Fallout 4\\Data). "
                        "Used to find loose textures extracted from BA2 archives.",
            subtype='DIR_PATH',
            default="",
        )
    except Exception as exc:
        print(f"[FO4Tex] property register failed: {exc}")
    for cls in _classes:
        try:
            bpy.utils.register_class(cls)
        except Exception as exc:
            print(f"[FO4Tex] register {cls.__name__} failed: {exc}")
    print("[FO4Tex] BGSM/MO2 texture resolver registered")


def unregister():
    if bpy is None:
        return
    for cls in reversed(_classes):
        try:
            bpy.utils.unregister_class(cls)
        except Exception:
            pass
    try:
        del bpy.types.Scene.fo4_mo2_mods_root
    except Exception:
        pass
    try:
        del bpy.types.Scene.fo4_game_data_path
    except Exception:
        pass
