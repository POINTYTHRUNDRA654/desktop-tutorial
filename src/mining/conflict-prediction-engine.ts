/**
 * Conflict Prediction Engine
 * Uses machine learning to predict conflicts between mods before installation
 */

import {
  ConflictPrediction,
  ConflictPredictionModel,
  ConflictTrainingData,
  ConflictPredictionEngine as IConflictPredictionEngine,
  PredictedConflictType,
  ConflictEvidence,
  ModConflict,
  PerformanceMetric
} from '../shared/types';

export class ConflictPredictionEngine implements IConflictPredictionEngine {
  private model: ConflictPredictionModel = {
    trained: false,
    lastTrained: 0,
    accuracy: 0,
    featureCount: 0,
    trainingDataSize: 0
  };

  private trainingData: ConflictTrainingData[] = [];
  private featureWeights: Map<string, number> = new Map();

  async predict(modA: string, modB: string): Promise<ConflictPrediction> {
    if (!this.model.trained) {
      return this.fallbackPrediction(modA, modB);
    }

    const features = await this.extractFeatures(modA, modB);
    const probability = this.calculateProbability(features);
    const conflictTypes = await this.predictConflictTypes(modA, modB, features);
    const severity = this.predictSeverity(conflictTypes);
    const evidence = await this.gatherEvidence(modA, modB, features);
    const recommendations = this.generateRecommendations(modA, modB, probability, conflictTypes);

    return {
      modA,
      modB,
      probability,
      conflictTypes,
      severity,
      evidence,
      recommendations
    };
  }

  async train(trainingData: ConflictTrainingData[]): Promise<void> {
    this.trainingData = trainingData;
    this.model.trainingDataSize = trainingData.length;

    // Simple logistic regression training (in practice, use a proper ML library)
    await this.trainLogisticRegression();

    this.model.trained = true;
    this.model.lastTrained = Date.now();
    this.model.accuracy = await this.evaluateModel();
    this.model.featureCount = this.featureWeights.size;
  }

  async getModelStatus(): Promise<ConflictPredictionModel> {
    return { ...this.model };
  }

  private async extractFeatures(modA: string, modB: string): Promise<Map<string, number>> {
    const features = new Map<string, number>();

    // Basic features
    features.set('name_similarity', this.calculateNameSimilarity(modA, modB));
    features.set('name_overlap', this.calculateNameOverlap(modA, modB));

    // Historical conflict features
    features.set('historical_conflicts', await this.getHistoricalConflictRate(modA, modB));

    // Category-based features (would need mod metadata)
    features.set('same_category', this.checkSameCategory(modA, modB) ? 1 : 0);

    // Complexity features
    features.set('mod_a_complexity', this.estimateComplexity(modA));
    features.set('mod_b_complexity', this.estimateComplexity(modB));

    // Script features
    features.set('script_conflict_potential', this.calculateScriptConflictPotential(modA, modB));

    // Asset features
    features.set('asset_conflict_potential', this.calculateAssetConflictPotential(modA, modB));

    return features;
  }

  private calculateProbability(features: Map<string, number>): number {
    if (!this.model.trained) return 0.5;

    // Simple logistic regression prediction
    let logit = 0;
    for (const [feature, value] of features) {
      const weight = this.featureWeights.get(feature) || 0;
      logit += weight * value;
    }

    // Add bias term
    logit += this.featureWeights.get('bias') || 0;

    // Sigmoid function
    return 1 / (1 + Math.exp(-logit));
  }

