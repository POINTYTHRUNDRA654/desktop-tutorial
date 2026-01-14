import React, { useState, useEffect } from 'react';
import { Trophy, Star, Target, Zap, BookOpen, Clock, CheckCircle2 } from 'lucide-react';

interface Achievement {
    id: string;
    title: string;
    desc: string;
    unlocked: boolean;
    category: 'scripting' | 'world-design' | 'modeling' | 'foundation';
}

const ModdingJourney: React.FC = () => {
    const [achievements, setAchievements] = useState<Achievement[]>([
        { id: '1', title: 'Neural Link Active', desc: 'Sync Mossy with your desktop processes.', unlocked: false, category: 'foundation' },
        { id: '2', title: 'The First Scan', desc: 'Complete a hardware and software environment audit.', unlocked: false, category: 'foundation' },
        { id: '3', title: 'Script Initiate', desc: 'Compile your first Papyrus script via The Hive.', unlocked: false, category: 'scripting' },
        { id: '4', title: 'Mesh Master', desc: 'Optimize a 3D model using the 1.0 Metric Scale protocol.', unlocked: false, category: 'modeling' },
        { id: '5', title: 'Nexus Scholar', desc: 'Add 5 custom tutorials to the Mossy Memory Vault.', unlocked: false, category: 'foundation' }
    ]);

    useEffect(() => {
        // Sync with LocalAIEngine's recordAction history (Simulated for this demo)
        const history = JSON.parse(localStorage.getItem('mossy_ml_history') || '[]');
        const profile = localStorage.getItem('mossy_system_profile');
        const vault = localStorage.getItem('mossy_knowledge_vault');

        setAchievements(prev => prev.map(ach => {
            if (ach.id === '1' && history.some((h: any) => h.action === 'neural_link')) return { ...ach, unlocked: true };
            if (ach.id === '2' && profile) return { ...ach, unlocked: true };
            if (ach.id === '5' && vault && JSON.parse(vault).length >= 5) return { ...ach, unlocked: true };
            return ach;
        }));
    }, []);

    const unlockedCount = achievements.filter(a => a.unlocked).length;
    const progress = (unlockedCount / achievements.length) * 100;

    return (
        <div className="p-8 bg-[#0a0a0c] min-h-full text-slate-200">
            <div className="max-w-4xl mx-auto">
                <header className="mb-10">
                    <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                        <Trophy className="w-8 h-8 text-yellow-500" />
                        Modding Journey
                    </h1>
                    <p className="text-slate-400 mt-2">Track your progress from beginner to master modder.</p>
                </header>

                {/* Progress Bar */}
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 mb-8 relative overflow-hidden">
                    <div className="flex justify-between items-end mb-4">
                        <div>
                            <span className="text-sm font-bold text-blue-400 uppercase tracking-widest">Level 1: Novice Scavver</span>
                            <div className="text-2xl font-bold text-white mt-1">{Math.floor(progress)}% Complete</div>
                        </div>
                        <div className="text-right">
                            <span className="text-xs text-slate-500">Next Level: Vault Dweller</span>
                        </div>
                    </div>
                    <div className="h-3 w-full bg-slate-800 rounded-full overflow-hidden">
                        <div 
                            className="h-full bg-gradient-to-r from-blue-600 to-blue-400 transition-all duration-1000" 
                            style={{ width: `${progress}%` }}
                        />
                    </div>
                </div>

                {/* Achievement Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {achievements.map((ach) => (
                        <div 
                            key={ach.id}
                            className={`p-5 rounded-lg border-2 flex gap-4 transition-all ${
                                ach.unlocked 
                                ? 'bg-blue-900/10 border-blue-500/30' 
                                : 'bg-slate-900/40 border-slate-800 opacity-60'
                            }`}
                        >
                            <div className={`p-3 rounded-lg ${ach.unlocked ? 'bg-blue-500/20' : 'bg-slate-800'}`}>
                                {ach.unlocked ? <CheckCircle2 className="w-6 h-6 text-blue-400" /> : <Clock className="w-6 h-6 text-slate-600" />}
                            </div>
                            <div>
                                <h3 className={`font-bold ${ach.unlocked ? 'text-white' : 'text-slate-500'}`}>{ach.title}</h3>
                                <p className="text-xs text-slate-400 mt-1">{ach.desc}</p>
                                <span className={`text-[10px] uppercase font-bold mt-2 inline-block ${
                                    ach.category === 'scripting' ? 'text-purple-400' :
                                    ach.category === 'modeling' ? 'text-emerald-400' :
                                    'text-blue-400'
                                }`}>
                                    {ach.category}
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default ModdingJourney;
