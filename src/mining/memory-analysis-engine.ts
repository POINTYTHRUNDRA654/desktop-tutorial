/**
 * Memory Analysis Engine
 * Tracks VRAM and system RAM usage patterns across load orders
 */

import {
  MemoryAnalysis,
  VRAMUsage,
  RAMUsage,
  MemoryPattern,
  MemoryRecommendation,
  MemoryLeak,
  MemoryData,
  MemorySnapshot,
  SessionData,
  MemoryAnalysisEngine as IMemoryAnalysisEngine,
  MemoryTrend
} from '../shared/types';

export class MemoryAnalysisEngine implements IMemoryAnalysisEngine {
  private readonly VRAM_WARNING_THRESHOLD = 0.85; // 85% VRAM usage
  private readonly RAM_WARNING_THRESHOLD = 0.90; // 90% system RAM usage
  private readonly LEAK_DETECTION_THRESHOLD = 50; // 50MB/hour growth rate

  async analyze(memoryData: MemoryData): Promise<MemoryAnalysis> {
    const vramUsage = await this.analyzeVRAMUsage(memoryData);
    const systemRamUsage = await this.analyzeSystemRAMUsage(memoryData);
    const memoryPatterns = await this.detectMemoryPatterns(memoryData);
    const recommendations = await this.generateMemoryRecommendations(memoryData, vramUsage, systemRamUsage);
    const leakDetection = await this.detectMemoryLeaks(memoryData);

    return {
      vramUsage,
      systemRamUsage,
      memoryPatterns,
      recommendations,
      leakDetection
    };
  }

  async track(sessionData: SessionData): Promise<MemoryTrend[]> {
    // Track memory usage over the session
    const trends: MemoryTrend[] = [];

    // This would typically collect data in real-time during gameplay
    // For now, return mock trends based on session data

    const duration = sessionData.endTime - sessionData.startTime;
    const intervals = Math.max(1, Math.floor(duration / (1000 * 60))); // Every minute

    for (let i = 0; i <= intervals; i++) {
      const timestamp = sessionData.startTime + (i * duration / intervals);
      const progress = i / intervals;

      // Simulate memory usage pattern (gradual increase with some variation)
      const baseUsage = sessionData.peakVRAM * (0.7 + 0.3 * progress); // 70% to 100% of peak
      const variation = (Math.random() - 0.5) * 0.1 * sessionData.peakVRAM; // ±5% variation
      const usage = Math.max(0, baseUsage + variation);

      trends.push({
        timestamp,
        usage: Math.round(usage),
        context: `Session progress: ${(progress * 100).toFixed(0)}%`
      });
    }

    return trends;
  }

  private async analyzeVRAMUsage(memoryData: MemoryData): Promise<VRAMUsage> {
    const total = this.calculateTotalVRAMUsage(memoryData.vramSnapshots);
    const byMod = await this.calculateVRAMByMod(memoryData);
    const byAssetType = await this.calculateVRAMByAssetType(memoryData);
    const peakUsage = this.calculatePeakVRAMUsage(memoryData.vramSnapshots);
    const averageUsage = this.calculateAverageVRAMUsage(memoryData.vramSnapshots);
    const trends = await this.calculateVRAMTrends(memoryData);

    return {
      total,
      byMod,
      byAssetType,
      peakUsage,
      averageUsage,
      trends
    };
  }

  private async analyzeSystemRAMUsage(memoryData: MemoryData): Promise<RAMUsage> {
    const total = this.calculateTotalRAMUsage(memoryData.ramSnapshots);
    const byMod = await this.calculateRAMByMod(memoryData);
    const byComponent = await this.calculateRAMByComponent(memoryData);
    const peakUsage = this.calculatePeakRAMUsage(memoryData.ramSnapshots);
    const averageUsage = this.calculateAverageRAMUsage(memoryData.ramSnapshots);
    const trends = await this.calculateRAMTrends(memoryData);

    return {
      total,
      byMod,
      byComponent,
      peakUsage,
      averageUsage,
      trends
    };
  }

