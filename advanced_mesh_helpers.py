"""
Advanced mesh analysis and repair tools
Provides comprehensive mesh quality analysis and automatic repair functionality
"""

import bpy
import bmesh
from mathutils import Vector
import math

class AdvancedMeshHelpers:
    """Advanced mesh analysis, repair, and optimization tools"""
    
    # ==================== Mesh Analysis ====================
    
    @staticmethod
    def analyze_mesh_quality(obj):
        """
        Comprehensive mesh quality analysis
        Returns: (dict scores, list issues, dict details)
        """
        if obj.type != 'MESH':
            return None, ["Object is not a mesh"], None
        
        mesh = obj.data
        bm = bmesh.new()
        bm.from_mesh(mesh)
        bm.faces.ensure_lookup_table()
        bm.verts.ensure_lookup_table()
        bm.edges.ensure_lookup_table()
        
        issues = []
        details = {}
        scores = {
            'topology': 100,
            'geometry': 100,
            'uv': 100,
            'overall': 100
        }
        
        # Analyze topology
        non_manifold_edges = [e for e in bm.edges if not e.is_manifold]
        non_manifold_verts = [v for v in bm.verts if not v.is_manifold]
        loose_verts = [v for v in bm.verts if not v.link_edges]
        loose_edges = [e for e in bm.edges if not e.link_faces]
        
        # Analyze geometry
        degenerate_faces = []
        zero_area_faces = []
        for face in bm.faces:
            if face.calc_area() < 0.0001:
                zero_area_faces.append(face)
            if len(face.verts) < 3:
                degenerate_faces.append(face)
        
        # Check for overlapping faces
        # (simplified check - full check would use BVH tree)
        
        # Analyze poles (vertices with unusual edge count)
        poles = {'tri': 0, 'n-gon': 0, 'star': 0}
        for v in bm.verts:
            edge_count = len(v.link_edges)
            if edge_count == 3:
                poles['tri'] += 1
            elif edge_count > 5:
                poles['star'] += 1
        
        # Check face types
        tris = sum(1 for f in bm.faces if len(f.verts) == 3)
        quads = sum(1 for f in bm.faces if len(f.verts) == 4)
        ngons = sum(1 for f in bm.faces if len(f.verts) > 4)
        
        # Populate details
        details['vertex_count'] = len(bm.verts)
        details['edge_count'] = len(bm.edges)
        details['face_count'] = len(bm.faces)
        details['tris'] = tris
        details['quads'] = quads
        details['ngons'] = ngons
        details['non_manifold_edges'] = len(non_manifold_edges)
        details['non_manifold_verts'] = len(non_manifold_verts)
        details['loose_verts'] = len(loose_verts)
        details['loose_edges'] = len(loose_edges)
        details['degenerate_faces'] = len(degenerate_faces)
        details['zero_area_faces'] = len(zero_area_faces)
        details['poles'] = poles
        
        # Calculate topology score
        topology_issues = 0
        if non_manifold_edges:
            issues.append(f"Non-manifold edges: {len(non_manifold_edges)}")
            topology_issues += len(non_manifold_edges) * 5
        if non_manifold_verts:
            issues.append(f"Non-manifold vertices: {len(non_manifold_verts)}")
            topology_issues += len(non_manifold_verts) * 5
        if loose_verts:
            issues.append(f"Loose vertices: {len(loose_verts)}")
            topology_issues += len(loose_verts) * 2
        if ngons > 0:
            issues.append(f"N-gons detected: {ngons}")
            topology_issues += ngons * 1
        
        scores['topology'] = max(0, 100 - topology_issues)
        
        # Calculate geometry score
        geometry_issues = 0
        if degenerate_faces:
            issues.append(f"Degenerate faces: {len(degenerate_faces)}")
            geometry_issues += len(degenerate_faces) * 10
        if zero_area_faces:
            issues.append(f"Zero-area faces: {len(zero_area_faces)}")
            geometry_issues += len(zero_area_faces) * 5
        
        scores['geometry'] = max(0, 100 - geometry_issues)
        
        # Analyze UVs
        if not mesh.uv_layers:
            issues.append("No UV map")
            scores['uv'] = 0
        else:
            # Check for overlapping UVs (simplified)
            scores['uv'] = 100
        
        # Calculate overall score
        scores['overall'] = (scores['topology'] + scores['geometry'] + scores['uv']) / 3
        
        bm.free()
        
        if not issues:
            issues.append("Mesh quality is excellent!")
        
        return scores, issues, details
    
    # ==================== Mesh Repair ====================
    
    @staticmethod
    def auto_repair_mesh(obj):
        """
        Automatically repair common mesh issues
        Returns: (bool success, str message, dict repairs_made)
        """
        if obj.type != 'MESH':
            return False, "Object is not a mesh", {}
        
        repairs = {
            'non_manifold_fixed': 0,
            'loose_verts_removed': 0,
            'degenerate_faces_removed': 0,
            'doubles_removed': 0,
            'normals_recalculated': True
        }
        
        # Switch to edit mode
        bpy.context.view_layer.objects.active = obj
        bpy.ops.object.mode_set(mode='EDIT')
        bpy.ops.mesh.select_all(action='SELECT')
        
        # Remove doubles (operator renamed in Blender 2.91; old name removed in 5.0)
        # Use try/except because bpy.ops proxies make hasattr() unreliable —
        # it returns True for any attribute, even unregistered operators.
        try:
            result = bpy.ops.mesh.merge_by_distance(threshold=0.0001)
        except AttributeError:
            result = bpy.ops.mesh.remove_doubles(threshold=0.0001)
        if 'FINISHED' in result:
            repairs['doubles_removed'] = 1
        
        # Select non-manifold geometry
        bpy.ops.mesh.select_all(action='DESELECT')
        bpy.ops.mesh.select_non_manifold()
        
        # Try to fill holes
        bpy.ops.mesh.fill_holes(sides=4)
        repairs['non_manifold_fixed'] = 1
        
        # Select loose geometry
        bpy.ops.mesh.select_all(action='DESELECT')
        bpy.ops.mesh.select_loose()
        num_selected = len([v for v in obj.data.vertices if v.select])
        if num_selected > 0:
            bpy.ops.mesh.delete(type='VERT')
            repairs['loose_verts_removed'] = num_selected
        
        # Recalculate normals
        bpy.ops.mesh.select_all(action='SELECT')
        bpy.ops.mesh.normals_make_consistent(inside=False)
        
        # Delete degenerate faces
        bpy.ops.mesh.select_all(action='SELECT')
        bpy.ops.mesh.delete_loose()
        
        bpy.ops.object.mode_set(mode='OBJECT')
        
        message = "Mesh repaired: "
        repair_list = []
        if repairs['doubles_removed']:
            repair_list.append("removed doubles")
        if repairs['loose_verts_removed']:
            repair_list.append(f"removed {repairs['loose_verts_removed']} loose vertices")
        if repairs['non_manifold_fixed']:
            repair_list.append("fixed non-manifold geometry")
        
        message += ", ".join(repair_list)
        
        return True, message, repairs
    
    # ==================== Smart Decimation ====================
    
    @staticmethod
    def smart_decimate(obj, target_poly_count=None, ratio=0.5, preserve_uvs=True, preserve_sharp=True):
        """
        Intelligent polygon reduction with feature preservation
        Returns: (bool success, str message, dict stats)
        """
        if obj.type != 'MESH':
            return False, "Object is not a mesh", {}
        
        original_poly_count = len(obj.data.polygons)
        
        # Calculate ratio if target count provided
        if target_poly_count:
            ratio = min(1.0, target_poly_count / original_poly_count)
        
        # Add decimate modifier
        decimate_mod = obj.modifiers.new(name="Smart_Decimate", type='DECIMATE')
        decimate_mod.ratio = ratio
        decimate_mod.use_collapse_triangulate = True
        
        if preserve_uvs:
            decimate_mod.delimit = {'UV'}
        
        # Apply modifier
        bpy.context.view_layer.objects.active = obj
        bpy.ops.object.modifier_apply(modifier=decimate_mod.name)
        
        new_poly_count = len(obj.data.polygons)
        reduction_percent = ((original_poly_count - new_poly_count) / original_poly_count) * 100
        
        stats = {
            'original_poly_count': original_poly_count,
            'new_poly_count': new_poly_count,
            'reduction_percent': reduction_percent,
            'ratio_used': ratio
        }
        
        message = f"Decimated mesh: {original_poly_count} → {new_poly_count} polygons ({reduction_percent:.1f}% reduction)"
        
        return True, message, stats
    
    # ==================== Remeshing ====================
    
    @staticmethod
    def remesh_uniform(obj, voxel_size=0.1, adaptivity=0.0):
        """
        Create uniform topology using voxel remeshing
        Returns: (bool success, str message)
        """
        if obj.type != 'MESH':
            return False, "Object is not a mesh"
        
        original_poly_count = len(obj.data.polygons)
        
        # Add remesh modifier
        remesh_mod = obj.modifiers.new(name="Voxel_Remesh", type='REMESH')
        remesh_mod.mode = 'VOXEL'
        remesh_mod.voxel_size = voxel_size
        remesh_mod.adaptivity = adaptivity
        remesh_mod.use_smooth_shade = True
        
        # Apply modifier
        bpy.context.view_layer.objects.active = obj
        bpy.ops.object.modifier_apply(modifier=remesh_mod.name)
        
        new_poly_count = len(obj.data.polygons)
        
        message = f"Remeshed: {original_poly_count} → {new_poly_count} polygons (voxel size: {voxel_size})"
        
        return True, message
    
    # ==================== Symmetry Tools ====================
    
    @staticmethod
    def check_symmetry(obj, axis='X', threshold=0.001):
        """
        Check if mesh is symmetrical along specified axis
        Returns: (bool is_symmetric, str message, float symmetry_score)
        """
        if obj.type != 'MESH':
            return False, "Object is not a mesh", 0.0
        
        mesh = obj.data
        axis_index = {'X': 0, 'Y': 1, 'Z': 2}[axis]
        
        # Check vertex symmetry
        asymmetric_verts = 0
        for v in mesh.vertices:
            co = v.co.copy()
            # Mirror coordinate
            co[axis_index] = -co[axis_index]
            
            # Find closest vertex on other side
            found_match = False
            for v2 in mesh.vertices:
                if (v2.co - co).length < threshold:
                    found_match = True
                    break
            
            if not found_match:
                asymmetric_verts += 1
        
        symmetry_score = (1.0 - (asymmetric_verts / len(mesh.vertices))) * 100
        is_symmetric = symmetry_score > 95.0
        
        if is_symmetric:
            message = f"Mesh is symmetric along {axis} axis ({symmetry_score:.1f}% match)"
        else:
            message = f"Mesh is NOT symmetric along {axis} axis ({symmetry_score:.1f}% match, {asymmetric_verts} asymmetric vertices)"
        
        return is_symmetric, message, symmetry_score
    
    @staticmethod
    def mirror_mesh(obj, axis='X', merge=True):
        """
        Mirror mesh along specified axis
        Returns: (bool success, str message)
        """
        if obj.type != 'MESH':
            return False, "Object is not a mesh"
        
        # Add mirror modifier
        mirror_mod = obj.modifiers.new(name="Mirror", type='MIRROR')
        
        # Set axis
        mirror_mod.use_axis[0] = (axis == 'X')
        mirror_mod.use_axis[1] = (axis == 'Y')
        mirror_mod.use_axis[2] = (axis == 'Z')
        
        mirror_mod.use_clip = True
        mirror_mod.use_mirror_merge = merge
        mirror_mod.merge_threshold = 0.001
        
        # Apply modifier
        bpy.context.view_layer.objects.active = obj
        bpy.ops.object.modifier_apply(modifier=mirror_mod.name)
        
        return True, f"Mirrored mesh along {axis} axis"
    
    # ==================== Mesh Smoothing ====================
    
    @staticmethod
    def smooth_mesh(obj, iterations=2, factor=0.5, preserve_volume=True):
        """
        Apply Laplacian smoothing to mesh
        Returns: (bool success, str message)
        """
        if obj.type != 'MESH':
            return False, "Object is not a mesh"
        
        # Add smooth modifier
        smooth_mod = obj.modifiers.new(name="Smooth", type='SMOOTH')
        smooth_mod.iterations = iterations
        smooth_mod.factor = factor
        
        if preserve_volume:
            # Add a second pass to preserve volume
            smooth_mod.use_x = True
            smooth_mod.use_y = True
            smooth_mod.use_z = True
        
        # Apply modifier
        bpy.context.view_layer.objects.active = obj
        bpy.ops.object.modifier_apply(modifier=smooth_mod.name)
        
        return True, f"Smoothed mesh ({iterations} iterations, factor: {factor})"
    
    # ==================== LOD Generation ====================
    
    @staticmethod
    def generate_lod_chain(obj, lod_levels=None):
        """Generate a Fallout 4–compatible Level of Detail (LOD) mesh chain.

        Fallout 4 uses separate NIF files for each LOD level.  The *source*
        object is treated as ``LOD0`` (the full-detail model seen up close).
        This function generates progressively simplified copies named
        ``_LOD1`` through ``_LOD4`` so they follow the FO4 LOD naming
        convention without confusing the source with a generated level.

        Default simplification ratios (relative to the original poly count):
          - LOD1: 75 % – subtle reduction, noticeable only up close
          - LOD2: 50 % – medium reduction for mid-range distances
          - LOD3: 25 % – aggressive reduction for far distances
          - LOD4: 10 % – extreme reduction for the farthest draw distance

        Returns: (bool success, str message, list lod_objects)
        """
        if obj.type != 'MESH':
            return False, "Object is not a mesh", []
        
        if lod_levels is None:
            lod_levels = [0.75, 0.5, 0.25, 0.1]
        
        lod_objects = []
        original_poly_count = len(obj.data.polygons)
        
        for i, ratio in enumerate(lod_levels):
            # Duplicate object
            bpy.ops.object.select_all(action='DESELECT')
            obj.select_set(True)
            bpy.context.view_layer.objects.active = obj
            bpy.ops.object.duplicate()
            
            lod_obj = bpy.context.active_object
            # LOD levels are numbered starting at 1; the source object is LOD0.
            lod_obj.name = f"{obj.name}_LOD{i + 1}"
            
            # Apply decimation
            success, msg, stats = AdvancedMeshHelpers.smart_decimate(lod_obj, ratio=ratio)
            
            lod_objects.append((lod_obj, stats['new_poly_count']))
        
        message = (
            f"Generated {len(lod_objects)} LOD levels from {original_poly_count:,} polygons. "
            f"Source object = LOD0 (full detail). "
            f"Export each LOD as a separate NIF: {{name}}_LOD1.nif … {{name}}_LOD{len(lod_objects)}.nif"
        )
        
        return True, message, lod_objects
    
    # ==================== UV Optimization ====================
    
    @staticmethod
    def optimize_uvs(obj, method='MIN_STRETCH', margin=0.01):
        """Unwrap and pack UV islands for Fallout 4 NIF export.

        Parameters
        ----------
        obj : bpy.types.Object
            Target mesh object.
        method : str
            ``'MIN_STRETCH'`` — **(default)** Minimum Stretch unwrap.
                                Uses a CONFORMAL (LSCM) initial layout then
                                runs ``uv.minimize_stretch`` to convergence
                                (100 iterations).  Produces the lowest UV
                                distortion of any available method and is
                                Blender's recommended technique for matching
                                textures to geometry accurately.
            ``'SMART'``      — Smart UV Project.  Good general-purpose choice;
                                fast and automatic.
            ``'ANGLE'``      — Seam-marked angle-based conformal unwrap with a
                                stretch-minimize refinement pass.
            ``'UNWRAP'``     — Alias for ``'ANGLE'`` (legacy name kept for
                                backward compatibility).
            ``'CUBE'``       — Box/cube projection (fast; best for architecture).
        margin : float
            Spacing between UV islands (default 0.01).

        Returns
        -------
        (bool success, str message)
        """
        if obj.type != 'MESH':
            return False, "Object is not a mesh"

        # Ensure a UV layer exists before entering Edit Mode.
        if not obj.data.uv_layers:
            obj.data.uv_layers.new(name="UVMap")

        prev_active = bpy.context.view_layer.objects.active
        bpy.context.view_layer.objects.active = obj

        try:
            bpy.ops.object.mode_set(mode='EDIT')
            bpy.ops.mesh.select_all(action='SELECT')

            norm = method.upper()

            if norm == 'MIN_STRETCH':
                # -----------------------------------------------------------
                # Minimum Stretch unwrap — lowest distortion available.
                #
                # Pipeline:
                #   1. Smart UV Project  — seeds island boundaries / seams so
                #      the CONFORMAL solver starts from a reasonable layout.
                #   2. CONFORMAL (LSCM)  — Least Squares Conformal Maps; the
                #      best analytical starting layout for the relaxation step.
                #   3. minimize_stretch  — iterative relaxation that directly
                #      minimises the difference between 3-D and UV edge lengths
                #      (i.e. the "stretch" metric).  100 iterations reaches
                #      convergence for almost all real-world meshes.
                # -----------------------------------------------------------
                bpy.ops.uv.smart_project(angle_limit=66.0, island_margin=margin)
                bpy.ops.mesh.select_all(action='SELECT')
                bpy.ops.uv.unwrap(method='CONFORMAL', margin=margin)
                bpy.ops.mesh.select_all(action='SELECT')
                try:
                    bpy.ops.uv.minimize_stretch(fill_holes=True, iterations=100)
                except Exception:
                    pass  # older Blender builds lack this operator
                message = "UVs unwrapped with Minimum Stretch (CONFORMAL + minimize_stretch)"

            elif norm in ('ANGLE', 'UNWRAP'):
                # -----------------------------------------------------------
                # Angle-Based unwrap with a stretch-minimize refinement pass.
                # -----------------------------------------------------------
                bpy.ops.mesh.select_all(action='SELECT')
                bpy.ops.uv.smart_project(angle_limit=66.0, island_margin=margin)
                bpy.ops.mesh.select_all(action='SELECT')
                bpy.ops.uv.unwrap(method='ANGLE_BASED', margin=margin)
                try:
                    bpy.ops.uv.minimize_stretch(fill_holes=True, iterations=10)
                except Exception:
                    pass  # older Blender builds lack this operator
                message = "UVs unwrapped with seam-marked angle-based method (stretch minimized)"

            elif norm == 'CUBE':
                bpy.ops.uv.cube_project(cube_size=1.0)
                message = "UVs unwrapped with Cube projection"

            else:
                # 'SMART' and any unrecognised value → Smart UV Project.
                bpy.ops.uv.smart_project(angle_limit=66.0, island_margin=margin)
                message = "UVs unwrapped with Smart UV Project"

            # Pack all islands into the 0–1 UV tile.
            # rotate=True lets the packer spin islands for a tighter fit,
            # which typically recovers 5–15 % extra texture-space coverage.
            try:
                bpy.ops.uv.pack_islands(rotate=True, margin=margin)
            except TypeError:
                # Blender < 3.1 does not have the rotate parameter.
                bpy.ops.uv.pack_islands(margin=margin)

        finally:
            try:
                bpy.ops.object.mode_set(mode='OBJECT')
            except Exception:
                pass
            bpy.context.view_layer.objects.active = prev_active

        return True, message

    # ==================== Hybrid UV Workflow ====================

    @staticmethod
    def scan_uv_complexity(obj):
        """Scan a mesh for UV unwrapping complexity hotspots.

        Analyses topology and geometry to identify areas that will produce
        poor UV islands when unwrapped without guidance.  Results drive the
        Hybrid UV workflow: the report tells the user exactly which areas
        need seams and how many islands to expect.

        Returns
        -------
        dict with keys:

        ``'complexity_score'``
            Integer 0–100.  Higher = more complex and harder to unwrap
            automatically without distortion.
        ``'problem_areas'``
            ``list[str]`` — human-readable descriptions of detected issues.
        ``'seam_candidates'``
            ``int`` — number of edges that are candidates for seam placement.
        ``'island_estimate'``
            ``int`` — rough estimate of the optimal number of UV islands.
        ``'recommendations'``
            ``list[str]`` — ordered, actionable instructions for the user.
        """
        import math

        if obj.type != 'MESH':
            return {
                'complexity_score': 0,
                'problem_areas': ["Not a mesh object"],
                'seam_candidates': 0,
                'island_estimate': 1,
                'recommendations': [],
            }

        mesh = obj.data
        bm = bmesh.new()
        bm.from_mesh(mesh)
        bm.faces.ensure_lookup_table()
        bm.edges.ensure_lookup_table()
        bm.verts.ensure_lookup_table()

        problem_areas = []
        score = 0

        total_edges = len(bm.edges)
        total_faces = len(bm.faces)

        # ── 1. Sharp / high-angle edges (natural seam candidates) ───────────
        sharp_threshold = math.radians(30.0)
        sharp_edges = [
            e for e in bm.edges
            if not e.is_boundary
            and e.calc_face_angle(fallback=0.0) > sharp_threshold
        ]
        sharp_ratio = len(sharp_edges) / max(total_edges, 1)
        seam_candidates = len(sharp_edges)

        if sharp_ratio > 0.3:
            score += 30
            problem_areas.append(
                f"{len(sharp_edges)} sharp-angle edges ({sharp_ratio:.0%}) — "
                "seams needed at fold lines"
            )
        elif sharp_ratio > 0.1:
            score += 15
            problem_areas.append(
                f"{len(sharp_edges)} moderate-angle edges ({sharp_ratio:.0%})"
            )

        # ── 2. High-valence vertices (branching topology — plants, coral…) ──
        high_valence_verts = [v for v in bm.verts if len(v.link_edges) > 6]
        hv_ratio = len(high_valence_verts) / max(len(bm.verts), 1)
        if hv_ratio > 0.05:
            score += 25
            problem_areas.append(
                f"{len(high_valence_verts)} high-valence vertices "
                f"({hv_ratio:.0%}) — branching topology (plants/foliage)"
            )

        # ── 3. Very thin / high-aspect-ratio triangles ──────────────────────
        thin_faces = []
        for face in bm.faces:
            if len(face.verts) == 3:
                lengths = sorted(e.calc_length() for e in face.edges)
                if lengths[0] > 1e-6 and lengths[2] / lengths[0] > 10.0:
                    thin_faces.append(face)
        thin_ratio = len(thin_faces) / max(total_faces, 1)
        if thin_ratio > 0.1:
            score += 20
            problem_areas.append(
                f"{len(thin_faces)} thin triangles ({thin_ratio:.0%}) — "
                "these cause UV stretch"
            )

        # ── 4. Open / boundary edges ────────────────────────────────────────
        boundary_edges = [e for e in bm.edges if e.is_boundary]
        seam_candidates += len(boundary_edges)
        if boundary_edges:
            score += 10
            problem_areas.append(
                f"{len(boundary_edges)} boundary edges — open mesh areas"
            )

        # ── 5. Existing seam count ───────────────────────────────────────────
        existing_seams = [e for e in bm.edges if e.seam]

        # Island estimate: rough proportion of sharp edges that partition faces
        # Island estimate: proportional to ratio of sharp vs total edges,
        # bounded to avoid nonsense on very small meshes (< 10 edges).
        if total_edges >= 10:
            island_estimate = max(1, len(sharp_edges) // (total_edges // 10) + 1)
        else:
            island_estimate = max(1, len(sharp_edges) + 1)

        bm.free()

        score = min(100, score)

        # ── Actionable recommendations ───────────────────────────────────────
        recommendations = []
        if score < 20:
            recommendations.append(
                "Low complexity — 'Setup UV + Texture (All-in-One)' with "
                "Minimum Stretch will give excellent results automatically."
            )
        elif score < 50:
            recommendations.append(
                "Moderate complexity — run 'Scan & Mark Seams' to auto-mark "
                "fold lines, adjust them if needed in Edit Mode, then click "
                "'Hybrid Unwrap'."
            )
        else:
            recommendations.append(
                "High complexity (organic / branching mesh) — use the Hybrid "
                "Workflow:  (1) 'Scan & Mark Seams'  (2) review and add seams "
                "at branch points by clicking edges in Edit Mode  "
                "(3) 'Hybrid Unwrap'."
            )

        if existing_seams:
            recommendations.append(
                f"{len(existing_seams)} seam(s) already marked — "
                "'Hybrid Unwrap' will respect them."
            )
        else:
            recommendations.append(
                "No seams marked yet — 'Scan & Mark Seams' will suggest them "
                "automatically based on fold angles."
            )

        return {
            'complexity_score': score,
            'problem_areas': problem_areas,
            'seam_candidates': seam_candidates,
            'island_estimate': island_estimate,
            'recommendations': recommendations,
        }

    @staticmethod
    def auto_mark_seams(obj, sharp_threshold_deg=30.0, clear_existing=False):
        """Mark UV seams at natural fold lines in the mesh.

        Identifies seam candidates by examining:

        * **Dihedral angle** — edges whose face-to-face angle exceeds
          *sharp_threshold_deg* are crease / fold lines and should be cut.
        * **Boundary edges** — open-mesh edges (only one adjacent face) are
          always seams because they are already geometric boundaries.

        If *clear_existing* is ``False`` (default) any seams the user has
        already marked by hand are kept; new seams are **added on top**.
        Set *clear_existing* to ``True`` to start fresh.

        Parameters
        ----------
        obj : bpy.types.Object
        sharp_threshold_deg : float
            Dihedral angle (degrees) above which an edge becomes a seam.
            30 ° works well for most hard-surface and organic meshes.
            Lower values (e.g. 20 °) produce more islands and are better
            for high-detail foliage.
        clear_existing : bool
            Whether to erase all existing seams before marking new ones.

        Returns
        -------
        (bool success, str message, int total_seam_count)
        """
        import math

        if obj.type != 'MESH':
            return False, "Object is not a mesh", 0

        threshold_rad = math.radians(sharp_threshold_deg)
        mesh = obj.data

        bm = bmesh.new()
        bm.from_mesh(mesh)
        bm.edges.ensure_lookup_table()

        if clear_existing:
            for e in bm.edges:
                e.seam = False

        new_seams = 0
        for edge in bm.edges:
            if edge.seam:
                continue  # already marked — preserve user intent
            if edge.is_boundary:
                edge.seam = True
                new_seams += 1
            elif edge.calc_face_angle(fallback=0.0) > threshold_rad:
                edge.seam = True
                new_seams += 1

        total_seams = sum(1 for e in bm.edges if e.seam)
        bm.to_mesh(mesh)
        bm.free()
        mesh.update()

        msg = (
            f"Marked {new_seams} new seam(s) at edges ≥ {sharp_threshold_deg:.0f}°. "
            f"{total_seams} total seam edge(s). "
            "Review and refine seams in Edit Mode "
            "(Edge menu > Mark/Clear Seam), then run 'Hybrid Unwrap'."
        )
        return True, msg, total_seams


def register():
    """Register advanced mesh helper functions"""
    pass


def unregister():
    """Unregister advanced mesh helper functions"""
    pass
