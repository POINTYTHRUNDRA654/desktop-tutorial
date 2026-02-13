# Implementing GPT-4o Vision and DALL-E 3 in Mossy

## Quick Start Guide - 30 Minutes to AI-Powered Mossy

This guide will help you integrate GPT-4o vision analysis and DALL-E 3 texture generation into Mossy using your existing OpenAI API access.

## What You'll Build

1. **Texture Analysis** - Analyze any texture for quality, issues, and improvements
2. **Texture Generation** - Generate custom game textures from text descriptions
3. **Combined Workflow** - Generate, analyze, and refine textures automatically

## Prerequisites

- ✅ OpenAI API key with access to GPT-4o and DALL-E 3
- ✅ Node.js and npm installed
- ✅ Mossy project set up

## Step 1: Install Dependencies (2 minutes)

```bash
npm install openai
```

Add to your `.env.local` file:
```env
OPENAI_API_KEY=sk-your-api-key-here
```

## Step 2: Create Service Classes (10 minutes)

### VisionAnalysisService

Create `src/integrations/VisionAnalysisService.ts`:

```typescript
import OpenAI from 'openai';
import fs from 'fs';

export interface TextureAnalysis {
  quality_score: number; // 0-10
  resolution: string;
  format: string;
  issues: string[];
  suggestions: string[];
  suitable_for: string[];
  uv_analysis?: string;
  timestamp: string;
}

export class VisionAnalysisService {
  private openai: OpenAI;

  constructor(apiKey: string) {
    this.openai = new OpenAI({ apiKey });
  }

  /**
   * Analyze a texture file for quality and issues
   */
  async analyzeTexture(
    imagePath: string,
    model: string = 'gpt-4o'
  ): Promise<TextureAnalysis> {
    try {
      // Read image and convert to base64
      const imageBuffer = fs.readFileSync(imagePath);
      const base64Image = imageBuffer.toString('base64');
      const mimeType = this.getMimeType(imagePath);

      // Call GPT-4o with vision
      const response = await this.openai.chat.completions.create({
        model: model,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: `Analyze this game texture for Fallout 4 modding. Provide:
1. Quality score (0-10)
2. Resolution
3. Format assessment
4. Issues found (UV seams, artifacts, etc.)
5. Suggestions for improvement
6. What it's suitable for (hero assets, background, etc.)
7. UV mapping analysis if visible

Format as JSON.`,
              },
              {
                type: 'image_url',
                image_url: {
                  url: `data:${mimeType};base64,${base64Image}`,
                },
              },
            ],
          },
        ],
        max_tokens: 1000,
      });

      const content = response.choices[0].message.content || '{}';
      
      // Parse JSON response or create structured output
      try {
        const parsed = JSON.parse(content);
        return {
          ...parsed,
          timestamp: new Date().toISOString(),
        };
      } catch {
        // If not JSON, parse text response
        return this.parseTextResponse(content);
      }
    } catch (error) {
      console.error('Vision analysis error:', error);
      throw new Error(`Failed to analyze texture: ${error.message}`);
    }
  }

  /**
   * Analyze multiple textures in batch
   */
  async analyzeBatch(imagePaths: string[]): Promise<TextureAnalysis[]> {
    const results: TextureAnalysis[] = [];
    
    for (const path of imagePaths) {
      try {
        const analysis = await this.analyzeTexture(path);
        results.push(analysis);
        
        // Rate limiting - wait 1 second between calls
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
        console.error(`Failed to analyze ${path}:`, error);
      }
    }
    
    return results;
  }

  /**
   * Get quality summary for a texture
   */
  async getQualitySummary(imagePath: string): Promise<string> {
    const analysis = await this.analyzeTexture(imagePath);
    
    let summary = `Quality: ${analysis.quality_score}/10\n`;
    summary += `Resolution: ${analysis.resolution}\n`;
    
    if (analysis.issues.length > 0) {
      summary += `\nIssues:\n`;
      analysis.issues.forEach(issue => {
        summary += `  • ${issue}\n`;
      });
    }
    
    if (analysis.suggestions.length > 0) {
      summary += `\nSuggestions:\n`;
      analysis.suggestions.forEach(suggestion => {
        summary += `  • ${suggestion}\n`;
      });
    }
    
    return summary;
  }

  private getMimeType(filename: string): string {
    const ext = filename.toLowerCase().split('.').pop();
    const mimeTypes: Record<string, string> = {
      'png': 'image/png',
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'dds': 'image/vnd-ms.dds',
      'tga': 'image/tga',
    };
    return mimeTypes[ext || 'png'] || 'image/png';
  }

  private parseTextResponse(text: string): TextureAnalysis {
    // Simple text parsing fallback
    return {
      quality_score: 7.0,
      resolution: 'Unknown',
      format: 'Unknown',
      issues: [],
      suggestions: [text],
      suitable_for: ['General use'],
      timestamp: new Date().toISOString(),
    };
  }
}
```