  private calculateTotalVRAMUsage(snapshots: MemorySnapshot[]): number {
    if (snapshots.length === 0) return 0;
    return snapshots[snapshots.length - 1].usage; // Latest snapshot
  }

  private calculateTotalRAMUsage(snapshots: MemorySnapshot[]): number {
    if (snapshots.length === 0) return 0;
    return snapshots[snapshots.length - 1].usage; // Latest snapshot
  }

  private async calculateVRAMByMod(memoryData: MemoryData): Promise<Map<string, number>> {
    const byMod = new Map<string, number>();

    // Estimate VRAM usage per mod based on asset types and known patterns
    for (const mod of memoryData.modLoadOrder) {
      let estimatedUsage = 0;

      // Base estimation logic (would be more sophisticated in practice)
      if (mod.toLowerCase().includes('texture') || mod.toLowerCase().includes('hd')) {
        estimatedUsage = 1024 + Math.random() * 2048; // 1-3GB for texture mods
      } else if (mod.toLowerCase().includes('mesh') || mod.toLowerCase().includes('model')) {
        estimatedUsage = 256 + Math.random() * 512; // 256MB-768MB for mesh mods
      } else {
        estimatedUsage = 64 + Math.random() * 128; // 64-192MB for other mods
      }

      byMod.set(mod, Math.round(estimatedUsage));
    }

    return byMod;
  }

  private async calculateRAMByMod(memoryData: MemoryData): Promise<Map<string, number>> {
    const byMod = new Map<string, number>();

    // Estimate system RAM usage per mod
    for (const mod of memoryData.modLoadOrder) {
      let estimatedUsage = 0;

      // Scripts and quests use more RAM
      if (mod.toLowerCase().includes('script') || mod.toLowerCase().includes('quest')) {
        estimatedUsage = 128 + Math.random() * 256; // 128-384MB
      } else if (mod.toLowerCase().includes('npc') || mod.toLowerCase().includes('creature')) {
        estimatedUsage = 256 + Math.random() * 512; // 256-768MB
      } else {
        estimatedUsage = 32 + Math.random() * 64; // 32-96MB
      }

      byMod.set(mod, Math.round(estimatedUsage));
    }

    return byMod;
  }

  private async calculateVRAMByAssetType(memoryData: MemoryData): Promise<Map<string, number>> {
    const byAssetType = new Map<string, number>();

    // Categorize VRAM usage by asset type
    byAssetType.set('textures', 0);
    byAssetType.set('meshes', 0);
    byAssetType.set('animations', 0);
    byAssetType.set('other', 0);

    for (const mod of memoryData.modLoadOrder) {
      const modVram = await this.estimateModVRAMUsage(mod);

      if (mod.toLowerCase().includes('texture')) {
        byAssetType.set('textures', byAssetType.get('textures')! + modVram * 0.8);
      } else if (mod.toLowerCase().includes('mesh') || mod.toLowerCase().includes('model')) {
        byAssetType.set('meshes', byAssetType.get('meshes')! + modVram * 0.6);
      } else if (mod.toLowerCase().includes('animation') || mod.toLowerCase().includes('anim')) {
        byAssetType.set('animations', byAssetType.get('animations')! + modVram * 0.4);
      } else {
        byAssetType.set('other', byAssetType.get('other')! + modVram * 0.2);
      }
    }

    // Round values
    for (const [type, usage] of byAssetType) {
      byAssetType.set(type, Math.round(usage));
    }

    return byAssetType;
  }

