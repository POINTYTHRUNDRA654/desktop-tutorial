import { EventEmitter } from 'events';
import * as fs from 'fs';
import * as path from 'path';
import { detectConflicts } from '../electron/espParser';
import {
  MLConflictPredictionEngine,
  MiningStatus,
  ConflictPrediction,
  ConflictTrainingData,
  ConflictFeedback,
  ModelMetrics,
  HardwareProfile
} from '../shared/types';

interface PredictionContext {
  loadOrder?: string[];
  hardwareProfile?: HardwareProfile;
  modVersions?: { [modName: string]: string };
}

export interface MLConflictPredictionConfig {
  modelPath?: string;
  trainingDataPath?: string;
  confidenceThreshold: number;
  enableRealTimeLearning: boolean;
  featureWeights: {
    historicalConflicts: number;
    modSimilarity: number;
    loadOrder: number;
    hardwareCompatibility: number;
    versionCompatibility: number;
  };
}

export class MLConflictPredictionEngineImpl extends EventEmitter implements MLConflictPredictionEngine {
  private config: MLConflictPredictionConfig;
  private isRunning: boolean = false;
  private model: any = null; // Placeholder for ML model
  private trainingData: ConflictTrainingData[] = [];
  private feedbackHistory: ConflictFeedback[] = [];
  private featureExtractor: FeatureExtractor;

  constructor(config?: MLConflictPredictionConfig) {
    super();
    this.config = config || {
      confidenceThreshold: 0.7,
      enableRealTimeLearning: true,
      featureWeights: {
        historicalConflicts: 0.5,
        modSimilarity: 0.3,
        loadOrder: 0.1,
        hardwareCompatibility: 0.05,
        versionCompatibility: 0.05
      }
    };
    this.featureExtractor = new FeatureExtractor(this.trainingData);
  }

  async start(): Promise<void> {
    this.emit('status', { status: 'starting', message: 'Initializing ML conflict prediction engine' });

    try {
      this.isRunning = true;

      // Load or initialize ML model
      await this.initializeModel();

      // Load training data if available
      await this.loadTrainingData();

      this.emit('status', { status: 'running', message: 'ML conflict prediction engine ready' });
    } catch (error) {
      this.emit('status', { status: 'error', message: `Failed to start ML engine: ${error}` });
      throw error;
    }
  }

  async stop(): Promise<void> {
    this.emit('status', { status: 'stopping', message: 'Stopping ML conflict prediction engine' });

    this.isRunning = false;

    // Save model state and training data
    await this.saveModelState();

    this.emit('status', { status: 'stopped', message: 'ML conflict prediction engine stopped' });
  }

  async getStatus(): Promise<MiningStatus> {
    return {
      active: this.isRunning,
      progress: this.model ? 100 : 0,
      currentTask: this.isRunning ? 'Analyzing conflicts' : 'Idle',
      engineType: 'ml-conflict-prediction',
      engine: 'ml-conflict-prediction',
      startTime: Date.now() // Simplified - should track actual start time
    };
  }

  async getResults(): Promise<any> {
    return {
      engine: 'ml-conflict-prediction',
      timestamp: new Date(),
      predictions: [], // Would contain recent predictions
      insights: [], // Add insights property
      recommendations: [], // Add recommendations property
      modelMetrics: await this.getModelAccuracy(),
      trainingDataSize: this.trainingData.length,
      feedbackIncorporated: this.feedbackHistory.length,
      metadata: {
        modelVersion: '1.0.0',
        lastTrained: this.model?.lastTrained || 0,
        featureCount: Object.keys(this.config.featureWeights).length
      }
    };
  }

  async predictConflicts(modCombination: string[], context?: PredictionContext): Promise<ConflictPrediction[]> {
    if (!this.isRunning || !this.model) {
      throw new Error('ML engine not initialized');
    }

    this.emit('status', { status: 'running', message: `Predicting conflicts for ${modCombination.length} mods` });

    const predictions: ConflictPrediction[] = [];

    // Generate predictions for each mod pair
    for (let i = 0; i < modCombination.length; i++) {
      for (let j = i + 1; j < modCombination.length; j++) {
        const modA = modCombination[i];
        const modB = modCombination[j];

        const prediction = await this.predictConflict(modA, modB, context);
        predictions.push(prediction);
      }
    }

    // Sort by probability descending
    predictions.sort((a, b) => b.probability - a.probability);

    return predictions;
  }

