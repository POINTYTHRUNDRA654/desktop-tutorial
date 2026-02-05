/**
 * Compatibility Matrix Mining Engine
 * Builds dynamic compatibility databases from user reports and testing data
 */

import {
  CompatibilityMatrix,
  CompatibilityScore,
  CompatibilityEvidence,
  CompatibilityCluster,
  CompatibilityRule,
  CompatibilityData,
  CompatibilityMiningEngine as ICompatibilityMiningEngine
} from '../shared/types';

export class CompatibilityMiningEngine implements ICompatibilityMiningEngine {
  private compatibilityData: CompatibilityData[] = [];
  private matrix: CompatibilityMatrix | null = null;
  private rules: CompatibilityRule[] = [];

  async build(data: CompatibilityData[]): Promise<CompatibilityMatrix> {
    this.compatibilityData = data;
    this.matrix = await this.buildCompatibilityMatrix();
    this.matrix.clusters = await this.identifyClusters();
    this.matrix.rules = await this.extractRules();

    return this.matrix;
  }

  async query(modA: string, modB: string): Promise<CompatibilityScore> {
    if (!this.matrix) {
      return this.getDefaultCompatibilityScore(modA, modB);
    }

    const key = this.getMatrixKey(modA, modB);
    const score = this.matrix.matrix.get(modA)?.get(modB);

    if (score) {
      return score;
    }

    // Calculate compatibility on-the-fly if not in matrix
    return this.calculateCompatibility(modA, modB);
  }

  async update(newData: CompatibilityData): Promise<void> {
    this.compatibilityData.push(newData);

    // Update matrix incrementally
    const score = await this.calculateCompatibility(newData.modA, newData.modB);
    this.ensureModInMatrix(newData.modA);
    this.ensureModInMatrix(newData.modB);

    this.matrix!.matrix.get(newData.modA)!.set(newData.modB, score);
    this.matrix!.matrix.get(newData.modB)!.set(newData.modA, score);

    this.matrix!.lastUpdated = Date.now();
  }

  private async buildCompatibilityMatrix(): Promise<CompatibilityMatrix> {
    const matrix = new Map<string, Map<string, CompatibilityScore>>();
    const allMods = this.getAllMods();

    // Initialize matrix
    for (const modA of allMods) {
      matrix.set(modA, new Map<string, CompatibilityScore>());
      for (const modB of allMods) {
        if (modA !== modB) {
          const score = await this.calculateCompatibility(modA, modB);
          matrix.get(modA)!.set(modB, score);
        }
      }
    }

    return {
      matrix,
      clusters: [],
      rules: [],
      lastUpdated: Date.now(),
      dataPoints: this.compatibilityData.length
    };
  }

  private async calculateCompatibility(modA: string, modB: string): Promise<CompatibilityScore> {
    const relevantData = this.compatibilityData.filter(
      d => (d.modA === modA && d.modB === modB) || (d.modA === modB && d.modB === modA)
    );

    if (relevantData.length === 0) {
      return this.getDefaultCompatibilityScore(modA, modB);
    }

    // Calculate compatibility score based on evidence
    let totalWeight = 0;
    let weightedScore = 0;

    for (const data of relevantData) {
      const evidence = await this.generateEvidence(data);
      const weight = evidence.reduce((acc, e) => acc + e.weight, 0) / evidence.length;

      const score = data.compatible ? 1 : -1; // 1 for compatible, -1 for incompatible
      weightedScore += score * weight;
      totalWeight += weight;
    }

    const finalScore = totalWeight > 0 ? Math.max(-1, Math.min(1, weightedScore / totalWeight)) : 0;
    const confidence = Math.min(relevantData.length / 5, 1); // More data = higher confidence

    return {
      score: finalScore,
      confidence,
      evidence: await this.generateEvidence(relevantData[0]),
      testedVersions: relevantData.map(d => `${d.versions.modA}-${d.versions.modB}`),
      lastTested: Math.max(...relevantData.map(d => d.timestamp))
    };
  }