### DALLETextureGenerator

Create `src/integrations/DALLETextureGenerator.ts`:

```typescript
import OpenAI from 'openai';
import fs from 'fs';
import path from 'path';
import https from 'https';

export interface TextureGenerationOptions {
  quality?: 'standard' | 'hd';
  size?: '1024x1024' | '1024x1792' | '1792x1024';
  style?: 'vivid' | 'natural';
}

export interface GeneratedTexture {
  url: string;
  localPath?: string;
  prompt: string;
  revisedPrompt?: string;
  cost: number;
  timestamp: string;
}

export class DALLETextureGenerator {
  private openai: OpenAI;
  private outputDir: string;

  constructor(apiKey: string, outputDir: string = 'public/generated-textures') {
    this.openai = new OpenAI({ apiKey });
    this.outputDir = outputDir;
    
    // Ensure output directory exists
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
  }

  /**
   * Generate a game texture from a text description
   */
  async generateTexture(
    prompt: string,
    options: TextureGenerationOptions = {}
  ): Promise<GeneratedTexture> {
    const {
      quality = 'hd',
      size = '1024x1024',
      style = 'natural',
    } = options;

    try {
      // Enhance prompt for game textures
      const enhancedPrompt = this.enhancePromptForGameTexture(prompt);

      // Generate image with DALL-E 3
      const response = await this.openai.images.generate({
        model: 'dall-e-3',
        prompt: enhancedPrompt,
        n: 1,
        size: size,
        quality: quality,
        style: style,
      });

      const imageUrl = response.data[0].url;
      if (!imageUrl) {
        throw new Error('No image URL returned');
      }

      // Download and save locally
      const localPath = await this.downloadImage(imageUrl, prompt);

      // Calculate cost
      const cost = this.calculateCost(quality, size);

      return {
        url: imageUrl,
        localPath,
        prompt: enhancedPrompt,
        revisedPrompt: response.data[0].revised_prompt,
        cost,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      console.error('Texture generation error:', error);
      throw new Error(`Failed to generate texture: ${error.message}`);
    }
  }

  /**
   * Generate multiple variations of a texture
   */
  async generateVariations(
    prompt: string,
    count: number = 3,
    options: TextureGenerationOptions = {}
  ): Promise<GeneratedTexture[]> {
    const variations: GeneratedTexture[] = [];

    for (let i = 0; i < count; i++) {
      try {
        // Add variation suffix to prompt
        const variantPrompt = `${prompt}, variation ${i + 1}`;
        const texture = await this.generateTexture(variantPrompt, options);
        variations.push(texture);

        // Rate limiting - wait 2 seconds between generations
        if (i < count - 1) {
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      } catch (error) {
        console.error(`Failed to generate variation ${i + 1}:`, error);
      }
    }

    return variations;
  }

  /**
   * Generate seamless tileable texture
   */
  async generateSeamlessTexture(
    prompt: string,
    options: TextureGenerationOptions = {}
  ): Promise<GeneratedTexture> {
    const seamlessPrompt = `${prompt}, seamless tileable texture, repeating pattern, no visible seams`;
    return this.generateTexture(seamlessPrompt, options);
  }

  /**
   * Generate PBR texture set (requires multiple calls)
   */
  async generatePBRSet(
    basePrompt: string,
    options: TextureGenerationOptions = {}
  ): Promise<{
    albedo: GeneratedTexture;
    normal: GeneratedTexture;
    roughness: GeneratedTexture;
  }> {
    const [albedo, normal, roughness] = await Promise.all([
      this.generateTexture(`${basePrompt}, albedo map, color only`, options),
      this.generateTexture(`${basePrompt}, normal map, purple and blue`, options),
      this.generateTexture(`${basePrompt}, roughness map, grayscale`, options),
    ]);

    return { albedo, normal, roughness };
  }

  private enhancePromptForGameTexture(prompt: string): string {
    // Add game texture specific keywords if not present
    const enhancements = [
      'game texture',
      '4K resolution',
      'photorealistic',
      'high detail',
      'suitable for 3D games',
    ];

    let enhanced = prompt;
    
    // Add enhancements that aren't already in the prompt
    enhancements.forEach(enhancement => {
      if (!prompt.toLowerCase().includes(enhancement.toLowerCase())) {
        enhanced += `, ${enhancement}`;
      }
    });

    return enhanced;
  }

  private async downloadImage(url: string, prompt: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const filename = `texture_${Date.now()}_${this.sanitizeFilename(prompt)}.png`;
      const filepath = path.join(this.outputDir, filename);
      const file = fs.createWriteStream(filepath);

      https.get(url, (response) => {
        response.pipe(file);
        file.on('finish', () => {
          file.close();
          resolve(filepath);
        });
      }).on('error', (err) => {
        fs.unlinkSync(filepath);
        reject(err);
      });
    });
  }

  private sanitizeFilename(text: string): string {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .substring(0, 30);
  }

  private calculateCost(quality: string, size: string): number {
    // DALL-E 3 pricing
    const costs: Record<string, number> = {
      'standard_1024x1024': 0.04,
      'standard_1024x1792': 0.08,
      'standard_1792x1024': 0.08,
      'hd_1024x1024': 0.08,
      'hd_1024x1792': 0.12,
      'hd_1792x1024': 0.12,
    };

    const key = `${quality}_${size}`;
    return costs[key] || 0.08;
  }
}
```

