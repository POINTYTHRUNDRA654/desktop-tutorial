/**
 * Hardware-Specific Mining Engine
 * AI-powered hardware profiling and optimization recommendations
 */

import {
  HardwareSpecificMiningEngine,
  HardwareProfile,
  HardwareOptimization,
  HardwareRecommendation,
  HardwarePerformancePrediction,
  TextureOptimization,
  MeshOptimization
} from '../shared/types';

export class HardwareSpecificMiningEngineImpl implements HardwareSpecificMiningEngine {
  async analyzeHardwareProfile(hardware: HardwareProfile): Promise<HardwareOptimization[]> {
    const optimizations: HardwareOptimization[] = [];

    // CPU optimizations
    const cpuOpts = await this.generateCPUOptimizations(hardware.cpu);
    optimizations.push(...cpuOpts);

    // GPU optimizations
    const gpuOpts = await this.generateGPUOptimizations(hardware.gpu);
    optimizations.push(...gpuOpts);

    // RAM optimizations
    const ramOpts = await this.generateRAMOptimizations(hardware.ram);
    optimizations.push(...ramOpts);

    // Storage optimizations
    const storageOpts = await this.generateStorageOptimizations(hardware.storage);
    optimizations.push(...storageOpts);

    return optimizations;
  }

  async recommendSettings(hardware: HardwareProfile, modList: string[]): Promise<HardwareRecommendation> {
    // Generate INI settings based on hardware
    const iniSettings = await this.generateINISettings(hardware);

    // Adjust load order based on hardware capabilities
    const loadOrderAdjustments = await this.generateLoadOrderAdjustments(hardware, modList);

    // Generate texture settings
    const textureSettings = await this.generateTextureSettings(hardware);

    // Generate mesh settings
    const meshSettings = await this.generateMeshSettings(hardware);

    // Predict expected performance
    const expectedPerformance = await this.predictPerformance(hardware, modList);

    return {
      iniSettings,
      loadOrderAdjustments,
      textureSettings,
      meshSettings,
      expectedPerformance
    };
  }

  async predictPerformance(hardware: HardwareProfile, loadOrder: string[]): Promise<HardwarePerformancePrediction> {
    // Calculate average FPS based on hardware
    const baseFps = this.calculateBaseFps(hardware);
    const modCountPenalty = loadOrder.length * 2; // Each mod reduces FPS slightly
    const averageFps = Math.max(baseFps - modCountPenalty, 20);

    // Calculate minimum FPS (typically 20-30% lower than average)
    const minimumFps = averageFps * 0.7;

    // Estimate memory usage
    const memoryUsage = this.calculateMemoryUsage(hardware, loadOrder);

    // Estimate load time
    const loadTime = this.calculateLoadTime(hardware, loadOrder);

    // Calculate stability score
    const stabilityScore = this.calculateStabilityScore(hardware, loadOrder);

    // Identify bottlenecks
    const bottlenecks = this.identifyBottlenecks(hardware, loadOrder);

    return {
      averageFps,
      minimumFps,
      memoryUsage,
      loadTime,
      stabilityScore,
      bottlenecks
    };
  }

  // Helper methods for recommendSettings
  private async generateINISettings(hardware: HardwareProfile): Promise<Record<string, any>> {
    const settings: Record<string, any> = {};

    // Adjust settings based on hardware capabilities
    if (hardware.cpu.cores < 4) {
      settings['iThreads'] = Math.min(hardware.cpu.threads, 4);
    }

    if (hardware.gpu.vram < 8) {
      settings['iTexMipMapSkip'] = 1;
      settings['fMaxAnisotropy'] = 4;
    }

    if (hardware.ram.total < 16) {
      settings['uGridsToLoad'] = 3;
      settings['uExterior Cell Buffer'] = 32;
    }

    return settings;
  }

  private async generateLoadOrderAdjustments(hardware: HardwareProfile, modList: string[]): Promise<string[]> {
    const adjustments: string[] = [];

    if (hardware.cpu.cores < 6) {
      adjustments.push('Move performance-heavy mods lower in load order');
    }

    if (hardware.gpu.vram < 6) {
      adjustments.push('Prioritize texture optimization mods');
    }

    if (hardware.ram.total < 16) {
      adjustments.push('Reduce uGridsToLoad for better memory management');
    }

    return adjustments;
  }

