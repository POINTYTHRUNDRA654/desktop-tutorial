import React, { useEffect, useRef, useState } from 'react';
import { Plus, Trash2, Copy, Search, Move, RotateCcw, Grid, Sun, FilePlus } from 'lucide-react';
import './CellEditor.css';

// Lightweight local types (align with shared types — UI-focused)
type Vector3 = { x: number; y: number; z: number };

type ReferenceFlags = {
  persistent: boolean;
  disabled: boolean;
  initiallyDisabled: boolean;
  noRespawn: boolean;
  multibound: boolean;
};

type Reference = {
  id: string;
  baseObject: string;
  position: Vector3;
  rotation: Vector3;
  scale: number;
  flags: ReferenceFlags;
  linkedRef?: string | null;
};

type CatalogEntry = { id: string; name: string; category: string };

export const CellEditor: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [catalog] = useState<CatalogEntry[]>([
    { id: 'STAT_Clutter_01', name: 'Clutter - Bottle', category: 'Static' },
    { id: 'FURN_WorkBench01', name: 'WorkBench01', category: 'Furniture' },
    { id: 'NPC_Guard_01', name: 'Guard (NPC)', category: 'NPC' },
    { id: 'LIGHT_Point_Small', name: 'Small Point Light', category: 'Lights' },
    { id: 'MISC_Lamp_01', name: 'Standing Lamp', category: 'Misc' },
  ]);

  const [placed, setPlaced] = useState<Reference[]>([
    { id: 'r1', baseObject: 'FURN_WorkBench01', position: { x: 120, y: 45, z: 0 }, rotation: { x: 0, y: 90, z: 0 }, scale: 1, flags: { persistent: true, disabled: false, initiallyDisabled: false, noRespawn: true, multibound: false } , linkedRef: null},
    { id: 'r2', baseObject: 'MISC_Lamp_01', position: { x: 140, y: 60, z: 0 }, rotation: { x: 0, y: 0, z: 0 }, scale: 1, flags: { persistent: false, disabled: false, initiallyDisabled: false, noRespawn: false, multibound: false }, linkedRef: null },
  ]);

  // Keep a simple currentCell descriptor so renderer can call the preload IPC helpers
  const [currentCell, setCurrentCell] = useState<{ id: string; name?: string } | null>({ id: 'cell_default_1', name: 'RedRocketInterior' });

  // If preload API is available, create/load a cell on mount so engine has a backing record
  useEffect(() => {
    (async () => {
      try {
        const api = (window as any).electronAPI ?? (window as any).electron?.api;
        if (!api) return;
        // attempt to load a cell from engine; fall back to creating one
        const resp = await api.loadCell?.(undefined, currentCell?.id ?? 'cell_default_1');
        if (resp?.success && resp.data) {
          setCurrentCell({ id: resp.data.id, name: resp.data.name });
          // hydrate placed references from engine if present
          if (resp.data.references && Array.isArray(resp.data.references)) setPlaced(resp.data.references);
        } else {
          const created = await api.createCell?.(currentCell?.name || 'RedRocketInterior', 'interior');
          if (created?.success && created.data) setCurrentCell({ id: created.data.id, name: created.data.name });
        }
      } catch (err) {
        // ignore — UI still works offline/in-memory
        // console.warn('CellEditor: failed to sync with engine', err);
      }
    })();
  }, []);

  const [selectedId, setSelectedId] = useState<string | null>(placed[0]?.id ?? null);
  const [tool, setTool] = useState<'move' | 'rotate' | 'scale' | 'snap' | 'navmesh' | 'light'>('move');
  const [renderMode, setRenderMode] = useState<'solid' | 'wire'>('solid');
  const [showNavmesh, setShowNavmesh] = useState(true);
  const [showGrid, setShowGrid] = useState(true);
  const [snapToGrid, setSnapToGrid] = useState(true);
  const [gridSize, setGridSize] = useState<number>(16);

  // Helpers
  const pxPerUnit = 2.5; // viewport scale
  const canvasToWorld = (cx: number, cy: number, rect: DOMRect) => {
    const w = rect.width;
    const h = rect.height;
    const cxRel = cx - w / 2; // center origin
    const cyRel = (h / 2) - cy; // invert Y so up is +
    return { x: cxRel / pxPerUnit, y: cyRel / pxPerUnit, z: 0 };
  };

  const worldToCanvas = (v: Vector3, rect: DOMRect) => {
    const cx = rect.width / 2 + v.x * pxPerUnit;
    const cy = rect.height / 2 - v.y * pxPerUnit;
    return { x: cx, y: cy };
  };

  // Canvas rendering (2D top-down preview that simulates 3D viewport)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    canvas.width = Math.max(640, rect.width * devicePixelRatio);
    canvas.height = Math.max(360, rect.height * devicePixelRatio);
    ctx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);

    // background
    ctx.fillStyle = '#071727';
    ctx.fillRect(0, 0, rect.width, rect.height);

    // grid
    if (showGrid) {
      ctx.strokeStyle = '#0f2330';
      ctx.lineWidth = 1;
      const step = gridSize * pxPerUnit;
      for (let x = (rect.width / 2) % step; x < rect.width; x += step) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, rect.height); ctx.stroke();
      }
      for (let y = (rect.height / 2) % step; y < rect.height; y += step) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(rect.width, y); ctx.stroke();
      }
    }

    // navmesh placeholder (if enabled)
    if (showNavmesh) {
      ctx.strokeStyle = 'rgba(59,130,246,0.45)';
      ctx.fillStyle = 'rgba(59,130,246,0.06)';
      ctx.lineWidth = 1.5;
      // simple triangle for demonstration
      const a = worldToCanvas({ x: -40, y: -20, z: 0 }, rect);
      const b = worldToCanvas({ x: 40, y: -20, z: 0 }, rect);
      const c = worldToCanvas({ x: 0, y: 40, z: 0 }, rect);
      ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.lineTo(c.x, c.y); ctx.closePath();
      ctx.fill(); ctx.stroke();
    }

    // draw placed references
    placed.forEach((ref) => {
      const pos = worldToCanvas(ref.position, rect);
      const isSelected = ref.id === selectedId;
      // color by category hint
      const base = ref.baseObject.toLowerCase();
      let color = '#9ca3af';
      if (base.includes('furn')) color = '#60a5fa';
      if (base.includes('npc')) color = '#fb7185';
      if (base.includes('light')) color = '#fbbf24';

      // draw body
      ctx.beginPath();
      ctx.fillStyle = color;
      ctx.strokeStyle = isSelected ? '#10b981' : '#0b1220';
      const size = 12 * Math.max(0.4, Math.min(2, ref.scale));
      ctx.ellipse(pos.x, pos.y, size, size, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.lineWidth = isSelected ? 3 : 1;
      ctx.stroke();

      // label
      ctx.font = '12px Inter, sans-serif';
      ctx.fillStyle = '#e2e8f0';
      ctx.textAlign = 'center';
      ctx.fillText(ref.baseObject.replace(/_/g, ' ').replace(/\d+$/,''), pos.x, pos.y - size - 8);

      // rotation indicator
      ctx.beginPath();
      ctx.strokeStyle = 'rgba(255,255,255,0.25)';
      ctx.moveTo(pos.x, pos.y);
      const rot = (ref.rotation.y || 0) * (Math.PI / 180);
      ctx.lineTo(pos.x + Math.cos(rot) * (size + 10), pos.y - Math.sin(rot) * (size + 10));
      ctx.stroke();
    });
  }, [placed, selectedId, showGrid, gridSize, showNavmesh, renderMode]);

  // Drag & drop from catalog into viewport
  const onCanvasDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const payload = e.dataTransfer.getData('text/plain');
    if (!payload) return;
    const rect = canvasRef.current!.getBoundingClientRect();
    const world = canvasToWorld(e.clientX - rect.left, e.clientY - rect.top, rect);
    addPlacedObject(payload, { x: Math.round(world.x), y: Math.round(world.y), z: 0 });
  };
  const onCanvasDragOver = (e: React.DragEvent) => e.preventDefault();

  const addPlacedObject = async (baseObject: string, position: Vector3) => {
    const api = (window as any).electronAPI ?? (window as any).electron?.api;

    // If engine is available, persist placement there and use canonical ref id
    if (api && currentCell) {
      try {
        const resp = await api.placeObject?.(currentCell, baseObject, position, { x: 0, y: 0, z: 0 });
        if (resp?.success && resp.data) {
          setPlaced((p) => [...p, resp.data]);
          setSelectedId(resp.data.id);
          return;
        }
      } catch (err) {
        console.warn('placeObject IPC failed, falling back to local-only placement', err);
      }
    }

    // Local-only placement fallback
    const newRef: Reference = {
      id: `ref_${Date.now()}`,
      baseObject,
      position,
      rotation: { x: 0, y: 0, z: 0 },
      scale: 1,
      flags: { persistent: false, disabled: false, initiallyDisabled: false, noRespawn: false, multibound: false },
      linkedRef: null,
    };
    setPlaced((p) => [...p, newRef]);
    setSelectedId(newRef.id);
  };

  const handleCatalogDragStart = (e: React.DragEvent, id: string) => {
    e.dataTransfer.setData('text/plain', id);
    e.dataTransfer.effectAllowed = 'copy';
  };

  // selection by click
  const onCanvasClick = (e: React.MouseEvent) => {
    const rect = (e.target as HTMLCanvasElement).getBoundingClientRect();
    const world = canvasToWorld(e.clientX - rect.left, e.clientY - rect.top, rect);
    // find nearest placed within threshold (world units)
    let found: Reference | null = null;
    let minDist = 9999;
    placed.forEach((r) => {
      const dx = r.position.x - world.x;
      const dy = r.position.y - world.y;
      const d = Math.sqrt(dx * dx + dy * dy);
      if (d < 12 && d < minDist) { found = r; minDist = d; }
    });
    setSelectedId(found ? found.id : null);
  };

  // keyboard controls: WASD (move), R rotate, S scale (increment)
  useEffect(() => {
    const onKey = (ev: KeyboardEvent) => {
      if (!selectedId) return;
      const step = snapToGrid ? gridSize / 4 : 1;
      const selected = placed.find((p) => p.id === selectedId);
      if (!selected) return;
      if (ev.key === 'w' || ev.key === 'ArrowUp') {
        // move +Y
        selected.position.y += step; setPlaced([...placed]);
      } else if (ev.key === 's' || ev.key === 'ArrowDown') {
        // move -Y or scale tool toggle
        if (tool === 'scale') { selected.scale = Math.max(0.1, selected.scale - 0.1); setPlaced([...placed]); }
        else { selected.position.y -= step; setPlaced([...placed]); }
      } else if (ev.key === 'a' || ev.key === 'ArrowLeft') {
        selected.position.x -= step; setPlaced([...placed]);
      } else if (ev.key === 'd' || ev.key === 'ArrowRight') {
        selected.position.x += step; setPlaced([...placed]);
      } else if (ev.key === 'r') {
        // rotate Y (heading)
        selected.rotation.y = (selected.rotation.y + 15) % 360; setPlaced([...placed]);
      } else if (ev.key === 'g') {
        setTool('move');
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [placed, selectedId, snapToGrid, gridSize, tool]);

  const updateSelected = (patch: Partial<Reference>) => {
    setPlaced((p) => p.map((r) => (r.id === selectedId ? { ...r, ...patch } : r)));
  };

  const deleteSelected = () => {
    if (!selectedId) return;
    setPlaced((p) => p.filter((r) => r.id !== selectedId));
    setSelectedId(null);
  };

  const duplicateSelected = () => {
    const s = placed.find((r) => r.id === selectedId);
    if (!s) return;
    const dup: Reference = { ...JSON.parse(JSON.stringify(s)), id: `ref_${Date.now()}`, position: { x: s.position.x + 8, y: s.position.y + 8, z: s.position.z } };
    setPlaced((p) => [...p, dup]);
    setSelectedId(dup.id);
  };

  const selected = placed.find((p) => p.id === selectedId) ?? null;

  return (
    <div className="cell-editor" data-testid="cell-editor">
      <div className="left-panel">
        <div className="panel-header">
          <h3>Object Browser</h3>
          <div style={{ fontSize: 12, color: '#64748b' }}>Favorites</div>
        </div>

        <div className="object-search">
          <div style={{ display: 'flex', gap: 8 }}>
            <Search size={16} color="#94a3b8" />
            <input className="form-input" placeholder="Search objects..." />
          </div>
        </div>

        <div className="catalog">
          {['Static','Furniture','NPC','Lights','Misc'].map((cat) => (
            <div key={cat} className="category">
              <div className="category-title">{cat}</div>
              <div className="items">
                {catalog.filter((c) => c.category === cat || (cat==='Static' && c.category==='Static')).map((item) => (
                  <div key={item.id} className="catalog-item" draggable onDragStart={(e) => handleCatalogDragStart(e, item.id)} onDoubleClick={() => addPlacedObject(item.id, { x: 0, y: 0, z: 0 })}>
                    <div className="thumb">{item.name.split(' ')[0].slice(0,2)}</div>
                    <div style={{flex:1}}>
                      <div style={{fontSize:13}}>{item.name}</div>
                      <div style={{fontSize:11,color:'#64748b'}}>{item.id}</div>
                    </div>
                    <div style={{color:'#94a3b8',fontSize:12}}><Plus size={14} /></div>
                  </div>
                ))}
              </div>
            </div>
          ))}

          <div className="placed-list">
            <div style={{ fontSize: 13, color: '#94a3b8', marginBottom: 8 }}>Placed Objects</div>
            {placed.length === 0 && <div className="empty-note">No objects in this cell — drag from the left to add.</div>}
            {placed.map((p) => (
              <div key={p.id} className="placed-item" onClick={() => setSelectedId(p.id)} style={{ background: p.id === selectedId ? '#0f2a3f' : 'transparent' }}>
                <div>
                  <div style={{ fontSize: 13 }}>{p.baseObject}</div>
                  <div className="meta">X:{p.position.x} Y:{p.position.y}</div>
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button className="small-btn" onClick={(e) => { e.stopPropagation(); setSelectedId(p.id); duplicateSelected(); }} title="Duplicate"><Copy size={14} /></button>
                  <button className="small-btn" onClick={(e) => { e.stopPropagation(); setPlaced((list) => list.filter((r) => r.id !== p.id)); if (selectedId === p.id) setSelectedId(null); }} title="Delete"><Trash2 size={14} /></button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="left-footer">
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
            <div className="legend">Search · Drag to viewport · Double-click to add</div>
            <div style={{display:'flex',gap:8}}>
              <button className="small-btn" onClick={() => { addPlacedObject('STAT_Clutter_01', {x:0,y:0,z:0}); }}><FilePlus size={14} /></button>
            </div>
          </div>
        </div>
      </div>

      <div className="center-panel">
        <div className="viewport-toolbar">
          <div className="left">
            <div style={{fontWeight:700,fontSize:16}}>Cell Editor — <span style={{color:'#60a5fa'}}>RedRocketInterior</span></div>
          </div>
          <div className="right">
            <div style={{display:'flex',gap:8}}>
              <button className={`tool-btn ${tool==='move'?'active':''}`} onClick={() => setTool('move')} title="Move"><Move size={16} /></button>
              <button className={`tool-btn ${tool==='rotate'?'active':''}`} onClick={() => setTool('rotate')} title="Rotate"><RotateCcw size={16} /></button>
              <button className={`tool-btn ${tool==='scale'?'active':''}`} onClick={() => setTool('scale')} title="Scale">S</button>
              <button className={`tool-btn ${tool==='snap'?'active':''}`} onClick={() => setTool('snap')} title="Snap">Snap</button>
              <button className={`tool-btn ${tool==='navmesh'?'active':''}`} onClick={() => setTool('navmesh')} title="Navmesh">NM</button>
              <button className={`tool-btn ${tool==='light'?'active':''}`} onClick={() => setTool('light')} title="Light"><Sun size={16} /></button>
            </div>
          </div>
        </div>

        <div className="viewport-area">
          <div className="viewport-canvas" onDrop={onCanvasDrop} onDragOver={onCanvasDragOver}>
            <canvas ref={canvasRef} style={{ width: '100%', height: '100%', display: 'block', borderRadius: 8 }} onClick={onCanvasClick} />
            <div className="viewport-overlay">Rendering Mode: <strong style={{marginLeft:6}}>{renderMode}</strong> · <label style={{marginLeft:8, cursor:'pointer'}}><input type="checkbox" checked={showNavmesh} onChange={(e)=>setShowNavmesh(e.target.checked)} /> Show Navmesh</label> · <label style={{marginLeft:8, cursor:'pointer'}}><input type="checkbox" checked={showGrid} onChange={(e)=>setShowGrid(e.target.checked)} /> Show Grid</label></div>
            <div className="viewport-hints">Mouse: Rotate · W/A/S/D: Move · G: Move gizmo · R: Rotate · S: Scale</div>
          </div>
        </div>

        <div className="bottom-tools">
          <div style={{display:'flex',gap:8}}>
            <div className="toggle"><Grid size={14} color="#94a3b8"/> Snap: <select value={gridSize} onChange={(e)=>setGridSize(Number(e.target.value))} style={{marginLeft:6,background:'#071428',border:'1px solid #22303f',color:'#cbd5e1',padding:'6px',borderRadius:6}}><option>8</option><option>16</option><option>32</option><option>64</option></select></div>
            <div className="toggle legend">[✓] Rotate · [✓] Scale</div>
          </div>
          <div style={{display:'flex',gap:8}}>
            <button className="btn-ghost" onClick={async () => {
              const cellPayload = { id: 'cell_default_1', editorId: 'CEL0001', name: 'RedRocketInterior', type: 'interior', references: placed, lighting: { ambientColor: { r: 0.6, g: 0.6, b: 0.65 }, exposure: 1.0, usesPrevis: false } };
              try {
                const resp = await (window as any).electronAPI?.generateNavmesh?.(cellPayload, { /* default settings */ });
                if (resp?.success) {
                  // attach navmesh id to cell locally for preview
                  alert(`Navmesh generated — id=${resp.data?.id}`);
                } else {
                  alert(`Navmesh generation failed: ${resp?.error || 'unknown'}`);
                }
              } catch (err) {
                alert('Navmesh generation error');
              }
            }}>Generate Navmesh</button>
            <button className="btn-primary" onClick={async () => {
              const cellPayload = { id: 'cell_default_1', editorId: 'CEL0001', name: 'RedRocketInterior', type: 'interior', references: placed, lighting: { ambientColor: { r: 0.6, g: 0.6, b: 0.65 }, exposure: 1.0, usesPrevis: false } };
              try {
                const resp = await (window as any).electronAPI?.saveCell?.(cellPayload);
                if (resp?.success) {
                  alert('Cell saved (in-memory)');
                } else {
                  alert(`Save failed: ${resp?.error || 'unknown'}`);
                }
              } catch (err) {
                alert('Save cell error');
              }
            }}>Save Cell</button>
          </div>
        </div>
      </div>

      <div className="right-panel">
        <div className="prop-card">
          <h4>Selected</h4>
          {!selected && <div style={{color:'#64748b'}}>No object selected</div>}
          {selected && (
            <>
              <div style={{fontSize:14,fontWeight:700}}>{selected.baseObject}</div>
              <div style={{marginTop:8}}>
                <label style={{fontSize:12,color:'#94a3b8'}}>Position</label>
                <div className="prop-row">
                  <input className="form-input" value={selected.position.x} onChange={(e)=>updateSelected({ position: { ...selected.position, x: Number(e.target.value) }})} />
                  <input className="form-input" value={selected.position.y} onChange={(e)=>updateSelected({ position: { ...selected.position, y: Number(e.target.value) }})} />
                  <input className="form-input" value={selected.position.z} onChange={(e)=>updateSelected({ position: { ...selected.position, z: Number(e.target.value) }})} />
                </div>
              </div>

              <div style={{marginTop:8}}>
                <label style={{fontSize:12,color:'#94a3b8'}}>Rotation (Y heading)</label>
                <div className="prop-row">
                  <input className="form-input" value={selected.rotation.y} onChange={(e)=>updateSelected({ rotation: { ...selected.rotation, y: Number(e.target.value) }})} />
                </div>
              </div>

              <div style={{marginTop:8}}>
                <label style={{fontSize:12,color:'#94a3b8'}}>Scale</label>
                <div className="prop-row">
                  <input className="form-input" value={selected.scale} onChange={(e)=>updateSelected({ scale: Number(e.target.value) })} />
                </div>
              </div>

              <div style={{marginTop:8}} className="flags">
                <label className="flag-item"><input type="checkbox" checked={selected.flags.persistent} onChange={(e)=>updateSelected({ flags: { ...selected.flags, persistent: e.target.checked } })}/> Persistent</label>
                <label className="flag-item"><input type="checkbox" checked={selected.flags.disabled} onChange={(e)=>updateSelected({ flags: { ...selected.flags, disabled: e.target.checked } })}/> Disabled</label>
                <label className="flag-item"><input type="checkbox" checked={selected.flags.noRespawn} onChange={(e)=>updateSelected({ flags: { ...selected.flags, noRespawn: e.target.checked } })}/> No Respawn</label>
              </div>

              <div style={{display:'flex',gap:8,marginTop:12}}>
                <button className="btn-ghost" onClick={duplicateSelected}><Copy size={14}/> Duplicate</button>
                <button className="btn-ghost" onClick={deleteSelected}><Trash2 size={14}/> Delete</button>
              </div>
            </>
          )}
        </div>

        <div className="prop-card">
          <h4>Placed Objects</h4>
          <div style={{display:'flex',flexDirection:'column',gap:8}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
              <div className="legend">{placed.length} objects</div>
              <div style={{display:'flex',gap:8}}>
                <button className="small-btn" onClick={() => { setPlaced([]); setSelectedId(null); }}>Clear</button>
                <button className="small-btn" onClick={() => { /* show in game */ alert('Select in CK'); }}>Select in CK</button>
              </div>
            </div>

            <div style={{maxHeight:180,overflow:'auto'}}>
              {placed.map((r) => (
                <div key={r.id} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'6px 8px',borderRadius:6,background:r.id===selectedId? '#0f2a3f':'transparent',border:'1px solid #1f2b36',marginBottom:6}}>
                  <div style={{fontSize:13}} onClick={() => setSelectedId(r.id)}>{r.baseObject}</div>
                  <div style={{display:'flex',gap:6}}>
                    <button className="small-btn" onClick={() => { setPlaced((p)=>p.map(x=>x.id===r.id?{...x,flags:{...x.flags,disabled:!x.flags.disabled}}:x)); }}>{r.flags.disabled? 'Enable':'Disable'}</button>
                    <button className="small-btn" onClick={() => { setPlaced((list)=>list.filter(x=>x.id!==r.id)); if (selectedId===r.id) setSelectedId(null); }}><Trash2 size={14} /></button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="prop-card">
          <h4>Viewport Options</h4>
          <div style={{display:'flex',gap:8,alignItems:'center'}}>
            <label style={{display:'flex',gap:8,alignItems:'center'}}><input type="radio" name="render" checked={renderMode==='solid'} onChange={()=>setRenderMode('solid')} /> Solid</label>
            <label style={{display:'flex',gap:8,alignItems:'center'}}><input type="radio" name="render" checked={renderMode==='wire'} onChange={()=>setRenderMode('wire')} /> Wire</label>
          </div>
          <div style={{marginTop:8,display:'flex',gap:8,alignItems:'center'}}>
            <label style={{display:'flex',gap:6,alignItems:'center'}}><input type="checkbox" checked={showNavmesh} onChange={(e)=>setShowNavmesh(e.target.checked)} /> Show Navmesh</label>
            <label style={{display:'flex',gap:6,alignItems:'center'}}><input type="checkbox" checked={showGrid} onChange={(e)=>setShowGrid(e.target.checked)} /> Grid</label>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CellEditor;