### TextureWorkflow (Combined)

Create `src/integrations/TextureWorkflow.ts`:

```typescript
import { VisionAnalysisService, TextureAnalysis } from './VisionAnalysisService';
import { DALLETextureGenerator, GeneratedTexture } from './DALLETextureGenerator';

export interface WorkflowOptions {
  targetQuality?: number; // 0-10
  maxIterations?: number;
  autoRefine?: boolean;
}

export interface WorkflowResult {
  finalTexture: GeneratedTexture;
  iterations: number;
  analyses: TextureAnalysis[];
  finalQuality: number;
  totalCost: number;
}

export class TextureWorkflow {
  private vision: VisionAnalysisService;
  private generator: DALLETextureGenerator;

  constructor(apiKey: string, outputDir?: string) {
    this.vision = new VisionAnalysisService(apiKey);
    this.generator = new DALLETextureGenerator(apiKey, outputDir);
  }

  /**
   * Generate a texture and refine it until target quality is reached
   */
  async generateAndRefine(
    prompt: string,
    options: WorkflowOptions = {}
  ): Promise<WorkflowResult> {
    const {
      targetQuality = 8.0,
      maxIterations = 3,
      autoRefine = true,
    } = options;

    const analyses: TextureAnalysis[] = [];
    let currentTexture: GeneratedTexture;
    let currentQuality = 0;
    let iteration = 0;
    let totalCost = 0;

    console.log(`Starting texture generation workflow for: "${prompt}"`);

    while (iteration < maxIterations && currentQuality < targetQuality) {
      iteration++;
      console.log(`\nIteration ${iteration}/${maxIterations}`);

      // Generate texture
      const refinedPrompt = iteration === 1
        ? prompt
        : this.refinePrompt(prompt, analyses[analyses.length - 1]);

      console.log(`Generating texture...`);
      currentTexture = await this.generator.generateTexture(refinedPrompt, {
        quality: 'hd',
        size: '1024x1024',
      });
      totalCost += currentTexture.cost;

      // Analyze result
      if (currentTexture.localPath) {
        console.log(`Analyzing texture quality...`);
        const analysis = await this.vision.analyzeTexture(currentTexture.localPath);
        analyses.push(analysis);
        currentQuality = analysis.quality_score;

        console.log(`Quality: ${currentQuality}/10`);
        
        if (analysis.issues.length > 0) {
          console.log(`Issues found: ${analysis.issues.join(', ')}`);
        }

        if (currentQuality >= targetQuality) {
          console.log(`✓ Target quality reached!`);
          break;
        }

        if (iteration < maxIterations && autoRefine) {
          console.log(`Refining...`);
          // Wait before next iteration
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }
    }

    console.log(`\nWorkflow complete!`);
    console.log(`Final quality: ${currentQuality}/10`);
    console.log(`Total iterations: ${iteration}`);
    console.log(`Total cost: $${totalCost.toFixed(2)}`);

    return {
      finalTexture: currentTexture!,
      iterations: iteration,
      analyses: analyses,
      finalQuality: currentQuality,
      totalCost: totalCost,
    };
  }

  /**
   * Analyze an existing texture and suggest improvements
   */
  async analyzeAndSuggest(imagePath: string): Promise<{
    analysis: TextureAnalysis;
    generationPrompt: string;
  }> {
    const analysis = await this.vision.analyzeTexture(imagePath);
    const generationPrompt = this.createPromptFromAnalysis(analysis);

    return {
      analysis,
      generationPrompt,
    };
  }

  private refinePrompt(originalPrompt: string, analysis: TextureAnalysis): string {
    let refined = originalPrompt;

    // Add fixes based on issues
    if (analysis.issues.includes('low resolution')) {
      refined += ', ultra high resolution, 4K';
    }

    if (analysis.issues.some(issue => issue.includes('UV seam'))) {
      refined += ', seamless, no visible seams';
    }

    if (analysis.issues.some(issue => issue.includes('artifact'))) {
      refined += ', clean, no artifacts, professional quality';
    }

    // Add suggestions
    analysis.suggestions.forEach(suggestion => {
      if (suggestion.toLowerCase().includes('more detail')) {
        refined += ', highly detailed';
      }
      if (suggestion.toLowerCase().includes('color')) {
        refined += ', vibrant colors, proper color balance';
      }
    });

    return refined;
  }

  private createPromptFromAnalysis(analysis: TextureAnalysis): string {
    // Create a prompt to regenerate improved version
    let prompt = 'high quality game texture';

    if (analysis.suitable_for.length > 0) {
      prompt += `, suitable for ${analysis.suitable_for[0].toLowerCase()}`;
    }

    // Add positive attributes
    prompt += ', photorealistic, 4K resolution, professional quality';

    // Add fixes for issues
    if (analysis.issues.some(issue => issue.includes('seam'))) {
      prompt += ', seamless tileable';
    }

    return prompt;
  }
}
```

