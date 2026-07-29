/**
 * Advanced Analysis Engine
 * Orchestrates pattern recognition, bottleneck mining, and compatibility matrix mining.
 *
 * Hardware-awareness, ML conflict prediction, and memory-bottleneck analysis now live
 * for real in the Phase 2 Mining Dashboard (src/mining/phase2MiningManager.ts) — the
 * engines that used to cover those here (conflict-prediction-engine.ts,
 * memory-analysis-engine.ts, hardware-specific-mining-engine.ts) fabricated their
 * output (random scores, random hardware) and have been removed rather than kept as a
 * fake duplicate. load-order/mesh/texture optimization engines were unreachable from
 * any UI and would have needed real NIF/DDS parsing infrastructure to fix properly, so
 * they were removed too rather than left as dead, fake code.
 */

import {
  HistoricalData
} from '../shared/types';
import { PatternRecognitionEngine } from './pattern-recognition-engine';
import { BottleneckMiningEngine } from './bottleneck-mining-engine';
import { CompatibilityMiningEngine as CompatibilityMiningEngineClass } from './compatibility-mining-engine';
import { FormIDRelationshipMiningEngineImpl } from './formid-relationship-mining-engine';
import { CellWorldspaceMiningEngineImpl } from './cell-worldspace-mining-engine';
import { QuestObjectiveMiningEngineImpl } from './quest-objective-mining-engine';
import { PerkPowerMiningEngineImpl } from './perk-power-mining-engine';
import { IniParameterMiningEngineImpl } from './ini-parameter-mining-engine';
import { ModdingKnowledgeMiningEngineImpl } from './modding-knowledge-mining-engine';
import { PatchCompatibilityMiningEngineImpl } from './patch-compatibility-mining-engine';
import { VersionCompatibilityMiningEngineImpl } from './version-compatibility-mining-engine';

export class AdvancedAnalysisEngineImpl {
  public readonly patternRecognition: PatternRecognitionEngine;
  public readonly bottleneckMining: BottleneckMiningEngine;
  public readonly compatibilityMining: CompatibilityMiningEngineClass;
  public readonly formIdRelationshipMining: FormIDRelationshipMiningEngineImpl;
  public readonly cellWorldspaceMining: CellWorldspaceMiningEngineImpl;
  public readonly questObjectiveMining: QuestObjectiveMiningEngineImpl;
  public readonly perkPowerMining: PerkPowerMiningEngineImpl;
  public readonly iniParameterMining: IniParameterMiningEngineImpl;
  public readonly moddingKnowledgeMining: ModdingKnowledgeMiningEngineImpl;
  public readonly patchCompatibilityMining: PatchCompatibilityMiningEngineImpl;
  public readonly versionCompatibilityMining: VersionCompatibilityMiningEngineImpl;

  constructor() {
    this.patternRecognition = new PatternRecognitionEngine();
    this.bottleneckMining = new BottleneckMiningEngine();
    this.compatibilityMining = new CompatibilityMiningEngineClass();
    this.formIdRelationshipMining = new FormIDRelationshipMiningEngineImpl();
    this.cellWorldspaceMining = new CellWorldspaceMiningEngineImpl();
    this.questObjectiveMining = new QuestObjectiveMiningEngineImpl();
    this.perkPowerMining = new PerkPowerMiningEngineImpl();
    this.iniParameterMining = new IniParameterMiningEngineImpl();
    this.moddingKnowledgeMining = new ModdingKnowledgeMiningEngineImpl();
    this.patchCompatibilityMining = new PatchCompatibilityMiningEngineImpl();
    this.versionCompatibilityMining = new VersionCompatibilityMiningEngineImpl();
  }

  /**
   * Train the models that support training with historical data
   */
  async trainAllModels(data: {
    patternData?: HistoricalData[];
  }): Promise<void> {
    if (data.patternData) {
      await this.patternRecognition.train(data.patternData);
    }
  }

  /**
   * Get status of the live analysis engines
   */
  async getEngineStatus(): Promise<{
    patternEngine: boolean;
    bottleneckMining: boolean;
    compatibilityMatrix: boolean;
  }> {
    const patternStatus = await this.patternRecognition.getPatterns().then(() => true).catch(() => false);

    return {
      patternEngine: patternStatus,
      bottleneckMining: true, // Always available (rule-based)
      compatibilityMatrix: true // Always available (can build from scratch)
    };
  }
}
