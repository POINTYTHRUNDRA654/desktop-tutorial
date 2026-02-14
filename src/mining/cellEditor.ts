/**
 * CellEditorEngine
 * Lightweight, in-memory engine for editing cells/worldspaces.
 * Methods are implemented as safe stubs suitable for UI wiring and unit tests.
 *
 * Note: this is intentionally conservative (no on-disk ESP writes) — persistence
 * and engine-heavy operations (true navmesh generation / AO baking) are TODOs.
 */

import type {
  Cell,
  SaveResult,
  CellType,
  Vector3,
  Reference,
  Worldspace,
  HeightMap,
  NavmeshSettings,
  Navmesh,
  Triangle,
  LightSource,
  AOData,
  CollisionData,
  OcclusionData,
  CombinedMesh,
} from '../shared/types';

export class CellEditorEngine {
  private cells: Map<string, Cell> = new Map();
  private navmeshes: Map<string, Navmesh> = new Map();

  constructor() {
    // seed a small default cell for development / UI previews
    const defaultCell: Cell = {
      id: 'cell_default_1',
      editorId: 'CEL0001',
      name: 'Default Interior',
      type: 'interior',
      references: [],
      lighting: { ambientColor: { r: 0.6, g: 0.6, b: 0.65 }, exposure: 1.0, usesPrevis: false },
    };
    this.cells.set(defaultCell.id, defaultCell);
  }

  // ---------------------------
  // Cell management
  // ---------------------------

  async loadCell(espPath: string, cellId: string): Promise<Cell> {
    // espPath is ignored for the in-memory stub; return existing or a placeholder
    const found = this.cells.get(cellId);
    if (found) return JSON.parse(JSON.stringify(found));

    const placeholder: Cell = {
      id: cellId,
      editorId: `CEL_${cellId}`,
      name: `Cell ${cellId}`,
      type: 'interior',
      references: [],
      lighting: { ambientColor: { r: 0.5, g: 0.5, b: 0.5 }, exposure: 1.0, usesPrevis: false },
    };

    this.cells.set(cellId, placeholder);
    return JSON.parse(JSON.stringify(placeholder));
  }

  async saveCell(cell: Cell, espPath: string): Promise<SaveResult> {
    if (!cell || !cell.id) return { success: false, error: 'Invalid cell' };
    this.cells.set(cell.id, JSON.parse(JSON.stringify(cell)));
    // TODO: write to ESP when persistence layer implemented
    return { success: true };
  }

  async createCell(name: string, type: CellType): Promise<Cell> {
    const id = `cell_${Date.now()}`;
    const cell: Cell = {
      id,
      editorId: `CEL_${Date.now()}`,
      name,
      type,
      references: [],
      lighting: { ambientColor: { r: 0.5, g: 0.5, b: 0.5 }, exposure: 1.0, usesPrevis: false },
    };
    this.cells.set(id, cell);
    return JSON.parse(JSON.stringify(cell));
  }

  // ---------------------------
  // Object placement
  // ---------------------------

  async placeObject(cell: Cell, baseObject: string, position: Vector3, rotation: Vector3): Promise<Reference> {
    const ref: Reference = {
      id: `ref_${Date.now()}`,
      baseObject,
      position: { ...position },
      rotation: { ...rotation },
      scale: 1,
      flags: { persistent: false, disabled: false, initiallyDisabled: false, noRespawn: false, multibound: false },
    };

    const stored = this.cells.get(cell.id) || cell;
    stored.references = stored.references || [];
    stored.references.push(ref);
    this.cells.set(cell.id, stored);

    return JSON.parse(JSON.stringify(ref));
  }

  async moveObject(refId: string, position: Vector3): Promise<void> {
    for (const cell of this.cells.values()) {
      const obj = (cell.references || []).find((o) => o.id === refId);
      if (obj) {
        obj.position = { ...position };
        return;
      }
    }
    throw new Error(`Reference not found: ${refId}`);
  }

  async deleteObject(refId: string): Promise<void> {
    for (const [cellId, cell] of this.cells.entries()) {
      const index = (cell.references || []).findIndex((o) => o.id === refId);
      if (index >= 0) {
        cell.references.splice(index, 1);
        this.cells.set(cellId, cell);
        return;
      }
    }
    // no-op if not found
  }

  async duplicateObject(refId: string, offset: Vector3): Promise<Reference> {
    for (const cell of this.cells.values()) {
      const obj = (cell.references || []).find((o) => o.id === refId);
      if (obj) {
        const dup: Reference = {
          id: `ref_${Date.now()}`,
          baseObject: obj.baseObject,
          position: {
            x: obj.position.x + offset.x,
            y: obj.position.y + offset.y,
            z: obj.position.z + offset.z,
          },
          rotation: { ...obj.rotation },
          scale: obj.scale ?? 1,
          flags: { ...obj.flags },
        };
        cell.references.push(dup);
        return JSON.parse(JSON.stringify(dup));
      }
    }
    throw new Error(`Reference to duplicate not found: ${refId}`);
  }