## Step 3: Add Usage Tracking (5 minutes)

Create `src/integrations/UsageTracker.ts`:

```typescript
export interface UsageStats {
  date: string;
  visionCalls: number;
  visionCost: number;
  imageGenerations: number;
  imageCost: number;
  totalCost: number;
}

export class UsageTracker {
  private stats: Map<string, UsageStats>;
  private storageKey = 'mossy_ai_usage';

  constructor() {
    this.stats = new Map();
    this.loadStats();
  }

  async trackVisionCall(tokens: number = 1000): Promise<void> {
    const today = this.getToday();
    const cost = (tokens / 1000) * 0.01; // $0.01 per 1K tokens

    this.updateStats(today, {
      visionCalls: 1,
      visionCost: cost,
    });
  }

  async trackImageGeneration(quality: string = 'hd', size: string = '1024x1024'): Promise<void> {
    const today = this.getToday();
    const cost = this.calculateImageCost(quality, size);

    this.updateStats(today, {
      imageGenerations: 1,
      imageCost: cost,
    });
  }

  getSummary(days: number = 30): UsageStats {
    const summary: UsageStats = {
      date: 'summary',
      visionCalls: 0,
      visionCost: 0,
      imageGenerations: 0,
      imageCost: 0,
      totalCost: 0,
    };

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    this.stats.forEach((stats, date) => {
      if (new Date(date) >= cutoffDate) {
        summary.visionCalls += stats.visionCalls;
        summary.visionCost += stats.visionCost;
        summary.imageGenerations += stats.imageGenerations;
        summary.imageCost += stats.imageCost;
        summary.totalCost += stats.totalCost;
      }
    });

    return summary;
  }

  private updateStats(date: string, updates: Partial<UsageStats>): void {
    const existing = this.stats.get(date) || {
      date,
      visionCalls: 0,
      visionCost: 0,
      imageGenerations: 0,
      imageCost: 0,
      totalCost: 0,
    };

    if (updates.visionCalls) {
      existing.visionCalls += updates.visionCalls;
      existing.visionCost += updates.visionCost || 0;
    }

    if (updates.imageGenerations) {
      existing.imageGenerations += updates.imageGenerations;
      existing.imageCost += updates.imageCost || 0;
    }

    existing.totalCost = existing.visionCost + existing.imageCost;

    this.stats.set(date, existing);
    this.saveStats();
  }

  private getToday(): string {
    return new Date().toISOString().split('T')[0];
  }

  private calculateImageCost(quality: string, size: string): number {
    const costs: Record<string, number> = {
      'standard_1024x1024': 0.04,
      'hd_1024x1024': 0.08,
      'hd_1792x1024': 0.12,
    };
    return costs[`${quality}_${size}`] || 0.08;
  }

  private loadStats(): void {
    if (typeof window !== 'undefined' && window.localStorage) {
      const stored = localStorage.getItem(this.storageKey);
      if (stored) {
        const data = JSON.parse(stored);
        this.stats = new Map(Object.entries(data));
      }
    }
  }

  private saveStats(): void {
    if (typeof window !== 'undefined' && window.localStorage) {
      const data = Object.fromEntries(this.stats);
      localStorage.setItem(this.storageKey, JSON.stringify(data));
    }
  }
}
```

