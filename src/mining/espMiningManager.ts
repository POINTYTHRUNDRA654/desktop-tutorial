import * as path from 'path';
import { parsePluginDeep, ParsedPlugin } from '../electron/espRecordParser';
import { FormIDRelationshipMiningEngineImpl } from './formid-relationship-mining-engine';
import { CellWorldspaceMiningEngineImpl } from './cell-worldspace-mining-engine';
import { QuestObjectiveMiningEngineImpl } from './quest-objective-mining-engine';
import { ESPFile, ESPRecord } from '../shared/types';

/**
 * Builds the ESPFile/ESPRecord shape these 3 mining engines expect out of the
 * real, verified-format data parsePluginDeep() extracts (see espRecordParser.ts
 * for what's actually parsed vs. left honestly empty — quest objective/alias
 * data has no verified spec and is not fabricated here).
 */
function toEspFile(parsed: ParsedPlugin): ESPFile {
  const records: ESPRecord[] = [];

  for (const cell of parsed.cells) {
    records.push({
      type: 'CELL',
      formId: cell.formId,
      editorId: cell.editorId ?? undefined,
      name: cell.fullName ?? cell.editorId ?? undefined,
      flags: 0,
      fields: [],
      cellId: cell.formId
    });
  }

  for (const ref of parsed.refs) {
    records.push({
      type: 'REFR',
      formId: ref.formId,
      flags: 0,
      fields: [],
      cellId: ref.cellFormId ?? undefined,
      isAddition: !ref.isDeletion,
      isDeletion: ref.isDeletion,
      baseObject: ref.baseFormId != null ? ref.baseFormId.toString(16) : undefined,
      position: ref.position ?? undefined
    });
  }

  for (const quest of parsed.quests) {
    records.push({
      type: 'QUST',
      formId: quest.formId,
      editorId: quest.editorId ?? undefined,
      name: quest.fullName ?? quest.editorId ?? undefined,
      flags: 0,
      fields: []
    });
  }

  const refsByFormId = new Map<number, number[]>();
  for (const entry of parsed.formIdRefs) {
    refsByFormId.set(entry.formId, entry.references);
  }
  for (const record of records) {
    const refs = refsByFormId.get(record.formId);
    if (refs) record.references = refs;
  }

  return {
    fileName: parsed.fileName,
    header: { type: 'TES4', formId: 0, flags: 0, fields: [] },
    records,
    masters: [],
    formIdMap: new Map(records.map(r => [r.formId, r]))
  };
}

export interface EspMiningResult {
  pluginsAnalyzed: string[];
  formIdRelationships: {
    maps: any[];
    conflicts: any[];
    dependencyGraph: any;
  };
  cellWorldspace: {
    analyses: any[];
    conflicts: any[];
    optimizations: any[];
  };
  questObjectives: {
    analyses: any[];
    conflicts: any[];
    dependencyGraph: any;
  };
}

export class EspMiningManager {
  private formIdEngine = new FormIDRelationshipMiningEngineImpl();
  private cellEngine = new CellWorldspaceMiningEngineImpl();
  private questEngine = new QuestObjectiveMiningEngineImpl();

  async analyzePlugins(pluginPaths: string[]): Promise<EspMiningResult> {
    const espFiles = pluginPaths.map(p => toEspFile(parsePluginDeep(p)));

    const formIdMaps = await this.formIdEngine.analyze(espFiles);
    const formIdConflicts = await this.formIdEngine.findConflicts(formIdMaps);
    const formIdDependencyGraph = await this.formIdEngine.buildDependencyGraph(formIdMaps);

    const cellAnalyses = await this.cellEngine.analyze(espFiles, []);
    const cellConflicts = await this.cellEngine.detectConflicts(cellAnalyses);
    const cellOptimizations = await this.cellEngine.optimizeLayout(cellAnalyses);

    const questAnalyses = await this.questEngine.analyze(espFiles);
    const questConflicts = await this.questEngine.detectConflicts(questAnalyses);
    const questDependencyGraph = await this.questEngine.buildDependencyGraph(questAnalyses);

    return {
      pluginsAnalyzed: pluginPaths.map(p => path.basename(p)),
      formIdRelationships: { maps: formIdMaps, conflicts: formIdConflicts, dependencyGraph: formIdDependencyGraph },
      cellWorldspace: { analyses: cellAnalyses, conflicts: cellConflicts, optimizations: cellOptimizations },
      questObjectives: { analyses: questAnalyses, conflicts: questConflicts, dependencyGraph: questDependencyGraph }
    };
  }
}