  private async calculateRAMByComponent(memoryData: MemoryData): Promise<Map<string, number>> {
    const byComponent = new Map<string, number>();

    byComponent.set('scripts', 0);
    byComponent.set('assets', 0);
    byComponent.set('ui', 0);
    byComponent.set('other', 0);

    for (const mod of memoryData.modLoadOrder) {
      const modRam = await this.estimateModRAMUsage(mod);

      if (mod.toLowerCase().includes('script') || mod.toLowerCase().includes('quest')) {
        byComponent.set('scripts', byComponent.get('scripts')! + modRam * 0.7);
      } else if (mod.toLowerCase().includes('ui') || mod.toLowerCase().includes('interface')) {
        byComponent.set('ui', byComponent.get('ui')! + modRam * 0.8);
      } else if (mod.toLowerCase().includes('texture') || mod.toLowerCase().includes('mesh')) {
        byComponent.set('assets', byComponent.get('assets')! + modRam * 0.6);
      } else {
        byComponent.set('other', byComponent.get('other')! + modRam * 0.3);
      }
    }

    // Round values
    for (const [component, usage] of byComponent) {
      byComponent.set(component, Math.round(usage));
    }

    return byComponent;
  }

  private calculatePeakVRAMUsage(snapshots: MemorySnapshot[]): number {
    if (snapshots.length === 0) return 0;
    return Math.max(...snapshots.map(s => s.usage));
  }

  private calculatePeakRAMUsage(snapshots: MemorySnapshot[]): number {
    if (snapshots.length === 0) return 0;
    return Math.max(...snapshots.map(s => s.usage));
  }

  private calculateAverageVRAMUsage(snapshots: MemorySnapshot[]): number {
    if (snapshots.length === 0) return 0;
    const total = snapshots.reduce((acc, s) => acc + s.usage, 0);
    return Math.round(total / snapshots.length);
  }

  private calculateAverageRAMUsage(snapshots: MemorySnapshot[]): number {
    if (snapshots.length === 0) return 0;
    const total = snapshots.reduce((acc, s) => acc + s.usage, 0);
    return Math.round(total / snapshots.length);
  }

  private async calculateVRAMTrends(memoryData: MemoryData): Promise<MemoryTrend[]> {
    return this.calculateMemoryTrends(memoryData.vramSnapshots, 'VRAM');
  }

  private async calculateRAMTrends(memoryData: MemoryData): Promise<MemoryTrend[]> {
    return this.calculateMemoryTrends(memoryData.ramSnapshots, 'RAM');
  }

  private calculateMemoryTrends(snapshots: MemorySnapshot[], type: string): MemoryTrend[] {
    return snapshots.map(snapshot => ({
      timestamp: snapshot.timestamp,
      usage: snapshot.usage,
      context: `${type} usage during session`
    }));
  }

  private async estimateModVRAMUsage(modName: string): Promise<number> {
    // Simple estimation based on mod name keywords
    const name = modName.toLowerCase();

    if (name.includes('4k') || name.includes('8k')) {
      return 2048 + Math.random() * 3072; // 2-5GB
    } else if (name.includes('2k') || name.includes('hd')) {
      return 1024 + Math.random() * 2048; // 1-3GB
    } else if (name.includes('texture')) {
      return 512 + Math.random() * 1024; // 512MB-1.5GB
    } else if (name.includes('mesh') || name.includes('model')) {
      return 128 + Math.random() * 256; // 128-384MB
    }

    return 64 + Math.random() * 128; // 64-192MB default
  }

  private async estimateModRAMUsage(modName: string): Promise<number> {
    // Simple estimation based on mod name keywords
    const name = modName.toLowerCase();

    if (name.includes('script') || name.includes('quest')) {
      return 256 + Math.random() * 512; // 256MB-768MB
    } else if (name.includes('npc') || name.includes('creature')) {
      return 128 + Math.random() * 256; // 128-384MB
    } else if (name.includes('ui') || name.includes('interface')) {
      return 64 + Math.random() * 128; // 64-192MB
    }

    return 32 + Math.random() * 64; // 32-96MB default
  }

