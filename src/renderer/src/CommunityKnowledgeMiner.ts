/**
 * CommunityKnowledgeMiner - Learns from community contributions via GitHub issues
 * 
 * This service implements continuous learning by:
 * 1. Mining GitHub issues tagged with "community-learning"
 * 2. Extracting patterns, solutions, and common problems
 * 3. Feeding learnings to AI context for better suggestions
 * 4. Tracking success rate of community solutions
 */

export interface CommunityKnowledgeEntry {
  id: string;
  source: 'github-issue' | 'user-feedback' | 'success-pattern';
  title: string;
  description: string;
  category: 'workflow' | 'troubleshooting' | 'optimization' | 'best-practice';
  tags: string[];
  solution?: string;
  successRate: number; // 0-1, based on usage feedback
  usageCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface LearningPattern {
  pattern: string;
  frequency: number;
  context: string[];
  suggestedSolution: string;
  confidence: number; // 0-1
}

class CommunityKnowledgeMinerService {
  private knowledge: Map<string, CommunityKnowledgeEntry> = new Map();
  private patterns: LearningPattern[] = [];
  private lastSync: Date | null = null;

  /**
   * Initialize the knowledge base from local storage
   */
  async initialize(): Promise<void> {
    try {
      const stored = localStorage.getItem('mossy_community_knowledge');
      if (stored) {
        const data = JSON.parse(stored);
        this.knowledge = new Map(Object.entries(data.knowledge || {}));
        this.patterns = data.patterns || [];
        this.lastSync = data.lastSync ? new Date(data.lastSync) : null;
      }
    } catch (error) {
      console.error('Failed to initialize community knowledge:', error);
    }
  }

  /**
   * Save knowledge base to local storage
   */
  private async save(): Promise<void> {
    try {
      const data = {
        knowledge: Object.fromEntries(this.knowledge),
        patterns: this.patterns,
        lastSync: this.lastSync?.toISOString(),
      };
      localStorage.setItem('mossy_community_knowledge', JSON.stringify(data));
    } catch (error) {
      console.error('Failed to save community knowledge:', error);
    }
  }

  /**
   * Mine knowledge from a GitHub issue
   */
  async mineFromIssue(issue: {
    id: number;
    title: string;
    body: string;
    labels: string[];
    createdAt: string;
  }): Promise<CommunityKnowledgeEntry | null> {
    try {
      // Extract category from labels
      const category = this.extractCategory(issue.labels);
      
      // Extract tags
      const tags = this.extractTags(issue.body);
      
      // Extract solution if present
      const solution = this.extractSolution(issue.body);
      
      // Create knowledge entry
      const entry: CommunityKnowledgeEntry = {
        id: `github-${issue.id}`,
        source: 'github-issue',
        title: issue.title,
        description: issue.body.substring(0, 500), // First 500 chars
        category,
        tags,
        solution,
        successRate: 0.5, // Start neutral
        usageCount: 0,
        createdAt: issue.createdAt,
        updatedAt: new Date().toISOString(),
      };
      
      // Store knowledge
      this.knowledge.set(entry.id, entry);
      await this.save();
      
      // Extract patterns
      await this.extractPatterns(entry);
      
      return entry;
    } catch (error) {
      console.error('Failed to mine knowledge from issue:', error);
      return null;
    }
  }

  /**
   * Extract category from issue labels
   */
  private extractCategory(labels: string[]): CommunityKnowledgeEntry['category'] {
    const categoryMap: Record<string, CommunityKnowledgeEntry['category']> = {
      workflow: 'workflow',
      troubleshooting: 'troubleshooting',
      optimization: 'optimization',
      'best-practice': 'best-practice',
    };
    
    for (const label of labels) {
      if (categoryMap[label]) {
        return categoryMap[label];
      }
    }
    
    return 'workflow'; // Default
  }

