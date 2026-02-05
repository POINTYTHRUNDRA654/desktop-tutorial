import { AnimationInfo, AnimationKeyframe, AnimationOptimization, AnimationReport } from '../shared/types';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Animation Frame Analyzer for Fallout 4
 * Analyzes HKX animation files for keyframe optimization opportunities
 * Provides recommendations for reducing animation file sizes and improving performance
 */
export class AnimationFrameAnalyzer {
  private static readonly TARGET_FRAME_RATES = [30, 24, 15]; // Common target frame rates
  private static readonly MIN_KEYFRAME_RATIO = 0.3; // Minimum keyframes to preserve (30%)
  private static readonly MAX_COMPRESSION_RATIO = 0.8; // Maximum compression ratio to recommend

  /**
   * Analyze animations for optimization opportunities
   */
  static async analyzeAnimations(animations: AnimationInfo[]): Promise<AnimationReport> {
    const optimizations: AnimationOptimization[] = [];

    for (const animation of animations) {
      const optimization = this.analyzeAnimation(animation);
      if (optimization) {
        optimizations.push(optimization);
      }
    }

    // Sort by potential savings
    optimizations.sort((a, b) => b.potentialSavings.fileSize - a.potentialSavings.fileSize);

    const recommendations = this.generateRecommendations(optimizations);
    const totalSavings = this.calculateTotalSavings(optimizations);

    return {
      totalAnimations: animations.length,
      optimizableAnimations: optimizations,
      recommendations,
      potentialSavings: totalSavings
    };
  }

  /**
   * Analyze a single animation for optimization opportunities
   */
  private static analyzeAnimation(animation: AnimationInfo): AnimationOptimization | null {
    const suggestions: string[] = [];
    let recommendedFrameRate = animation.frameRate;
    let recommendedKeyframeReduction = 1.0; // No reduction by default
    let qualityImpact = 100; // Perfect quality by default

    // Check frame rate optimization
    if (animation.frameRate > 30) {
      recommendedFrameRate = 30;
      suggestions.push(`Reduce frame rate from ${animation.frameRate}fps to 30fps`);
      qualityImpact = Math.max(80, qualityImpact - 10);
    }

    // Check keyframe density
    const avgKeyframesPerSecond = animation.keyframeCount / animation.duration;
    if (avgKeyframesPerSecond > animation.frameRate * 0.8) {
      // Too many keyframes, can reduce
      const targetKeyframes = Math.floor(animation.duration * animation.frameRate * this.MIN_KEYFRAME_RATIO);
      recommendedKeyframeReduction = targetKeyframes / animation.keyframeCount;
      suggestions.push(`Reduce keyframes from ${animation.keyframeCount} to ${targetKeyframes} (${Math.round((1 - recommendedKeyframeReduction) * 100)}% reduction)`);
      qualityImpact = Math.max(70, qualityImpact - 20);
    }

    // Check compression ratio
    if (animation.compressionRatio < this.MAX_COMPRESSION_RATIO) {
      suggestions.push(`Increase compression ratio from ${(animation.compressionRatio * 100).toFixed(1)}% to ${Math.round(this.MAX_COMPRESSION_RATIO * 100)}%`);
    }

    // Calculate potential savings
    const currentFileSize = this.estimateFileSize(animation);
    const optimizedFileSize = this.estimateOptimizedFileSize(animation, recommendedKeyframeReduction, recommendedFrameRate);

    const fileSizeSavings = Math.max(0, currentFileSize - optimizedFileSize);
    const memorySavings = fileSizeSavings * 0.8; // Memory usage roughly correlates with file size
    const cpuSavings = this.estimateCPUSavings(animation, recommendedKeyframeReduction);

    const potentialSavings = {
      fileSize: Math.round(fileSizeSavings),
      memory: Math.round(memorySavings),
      cpu: Math.round(cpuSavings)
    };

    // Only return optimization if there are meaningful savings
    if (potentialSavings.fileSize < 1024) { // Less than 1KB savings
      return null;
    }

    return {
      animation,
      recommendedFrameRate,
      recommendedKeyframeReduction,
      potentialSavings,
      qualityImpact: Math.round(qualityImpact),
      suggestions
    };
  }

  /**
   * Estimate file size of animation (simplified)
   */
  private static estimateFileSize(animation: AnimationInfo): number {
    // Rough estimation: keyframes * bones * data per keyframe
    const bytesPerKeyframe = animation.boneCount * 28; // position(12) + rotation(16)
    return animation.keyframeCount * bytesPerKeyframe;
  }