## Step 4: Add UI Integration (10 minutes)

### Add to Image Suite Component

Update `src/renderer/src/pages/ImageSuite.tsx`:

```typescript
import { VisionAnalysisService } from '@/integrations/VisionAnalysisService';
import { DALLETextureGenerator } from '@/integrations/DALLETextureGenerator';
import { TextureWorkflow } from '@/integrations/TextureWorkflow';

// Inside your component:
const [analyzing, setAnalyzing] = useState(false);
const [analysis, setAnalysis] = useState<any>(null);

const handleAnalyzeTexture = async (filePath: string) => {
  setAnalyzing(true);
  try {
    const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
    const service = new VisionAnalysisService(apiKey);
    const result = await service.analyzeTexture(filePath);
    setAnalysis(result);
    
    // Show results to user
    showNotification({
      title: 'Analysis Complete',
      message: `Quality: ${result.quality_score}/10`,
      type: 'success',
    });
  } catch (error) {
    console.error('Analysis failed:', error);
    showNotification({
      title: 'Analysis Failed',
      message: error.message,
      type: 'error',
    });
  } finally {
    setAnalyzing(false);
  }
};

const handleGenerateTexture = async (prompt: string) => {
  try {
    const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
    const generator = new DALLETextureGenerator(apiKey);
    const result = await generator.generateTexture(prompt, {
      quality: 'hd',
      size: '1024x1024',
    });
    
    showNotification({
      title: 'Texture Generated',
      message: `Saved to: ${result.localPath}`,
      type: 'success',
    });
  } catch (error) {
    console.error('Generation failed:', error);
  }
};
```

Add buttons to your UI:

```tsx
<Button
  onClick={() => handleAnalyzeTexture(selectedFile)}
  disabled={analyzing || !selectedFile}
>
  {analyzing ? 'Analyzing...' : 'AI Analyze Texture'}
</Button>

<Button
  onClick={() => setShowGenerateDialog(true)}
>
  AI Generate Texture
</Button>
```

## Step 5: Test Everything (8 minutes)

### Test Vision Analysis

```typescript
// Test script: test-vision.ts
import { VisionAnalysisService } from './src/integrations/VisionAnalysisService';

const apiKey = process.env.OPENAI_API_KEY;
const service = new VisionAnalysisService(apiKey);

async function test() {
  const analysis = await service.analyzeTexture('test-texture.png');
  console.log('Analysis:', analysis);
  console.log('Quality Score:', analysis.quality_score);
  console.log('Issues:', analysis.issues);
}

test();
```

### Test Texture Generation

```typescript
// Test script: test-generation.ts
import { DALLETextureGenerator } from './src/integrations/DALLETextureGenerator';

const apiKey = process.env.OPENAI_API_KEY;
const generator = new DALLETextureGenerator(apiKey);

async function test() {
  const texture = await generator.generateTexture(
    'rusty corrugated metal, post-apocalyptic, weathered'
  );
  console.log('Generated:', texture);
  console.log('Saved to:', texture.localPath);
}

test();
```

### Test Combined Workflow

```typescript
// Test script: test-workflow.ts
import { TextureWorkflow } from './src/integrations/TextureWorkflow';

const apiKey = process.env.OPENAI_API_KEY;
const workflow = new TextureWorkflow(apiKey);

async function test() {
  const result = await workflow.generateAndRefine(
    'weathered wood planks, old barn',
    { targetQuality: 8.0, maxIterations: 3 }
  );
  
  console.log('Workflow complete!');
  console.log('Final quality:', result.finalQuality);
  console.log('Iterations:', result.iterations);
  console.log('Total cost:', result.totalCost);
}

test();
```

## Usage Examples

### Example 1: Quick Texture Analysis