  private async predictConflictTypes(
    modA: string,
    modB: string,
    features: Map<string, number>
  ): Promise<PredictedConflictType[]> {
    const conflictTypes = [];

    // Override conflicts
    const overrideConfidence = features.get('asset_conflict_potential') || 0;
    if (overrideConfidence > 0.3) {
      conflictTypes.push({
        type: 'override',
        description: 'Potential mesh/texture override conflicts',
        confidence: overrideConfidence
      });
    }

    // Script conflicts
    const scriptConfidence = features.get('script_conflict_potential') || 0;
    if (scriptConfidence > 0.4) {
      conflictTypes.push({
        type: 'script',
        description: 'Potential Papyrus script conflicts',
        confidence: scriptConfidence
      });
    }

    // Load order conflicts
    const loadOrderConfidence = features.get('historical_conflicts') || 0;
    if (loadOrderConfidence > 0.5) {
      conflictTypes.push({
        type: 'load_order',
        description: 'Load order dependency conflicts',
        confidence: loadOrderConfidence
      });
    }

    // Resource conflicts
    const resourceConfidence = Math.max(
      features.get('mod_a_complexity') || 0,
      features.get('mod_b_complexity') || 0
    );
    if (resourceConfidence > 0.7) {
      conflictTypes.push({
        type: 'resource',
        description: 'High resource usage may cause performance conflicts',
        confidence: resourceConfidence * 0.8
      });
    }

    return conflictTypes as PredictedConflictType[];
  }

  private predictSeverity(conflictTypes: Array<{ confidence: number }>): 'minor' | 'major' | 'critical' {
    const avgConfidence = conflictTypes.reduce((acc, type) => acc + type.confidence, 0) / conflictTypes.length;

    if (avgConfidence > 0.8) return 'critical';
    if (avgConfidence > 0.6) return 'major';
    return 'minor';
  }

  private async gatherEvidence(
    modA: string,
    modB: string,
    features: Map<string, number>
  ): Promise<ConflictEvidence[]> {
    const evidence = [];

    // Historical evidence
    const historicalRate = features.get('historical_conflicts') || 0;
    if (historicalRate > 0) {
      evidence.push({
        type: 'historical',
        description: `${(historicalRate * 100).toFixed(1)}% of similar mod combinations had conflicts`,
        weight: historicalRate
      });
    }

    // Similarity evidence
    const nameSimilarity = features.get('name_similarity') || 0;
    if (nameSimilarity > 0.5) {
      evidence.push({
        type: 'similarity',
        description: `High name similarity (${(nameSimilarity * 100).toFixed(1)}%) suggests potential conflicts`,
        weight: nameSimilarity * 0.8
      });
    }

    // Pattern-based evidence
    const patterns = await this.findSimilarPatterns(modA, modB);
    if (patterns.length > 0) {
      evidence.push({
        type: 'pattern',
        description: `Found ${patterns.length} similar conflict patterns in historical data`,
        weight: Math.min(patterns.length * 0.1, 0.5)
      });
    }

    // Rule-based evidence
    const rules = this.applyConflictRules(modA, modB);
    for (const rule of rules) {
      evidence.push({
        type: 'rule_based',
        description: rule.description,
        weight: rule.weight
      });
    }

    return evidence as ConflictEvidence[];
  }

  private generateRecommendations(
    modA: string,
    modB: string,
    probability: number,
    conflictTypes: Array<{ type: string }>
  ): string[] {
    const recommendations = [];

    if (probability > 0.8) {
      recommendations.push(`High conflict risk detected. Consider using only one of: ${modA} or ${modB}`);
    } else if (probability > 0.6) {
      recommendations.push(`Moderate conflict risk. Test thoroughly and monitor for issues`);
    }

    // Type-specific recommendations
    for (const conflictType of conflictTypes) {
      switch (conflictType.type) {
        case 'override':
          recommendations.push('Check for mesh/texture overrides and use texture merge patches if needed');
          break;
        case 'script':
          recommendations.push('Monitor Papyrus logs for script conflicts during gameplay');
          break;
        case 'load_order':
          recommendations.push('Ensure proper load order using LOOT or manual ordering');
          break;
        case 'resource':
          recommendations.push('Monitor system resources and consider disabling one mod if performance issues occur');
          break;
      }
    }

    return recommendations;
  }

