import React, { useEffect, useMemo, useState } from 'react';
import { Search, Download, Star, Users, ExternalLink } from 'lucide-react';
import type { ModListing, ModDetails, SearchFilters, Review, Collection } from '../../shared/types';

// prefer preload API when available, otherwise fall back to in-memory engine for dev
let bridge: any = (window as any).electron?.api || (window as any).electronAPI;
try {
  if (!bridge || !bridge.modBrowser) {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const local = require('../../mining/modBrowser');
    bridge = bridge || { modBrowser: local.modBrowser || local.default };
  }
} catch (err) {
  // ignore; UI will still render but actions will fail gracefully
}

const DEFAULT_FILTERS: SearchFilters = { game: 'fallout4', sortBy: 'trending', nsfw: false } as any;

const ModBrowser: React.FC = () => {
  const [query, setQuery] = useState('');
  const [filters, setFilters] = useState<SearchFilters>(DEFAULT_FILTERS);
  const [results, setResults] = useState<ModListing[]>([]);
  const [selected, setSelected] = useState<ModDetails | null>(null);
  const [loading, setLoading] = useState(false);
  const [reviews, setReviews] = useState<Review[]>([] as any);
  const [newReview, setNewReview] = useState('');
  const [collections, setCollections] = useState<Collection[]>([]);
  const [collectionName, setCollectionName] = useState('');
  const [nexusKey, setNexusKey] = useState('');
  const [nexusStatus, setNexusStatus] = useState<string | null>(null);

  useEffect(() => {
    doSearch();
  }, [filters]);

  const doSearch = async () => {
    setLoading(true);
    try {
      const res: ModListing[] = await bridge.modBrowser.searchMods(query, filters);
      setResults(res || []);
    } catch (err) {
      console.error('Search failed', err);
      setResults([]);
    }
    setLoading(false);
  };

  const openDetails = async (id: string) => {
    try {
      const d: ModDetails = await bridge.modBrowser.getModDetails(id);
      setSelected(d);
      const revs = await bridge.modBrowser.getModReviews(id);
      setReviews(revs || []);
    } catch (err) {
      console.error('Details failed', err);
    }
  };

  const handleDownload = async (id: string) => {
    try {
      const dest = window.prompt('Download destination (local path)', 'C:/Temp');
      if (!dest) return;
      const res = await bridge.modBrowser.downloadMod(id, dest);
      if (res.success) {
        alert(`Downloaded to ${res.filePath} (${(res.size/1024|0)} KB) in ${res.duration} ms`);
        try { window.dispatchEvent(new CustomEvent('security:auto-scan-download', { detail: { filePath: res.filePath } })); } catch (err) { /* ignore dispatch errors */ };
        try { window.dispatchEvent(new CustomEvent('security:auto-scan-download', { detail: { filePath: res.filePath } })); } catch {};
      } else alert('Download failed');
    } catch (err) {
      console.error(err);
      alert('Download error');
    }
  };

  const submitReview = async () => {
    if (!selected) return;
    try {
      await bridge.modBrowser.rateMod(selected.id, 5, newReview || 'Nice mod');
      const revs = await bridge.modBrowser.getModReviews(selected.id);
      setReviews(revs || []);
      setNewReview('');
    } catch (err) {
      console.error(err);
      alert('Failed to submit review');
    }
  };

  const createCollection = async () => {
    if (!collectionName) return alert('Provide a collection name');
    try {
      const col = await bridge.modBrowser.createCollection(collectionName, selected ? [selected.id] : [], 'Created from ModBrowser');
      setCollections((c: any) => [col, ...c]);
      setCollectionName('');
      alert(`Collection created: ${col.shareUrl}`);
    } catch (err) {
      console.error(err);
    }
  };

  const handleNexusLogin = async () => {
    try {
      const r = await bridge.modBrowser.authenticateNexus(nexusKey);
      if (r?.success) setNexusStatus('Connected');
      else setNexusStatus(`Failed: ${r?.error || 'unknown'}`);
    } catch (err) {
      console.error(err);
      setNexusStatus('Error');
    }
  };

  const endorse = async (id: string) => {
    try {
      await bridge.modBrowser.endorseMod(id);
      doSearch();
    } catch (err) {
      console.error(err);
    }
  };

  const filteredResults = useMemo(() => results, [results]);

  return (
    <div className="min-h-full p-6 bg-[#0b0f0b] text-slate-100">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center gap-4 mb-6">
          <div className="flex items-center bg-[#0f1313] border border-slate-800 rounded px-3 py-2 flex-1">
            <Search className="w-4 h-4 text-slate-400 mr-3" />
            <input className="bg-transparent outline-none flex-1 text-sm" placeholder="Search mods, authors, tags..." value={query} onChange={e => setQuery(e.target.value)} onKeyDown={e => e.key === 'Enter' && doSearch()} />
            <button className="ml-3 text-xs bg-emerald-700/10 px-2 py-1 rounded" onClick={doSearch}>Search</button>
          </div>

          <div className="flex gap-2">
            <select className="bg-[#0f1313] border border-slate-800 text-sm px-2 py-1 rounded" value={filters.sortBy} onChange={e => setFilters(f => ({ ...f, sortBy: e.target.value as any }))}>
              <option value="trending">Trending</option>
              <option value="downloads">Downloads</option>
              <option value="recent">Recent</option>
              <option value="endorsements">Endorsements</option>
            </select>
            <select className="bg-[#0f1313] border border-slate-800 text-sm px-2 py-1 rounded" value={filters.category || ''} onChange={e => setFilters(f => ({ ...f, category: e.target.value || undefined }))}>
              <option value="">All Categories</option>
              <option value="visual">Visual</option>
              <option value="gameplay">Gameplay</option>
              <option value="tools">Tools</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-6">
          <div className="col-span-3">
            <div className="grid grid-cols-3 gap-4">
              {loading ? <div className="text-sm text-slate-500">Loading...</div> : filteredResults.map(mod => (
                <div key={mod.id} className="bg-[#0f1112] border border-slate-800 rounded p-3">
                  <div className="h-36 bg-black/30 rounded mb-3 flex items-center justify-center text-xs text-slate-500">{mod.thumbnailUrl ? <img src={mod.thumbnailUrl} alt={mod.name} className="max-h-32" /> : 'Thumbnail'}</div>
                  <div className="font-semibold">{mod.name}</div>
                  <div className="text-xs text-slate-400">by {mod.author}</div>
                  <div className="text-[12px] text-slate-300 mt-2">{mod.summary}</div>
                  <div className="mt-3 flex items-center justify-between text-[12px] text-slate-400">
                    <div>⭐ {mod.endorsements} • ⬇️ {mod.downloads}</div>
                    <div className="flex gap-2">
                      <button className="px-2 py-1 bg-black/20 rounded text-xs" onClick={() => openDetails(mod.id)}>Details</button>
                      <button className="px-2 py-1 bg-emerald-700/10 rounded text-xs flex items-center gap-2" onClick={() => handleDownload(mod.id)}><Download className="w-3 h-3"/>Download</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="col-span-1 space-y-4">
            <div className="p-3 border border-slate-800 rounded bg-[#0a0e0a]">
              <div className="text-sm font-semibold mb-2">Nexus Mods</div>
              <input className="w-full p-2 bg-black/10 border border-slate-800 rounded text-sm mb-2" placeholder="API Key" value={nexusKey} onChange={e => setNexusKey(e.target.value)} />
              <button className="w-full px-3 py-2 bg-emerald-700/10 rounded text-sm" onClick={handleNexusLogin}>Login</button>
              {nexusStatus && <div className="mt-2 text-xs text-slate-400">{nexusStatus}</div>}
            </div>

            <div className="p-3 border border-slate-800 rounded bg-[#0a0e0a]">
              <div className="text-sm font-semibold mb-2">Collections</div>
              <input className="w-full p-2 bg-black/10 border border-slate-800 rounded text-sm mb-2" placeholder="New collection name" value={collectionName} onChange={e => setCollectionName(e.target.value)} />
              <button className="w-full px-3 py-2 bg-purple-700/10 rounded text-sm" onClick={createCollection}>Create</button>
              <div className="mt-3 text-xs text-slate-400">{collections.length} collections</div>
            </div>

            <div className="p-3 border border-slate-800 rounded bg-[#0a0e0a]">
              <div className="text-sm font-semibold mb-2">Selected Mod</div>
              {!selected ? <div className="text-xs text-slate-500">Select a mod to view details</div> : (
                <>
                  <div className="text-sm font-bold">{selected.name}</div>
                  <div className="text-xs text-slate-400">by {selected.author}</div>
                  <div className="mt-2 text-[12px] text-slate-300">{selected.description}</div>
                  <div className="mt-3 flex gap-2">
                    <button className="px-2 py-1 rounded bg-black/20 text-xs" onClick={() => selected && endorse(selected.id)}><Star className="w-3 h-3 mr-1"/>Endorse</button>
                    <a className="px-2 py-1 rounded bg-black/20 text-xs flex items-center gap-2" href="#" onClick={(e) => { e.preventDefault(); window.open(selected.homepage || '', '_blank'); }}><ExternalLink className="w-3 h-3"/>Homepage</a>
                  </div>
                </>
              )}
            </div>

            <div className="p-3 border border-slate-800 rounded bg-[#0a0e0a]">
              <div className="text-sm font-semibold mb-2">Reviews</div>
              {reviews.length === 0 ? <div className="text-xs text-slate-500">No reviews</div> : reviews.map((r, i) => (
                <div key={i} className="mb-2 text-sm">
                  <div className="font-semibold">{r.username}</div>
                  <div className="text-xs text-slate-400">{r.text}</div>
                </div>
              ))}
              {selected && (
                <div className="mt-2">
                  <textarea className="w-full p-2 bg-black/10 border border-slate-800 rounded text-sm" rows={3} value={newReview} onChange={e => setNewReview(e.target.value)} placeholder="Write a short review" />
                  <div className="mt-2 flex gap-2"><button className="px-3 py-1 rounded bg-emerald-700/10 text-sm" onClick={submitReview}>Submit</button></div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ModBrowser;