  private async generateTextureSettings(hardware: HardwareProfile): Promise<TextureOptimization[]> {
    const settings: TextureOptimization[] = [];

    if (hardware.gpu.vram < 8) {
      settings.push({
        texturePath: '*',
        currentFormat: 'High',
        recommendedFormat: 'Medium',
        compressionRatio: 0.7,
        qualityImpact: -0.1,
        performanceGain: 0.1,
        memorySavings: 0.3
      });
    }

    return settings;
  }

  private async generateMeshSettings(hardware: HardwareProfile): Promise<MeshOptimization[]> {
    const settings: MeshOptimization[] = [];

    if (hardware.cpu.cores < 4) {
      settings.push({
        meshPath: '*',
        currentTriangles: 10000,
        recommendedTriangles: 5000,
        lodSuggestions: [{ distance: 50, triangleReduction: 0.5 }],
        performanceImpact: 0.15,
        visualQualityLoss: 0.1
      });
    }

    return settings;
  }

  // Helper methods for predictPerformance
  private calculateBaseFps(hardware: HardwareProfile): number {
    const cpuScore = hardware.cpu.cores * 10 + hardware.cpu.threads * 2;
    const gpuScore = hardware.gpu.vram * 5;
    const ramScore = hardware.ram.total * 2;

    return Math.min(cpuScore + gpuScore + ramScore, 120);
  }

  private calculateMemoryUsage(hardware: HardwareProfile, loadOrder: string[]): number {
    const baseUsage = 4000; // Base Skyrim memory usage in MB
    const modUsage = loadOrder.length * 200; // Estimate 200MB per mod
    const gpuVram = hardware.gpu.vram * 1024; // Convert to MB

    return Math.min(baseUsage + modUsage + gpuVram, hardware.ram.total * 1024 * 0.8);
  }

  private calculateLoadTime(hardware: HardwareProfile, loadOrder: string[]): number {
    const baseTime = 30; // Base load time in seconds
    const modTime = loadOrder.length * 5; // 5 seconds per mod
    const storageMultiplier = hardware.storage.type === 'HDD' ? 2 : 1;

    return baseTime + (modTime * storageMultiplier);
  }

  private calculateStabilityScore(hardware: HardwareProfile, loadOrder: string[]): number {
    let score = 100;

    if (hardware.cpu.cores < 4) score -= 20;
    if (hardware.gpu.vram < 4) score -= 25;
    if (hardware.ram.total < 8) score -= 30;
    if (loadOrder.length > 100) score -= 15;

    return Math.max(score, 10);
  }

  private identifyBottlenecks(hardware: HardwareProfile, loadOrder: string[]): string[] {
    const bottlenecks: string[] = [];

    if (hardware.cpu.cores < 4) bottlenecks.push('CPU');
    if (hardware.gpu.vram < 4) bottlenecks.push('GPU');
    if (hardware.ram.total < 8) bottlenecks.push('RAM');
    if (hardware.storage.type === 'HDD') bottlenecks.push('Storage');
    if (loadOrder.length > 150) bottlenecks.push('Too many mods');

    return bottlenecks;
  }

  async runPerformanceBenchmark(profile: HardwareProfile): Promise<PerformanceBenchmark> {
    const benchmark = {
      cpuScore: await this.benchmarkCPU(profile.cpu),
      gpuScore: await this.benchmarkGPU(profile.gpu),
      ramScore: await this.benchmarkRAM(profile.ram),
      storageScore: await this.benchmarkStorage(profile.storage),
      overallScore: 0,
      bottleneckIdentified: '',
      recommendations: []
    };

    // Calculate overall score
    benchmark.overallScore = (benchmark.cpuScore + benchmark.gpuScore + benchmark.ramScore + benchmark.storageScore) / 4;

    // Identify bottleneck
    benchmark.bottleneckIdentified = this.identifyBottleneck(benchmark);

    // Generate recommendations
    benchmark.recommendations = await this.generateBenchmarkRecommendations(benchmark, profile);

    return benchmark;
  }

