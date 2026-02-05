import { Groq } from 'groq-sdk';
import OpenAI from 'openai';
import * as fs from 'fs';
import * as path from 'path';
import { app } from 'electron';

export interface LLMMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface LLMConfig {
  provider: 'groq' | 'openai' | 'ollama';
  model?: string;
  temperature?: number;
  maxTokens?: number;
  version?: string;
}

export interface ModelVersion {
  id: string;
  provider: string;
  model: string;
  version: string;
  createdAt: number;
  performanceMetrics: {
    accuracy: number;
    latency: number;
    cost: number;
    userSatisfaction: number;
  };
  isActive: boolean;
  metadata: Record<string, any>;
}

export interface ABTestVariant {
  id: string;
  name: string;
  config: LLMConfig;
  weight: number; // 0-1, percentage of traffic
  metrics: {
    impressions: number;
    conversions: number;
    satisfaction: number;
  };
}

export interface ABTest {
  id: string;
  name: string;
  variants: ABTestVariant[];
  startDate: number;
  endDate?: number;
  status: 'active' | 'completed' | 'paused';
  targetMetric: 'satisfaction' | 'accuracy' | 'latency';
}

export interface ModelExplainabilityResult {
  response: string;
  confidence: number;
  reasoning: string[];
  alternativeResponses: Array<{
    text: string;
    probability: number;
    reasoning: string;
  }>;
  biasAnalysis: {
    detectedBiases: string[];
    mitigationStrategies: string[];
  };
  sources: Array<{
    type: 'training_data' | 'knowledge_base' | 'context';
    relevance: number;
    content: string;
  }>;
}

export class EnhancedLLMService {
  private groqClient?: Groq;
  private openaiClient?: OpenAI;
  private modelVersions: Map<string, ModelVersion> = new Map();
  private abTests: Map<string, ABTest> = new Map();
  private performanceHistory: Array<{
    timestamp: number;
    config: LLMConfig;
    responseTime: number;
    success: boolean;
    userFeedback?: number;
  }> = [];

  private readonly modelsDir: string;

  constructor() {
    this.modelsDir = path.join(app.getPath('userData'), 'models');

    // Ensure models directory exists
    if (!fs.existsSync(this.modelsDir)) {
      fs.mkdirSync(this.modelsDir, { recursive: true });
    }

    const groqKey = process.env.GROQ_API_KEY;
    const openaiKey = process.env.OPENAI_API_KEY;

    if (groqKey) {
      this.groqClient = new Groq({ apiKey: groqKey });
    }

    if (openaiKey) {
      this.openaiClient = new OpenAI({ apiKey: openaiKey });
    }

    this.loadModelVersions();
    this.loadABTests();
  }

  // Model Persistence and Versioning
  async saveModelVersion(version: Omit<ModelVersion, 'id' | 'createdAt'>): Promise<string> {
    const id = `model_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const modelVersion: ModelVersion = {
      ...version,
      id,
      createdAt: Date.now(),
    };

    this.modelVersions.set(id, modelVersion);
    await this.persistModelVersions();

    return id;
  }

  async getModelVersion(id: string): Promise<ModelVersion | undefined> {
    return this.modelVersions.get(id);
  }

  async getActiveModelVersions(): Promise<ModelVersion[]> {
    return Array.from(this.modelVersions.values()).filter(v => v.isActive);
  }

  async updateModelPerformance(id: string, metrics: Partial<ModelVersion['performanceMetrics']>): Promise<void> {
    const version = this.modelVersions.get(id);
    if (version) {
      version.performanceMetrics = { ...version.performanceMetrics, ...metrics };
      await this.persistModelVersions();
    }
  }

  // A/B Testing
  async createABTest(test: Omit<ABTest, 'id'>): Promise<string> {
    const id = `ab_test_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const abTest: ABTest = { ...test, id };

    // Validate weights sum to 1
    const totalWeight = abTest.variants.reduce((sum, v) => sum + v.weight, 0);
    if (Math.abs(totalWeight - 1) > 0.01) {
      throw new Error('Variant weights must sum to 1.0');
    }

    this.abTests.set(id, abTest);
    await this.persistABTests();

    return id;
  }

  async getABTestVariant(userId: string, testId: string): Promise<ABTestVariant | null> {
    const test = this.abTests.get(testId);
    if (!test || test.status !== 'active') return null;

    // Simple hash-based distribution for consistency
    const hash = this.simpleHash(userId + testId);
    let cumulativeWeight = 0;

    for (const variant of test.variants) {
      cumulativeWeight += variant.weight;
      if (hash < cumulativeWeight) {
        return variant;
      }
    }

    return test.variants[0]; // fallback
  }

  async recordABTestMetric(testId: string, variantId: string, metric: keyof ABTestVariant['metrics']): Promise<void> {
    const test = this.abTests.get(testId);
    if (!test) return;

    const variant = test.variants.find(v => v.id === variantId);
    if (variant) {
      variant.metrics[metric]++;
      await this.persistABTests();
    }
  }

  // Enhanced Response Generation with Explainability
  async generateResponseWithExplainability(
    messages: LLMMessage[],
    config: LLMConfig,
    includeExplainability: boolean = false
  ): Promise<ModelExplainabilityResult> {
    const startTime = Date.now();

    try {
      const response = await this.generateResponse(messages, config);
      const responseTime = Date.now() - startTime;

      // Record performance
      this.performanceHistory.push({
        timestamp: Date.now(),
        config,
        responseTime,
        success: true,
      });

      if (!includeExplainability) {
        return {
          response,
          confidence: 0.8, // Default confidence
          reasoning: ['Response generated successfully'],
          alternativeResponses: [],
          biasAnalysis: { detectedBiases: [], mitigationStrategies: [] },
          sources: [],
        };
      }

      // Generate explainability data
      const explainability = await this.generateExplainabilityData(messages, config, response);

      return {
        response,
        ...explainability,
      };

    } catch (error) {
      // Record failed performance
      this.performanceHistory.push({
        timestamp: Date.now(),
        config,
        responseTime: Date.now() - startTime,
        success: false,
      });

      throw error;
    }
  }