  /**
   * Estimate optimized file size
   */
  private static estimateOptimizedFileSize(
    animation: AnimationInfo,
    keyframeReduction: number,
    newFrameRate: number
  ): number {
    const reducedKeyframes = Math.floor(animation.keyframeCount * keyframeReduction);
    const frameRateRatio = newFrameRate / animation.frameRate;
    const finalKeyframes = Math.floor(reducedKeyframes * frameRateRatio);

    const bytesPerKeyframe = animation.boneCount * 28;
    return finalKeyframes * bytesPerKeyframe * animation.compressionRatio;
  }

  /**
   * Estimate CPU savings from optimization
   */
  private static estimateCPUSavings(animation: AnimationInfo, keyframeReduction: number): number {
    // CPU cost roughly proportional to keyframes processed per second
    const baseCPU = animation.keyframeCount * animation.boneCount;
    const optimizedCPU = baseCPU * keyframeReduction;
    return Math.max(0, baseCPU - optimizedCPU);
  }

  /**
   * Generate overall recommendations
   */
  private static generateRecommendations(optimizations: AnimationOptimization[]): string[] {
    const recommendations: string[] = [];

    if (optimizations.length === 0) {
      recommendations.push('All animations are well optimized');
      return recommendations;
    }

    const totalAnimations = optimizations.length;
    const highImpact = optimizations.filter(opt => opt.qualityImpact < 80).length;
    const totalFileSavings = optimizations.reduce((sum, opt) => sum + opt.potentialSavings.fileSize, 0);

    recommendations.push(`${totalAnimations} animations have optimization opportunities`);

    if (highImpact > 0) {
      recommendations.push(`${highImpact} animations have significant impact - review quality vs performance trade-offs`);
    }

    if (totalFileSavings > 1024 * 1024) { // Over 1MB
      recommendations.push(`Potential file size reduction: ${(totalFileSavings / (1024 * 1024)).toFixed(1)}MB across all animations`);
    } else if (totalFileSavings > 1024) {
      recommendations.push(`Potential file size reduction: ${(totalFileSavings / 1024).toFixed(1)}KB across all animations`);
    }

    // Check for common optimization patterns
    const frameRateOpts = optimizations.filter(opt => opt.recommendedFrameRate < opt.animation.frameRate).length;
    if (frameRateOpts > 0) {
      recommendations.push(`${frameRateOpts} animations can benefit from frame rate reduction to 30fps`);
    }

    const keyframeOpts = optimizations.filter(opt => opt.recommendedKeyframeReduction < 0.9).length;
    if (keyframeOpts > 0) {
      recommendations.push(`${keyframeOpts} animations have excessive keyframes - consider keyframe reduction`);
    }

    return recommendations;
  }

  /**
   * Calculate total potential savings across all optimizations
   */
  private static calculateTotalSavings(optimizations: AnimationOptimization[]) {
    return optimizations.reduce(
      (total, opt) => ({
        totalFileSize: total.totalFileSize + opt.potentialSavings.fileSize,
        totalMemory: total.totalMemory + opt.potentialSavings.memory,
        totalCPU: total.totalCPU + opt.potentialSavings.cpu
      }),
      { totalFileSize: 0, totalMemory: 0, totalCPU: 0 }
    );
  }

  /**
   * Parse HKX animation information
   * This is a simplified parser - real implementation would need full HKX format support
   */
  static async parseHKXAnimationInfo(filePath: string): Promise<AnimationInfo | null> {
    try {
      const buffer = await fs.promises.readFile(filePath);

      if (buffer.length < 64) {
        return null; // Too small for HKX header
      }

      // Simplified HKX parsing - real implementation would need proper HKX format support
      const duration = this.estimateAnimationDuration(buffer);
      const frameRate = this.estimateFrameRate(buffer);
      const keyframeCount = this.estimateKeyframeCount(buffer);
      const boneCount = this.estimateBoneCount(buffer);

      // Mock keyframes - real parser would extract actual keyframe data
      const keyframes: AnimationKeyframe[] = [];
      for (let i = 0; i < Math.min(keyframeCount, 10); i++) { // Sample first 10 keyframes
        keyframes.push({
          time: (i / Math.max(1, keyframeCount - 1)) * duration,
          position: { x: 0, y: 0, z: 0 }, // Mock data
          rotation: { x: 0, y: 0, z: 0, w: 1 },
          scale: { x: 1, y: 1, z: 1 }
        });
      }

      const compressionRatio = this.estimateCompressionRatio(buffer);

      return {
        path: filePath,
        duration,
        frameRate,
        keyframeCount,
        boneCount,
        keyframes,
        compressionRatio
      };
    } catch (error) {
      console.warn(`Failed to parse HKX animation info for ${filePath}:`, error);
      return null;
    }
  }

