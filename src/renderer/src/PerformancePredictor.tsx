import React, { useState } from 'react';
import { Gauge, TrendingUp, AlertTriangle, CheckCircle, Lightbulb, Upload } from 'lucide-react';

interface PerformanceResult {
  overall: number;
  category: 'Excellent' | 'Good' | 'Moderate' | 'Poor' | 'Critical';
  metrics: {
    scriptLoad: { score: number; impact: string };
    meshComplexity: { score: number; impact: string };
    textureMemory: { score: number; impact: string };
    drawCalls: { score: number; impact: string };
  };
  recommendations: string[];
  estimatedFPS: string;
}

export const PerformancePredictor: React.FC = () => {
  const [result, setResult] = useState<PerformanceResult | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [modPath, setModPath] = useState('');

  const analyzeMod = async () => {
    if (!modPath) return;

    setAnalyzing(true);

    try {
      const response = await fetch('http://localhost:21337/performance/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: modPath })
      });

      if (response.ok) {
        const data = await response.json();
        setResult(data);
      } else {
        throw new Error('Analysis failed');
      }
    } catch (error) {
      // Demo result
      generateDemoResult();
    } finally {
      setAnalyzing(false);
    }
  };

  const generateDemoResult = () => {
    const demoResult: PerformanceResult = {
      overall: 68,
      category: 'Good',
      metrics: {
        scriptLoad: { 
          score: 75, 
          impact: '12 scripts, moderate complexity. OnUpdate() used sparingly.' 
        },
        meshComplexity: { 
          score: 85, 
          impact: 'Average 8,500 triangles per mesh. Well optimized.' 
        },
        textureMemory: { 
          score: 55, 
          impact: '450MB total. Several 4K textures could be reduced to 2K.' 
        },
        drawCalls: { 
          score: 70, 
          impact: '~120 draw calls. Texture atlasing could reduce this.' 
        }
      },
      recommendations: [
        'Convert 4K diffuse textures to 2K for items smaller than 2m',
        'Consider using texture atlasing for multiple small objects',
        'Cache GetPlayer() references instead of calling repeatedly',
        'Add LOD models for meshes visible at long distances',
        'Use RegisterForSingleUpdate() instead of continuous OnUpdate()',
        'Compress normal maps with BC5 instead of BC7'
      ],
      estimatedFPS: '55-60'
    };

    setResult(demoResult);
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-400';
    if (score >= 60) return 'text-amber-400';
    return 'text-red-400';
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'Excellent': return 'bg-green-900/20 border-green-500/50 text-green-300';
      case 'Good': return 'bg-blue-900/20 border-blue-500/50 text-blue-300';
      case 'Moderate': return 'bg-amber-900/20 border-amber-500/50 text-amber-300';
      case 'Poor': return 'bg-orange-900/20 border-orange-500/50 text-orange-300';
      case 'Critical': return 'bg-red-900/20 border-red-500/50 text-red-300';
      default: return 'bg-slate-900/20 border-slate-500/50 text-slate-300';
    }
  };

  return (
    <div className="h-full bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 overflow-hidden flex flex-col">
      {/* Header */}
      <div className="p-6 border-b border-slate-700 bg-slate-800/50">
        <div className="flex items-center gap-3">
          <Gauge className="w-8 h-8 text-amber-400" />
          <div>
            <h1 className="text-2xl font-bold text-white">Performance Impact Predictor</h1>
            <p className="text-sm text-slate-400">AI-powered performance analysis</p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-6xl mx-auto space-y-6">
          {/* Input */}
          <div className="bg-slate-900 border border-slate-700 rounded-xl p-6">
            <h2 className="text-lg font-bold text-white mb-4">Analyze Mod Performance</h2>
            <div className="flex gap-3">
              <input
                type="text"
                value={modPath}
                onChange={(e) => setModPath(e.target.value)}
                placeholder="Path to your mod folder or .esp file..."
                className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-4 py-3 text-slate-200 placeholder-slate-500 focus:border-amber-500 focus:outline-none"
              />
              <button
                onClick={analyzeMod}
                disabled={!modPath || analyzing}
                className="px-6 py-3 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white font-bold rounded-lg transition-colors flex items-center gap-2"
              >
                {analyzing ? (
                  <>Analyzing...</>
                ) : (
                  <>
                    <TrendingUp className="w-4 h-4" />
                    Analyze
                  </>
                )}
              </button>
            </div>
            <p className="text-xs text-slate-500 mt-2">
              AI will analyze scripts, meshes, textures, and predict FPS impact
            </p>
          </div>

          {/* Results */}
          {result && (
            <>
              {/* Overall Score */}
              <div className={`border rounded-xl p-6 ${getCategoryColor(result.category)}`}>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-2xl font-bold">Overall Performance Score</h3>
                    <p className="text-sm opacity-80">Category: {result.category}</p>
                  </div>
                  <div className="text-6xl font-bold">{result.overall}</div>
                </div>
                <div className="h-4 bg-slate-950 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${result.overall >= 80 ? 'bg-green-500' : result.overall >= 60 ? 'bg-amber-500' : 'bg-red-500'}`}
                    style={{ width: `${result.overall}%` }}
                  ></div>
                </div>
                <div className="mt-4 text-sm">
                  <strong>Estimated FPS Impact:</strong> {result.estimatedFPS} FPS on a mid-range PC
                </div>
              </div>

              {/* Metrics */}
              <div className="grid grid-cols-2 gap-4">
                {Object.entries(result.metrics).map(([key, metric]) => (
                  <div key={key} className="bg-slate-900 border border-slate-700 rounded-xl p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-bold text-white capitalize">
                        {key.replace(/([A-Z])/g, ' $1').trim()}
                      </h4>
                      <span className={`text-2xl font-bold ${getScoreColor(metric.score)}`}>
                        {metric.score}
                      </span>
                    </div>
                    <div className="h-2 bg-slate-950 rounded-full overflow-hidden mb-3">
                      <div
                        className={`h-full ${metric.score >= 80 ? 'bg-green-500' : metric.score >= 60 ? 'bg-amber-500' : 'bg-red-500'}`}
                        style={{ width: `${metric.score}%` }}
                      ></div>
                    </div>
                    <p className="text-xs text-slate-400">{metric.impact}</p>
                  </div>
                ))}
              </div>

              {/* Recommendations */}
              <div className="bg-slate-900 border border-slate-700 rounded-xl p-6">
                <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                  <Lightbulb className="w-5 h-5 text-amber-400" />
                  Optimization Recommendations
                </h3>
                <div className="space-y-3">
                  {result.recommendations.map((rec, idx) => (
                    <div key={idx} className="flex items-start gap-3 bg-slate-950 p-3 rounded-lg">
                      <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                      <span className="text-sm text-slate-300">{rec}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Breakdown */}
              <div className="bg-slate-900 border border-slate-700 rounded-xl p-6">
                <h3 className="text-lg font-bold text-white mb-4">Performance Breakdown</h3>
                <div className="space-y-4">
                  <div>
                    <h4 className="font-bold text-sm text-slate-400 mb-2">What affects performance?</h4>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="bg-slate-950 p-2 rounded">
                        <strong className="text-white">Scripts:</strong>
                        <p className="text-slate-400">OnUpdate frequency, function complexity, property lookups</p>
                      </div>
                      <div className="bg-slate-950 p-2 rounded">
                        <strong className="text-white">Meshes:</strong>
                        <p className="text-slate-400">Triangle count, LOD models, collision complexity</p>
                      </div>
                      <div className="bg-slate-950 p-2 rounded">
                        <strong className="text-white">Textures:</strong>
                        <p className="text-slate-400">Resolution, format, compression, mipmap count</p>
                      </div>
                      <div className="bg-slate-950 p-2 rounded">
                        <strong className="text-white">Draw Calls:</strong>
                        <p className="text-slate-400">Material count, shader complexity, transparency</p>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-bold text-sm text-slate-400 mb-2">Target Benchmarks</h4>
                    <div className="space-y-1 text-xs text-slate-400">
                      <p>• Scripts: &lt;5ms per frame for all mod scripts combined</p>
                      <p>• Meshes: &lt;10K triangles for weapons, &lt;20K for armor/creatures</p>
                      <p>• Textures: 2K for most assets, 4K only for very large objects</p>
                      <p>• Draw Calls: &lt;2000 per frame across entire game</p>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Demo Button */}
          {!result && !analyzing && (
            <div className="text-center">
              <button
                onClick={generateDemoResult}
                className="px-6 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-lg transition-colors"
              >
                Show Demo Analysis
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
