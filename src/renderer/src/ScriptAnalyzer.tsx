import React, { useState } from 'react';
import { Code, Upload, AlertTriangle, CheckCircle2, XCircle, Info, FileCode, Zap } from 'lucide-react';

interface AnalysisIssue {
  line: number;
  severity: 'error' | 'warning' | 'info';
  message: string;
  suggestion?: string;
}

interface AnalysisResult {
  scriptName: string;
  extends: string;
  properties: string[];
  events: string[];
  functions: string[];
  issues: AnalysisIssue[];
  lineCount: number;
}

export const ScriptAnalyzer: React.FC = () => {
  const [scriptContent, setScriptContent] = useState('');
  const [fileName, setFileName] = useState('');
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [analyzing, setAnalyzing] = useState(false);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.name.endsWith('.psc')) {
      setFileName(file.name);
      const reader = new FileReader();
      reader.onload = (event) => {
        const content = event.target?.result as string;
        setScriptContent(content);
      };
      reader.readAsText(file);
    }
  };

  const analyzeScript = () => {
    setAnalyzing(true);
    
    setTimeout(() => {
      const lines = scriptContent.split('\n');
      const issues: AnalysisIssue[] = [];
      let scriptName = '';
      let extendsName = '';
      const properties: string[] = [];
      const events: string[] = [];
      const functions: string[] = [];
      
      // Parse script structure
      lines.forEach((line, index) => {
        const trimmed = line.trim();
        const lineNum = index + 1;
        
        // Extract ScriptName
        if (trimmed.toLowerCase().startsWith('scriptname')) {
          const match = trimmed.match(/scriptname\s+(\w+)(?:\s+extends\s+(\w+))?/i);
          if (match) {
            scriptName = match[1];
            extendsName = match[2] || 'Form';
          }
        }
        
        // Extract Properties
        if (trimmed.toLowerCase().includes('property')) {
          const match = trimmed.match(/(\w+)\s+property\s+(\w+)/i);
          if (match) {
            properties.push(`${match[1]} ${match[2]}`);
          }
        }
        
        // Extract Events
        if (trimmed.toLowerCase().startsWith('event')) {
          const match = trimmed.match(/event\s+(\w+)/i);
          if (match) {
            events.push(match[1]);
          }
        }
        
        // Extract Functions
        if (trimmed.toLowerCase().startsWith('function')) {
          const match = trimmed.match(/function\s+(\w+)/i);
          if (match) {
            functions.push(match[1]);
          }
        }
        
        // Issue Detection
        
        // Missing ScriptName
        if (index === 0 && !trimmed.toLowerCase().startsWith('scriptname')) {
          issues.push({
            line: lineNum,
            severity: 'error',
            message: 'Missing ScriptName declaration',
            suggestion: 'Add "ScriptName YourScriptName extends Quest" at the top'
          });
        }
        
        // Event without EndEvent
        if (trimmed.toLowerCase().startsWith('event')) {
          let foundEnd = false;
          for (let i = index + 1; i < lines.length; i++) {
            if (lines[i].trim().toLowerCase() === 'endevent') {
              foundEnd = true;
              break;
            }
            if (lines[i].trim().toLowerCase().startsWith('event') || 
                lines[i].trim().toLowerCase().startsWith('function')) {
              break;
            }
          }
          if (!foundEnd) {
            issues.push({
              line: lineNum,
              severity: 'error',
              message: 'Event missing EndEvent',
              suggestion: 'Add "EndEvent" to close this event block'
            });
          }
        }
        
        // Function without EndFunction
        if (trimmed.toLowerCase().startsWith('function') && !trimmed.toLowerCase().includes('native')) {
          let foundEnd = false;
          for (let i = index + 1; i < lines.length; i++) {
            if (lines[i].trim().toLowerCase() === 'endfunction') {
              foundEnd = true;
              break;
            }
            if (lines[i].trim().toLowerCase().startsWith('event') || 
                lines[i].trim().toLowerCase().startsWith('function')) {
              break;
            }
          }
          if (!foundEnd) {
            issues.push({
              line: lineNum,
              severity: 'error',
              message: 'Function missing EndFunction',
              suggestion: 'Add "EndFunction" to close this function block'
            });
          }
        }
        
        // Possible infinite loop (While without condition change)
        if (trimmed.toLowerCase().startsWith('while')) {
          const match = trimmed.match(/while\s+(\w+)/i);
          if (match) {
            const variable = match[1];
            let foundModification = false;
            for (let i = index + 1; i < lines.length; i++) {
              if (lines[i].trim().toLowerCase() === 'endwhile') break;
              if (lines[i].includes(variable) && (lines[i].includes('=') || lines[i].includes('+') || lines[i].includes('-'))) {
                foundModification = true;
                break;
              }
            }
            if (!foundModification) {
              issues.push({
                line: lineNum,
                severity: 'warning',
                message: `Possible infinite loop: variable "${variable}" not modified in loop`,
                suggestion: `Ensure "${variable}" is modified inside the loop to prevent infinite execution`
              });
            }
          }
        }
        
        // Using GetDistance() in loops (performance)
        if ((line.toLowerCase().includes('while') || line.toLowerCase().includes('if')) && 
            lines[index + 1]?.toLowerCase().includes('getdistance')) {
          issues.push({
            line: lineNum + 1,
            severity: 'warning',
            message: 'GetDistance() called in conditional - performance concern',
            suggestion: 'Cache the distance in a variable before the loop/condition'
          });
        }
        
        // Property without Auto or getter/setter
        if (trimmed.toLowerCase().includes('property') && 
            !trimmed.toLowerCase().includes('auto') &&
            !trimmed.toLowerCase().includes('autoreadonly')) {
          let hasGetter = false;
          for (let i = index + 1; i < Math.min(index + 10, lines.length); i++) {
            if (lines[i].trim().toLowerCase().includes('function get()')) {
              hasGetter = true;
              break;
            }
          }
          if (!hasGetter) {
            issues.push({
              line: lineNum,
              severity: 'warning',
              message: 'Property declared without Auto or getter/setter',
              suggestion: 'Add "Auto" keyword or define Get()/Set() functions'
            });
          }
        }
        
        // Missing Parent.OnInit() in OnInit event
        if (trimmed.toLowerCase() === 'event oninit()' || trimmed.toLowerCase() === 'event oninit') {
          let hasParentCall = false;
          for (let i = index + 1; i < lines.length; i++) {
            if (lines[i].trim().toLowerCase() === 'endevent') break;
            if (lines[i].toLowerCase().includes('parent.oninit()')) {
              hasParentCall = true;
              break;
            }
          }
          if (!hasParentCall && extendsName && extendsName !== 'Form') {
            issues.push({
              line: lineNum,
              severity: 'info',
              message: 'OnInit event should call Parent.OnInit()',
              suggestion: 'Add "Parent.OnInit()" at the start of the event'
            });
          }
        }
        
        // Empty string comparison (should use string length)
        if (trimmed.includes('== ""') || trimmed.includes('!= ""')) {
          issues.push({
            line: lineNum,
            severity: 'info',
            message: 'Comparing string to empty string',
            suggestion: 'Use StringUtil.GetLength() for better performance'
          });
        }
      });
      
      // Sort issues by line number
      issues.sort((a, b) => a.line - b.line);
      
      setAnalysis({
        scriptName: scriptName || 'Unknown',
        extends: extendsName || 'Unknown',
        properties,
        events,
        functions,
        issues,
        lineCount: lines.length
      });
      
      setAnalyzing(false);
    }, 800);
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'error': return <XCircle className="w-4 h-4 text-red-500" />;
      case 'warning': return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
      case 'info': return <Info className="w-4 h-4 text-blue-500" />;
      default: return <Info className="w-4 h-4" />;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'error': return 'border-red-500/50 bg-red-900/20';
      case 'warning': return 'border-yellow-500/50 bg-yellow-900/20';
      case 'info': return 'border-blue-500/50 bg-blue-900/20';
      default: return 'border-slate-700';
    }
  };

  return (
    <div className="h-full bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 overflow-hidden flex flex-col">
      {/* Header */}
      <div className="p-6 border-b border-slate-700 bg-slate-800/50">
        <div className="flex items-center gap-3 mb-4">
          <Code className="w-8 h-8 text-purple-400" />
          <div>
            <h1 className="text-2xl font-bold text-white">Papyrus Script Analyzer</h1>
            <p className="text-sm text-slate-400">Detect issues, optimize performance, validate syntax</p>
          </div>
        </div>

        {/* File Upload */}
        <div className="flex gap-3">
          <label className="flex-1 flex items-center gap-2 px-4 py-3 bg-slate-900 hover:bg-slate-800 border border-slate-700 rounded-lg cursor-pointer transition-colors">
            <Upload className="w-5 h-5 text-slate-400" />
            <span className="text-sm text-slate-300">
              {fileName || 'Upload .psc file'}
            </span>
            <input
              type="file"
              accept=".psc"
              onChange={handleFileUpload}
              className="hidden"
            />
          </label>
          <button
            onClick={analyzeScript}
            disabled={!scriptContent || analyzing}
            className="px-6 py-3 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-lg flex items-center gap-2 transition-colors"
          >
            {analyzing ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Analyzing...
              </>
            ) : (
              <>
                <Zap className="w-5 h-5" />
                Analyze
              </>
            )}
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden flex gap-4 p-6">
        {/* Left: Script Input */}
        <div className="flex-1 flex flex-col bg-slate-900 border border-slate-700 rounded-xl overflow-hidden">
          <div className="p-3 border-b border-slate-700 bg-slate-800/50">
            <h3 className="font-bold text-white text-sm flex items-center gap-2">
              <FileCode className="w-4 h-4" />
              Script Source
            </h3>
          </div>
          <textarea
            value={scriptContent}
            onChange={(e) => setScriptContent(e.target.value)}
            placeholder="Paste your Papyrus script here or upload a .psc file..."
            className="flex-1 bg-slate-950 text-slate-200 font-mono text-sm p-4 resize-none focus:outline-none"
            spellCheck={false}
          />
        </div>

        {/* Right: Analysis Results */}
        <div className="flex-1 flex flex-col bg-slate-900 border border-slate-700 rounded-xl overflow-hidden">
          <div className="p-3 border-b border-slate-700 bg-slate-800/50">
            <h3 className="font-bold text-white text-sm">Analysis Results</h3>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {!analysis && (
              <div className="text-center py-12 text-slate-500">
                <Code className="w-16 h-16 mx-auto mb-4 opacity-20" />
                <p>Upload or paste a script and click Analyze</p>
              </div>
            )}

            {analysis && (
              <>
                {/* Script Info */}
                <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
                  <h4 className="font-bold text-white mb-3">Script Information</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Script Name:</span>
                      <span className="text-white font-mono">{analysis.scriptName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Extends:</span>
                      <span className="text-white font-mono">{analysis.extends}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Lines:</span>
                      <span className="text-white font-mono">{analysis.lineCount}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Properties:</span>
                      <span className="text-white font-mono">{analysis.properties.length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Events:</span>
                      <span className="text-white font-mono">{analysis.events.length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Functions:</span>
                      <span className="text-white font-mono">{analysis.functions.length}</span>
                    </div>
                  </div>
                </div>

                {/* Issues Summary */}
                <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
                  <h4 className="font-bold text-white mb-3 flex items-center gap-2">
                    {analysis.issues.length === 0 ? (
                      <>
                        <CheckCircle2 className="w-5 h-5 text-green-500" />
                        No Issues Found
                      </>
                    ) : (
                      <>
                        <AlertTriangle className="w-5 h-5 text-yellow-500" />
                        {analysis.issues.length} Issue{analysis.issues.length !== 1 ? 's' : ''} Detected
                      </>
                    )}
                  </h4>
                  {analysis.issues.length === 0 && (
                    <p className="text-sm text-slate-400">Script appears to be properly structured!</p>
                  )}
                </div>

                {/* Issues List */}
                {analysis.issues.map((issue, idx) => (
                  <div
                    key={idx}
                    className={`rounded-lg p-4 border ${getSeverityColor(issue.severity)}`}
                  >
                    <div className="flex items-start gap-3">
                      {getSeverityIcon(issue.severity)}
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-mono text-slate-500">Line {issue.line}</span>
                          <span className="text-xs font-bold text-slate-400 uppercase">{issue.severity}</span>
                        </div>
                        <p className="text-sm text-white font-medium mb-2">{issue.message}</p>
                        {issue.suggestion && (
                          <div className="text-xs text-slate-400 bg-slate-950/50 p-2 rounded border border-slate-700">
                            <span className="font-bold text-slate-300">Suggestion: </span>
                            {issue.suggestion}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