  /**
   * Extract tags from issue body
   */
  private extractTags(body: string): string[] {
    const tags: string[] = [];
    
    // Common keywords to look for
    const keywords = [
      'blender', 'animation', 'texture', 'export', 'nif', 'esp',
      'collision', 'rigging', 'uv', 'material', 'scale', 'fps',
      'havok', 'skeleton', 'weight-paint', 'lod', 'poly-count',
    ];
    
    const lowerBody = body.toLowerCase();
    for (const keyword of keywords) {
      if (lowerBody.includes(keyword)) {
        tags.push(keyword);
      }
    }
    
    return tags;
  }

  /**
   * Extract solution from issue body
   */
  private extractSolution(body: string): string | undefined {
    // Look for solution markers
    const solutionMarkers = [
      '## Solution',
      '### Solution',
      '**Solution:**',
      'Solution:',
      'Fixed by:',
      'Resolved by:',
    ];
    
    for (const marker of solutionMarkers) {
      const index = body.indexOf(marker);
      if (index !== -1) {
        // Extract solution (next 500 chars)
        const solution = body.substring(index + marker.length, index + marker.length + 500);
        return solution.trim();
      }
    }
    
    return undefined;
  }

  /**
   * Extract patterns from knowledge entry
   */
  private async extractPatterns(entry: CommunityKnowledgeEntry): Promise<void> {
    // Simple pattern extraction based on common issues
    const text = `${entry.title} ${entry.description}`.toLowerCase();
    
    // Common patterns
    const patternDefinitions = [
      {
        keywords: ['scale', 'not 1.0', 'wrong scale'],
        pattern: 'Incorrect object scale',
        solution: 'Apply scale transforms before export (Ctrl+A → Scale)',
        context: ['blender', 'export'],
      },
      {
        keywords: ['fps', '30 fps', 'animation speed'],
        pattern: 'Wrong animation FPS',
        solution: 'Set timeline to exactly 30 FPS for Fallout 4',
        context: ['animation', 'blender'],
      },
      {
        keywords: ['absolute path', 'texture path', 'c:\\'],
        pattern: 'Absolute texture paths',
        solution: 'Convert texture paths to relative or pack textures',
        context: ['texture', 'export'],
      },
      {
        keywords: ['poly count', 'too many', 'triangles'],
        pattern: 'High polygon count',
        solution: 'Reduce poly count below 50k triangles using decimation',
        context: ['optimization', 'blender'],
      },
      {
        keywords: ['uv', 'missing', 'unwrap'],
        pattern: 'Missing UV maps',
        solution: 'UV unwrap the mesh before exporting',
        context: ['texture', 'blender'],
      },
    ];
    
    // Check each pattern
    for (const def of patternDefinitions) {
      const matches = def.keywords.filter(kw => text.includes(kw));
      if (matches.length > 0) {
        // Find existing pattern or create new one
        let pattern = this.patterns.find(p => p.pattern === def.pattern);
        if (pattern) {
          pattern.frequency++;
          pattern.confidence = Math.min(1.0, pattern.confidence + 0.05);
        } else {
          pattern = {
            pattern: def.pattern,
            frequency: 1,
            context: def.context,
            suggestedSolution: def.solution,
            confidence: 0.6,
          };
          this.patterns.push(pattern);
        }
      }
    }
    
    await this.save();
  }

  /**
   * Get relevant knowledge for current context
   */
  getRelevantKnowledge(context: {
    workflowStage?: string;
    activeTools?: string[];
    fileTypes?: string[];
    userIntent?: string;
  }): CommunityKnowledgeEntry[] {
    const relevant: CommunityKnowledgeEntry[] = [];
    
    for (const entry of this.knowledge.values()) {
      let score = entry.successRate;
      
      // Boost score based on context matches
      if (context.workflowStage && entry.tags.includes(context.workflowStage)) {
        score += 0.2;
      }
      
      if (context.activeTools) {
        for (const tool of context.activeTools) {
          if (entry.tags.includes(tool.toLowerCase())) {
            score += 0.1;
          }
        }
      }
      
      if (context.fileTypes) {
        for (const fileType of context.fileTypes) {
          if (entry.tags.includes(fileType)) {
            score += 0.1;
          }
        }
      }
      
      // Only include if above threshold
      if (score > 0.5) {
        relevant.push(entry);
      }
    }
    
    // Sort by score (highest first)
    relevant.sort((a, b) => b.successRate - a.successRate);
    
    return relevant.slice(0, 10); // Top 10
  }