  async recommendHardwareUpgrades(profile: HardwareProfile, budget: number): Promise<any[]> {
    const recommendations: any[] = [];
    const currentScore = this.calculatePerformanceScore(profile.cpu, profile.gpu, profile.ram, profile.storage);

    // Analyze each component for upgrade potential
    const cpuUpgrade = await this.analyzeCPUUpgrade(profile.cpu, budget);
    if (cpuUpgrade) recommendations.push(cpuUpgrade);

    const gpuUpgrade = await this.analyzeGPUUpgrade(profile.gpu, budget);
    if (gpuUpgrade) recommendations.push(gpuUpgrade);

    const ramUpgrade = await this.analyzeRAMUpgrade(profile.ram, budget);
    if (ramUpgrade) recommendations.push(ramUpgrade);

    const storageUpgrade = await this.analyzeStorageUpgrade(profile.storage, budget);
    if (storageUpgrade) recommendations.push(storageUpgrade);

    return recommendations.sort((a, b) => b.performanceGain - a.performanceGain);
  }

  private async detectCPU(): Promise<HardwareProfile['cpu']> {
    // Simulate CPU detection
    const cpuModels = [
      { name: 'Intel Core i5-12600K', cores: 10, threads: 16, baseClock: 3.7, boostClock: 4.9 },
      { name: 'AMD Ryzen 5 7600X', cores: 6, threads: 12, baseClock: 4.7, boostClock: 5.3 },
      { name: 'Intel Core i7-13700K', cores: 16, threads: 24, baseClock: 3.4, boostClock: 5.4 },
      { name: 'AMD Ryzen 9 7950X', cores: 16, threads: 32, baseClock: 4.5, boostClock: 5.7 }
    ];

    const selectedCPU = cpuModels[Math.floor(Math.random() * cpuModels.length)];

    return {
      model: selectedCPU.name,
      cores: selectedCPU.cores,
      threads: selectedCPU.threads,
      baseClock: selectedCPU.baseClock,
      boostClock: selectedCPU.boostClock,
      cache: selectedCPU.cores * 0.5, // MB L3 cache estimate
      architecture: selectedCPU.name.includes('Intel') ? 'Alder Lake' : 'Zen 4'
    };
  }

  private async detectGPU(): Promise<HardwareProfile['gpu']> {
    // Simulate GPU detection
    const gpuModels = [
      { name: 'NVIDIA GeForce RTX 4070', vram: 12, baseClock: 1920, boostClock: 2475, tdp: 200 },
      { name: 'AMD Radeon RX 7800 XT', vram: 16, baseClock: 1295, boostClock: 2430, tdp: 263 },
      { name: 'NVIDIA GeForce RTX 3080', vram: 10, baseClock: 1440, boostClock: 1710, tdp: 320 },
      { name: 'AMD Radeon RX 6800 XT', vram: 16, baseClock: 1825, boostClock: 2250, tdp: 300 }
    ];

    const selectedGPU = gpuModels[Math.floor(Math.random() * gpuModels.length)];

    return {
      model: selectedGPU.name,
      vram: selectedGPU.vram,
      driverVersion: 'Latest',
      dxVersion: '12.0',
      rayTracing: selectedGPU.name.includes('RTX') || selectedGPU.name.includes('RX 7')
    };
  }

  private async detectRAM(): Promise<HardwareProfile['ram']> {
    // Simulate RAM detection
    const ramConfigs = [
      { capacity: 16, speed: 3200, type: 'DDR4', channels: 2 },
      { capacity: 32, speed: 3600, type: 'DDR4', channels: 2 },
      { capacity: 64, speed: 5600, type: 'DDR5', channels: 2 },
      { capacity: 128, speed: 4800, type: 'DDR5', channels: 2 }
    ];

    const selectedRAM = ramConfigs[Math.floor(Math.random() * ramConfigs.length)];

    return {
      total: selectedRAM.capacity,
      speed: selectedRAM.speed,
      type: selectedRAM.type,
      channels: selectedRAM.channels
    };
  }

  private async detectStorage(): Promise<HardwareProfile['storage']> {
    // Simulate storage detection
    const storageTypes = [
      { type: 'NVMe SSD', capacity: 1000, readSpeed: 7000, writeSpeed: 5300 },
      { type: 'NVMe SSD', capacity: 2000, readSpeed: 7500, writeSpeed: 6800 },
      { type: 'SATA SSD', capacity: 1000, readSpeed: 560, writeSpeed: 530 },
      { type: 'HDD', capacity: 4000, readSpeed: 120, writeSpeed: 120 }
    ];

    const selectedStorage = storageTypes[Math.floor(Math.random() * storageTypes.length)];

    return {
      type: selectedStorage.type as 'HDD' | 'SSD' | 'NVMe',
      readSpeed: selectedStorage.readSpeed,
      writeSpeed: selectedStorage.writeSpeed,
      totalSpace: selectedStorage.capacity,
      availableSpace: selectedStorage.capacity * 0.8 // Simulate 80% used
    };
  }

