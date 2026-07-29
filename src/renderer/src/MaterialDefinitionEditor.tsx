/**
 * Material Definition Editor - Phase 1B
 * 
 * View & edit materials from .mossy_material.json:
 * - Material list with texture previews
 * - Map selector (diffuse, normal, specular, metallic, AO, cavity)
 * - PBR property editor
 * - Live preview links to Blender viewport
 */

import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { FileText, Check, Pencil, Save, Eye, Package, Image, ArrowUp, Sparkles, Layers, Circle, Minus, FolderOpen } from 'lucide-react';
import './MaterialDefinitionEditor.css';

interface TextureMap {
  name: string;
  path: string;
  type: 'diffuse' | 'normal' | 'specular' | 'metallic' | 'ao' | 'cavity' | 'roughness';
  size?: string;
}

interface MaterialProperties {
  hasMetallic: boolean;
  hasAO: boolean;
  hasCavity: boolean;
  hasRoughness: boolean;
  roughnessChannel?: 'alpha' | 'rgb' | 'r' | 'g' | 'b';
  metallic?: { min: number; max: number };
  roughness?: { min: number; max: number };
}

interface Material {
  name: string;
  baseTexture: string;
  pbr: MaterialProperties;
  textures: {
    diffuse: string;
    normal: string;
    specular: string;
    maps: {
      metallic?: string;
      ao?: string;
      cavity?: string;
    };
  };
}

interface MaterialManifest {
  modName: string;
  enhancementLevel: 4 | 8 | 16;
  materials: Material[];
  totalTextures: number;
}