  private async detectMemoryPatterns(memoryData: MemoryData): Promise<MemoryPattern[]> {
    const patterns: MemoryPattern[] = [];

    // Detect allocation patterns
    const allocationPattern = await this.detectAllocationPattern(memoryData);
    if (allocationPattern) patterns.push(allocationPattern);

    // Detect deallocation patterns
    const deallocationPattern = await this.detectDeallocationPattern(memoryData);
    if (deallocationPattern) patterns.push(deallocationPattern);

    // Detect fragmentation patterns
    const fragmentationPattern = await this.detectFragmentationPattern(memoryData);
    if (fragmentationPattern) patterns.push(fragmentationPattern);

    return patterns;
  }

  private async detectAllocationPattern(memoryData: MemoryData): Promise<MemoryPattern | null> {
    const vramSnapshots = memoryData.vramSnapshots;
    if (vramSnapshots.length < 3) return null;

    // Look for sudden allocation spikes
    const allocations: number[] = [];
    for (let i = 1; i < vramSnapshots.length; i++) {
      const delta = vramSnapshots[i].usage - vramSnapshots[i - 1].usage;
      if (delta > 100) { // >100MB sudden allocation
        allocations.push(delta);
      }
    }

    if (allocations.length > 0) {
      const avgAllocation = allocations.reduce((a, b) => a + b, 0) / allocations.length;

      return {
        type: 'allocation',
        description: `Sudden memory allocations detected (avg: ${avgAllocation.toFixed(0)}MB)`,
        frequency: allocations.length / vramSnapshots.length,
        impact: avgAllocation,
        affectedMods: memoryData.modLoadOrder
      };
    }

    return null;
  }

  private async detectDeallocationPattern(memoryData: MemoryData): Promise<MemoryPattern | null> {
    const vramSnapshots = memoryData.vramSnapshots;
    if (vramSnapshots.length < 3) return null;

    // Look for memory not being freed
    let totalDeallocated = 0;
    let deallocationEvents = 0;

    for (let i = 1; i < vramSnapshots.length; i++) {
      const delta = vramSnapshots[i].usage - vramSnapshots[i - 1].usage;
      if (delta < -50) { // >50MB deallocation
        totalDeallocated += Math.abs(delta);
        deallocationEvents++;
      }
    }

    if (deallocationEvents > 0) {
      const avgDeallocation = totalDeallocated / deallocationEvents;

      return {
        type: 'deallocation',
        description: `Memory deallocations detected (avg: ${avgDeallocation.toFixed(0)}MB)`,
        frequency: deallocationEvents / vramSnapshots.length,
        impact: -avgDeallocation, // Negative impact means memory freed
        affectedMods: memoryData.modLoadOrder
      };
    }

    return null;
  }

  private async detectFragmentationPattern(memoryData: MemoryData): Promise<MemoryPattern | null> {
    // Detect memory fragmentation through usage pattern analysis
    const vramSnapshots = memoryData.vramSnapshots;
    if (vramSnapshots.length < 5) return null;

    // Calculate variance in memory usage (high variance may indicate fragmentation)
    const usages = vramSnapshots.map(s => s.usage);
    const mean = usages.reduce((a, b) => a + b, 0) / usages.length;
    const variance = usages.reduce((acc, usage) => acc + Math.pow(usage - mean, 2), 0) / usages.length;
    const stdDev = Math.sqrt(variance);

    const coefficientOfVariation = stdDev / mean;

    if (coefficientOfVariation > 0.2) { // >20% variation
      return {
        type: 'fragmentation',
        description: `High memory usage variation detected (${(coefficientOfVariation * 100).toFixed(1)}% CV)`,
        frequency: 1.0, // Continuous pattern
        impact: stdDev, // Impact is the amount of variation
        affectedMods: memoryData.modLoadOrder
      };
    }

    return null;
  }