  // ---------------------------
  // World editing
  // ---------------------------

  async editWorldspace(worldspaceId: string): Promise<Worldspace> {
    // Return a lightweight descriptor for UI editing
    return {
      id: worldspaceId,
      name: `Worldspace ${worldspaceId}`,
      bounds: { min: { x: -10000, y: -10000, z: -1024 }, max: { x: 10000, y: 10000, z: 1024 } },
      metadata: {},
    };
  }

  async modifyTerrain(worldspace: Worldspace, heightMap: HeightMap): Promise<void> {
    // In this stub we only attach the heightmap to metadata for preview
    worldspace.metadata = worldspace.metadata || {};
    (worldspace.metadata as any).heightMap = { width: heightMap.width, height: heightMap.height };
  }

  // ---------------------------
  // Navmesh
  // ---------------------------

  async generateNavmesh(cell: Cell, settings: NavmeshSettings): Promise<Navmesh> {
    // Simple placeholder navmesh: create a single triangle covering the center of the cell
    // Build a very small example navmesh using indexed vertices + nav-triangles
    const vertices: Vector3[] = [
      { x: -10, y: -10, z: 0 },
      { x: 10, y: -10, z: 0 },
      { x: 0, y: 10, z: 0 },
    ];

    const navTri = {
      vertices: [0, 1, 2] as [number, number, number],
      flags: { preferred: true, water: false, door: false, stairs: false, jump: false },
      coverValue: 0,
    };

    const nm: Navmesh = {
      id: `nav_${Date.now()}`,
      vertices,
      triangles: [navTri],
      edges: [],
      coverTriangles: [],
      bounds: { min: { x: -10, y: -10, z: 0 }, max: { x: 10, y: 10, z: 0 } },
    };

    this.navmeshes.set(nm.id, nm);
    // attach to cell for convenience
    cell.navmesh = nm;
    this.cells.set(cell.id, cell);
    return JSON.parse(JSON.stringify(nm));
  }

  async editNavmesh(navmesh: Navmesh, triangles: Triangle[]): Promise<void> {
    const stored = this.navmeshes.get(navmesh.id);
    if (!stored) throw new Error('Navmesh not found');
    stored.triangles = triangles.slice();
    stored.triangleCount = triangles.length;
  }

  async finalizeNavmesh(navmesh: Navmesh): Promise<void> {
    // mark as finalized (no-op in stub)
    const stored = this.navmeshes.get(navmesh.id);
    if (stored) stored.triangleCount = stored.triangles.length;
  }

  // ---------------------------
  // Lighting
  // ---------------------------

  async placeLightSource(cell: Cell, light: LightSource): Promise<Reference> {
    const ref: Reference = {
      id: `light_${Date.now()}`,
      baseObject: 'Light',
      position: light.position || { x: 0, y: 0, z: 0 },
      rotation: { x: 0, y: 0, z: 0 },
      scale: 1,
      flags: { persistent: true, disabled: false, initiallyDisabled: false, noRespawn: true, multibound: false },
      linkedRef: undefined,
    };
    cell.references = cell.references || [];
    cell.references.push(ref);
    return JSON.parse(JSON.stringify(ref));
  }

  async bakeAmbientOcclusion(cell: Cell): Promise<AOData> {
    // Return a tiny placeholder AO texture
    return { textureBase64: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAAB', samples: 16, resolution: { width: 256, height: 256 } };
  }

  // ---------------------------
  // Collision
  // ---------------------------

  async generateCollision(staticCollection: Reference[]): Promise<CollisionData> {
    // Create axis-aligned triangles from references' positions (very coarse)
    const triangles: Triangle[] = staticCollection.slice(0, 3).map((r, i) => ({ a: r.position, b: { x: r.position.x + 1, y: r.position.y, z: r.position.z }, c: { x: r.position.x, y: r.position.y + 1, z: r.position.z }, walkable: false }));
    return { triangles, boundingBoxes: [] };
  }

  // ---------------------------
  // Optimization
  // ---------------------------

  async generateOcclusionPlanes(cell: Cell): Promise<OcclusionData> {
    return { planes: [{ normal: { x: 0, y: 0, z: 1 }, d: 0 }], generatedAt: Date.now() };
  }

  async createCombinedMesh(references: Reference[]): Promise<CombinedMesh> {
    const vertexCount = references.length * 24; // approximate
    const triangleCount = references.length * 12;
    return {
      id: `combined_${Date.now()}`,
      vertexCount,
      triangleCount,
      boundingBox: { min: { x: -1, y: -1, z: -1 }, max: { x: 1, y: 1, z: 1 } },
      meshBlobPath: undefined,
    };
  }
}

export const cellEditor = new CellEditorEngine();