  private async detectOS(): Promise<HardwareProfile['os']> {
    // Simulate OS detection
    return {
      name: 'Windows',
      version: '11',
      build: '22621',
      architecture: 'x64'
    };
  }

  private calculatePerformanceScore(cpu: any, gpu: any, ram: any, storage: any): number {
    // Calculate weighted performance score
    const cpuScore = (cpu.cores * 10) + (cpu.threads * 5) + (cpu.boostClock * 2);
    const gpuScore = (gpu.vram * 20) + (gpu.boostClock / 10) + (gpu.tdp / 10);
    const ramScore = (ram.capacity * 5) + (ram.speed / 100) + (ram.channels * 10);
    const storageScore = storage.type === 'NVMe SSD' ? 100 : storage.type === 'SATA SSD' ? 70 : 40;

    // Weighted average (GPU most important for gaming)
    return (cpuScore * 0.25) + (gpuScore * 0.4) + (ramScore * 0.2) + (storageScore * 0.15);
  }

  private async analyzeBottlenecks(cpu: any, gpu: any, ram: any, storage: any): Promise<string> {
    const scores = {
      cpu: cpu.cores * 10,
      gpu: gpu.vram * 20,
      ram: ram.capacity * 5,
      storage: storage.type === 'NVMe SSD' ? 100 : 50
    };

    const minScore = Math.min(...Object.values(scores));
    const bottleneck = Object.keys(scores).find(key => scores[key as keyof typeof scores] === minScore);

    return `${bottleneck?.toUpperCase()} is the current bottleneck`;
  }

  private async generateRecommendedSettings(cpu: any, gpu: any, ram: any, storage: any): Promise<Record<string, any>> {
    return {
      recommendedResolution: gpu.vram >= 8 ? '2560x1440' : '1920x1080',
      recommendedAA: gpu.boostClock > 2000 ? 'TAA' : 'FXAA',
      recommendedShadowResolution: gpu.vram >= 12 ? 4096 : gpu.vram >= 8 ? 2048 : 1024,
      recommendedTextureQuality: ram.capacity >= 32 ? 'Ultra' : ram.capacity >= 16 ? 'High' : 'Medium',
      recommendedLOD: cpu.cores >= 8 ? 'Ultra' : cpu.cores >= 6 ? 'High' : 'Medium'
    };
  }

  private async generateCPUOptimizations(cpu: any): Promise<HardwareOptimization[]> {
    const optimizations: HardwareOptimization[] = [];

    if (cpu.threads < 12) {
      optimizations.push({
        component: 'cpu',
        setting: 'iThreads',
        currentValue: cpu.threads,
        recommendedValue: Math.min(cpu.threads, 8),
        performanceImpact: cpu.threads > 8 ? 0.05 : 0,
        stabilityImpact: cpu.threads > 8 ? -0.02 : 0,
        reasoning: 'High thread counts can cause instability in Skyrim'
      });
    }

    if (cpu.boostClock < 4.0) {
      optimizations.push({
        component: 'cpu',
        setting: 'Overclocking',
        currentValue: cpu.boostClock,
        recommendedValue: Math.min(cpu.boostClock * 1.2, 4.5),
        performanceImpact: 0.1,
        stabilityImpact: -0.05,
        reasoning: 'Higher clock speeds improve game performance'
      });
    }

    return optimizations;
  }

  private async generateGPUOptimizations(gpu: any): Promise<HardwareOptimization[]> {
    const optimizations: HardwareOptimization[] = [];

    if (gpu.vram < 8) {
      optimizations.push({
        component: 'gpu',
        setting: 'TextureQuality',
        currentValue: 'High',
        recommendedValue: 'Medium',
        performanceImpact: 0.15,
        stabilityImpact: 0.02,
        reasoning: 'Lower VRAM usage improves stability and performance'
      });
    }

    if (gpu.driverVersion !== 'Latest') {
      optimizations.push({
        component: 'gpu',
        setting: 'DriverVersion',
        currentValue: gpu.driverVersion,
        recommendedValue: 'Latest',
        performanceImpact: 0.05,
        stabilityImpact: 0.1,
        reasoning: 'Updated drivers provide performance and stability improvements'
      });
    }

    return optimizations;
  }

