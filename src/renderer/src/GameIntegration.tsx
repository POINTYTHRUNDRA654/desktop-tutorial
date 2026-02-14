/**
 * Game Integration UI Component
 * Real-time integration with running Fallout 4/Skyrim instances
 * Five main tabs: Game Monitor, Console Commander, Save Game Analyzer, Performance Dashboard, Quick Test Tools
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Tabs, Tab } from '../components/ui/Tabs';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Alert, AlertDescription } from '../components/ui/Alert';
import { Progress } from '../components/ui/Progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/Select';
import { Textarea } from '../components/ui/Textarea';
import { ScrollArea } from '../components/ui/ScrollArea';
import { Separator } from '../components/ui/Separator';
import { api } from '../lib/api';
import type {
  GameProcess,
  CommandResult,
  SaveGameAnalysis,
  ModStatus,
  PerformanceStream,
  ConsoleCommand,
  MacroCommand,
  PerformanceReport,
} from '../../shared/types';

interface GameIntegrationProps {
  className?: string;
}

export const GameIntegration: React.FC<GameIntegrationProps> = ({ className }) => {
  const [activeTab, setActiveTab] = useState('monitor');
  const [runningGame, setRunningGame] = useState<GameProcess | null>(null);
  const [isDetecting, setIsDetecting] = useState(false);
  const [performanceData, setPerformanceData] = useState<PerformanceStream | null>(null);
  const [commandHistory, setCommandHistory] = useState<ConsoleCommand[]>([]);
  const [macros, setMacros] = useState<MacroCommand[]>([]);

  // Game Monitor state
  const [activeMods, setActiveMods] = useState<ModStatus[]>([]);
  const [fpsHistory, setFpsHistory] = useState<number[]>([]);

  // Console Commander state
  const [commandInput, setCommandInput] = useState('');
  const [selectedGame, setSelectedGame] = useState<'fallout4' | 'skyrim'>('fallout4');
  const [commandOutput, setCommandOutput] = useState<string[]>([]);
  const [isExecuting, setIsExecuting] = useState(false);
  const [macroName, setMacroName] = useState('');
  const [macroCommands, setMacroCommands] = useState<string>('');

  // Save Game Analyzer state
  const [savePath, setSavePath] = useState('');
  const [saveAnalysis, setSaveAnalysis] = useState<SaveGameAnalysis | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Performance Dashboard state
  const [performanceReport, setPerformanceReport] = useState<PerformanceReport | null>(null);
  const [screenshots, setScreenshots] = useState<string[]>([]);
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [performanceUnsubscribe, setPerformanceUnsubscribe] = useState<(() => void) | null>(null);

  // Quick Test Tools state
  const [teleportCell, setTeleportCell] = useState('');
  const [itemId, setItemId] = useState('');
  const [itemCount, setItemCount] = useState('1');
  const [npcId, setNpcId] = useState('');
  const [timeScale, setTimeScale] = useState('1');
  const [weatherId, setWeatherId] = useState('');

  // Detect running game on component mount
  useEffect(() => {
    detectRunningGame();
  }, []);

  // Cleanup performance monitoring on unmount
  useEffect(() => {
    return () => {
      if (performanceUnsubscribe) {
        performanceUnsubscribe();
      }
    };
  }, [performanceUnsubscribe]);

  const detectRunningGame = async () => {
    setIsDetecting(true);
    try {
      const game = await api.gameDetectGame();
      setRunningGame(game);
      if (game) {
        setSelectedGame(game.game);
        // Load active mods and start monitoring
        loadActiveMods(game);
        startPerformanceMonitoring(game.pid);
      }
    } catch (error) {
      console.error('Failed to detect running game:', error);
    } finally {
      setIsDetecting(false);
    }
  };

  const loadActiveMods = async (game: GameProcess) => {
    try {
      const mods = await api.gameGetActiveMods(game);
      setActiveMods(mods);
    } catch (error) {
      console.error('Failed to load active mods:', error);
    }
  };

  const startPerformanceMonitoring = async (pid: number) => {
    if (isMonitoring) return;

    setIsMonitoring(true);
    try {
      // Start monitoring and set up event listener for updates
      await api.gameStartMonitoring(pid);

      // Listen for performance updates
      const unsubscribe = api.on('game-integration:performance-update', (perf: PerformanceStream) => {
        setPerformanceData(perf);
        setFpsHistory(prev => [...prev.slice(-59), perf.fps]); // Keep last 60 readings
      });

      // Store unsubscribe function for cleanup
      setPerformanceUnsubscribe(unsubscribe);
    } catch (error) {
      console.error('Failed to start performance monitoring:', error);
      setIsMonitoring(false);
    }
  };

  const executeCommand = async (command: string) => {
    if (!command.trim()) return;

    setIsExecuting(true);
    try {
      const result = await api.gameExecuteConsoleCommand(command, selectedGame);
      setCommandOutput(prev => [...prev, `> ${command}`, result.output, '']);

      // Add to history
      setCommandHistory(prev => [...prev, {
        command,
        description: result.output,
        category: 'utility',
      }]);
    } catch (error: any) {
      setCommandOutput(prev => [...prev, `> ${command}`, `Error: ${error.message}`, '']);
    } finally {
      setIsExecuting(false);
      setCommandInput('');
    }
  };

  const saveMacro = () => {
    if (!macroName.trim() || !macroCommands.trim()) return;

    const commands = macroCommands.split('\n').filter(cmd => cmd.trim());
    const macro: MacroCommand = {
      name: macroName,
      commands,
      description: `Macro with ${commands.length} commands`,
      category: 'utility',
    };

    setMacros(prev => [...prev, macro]);
    setMacroName('');
    setMacroCommands('');
  };

  const executeMacro = async (macro: MacroCommand) => {
    for (const command of macro.commands) {
      await executeCommand(command);
      await new Promise(resolve => setTimeout(resolve, 500)); // Delay between commands
    }
  };

  const analyzeSaveGame = async () => {
    if (!savePath.trim()) return;

    setIsAnalyzing(true);
    try {
      const analysis = await api.gameAnalyzeSave(savePath);
      setSaveAnalysis(analysis);
    } catch (error: any) {
      console.error('Save analysis error:', error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const captureScreenshot = async () => {
    try {
      const screenshotPath = await api.gameCaptureScreenshot();
      setScreenshots(prev => [screenshotPath, ...prev.slice(0, 9)]); // Keep last 10
    } catch (error) {
      console.error('Screenshot capture error:', error);
    }
  };

  const quickCommands = {
    toggleGodMode: () => executeCommand('tgm'),
    toggleCollision: () => executeCommand('tcl'),
    addCaps: () => executeCommand('player.additem 0000000F 1000'),
    healPlayer: () => executeCommand('player.resethealth'),
    toggleAI: () => executeCommand('tai'),
    saveGame: () => executeCommand('save quicksave'),
    loadGame: () => executeCommand('load quicksave'),
  };

  return (
    <div className={`game-integration ${className}`}>
      <div className="mb-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">Game Integration</h2>
          <div className="flex items-center gap-2">
            <Button
              onClick={detectRunningGame}
              disabled={isDetecting}
              variant="outline"
            >
              {isDetecting ? 'Detecting...' : 'Refresh Game Status'}
            </Button>
            {runningGame && (
              <Badge variant={runningGame.f4seDetected || runningGame.skseDetected ? 'default' : 'secondary'}>
                {runningGame.game.toUpperCase()} Running (PID: {runningGame.pid})
              </Badge>
            )}
          </div>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <Tab value="monitor" label="Game Monitor">
          <GameMonitorTab
            runningGame={runningGame}
            activeMods={activeMods}
            performanceData={performanceData}
            fpsHistory={fpsHistory}
            onCaptureScreenshot={captureScreenshot}
          />
        </Tab>

        <Tab value="console" label="Console Commander">
          <ConsoleCommanderTab
            commandInput={commandInput}
            setCommandInput={setCommandInput}
            selectedGame={selectedGame}
            setSelectedGame={setSelectedGame}
            commandOutput={commandOutput}
            isExecuting={isExecuting}
            onExecuteCommand={executeCommand}
            macros={macros}
            onExecuteMacro={executeMacro}
            macroName={macroName}
            setMacroName={setMacroName}
            macroCommands={macroCommands}
            setMacroCommands={setMacroCommands}
            onSaveMacro={saveMacro}
            quickCommands={quickCommands}
          />
        </Tab>

        <Tab value="save" label="Save Game Analyzer">
          <SaveGameAnalyzerTab
            savePath={savePath}
            setSavePath={setSavePath}
            saveAnalysis={saveAnalysis}
            isAnalyzing={isAnalyzing}
            onAnalyzeSave={analyzeSaveGame}
          />
        </Tab>

        <Tab value="performance" label="Performance Dashboard">
          <PerformanceDashboardTab
            performanceData={performanceData}
            fpsHistory={fpsHistory}
            screenshots={screenshots}
            isMonitoring={isMonitoring}
            onCaptureScreenshot={captureScreenshot}
          />
        </Tab>

        <Tab value="tools" label="Quick Test Tools">
          <QuickTestToolsTab
            teleportCell={teleportCell}
            setTeleportCell={setTeleportCell}
            itemId={itemId}
            setItemId={setItemId}
            itemCount={itemCount}
            setItemCount={setItemCount}
            npcId={npcId}
            setNpcId={setNpcId}
            timeScale={timeScale}
            setTimeScale={setTimeScale}
            weatherId={weatherId}
            setWeatherId={setWeatherId}
            onExecuteCommand={executeCommand}
          />
        </Tab>
      </Tabs>
    </div>
  );
};

// Sub-components for each tab

interface GameMonitorTabProps {
  runningGame: GameProcess | null;
  activeMods: ModStatus[];
  performanceData: PerformanceStream | null;
  fpsHistory: number[];
  onCaptureScreenshot: () => void;
}

const GameMonitorTab: React.FC<GameMonitorTabProps> = ({
  runningGame,
  activeMods,
  performanceData,
  fpsHistory,
  onCaptureScreenshot,
}) => {
  return (
    <div className="space-y-4">
      {!runningGame ? (
        <Alert>
          <AlertDescription>
            No running Fallout 4 or Skyrim game detected. Launch the game and click "Refresh Game Status".
          </AlertDescription>
        </Alert>
      ) : (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Game Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium">Process ID</p>
                  <p className="text-lg">{runningGame.pid}</p>
                </div>
                <div>
                  <p className="text-sm font-medium">Uptime</p>
                  <p className="text-lg">{Math.floor(runningGame.uptime / 60)}m</p>
                </div>
                <div>
                  <p className="text-sm font-medium">Memory Usage</p>
                  <p className="text-lg">{(runningGame.memoryUsage / 1024 / 1024).toFixed(1)} MB</p>
                </div>
                <div>
                  <p className="text-sm font-medium">CPU Usage</p>
                  <p className="text-lg">{runningGame.cpuUsage.toFixed(1)}%</p>
                </div>
              </div>
              <div className="mt-4 flex gap-2">
                <Badge variant={runningGame.f4seDetected ? 'default' : 'secondary'}>
                  F4SE: {runningGame.f4seDetected ? 'Detected' : 'Not Found'}
                </Badge>
                <Badge variant={runningGame.skseDetected ? 'default' : 'secondary'}>
                  SKSE: {runningGame.skseDetected ? 'Detected' : 'Not Found'}
                </Badge>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Active Mods ({activeMods.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-48">
                <div className="space-y-2">
                  {activeMods.map((mod, index) => (
                    <div key={mod.pluginName} className="flex items-center justify-between">
                      <span className="text-sm">{mod.pluginName}</span>
                      <Badge variant={mod.isActive ? 'default' : 'secondary'}>
                        #{mod.loadOrder}
                      </Badge>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          {performanceData && (
            <Card>
              <CardHeader>
                <CardTitle>Real-time Performance</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <p className="text-sm font-medium">FPS</p>
                    <p className="text-2xl font-bold">{performanceData.fps}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Frame Time</p>
                    <p className="text-lg">{performanceData.frameTime.toFixed(2)}ms</p>
                  </div>
                </div>
                <div className="space-y-2">
                  <div>
                    <div className="flex justify-between text-sm">
                      <span>FPS History (60s)</span>
                      <span>{fpsHistory.length} samples</span>
                    </div>
                    <div className="h-20 bg-gray-100 rounded flex items-end">
                      {fpsHistory.map((fps, i) => (
                        <div
                          key={i}
                          className="bg-blue-500 flex-1 min-w-[2px]"
                          style={{ height: `${(fps / 60) * 100}%` }}
                        />
                      ))}
                    </div>
                  </div>
                </div>
                <Button onClick={onCaptureScreenshot} className="mt-4">
                  Capture Screenshot
                </Button>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
};

interface ConsoleCommanderTabProps {
  commandInput: string;
  setCommandInput: (value: string) => void;
  selectedGame: 'fallout4' | 'skyrim';
  setSelectedGame: (value: 'fallout4' | 'skyrim') => void;
  commandOutput: string[];
  isExecuting: boolean;
  onExecuteCommand: (command: string) => void;
  macros: MacroCommand[];
  onExecuteMacro: (macro: MacroCommand) => void;
  macroName: string;
  setMacroName: (value: string) => void;
  macroCommands: string;
  setMacroCommands: (value: string) => void;
  onSaveMacro: () => void;
  quickCommands: Record<string, () => void>;
}

const ConsoleCommanderTab: React.FC<ConsoleCommanderTabProps> = ({
  commandInput,
  setCommandInput,
  selectedGame,
  setSelectedGame,
  commandOutput,
  isExecuting,
  onExecuteCommand,
  macros,
  onExecuteMacro,
  macroName,
  setMacroName,
  macroCommands,
  setMacroCommands,
  onSaveMacro,
  quickCommands,
}) => {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Command Input</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2 mb-4">
            <Select value={selectedGame} onValueChange={setSelectedGame}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="fallout4">Fallout 4</SelectItem>
                <SelectItem value="skyrim">Skyrim</SelectItem>
              </SelectContent>
            </Select>
            <Input
              value={commandInput}
              onChange={(e) => setCommandInput(e.target.value)}
              placeholder="Enter console command..."
              onKeyPress={(e) => e.key === 'Enter' && onExecuteCommand(commandInput)}
              className="flex-1"
            />
            <Button
              onClick={() => onExecuteCommand(commandInput)}
              disabled={isExecuting || !commandInput.trim()}
            >
              {isExecuting ? 'Executing...' : 'Execute'}
            </Button>
          </div>

          <div className="grid grid-cols-4 gap-2">
            <Button onClick={quickCommands.toggleGodMode} size="sm">TGM</Button>
            <Button onClick={quickCommands.toggleCollision} size="sm">TCL</Button>
            <Button onClick={quickCommands.addCaps} size="sm">+1000 Caps</Button>
            <Button onClick={quickCommands.healPlayer} size="sm">Heal</Button>
            <Button onClick={quickCommands.toggleAI} size="sm">Toggle AI</Button>
            <Button onClick={quickCommands.saveGame} size="sm">Quick Save</Button>
            <Button onClick={quickCommands.loadGame} size="sm">Quick Load</Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Command Output</CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-64 bg-black text-green-400 p-2 font-mono text-sm">
            {commandOutput.map((line, i) => (
              <div key={i}>{line}</div>
            ))}
          </ScrollArea>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Macros</CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-48">
              <div className="space-y-2">
                {macros.map((macro, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{macro.name}</p>
                      <p className="text-sm text-gray-600">{macro.commands.length} commands</p>
                    </div>
                    <Button onClick={() => onExecuteMacro(macro)} size="sm">
                      Execute
                    </Button>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Create Macro</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              value={macroName}
              onChange={(e) => setMacroName(e.target.value)}
              placeholder="Macro name"
            />
            <Textarea
              value={macroCommands}
              onChange={(e) => setMacroCommands(e.target.value)}
              placeholder="Commands (one per line)"
              rows={6}
            />
            <Button onClick={onSaveMacro} disabled={!macroName.trim() || !macroCommands.trim()}>
              Save Macro
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

interface SaveGameAnalyzerTabProps {
  savePath: string;
  setSavePath: (value: string) => void;
  saveAnalysis: SaveGameAnalysis | null;
  isAnalyzing: boolean;
  onAnalyzeSave: () => void;
}

const SaveGameAnalyzerTab: React.FC<SaveGameAnalyzerTabProps> = ({
  savePath,
  setSavePath,
  saveAnalysis,
  isAnalyzing,
  onAnalyzeSave,
}) => {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Save Game Analysis</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Input
              value={savePath}
              onChange={(e) => setSavePath(e.target.value)}
              placeholder="Path to save file (.ess)"
              className="flex-1"
            />
            <Button onClick={onAnalyzeSave} disabled={isAnalyzing || !savePath.trim()}>
              {isAnalyzing ? 'Analyzing...' : 'Analyze Save'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {saveAnalysis && (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Save Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium">File Name</p>
                  <p>{saveAnalysis.fileName}</p>
                </div>
                <div>
                  <p className="text-sm font-medium">File Size</p>
                  <p>{(saveAnalysis.fileSize / 1024 / 1024).toFixed(2)} MB</p>
                </div>
                <div>
                  <p className="text-sm font-medium">Player Name</p>
                  <p>{saveAnalysis.playerName}</p>
                </div>
                <div>
                  <p className="text-sm font-medium">Player Level</p>
                  <p>{saveAnalysis.playerLevel}</p>
                </div>
                <div>
                  <p className="text-sm font-medium">Play Time</p>
                  <p>{Math.floor(saveAnalysis.playTime / 3600)}h {Math.floor((saveAnalysis.playTime % 3600) / 60)}m</p>
                </div>
                <div>
                  <p className="text-sm font-medium">Script Instances</p>
                  <p>{saveAnalysis.scriptInstances}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Plugin Analysis</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <p className="text-sm font-medium mb-2">Active Plugins ({saveAnalysis.plugins.length})</p>
                  <ScrollArea className="h-32 bg-gray-50 p-2 rounded">
                    {saveAnalysis.plugins.map((plugin, i) => (
                      <div key={i} className="text-sm">{plugin}</div>
                    ))}
                  </ScrollArea>
                </div>

                {saveAnalysis.missingPlugins.length > 0 && (
                  <div>
                    <p className="text-sm font-medium mb-2 text-red-600">
                      Missing Plugins ({saveAnalysis.missingPlugins.length})
                    </p>
                    <ScrollArea className="h-32 bg-red-50 p-2 rounded">
                      {saveAnalysis.missingPlugins.map((plugin, i) => (
                        <div key={i} className="text-sm text-red-600">{plugin}</div>
                      ))}
                    </ScrollArea>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {saveAnalysis.recommendations.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Recommendations</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {saveAnalysis.recommendations.map((rec, i) => (
                    <Alert key={i}>
                      <AlertDescription>{rec}</AlertDescription>
                    </Alert>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
};

interface PerformanceDashboardTabProps {
  performanceData: PerformanceStream | null;
  fpsHistory: number[];
  screenshots: string[];
  isMonitoring: boolean;
  onCaptureScreenshot: () => void;
}

const PerformanceDashboardTab: React.FC<PerformanceDashboardTabProps> = ({
  performanceData,
  fpsHistory,
  screenshots,
  isMonitoring,
  onCaptureScreenshot,
}) => {
  const avgFps = fpsHistory.length > 0 ? fpsHistory.reduce((a, b) => a + b) / fpsHistory.length : 0;
  const minFps = fpsHistory.length > 0 ? Math.min(...fpsHistory) : 0;
  const maxFps = fpsHistory.length > 0 ? Math.max(...fpsHistory) : 0;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Performance Metrics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 gap-4 mb-4">
            <div>
              <p className="text-sm font-medium">Average FPS</p>
              <p className="text-2xl font-bold">{avgFps.toFixed(1)}</p>
            </div>
            <div>
              <p className="text-sm font-medium">Min FPS</p>
              <p className="text-lg">{minFps}</p>
            </div>
            <div>
              <p className="text-sm font-medium">Max FPS</p>
              <p className="text-lg">{maxFps}</p>
            </div>
            <div>
              <p className="text-sm font-medium">Status</p>
              <Badge variant={isMonitoring ? 'default' : 'secondary'}>
                {isMonitoring ? 'Monitoring' : 'Not Monitoring'}
              </Badge>
            </div>
          </div>

          {performanceData && (
            <div className="grid grid-cols-3 gap-4">
              <div>
                <p className="text-sm font-medium">Memory Usage</p>
                <p className="text-lg">{(performanceData.memoryUsage / 1024 / 1024).toFixed(1)} MB</p>
              </div>
              <div>
                <p className="text-sm font-medium">CPU Usage</p>
                <p className="text-lg">{performanceData.cpuUsage.toFixed(1)}%</p>
              </div>
              <div>
                <p className="text-sm font-medium">Script Lag</p>
                <Badge variant={performanceData.scriptLag > 0 ? 'destructive' : 'default'}>
                  {performanceData.scriptLag > 0 ? `${performanceData.scriptLag}ms` : 'None'}
                </Badge>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>FPS History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-40 bg-gray-100 rounded flex items-end">
            {fpsHistory.map((fps, i) => (
              <div
                key={i}
                className="bg-blue-500 flex-1 min-w-[2px]"
                style={{ height: `${(fps / 60) * 100}%` }}
                title={`Frame ${i}: ${fps} FPS`}
              />
            ))}
          </div>
          <p className="text-sm text-gray-600 mt-2">
            {fpsHistory.length} samples over {fpsHistory.length} seconds
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Screenshots</CardTitle>
        </CardHeader>
        <CardContent>
          <Button onClick={onCaptureScreenshot} className="mb-4">
            Capture Screenshot
          </Button>
          <div className="grid grid-cols-5 gap-2">
            {screenshots.map((screenshot, i) => (
              <div key={i} className="aspect-video bg-gray-200 rounded flex items-center justify-center">
                <span className="text-xs text-gray-500">Screenshot {i + 1}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

interface QuickTestToolsTabProps {
  teleportCell: string;
  setTeleportCell: (value: string) => void;
  itemId: string;
  setItemId: (value: string) => void;
  itemCount: string;
  setItemCount: (value: string) => void;
  npcId: string;
  setNpcId: (value: string) => void;
  timeScale: string;
  setTimeScale: (value: string) => void;
  weatherId: string;
  setWeatherId: (value: string) => void;
  onExecuteCommand: (command: string) => void;
}

const QuickTestToolsTab: React.FC<QuickTestToolsTabProps> = ({
  teleportCell,
  setTeleportCell,
  itemId,
  setItemId,
  itemCount,
  setItemCount,
  npcId,
  setNpcId,
  timeScale,
  setTimeScale,
  weatherId,
  setWeatherId,
  onExecuteCommand,
}) => {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Teleport to Cell</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Input
              value={teleportCell}
              onChange={(e) => setTeleportCell(e.target.value)}
              placeholder="Cell name or coordinates"
              className="flex-1"
            />
            <Button onClick={() => onExecuteCommand(`coc ${teleportCell}`)}>
              Teleport
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Spawn Item</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-2">
            <Input
              value={itemId}
              onChange={(e) => setItemId(e.target.value)}
              placeholder="Item ID"
            />
            <Input
              value={itemCount}
              onChange={(e) => setItemCount(e.target.value)}
              placeholder="Count"
              type="number"
            />
            <Button onClick={() => onExecuteCommand(`player.additem ${itemId} ${itemCount}`)}>
              Add Item
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Spawn NPC</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Input
              value={npcId}
              onChange={(e) => setNpcId(e.target.value)}
              placeholder="NPC ID"
              className="flex-1"
            />
            <Button onClick={() => onExecuteCommand(`player.placeatme ${npcId}`)}>
              Spawn NPC
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Time Scale</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Input
              value={timeScale}
              onChange={(e) => setTimeScale(e.target.value)}
              placeholder="Time scale (1.0 = normal)"
              className="flex-1"
            />
            <Button onClick={() => onExecuteCommand(`set timescale to ${timeScale}`)}>
              Set Time Scale
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Weather Control</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Input
              value={weatherId}
              onChange={(e) => setWeatherId(e.target.value)}
              placeholder="Weather ID"
              className="flex-1"
            />
            <Button onClick={() => onExecuteCommand(`sw ${weatherId}`)}>
              Set Weather
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-2">
            <Button onClick={() => onExecuteCommand('tgm')} variant="outline">Toggle God Mode</Button>
            <Button onClick={() => onExecuteCommand('tcl')} variant="outline">Toggle Collision</Button>
            <Button onClick={() => onExecuteCommand('tai')} variant="outline">Toggle AI</Button>
            <Button onClick={() => onExecuteCommand('tfc')} variant="outline">Toggle Free Camera</Button>
            <Button onClick={() => onExecuteCommand('save test')} variant="outline">Save Test</Button>
            <Button onClick={() => onExecuteCommand('load test')} variant="outline">Load Test</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default GameIntegration;