  /**
   * Estimate animation duration from HKX file
   */
  private static estimateAnimationDuration(buffer: Buffer): number {
    // This is a heuristic - real parser would read from HKX structure
    const sizeKB = buffer.length / 1024;
    return Math.max(1, Math.min(30, sizeKB / 10)); // Rough estimate: 1-30 seconds
  }

  /**
   * Estimate frame rate from HKX file
   */
  private static estimateFrameRate(buffer: Buffer): number {
    // Check for common frame rates in the data
    const sample = buffer.subarray(0, Math.min(1024, buffer.length));
    const text = sample.toString('utf8', 0, sample.length);

    if (text.includes('60')) return 60;
    if (text.includes('30')) return 30;
    if (text.includes('24')) return 24;

    return 30; // Default
  }

  /**
   * Estimate keyframe count from HKX file
   */
  private static estimateKeyframeCount(buffer: Buffer): number {
    // Rough estimation based on file size and typical keyframe density
    const sizeKB = buffer.length / 1024;
    return Math.max(10, Math.floor(sizeKB * 20)); // ~20 keyframes per KB
  }

  /**
   * Estimate bone count from HKX file
   */
  private static estimateBoneCount(buffer: Buffer): number {
    // Look for bone-related data patterns
    const sample = buffer.subarray(0, Math.min(512, buffer.length));
    let boneCount = 0;

    // Count occurrences of bone-like patterns (simplified)
    for (let i = 0; i < sample.length - 4; i++) {
      if (sample[i] === 0x42 && sample[i + 1] === 0x4F && sample[i + 2] === 0x4E && sample[i + 3] === 0x45) { // "BONE"
        boneCount++;
      }
    }

    return Math.max(1, Math.min(100, boneCount)); // Clamp to reasonable range
  }

  /**
   * Estimate compression ratio
   */
  private static estimateCompressionRatio(buffer: Buffer): number {
    // Simplified - real implementation would check HKX compression flags
    const entropy = this.calculateEntropy(buffer);
    return Math.max(0.1, Math.min(1.0, 1.0 - entropy / 8.0)); // Higher entropy = lower compression
  }

  /**
   * Calculate Shannon entropy of buffer (for compression estimation)
   */
  private static calculateEntropy(buffer: Buffer): number {
    const counts = new Array(256).fill(0);
    for (const byte of buffer) {
      counts[byte]++;
    }

    let entropy = 0;
    const length = buffer.length;
    for (const count of counts) {
      if (count > 0) {
        const p = count / length;
        entropy -= p * Math.log2(p);
      }
    }

    return entropy;
  }

  /**
   * Batch process HKX files in a directory
   */
  static async scanDirectoryForAnimations(directory: string): Promise<AnimationInfo[]> {
    const animations: AnimationInfo[] = [];

    try {
      const files = await fs.promises.readdir(directory, { recursive: true });

      for (const file of files) {
        const filePath = path.join(directory, file);
        if (path.extname(filePath).toLowerCase() === '.hkx') {
          const info = await this.parseHKXAnimationInfo(filePath);
          if (info) {
            animations.push(info);
          }
        }
      }
    } catch (error) {
      console.warn(`Failed to scan directory for animations: ${directory}`, error);
    }

    return animations;
  }

  /**
   * Optimize animation by reducing keyframes
   * This would integrate with animation processing tools
   */
  static async optimizeAnimationKeyframes(
    animation: AnimationInfo,
    targetKeyframeRatio: number
  ): Promise<AnimationKeyframe[]> {
    // This would implement keyframe reduction algorithms
    // For now, return a mock reduced keyframe set

    const targetCount = Math.floor(animation.keyframeCount * targetKeyframeRatio);
    const step = animation.keyframeCount / targetCount;

    const optimizedKeyframes: AnimationKeyframe[] = [];
    for (let i = 0; i < targetCount; i++) {
      const sourceIndex = Math.floor(i * step);
      const sourceKeyframe = animation.keyframes[sourceIndex];
      if (sourceKeyframe) {
        optimizedKeyframes.push({ ...sourceKeyframe });
      }
    }

    return optimizedKeyframes;
  }
}