  private getDefaultCompatibilityScore(modA: string, modB: string): CompatibilityScore {
    // Default compatibility based on mod categories and known patterns
    const categoryA = this.categorizeMod(modA);
    const categoryB = this.categorizeMod(modB);

    let defaultScore = 0.5; // Neutral default
    let confidence = 0.1; // Low confidence for defaults

    // Same category mods are more likely to conflict
    if (categoryA === categoryB && categoryA !== 'utility') {
      defaultScore = 0.2; // More likely to have issues
      confidence = 0.3;
    }

    // Utility mods are generally compatible
    if (categoryA === 'utility' || categoryB === 'utility') {
      defaultScore = 0.8;
      confidence = 0.4;
    }

    // Known incompatible combinations
    if (this.isKnownIncompatible(modA, modB)) {
      defaultScore = -0.8;
      confidence = 0.8;
    }

    return {
      score: defaultScore,
      confidence,
      evidence: [{
        type: 'pattern_analysis',
        source: 'default',
        description: `Default compatibility based on mod categories: ${categoryA} + ${categoryB}`,
        weight: confidence
      }],
      testedVersions: [],
      lastTested: 0
    };
  }

  private async generateEvidence(data: CompatibilityData): Promise<CompatibilityEvidence[]> {
    const evidence: CompatibilityEvidence[] = [];

    // Historical evidence
    evidence.push({
      type: 'user_report',
      source: data.testedBy,
      description: data.compatible ?
        `${data.modA} and ${data.modB} reported as compatible` :
        `${data.modA} and ${data.modB} reported as incompatible`,
      weight: 0.7
    });

    // Issue-based evidence
    if (data.issues && data.issues.length > 0) {
      evidence.push({
        type: 'user_report',
        source: data.testedBy,
        description: `Issues reported: ${data.issues.join(', ')}`,
        weight: 0.8
      });
    }

    // Pattern-based evidence
    const similarPatterns = this.findSimilarPatterns(data);
    if (similarPatterns.length > 0) {
      evidence.push({
        type: 'pattern_analysis',
        source: 'historical',
        description: `Found ${similarPatterns.length} similar compatibility patterns`,
        weight: Math.min(similarPatterns.length * 0.1, 0.5)
      });
    }

    return evidence;
  }

  private async identifyClusters(): Promise<CompatibilityCluster[]> {
    if (!this.matrix) return [];

    const clusters: CompatibilityCluster[] = [];
    const processedMods = new Set<string>();

    for (const [modA, compatibilities] of this.matrix.matrix) {
      if (processedMods.has(modA)) continue;

      const clusterMods = [modA];
      processedMods.add(modA);

      // Find mods with high compatibility scores
      for (const [modB, score] of compatibilities) {
        if (!processedMods.has(modB) && score.score > 0.7 && score.confidence > 0.5) {
          clusterMods.push(modB);
          processedMods.add(modB);
        }
      }

      if (clusterMods.length > 1) {
        const avgCompatibility = this.calculateClusterCompatibility(clusterMods);

        clusters.push({
          id: `cluster-${clusters.length + 1}`,
          mods: clusterMods,
          compatibility: avgCompatibility,
          description: `Compatible mod cluster with ${clusterMods.length} mods`,
          recommended: avgCompatibility > 0.8
        });
      }
    }

    return clusters;
  }

  private calculateClusterCompatibility(mods: string[]): number {
    if (mods.length < 2) return 1;

    let totalScore = 0;
    let pairCount = 0;

    for (let i = 0; i < mods.length; i++) {
      for (let j = i + 1; j < mods.length; j++) {
        const score = this.matrix!.matrix.get(mods[i])!.get(mods[j]);
        if (score) {
          totalScore += score.score;
          pairCount++;
        }
      }
    }

    return pairCount > 0 ? totalScore / pairCount : 0;
  }

  private async extractRules(): Promise<CompatibilityRule[]> {
    const rules: CompatibilityRule[] = [];

    // Extract rules from compatibility data
    const categoryCompatibilities = this.analyzeCategoryCompatibilities();

    for (const [categoryPair, compatibility] of categoryCompatibilities) {
      const [catA, catB] = categoryPair.split('+');

      if (compatibility < 0.3) {
        rules.push({
          id: `rule-${rules.length + 1}`,
          condition: `mod.category == "${catA}" && other.category == "${catB}"`,
          action: 'warn',
          description: `${catA} and ${catB} mods have low compatibility (${(compatibility * 100).toFixed(0)}%)`,
          confidence: 0.7,
          examples: this.getExamplesForCategories(catA, catB)
        });
      }
    }

    // Add known rules
    rules.push(...this.getKnownCompatibilityRules());

    return rules;
  }

  private analyzeCategoryCompatibilities(): Map<string, number> {
    const categoryCompat = new Map<string, number>();

    for (const data of this.compatibilityData) {
      const catA = this.categorizeMod(data.modA);
      const catB = this.categorizeMod(data.modB);
      const key = [catA, catB].sort().join('+');

      const current = categoryCompat.get(key) || 0;
      const score = data.compatible ? 1 : 0;
      categoryCompat.set(key, (current + score) / 2); // Running average
    }

    return categoryCompat;
  }

