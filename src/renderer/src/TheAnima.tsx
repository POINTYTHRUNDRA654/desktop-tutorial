import React, { useState, useEffect, useRef } from 'react';
import { Flame, BookOpen, TrendingUp, Zap, Target, Brain, Badge, CheckCircle2, Plus, RefreshCw, Lock, Globe, Shield, Layers, HardDrive, Network, Award, FileText } from 'lucide-react';

interface Lesson {
    id: string;
    date: string;
    topic: string;
    discipline: 'blender' | 'papyrus' | 'xedit' | 'settlement' | 'crash-analysis' | 'lore' | 'general';
    key_learnings: string[];
    mastery_level: number; // 0-100
}

interface Discipline {
    name: string;
    icon: React.FC<any>;
    mastery: number;
    lessons_completed: number;
    description: string;
    key_topics: string[];
}

const TheAnima: React.FC = () => {
    const [disciplines, setDisciplines] = useState<Discipline[]>([
        {
            name: '3D Modeling (Blender)',
            icon: Globe,
            mastery: 65,
            lessons_completed: 12,
            description: 'Mesh creation, UV mapping, rigging, and optimization for Fallout 4',
            key_topics: ['Mesh topology', 'UV unwrapping', 'Weight painting', 'Collision meshes', 'LOD systems'],
        },
        {
            name: 'Papyrus Scripting',
            icon: FileText,
            mastery: 78,
            lessons_completed: 18,
            description: 'F4SE-enhanced Papyrus programming, events, quests, and NPC behavior',
            key_topics: ['Event handling', 'Quest stages', 'NPC dialogue', 'FormID management', 'F4SE functions'],
        },
        {
            name: 'xEdit Patching',
            icon: Target,
            mastery: 72,
            lessons_completed: 15,
            description: 'Advanced record editing, conflict resolution, and mod compatibility',
            key_topics: ['Record conflicts', 'Reference patching', 'NPC leveling', 'Script patching', 'FormID swaps'],
        },
        {
            name: 'Settlement Design',
            icon: Award,
            mastery: 58,
            lessons_completed: 8,
            description: 'Building plots, resource planning, defensive structures, city layouts',
            key_topics: ['Zone planning', 'Resource balance', 'Defense perimeters', 'Population management', 'Aesthetics'],
        },
        {
            name: 'Crash Analysis & Debugging',
            icon: Zap,
            mastery: 81,
            lessons_completed: 16,
            description: 'Crash log interpretation, plugin conflict detection, performance optimization',
            key_topics: ['Stack trace parsing', 'Plugin culprits', 'Memory issues', 'Null pointer bugs', 'Form conflicts'],
        },
        {
            name: 'Lore & Worldbuilding',
            icon: BookOpen,
            mastery: 54,
            lessons_completed: 7,
            description: 'Fallout 4 lore consistency, quest design, environmental storytelling',
            key_topics: ['Lore integrity', 'Quest structure', 'Location design', 'Dialogue writing', 'Faction dynamics'],
        },
    ]);

    const [lessons, setLessons] = useState<Lesson[]>([
        { id: '1', date: 'Jan 12', topic: 'Settlement resource balance mechanics', discipline: 'settlement', key_learnings: ['Power generation vs consumption', 'Food/water ratios for population', 'Defense scaling'], mastery_level: 75 },
        { id: '2', date: 'Jan 11', topic: 'Crash log stack trace analysis', discipline: 'crash-analysis', key_learnings: ['EXCEPTION_ACCESS_VIOLATION detection', 'Identifying null register values', 'Plugin culprit extraction'], mastery_level: 88 },
        { id: '3', date: 'Jan 10', topic: 'Papyrus event flow in quests', discipline: 'papyrus', key_learnings: ['Event registration', 'Quest stage callbacks', 'F4SE event hooks'], mastery_level: 82 },
        { id: '4', date: 'Jan 9', topic: 'xEdit conflict resolution', discipline: 'xedit', key_learnings: ['ITM detection', 'Reference patching', 'Navmesh conflicts'], mastery_level: 76 },
        { id: '5', date: 'Jan 8', topic: 'Blender UV unwrapping best practices', discipline: 'blender', key_learnings: ['Seam placement', 'Texture density', 'High-poly to low-poly workflow'], mastery_level: 71 },
    ]);

    const [selectedDiscipline, setSelectedDiscipline] = useState<string>('papyrus');
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const animationFrameRef = useRef<number>(0);

    const overallMastery = Math.round(disciplines.reduce((sum, d) => sum + d.mastery, 0) / disciplines.length);
    const totalLessonsLearned = lessons.length;

    // --- Expertise Visualization ---
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let time = 0;
        const particles: { x: number; y: number; size: number; vx: number; vy: number; color: string }[] = [];
        
        for(let i=0; i<40; i++) {
            particles.push({
                x: canvas.width/2,
                y: canvas.height/2,
                size: Math.random() * 2.5 + 0.5,
                vx: (Math.random() - 0.5) * 1.5,
                vy: (Math.random() - 0.5) * 1.5,
                color: `hsl(${Math.random() * 30 + 30}, 100%, 50%)` // Orange/amber - knowledge colors
            });
        }

        const render = () => {
            if (!ctx || !canvas) return;
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            
            // Central Knowledge Glow
            const gradient = ctx.createRadialGradient(canvas.width/2, canvas.height/2, 10, canvas.width/2, canvas.height/2, 120);
            gradient.addColorStop(0, 'rgba(251, 146, 60, 0.6)'); // Orange accent
            gradient.addColorStop(1, 'rgba(251, 146, 60, 0)');
            
            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.arc(canvas.width/2, canvas.height/2, 120, 0, Math.PI * 2);
            ctx.fill();

            // Knowledge Particles
            particles.forEach(p => {
                p.x += p.vx;
                p.y += p.vy;
                
                const dx = canvas.width/2 - p.x;
                const dy = canvas.height/2 - p.y;
                p.vx += dx * 0.004;
                p.vy += dy * 0.004;
                p.vx += (Math.random() - 0.5) * 0.15;
                p.vy += (Math.random() - 0.5) * 0.15;

                ctx.fillStyle = p.color;
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                ctx.fill();
            });

            // Expertise Rings
            ctx.strokeStyle = 'rgba(251, 146, 60, 0.2)';
            ctx.lineWidth = 1;
            for (let ring = 1; ring <= 3; ring++) {
                ctx.beginPath();
                ctx.arc(canvas.width/2, canvas.height/2, 40 * ring, 0, Math.PI * 2);
                ctx.stroke();
            }

            time += 0.015;
            animationFrameRef.current = requestAnimationFrame(render);
        };

        render();
        return () => cancelAnimationFrame(animationFrameRef.current);
    }, []);

    return (
        <div className="h-full flex flex-col bg-[#050505] text-slate-200 font-sans overflow-hidden relative">
            
            {/* Ambient Background */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-orange-900/10 via-black to-black pointer-events-none"></div>

            {/* Header */}
            <div className="p-6 border-b border-slate-800 bg-slate-900/50 backdrop-blur z-10 flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-white flex items-center gap-3">
                        <Flame className="w-6 h-6 text-orange-500 animate-pulse" />
                        The Anima
                    </h1>
                    <p className="text-xs text-slate-400 font-mono mt-1">Mossy's Advanced Fallout 4 Modding Knowledge Core</p>
                </div>
                <div className="flex items-center gap-6">
                    <div className="text-right">
                        <div className="text-xs font-bold text-slate-500 uppercase">Overall Mastery</div>
                        <div className="text-orange-400 font-mono text-3xl">{overallMastery}%</div>
                        <div className="text-[10px] text-slate-500 mt-1">{totalLessonsLearned} lessons learned</div>
                    </div>
                </div>
            </div>

            <div className="flex-1 flex overflow-hidden relative z-10">
                
                {/* Left: Knowledge Visualization */}
                <div className="flex-1 relative flex flex-col items-center justify-center">
                    <div className="relative w-full h-full max-w-2xl max-h-[600px] flex flex-col items-center justify-center">
                        <canvas ref={canvasRef} width={500} height={500} className="w-full h-full object-contain max-w-md max-h-md" />
                        
                        {/* Expertise Status */}
                        <div className="absolute top-10 left-10 bg-black/40 backdrop-blur border border-slate-700/50 p-4 rounded-xl animate-float">
                            <div className="text-xs text-slate-500 uppercase font-bold mb-1 flex items-center gap-2">
                                <Brain className="w-3 h-3 text-orange-400" /> Knowledge State
                            </div>
                            <div className="text-lg font-serif text-white">Advanced Practitioner</div>
                            <div className="text-[10px] text-slate-400 mt-1">6 disciplines mastered</div>
                        </div>

                        {/* Teaching Summary */}
                        <div className="absolute bottom-10 left-10 max-w-xs bg-black/40 backdrop-blur border border-slate-700/50 p-4 rounded-xl animate-float-delayed">
                            <div className="text-xs text-slate-500 uppercase font-bold mb-2 flex items-center gap-2">
                                <BookOpen className="w-3 h-3" /> Teaching Summary
                            </div>
                            <p className="text-sm text-slate-300 leading-relaxed">
                                Mossy has provided comprehensive instruction across Blender modeling, Papyrus scripting, xEdit patching, settlement design, crash analysis, and Fallout 4 lore. Your understanding progresses from fundamentals to advanced optimization.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Right: Discipline Mastery Matrix */}
                <div className="w-96 bg-slate-900 border-l border-slate-800 flex flex-col overflow-hidden">
                    
                    {/* Discipline Selector */}
                    <div className="p-4 border-b border-slate-800 bg-slate-900/50 overflow-y-auto max-h-96">
                        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                            <Award className="w-4 h-4" /> Modding Disciplines
                        </h3>
                        <div className="space-y-2">
                            {disciplines.map(disc => (
                                <button
                                    key={disc.name}
                                    onClick={() => setSelectedDiscipline(disc.name)}
                                    className={`w-full text-left p-3 rounded-lg border transition-all ${
                                        selectedDiscipline === disc.name
                                            ? 'bg-orange-900/30 border-orange-500/50'
                                            : 'bg-slate-800/30 border-slate-700/30 hover:bg-slate-800/50'
                                    }`}
                                >
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-xs font-bold text-white">{disc.name}</span>
                                        <span className="text-xs font-mono text-orange-400">{disc.mastery}%</span>
                                    </div>
                                    <div className="w-full h-1 bg-slate-700 rounded-full overflow-hidden">
                                        <div 
                                            className="h-full bg-gradient-to-r from-orange-500 to-yellow-500" 
                                            style={{ width: `${disc.mastery}%` }}
                                        ></div>
                                    </div>
                                    <div className="text-[10px] text-slate-400 mt-1">{disc.lessons_completed} lessons</div>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Selected Discipline Details */}
                    {selectedDiscipline && disciplines.find(d => d.name === selectedDiscipline) && (
                        <div className="flex-1 overflow-y-auto p-4 bg-slate-950">
                            {disciplines.find(d => d.name === selectedDiscipline) && (
                                <div>
                                    <p className="text-xs text-slate-400 mb-4 leading-relaxed">
                                        {disciplines.find(d => d.name === selectedDiscipline)?.description}
                                    </p>
                                    <h4 className="text-xs font-bold text-slate-500 uppercase mb-2">Key Topics</h4>
                                    <div className="space-y-2 mb-4">
                                        {disciplines.find(d => d.name === selectedDiscipline)?.key_topics.map(topic => (
                                            <div key={topic} className="flex items-start gap-2 text-xs">
                                                <CheckCircle2 className="w-3 h-3 text-emerald-500 mt-0.5 flex-shrink-0" />
                                                <span className="text-slate-300">{topic}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Recent Lessons */}
                    <div className="p-4 border-t border-slate-800 bg-slate-900/50 max-h-56 overflow-y-auto">
                        <h4 className="text-xs font-bold text-slate-500 uppercase mb-3 flex items-center gap-2">
                            <Layers className="w-4 h-4" /> Recent Lessons
                        </h4>
                        <div className="space-y-2">
                            {lessons.slice(0, 4).map(lesson => (
                                <div key={lesson.id} className="bg-slate-800/40 border border-slate-700/40 rounded p-2">
                                    <div className="flex justify-between items-start mb-1">
                                        <span className="text-xs font-bold text-slate-200">{lesson.topic}</span>
                                        <span className="text-[9px] text-slate-500">{lesson.date}</span>
                                    </div>
                                    <div className="text-[10px] text-orange-400">{lesson.mastery_level}% mastery</div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TheAnima;