```typescript
const service = new VisionAnalysisService(apiKey);
const summary = await service.getQualitySummary('my-texture.dds');
console.log(summary);
// Output:
// Quality: 7.5/10
// Resolution: 2048x2048
// Issues:
//   • Minor UV seam visible at top edge
//   • Compression artifacts in dark areas
// Suggestions:
//   • Use seamless texture tools
//   • Export at higher quality settings
```

### Example 2: Generate Seamless Texture

```typescript
const generator = new DALLETextureGenerator(apiKey);
const texture = await generator.generateSeamlessTexture(
  'cracked concrete, industrial'
);
console.log(`Texture saved to: ${texture.localPath}`);
```

### Example 3: Auto-Refining Workflow

```typescript
const workflow = new TextureWorkflow(apiKey);
const result = await workflow.generateAndRefine(
  'rusty metal roof panels',
  { targetQuality: 8.5 }
);
console.log(`Perfect texture achieved in ${result.iterations} iterations!`);
```

## Cost Management

### Monitor Usage

```typescript
const tracker = new UsageTracker();

// After vision call
await tracker.trackVisionCall(1000);

// After image generation
await tracker.trackImageGeneration('hd', '1024x1024');

// Get summary
const summary = tracker.getSummary(30); // Last 30 days
console.log(`Total spent: $${summary.totalCost.toFixed(2)}`);
console.log(`Vision calls: ${summary.visionCalls}`);
console.log(`Images generated: ${summary.imageGenerations}`);
```

### Set Budget Alerts

```typescript
const MAX_DAILY_COST = 10.00; // $10 per day

const summary = tracker.getSummary(1); // Today
if (summary.totalCost > MAX_DAILY_COST) {
  console.warn('Daily budget exceeded!');
  // Disable AI features or notify user
}
```

## Best Practices

### 1. Optimize Prompts

```typescript
// Good prompt for game textures
const goodPrompt = `
  weathered wood planks,
  old barn wood,
  seamless tileable texture,
  4K resolution,
  photorealistic,
  game asset quality,
  proper lighting,
  high detail
`;

// Bad prompt
const badPrompt = 'wood';
```

### 2. Handle Errors Gracefully

```typescript
try {
  const texture = await generator.generateTexture(prompt);
} catch (error) {
  if (error.message.includes('rate limit')) {
    // Wait and retry
    await new Promise(r => setTimeout(r, 60000));
    return retry();
  } else if (error.message.includes('content policy')) {
    // Adjust prompt
    return generateTexture(sanitizePrompt(prompt));
  } else {
    // Show error to user
    showError('Failed to generate texture');
  }
}
```

### 3. Cache Results

```typescript
const cache = new Map<string, TextureAnalysis>();

async function analyzeWithCache(path: string) {
  if (cache.has(path)) {
    return cache.get(path);
  }
  
  const analysis = await service.analyzeTexture(path);
  cache.set(path, analysis);
  return analysis;
}
```

## Troubleshooting

### Issue: "Invalid API key"
**Solution:** Check your `.env.local` file has correct `OPENAI_API_KEY`

### Issue: "Rate limit exceeded"
**Solution:** Add delays between calls:
```typescript
await new Promise(resolve => setTimeout(resolve, 2000));
```

### Issue: "Content policy violation"
**Solution:** Review and sanitize your prompts

### Issue: "Image too large"
**Solution:** Resize images before analysis:
```typescript
// Max 20MB for vision API
if (fileSize > 20 * 1024 * 1024) {
  // Resize or compress
}
```

## Next Steps

1. **Week 1:** 
   - Integrate vision analysis into Image Suite
   - Test with existing textures
   - Gather feedback

2. **Week 2:**
   - Add DALL-E 3 generation
   - Create UI for texture generation
   - Test workflows

3. **Week 3:**
   - Add to Auditor module
   - Create presets for common textures
   - Optimize prompts

4. **Ongoing:**
   - Monitor costs
   - Collect user feedback
   - Refine features

## Summary

You now have:
- ✅ Complete vision analysis service
- ✅ DALL-E 3 texture generation
- ✅ Combined refinement workflow
- ✅ Usage tracking
- ✅ Error handling
- ✅ Best practices

**Time to implement: 30 minutes**
**Time to master: 2 weeks**

Start with vision analysis, then add generation, then combine them for powerful automated workflows!

---

**Need help?** Check:
- AI_ENHANCEMENT_OPTIONS.md - Complete service catalog
- AI_ENHANCEMENT_QUICK_START.md - 2-week detailed guide
- YOUR_AI_IMPLEMENTATION_SUMMARY.md - Quick reference