  /**
   * Get patterns matching current context
   */
  getRelevantPatterns(context: {
    workflowStage?: string;
    activeTools?: string[];
  }): LearningPattern[] {
    return this.patterns
      .filter(p => {
        // Match context
        if (context.workflowStage && p.context.includes(context.workflowStage)) {
          return true;
        }
        if (context.activeTools) {
          return context.activeTools.some(tool => 
            p.context.includes(tool.toLowerCase())
          );
        }
        return p.confidence > 0.7; // High confidence patterns always included
      })
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 5); // Top 5
  }

  /**
   * Record successful use of community knowledge
   */
  async recordSuccess(knowledgeId: string): Promise<void> {
    const entry = this.knowledge.get(knowledgeId);
    if (entry) {
      entry.usageCount++;
      // Update success rate (exponential moving average)
      entry.successRate = entry.successRate * 0.9 + 0.1;
      entry.updatedAt = new Date().toISOString();
      await this.save();
    }
  }

  /**
   * Record failed use of community knowledge
   */
  async recordFailure(knowledgeId: string): Promise<void> {
    const entry = this.knowledge.get(knowledgeId);
    if (entry) {
      entry.usageCount++;
      // Update success rate (exponential moving average)
      entry.successRate = entry.successRate * 0.9;
      entry.updatedAt = new Date().toISOString();
      await this.save();
    }
  }

  /**
   * Get summary statistics
   */
  getStatistics(): {
    totalKnowledge: number;
    totalPatterns: number;
    averageSuccessRate: number;
    lastSync: string | null;
  } {
    const successRates = Array.from(this.knowledge.values()).map(e => e.successRate);
    const avgSuccessRate = successRates.length > 0
      ? successRates.reduce((sum, rate) => sum + rate, 0) / successRates.length
      : 0;
    
    return {
      totalKnowledge: this.knowledge.size,
      totalPatterns: this.patterns.length,
      averageSuccessRate: avgSuccessRate,
      lastSync: this.lastSync?.toISOString() || null,
    };
  }

  /**
   * Export knowledge for AI context
   */
  exportForAI(): string {
    const stats = this.getStatistics();
    let context = `# Community Knowledge Base\n\n`;
    context += `Total Entries: ${stats.totalKnowledge}\n`;
    context += `Total Patterns: ${stats.totalPatterns}\n`;
    context += `Average Success Rate: ${(stats.averageSuccessRate * 100).toFixed(1)}%\n\n`;
    
    // Top patterns
    if (this.patterns.length > 0) {
      context += `## Common Patterns:\n\n`;
      const topPatterns = this.patterns
        .sort((a, b) => b.frequency - a.frequency)
        .slice(0, 5);
      
      for (const pattern of topPatterns) {
        context += `- **${pattern.pattern}** (seen ${pattern.frequency}x, ${(pattern.confidence * 100).toFixed(0)}% confidence)\n`;
        context += `  Solution: ${pattern.suggestedSolution}\n\n`;
      }
    }
    
    // Top knowledge entries
    const topEntries = Array.from(this.knowledge.values())
      .sort((a, b) => b.successRate - a.successRate)
      .slice(0, 5);
    
    if (topEntries.length > 0) {
      context += `## Proven Solutions:\n\n`;
      for (const entry of topEntries) {
        context += `- **${entry.title}** (${(entry.successRate * 100).toFixed(0)}% success rate)\n`;
        if (entry.solution) {
          context += `  ${entry.solution.substring(0, 200)}...\n`;
        }
        context += `\n`;
      }
    }
    
    return context;
  }
}

// Export singleton instance
export const communityKnowledgeMiner = new CommunityKnowledgeMinerService();

// Initialize on module load
communityKnowledgeMiner.initialize();
