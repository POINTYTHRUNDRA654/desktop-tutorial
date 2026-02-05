/**
 * Perk/Power Mining Engine
 * Maps perk interactions and balance issues
 */

import {
  PerkPowerMiningEngine,
  PerkPowerAnalysis,
  PerkEffect,
  PerkInteraction,
  BalanceIssue,
  PerkModification,
  PerkChange,
  PerkAddition,
  ESPFile
} from '../shared/types';

export class PerkPowerMiningEngineImpl implements PerkPowerMiningEngine {
  async analyze(espFiles: ESPFile[]): Promise<PerkPowerAnalysis[]> {
    const analyses: PerkPowerAnalysis[] = [];

    for (const espFile of espFiles) {
      try {
        const perkAnalyses = await this.analyzeESPPerks(espFile);
        analyses.push(...perkAnalyses);
      } catch (error) {
        console.warn(`Failed to analyze perks in ${espFile.fileName}:`, error);
      }
    }

    return analyses;
  }

  private async analyzeESPPerks(espFile: ESPFile): Promise<PerkPowerAnalysis[]> {
    const analyses: PerkPowerAnalysis[] = [];

    if (!espFile.records) return analyses;

    // Find all perk records
    const perkRecords = espFile.records.filter(r => r.type === 'PERK');

    for (const perkRecord of perkRecords) {
      try {
        const analysis = await this.analyzePerk(perkRecord, espFile);
        if (analysis) {
          analyses.push(analysis);
        }
      } catch (error) {
        console.warn(`Failed to analyze perk ${perkRecord.formId}:`, error);
      }
    }

    return analyses;
  }

  private async analyzePerk(perkRecord: any, espFile: ESPFile): Promise<PerkPowerAnalysis | null> {
    const effects: PerkEffect[] = [];
    const modModifications: PerkModification[] = [];

    // Extract perk effects
    if (perkRecord.effects) {
      for (const effect of perkRecord.effects) {
        effects.push({
          effectType: this.categorizeEffect(effect.type),
          target: effect.target || 'unknown',
          magnitude: effect.magnitude || 0,
          conditions: effect.conditions || [],
          description: effect.description || 'No description'
        });
      }
    }

    // Record modification by this mod
    modModifications.push({
      modName: espFile.fileName,
      changes: [],
      additions: [{
        additionType: 'perk',
        formId: perkRecord.formId || 'unknown',
        description: `Added/modified perk: ${perkRecord.name || 'Unknown'}`
      }],
      timestamp: Date.now()
    });

    return {
      perkId: perkRecord.formId || 'unknown',
      perkName: perkRecord.name || 'Unknown Perk',
      effects,
      interactions: [], // Will be populated by detectInteractions
      balanceIssues: [], // Will be populated by balanceAnalysis
      modModifications
    };
  }

  private categorizeEffect(effectType: string): PerkEffect['effectType'] {
    const typeMap: Record<string, PerkEffect['effectType']> = {
      'Health': 'stat',
      'Magicka': 'stat',
      'Stamina': 'stat',
      'CarryWeight': 'stat',
      'DamageResist': 'resistance',
      'MagicResist': 'resistance',
      'FireResist': 'resistance',
      'OneHanded': 'skill',
      'TwoHanded': 'skill',
      'Archery': 'skill',
      'Block': 'skill',
      'Sneak': 'skill',
      'Lockpicking': 'skill',
      'Pickpocket': 'skill',
      'Alchemy': 'skill',
      'Speechcraft': 'skill',
      'Alteration': 'skill',
      'Conjuration': 'skill',
      'Destruction': 'skill',
      'Illusion': 'skill',
      'Restoration': 'skill',
      'Enchanting': 'skill',
      'Smithing': 'skill',
      'HeavyArmor': 'skill',
      'LightArmor': 'skill'
    };

    return typeMap[effectType] || 'misc';
  }

  async detectInteractions(perkAnalyses: PerkPowerAnalysis[]): Promise<PerkInteraction[]> {
    const interactions: PerkInteraction[] = [];

    // Analyze pairwise interactions
    for (let i = 0; i < perkAnalyses.length; i++) {
      for (let j = i + 1; j < perkAnalyses.length; j++) {
        const interaction = this.analyzePerkPair(perkAnalyses[i], perkAnalyses[j]);
        if (interaction) {
          interactions.push(interaction);
        }
      }
    }

    // Analyze perk stacking
    const stackingInteractions = this.analyzePerkStacking(perkAnalyses);
    interactions.push(...stackingInteractions);

    return interactions;
  }

