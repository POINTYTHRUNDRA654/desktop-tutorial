import React, { useState } from 'react';
import { GoogleGenAI } from "@google/genai";
import { FileDigit, AlertTriangle, GitMerge, Microscope, Check, ShieldAlert, ArrowRight, Save, Database, Layers } from 'lucide-react';

interface Plugin {
    id: string;
    name: string;
    index: string; // 00, 01, etc.
    type: 'esm' | 'esp' | 'esl';
    author: string;
}

interface Record {
    id: string;
    formId: string;
    editorId: string;
    type: string; // WEAP, ARMO, NPC_
    conflictStatus: 'clean' | 'override' | 'conflict' | 'critical';
}

interface DataField {
    key: string;
    masterValue: string;
    overrideValue: string;
    isConflict: boolean;
}

const TheRegistry: React.FC = () => {
    const [plugins, setPlugins] = useState<Plugin[]>([
        { id: '0', name: 'Fallout4.esm', index: '00', type: 'esm', author: 'Bethesda' },
        { id: '1', name: 'DLCRobot.esm', index: '01', type: 'esm', author: 'Bethesda' },
        { id: '2', name: 'Unofficial Fallout 4 Patch.esp', index: '02', type: 'esp', author: 'Arthmoor' },
        { id: '3', name: 'ArmorKeywords.esm', index: '03', type: 'esm', author: 'Valdacil' },
        { id: '4', name: 'BetterMod.esp', index: '04', type: 'esp', author: 'User' },
    ]);

    const [records, setRecords] = useState<Record[]>([
        { id: 'r1', formId: '0001F66B', editorId: 'Minigun', type: 'WEAP', conflictStatus: 'clean' },
        { id: 'r2', formId: '0004B234', editorId: 'CombatRifle', type: 'WEAP', conflictStatus: 'conflict' },
        { id: 'r3', formId: '00129A88', editorId: 'PowerArmorT60', type: 'ARMO', conflictStatus: 'override' },
        { id: 'r4', formId: '000D83BF', editorId: 'Stimpack', type: 'ALCH', conflictStatus: 'critical' },
    ]);

    const [selectedRecord, setSelectedRecord] = useState<Record | null>(null);
    const [recordData, setRecordData] = useState<DataField[]>([]);
    const [analysis, setAnalysis] = useState<string | null>(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);

    // Mock data population
    const handleSelectRecord = (rec: Record) => {
        setSelectedRecord(rec);
        setAnalysis(null);
        
        // Simulate xEdit comparison view
        const mockFields: DataField[] = [
            { key: 'FULL - Name', masterValue: rec.editorId, overrideValue: rec.editorId + " [Mk II]", isConflict: true },
            { key: 'DATA - Damage', masterValue: '32', overrideValue: '45', isConflict: true },
            { key: 'DATA - Weight', masterValue: '12.5', overrideValue: '10.0', isConflict: true },
            { key: 'DESC - Description', masterValue: 'Standard issue rifle.', overrideValue: 'Modified for superior stopping power.', isConflict: true },
            { key: 'KYWD - Keywords', masterValue: 'WeaponTypeRifle', overrideValue: 'WeaponTypeRifle', isConflict: false },
        ];
        
        // If clean, values match
        if (rec.conflictStatus === 'clean') {
            mockFields.forEach(f => {
                f.overrideValue = f.masterValue;
                f.isConflict = false;
            });
        }

        setRecordData(mockFields);
    };

    const analyzeConflict = async () => {
        if (!selectedRecord) return;
        setIsAnalyzing(true);

        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            
            // Build a prompt that describes the conflict
            const conflictDesc = recordData.filter(f => f.isConflict).map(f => `${f.key}: Master="${f.masterValue}" vs Plugin="${f.overrideValue}"`).join('\n');
            
            const prompt = `
            Act as an expert Fallout 4 modder using xEdit.
            Analyze this record conflict for '${selectedRecord.editorId}' (${selectedRecord.type}).
            
            Conflicts:
            ${conflictDesc}
            
            1. Is this a dangerous conflict? (Critical/Warning/Safe)
            2. Explain what the change does to gameplay.
            3. Should the user keep the override?
            `;

            const response = await ai.models.generateContent({
                model: 'gemini-3-flash-preview',
                contents: prompt,
            });

            setAnalysis(response.text);

        } catch (e) {
            console.error(e);
            setAnalysis("Neural link failure. Cannot analyze conflict.");
        } finally {
            setIsAnalyzing(false);
        }
    };

    return (
        <div className="h-full flex flex-col bg-[#1e1e1e] text-slate-200 font-sans text-sm">
            {/* Header */}
            <div className="p-4 border-b border-black bg-[#2d2d2d] flex justify-between items-center shadow-md">
                <div>
                    <h2 className="text-lg font-bold text-white flex items-center gap-2">
                        <FileDigit className="w-5 h-5 text-orange-400" />
                        The Registry
                    </h2>
                    <p className="text-[10px] text-slate-400 font-mono mt-0.5">FO4Edit Neural Interface v4.0.4</p>
                </div>
                <div className="flex gap-2">
                    <div className="px-3 py-1 bg-black rounded border border-slate-600 font-mono text-xs text-green-400">
                        Plugins: {plugins.length}
                    </div>
                    <div className="px-3 py-1 bg-black rounded border border-slate-600 font-mono text-xs text-blue-400">
                        Records: 14,203
                    </div>
                </div>
            </div>

            <div className="flex-1 flex overflow-hidden">
                
                {/* Left: Load Order */}
                <div className="w-64 bg-[#252526] border-r border-black flex flex-col">
                    <div className="p-2 bg-[#333333] border-b border-black text-[10px] font-bold text-slate-300 uppercase tracking-wider">
                        Load Order
                    </div>
                    <div className="flex-1 overflow-y-auto p-2 space-y-1">
                        {plugins.map(plugin => (
                            <div key={plugin.id} className="flex items-center gap-2 px-2 py-1 hover:bg-[#3e3e42] rounded cursor-pointer group">
                                <span className="font-mono text-[10px] text-slate-500 w-6">{plugin.index}</span>
                                <span className={`text-xs truncate ${plugin.type === 'esm' ? 'text-blue-300 font-bold' : 'text-slate-300'}`}>
                                    {plugin.name}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Middle: Records */}
                <div className="w-72 bg-[#1e1e1e] border-r border-black flex flex-col">
                    <div className="p-2 bg-[#333333] border-b border-black text-[10px] font-bold text-slate-300 uppercase tracking-wider">
                        Object Window
                    </div>
                    <div className="flex-1 overflow-y-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="text-[10px] text-slate-500 bg-[#252526]">
                                    <th className="p-1 pl-2 font-normal">FormID</th>
                                    <th className="p-1 font-normal">EditorID</th>
                                </tr>
                            </thead>
                            <tbody>
                                {records.map(rec => (
                                    <tr 
                                        key={rec.id} 
                                        onClick={() => handleSelectRecord(rec)}
                                        className={`hover:bg-[#2a2d3e] cursor-pointer border-b border-[#2a2a2a] ${selectedRecord?.id === rec.id ? 'bg-[#094771] text-white' : ''}`}
                                    >
                                        <td className="p-1 pl-2 font-mono text-[10px] text-orange-300">{rec.formId}</td>
                                        <td className={`p-1 text-xs flex items-center gap-2 ${
                                            rec.conflictStatus === 'conflict' ? 'text-red-400' : 
                                            rec.conflictStatus === 'override' ? 'text-yellow-400' : 
                                            rec.conflictStatus === 'critical' ? 'text-red-600 font-bold' : 'text-slate-300'
                                        }`}>
                                            {rec.editorId}
                                            {rec.conflictStatus !== 'clean' && <AlertTriangle className="w-3 h-3 ml-auto" />}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Right: Detail & Conflict View */}
                <div className="flex-1 bg-[#1e1e1e] flex flex-col min-w-0">
                    <div className="p-2 bg-[#333333] border-b border-black flex justify-between items-center">
                        <span className="text-[10px] font-bold text-slate-300 uppercase tracking-wider">
                            Record View: {selectedRecord ? selectedRecord.editorId : 'None'}
                        </span>
                        {selectedRecord && selectedRecord.conflictStatus !== 'clean' && (
                            <button 
                                onClick={analyzeConflict}
                                disabled={isAnalyzing}
                                className="flex items-center gap-1 px-3 py-1 bg-purple-700 hover:bg-purple-600 text-white rounded text-xs transition-colors shadow-sm"
                            >
                                <Microscope className="w-3 h-3" />
                                {isAnalyzing ? 'Analyzing...' : 'Neural Analysis'}
                            </button>
                        )}
                    </div>

                    {selectedRecord ? (
                        <div className="flex-1 overflow-y-auto p-6">
                            {/* Comparison Table */}
                            <div className="bg-black border border-slate-700 rounded mb-6 overflow-hidden">
                                <div className="grid grid-cols-3 bg-[#252526] border-b border-slate-700 text-xs font-bold text-slate-400 p-2">
                                    <div>Field</div>
                                    <div className="flex items-center gap-2 text-blue-400"><Database className="w-3 h-3" /> Master (Fallout4.esm)</div>
                                    <div className="flex items-center gap-2 text-orange-400"><Layers className="w-3 h-3" /> Override (BetterMod.esp)</div>
                                </div>
                                {recordData.map((field, i) => (
                                    <div key={i} className={`grid grid-cols-3 text-xs p-2 border-b border-slate-800 ${field.isConflict ? 'bg-red-900/10' : ''}`}>
                                        <div className="text-slate-500 font-mono">{field.key}</div>
                                        <div className="text-slate-400 pl-2 border-l border-slate-800">{field.masterValue}</div>
                                        <div className={`pl-2 border-l border-slate-800 ${field.isConflict ? 'text-red-300 font-bold' : 'text-slate-300'}`}>
                                            {field.overrideValue}
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Analysis Result */}
                            {analysis && (
                                <div className="bg-slate-800 border border-purple-500/50 rounded-lg p-4 animate-fade-in shadow-lg">
                                    <div className="flex items-center gap-2 text-purple-400 font-bold mb-2">
                                        <ShieldAlert className="w-4 h-4" /> Insight Engine
                                    </div>
                                    <div className="text-slate-300 leading-relaxed whitespace-pre-line">
                                        {analysis}
                                    </div>
                                    <div className="mt-4 flex gap-2">
                                        <button className="px-3 py-1.5 bg-green-700 hover:bg-green-600 text-white rounded text-xs flex items-center gap-2">
                                            <Check className="w-3 h-3" /> Accept Override
                                        </button>
                                        <button className="px-3 py-1.5 bg-red-700 hover:bg-red-600 text-white rounded text-xs flex items-center gap-2">
                                            <AlertTriangle className="w-3 h-3" /> Revert to Master
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center text-slate-600">
                            <GitMerge className="w-16 h-16 mb-4 opacity-20" />
                            <p>Select a record to inspect conflicts.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default TheRegistry;