  async trainModel(trainingData: ConflictTrainingData[]): Promise<void> {
    this.emit('status', { status: 'running', message: `Training model with ${trainingData.length} samples` });

    // Add new training data
    this.trainingData.push(...trainingData);

    // Extract features from training data
    const features = await this.featureExtractor.extractFeatures(this.trainingData);

    // Train the model (placeholder implementation)
    this.model = await this.trainMLModel(features, this.trainingData);

    // Update model metadata
    this.model.lastTrained = Date.now();
    this.model.trainingDataSize = this.trainingData.length;

    this.emit('status', { status: 'completed', message: 'Model training completed' });
  }

  async getModelAccuracy(): Promise<ModelMetrics> {
    if (!this.model) {
      return {
        accuracy: 0,
        precision: 0,
        recall: 0,
        f1Score: 0,
        trainingDataSize: 0,
        lastTrained: 0,
        featureImportance: {}
      };
    }

    // Metrics computed from real labeled training data below via trainMLModel; if the
    // model was never trained on labeled samples, be honest that these are unknown
    // rather than reporting a fixed-looking accuracy.
    return {
      accuracy: this.model.accuracy ?? 0,
      precision: this.model.precision ?? 0,
      recall: this.model.recall ?? 0,
      f1Score: this.model.f1Score ?? 0,
      trainingDataSize: this.trainingData.length,
      lastTrained: this.model.lastTrained || 0,
      featureImportance: this.model.featureImportance || {}
    };
  }

  async updateWithFeedback(feedback: ConflictFeedback[]): Promise<void> {
    this.feedbackHistory.push(...feedback);

    this.emit('status', { status: 'running', message: `Incorporating ${feedback.length} feedback samples` });

    // Real online-learning nudge: for each piece of feedback, shift feature weights
    // toward whichever features were most associated with correct vs. incorrect
    // predictions, weighted by the user's confidence rating (1-5).
    const weights = this.config.featureWeights;
    const learningRate = 0.02;
    for (const item of feedback) {
      const confidenceScale = item.userRating / 5;
      const direction = item.actualOutcome ? 1 : -1;
      // Nudge historicalConflicts weight the most since it's the primary signal,
      // and modSimilarity/loadOrder proportionally less.
      weights.historicalConflicts = Math.min(1, Math.max(0, weights.historicalConflicts + direction * learningRate * confidenceScale));
      weights.modSimilarity = Math.min(1, Math.max(0, weights.modSimilarity + direction * learningRate * confidenceScale * 0.5));
    }
    // Renormalize so weights still sum to 1 (keeps probability outputs in range).
    const total = Object.values(weights).reduce((s, v) => s + v, 0) || 1;
    (Object.keys(weights) as Array<keyof typeof weights>).forEach(k => { weights[k] = weights[k] / total; });

    if (this.model) {
      this.model.featureImportance = { ...weights };
    }

    await this.saveModelState();
    this.emit('status', { status: 'completed', message: 'Feedback incorporated' });
  }

  private async initializeModel(): Promise<void> {
    // Load existing model or create new one
    if (this.config.modelPath && fs.existsSync(this.config.modelPath)) {
      this.model = await this.loadModel(this.config.modelPath);
    }
    // Fall back to a fresh model if the file was missing or contained a null/corrupt model
    if (!this.model) {
      this.model = await this.createNewModel();
    }
  }

  private async loadTrainingData(): Promise<void> {
    if (this.config.trainingDataPath && fs.existsSync(this.config.trainingDataPath)) {
      const data = JSON.parse(fs.readFileSync(this.config.trainingDataPath, 'utf8'));
      this.trainingData = data.trainingData || [];
      this.feedbackHistory = data.feedbackHistory || [];
    }
  }

  private async saveModelState(): Promise<void> {
    if (this.config.modelPath) {
      const state = {
        model: this.model,
        trainingData: this.trainingData,
        feedbackHistory: this.feedbackHistory,
        config: this.config
      };
      fs.writeFileSync(this.config.modelPath, JSON.stringify(state, null, 2));
    }
  }

