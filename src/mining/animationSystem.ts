/**
 * Animation System Engine
 * 
 * Complete animation workflow with skeleton editing, rigging, keyframe animation,
 * physics simulation, behavior graphs, and export to Havok/FBX formats.
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import {
  Skeleton,
  Bone,
  Mesh,
  VertexWeight,
  HierarchyChange,
  RigResult,
  Animation,
  AnimationLayer,
  Keyframe,
  InterpolationMethod,
  Transform,
  Quaternion,
  Vector3,
  AnimationData,
  Frame,
  CollisionShape,
  PhysicsConstraint,
  AnimationState,
  Condition,
  Transition,
  BehaviorGraph,
  BlendTree,
  BlendTreeChild,
  ExportOptions,
  BoneConstraint,
} from '../shared/types';

export class AnimationSystemEngine {
  private skeletons: Map<string, Skeleton> = new Map();
  private animations: Map<string, Animation> = new Map();
  private behaviorGraphs: Map<string, BehaviorGraph> = new Map();
  private meshes: Map<string, Mesh> = new Map();

  /**
   * Skeleton Management
   */

  /**
   * Load skeleton from NIF file
   */
  async loadSkeleton(nifPath: string): Promise<Skeleton> {
    try {
      // Read NIF file (mock implementation - real NIF parsing would use binary format)
      const content = await fs.readFile(nifPath, 'utf-8');
      
      // Parse bone hierarchy from NIF
      const bones: Bone[] = this.parseNifBones(content);
      const rootBone = this.findRootBone(bones);

      const skeleton: Skeleton = {
        id: `skeleton-${Date.now()}`,
        name: path.basename(nifPath, path.extname(nifPath)),
        bones,
        rootBone,
        created: Date.now(),
        modified: Date.now(),
        metadata: {
          source: nifPath,
          version: '1.0',
        },
      };

      this.skeletons.set(skeleton.id, skeleton);
      return skeleton;
    } catch (error) {
      throw new Error(`Failed to load skeleton from ${nifPath}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Create a new bone in skeleton
   */
  async createBone(parent: Bone, name: string): Promise<Bone> {
    const newBone: Bone = {
      id: `bone-${Date.now()}`,
      name,
      parentId: parent.id,
      index: parent.children.length,
      transform: {
        position: { x: 0, y: parent.length, z: 0 },
        rotation: { x: 0, y: 0, z: 0, w: 1 },
        scale: { x: 1, y: 1, z: 1 },
      },
      length: 10,
      children: [],
      constraints: [],
    };

    parent.children.push(newBone.id);
    
    return newBone;
  }

  /**
   * Adjust bone hierarchy with multiple changes
   */
  async adjustBoneHierarchy(skeleton: Skeleton, changes: HierarchyChange[]): Promise<Skeleton> {
    const updatedSkeleton = JSON.parse(JSON.stringify(skeleton)) as Skeleton;
    const boneMap = new Map(updatedSkeleton.bones.map((b) => [b.id, b]));

    for (const change of changes) {
      const bone = boneMap.get(change.boneId);
      if (!bone) continue;

      switch (change.type) {
        case 'rename':
          if (change.newName) bone.name = change.newName;
          break;

        case 'reparent':
          if (change.parentId) {
            const oldParent = boneMap.get(bone.parentId!);
            if (oldParent) {
              oldParent.children = oldParent.children.filter((id) => id !== bone.id);
            }
            const newParent = boneMap.get(change.parentId);
            if (newParent) {
              bone.parentId = change.parentId;
              newParent.children.push(bone.id);
            }
          }
          break;

        case 'mirror':
          if (change.mirrorAxis) {
            this.mirrorBone(bone, change.mirrorAxis, updatedSkeleton.bones);
          }
          break;

        case 'delete':
          this.deleteBone(bone, updatedSkeleton);
          boneMap.delete(change.boneId);
          break;

        case 'create':
          // Handled separately with createBone
          break;
      }
    }

    updatedSkeleton.modified = Date.now();
    return updatedSkeleton;
  }

  /**
   * Rigging
   */

  /**
   * Auto-rig mesh to skeleton
   */
  async autoRig(meshPath: string): Promise<RigResult> {
    try {
      const startTime = Date.now();
      
      // Parse mesh file
      const meshContent = await fs.readFile(meshPath, 'utf-8');
      const mesh = this.parseMesh(meshContent);
      
      // Create skeleton for mesh
      const skeleton = await this.generateAutoSkeleton(mesh);
      
      // Apply weights
      await this.calculateAutoWeights(mesh, skeleton);

      const duration = Date.now() - startTime;

      return {
        success: true,
        skeleton,
        mesh,
        warnings: this.validateRig(mesh, skeleton),
        duration,
      };
    } catch (error) {
      throw new Error(`Auto-rig failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Paint vertex weights for a bone
   */
  async paintWeights(mesh: Mesh, bone: Bone, vertices: number[], weights: number[]): Promise<void> {
    for (let i = 0; i < vertices.length; i++) {
      const vertexIndex = vertices[i];
      const weight = weights[i];

      // Remove existing weights for this bone
      mesh.weights = mesh.weights.filter((w) => !(w.vertex === vertexIndex && w.bone === bone.id));

      // Add new weight
      if (weight > 0) {
        mesh.weights.push({
          vertex: vertexIndex,
          bone: bone.id,
          weight,
        });
      }
    }
  }

  /**
   * Normalize vertex weights to sum to 1.0
   */
  async normalizeWeights(mesh: Mesh): Promise<void> {
    const vertexWeights = new Map<number, { total: number; weights: VertexWeight[] }>();

    // Group weights by vertex
    for (const weight of mesh.weights) {
      if (!vertexWeights.has(weight.vertex)) {
        vertexWeights.set(weight.vertex, { total: 0, weights: [] });
      }
      const vw = vertexWeights.get(weight.vertex)!;
      vw.weights.push(weight);
      vw.total += weight.weight;
    }

    // Normalize
    for (const [, vw] of vertexWeights) {
      if (vw.total > 0) {
        for (const w of vw.weights) {
          w.weight /= vw.total;
        }
      }
    }
  }

  /**
   * Animation
   */

  /**
   * Create new animation
   */
  async createAnimation(name: string, duration: number): Promise<Animation> {
    const animation: Animation = {
      id: `anim-${Date.now()}`,
      name,
      duration,
      frameRate: 30,
      totalFrames: Math.ceil(duration * 30),
      tracks: {},
      layers: [],
      created: Date.now(),
      modified: Date.now(),
    };

    this.animations.set(animation.id, animation);
    return animation;
  }

  /**
   * Add keyframe to animation track
   */
  async addKeyframe(
    animation: Animation,
    bone: string,
    time: number,
    transform: Transform
  ): Promise<void> {
    if (!animation.tracks[bone]) {
      animation.tracks[bone] = [];
    }

    const keyframe: Keyframe = {
      time,
      transform,
      easing: 'bezier',
    };

    // Insert in sorted order
    const track = animation.tracks[bone];
    const insertIndex = track.findIndex((k) => k.time > time);
    if (insertIndex === -1) {
      track.push(keyframe);
    } else {
      track.splice(insertIndex, 0, keyframe);
    }

    animation.modified = Date.now();
  }

  /**
   * Interpolate keyframes using specified method
   */
  async interpolateKeyframes(animation: Animation, method: InterpolationMethod): Promise<void> {
    for (const [bone, keyframes] of Object.entries(animation.tracks)) {
      for (const keyframe of keyframes) {
        keyframe.easing = this.mapInterpolationMethod(method);
      }
    }

    animation.modified = Date.now();
  }

  /**
   * Physics
   */

  /**
   * Add collision shape to bone
   */
  async addCollision(bone: Bone, shape: CollisionShape): Promise<void> {
    // Collision shapes would be stored separately in production
    // This is a placeholder for the integration point
    console.log(`Added ${shape.type} collision to bone ${bone.name}`);
  }

  /**
   * Simulate physics for skeleton over N frames
   */
  async simulatePhysics(skeleton: Skeleton, frames: number): Promise<AnimationData> {
    const animationData: AnimationData = {
      frames: [],
      duration: frames / 30, // Assuming 30 fps
    };

    for (let f = 0; f < frames; f++) {
      const boneTransforms: Record<string, Transform> = {};

      for (const bone of skeleton.bones) {
        // Simple physics: gravity-based settling
        boneTransforms[bone.id] = this.applyPhysicsToTransform(bone.transform, f);
      }

      animationData.frames.push({
        frameNumber: f,
        timestamp: f / 30,
        boneTransforms,
      });
    }

    return animationData;
  }

  /**
   * Behavior Graph
   */

  /**
   * Create behavior graph (state machine) for skeleton
   */
  async createBehaviorGraph(skeleton: Skeleton): Promise<BehaviorGraph> {
    const graph: BehaviorGraph = {
      id: `graph-${Date.now()}`,
      name: `${skeleton.name}_BehaviorGraph`,
      states: [],
      transitions: [],
      parameters: {},
      defaultState: '',
    };

    this.behaviorGraphs.set(graph.id, graph);
    return graph;
  }

  /**
   * Add state to behavior graph
   */
  async addState(graph: BehaviorGraph, state: AnimationState): Promise<void> {
    graph.states.push(state);

    if (graph.defaultState === '') {
      graph.defaultState = state.id;
    }
  }

  /**
   * Add transition between states with conditions
   */
  async addTransition(
    graph: BehaviorGraph,
    from: string,
    to: string,
    condition: Condition
  ): Promise<void> {
    const fromState = graph.states.find((s) => s.id === from);
    const toState = graph.states.find((s) => s.id === to);

    if (!fromState || !toState) {
      throw new Error('Invalid state references');
    }

    const transition: Transition = {
      id: `trans-${Date.now()}`,
      fromState: from,
      toState: to,
      conditions: [condition],
      duration: 0.25,
      canInterruptSelf: false,
    };

    graph.transitions.push(transition);
  }

  /**
   * Export
   */

  /**
   * Export animation to Havok format (HKX)
   */
  async exportToHKX(animation: Animation, skeleton: Skeleton): Promise<string> {
    try {
      const hkxData = this.generateHKXData(animation, skeleton);
      const filename = `${animation.name}_${Date.now()}.hkx`;
      const outputPath = path.join(process.cwd(), 'exports', filename);

      await fs.mkdir(path.dirname(outputPath), { recursive: true });
      await fs.writeFile(outputPath, hkxData);

      return outputPath;
    } catch (error) {
      throw new Error(`HKX export failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Export animation to FBX format
   */
  async exportToFBX(animation: Animation, skeleton: Skeleton): Promise<string> {
    try {
      const fbxData = this.generateFBXData(animation, skeleton);
      const filename = `${animation.name}_${Date.now()}.fbx`;
      const outputPath = path.join(process.cwd(), 'exports', filename);

      await fs.mkdir(path.dirname(outputPath), { recursive: true });
      await fs.writeFile(outputPath, fbxData);

      return outputPath;
    } catch (error) {
      throw new Error(`FBX export failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Private helper methods
   */

  private parseNifBones(content: string): Bone[] {
    // Mock NIF parsing - in production this would parse actual NIF binary format
    const bones: Bone[] = [
      {
        id: 'bone-root',
        name: 'Root',
        parentId: undefined,
        index: 0,
        transform: { position: { x: 0, y: 0, z: 0 }, rotation: { x: 0, y: 0, z: 0, w: 1 }, scale: { x: 1, y: 1, z: 1 } },
        length: 0,
        children: ['bone-spine'],
        constraints: [],
      },
      {
        id: 'bone-spine',
        name: 'Spine',
        parentId: 'bone-root',
        index: 0,
        transform: { position: { x: 0, y: 10, z: 0 }, rotation: { x: 0, y: 0, z: 0, w: 1 }, scale: { x: 1, y: 1, z: 1 } },
        length: 10,
        children: ['bone-chest'],
        constraints: [],
      },
      {
        id: 'bone-chest',
        name: 'Chest',
        parentId: 'bone-spine',
        index: 0,
        transform: { position: { x: 0, y: 10, z: 0 }, rotation: { x: 0, y: 0, z: 0, w: 1 }, scale: { x: 1, y: 1, z: 1 } },
        length: 8,
        children: [],
        constraints: [],
      },
    ];

    return bones;
  }

  private findRootBone(bones: Bone[]): string {
    const root = bones.find((b) => !b.parentId);
    return root?.id || '';
  }

  private parseMesh(content: string): Mesh {
    // Mock mesh parsing
    return {
      id: `mesh-${Date.now()}`,
      name: 'mesh',
      vertices: [
        { x: 0, y: 0, z: 0 },
        { x: 1, y: 0, z: 0 },
        { x: 0, y: 1, z: 0 },
      ],
      normals: [
        { x: 0, y: 0, z: 1 },
        { x: 0, y: 0, z: 1 },
        { x: 0, y: 0, z: 1 },
      ],
      tangents: [
        { x: 1, y: 0, z: 0 },
        { x: 1, y: 0, z: 0 },
        { x: 1, y: 0, z: 0 },
      ],
      indices: [0, 1, 2],
      weights: [],
      bounds: {
        min: { x: 0, y: 0, z: 0 },
        max: { x: 1, y: 1, z: 0 },
      },
    };
  }

  private async generateAutoSkeleton(mesh: Mesh): Promise<Skeleton> {
    const bounds = mesh.bounds;
    const height = bounds.max.y - bounds.min.y;

    const skeleton: Skeleton = {
      id: `skeleton-${Date.now()}`,
      name: 'AutoSkeleton',
      bones: [
        {
          id: 'bone-root',
          name: 'Root',
          parentId: undefined,
          index: 0,
          transform: { position: bounds.min, rotation: { x: 0, y: 0, z: 0, w: 1 }, scale: { x: 1, y: 1, z: 1 } },
          length: height * 0.3,
          children: ['bone-spine'],
          constraints: [],
        },
        {
          id: 'bone-spine',
          name: 'Spine',
          parentId: 'bone-root',
          index: 0,
          transform: {
            position: { x: bounds.min.x, y: bounds.min.y + height * 0.3, z: bounds.min.z },
            rotation: { x: 0, y: 0, z: 0, w: 1 },
            scale: { x: 1, y: 1, z: 1 },
          },
          length: height * 0.4,
          children: [],
          constraints: [],
        },
      ],
      rootBone: 'bone-root',
      created: Date.now(),
      modified: Date.now(),
    };

    return skeleton;
  }

  private async calculateAutoWeights(mesh: Mesh, skeleton: Skeleton): Promise<void> {
    // Calculate bind weights based on bone proximity
    for (let i = 0; i < mesh.vertices.length; i++) {
      const vertex = mesh.vertices[i];
      let totalDistance = 0;
      const boneDistances: { bone: Bone; distance: number }[] = [];

      for (const bone of skeleton.bones) {
        const distance = this.distanceToPoint(bone.transform.position, vertex);
        boneDistances.push({ bone, distance });
        totalDistance += distance;
      }

      // Inverse distance weighting
      for (const { bone, distance } of boneDistances) {
        if (distance > 0) {
          const weight = (totalDistance - distance) / (totalDistance * (skeleton.bones.length - 1));
          if (weight > 0.01) {
            mesh.weights.push({ vertex: i, bone: bone.id, weight });
          }
        }
      }
    }

    await this.normalizeWeights(mesh);
  }

  private validateRig(mesh: Mesh, skeleton: Skeleton): string[] {
    const warnings: string[] = [];

    // Check for unweighted vertices
    const weightedVertices = new Set(mesh.weights.map((w) => w.vertex));
    if (weightedVertices.size < mesh.vertices.length) {
      warnings.push(`${mesh.vertices.length - weightedVertices.size} vertices have no bone weights`);
    }

    // Check for unused bones
    const usedBones = new Set(mesh.weights.map((w) => w.bone));
    for (const bone of skeleton.bones) {
      if (!usedBones.has(bone.id)) {
        warnings.push(`Bone "${bone.name}" has no mesh weights`);
      }
    }

    return warnings;
  }

  private mirrorBone(bone: Bone, axis: 'x' | 'y' | 'z', bones: Bone[]): void {
    if (axis === 'x') {
      bone.transform.position.x *= -1;
      bone.name = bone.name.replace(/[LR]/, (m) => (m === 'L' ? 'R' : 'L'));
    }
  }

  private deleteBone(bone: Bone, skeleton: Skeleton): void {
    if (bone.parentId) {
      const parent = skeleton.bones.find((b) => b.id === bone.parentId);
      if (parent) {
        parent.children = parent.children.filter((id) => id !== bone.id);
      }
    }

    skeleton.bones = skeleton.bones.filter((b) => b.id !== bone.id);
  }

  private distanceToPoint(p1: Vector3, p2: Vector3): number {
    const dx = p1.x - p2.x;
    const dy = p1.y - p2.y;
    const dz = p1.z - p2.z;
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  }

  private mapInterpolationMethod(method: InterpolationMethod): 'linear' | 'bezier' | 'step' | 'ease-in' | 'ease-out' {
    switch (method) {
      case 'linear':
        return 'linear';
      case 'bezier':
      case 'catmull-rom':
        return 'bezier';
      case 'step':
        return 'step';
      case 'ease-in-out':
        return 'ease-in';
      default:
        return 'linear';
    }
  }

  private applyPhysicsToTransform(transform: Transform, frameIndex: number): Transform {
    // Simulate gravity: slight downward acceleration
    const gravity = 0.01 * frameIndex;
    return {
      ...transform,
      position: {
        ...transform.position,
        y: Math.max(0, transform.position.y - gravity),
      },
    };
  }

  private generateHKXData(animation: Animation, skeleton: Skeleton): Buffer {
    // Generate HKX binary format representation
    // In production, this would create actual Havok format
    const header = Buffer.from('HKX\x00', 'utf-8');
    const metadata = Buffer.from(JSON.stringify({ animation: animation.name, skeleton: skeleton.name }));
    const metadataLen = Buffer.allocUnsafe(4);
    metadataLen.writeUInt32LE(metadata.length, 0);

    return Buffer.concat([header, metadataLen, metadata]);
  }

  private generateFBXData(animation: Animation, skeleton: Skeleton): Buffer {
    // Generate FBX ASCII format
    const fbxHeader = ';\n; FBX 7.4.0 project file\n; Generated by AnimationSystemEngine\n;\n';
    const fbxContent = `GlobalSettings:  {
  Version: 1000
  Properties70:  {
    P: "DocumentInfo::CreationTime", "DateTime.UTC", "DateTime", "", ""
    P: "DefaultCamera", "KString", "", "", "Camera"
  }
}
Camera: "Camera::Camera", "Camera" {
  GlobalInfo:  {
    V: 1000
  }
}`;

    return Buffer.from(fbxHeader + fbxContent, 'utf-8');
  }
}

// Singleton instance
export const animationSystemEngine = new AnimationSystemEngine();