  private async generateMemoryRecommendations(
    memoryData: MemoryData,
    vramUsage: VRAMUsage,
    ramUsage: RAMUsage
  ): Promise<MemoryRecommendation[]> {
    const recommendations: MemoryRecommendation[] = [];

    // VRAM recommendations
    if (vramUsage.peakUsage > 0) {
      const vramUtilization = vramUsage.peakUsage / 8192; // Assuming 8GB VRAM

      if (vramUtilization > this.VRAM_WARNING_THRESHOLD) {
        recommendations.push({
          type: 'reduce',
          description: `VRAM usage is high (${(vramUtilization * 100).toFixed(1)}%). Consider reducing texture resolutions.`,
          potentialSavings: Math.round(vramUsage.peakUsage * 0.3),
          affectedMods: Array.from(vramUsage.byMod.keys()).filter(mod =>
            (vramUsage.byMod.get(mod) || 0) > 512
          )
        });
      }
    }

    // RAM recommendations
    if (ramUsage.peakUsage > 0) {
      const ramUtilization = ramUsage.peakUsage / (16 * 1024); // Assuming 16GB system RAM

      if (ramUtilization > this.RAM_WARNING_THRESHOLD) {
        recommendations.push({
          type: 'optimize',
          description: `System RAM usage is critical (${(ramUtilization * 100).toFixed(1)}%). Consider script optimization.`,
          potentialSavings: Math.round(ramUsage.peakUsage * 0.2),
          affectedMods: Array.from(ramUsage.byMod.keys()).filter(mod =>
            (ramUsage.byMod.get(mod) || 0) > 128
          )
        });
      }
    }

    // Mod-specific recommendations
    for (const [mod, vram] of vramUsage.byMod) {
      if (vram > 1536) { // >1.5GB VRAM per mod
        recommendations.push({
          type: 'reorder',
          description: `${mod} uses ${vram}MB VRAM. Consider using lighter alternatives.`,
          potentialSavings: Math.round(vram * 0.5),
          affectedMods: [mod]
        });
      }
    }

    return recommendations;
  }

  private async detectMemoryLeaks(memoryData: MemoryData): Promise<MemoryLeak[]> {
    const leaks: MemoryLeak[] = [];

    // Analyze VRAM for leaks
    const vramLeaks = await this.detectLeaksInSnapshots(memoryData.vramSnapshots, 'VRAM');
    leaks.push(...vramLeaks);

    // Analyze RAM for leaks
    const ramLeaks = await this.detectLeaksInSnapshots(memoryData.ramSnapshots, 'RAM');
    leaks.push(...ramLeaks);

    return leaks;
  }

  private async detectLeaksInSnapshots(snapshots: MemorySnapshot[], type: string): Promise<MemoryLeak[]> {
    const leaks: MemoryLeak[] = [];

    if (snapshots.length < 3) return leaks;

    // Calculate memory growth rate
    const growthRate = this.calculateMemoryGrowthRate(snapshots);

    if (growthRate > this.LEAK_DETECTION_THRESHOLD) {
      // Identify which mods are likely causing the leak
      const suspectMods: string[] = [];

      // Simple heuristic: mods loaded later in the session are more likely suspects
      // In practice, this would use more sophisticated analysis

      leaks.push({
        modName: suspectMods.length > 0 ? suspectMods[0] : 'Unknown',
        leakType: type === 'VRAM' ? 'asset' : 'script',
        estimatedSize: Math.round(growthRate * 0.1), // Estimate 10% of growth rate as leak size
        evidence: [
          `${type} growing at ${growthRate.toFixed(1)}MB/hour`,
          `Pattern detected over ${snapshots.length} measurements`
        ],
        confidence: Math.min(growthRate / (this.LEAK_DETECTION_THRESHOLD * 2), 1.0)
      });
    }

    return leaks;
  }

  private calculateMemoryGrowthRate(snapshots: MemorySnapshot[]): number {
    if (snapshots.length < 2) return 0;

    const first = snapshots[0];
    const last = snapshots[snapshots.length - 1];
    const timeDiff = (last.timestamp - first.timestamp) / (1000 * 60 * 60); // hours

    if (timeDiff <= 0) return 0;

    const memoryDiff = last.usage - first.usage;
    return memoryDiff / timeDiff; // MB per hour
  }
}