  private analyzePerkPair(perkA: PerkPowerAnalysis, perkB: PerkPowerAnalysis): PerkInteraction | null {
    // Check for synergistic effects
    const synergyScore = this.calculateSynergy(perkA, perkB);
    if (synergyScore > 0.7) {
      return {
        interactingPerk: perkB.perkId,
        interactionType: 'synergy',
        description: `${perkA.perkName} and ${perkB.perkName} have synergistic effects`,
        impact: 'positive',
        magnitude: synergyScore
      };
    }

    // Check for conflicting effects
    const conflictScore = this.calculateConflict(perkA, perkB);
    if (conflictScore > 0.5) {
      return {
        interactingPerk: perkB.perkId,
        interactionType: 'conflict',
        description: `${perkA.perkName} and ${perkB.perkName} have conflicting effects`,
        impact: 'negative',
        magnitude: conflictScore
      };
    }

    return null;
  }

  private calculateSynergy(perkA: PerkPowerAnalysis, perkB: PerkPowerAnalysis): number {
    let synergy = 0;

    // Check for complementary skills
    const skillEffectsA = perkA.effects.filter(e => e.effectType === 'skill');
    const skillEffectsB = perkB.effects.filter(e => e.effectType === 'skill');

    for (const effectA of skillEffectsA) {
      for (const effectB of skillEffectsB) {
        if (this.areComplementarySkills(effectA.target, effectB.target)) {
          synergy += 0.3;
        }
      }
    }

    // Check for stat + resistance combinations
    const hasStatBoost = perkA.effects.some(e => e.effectType === 'stat') ||
                        perkB.effects.some(e => e.effectType === 'stat');
    const hasResistance = perkA.effects.some(e => e.effectType === 'resistance') ||
                         perkB.effects.some(e => e.effectType === 'resistance');

    if (hasStatBoost && hasResistance) {
      synergy += 0.4;
    }

    return Math.min(synergy, 1.0);
  }

  private calculateConflict(perkA: PerkPowerAnalysis, perkB: PerkPowerAnalysis): number {
    let conflict = 0;

    // Check for same target effects with opposite directions
    for (const effectA of perkA.effects) {
      for (const effectB of perkB.effects) {
        if (effectA.target === effectB.target &&
            effectA.effectType === effectB.effectType &&
            Math.sign(effectA.magnitude) !== Math.sign(effectB.magnitude)) {
          conflict += 0.6;
        }
      }
    }

    return Math.min(conflict, 1.0);
  }

  private areComplementarySkills(skillA: string, skillB: string): boolean {
    const complementaryPairs = [
      ['OneHanded', 'Block'],
      ['TwoHanded', 'HeavyArmor'],
      ['Archery', 'Sneak'],
      ['Lockpicking', 'Pickpocket'],
      ['Alchemy', 'Restoration'],
      ['Enchanting', 'Alteration'],
      ['Smithing', 'HeavyArmor'],
      ['LightArmor', 'Sneak']
    ];

    return complementaryPairs.some(pair =>
      (pair[0] === skillA && pair[1] === skillB) ||
      (pair[0] === skillB && pair[1] === skillA)
    );
  }

  private analyzePerkStacking(perkAnalyses: PerkPowerAnalysis[]): PerkInteraction[] {
    const interactions: PerkInteraction[] = [];

    // Group perks by effect target
    const effectGroups = new Map<string, PerkPowerAnalysis[]>();

    for (const analysis of perkAnalyses) {
      for (const effect of analysis.effects) {
        const key = `${effect.effectType}:${effect.target}`;
        if (!effectGroups.has(key)) {
          effectGroups.set(key, []);
        }
        effectGroups.get(key)!.push(analysis);
      }
    }

    // Find stacking opportunities
    for (const [effectKey, perks] of effectGroups) {
      if (perks.length > 1) {
        const perkNames = perks.map(p => p.perkName);
        interactions.push({
          interactingPerk: perks[1].perkId, // Reference the second perk
          interactionType: 'stacking',
          description: `Multiple perks affect ${effectKey}: ${perkNames.join(', ')}`,
          impact: 'positive',
          magnitude: Math.min(perks.length * 0.2, 1.0)
        });
      }
    }

    return interactions;
  }

