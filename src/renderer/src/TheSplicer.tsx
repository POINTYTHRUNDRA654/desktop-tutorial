import { useState } from 'react';
import { AlertTriangle, AlertCircle, Eye, Copy, CheckCircle2 } from 'lucide-react';

interface AssetIssue {
    id: string;
    title: string;
    category: 'Geometry' | 'Texture' | 'Material' | 'Physics';
    severity: 'error' | 'warning' | 'info';
    description: string;
    solution: string;
    tools: string[];
}

interface ValidatorReport {
    fileName: string;
    timestamp: string;
    issueType: string;
    totalChecks: number;
    passCount: number;
    issues: AssetIssue[];
}

const COMMON_ISSUES: Record<string, AssetIssue> = {
    'duplicate_vertices': {
        id: 'duplicate_vertices',
        title: 'Duplicate Vertices Detected',
        category: 'Geometry',
        severity: 'error',
        description: 'The mesh contains vertices at identical coordinates. This increases polygon count without visual benefit.',
        solution: 'Use xEdit\'s "Remove Duplicate Vertices" or Blender\'s Mesh > Cleanup > Merge by Distance.',
        tools: ['xEdit', 'Blender', 'Outfit Studio']
    },
    'degenerate_triangles': {
        id: 'degenerate_triangles',
        title: 'Degenerate Triangles',
        category: 'Geometry',
        severity: 'error',
        description: 'Found triangles with zero area or where all vertices are collinear. These waste geometry and cause rendering issues.',
        solution: 'Delete degenerate triangles in Blender using Mesh > Cleanup or select and delete.',
        tools: ['Blender', 'Meshlab', 'xEdit']
    },
    'inverted_normals': {
        id: 'inverted_normals',
        title: 'Inverted Face Normals',
        category: 'Geometry',
        severity: 'error',
        description: 'Some face normals point inward instead of outward. This causes incorrect lighting and visibility culling.',
        solution: 'In Blender: Select All > Mesh > Normals > Recalculate Outside.',
        tools: ['Blender', 'Meshlab']
    },
    'missing_normals': {
        id: 'missing_normals',
        title: 'Missing Vertex Normals',
        category: 'Geometry',
        severity: 'error',
        description: 'The mesh has no vertex normals defined. Lighting will be flat or incorrect.',
        solution: 'Blender: Select All > Mesh > Normals > Recalculate Outside, then Shade Smooth.',
        tools: ['Blender', 'Meshlab']
    },
    'bad_uvs': {
        id: 'bad_uvs',
        title: 'Invalid UV Mapping',
        category: 'Texture',
        severity: 'warning',
        description: 'UV coordinates are outside 0-1 range, overlapping, or inverted. Textures will display incorrectly.',
        solution: 'In Blender: UV Editing > Select All > UV > Pack Islands or Unwrap > Smart UV Project.',
        tools: ['Blender', 'Substance Painter']
    },
    'extreme_scale': {
        id: 'extreme_scale',
        title: 'Extreme Geometry Scale',
        category: 'Geometry',
        severity: 'warning',
        description: 'Geometry has very large or very small vertices. This can cause floating-point precision errors.',
        solution: 'In Blender: Select All > Scale to ~100 units for regular objects. Use Ctrl+A to Apply Scale.',
        tools: ['Blender']
    },
    'too_many_bones': {
        id: 'too_many_bones',
        title: 'Excessive Bone Weights',
        category: 'Geometry',
        severity: 'warning',
        description: 'Vertices are influenced by too many bones (>4 is problematic). This impacts performance.',
        solution: 'Use Blender\'s Armature > Limit Bones per Vertex, or remove low-influence bones.',
        tools: ['Blender', 'Outfit Studio']
    },
    'physics_mismatch': {
        id: 'physics_mismatch',
        title: 'Physics Collider Mismatch',
        category: 'Physics',
        severity: 'error',
        description: 'Havok physics shape doesn\'t match visual geometry. Actor may clip through objects.',
        solution: 'Regenerate physics in Outfit Studio or xEdit\'s Havok Data Extractor.',
        tools: ['xEdit', 'Outfit Studio']
    },
    'missing_normal_map': {
        id: 'missing_normal_map',
        title: 'Missing Normal Map',
        category: 'Texture',
        severity: 'warning',
        description: 'Material references a normal map that doesn\'t exist in the file system.',
        solution: 'Create normal map in Substance 3D Painter or Blender, or remove the material reference.',
        tools: ['Substance 3D Painter', 'Blender']
    },
    'resolution_mismatch': {
        id: 'resolution_mismatch',
        title: 'Texture Resolution Mismatch',
        category: 'Texture',
        severity: 'warning',
        description: 'Texture dimensions are not powers of 2 (e.g., 1024x1024) or differ significantly between maps.',
        solution: 'Resize textures in an image editor to 1024x1024, 2048x2048, or 4096x4096 (power of 2).',
        tools: ['Photoshop', 'GIMP', 'Paint.NET']
    },
    'bad_compression': {
        id: 'bad_compression',
        title: 'Improper Texture Compression',
        category: 'Texture',
        severity: 'info',
        description: 'Textures use inefficient or incorrect compression formats. May impact performance.',
        solution: 'Convert to DXT1 (opaque) or DXT5 (transparency) using xEdit\'s DDS export.',
        tools: ['xEdit', 'NVIDIA Texture Tools']
    },
    'alpha_channel_issue': {
        id: 'alpha_channel_issue',
        title: 'Problematic Alpha Channel',
        category: 'Texture',
        severity: 'warning',
        description: 'Alpha channel is present but not needed, or vice versa. Wastes memory or causes visibility issues.',
        solution: 'Remove or add alpha in image editor. Use DXT1 without alpha, DXT5 with alpha.',
        tools: ['Photoshop', 'GIMP']
    },
    'missing_material': {
        id: 'missing_material',
        title: 'Missing Material Assignment',
        category: 'Material',
        severity: 'error',
        description: 'Geometry has no material assigned. Will appear black or white in-game.',
        solution: 'In Blender: Shader Editor > Add material. Or export and assign in Outfit Studio.',
        tools: ['Blender', 'Outfit Studio']
    },
    'deprecated_shader': {
        id: 'deprecated_shader',
        title: 'Deprecated Shader Type',
        category: 'Material',
        severity: 'warning',
        description: 'Uses old shader (BS_Default) instead of modern PBR shaders. Will look dated.',
        solution: 'Update to MLO_SkinShader, BS_LegacyShader, or other current shaders in xEdit.',
        tools: ['xEdit']
    }
};