  private async predictConflict(modA: string, modB: string, context?: PredictionContext): Promise<ConflictPrediction> {
    // Hard evidence first: if both strings resolve to real plugin files on disk, use
    // actual binary FormID/record-level conflict detection rather than a heuristic guess.
    const realConflict = this.tryRealPluginConflictCheck(modA, modB);
    if (realConflict) {
      return realConflict;
    }

    // Extract features for this mod pair
    const features = await this.featureExtractor.extractFeaturesForPair(modA, modB, context);

    // Run prediction through the weighted heuristic scorer
    const prediction = this.runPrediction(features);

    return {
      modA,
      modB,
      probability: prediction.probability,
      conflictTypes: prediction.conflictTypes,
      severity: this.calculateSeverity(prediction.probability),
      evidence: prediction.evidence,
      mitigationStrategies: this.generateMitigationStrategies(prediction.conflictTypes),
      confidence: prediction.confidence
    };
  }

  /** Real record-level conflict check when modA/modB are actual plugin file paths. */
  private tryRealPluginConflictCheck(modA: string, modB: string): ConflictPrediction | null {
    try {
      if (!fs.existsSync(modA) || !fs.existsSync(modB)) return null;
      if (!/\.(esp|esm|esl)$/i.test(modA) || !/\.(esp|esm|esl)$/i.test(modB)) return null;

      const conflicts = detectConflicts([modA, modB]);
      if (conflicts.length === 0) {
        return {
          modA, modB,
          probability: 0,
          conflictTypes: [],
          severity: 'low',
          evidence: [{ type: 'rule_based', description: 'No overlapping FormIDs found between the two plugins', weight: 1 }],
          mitigationStrategies: [],
          confidence: 0.95
        };
      }

      const highCount = conflicts.filter(c => c.severity === 'high').length;
      const medCount = conflicts.filter(c => c.severity === 'medium').length;
      const probability = Math.min(1, 0.25 + highCount * 0.15 + medCount * 0.08 + conflicts.length * 0.02);
      const recordTypes = new Set(conflicts.map(c => c.recordType));
      const conflictTypes = [
        ...(recordTypes.has('SCPT') || recordTypes.has('SCEN') ? ['script'] : []),
        'override'
      ];

      return {
        modA, modB,
        probability,
        conflictTypes,
        severity: highCount > 0 ? 'high' : medCount > 0 ? 'medium' : 'low',
        evidence: conflicts.slice(0, 10).map(c => ({
          type: 'rule_based' as const,
          description: c.description || `${c.recordType} record ${c.formId}: ${c.winners.join(', ')} overrides ${c.losers.join(', ')}`,
          weight: c.severity === 'high' ? 0.9 : c.severity === 'medium' ? 0.6 : 0.3,
          source: 'espParser.detectConflicts'
        })),
        mitigationStrategies: this.generateMitigationStrategies(conflictTypes),
        confidence: 0.9
      };
    } catch {
      return null;
    }
  }

  /**
   * Weighted heuristic scorer used when the two mods can't be resolved to real plugin
   * files (e.g. planning against a hypothetical load order before mods are installed).
   * This is a transparent linear model over real, computable features — not a trained
   * ML model — using the configured featureWeights, which `trainModel` adjusts over
   * time from real accumulated feedback.
   */
  private runPrediction(features: Record<string, number>): {
    probability: number;
    conflictTypes: string[];
    evidence: Array<{ type: 'historical' | 'pattern' | 'similarity' | 'rule_based'; description: string; weight: number }>;
    confidence: number;
  } {
    const weights = this.config.featureWeights;
    const probability = Math.min(1, Math.max(0,
      features.historicalConflicts * weights.historicalConflicts +
      features.modSimilarity * weights.modSimilarity +
      features.loadOrder * weights.loadOrder +
      (1 - features.hardwareCompatibility) * weights.hardwareCompatibility +
      (1 - features.versionCompatibility) * weights.versionCompatibility
    ));

    const conflictTypes: string[] = [];
    if (features.modSimilarity > 0.4) conflictTypes.push('override');
    if (features.loadOrder > 0.5) conflictTypes.push('script');
    if (conflictTypes.length === 0) conflictTypes.push('compatibility');

    const evidence: Array<{ type: 'historical' | 'pattern' | 'similarity' | 'rule_based'; description: string; weight: number }> = [];
    if (features.historicalConflicts > 0) {
      evidence.push({ type: 'historical', description: `Prior recorded outcomes between similar mods put conflict rate at ${Math.round(features.historicalConflicts * 100)}%`, weight: weights.historicalConflicts });
    }
    if (features.modSimilarity > 0) {
      evidence.push({ type: 'similarity', description: `Mod names share ${Math.round(features.modSimilarity * 100)}% keyword overlap`, weight: weights.modSimilarity });
    }
    evidence.push({ type: 'pattern', description: `Load-order proximity score: ${features.loadOrder.toFixed(2)}`, weight: weights.loadOrder });

    // Confidence reflects how much real training data actually backs the current weights,
    // not a fixed constant — a fresh untrained model should say so honestly.
    const confidence = Math.min(0.9, 0.35 + Math.log10(this.trainingData.length + 1) * 0.2);

    return { probability, conflictTypes, evidence, confidence };
  }

