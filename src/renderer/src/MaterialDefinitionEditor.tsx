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
  modPath,
}) => {
  const [manifest, setManifest] = useState<MaterialManifest | null>(null);
  const [selectedMaterial, setSelectedMaterial] = useState<Material | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [filterType, setFilterType] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [showPreview, setShowPreview] = useState(true);
  const [isDirty, setIsDirty] = useState(false);

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

      const result = await window.electronAPI?.material?.loadManifest?.(manifestPath)
        ?? await window.electronAPI?.invoke?.('material:load-manifest', manifestPath);

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

      const result = await window.electronAPI?.material?.saveManifest?.({ filePath, manifest })
        ?? await window.electronAPI?.invoke?.('material:save-manifest', { filePath, manifest });
      
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

  return (
    <div className="material-editor-container">
      <div className="editor-header">
        <h1>📋 Material Definitions</h1>
        {manifest && <span className="mod-name">{manifest.modName}</span>}
      </div>

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
                {editMode ? '✓ Done' : '✎ Edit'}
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
                  💾 Save Changes
                </button>
              )}
              <button className="btn-preview">
                👁️ Preview in Blender
              </button>
              <button className="btn-export">
                📦 Export Material
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
  onUpdate: (path: string) => void;
}> = ({ name, path, type, generated, editable, onUpdate }) => {
  const [availableTextures, setAvailableTextures] = React.useState<string[]>([]);

  const handleBrowse = async () => {
    try {
      // Load available textures
      const result = await window.electronAPI?.invoke?.('material:browse-textures', '.');
      
      if (result?.success) {
        setAvailableTextures(result.textures);
        // TODO: Show texture picker dialog
        console.log('Available textures:', result.textures);
      }
    } catch (err) {
      console.error('Browse failed:', err);
    }
  };

  return (
    <div className={`map-card ${type}`}>
      <div className="map-icon">
        {type === 'diffuse' && '🎨'}
        {type === 'normal' && '⬆️'}
        {type === 'specular' && '✨'}
        {type === 'metallic' && '🔩'}
        {type === 'ao' && '🌑'}
        {type === 'cavity' && '〰️'}
      </div>

      <div className="map-info">
        <span className="map-name">{name}</span>
        {generated && <span className="map-badge">Generated</span>}
      </div>

      <div className="map-path">{path ? path.split('\\').pop() : 'Not assigned'}</div>

      {editable && (
        <button className="btn-browse" onClick={handleBrowse}>
          Browse
        </button>
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