  private async generateExplainabilityData(
    messages: LLMMessage[],
    config: LLMConfig,
    response: string
  ): Promise<Omit<ModelExplainabilityResult, 'response'>> {
    // This is a simplified implementation. In a real system, you'd use
    // model introspection APIs or additional ML models for explainability

    const reasoning = [
      'Based on conversation context and user query',
      'Utilizing Fallout 4 modding knowledge base',
      'Considering current tool integration state',
    ];

    const alternativeResponses = [
      {
        text: 'Let me check the current tool status first.',
        probability: 0.3,
        reasoning: 'More cautious approach',
      },
      {
        text: 'Based on my analysis, here are the recommended steps.',
        probability: 0.2,
        reasoning: 'More structured response format',
      },
    ];

    return {
      confidence: 0.85,
      reasoning,
      alternativeResponses,
      biasAnalysis: {
        detectedBiases: [], // Would be populated by bias detection model
        mitigationStrategies: [
          'Using balanced training data',
          'Implementing fairness constraints',
          'Regular bias audits',
        ],
      },
      sources: [
        {
          type: 'knowledge_base',
          relevance: 0.9,
          content: 'Fallout 4 modding documentation and best practices',
        },
        {
          type: 'context',
          relevance: 0.7,
          content: 'Current user session and tool states',
        },
      ],
    };
  }

  // Original generateResponse method (kept for backward compatibility)
  async generateResponse(messages: LLMMessage[], config: LLMConfig): Promise<string> {
    try {
      if (config.provider === 'groq' && this.groqClient) {
        const model = config.model || 'llama-3.3-70b-versatile';
        const completion = await this.groqClient.chat.completions.create({
          model,
          messages,
          temperature: config.temperature || 0.7,
          max_tokens: config.maxTokens || 1024,
        });
        return completion.choices[0]?.message?.content || 'No response generated';
      }

      if (config.provider === 'openai' && this.openaiClient) {
        const model = config.model || 'gpt-4o-mini';
        const completion = await this.openaiClient.chat.completions.create({
          model,
          messages,
          temperature: config.temperature || 0.7,
          max_tokens: config.maxTokens || 1024,
        });
        return completion.choices[0]?.message?.content || 'No response generated';
      }

      throw new Error(`Provider ${config.provider} not available or API key missing`);
    } catch (error) {
      console.error('LLM API error details:', {
        provider: config.provider,
        model: config.model,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });
      throw new Error(`Failed to generate response: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  hasProvider(provider: 'groq' | 'openai' | 'ollama'): boolean {
    if (provider === 'groq') return !!this.groqClient;
    if (provider === 'openai') return !!this.openaiClient;
    if (provider === 'ollama') return true; // Assume available if requested
    return false;
  }

  // Performance Analytics
  getPerformanceMetrics(timeRange: number = 24 * 60 * 60 * 1000): {
    averageResponseTime: number;
    successRate: number;
    totalRequests: number;
    modelUsage: Record<string, number>;
  } {
    const cutoff = Date.now() - timeRange;
    const recentHistory = this.performanceHistory.filter(h => h.timestamp > cutoff);

    const totalRequests = recentHistory.length;
    const successfulRequests = recentHistory.filter(h => h.success).length;
    const averageResponseTime = recentHistory.reduce((sum, h) => sum + h.responseTime, 0) / totalRequests || 0;

    const modelUsage: Record<string, number> = {};
    recentHistory.forEach(h => {
      const key = `${h.config.provider}:${h.config.model}`;
      modelUsage[key] = (modelUsage[key] || 0) + 1;
    });

    return {
      averageResponseTime,
      successRate: totalRequests > 0 ? successfulRequests / totalRequests : 0,
      totalRequests,
      modelUsage,
    };
  }

  // Persistence methods
  private async persistModelVersions(): Promise<void> {
    const versionsPath = path.join(this.modelsDir, 'model-versions.json');
    const versions = Array.from(this.modelVersions.entries());
    await fs.promises.writeFile(versionsPath, JSON.stringify(versions, null, 2));
  }

  private async loadModelVersions(): Promise<void> {
    try {
      const versionsPath = path.join(this.modelsDir, 'model-versions.json');
      if (fs.existsSync(versionsPath)) {
        const data = await fs.promises.readFile(versionsPath, 'utf-8');
        const versions: [string, ModelVersion][] = JSON.parse(data);
        this.modelVersions = new Map(versions);
      }
    } catch (error) {
      console.error('Failed to load model versions:', error);
    }
  }

  private async persistABTests(): Promise<void> {
    const testsPath = path.join(this.modelsDir, 'ab-tests.json');
    const tests = Array.from(this.abTests.entries());
    await fs.promises.writeFile(testsPath, JSON.stringify(tests, null, 2));
  }

  private async loadABTests(): Promise<void> {
    try {
      const testsPath = path.join(this.modelsDir, 'ab-tests.json');
      if (fs.existsSync(testsPath)) {
        const data = await fs.promises.readFile(testsPath, 'utf-8');
        const tests: [string, ABTest][] = JSON.parse(data);
        this.abTests = new Map(tests);
      }
    } catch (error) {
      console.error('Failed to load A/B tests:', error);
    }
  }

  private simpleHash(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash) / 2147483647; // Normalize to 0-1
  }
}

// Backward compatibility
export class LLMService extends EnhancedLLMService {}