  private getExamplesForCategories(catA: string, catB: string): string[] {
    const examples: string[] = [];

    for (const data of this.compatibilityData.slice(0, 3)) { // Limit to 3 examples
      const dataCatA = this.categorizeMod(data.modA);
      const dataCatB = this.categorizeMod(data.modB);

      if ((dataCatA === catA && dataCatB === catB) || (dataCatA === catB && dataCatB === catA)) {
        examples.push(`${data.modA} + ${data.modB}`);
      }
    }

    return examples;
  }

  private getKnownCompatibilityRules(): CompatibilityRule[] {
    return [
      {
        id: 'enb-conflict',
        condition: 'mod.name.contains("ENB") && other.name.contains("ENB")',
        action: 'block',
        description: 'Multiple ENB presets cannot be used together',
        confidence: 1.0,
        examples: ['ENB Series + Natural Lighting', 'ENB Series + Rudy ENB']
      },
      {
        id: 'skse-requirement',
        condition: 'mod.requires("SKSE") && !other.provides("SKSE")',
        action: 'warn',
        description: 'SKSE plugins require SKSE to be installed',
        confidence: 0.9,
        examples: ['SSE Engine Fixes + SKSE', 'SkyUI + SKSE']
      },
      {
        id: 'texture-compatibility',
        condition: 'mod.category == "texture" && other.category == "texture"',
        action: 'warn',
        description: 'Multiple texture mods may cause conflicts or performance issues',
        confidence: 0.6,
        examples: ['4K Textures + HD Textures', 'Realistic Lighting + Enhanced Lighting']
      }
    ];
  }

  private getAllMods(): string[] {
    const mods = new Set<string>();

    for (const data of this.compatibilityData) {
      mods.add(data.modA);
      mods.add(data.modB);
    }

    return Array.from(mods);
  }

  private getMatrixKey(modA: string, modB: string): string {
    return [modA, modB].sort().join('|');
  }

  private ensureModInMatrix(mod: string): void {
    if (!this.matrix!.matrix.has(mod)) {
      this.matrix!.matrix.set(mod, new Map<string, CompatibilityScore>());
    }
  }

  private categorizeMod(modName: string): string {
    const name = modName.toLowerCase();

    if (name.includes('texture') || name.includes('visual') || name.includes('hd') || name.includes('4k')) {
      return 'texture';
    } else if (name.includes('script') || name.includes('skse') || name.includes('utility')) {
      return 'utility';
    } else if (name.includes('quest') || name.includes('story') || name.includes('npc')) {
      return 'gameplay';
    } else if (name.includes('weather') || name.includes('lighting') || name.includes('environment')) {
      return 'environment';
    } else if (name.includes('sound') || name.includes('music') || name.includes('audio')) {
      return 'audio';
    }

    return 'other';
  }

  private isKnownIncompatible(modA: string, modB: string): boolean {
    const nameA = modA.toLowerCase();
    const nameB = modB.toLowerCase();

    // Multiple ENB presets
    if (nameA.includes('enb') && nameB.includes('enb')) {
      return true;
    }

    // Conflicting weather mods
    if ((nameA.includes('weather') && nameB.includes('weather')) &&
        (nameA.includes('overhaul') || nameB.includes('overhaul'))) {
      return true;
    }

    return false;
  }

  private findSimilarPatterns(data: CompatibilityData): CompatibilityData[] {
    return this.compatibilityData.filter(d => {
      const categoryMatch =
        this.categorizeMod(d.modA) === this.categorizeMod(data.modA) &&
        this.categorizeMod(d.modB) === this.categorizeMod(data.modB);

      const nameSimilarity =
        this.calculateNameSimilarity(d.modA, data.modA) > 0.5 &&
        this.calculateNameSimilarity(d.modB, data.modB) > 0.5;

      return categoryMatch || nameSimilarity;
    });
  }

  private calculateNameSimilarity(nameA: string, nameB: string): number {
    const a = nameA.toLowerCase();
    const b = nameB.toLowerCase();

    // Simple Jaccard similarity
    const wordsA = new Set(a.split(/\W+/));
    const wordsB = new Set(b.split(/\W+/));

    const intersection = new Set([...wordsA].filter(x => wordsB.has(x)));
    const union = new Set([...wordsA, ...wordsB]);

    return intersection.size / union.size;
  }
}