const SAMPLE_REPORTS: ValidatorReport[] = [
    {
        fileName: 'armor_chest_female.nif',
        timestamp: '2024-01-15 14:32:05',
        issueType: 'Outfit/Armor',
        totalChecks: 24,
        passCount: 19,
        issues: [
            COMMON_ISSUES['inverted_normals'],
            COMMON_ISSUES['bad_uvs'],
            COMMON_ISSUES['missing_normal_map'],
            COMMON_ISSUES['too_many_bones'],
        ]
    },
    {
        fileName: 'sword_daedric.nif',
        timestamp: '2024-01-15 13:12:47',
        issueType: 'Weapon',
        totalChecks: 18,
        passCount: 17,
        issues: [
            COMMON_ISSUES['physics_mismatch'],
        ]
    },
    {
        fileName: 'building_door_01.nif',
        timestamp: '2024-01-15 11:45:22',
        issueType: 'Architecture',
        totalChecks: 30,
        passCount: 25,
        issues: [
            COMMON_ISSUES['duplicate_vertices'],
            COMMON_ISSUES['extreme_scale'],
            COMMON_ISSUES['missing_material'],
            COMMON_ISSUES['resolution_mismatch'],
            COMMON_ISSUES['alpha_channel_issue'],
        ]
    }
];