export const MaterialDefinitionEditor: React.FC<{ modPath?: string }> = ({
  modPath: modPathProp,
}) => {
  const [manifest, setManifest] = useState<MaterialManifest | null>(null);
  const [selectedMaterial, setSelectedMaterial] = useState<Material | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [filterType, setFilterType] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [showPreview, setShowPreview] = useState(true);
  const [isDirty, setIsDirty] = useState(false);
  // The Hub renders this tab with no props — without an in-UI way to pick a mod
  // folder, this panel always showed an empty "Materials (0)" list.
  const [modPath, setModPath] = useState<string>(modPathProp || '');

  useEffect(() => {
    if (modPathProp) setModPath(modPathProp);
  }, [modPathProp]);

  const handleBrowseModFolder = async () => {
    try {
      const picked = await (window.electronAPI as any)?.pickDirectory?.('Choose a mod folder with a .mossy_enhanced material manifest');
      if (picked) setModPath(picked);
    } catch (err) {
      console.error('Failed to browse for mod folder:', err);
    }
  };

  // Load manifest
  useEffect(() => {
    if (modPath) {
      loadManifest(modPath);
    }
  }, [modPath]);

  const resolveManifestPath = (basePath: string) => {
    const trimmed = String(basePath || '').trim();
    if (!trimmed) return '';
    const normalized = trimmed.replace(/[\\/]+$/, '');
    if (normalized.endsWith('.mossy_material.json')) {
      return normalized;
    }
    return `${normalized}/.mossy_enhanced/.mossy_material.json`;
  };

  const loadManifest = async (path: string) => {
    try {
      const manifestPath = resolveManifestPath(path);
      if (!manifestPath) return;

      const result = await (window.electronAPI as any)?.material?.loadManifest?.(manifestPath)
        ?? await (window.electronAPI as any)?.invoke?.('material:load-manifest', manifestPath);

      const loadedManifest = result?.data?.manifest || result?.manifest;
      if (result?.success && loadedManifest) {
        setManifest(loadedManifest);
        if (loadedManifest.materials.length > 0) {
          setSelectedMaterial(loadedManifest.materials[0]);
        }
      } else {
        console.warn('Failed to load manifest:', result?.error);
      }
    } catch (err) {
      console.error('Failed to load manifest:', err);
    }
  };

  // Filter materials
  const filteredMaterials = manifest?.materials.filter(mat => {
    const matchesSearch = mat.name
      .toLowerCase()
      .includes(searchTerm.toLowerCase());
    const matchesType =
      filterType === 'all' ||
      (filterType === 'metallic' && mat.pbr.hasMetallic) ||
      (filterType === 'ao' && mat.pbr.hasAO) ||
      (filterType === 'cavity' && mat.pbr.hasCavity);
    return matchesSearch && matchesType;
  }) || [];

  // Handle material update
  const handleMaterialUpdate = (updated: Material) => {
    setSelectedMaterial(updated);
    setIsDirty(true);

    if (manifest) {
      const updated_manifest = {
        ...manifest,
        materials: manifest.materials.map(m =>
          m.name === updated.name ? updated : m
        ),
      };
      setManifest(updated_manifest);
    }
  };

  // Save changes
  const handleSaveChanges = async () => {
    try {
      if (!manifest || !modPath) return;
      const filePath = resolveManifestPath(modPath);
      if (!filePath) return;

      const result = await (window.electronAPI as any)?.material?.saveManifest?.({ filePath, manifest })
        ?? await (window.electronAPI as any)?.invoke?.('material:save-manifest', { filePath, manifest });
      
      if (result?.success) {
        setIsDirty(false);
        console.log('Manifest saved successfully');
      } else {
        console.error('Save failed:', result?.error);
      }
    } catch (err) {
      console.error('Failed to save manifest:', err);
    }
  };

  // Builds a real Principled BSDF node graph from this material's texture maps
  // and sends it to the Mossy Link Blender add-on so the material can be inspected live.
  const handlePreviewInBlender = async () => {
    if (!selectedMaterial) return;
    const api = window.electronAPI as any;
    if (!api?.sendBlenderCommand) {
      toast.error('Blender is not linked — connect Mossy Link v6 from the Runtime Hub first.');
      return;
    }
    const mat = selectedMaterial;
    const esc = (p: string) => (p || '').replace(/\\/g, '\\\\');
    const script = `import bpy

mat = bpy.data.materials.get("${mat.name}") or bpy.data.materials.new("${mat.name}")
mat.use_nodes = True
nodes = mat.node_tree.nodes
links = mat.node_tree.links
nodes.clear()

bsdf = nodes.new('ShaderNodeBsdfPrincipled')
bsdf.location = (0, 0)
output = nodes.new('ShaderNodeOutputMaterial')
output.location = (300, 0)
links.new(bsdf.outputs['BSDF'], output.inputs['Surface'])

def add_texture(path, x, y, label, colorspace='sRGB'):
    if not path:
        return None
    tex = nodes.new('ShaderNodeTexImage')
    tex.location = (x, y)
    tex.label = label
    try:
        tex.image = bpy.data.images.load(path, check_existing=True)
        tex.image.colorspace_settings.name = colorspace
    except Exception as e:
        print(f"Mossy: failed to load {path}: {e}")
    return tex

diffuse_tex = add_texture("${esc(mat.textures.diffuse)}", -400, 200, 'Diffuse')
if diffuse_tex:
    links.new(diffuse_tex.outputs['Color'], bsdf.inputs['Base Color'])

normal_path = "${esc(mat.textures.normal)}"
if normal_path:
    normal_tex = add_texture(normal_path, -400, -100, 'Normal', colorspace='Non-Color')
    normal_map = nodes.new('ShaderNodeNormalMap')
    normal_map.location = (-150, -100)
    if normal_tex:
        links.new(normal_tex.outputs['Color'], normal_map.inputs['Color'])
        links.new(normal_map.outputs['Normal'], bsdf.inputs['Normal'])

metallic_path = "${esc(mat.textures.maps.metallic || '')}"
if metallic_path:
    metallic_tex = add_texture(metallic_path, -400, -320, 'Metallic', colorspace='Non-Color')
    if metallic_tex:
        links.new(metallic_tex.outputs['Color'], bsdf.inputs['Metallic'])

print(f"Mossy: built preview material '{mat.name}' in Blender.")
`;
    try {
      const result = await api.sendBlenderCommand('execute_script', { script, description: `Preview material: ${mat.name}` });
      if (result?.success !== false) {
        toast.success(`Sent "${mat.name}" to Blender for preview.`);
      } else {
        toast.error(result?.message || result?.error || 'Failed to preview material in Blender.');
      }
    } catch (err: any) {
      toast.error(`Preview failed: ${err?.message || err}`);
    }
  };

  const handleExportMaterial = async () => {
    if (!selectedMaterial) return;
    const api = window.electronAPI as any;
    const json = JSON.stringify(selectedMaterial, null, 2);
    const filename = `${selectedMaterial.name}.material.json`;
    try {
      if (api?.saveFile) {
        const savedPath = await api.saveFile(json, filename);
        if (savedPath) toast.success(`Exported ${savedPath}`);
        return;
      }
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = filename; a.click();
      URL.revokeObjectURL(url);
      toast.success(`Exported ${filename}`);
    } catch (err: any) {
      toast.error(`Export failed: ${err?.message || err}`);
    }
  };

  return (
    <div className="material-editor-container">
      <div className="editor-header">
        <h1 style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><FileText style={{ width: '1.1em', height: '1.1em', flexShrink: 0 }} /> Material Definitions</h1>
        {manifest && <span className="mod-name">{manifest.modName}</span>}
        <button className="btn-browse-mod" onClick={handleBrowseModFolder}>
          <FolderOpen style={{ width: '0.9em', height: '0.9em', display: 'inline', marginRight: '4px' }} />
          {modPath ? 'Change Mod Folder' : 'Browse Mod Folder'}
        </button>
      </div>
      {modPath && <div className="mod-path-display" title={modPath}>{modPath}</div>}
      {!modPath && (
        <div className="empty-state">No mod folder selected — click "Browse Mod Folder" to load a .mossy_material.json manifest.</div>
      )}

      <div className="editor-layout">
        {/* Material List Panel */}
        <div className="materials-panel">
          <div className="panel-header">
            <h2>Materials ({filteredMaterials.length})</h2>
            <div className="panel-controls">
              <input
                type="text"
                className="search-box"
                placeholder="Search materials..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
              <select
                className="filter-select"
                value={filterType}
                onChange={e => setFilterType(e.target.value)}
              >
                <option value="all">All Materials</option>
                <option value="metallic">Has Metallic</option>
                <option value="ao">Has AO</option>
                <option value="cavity">Has Cavity</option>
              </select>
            </div>
          </div>

          <div className="materials-list">
            {filteredMaterials.map(material => (
              <div
                key={material.name}
                className={`material-item ${
                  selectedMaterial?.name === material.name ? 'active' : ''
                }`}
                onClick={() => setSelectedMaterial(material)}
              >
                <div className="material-icon">
                  {material.pbr.hasMetallic && (
                    <span className="badge metallic" title="Has Metallic">
                      M
                    </span>
                  )}
                  {material.pbr.hasAO && (
                    <span className="badge ao" title="Has AO">
                      A
                    </span>
                  )}
                  {material.pbr.hasCavity && (
                    <span className="badge cavity" title="Has Cavity">
                      C
                    </span>
                  )}
                </div>
                <div className="material-info">
                  <span className="material-name">{material.name}</span>
                  <span className="texture-count">
                    {Object.values(material.textures.maps).filter(
                      t => !!t
                    ).length + 3}{' '}
                    textures
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Detail Panel */}
        {selectedMaterial && (
          <div className="detail-panel">
            <div className="panel-header">
              <h2>{selectedMaterial.name}</h2>
              <button
                className={`btn-edit ${editMode ? 'active' : ''}`}
                onClick={() => setEditMode(!editMode)}
              >
                {editMode
                  ? <><Check style={{ width: '0.85em', height: '0.85em', display: 'inline', marginRight: '3px' }} />Done</>
                  : <><Pencil style={{ width: '0.85em', height: '0.85em', display: 'inline', marginRight: '3px' }} />Edit</>
                }
              </button>
            </div>

            {/* Texture Map Grid */}
            <section className="texture-maps">
              <h3>Texture Maps</h3>
              <div className="maps-grid">
                <TextureMapCard
                  name="Diffuse"
                  path={selectedMaterial.textures.diffuse}
                  type="diffuse"
                  editable={editMode}
                  modPath={modPath}
                  onUpdate={(path) =>
                    handleMaterialUpdate({
                      ...selectedMaterial,
                      textures: {
                        ...selectedMaterial.textures,
                        diffuse: path,
                      },
                    })
                  }
                />
                <TextureMapCard
                  name="Normal"
                  path={selectedMaterial.textures.normal}
                  type="normal"
                  editable={editMode}
                  modPath={modPath}
                  onUpdate={(path) =>
                    handleMaterialUpdate({
                      ...selectedMaterial,
                      textures: {
                        ...selectedMaterial.textures,
                        normal: path,
                      },
                    })
                  }
                />
                <TextureMapCard
                  name="Specular"
                  path={selectedMaterial.textures.specular}
                  type="specular"
                  editable={editMode}
                  modPath={modPath}
                  onUpdate={(path) =>
                    handleMaterialUpdate({
                      ...selectedMaterial,
                      textures: {
                        ...selectedMaterial.textures,
                        specular: path,
                      },
                    })
                  }
                />

                {selectedMaterial.pbr.hasMetallic && (
                  <TextureMapCard
                    name="Metallic"
                    path={selectedMaterial.textures.maps.metallic || ''}
                    type="metallic"
                    generated={true}
                    editable={editMode}
                    modPath={modPath}
                    onUpdate={(path) =>
                      handleMaterialUpdate({
                        ...selectedMaterial,
                        textures: {
                          ...selectedMaterial.textures,
                          maps: {
                            ...selectedMaterial.textures.maps,
                            metallic: path,
                          },
                        },
                      })
                    }
                  />
                )}
                {selectedMaterial.pbr.hasAO && (
                  <TextureMapCard
                    name="Ambient Occlusion"
                    path={selectedMaterial.textures.maps.ao || ''}
                    type="ao"
                    generated={true}
                    editable={editMode}
                    modPath={modPath}
                    onUpdate={(path) =>
                      handleMaterialUpdate({
                        ...selectedMaterial,
                        textures: {
                          ...selectedMaterial.textures,
                          maps: {
                            ...selectedMaterial.textures.maps,
                            ao: path,
                          },
                        },
                      })
                    }
                  />
                )}
                {selectedMaterial.pbr.hasCavity && (
                  <TextureMapCard
                    name="Cavity"
                    path={selectedMaterial.textures.maps.cavity || ''}
                    type="cavity"
                    generated={true}
                    editable={editMode}
                    modPath={modPath}
                    onUpdate={(path) =>
                      handleMaterialUpdate({
                        ...selectedMaterial,
                        textures: {
                          ...selectedMaterial.textures,
                          maps: {
                            ...selectedMaterial.textures.maps,
                            cavity: path,
                          },
                        },
                      })
                    }
                  />
                )}
              </div>
            </section>

            {/* PBR Properties */}
            <section className="pbr-properties">
              <h3>PBR Properties</h3>
              <div className="properties-grid">
                <PropertyToggle
                  label="Metallic Map"
                  value={selectedMaterial.pbr.hasMetallic}
                  editable={editMode}
                  onChange={(val) =>
                    handleMaterialUpdate({
                      ...selectedMaterial,
                      pbr: { ...selectedMaterial.pbr, hasMetallic: val },
                    })
                  }
                />
                <PropertyToggle
                  label="AO Map"
                  value={selectedMaterial.pbr.hasAO}
                  editable={editMode}
                  onChange={(val) =>
                    handleMaterialUpdate({
                      ...selectedMaterial,
                      pbr: { ...selectedMaterial.pbr, hasAO: val },
                    })
                  }
                />
                <PropertyToggle
                  label="Cavity Map"
                  value={selectedMaterial.pbr.hasCavity}
                  editable={editMode}
                  onChange={(val) =>
                    handleMaterialUpdate({
                      ...selectedMaterial,
                      pbr: { ...selectedMaterial.pbr, hasCavity: val },
                    })
                  }
                />
                <PropertyToggle
                  label="Roughness"
                  value={selectedMaterial.pbr.hasRoughness}
                  editable={editMode}
                  onChange={(val) =>
                    handleMaterialUpdate({
                      ...selectedMaterial,
                      pbr: { ...selectedMaterial.pbr, hasRoughness: val },
                    })
                  }
                />
              </div>

              {selectedMaterial.pbr.roughnessChannel && (
                <div className="channel-selector">
                  <label>Roughness Channel</label>
                  <select
                    value={selectedMaterial.pbr.roughnessChannel}
                    disabled={!editMode}
                    onChange={(e) =>
                      handleMaterialUpdate({
                        ...selectedMaterial,
                        pbr: {
                          ...selectedMaterial.pbr,
                          roughnessChannel: e.target.value as
                            | 'alpha'
                            | 'rgb'
                            | 'r'
                            | 'g'
                            | 'b',
                        },
                      })
                    }
                  >
                    <option value="alpha">Alpha Channel</option>
                    <option value="rgb">RGB (Luminance)</option>
                    <option value="r">Red Channel</option>
                    <option value="g">Green Channel</option>
                    <option value="b">Blue Channel</option>
                  </select>
                </div>
              )}
            </section>

            {/* Action Buttons */}
            <div className="detail-actions">
              {isDirty && (
                <button className="btn-save" onClick={handleSaveChanges}>
                  <Save style={{ width: '0.9em', height: '0.9em', display: 'inline', marginRight: '4px' }} />Save Changes
                </button>
              )}
              <button className="btn-preview" onClick={handlePreviewInBlender}>
                <Eye style={{ width: '0.9em', height: '0.9em', display: 'inline', marginRight: '4px' }} />Preview in Blender
              </button>
              <button className="btn-export" onClick={handleExportMaterial}>
                <Package style={{ width: '0.9em', height: '0.9em', display: 'inline', marginRight: '4px' }} />Export Material
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

/**
 * Texture Map Card Component
 */
const TextureMapCard: React.FC<{
  name: string;
  path: string;
  type: string;
  generated?: boolean;
  editable: boolean;
  modPath?: string;
  onUpdate: (path: string) => void;
}> = ({ name, path, type, generated, editable, modPath, onUpdate }) => {
  const [availableTextures, setAvailableTextures] = React.useState<string[]>([]);
  const [showPicker, setShowPicker] = React.useState(false);

  const handleBrowse = async () => {
    try {
      // Try native DDS file picker first
      const picked = await (window.electronAPI as any)?.pickDdsFile?.();
      if (picked && (Array.isArray(picked) ? picked.length > 0 : picked)) {
        const selectedPath = Array.isArray(picked) ? picked[0] : picked;
        onUpdate(selectedPath);
        return;
      }

      // Fallback: load available textures from the actual loaded mod directory
      const result = await window.electronAPI?.invoke?.('material:browse-textures', modPath || '.');
      if (result?.success && Array.isArray(result.textures) && result.textures.length > 0) {
        setAvailableTextures(result.textures);
        setShowPicker(true);
      }
    } catch (err) {
      console.error('Browse failed:', err);
    }
  };

  return (
    <div className={`map-card ${type}`}>
      <div className="map-icon">
        {type === 'diffuse'   && <Image    style={{ width: '1em', height: '1em' }} />}
        {type === 'normal'    && <ArrowUp  style={{ width: '1em', height: '1em' }} />}
        {type === 'specular'  && <Sparkles style={{ width: '1em', height: '1em' }} />}
        {type === 'metallic'  && <Layers   style={{ width: '1em', height: '1em' }} />}
        {type === 'ao'        && <Circle   style={{ width: '1em', height: '1em' }} />}
        {type === 'cavity'    && <Minus    style={{ width: '1em', height: '1em' }} />}
      </div>

      <div className="map-info">
        <span className="map-name">{name}</span>
        {generated && <span className="map-badge">Generated</span>}
      </div>

      <div className="map-path">{path ? path.split('\\').pop() : 'Not assigned'}</div>

      {editable && (
        <>
          <button className="btn-browse" onClick={handleBrowse}>
            Browse
          </button>
          {showPicker && availableTextures.length > 0 && (
            <select
              className="texture-picker-select"
              defaultValue=""
              onChange={(e) => {
                if (e.target.value) {
                  onUpdate(e.target.value);
                  setShowPicker(false);
                }
              }}
            >
              <option value="" disabled>— select texture —</option>
              {availableTextures.map(t => (
                <option key={t} value={t}>{t.split(/[\\/]/).pop()}</option>
              ))}
            </select>
          )}
        </>
      )}
    </div>
  );
};

/**
 * Property Toggle Component
 */
const PropertyToggle: React.FC<{
  label: string;
  value: boolean;
  editable: boolean;
  onChange: (value: boolean) => void;
}> = ({ label, value, editable, onChange }) => (
  <div className="property-toggle">
    <label>{label}</label>
    <input
      type="checkbox"
      checked={value}
      disabled={!editable}
      onChange={(e) => onChange(e.target.checked)}
    />
  </div>
);

export default MaterialDefinitionEditor;