  private async trainLogisticRegression(): Promise<void> {
    // Simple gradient descent for logistic regression
    // In practice, use a proper ML library like TensorFlow.js or scikit-learn

    const features = ['name_similarity', 'name_overlap', 'historical_conflicts', 'same_category',
                     'mod_a_complexity', 'mod_b_complexity', 'script_conflict_potential', 'asset_conflict_potential'];
    const learningRate = 0.01;
    const epochs = 100;

    // Initialize weights
    for (const feature of features) {
      this.featureWeights.set(feature, Math.random() - 0.5);
    }
    this.featureWeights.set('bias', Math.random() - 0.5);

    for (let epoch = 0; epoch < epochs; epoch++) {
      let totalLoss = 0;

      for (const sample of this.trainingData) {
        const sampleFeatures = await this.extractFeatures(sample.modA, sample.modB);
        const prediction = this.calculateProbability(sampleFeatures);
        const actual = sample.conflict ? 1 : 0;
        const error = prediction - actual;

        // Update weights
        for (const [feature, value] of sampleFeatures) {
          const weight = this.featureWeights.get(feature) || 0;
          this.featureWeights.set(feature, weight - learningRate * error * value);
        }

        // Update bias
        const bias = this.featureWeights.get('bias') || 0;
        this.featureWeights.set('bias', bias - learningRate * error);

        totalLoss += error * error;
      }

      // Early stopping if loss is low enough
      if (totalLoss / this.trainingData.length < 0.01) {
        break;
      }
    }
  }

  private async evaluateModel(): Promise<number> {
    if (this.trainingData.length < 10) return 0;

    // Simple cross-validation
    const testSize = Math.floor(this.trainingData.length * 0.2);
    const testData = this.trainingData.slice(-testSize);
    let correct = 0;

    for (const sample of testData) {
      const prediction = await this.predict(sample.modA, sample.modB);
      const predictedConflict = prediction.probability > 0.5;
      if (predictedConflict === sample.conflict) {
        correct++;
      }
    }

    return correct / testSize;
  }

  private fallbackPrediction(modA: string, modB: string): ConflictPrediction {
    // Simple rule-based fallback when model is not trained
    const nameSimilarity = this.calculateNameSimilarity(modA, modB);
    const probability = Math.min(nameSimilarity * 0.8, 0.5); // Cap at 50% for untrained model

    return {
      modA,
      modB,
      probability,
      conflictTypes: probability > 0.3 ? [{
        type: 'override',
        description: 'Potential conflicts based on mod name similarity',
        confidence: probability
      }] : [],
      severity: probability > 0.4 ? 'major' : 'minor',
      evidence: [{
        type: 'rule_based',
        description: `Name similarity: ${(nameSimilarity * 100).toFixed(1)}%`,
        weight: nameSimilarity
      }],
      recommendations: probability > 0.3 ?
        ['Test thoroughly before using together', 'Monitor for override conflicts'] :
        ['Should be safe to use together']
    };
  }

  private calculateNameSimilarity(modA: string, modB: string): number {
    const a = modA.toLowerCase();
    const b = modB.toLowerCase();

    // Simple Jaccard similarity of words
    const wordsA = new Set(a.split(/\s+/));
    const wordsB = new Set(b.split(/\s+/));

    const intersection = new Set([...wordsA].filter(x => wordsB.has(x)));
    const union = new Set([...wordsA, ...wordsB]);

    return intersection.size / union.size;
  }

  private calculateNameOverlap(modA: string, modB: string): number {
    const a = modA.toLowerCase();
    const b = modB.toLowerCase();

    // Longest common substring ratio
    const matrix = Array(a.length + 1).fill(null).map(() => Array(b.length + 1).fill(0));

    for (let i = 1; i <= a.length; i++) {
      for (let j = 1; j <= b.length; j++) {
        if (a[i - 1] === b[j - 1]) {
          matrix[i][j] = matrix[i - 1][j - 1] + 1;
        } else {
          matrix[i][j] = Math.max(matrix[i - 1][j], matrix[i][j - 1]);
        }
      }
    }

    const lcs = matrix[a.length][b.length];
    return lcs / Math.max(a.length, b.length);
  }

  private async getHistoricalConflictRate(modA: string, modB: string): Promise<number> {
    const relevantData = this.trainingData.filter(
      d => (d.modA === modA && d.modB === modB) || (d.modA === modB && d.modB === modA)
    );

    if (relevantData.length === 0) return 0.5; // Neutral when no data

    const conflicts = relevantData.filter(d => d.conflict).length;
    return conflicts / relevantData.length;
  }