  private async generateRAMOptimizations(ram: any): Promise<HardwareOptimization[]> {
    const optimizations: HardwareOptimization[] = [];

    if (ram.capacity < 16) {
      optimizations.push({
        component: 'ram',
        setting: 'MemorySize',
        currentValue: ram.capacity,
        recommendedValue: 16,
        performanceImpact: 0.2,
        stabilityImpact: 0.1,
        reasoning: '16GB minimum recommended for modded Skyrim'
      });
    }

    if (ram.speed < 3200) {
      optimizations.push({
        component: 'ram',
        setting: 'MemorySpeed',
        currentValue: ram.speed,
        recommendedValue: Math.min(ram.speed * 1.25, 3600),
        performanceImpact: 0.05,
        stabilityImpact: 0.02,
        reasoning: 'Higher memory speeds improve game loading and performance'
      });
    }

    return optimizations;
  }

  private async generateStorageOptimizations(storage: any): Promise<HardwareOptimization[]> {
    const optimizations: HardwareOptimization[] = [];

    if (storage.type === 'HDD') {
      optimizations.push({
        component: 'storage',
        setting: 'StorageType',
        currentValue: 'HDD',
        recommendedValue: 'NVMe SSD',
        performanceImpact: 0.3,
        stabilityImpact: 0.05,
        reasoning: 'SSD provides massive load time improvements'
      });
    } else if (storage.type === 'SATA SSD') {
      optimizations.push({
        component: 'storage',
        setting: 'StorageType',
        currentValue: 'SATA SSD',
        recommendedValue: 'NVMe SSD',
        performanceImpact: 0.15,
        stabilityImpact: 0.02,
        reasoning: 'NVMe provides faster loading than SATA SSD'
      });
    }

    return optimizations;
  }

  private async benchmarkCPU(cpu: any): Promise<number> {
    // Simulate CPU benchmark score
    const baseScore = cpu.cores * 100 + cpu.threads * 50 + cpu.boostClock * 10;
    return baseScore + (Math.random() * 200 - 100); // Add some variance
  }

  private async benchmarkGPU(gpu: any): Promise<number> {
    // Simulate GPU benchmark score
    const baseScore = gpu.vram * 200 + gpu.boostClock * 0.5 + gpu.tdp * 2;
    return baseScore + (Math.random() * 500 - 250); // Add some variance
  }

  private async benchmarkRAM(ram: any): Promise<number> {
    // Simulate RAM benchmark score
    const baseScore = ram.capacity * 10 + ram.speed * 0.1 + ram.channels * 50;
    return baseScore + (Math.random() * 100 - 50); // Add some variance
  }

  private async benchmarkStorage(storage: any): Promise<number> {
    // Simulate storage benchmark score
    let baseScore = 0;
    switch (storage.type) {
      case 'NVMe SSD':
        baseScore = 1000 + storage.readSpeed * 0.1;
        break;
      case 'SATA SSD':
        baseScore = 500 + storage.readSpeed * 0.5;
        break;
      case 'HDD':
        baseScore = 100 + storage.readSpeed * 2;
        break;
    }
    return baseScore + (Math.random() * 100 - 50); // Add some variance
  }

  private identifyBottleneck(benchmark: PerformanceBenchmark): string {
    const scores = {
      CPU: benchmark.cpuScore,
      GPU: benchmark.gpuScore,
      RAM: benchmark.ramScore,
      Storage: benchmark.storageScore
    };

    const minScore = Math.min(...Object.values(scores));
    const bottleneck = Object.keys(scores).find(key => scores[key as keyof typeof scores] === minScore);

    return bottleneck || 'Unknown';
  }

  private async generateBenchmarkRecommendations(benchmark: PerformanceBenchmark, profile: HardwareProfile): Promise<string[]> {
    const recommendations: string[] = [];

    if (benchmark.cpuScore < 500) {
      recommendations.push('Consider CPU upgrade for better single-threaded performance');
    }

    if (benchmark.gpuScore < 1000) {
      recommendations.push('GPU upgrade recommended for better graphics performance');
    }

    if (benchmark.ramScore < 200) {
      recommendations.push('Upgrade RAM capacity and speed');
    }

    if (benchmark.storageScore < 300) {
      recommendations.push('Install Skyrim on SSD for faster loading');
    }

    if (recommendations.length === 0) {
      recommendations.push('Hardware meets Skyrim requirements - focus on software optimization');
    }

    return recommendations;
  }