  private calculateSeverity(probability: number): 'low' | 'medium' | 'high' | 'critical' {
    if (probability > 0.8) return 'critical';
    if (probability > 0.6) return 'high';
    if (probability > 0.4) return 'medium';
    return 'low';
  }

  private generateMitigationStrategies(conflictTypes: string[]): string[] {
    const strategies: string[] = [];

    if (conflictTypes.includes('override')) {
      strategies.push('Check load order - ensure mods load in correct sequence');
      strategies.push('Use compatibility patches if available');
    }

    if (conflictTypes.includes('script')) {
      strategies.push('Review Papyrus scripts for conflicting functions');
      strategies.push('Consider script mergers or patches');
    }

    if (conflictTypes.includes('compatibility')) {
      strategies.push('Check mod descriptions for known incompatibilities');
      strategies.push('Test mods individually before combining');
    }

    return strategies;
  }

  private async trainMLModel(features: Record<string, number>[], labels: ConflictTrainingData[]): Promise<any> {
    // Real accuracy/precision/recall/f1, computed by scoring the current weighted model
    // against every labeled sample (ones with a known actualConflict/conflict outcome).
    // Unlabeled samples (context data with no ground truth) are skipped — they can't
    // contribute to a real accuracy figure.
    const weights = this.config.featureWeights;
    let tp = 0, fp = 0, tn = 0, fn = 0;

    labels.forEach((label, i) => {
      const actual = label.actualConflict ?? label.conflict;
      if (actual === undefined) return;
      const f = features[i];
      if (!f) return;

      const probability = Math.min(1, Math.max(0,
        f.historicalConflicts * weights.historicalConflicts +
        f.modSimilarity * weights.modSimilarity +
        f.loadOrder * weights.loadOrder +
        (1 - f.hardwareCompatibility) * weights.hardwareCompatibility +
        (1 - f.versionCompatibility) * weights.versionCompatibility
      ));
      const predicted = probability > 0.5;

      if (predicted && actual) tp++;
      else if (predicted && !actual) fp++;
      else if (!predicted && actual) fn++;
      else tn++;
    });

    const labeledCount = tp + fp + tn + fn;
    const accuracy = labeledCount > 0 ? (tp + tn) / labeledCount : 0;
    const precision = tp + fp > 0 ? tp / (tp + fp) : 0;
    const recall = tp + fn > 0 ? tp / (tp + fn) : 0;
    const f1Score = precision + recall > 0 ? (2 * precision * recall) / (precision + recall) : 0;

    const weightSum = Object.values(weights).reduce((s, v) => s + v, 0) || 1;
    const featureImportance = Object.fromEntries(
      Object.entries(weights).map(([k, v]) => [k, v / weightSum])
    );

    return {
      accuracy,
      precision,
      recall,
      f1Score,
      featureImportance,
      lastTrained: Date.now(),
      trainingDataSize: labels.length,
      labeledSampleCount: labeledCount
    };
  }

  private async loadModel(modelPath: string): Promise<any> {
    const data = JSON.parse(fs.readFileSync(modelPath, 'utf8'));
    return data.model;
  }

  private async createNewModel(): Promise<any> {
    return {
      type: 'conflict_prediction_v1',
      created: Date.now(),
      parameters: {}
    };
  }
}

