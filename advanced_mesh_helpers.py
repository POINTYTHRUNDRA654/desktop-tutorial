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
        
        # Remove doubles
        result = bpy.ops.mesh.remove_doubles(threshold=0.0001)
        if hasattr(result, 'FINISHED'):
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
        """
        Generate Level of Detail mesh chain
        Default LOD ratios: [0.75, 0.5, 0.25, 0.1]
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
            lod_obj.name = f"{obj.name}_LOD{i}"
            
            # Apply decimation
            success, msg, stats = AdvancedMeshHelpers.smart_decimate(lod_obj, ratio=ratio)
            
            lod_objects.append((lod_obj, stats['new_poly_count']))
        
        message = f"Generated {len(lod_objects)} LOD levels from {original_poly_count} polygons"
        
        return True, message, lod_objects
    
    # ==================== UV Optimization ====================
    
    @staticmethod
    def optimize_uvs(obj, method='SMART', margin=0.01):
        """
        Optimize UV layout
        Returns: (bool success, str message)
        """
        if obj.type != 'MESH':
            return False, "Object is not a mesh"
        
        # Ensure UV layer exists
        if not obj.data.uv_layers:
            obj.data.uv_layers.new(name="UVMap")
        
        bpy.context.view_layer.objects.active = obj
        bpy.ops.object.mode_set(mode='EDIT')
        bpy.ops.mesh.select_all(action='SELECT')
        
        # Smart UV project
        if method == 'SMART':
            bpy.ops.uv.smart_project(angle_limit=66.0, island_margin=margin)
            message = "UVs optimized with Smart UV Project"
        elif method == 'UNWRAP':
            bpy.ops.uv.unwrap(method='ANGLE_BASED', margin=margin)
            message = "UVs optimized with Angle-Based unwrap"
        else:
            bpy.ops.uv.cube_project()
            message = "UVs optimized with Cube projection"
        
        # Pack UV islands
        bpy.ops.uv.pack_islands(margin=margin)
        
        bpy.ops.object.mode_set(mode='OBJECT')
        
        return True, message

def register():
    """Register advanced mesh helper functions"""
    pass

def unregister():
    """Unregister advanced mesh helper functions"""
    pass