  private async analyzeCPUUpgrade(cpu: any, budget: number): Promise<any> {
    if (budget < 200) return null;

    const upgradeOptions = [
      { name: 'AMD Ryzen 5 7600X', price: 299, performanceGain: 25 },
      { name: 'Intel Core i5-13600K', price: 319, performanceGain: 30 },
      { name: 'AMD Ryzen 7 7700X', price: 399, performanceGain: 35 }
    ];

    const affordableOptions = upgradeOptions.filter(opt => opt.price <= budget);
    if (affordableOptions.length === 0) return null;

    const bestOption = affordableOptions.reduce((best, current) =>
      current.performanceGain > best.performanceGain ? current : best
    );

    return {
      component: 'CPU',
      recommendedUpgrade: bestOption.name,
      cost: bestOption.price,
      performanceGain: bestOption.performanceGain,
      justification: `Upgrades from ${cpu.model} for better Skyrim performance`,
      compatibilityNotes: ['May require motherboard BIOS update', 'Check cooler compatibility']
    };
  }

  private async analyzeGPUUpgrade(gpu: any, budget: number): Promise<any> {
    if (budget < 300) return null;

    const upgradeOptions = [
      { name: 'NVIDIA RTX 4060', price: 299, performanceGain: 40 },
      { name: 'AMD RX 7600', price: 269, performanceGain: 35 },
      { name: 'NVIDIA RTX 4070', price: 599, performanceGain: 60 },
      { name: 'AMD RX 7800 XT', price: 499, performanceGain: 55 }
    ];

    const affordableOptions = upgradeOptions.filter(opt => opt.price <= budget);
    if (affordableOptions.length === 0) return null;

    const bestOption = affordableOptions.reduce((best, current) =>
      current.performanceGain > best.performanceGain ? current : best
    );

    return {
      component: 'GPU',
      recommendedUpgrade: bestOption.name,
      cost: bestOption.price,
      performanceGain: bestOption.performanceGain,
      justification: `Upgrades from ${gpu.model} for significantly better graphics`,
      compatibilityNotes: ['Check power supply requirements', 'Ensure case has proper clearance']
    };
  }

  private async analyzeRAMUpgrade(ram: any, budget: number): Promise<any> {
    if (budget < 50) return null;

    let recommendation = null;

    if (ram.capacity < 32) {
      recommendation = {
        component: 'RAM',
        recommendedUpgrade: '32GB DDR4-3600',
        cost: 89,
        performanceGain: 15,
        justification: `Upgrades from ${ram.capacity}GB for better mod support`,
        compatibilityNotes: ['Check motherboard compatibility', 'Ensure proper dual-channel configuration']
      };
    } else if (ram.speed < 3600) {
      recommendation = {
        component: 'RAM',
        recommendedUpgrade: 'DDR4-3600 upgrade',
        cost: 45,
        performanceGain: 5,
        justification: `Increases RAM speed from ${ram.speed}MHz`,
        compatibilityNotes: ['May require BIOS adjustments', 'Test stability after upgrade']
      };
    }

    return recommendation && recommendation.cost <= budget ? recommendation : null;
  }

  private async analyzeStorageUpgrade(storage: any, budget: number): Promise<any> {
    if (budget < 50) return null;

    if (storage.type === 'HDD') {
      return {
        component: 'Storage',
        recommendedUpgrade: '1TB NVMe SSD',
        cost: 79,
        performanceGain: 80,
        justification: 'Massive improvement in load times and game performance',
        compatibilityNotes: ['Check motherboard has M.2 slot', 'Backup data before migration']
      };
    } else if (storage.type === 'SATA SSD') {
      return {
        component: 'Storage',
        recommendedUpgrade: '1TB NVMe SSD',
        cost: 89,
        performanceGain: 25,
        justification: 'Faster loading and better performance than SATA SSD',
        compatibilityNotes: ['Verify PCIe compatibility', 'Check available M.2 slots']
      };
    }

    return null;
  }
}