import React, { useEffect, useMemo, useState } from 'react';
import { Play, Bookmark, Star, List, Video, Activity } from 'lucide-react';
import type { Tutorial, TutorialStep, UserProgress, Achievement } from '../../shared/types';

// Prefer preload/electronAPI when available, otherwise fall back to local in-memory engine (dev mode)
let bridge: any = (window as any).electron?.api || (window as any).electronAPI;
try {
  if (!bridge || !bridge.learningHub) {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const local = require('../../mining/learningHub');
    bridge = bridge || { learningHub: local.learningHub || local.default };
  }
} catch (err) {
  // ignore — UI will still render with empty lists
}

const USER_ID = 'local_user';

const LearningHub: React.FC = () => {
  const [tutorials, setTutorials] = useState<Tutorial[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedTutorial, setSelectedTutorial] = useState<Tutorial | null>(null);
  const [selectedStepIndex, setSelectedStepIndex] = useState<number>(0);
  const [progress, setProgress] = useState<UserProgress | null>(null);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [bookmarks, setBookmarks] = useState<Record<string, number[]>>(() => {
    try { return JSON.parse(localStorage.getItem('learninghub:bookmarks') || '{}'); } catch { return {}; }
  });
  const [exerciseOutput, setExerciseOutput] = useState<Record<string, any>>({});

  useEffect(() => {
    (async () => {
      try {
        const api = bridge.learningHub;
        const list: Tutorial[] = (await api.listTutorials()) || [];
        setTutorials(list);
        const cats = Array.from(new Set(list.map(t => t.category)));
        setCategories(cats);
        if (!selectedTutorial && list.length) setSelectedTutorial(list[0]);

        const prog = await api.getUserProgress(USER_ID);
        setProgress(prog);
        const ach = await api.listAchievements();
        setAchievements(ach || []);
      } catch (err) {
        console.warn('LearningHub load failed', err);
      }
    })();
  }, []);

  const filtered = useMemo(() => {
    if (!selectedCategory) return tutorials;
    return tutorials.filter(t => t.category === selectedCategory || t.tags.includes(selectedCategory));
  }, [tutorials, selectedCategory]);

  const selectTutorial = (t: Tutorial) => {
    setSelectedTutorial(t);
    setSelectedStepIndex(0);
  };

  const selectStep = (i: number) => {
    setSelectedStepIndex(i);
    // optimistic track progress (send index — main accepts index or stepId)
    const step = selectedTutorial?.steps[i];
    if (step) {
      bridge.learningHub.trackProgress(USER_ID, selectedTutorial.id, i).then(() => {
        setProgress(prev => (prev || { userId: USER_ID, completedTutorials: [], currentTutorials: [], achievements: [], totalPoints: 0, level: 1 }) as UserProgress);
      }).catch(() => {});
    }
  };

  const runExercise = async (step: TutorialStep, submission: any) => {
    try {
      const res = await bridge.learningHub.validateExercise(step.exercise?.id || step.id, submission);
      setExerciseOutput((o: any) => ({ ...o, [step.id]: res }));
      if (res.success) {
        await bridge.learningHub.completeStep(USER_ID, step.id);
        const prog = await bridge.learningHub.getUserProgress(USER_ID);
        setProgress(prog);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const askHint = async (step: TutorialStep) => {
    try {
      const hint = await bridge.learningHub.provideHint(step.exercise?.id || step.id, { attempts: 1 });
      setExerciseOutput((o: any) => ({ ...o, [`hint:${step.id}`]: hint }));
    } catch (err) {
      console.error(err);
    }
  };

  const toggleBookmark = (tutorialId: string, stepIndex?: number) => {
    const bm = { ...bookmarks };
    const arr = bm[tutorialId] || [];
    if (typeof stepIndex === 'number') {
      const idx = arr.indexOf(stepIndex);
      if (idx >= 0) arr.splice(idx, 1); else arr.push(stepIndex);
      bm[tutorialId] = arr;
    } else {
      if (arr.length) delete bm[tutorialId]; else bm[tutorialId] = [];
    }
    setBookmarks(bm);
    localStorage.setItem('learninghub:bookmarks', JSON.stringify(bm));
  };

  const unlockAchievement = async (id: string) => {
    try {
      const ach = await bridge.learningHub.unlockAchievement(USER_ID, id);
      const prog = await bridge.learningHub.getUserProgress(USER_ID);
      setProgress(prog);
      setAchievements((a: any) => Array.from(new Set([...a, ach])));
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="h-full min-h-0 flex gap-6 p-6 bg-[#061010] text-slate-100">
      <div className="w-80 bg-[#071010] border border-slate-800 rounded p-4 overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="text-xs font-semibold uppercase">Categories</div>
            <div className="text-[11px] text-slate-400">Filter tutorials</div>
          </div>
          <div className="text-xs text-slate-400">{tutorials.length} items</div>
        </div>

        <div className="space-y-2">
          <button className={`w-full text-left px-3 py-2 rounded ${!selectedCategory ? 'bg-slate-800/30' : 'hover:bg-slate-800/10'}`} onClick={() => setSelectedCategory(null)}>
            <List className="w-4 h-4 inline mr-2"/> All
          </button>
          {categories.map(c => (
            <button key={c} className={`w-full text-left px-3 py-2 rounded ${selectedCategory === c ? 'bg-slate-800/30' : 'hover:bg-slate-800/10'}`} onClick={() => setSelectedCategory(c)}>
              <span className="capitalize">{c}</span>
            </button>
          ))}
        </div>

        <div className="mt-6">
          <div className="text-xs font-semibold mb-2">Bookmarked</div>
          {Object.keys(bookmarks).length === 0 ? <div className="text-[12px] text-slate-500">No bookmarks</div> : Object.keys(bookmarks).map(tid => {
            const tut = tutorials.find(t => t.id === tid);
            if (!tut) return null;
            return <div key={tid} className="text-sm text-slate-200">• {tut.title}</div>;
          })}
        </div>
      </div>

      <div className="flex-1 bg-[#071313] border border-slate-800 rounded p-6 overflow-y-auto min-h-0">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold">{selectedTutorial?.title || 'Learning Hub'}</h2>
            <div className="text-xs text-slate-400 mt-1">{selectedTutorial?.description}</div>
            <div className="mt-3 text-[12px] text-slate-400">⏱ {selectedTutorial?.duration} min • {selectedTutorial?.difficulty} / 10</div>
          </div>
          <div className="flex items-center gap-2">
            {selectedTutorial && <button onClick={() => toggleBookmark(selectedTutorial.id)} className="px-3 py-1 rounded bg-black/20"> <Bookmark className="inline w-4 h-4 mr-2"/> Bookmark</button>}
            {selectedTutorial && <button onClick={() => unlockAchievement(`complete-${selectedTutorial.id}`)} className="px-3 py-1 rounded bg-yellow-900/10"> <Star className="inline w-4 h-4 mr-2"/> Award</button>}
          </div>
        </div>

        <div className="mt-6 grid grid-cols-3 gap-6">
          <div className="col-span-2 overflow-y-auto max-h-[60vh] pr-4">
            <div className="mb-3 flex items-center gap-2">
              <div className="text-sm font-semibold">Steps</div>
              <div className="text-xs text-slate-400">{selectedTutorial?.steps.length || 0} steps</div>
            </div>

            <div className="space-y-3">
              {(selectedTutorial?.steps || []).map((s, i) => (
                <div key={s.id} className={`p-3 rounded border ${i === selectedStepIndex ? 'border-purple-600 bg-purple-900/5' : 'border-slate-800'}`}>
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="text-sm font-semibold">{i + 1}. {s.title}</div>
                      <div className="text-xs text-slate-400 mt-2">{s.type} • {s.estimatedTime} min</div>
                    </div>
                    <div className="text-xs text-slate-400">{(bookmarks[selectedTutorial?.id || ''] || []).includes(i) ? '★' : ''}</div>
                  </div>

                  <div className="mt-3 text-sm text-slate-200">
                    {s.type === 'video' && s.content ? (
                      <div className="bg-black/60 p-2 rounded">
                        <video controls src={s.content} style={{ width: '100%' }} />
                      </div>
                    ) : (
                      <div dangerouslySetInnerHTML={{ __html: (s.content || '').replace(/\n/g, '<br/>') }} />
                    )}
                  </div>

                  {s.type === 'exercise' && (
                    <div className="mt-3">
                      <div className="text-xs text-slate-400 mb-2">Exercise: {s.exercise?.prompt}</div>
                      <textarea className="w-full p-2 bg-black/10 border border-slate-800 rounded text-sm" rows={4} placeholder="Type your answer..." id={`input-${s.id}`} />
                      <div className="mt-2 flex gap-2">
                        <button onClick={async () => {
                          const el = document.getElementById(`input-${s.id}`) as HTMLTextAreaElement | null;
                          const value = el ? el.value : '';
                          await runExercise(s, { answer: value, correct: value.trim().toLowerCase() === (s.exercise?.solution || '').trim().toLowerCase() });
                        }} className="px-3 py-1 rounded bg-emerald-700/10">Run</button>
                        <button onClick={() => askHint(s)} className="px-3 py-1 rounded bg-black/20">Hint</button>
                        <button onClick={() => toggleBookmark(selectedTutorial!.id, i)} className="px-3 py-1 rounded bg-black/20">Toggle Bookmark</button>
                      </div>

                      <div className="mt-2 text-xs text-slate-300">
                        {exerciseOutput[s.id] && exerciseOutput[s.id].success ? <span className="text-green-400">Success</span> : exerciseOutput[`hint:${s.id}`] ? <span className="text-yellow-300">{exerciseOutput[`hint:${s.id}`].text}</span> : null}
                      </div>
                    </div>
                  )}

                  <div className="mt-3 flex gap-2">
                    <button onClick={() => selectStep(i)} className="px-2 py-1 rounded bg-black/10 text-xs">Go to step</button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="col-span-1">
            <div className="mb-4 p-3 border border-slate-800 rounded bg-black/10">
              <div className="text-xs font-semibold">Progress</div>
              <div className="mt-2 text-sm font-bold">{progress?.totalPoints || 0} pts</div>
              <div className="text-xs text-slate-400">Level {progress?.level || 1}</div>
              <div className="mt-3 text-[12px] text-slate-300">Completed: {(progress?.completedTutorials || []).length}</div>
            </div>

            <div className="mb-4 p-3 border border-slate-800 rounded bg-black/10">
              <div className="text-xs font-semibold">Achievements</div>
              <div className="mt-2 space-y-2">
                {achievements.length === 0 ? <div className="text-xs text-slate-500">No achievements yet</div> : achievements.map(a => (
                  <div key={a.id} className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-slate-900 rounded flex items-center justify-center text-xs">{a.icon ? <img src={a.icon} alt="icon"/> : '🏆'}</div>
                    <div className="text-sm">{a.name} <div className="text-xs text-slate-400">{a.points} pts</div></div>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-3 border border-slate-800 rounded bg-black/10">
              <div className="text-xs font-semibold">Actions</div>
              <div className="mt-2 flex flex-col gap-2">
                <button className="px-3 py-2 bg-green-700/10 rounded text-sm flex items-center gap-2" onClick={() => bridge.learningHub.listTutorials().then((ts:any) => { setTutorials(ts); })}><Activity className="w-4 h-4"/> Refresh</button>
                <button className="px-3 py-2 bg-black/20 rounded text-sm flex items-center gap-2" onClick={() => { if (selectedTutorial) window.open(`#learn?tutorial=${selectedTutorial.id}`, '_self'); }}><Play className="w-4 h-4"/> Start</button>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6">
          <div className="text-xs text-slate-400">Browse Tutorials</div>
          <div className="mt-2 grid grid-cols-3 gap-4">
            {filtered.map(t => (
              <div key={t.id} className="p-3 border border-slate-800 rounded bg-black/10 cursor-pointer" onClick={() => selectTutorial(t)}>
                <div className="text-sm font-semibold">{t.title}</div>
                <div className="text-xs text-slate-400 mt-1">{t.description}</div>
                <div className="mt-2 text-xs text-slate-400">⏱ {t.duration} min • {t.difficulty}/10</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default LearningHub;