class FeatureExtractor {
  constructor(private trainingHistory: ConflictTrainingData[]) {}

  async extractFeatures(trainingData: ConflictTrainingData[]): Promise<any[]> {
    // Extract features from training data
    return trainingData.map(data => ({
      modSimilarity: this.calculateModSimilarity(data.modA, data.modB),
      historicalConflicts: this.getHistoricalConflictRate(data.modA, data.modB),
      loadOrder: this.loadOrderProximity(data.modA, data.modB, data.context.loadOrder),
      hardwareCompatibility: this.assessHardwareCompatibility(data.context.hardwareProfile),
      versionCompatibility: this.assessVersionCompatibility(data.context.modVersions)
    }));
  }

  async extractFeaturesForPair(modA: string, modB: string, context?: { loadOrder?: string[]; hardwareProfile?: HardwareProfile; modVersions?: { [modName: string]: string } }): Promise<any> {
    return {
      modSimilarity: this.calculateModSimilarity(modA, modB),
      historicalConflicts: this.getHistoricalConflictRate(modA, modB),
      loadOrder: this.loadOrderProximity(modA, modB, context?.loadOrder),
      hardwareCompatibility: this.assessHardwareCompatibility(context?.hardwareProfile),
      versionCompatibility: this.assessVersionCompatibility(context?.modVersions)
    };
  }

  private calculateModSimilarity(modA: string, modB: string): number {
    // Simple similarity based on name overlap
    const wordsA = modA.toLowerCase().split(/[\s\-_]+/);
    const wordsB = modB.toLowerCase().split(/[\s\-_]+/);

    const commonWords = wordsA.filter(word => wordsB.includes(word));
    return commonWords.length / Math.max(wordsA.length, wordsB.length);
  }

  /** Real load-order proximity: mods loading close together are far more likely
   * to touch the same records. Normalized distance across the actual load order
   * when one is supplied; 0 (neutral) when no load order context is available. */
  private loadOrderProximity(modA: string, modB: string, loadOrder?: string[]): number {
    if (!loadOrder || loadOrder.length < 2) return 0;
    const idxA = loadOrder.findIndex(m => m === modA || m.includes(modA) || modA.includes(m));
    const idxB = loadOrder.findIndex(m => m === modB || m.includes(modB) || modB.includes(m));
    if (idxA === -1 || idxB === -1) return 0;
    const distance = Math.abs(idxA - idxB);
    return Math.max(0, 1 - distance / loadOrder.length);
  }

  /** Real historical rate computed from actual accumulated training/feedback data for
   * this exact mod pair (either order). Returns 0 (unknown) rather than a fabricated
   * number when no history has been recorded yet for this pair. */
  private getHistoricalConflictRate(modA: string, modB: string): number {
    const matches = this.trainingHistory.filter(d =>
      (d.modA === modA && d.modB === modB) || (d.modA === modB && d.modB === modA)
    );
    if (matches.length === 0) return 0;
    const conflictCount = matches.filter(d => (d.actualConflict ?? d.conflict) === true).length;
    return conflictCount / matches.length;
  }

  private assessHardwareCompatibility(profile?: HardwareProfile): number {
    if (!profile) return 1; // no hardware context supplied — assume neutral, not fabricated
    const cpuScore = profile.cpu ? Math.min(profile.cpu.cores / 8, 1) : 0.5;
    const gpuScore = profile.gpu ? Math.min(profile.gpu.vram / 8, 1) : 0.5;
    const ramScore = profile.ram ? Math.min(profile.ram.total / 32, 1) : 0.5;
    return (cpuScore + gpuScore + ramScore) / 3;
  }

  private assessVersionCompatibility(versions?: { [modName: string]: string }): number {
    const entries = Object.values(versions || {});
    if (entries.length < 2) return 1; // no real version data to compare — assume neutral
    const majors = entries.map(v => v.split('.')[0]);
    const dominant = majors.sort((a, b) =>
      majors.filter(m => m === b).length - majors.filter(m => m === a).length
    )[0];
    return majors.filter(m => m === dominant).length / majors.length;
  }
}

export { MLConflictPredictionEngineImpl as MLConflictPredictionEngine };