  async balanceAnalysis(perkAnalyses: PerkPowerAnalysis[]): Promise<BalanceIssue[]> {
    const issues: BalanceIssue[] = [];

    for (const analysis of perkAnalyses) {
      // Check for overpowered perks
      const overpoweredIssue = this.checkOverpowered(analysis);
      if (overpoweredIssue) {
        issues.push(overpoweredIssue);
      }

      // Check for underpowered perks
      const underpoweredIssue = this.checkUnderpowered(analysis);
      if (underpoweredIssue) {
        issues.push(underpoweredIssue);
      }

      // Check for exploitable combinations
      const exploitableIssues = this.checkExploitable(analysis, perkAnalyses);
      issues.push(...exploitableIssues);
    }

    return issues;
  }

  private checkOverpowered(perk: PerkPowerAnalysis): BalanceIssue | null {
    let powerScore = 0;

    // Calculate power based on effects
    for (const effect of perk.effects) {
      switch (effect.effectType) {
        case 'stat':
          powerScore += Math.abs(effect.magnitude) * 2;
          break;
        case 'resistance':
          powerScore += Math.abs(effect.magnitude) * 1.5;
          break;
        case 'skill':
          powerScore += Math.abs(effect.magnitude) * 1.8;
          break;
        case 'ability':
          powerScore += Math.abs(effect.magnitude) * 3;
          break;
      }
    }

    if (powerScore > 15) { // Threshold for overpowered
      return {
        issueType: 'overpowered',
        description: `${perk.perkName} has very high power score (${powerScore.toFixed(1)})`,
        severity: powerScore > 25 ? 'high' : 'medium',
        affectedBuilds: this.identifyAffectedBuilds(perk),
        suggestedFix: 'Reduce effect magnitudes or add requirements'
      };
    }

    return null;
  }

  private checkUnderpowered(perk: PerkPowerAnalysis): BalanceIssue | null {
    let powerScore = 0;

    // Calculate power based on effects
    for (const effect of perk.effects) {
      switch (effect.effectType) {
        case 'stat':
          powerScore += Math.abs(effect.magnitude) * 2;
          break;
        case 'resistance':
          powerScore += Math.abs(effect.magnitude) * 1.5;
          break;
        case 'skill':
          powerScore += Math.abs(effect.magnitude) * 1.8;
          break;
        case 'ability':
          powerScore += Math.abs(effect.magnitude) * 3;
          break;
      }
    }

    if (powerScore < 3) { // Threshold for underpowered
      return {
        issueType: 'underpowered',
        description: `${perk.perkName} has very low power score (${powerScore.toFixed(1)})`,
        severity: 'low',
        affectedBuilds: this.identifyAffectedBuilds(perk),
        suggestedFix: 'Increase effect magnitudes or add additional effects'
      };
    }

    return null;
  }

  private checkExploitable(perk: PerkPowerAnalysis, allPerks: PerkPowerAnalysis[]): BalanceIssue[] {
    const issues: BalanceIssue[] = [];

    // Check for infinite loops or broken mechanics
    for (const effect of perk.effects) {
      if (effect.magnitude > 1000) { // Unrealistic values
        issues.push({
          issueType: 'exploitable',
          description: `${perk.perkName} has unrealistic effect magnitude (${effect.magnitude})`,
          severity: 'high',
          affectedBuilds: ['any'],
          suggestedFix: 'Reduce magnitude to reasonable values'
        });
      }
    }

    // Check for perk loops (perk that boosts itself)
    for (const effect of perk.effects) {
      if (effect.target === perk.perkName && effect.magnitude > 0) {
        issues.push({
          issueType: 'exploitable',
          description: `${perk.perkName} creates a self-reinforcing loop`,
          severity: 'medium',
          affectedBuilds: ['any'],
          suggestedFix: 'Remove self-referencing effects'
        });
      }
    }

    return issues;
  }

  private identifyAffectedBuilds(perk: PerkPowerAnalysis): string[] {
    const builds: string[] = [];

    // Simple heuristic based on effect types
    const hasCombatEffects = perk.effects.some(e =>
      ['OneHanded', 'TwoHanded', 'Archery', 'Block', 'HeavyArmor', 'LightArmor'].includes(e.target)
    );
    const hasMagicEffects = perk.effects.some(e =>
      ['Alteration', 'Conjuration', 'Destruction', 'Illusion', 'Restoration'].includes(e.target)
    );
    const hasStealthEffects = perk.effects.some(e =>
      ['Sneak', 'Lockpicking', 'Pickpocket'].includes(e.target)
    );

    if (hasCombatEffects) builds.push('combat');
    if (hasMagicEffects) builds.push('magic');
    if (hasStealthEffects) builds.push('stealth');

    return builds.length > 0 ? builds : ['general'];
  }
}