  private checkSameCategory(modA: string, modB: string): boolean {
    // Simple category detection based on keywords
    const categories = {
      texture: ['texture', 'visual', 'graphics', 'hd', '4k', '2k'],
      gameplay: ['gameplay', 'quest', 'npc', 'combat', 'magic', 'perk'],
      audio: ['sound', 'music', 'voice', 'audio', 'sfx'],
      utility: ['utility', 'bugfix', 'patch', 'compatibility', 'skse', 'skse64'],
      environment: ['weather', 'landscape', 'world', 'nature', 'plants']
    };

    const getCategory = (mod: string): string | null => {
      const lower = mod.toLowerCase();
      for (const [category, keywords] of Object.entries(categories)) {
        if (keywords.some(keyword => lower.includes(keyword))) {
          return category;
        }
      }
      return null;
    };

    const catA = getCategory(modA);
    const catB = getCategory(modB);

    return catA !== null && catB !== null && catA === catB;
  }

  private estimateComplexity(mod: string): number {
    // Estimate mod complexity based on name keywords
    const complexityIndicators = [
      'total', 'complete', 'overhaul', 'redux', 'remaster', 'enhanced',
      'ultimate', 'professional', 'deluxe', 'premium'
    ];

    const lower = mod.toLowerCase();
    const matches = complexityIndicators.filter(indicator => lower.includes(indicator));

    return Math.min(matches.length * 0.2, 1.0);
  }

  private calculateScriptConflictPotential(modA: string, modB: string): number {
    // Estimate script conflict potential
    const scriptKeywords = ['script', 'skse', 'skse64', 'papyrus', 'quest', 'dialogue', 'magic'];

    const a = modA.toLowerCase();
    const b = modB.toLowerCase();

    const aHasScripts = scriptKeywords.some(keyword => a.includes(keyword));
    const bHasScripts = scriptKeywords.some(keyword => b.includes(keyword));

    if (aHasScripts && bHasScripts) {
      return 0.8; // High potential when both have scripts
    } else if (aHasScripts || bHasScripts) {
      return 0.4; // Medium potential when one has scripts
    }

    return 0.1; // Low potential
  }

  private calculateAssetConflictPotential(modA: string, modB: string): number {
    // Estimate asset conflict potential
    const assetKeywords = ['texture', 'mesh', 'model', 'visual', 'hd', '4k', '2k', 'retest'];

    const a = modA.toLowerCase();
    const b = modB.toLowerCase();

    const aHasAssets = assetKeywords.some(keyword => a.includes(keyword));
    const bHasAssets = assetKeywords.some(keyword => b.includes(keyword));

    if (aHasAssets && bHasAssets) {
      return 0.7; // High potential when both modify assets
    } else if (aHasAssets || bHasAssets) {
      return 0.3; // Medium potential when one modifies assets
    }

    return 0.05; // Low potential
  }

  private async findSimilarPatterns(modA: string, modB: string): Promise<ConflictTrainingData[]> {
    // Find similar mod combinations in training data
    return this.trainingData.filter(data => {
      const similarityA = this.calculateNameSimilarity(data.modA, modA) > 0.3 ||
                         this.calculateNameSimilarity(data.modB, modA) > 0.3;
      const similarityB = this.calculateNameSimilarity(data.modA, modB) > 0.3 ||
                         this.calculateNameSimilarity(data.modB, modB) > 0.3;

      return similarityA && similarityB;
    });
  }

  private applyConflictRules(modA: string, modB: string): Array<{ description: string; weight: number }> {
    const rules = [];

    // Rule: SKSE plugins often conflict
    if (modA.toLowerCase().includes('skse') && modB.toLowerCase().includes('skse')) {
      rules.push({
        description: 'Both mods are SKSE plugins - potential compatibility issues',
        weight: 0.6
      });
    }

    // Rule: Multiple ENB presets conflict
    if (modA.toLowerCase().includes('enb') && modB.toLowerCase().includes('enb')) {
      rules.push({
        description: 'Multiple ENB presets should not be used together',
        weight: 0.9
      });
    }

    // Rule: Multiple weather mods
    if (this.checkSameCategory(modA, modB) && this.getCategory(modA) === 'environment') {
      rules.push({
        description: 'Multiple weather/environment mods may conflict',
        weight: 0.4
      });
    }

    return rules;
  }

  private getCategory(mod: string): string | null {
    return this.checkSameCategory(mod, mod) ? 'same' : null; // Simplified
  }
}