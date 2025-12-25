/**
 * Hello World Integration
 * 
 * A safe, example integration that demonstrates the basic structure.
 * This integration has no side effects and doesn't access any system resources.
 */

export interface HelloWorldConfig {
  enabled: boolean;
  customGreeting?: string;
}

export interface HelloWorldResult {
  success: boolean;
  message: string;
  timestamp: number;
}

/**
 * Hello World Integration Class
 * 
 * This is a template for creating new integrations.
 * It demonstrates:
 * - Configuration management
 * - Input validation
 * - Error handling
 * - Type-safe results
 */
export class HelloWorldIntegration {
  private config: HelloWorldConfig;

  constructor(config: HelloWorldConfig = { enabled: true }) {
    this.config = config;
  }

  /**
   * Execute the hello world action
   * @param name - The name to greet
   * @returns Result with greeting message
   */
  async execute(name: string = 'World'): Promise<HelloWorldResult> {
    if (!this.config.enabled) {
      return {
        success: false,
        message: 'Integration is disabled',
        timestamp: Date.now(),
      };
    }

    // Validate input (example)
    if (typeof name !== 'string' || name.trim().length === 0) {
      return {
        success: false,
        message: 'Invalid name provided',
        timestamp: Date.now(),
      };
    }

    // Sanitize input (remove potentially dangerous characters)
    const sanitizedName = name.trim().replace(/[<>]/g, '');

    const greeting = this.config.customGreeting || 'Hello';
    
    return {
      success: true,
      message: `${greeting}, ${sanitizedName}!`,
      timestamp: Date.now(),
    };
  }

  /**
   * Get integration info
   */
  getInfo() {
    return {
      name: 'Hello World Integration',
      version: '1.0.0',
      description: 'A safe example integration for demonstration purposes',
      permissions: [],
      enabled: this.config.enabled,
    };
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<HelloWorldConfig>) {
    this.config = { ...this.config, ...newConfig };
  }
}

/**
 * Example usage:
 * 
 * const integration = new HelloWorldIntegration({ enabled: true });
 * const result = await integration.execute('Alice');
 * console.log(result.message); // "Hello, Alice!"
 */