const TheSplicer = () => {
    const [reports] = useState<ValidatorReport[]>(SAMPLE_REPORTS);
    const [selectedReport, setSelectedReport] = useState<ValidatorReport | null>(SAMPLE_REPORTS[0]);
    const [copiedId, setCopiedId] = useState<string | null>(null);

    const handleCopySolution = (issueId: string) => {
        const issue = selectedReport?.issues.find(i => i.id === issueId);
        if (issue) {
            navigator.clipboard.writeText(issue.solution);
            setCopiedId(issueId);
            setTimeout(() => setCopiedId(null), 2000);
        }
    };

    return (
        <div className="h-full flex flex-col bg-[#1e1e1e] text-slate-200 font-sans overflow-hidden">
            {/* Header */}
            <div className="p-4 border-b border-black bg-[#2d2d2d] flex justify-between items-center shadow-md">
                <div>
                    <h2 className="text-lg font-bold text-white flex items-center gap-2">
                        <AlertTriangle className="w-5 h-5 text-red-400" />
                        The Splicer
                    </h2>
                    <p className="text-[10px] text-slate-400 font-mono mt-0.5">Asset Validator v2.0.0</p>
                </div>
                <div className="flex gap-2">
                    <div className="px-3 py-1 bg-black rounded border border-slate-600 font-mono text-xs text-red-400">
                        Reports: {reports.length}
                    </div>
                </div>
            </div>

            <div className="flex-1 flex overflow-hidden">
                {/* Left: Report List */}
                <div className="w-72 bg-[#252526] border-r border-black flex flex-col">
                    <div className="p-3 border-b border-black text-[10px] font-bold text-slate-300 uppercase tracking-wider bg-[#333333]">
                        Validation Reports
                    </div>
                    <div className="flex-1 overflow-y-auto">
                        {reports.map((report) => {
                            const errorCount = report.issues.filter(i => i.severity === 'error').length;
                            const warningCount = report.issues.filter(i => i.severity === 'warning').length;
                            return (
                                <div
                                    key={report.fileName}
                                    onClick={() => setSelectedReport(report)}
                                    className={`p-3 border-b border-slate-800 cursor-pointer transition-colors ${
                                        selectedReport?.fileName === report.fileName
                                            ? 'bg-red-900/30 border-l-4 border-l-red-400'
                                            : 'hover:bg-[#2d2d30]'
                                    }`}
                                >
                                    <div className="font-semibold text-slate-200 text-sm truncate">{report.fileName}</div>
                                    <div className="text-[10px] text-slate-500 mt-1">{report.timestamp}</div>
                                    <div className="flex items-center gap-2 mt-2">
                                        {errorCount > 0 && (
                                            <span className="px-2 py-0.5 bg-red-900/40 text-red-300 text-[9px] font-bold rounded flex items-center gap-1">
                                                <AlertTriangle className="w-3 h-3" /> {errorCount} Errors
                                            </span>
                                        )}
                                        {warningCount > 0 && (
                                            <span className="px-2 py-0.5 bg-yellow-900/40 text-yellow-300 text-[9px] font-bold rounded flex items-center gap-1">
                                                <AlertCircle className="w-3 h-3" /> {warningCount}
                                            </span>
                                        )}
                                        <span className="px-2 py-0.5 bg-green-900/40 text-green-300 text-[9px] font-bold rounded">
                                            {report.passCount}/{report.totalChecks} ✓
                                        </span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Center/Right: Validation Details */}
                <div className="flex-1 flex flex-col overflow-hidden">
                    {selectedReport ? (
                        <>
                            {/* Report Header */}
                            <div className="p-4 border-b border-black bg-[#252526]">
                                <h3 className="font-bold text-slate-200 text-lg">{selectedReport.fileName}</h3>
                                <p className="text-[10px] text-slate-500 mt-1">{selectedReport.timestamp}</p>
                                <div className="mt-2 flex items-center gap-2">
                                    <div className="flex-1 h-2 bg-slate-800 rounded overflow-hidden">
                                        <div
                                            className="h-full bg-green-600"
                                            style={{ width: `${(selectedReport.passCount / selectedReport.totalChecks) * 100}%` }}
                                        ></div>
                                    </div>
                                    <span className="text-[10px] font-bold text-slate-400">
                                        {selectedReport.passCount}/{selectedReport.totalChecks} checks passed
                                    </span>
                                </div>
                            </div>

                            {/* Issues List */}
                            <div className="flex-1 overflow-y-auto p-4 space-y-3">
                                {selectedReport.issues.length > 0 ? (
                                    selectedReport.issues.map((issue) => (
                                        <div
                                            key={issue.id}
                                            className={`border rounded-lg p-4 ${
                                                issue.severity === 'error'
                                                    ? 'bg-red-900/20 border-red-700/50'
                                                    : issue.severity === 'warning'
                                                    ? 'bg-yellow-900/20 border-yellow-700/50'
                                                    : 'bg-blue-900/20 border-blue-700/50'
                                            }`}
                                        >
                                            <div className="flex items-start justify-between mb-2">
                                                <div className="flex items-start gap-2">
                                                    {issue.severity === 'error' && (
                                                        <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                                                    )}
                                                    {issue.severity === 'warning' && (
                                                        <AlertCircle className="w-4 h-4 text-yellow-400 flex-shrink-0 mt-0.5" />
                                                    )}
                                                    {issue.severity === 'info' && (
                                                        <Eye className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
                                                    )}
                                                    <div>
                                                        <div className="font-semibold text-slate-200">{issue.title}</div>
                                                        <div className="text-[10px] text-slate-500 mt-1">{issue.category}</div>
                                                    </div>
                                                </div>
                                            </div>

                                            <p className="text-[10px] text-slate-400 mb-2 pl-6">{issue.description}</p>

                                            <div className="pl-6">
                                                <div className="text-[10px] font-semibold text-slate-300 mb-1">Solution:</div>
                                                <p className="text-[10px] text-slate-400 mb-2">{issue.solution}</p>
                                                <div className="flex items-center justify-between">
                                                    <div className="flex gap-1 flex-wrap">
                                                        {issue.tools.map((tool, idx) => (
                                                            <span key={idx} className="px-1.5 py-0.5 bg-slate-800 text-[9px] text-slate-300 rounded">
                                                                {tool}
                                                            </span>
                                                        ))}
                                                    </div>
                                                    <button
                                                        onClick={() => handleCopySolution(issue.id)}
                                                        className="p-1 hover:bg-slate-700 rounded transition-colors"
                                                    >
                                                        {copiedId === issue.id ? (
                                                            <CheckCircle2 className="w-3 h-3 text-green-400" />
                                                        ) : (
                                                            <Copy className="w-3 h-3 text-slate-400" />
                                                        )}
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="text-center py-8">
                                        <CheckCircle2 className="w-12 h-12 mx-auto mb-2 text-green-400 opacity-50" />
                                        <p className="text-slate-500 text-sm">No issues found!</p>
                                    </div>
                                )}
                            </div>
                        </>
                    ) : (
                        <div className="flex-1 flex items-center justify-center text-slate-600">
                            <div className="text-center">
                                <AlertTriangle className="w-16 h-16 mx-auto mb-4 opacity-20" />
                                <p>No report selected</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default TheSplicer;
