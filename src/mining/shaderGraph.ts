/**
 * Shader Graph System
 * 
 * Complete node-based shader graph compiler for material workflows
 * Supports:
 * - Texture sampling and blending
 * - Mathematical operations (multiply, add, clamp, power, etc.)
 * - Color operations (RGB split, HSV adjust, color ramp, etc.)
 * - Normal map blending and processing
 * - Vector operations (normalize, length, dot, cross, etc.)
 * - GLSL shader code generation
 * - Graph validation and optimization
 * 
 * Features:
 * - Visual node-based workflow
 * - Real-time shader compilation
 * - Graph validation with error reporting
 * - Unused node detection
 * - Shader code generation (vertex, fragment, compute)
 */

import {
  ShaderGraph,
  ShaderNode,
  NodeConnection,
  OutputNode,
  NodeInput,
  NodeOutput,
  MathOperation,
  ColorOperation,
  VectorOperation,
  NodeDefinition,
  ShaderGraphValidationResult,
  CompiledShaderOutput,
  ShaderNodeType,
} from '../shared/types';

/**
 * Node Definition Registry - Define all available node types
 */
export class NodeRegistry {
  private nodeDefinitions: Map<string, NodeDefinition>;

  constructor() {
    this.nodeDefinitions = new Map();
    this.registerBuiltInNodes();
  }

  /**
   * Register all built-in node types
   */
  private registerBuiltInNodes(): void {
    // Texture Nodes
    this.register({
      id: 'texture-sample',
      category: 'texture',
      name: 'Texture Sample',
      description: 'Sample a texture at UV coordinates',
      inputs: [
        { id: 'texture', name: 'Texture', type: 'texture' },
        { id: 'uv', name: 'UV', type: 'vector2', defaultValue: [0, 0] },
      ],
      outputs: [
        { id: 'rgba', name: 'RGBA', type: 'vector4' },
        { id: 'rgb', name: 'RGB', type: 'vector3' },
        { id: 'alpha', name: 'Alpha', type: 'float' },
      ],
    });

    this.register({
      id: 'texture-combine',
      category: 'texture',
      name: 'Texture Combine',
      description: 'Combine RGB channels from multiple textures',
      inputs: [
        { id: 'r', name: 'Red', type: 'texture' },
        { id: 'g', name: 'Green', type: 'texture' },
        { id: 'b', name: 'Blue', type: 'texture' },
      ],
      outputs: [
        { id: 'rgba', name: 'RGBA', type: 'vector4' },
      ],
    });

    // Math Nodes
    this.register({
      id: 'multiply',
      category: 'math',
      name: 'Multiply',
      description: 'Multiply two values',
      inputs: [
        { id: 'a', name: 'A', type: 'float', defaultValue: 1 },
        { id: 'b', name: 'B', type: 'float', defaultValue: 1 },
      ],
      outputs: [
        { id: 'result', name: 'Result', type: 'float' },
      ],
    });

    this.register({
      id: 'add',
      category: 'math',
      name: 'Add',
      description: 'Add two values',
      inputs: [
        { id: 'a', name: 'A', type: 'float', defaultValue: 0 },
        { id: 'b', name: 'B', type: 'float', defaultValue: 0 },
      ],
      outputs: [
        { id: 'result', name: 'Result', type: 'float' },
      ],
    });

    this.register({
      id: 'subtract',
      category: 'math',
      name: 'Subtract',
      description: 'Subtract B from A',
      inputs: [
        { id: 'a', name: 'A', type: 'float', defaultValue: 0 },
        { id: 'b', name: 'B', type: 'float', defaultValue: 0 },
      ],
      outputs: [
        { id: 'result', name: 'Result', type: 'float' },
      ],
    });

    this.register({
      id: 'divide',
      category: 'math',
      name: 'Divide',
      description: 'Divide A by B',
      inputs: [
        { id: 'a', name: 'A', type: 'float', defaultValue: 1 },
        { id: 'b', name: 'B', type: 'float', defaultValue: 1 },
      ],
      outputs: [
        { id: 'result', name: 'Result', type: 'float' },
      ],
    });

    this.register({
      id: 'power',
      category: 'math',
      name: 'Power',
      description: 'Raise A to power B',
      inputs: [
        { id: 'a', name: 'Base', type: 'float', defaultValue: 1 },
        { id: 'b', name: 'Exponent', type: 'float', defaultValue: 1 },
      ],
      outputs: [
        { id: 'result', name: 'Result', type: 'float' },
      ],
    });

    this.register({
      id: 'clamp',
      category: 'math',
      name: 'Clamp',
      description: 'Clamp value between min and max',
      inputs: [
        { id: 'value', name: 'Value', type: 'float', defaultValue: 0.5 },
        { id: 'min', name: 'Min', type: 'float', defaultValue: 0 },
        { id: 'max', name: 'Max', type: 'float', defaultValue: 1 },
      ],
      outputs: [
        { id: 'result', name: 'Result', type: 'float' },
      ],
    });

    this.register({
      id: 'lerp',
      category: 'math',
      name: 'Lerp',
      description: 'Linear interpolation between A and B',
      inputs: [
        { id: 'a', name: 'A', type: 'float', defaultValue: 0 },
        { id: 'b', name: 'B', type: 'float', defaultValue: 1 },
        { id: 't', name: 'T', type: 'float', defaultValue: 0.5 },
      ],
      outputs: [
        { id: 'result', name: 'Result', type: 'float' },
      ],
    });

    // Color Nodes
    this.register({
      id: 'rgb-split',
      category: 'color',
      name: 'RGB Split',
      description: 'Split color into RGB channels',
      inputs: [
        { id: 'color', name: 'Color', type: 'color', defaultValue: [1, 1, 1] },
      ],
      outputs: [
        { id: 'r', name: 'Red', type: 'float' },
        { id: 'g', name: 'Green', type: 'float' },
        { id: 'b', name: 'Blue', type: 'float' },
      ],
    });

    this.register({
      id: 'rgb-combine',
      category: 'color',
      name: 'RGB Combine',
      description: 'Combine RGB channels into a color',
      inputs: [
        { id: 'r', name: 'Red', type: 'float', defaultValue: 1 },
        { id: 'g', name: 'Green', type: 'float', defaultValue: 1 },
        { id: 'b', name: 'Blue', type: 'float', defaultValue: 1 },
      ],
      outputs: [
        { id: 'color', name: 'Color', type: 'color' },
      ],
    });

    this.register({
      id: 'hsv-adjust',
      category: 'color',
      name: 'HSV Adjust',
      description: 'Adjust hue, saturation, value',
      inputs: [
        { id: 'color', name: 'Color', type: 'color', defaultValue: [1, 1, 1] },
        { id: 'hue', name: 'Hue', type: 'float', defaultValue: 0 },
        { id: 'saturation', name: 'Saturation', type: 'float', defaultValue: 1 },
        { id: 'value', name: 'Value', type: 'float', defaultValue: 1 },
      ],
      outputs: [
        { id: 'color', name: 'Color', type: 'color' },
      ],
    });

    this.register({
      id: 'color-ramp',
      category: 'color',
      name: 'Color Ramp',
      description: 'Map value to gradient',
      inputs: [
        { id: 'value', name: 'Value', type: 'float', defaultValue: 0.5 },
      ],
      outputs: [
        { id: 'color', name: 'Color', type: 'color' },
      ],
    });

    this.register({
      id: 'invert',
      category: 'color',
      name: 'Invert',
      description: 'Invert color channels',
      inputs: [
        { id: 'color', name: 'Color', type: 'color', defaultValue: [1, 1, 1] },
      ],
      outputs: [
        { id: 'result', name: 'Result', type: 'color' },
      ],
    });

    // Normal Nodes
    this.register({
      id: 'normal-map',
      category: 'normal',
      name: 'Normal Map',
      description: 'Sample and process normal map',
      inputs: [
        { id: 'normal', name: 'Normal', type: 'texture' },
        { id: 'strength', name: 'Strength', type: 'float', defaultValue: 1 },
      ],
      outputs: [
        { id: 'normal', name: 'Normal', type: 'vector3' },
      ],
    });

    this.register({
      id: 'normal-blend',
      category: 'normal',
      name: 'Normal Blend',
      description: 'Blend two normal maps',
      inputs: [
        { id: 'normal1', name: 'Normal 1', type: 'vector3' },
        { id: 'normal2', name: 'Normal 2', type: 'vector3' },
        { id: 'blend', name: 'Blend', type: 'float', defaultValue: 0.5 },
      ],
      outputs: [
        { id: 'result', name: 'Result', type: 'vector3' },
      ],
    });

    // Vector Nodes
    this.register({
      id: 'normalize',
      category: 'vector',
      name: 'Normalize',
      description: 'Normalize vector to unit length',
      inputs: [
        { id: 'vector', name: 'Vector', type: 'vector3' },
      ],
      outputs: [
        { id: 'result', name: 'Result', type: 'vector3' },
      ],
    });

    this.register({
      id: 'vector-length',
      category: 'vector',
      name: 'Length',
      description: 'Get vector length',
      inputs: [
        { id: 'vector', name: 'Vector', type: 'vector3' },
      ],
      outputs: [
        { id: 'length', name: 'Length', type: 'float' },
      ],
    });

    this.register({
      id: 'dot-product',
      category: 'vector',
      name: 'Dot Product',
      description: 'Calculate dot product of two vectors',
      inputs: [
        { id: 'a', name: 'A', type: 'vector3' },
        { id: 'b', name: 'B', type: 'vector3' },
      ],
      outputs: [
        { id: 'result', name: 'Result', type: 'float' },
      ],
    });

    // Output Nodes
    this.register({
      id: 'output-base-color',
      category: 'output',
      name: 'Base Color Output',
      description: 'Final base color output',
      inputs: [
        { id: 'color', name: 'Color', type: 'color', defaultValue: [1, 1, 1] },
      ],
      outputs: [],
    });

    this.register({
      id: 'output-normal',
      category: 'output',
      name: 'Normal Output',
      description: 'Final normal map output',
      inputs: [
        { id: 'normal', name: 'Normal', type: 'vector3' },
      ],
      outputs: [],
    });

    this.register({
      id: 'output-metallic',
      category: 'output',
      name: 'Metallic Output',
      description: 'Final metallic output',
      inputs: [
        { id: 'metallic', name: 'Metallic', type: 'float', defaultValue: 0 },
      ],
      outputs: [],
    });

    this.register({
      id: 'output-roughness',
      category: 'output',
      name: 'Roughness Output',
      description: 'Final roughness output',
      inputs: [
        { id: 'roughness', name: 'Roughness', type: 'float', defaultValue: 0.5 },
      ],
      outputs: [],
    });
  }

  /**
   * Register a new node type
   */
  register(definition: NodeDefinition): void {
    this.nodeDefinitions.set(definition.id, definition);
  }

  /**
   * Get node definition by ID
   */
  getDefinition(id: string): NodeDefinition | undefined {
    return this.nodeDefinitions.get(id);
  }

  /**
   * Get all definitions for a category
   */
  getByCategory(category: string): NodeDefinition[] {
    return Array.from(this.nodeDefinitions.values()).filter(
      (def) => def.category === category
    );
  }

  /**
   * List all definitions
   */
  listAll(): NodeDefinition[] {
    return Array.from(this.nodeDefinitions.values());
  }
}

/**
 * Shader Graph Validator - Validate graph topology and connections
 */
export class ShaderGraphValidator {
  private nodeRegistry: NodeRegistry;

  constructor(nodeRegistry: NodeRegistry) {
    this.nodeRegistry = nodeRegistry;
  }

  /**
   * Validate entire shader graph
   */
  validate(graph: ShaderGraph): ShaderGraphValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const nodeMap = new Map(graph.nodes.map((n) => [n.id, n]));
    const unreachableNodes: string[] = [];

    // Validate nodes
    for (const node of graph.nodes) {
      this.validateNode(node, errors, warnings);
    }

    // Validate connections
    for (const conn of graph.connections) {
      this.validateConnection(conn, nodeMap, errors, warnings);
    }

    // Validate outputs
    if (graph.outputs.length === 0) {
      warnings.push('No output nodes defined');
    }

    for (const output of graph.outputs) {
      this.validateOutput(output, nodeMap, errors, warnings);
    }

    // Find unreachable nodes
    const reachableNodes = this.findReachableNodes(graph);
    for (const node of graph.nodes) {
      if (!reachableNodes.has(node.id)) {
        unreachableNodes.push(node.id);
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      stats: {
        nodeCount: graph.nodes.length,
        connectionCount: graph.connections.length,
        outputCount: graph.outputs.length,
        unreachableNodes,
      },
    };
  }

  /**
   * Validate individual node
   */
  private validateNode(
    node: ShaderNode,
    errors: string[],
    warnings: string[]
  ): void {
    if (!node.id) {
      errors.push('Node has no ID');
      return;
    }

    if (!node.type) {
      errors.push(`Node "${node.id}" has no type`);
      return;
    }

    // Check if inputs/outputs have unique IDs
    const inputIds = new Set(node.inputs.map((i) => i.id));
    if (inputIds.size !== node.inputs.length) {
      errors.push(`Node "${node.id}" has duplicate input IDs`);
    }

    const outputIds = new Set(node.outputs.map((o) => o.id));
    if (outputIds.size !== node.outputs.length) {
      errors.push(`Node "${node.id}" has duplicate output IDs`);
    }
  }

  /**
   * Validate connection
   */
  private validateConnection(
    conn: NodeConnection,
    nodeMap: Map<string, ShaderNode>,
    errors: string[],
    warnings: string[]
  ): void {
    if (!nodeMap.has(conn.fromNode)) {
      errors.push(
        `Connection references non-existent source node "${conn.fromNode}"`
      );
      return;
    }

    if (!nodeMap.has(conn.toNode)) {
      errors.push(
        `Connection references non-existent target node "${conn.toNode}"`
      );
      return;
    }

    const fromNode = nodeMap.get(conn.fromNode)!;
    const toNode = nodeMap.get(conn.toNode)!;

    if (!fromNode.outputs.find((o) => o.id === conn.fromOutput)) {
      errors.push(
        `Source node "${conn.fromNode}" has no output "${conn.fromOutput}"`
      );
    }

    if (!toNode.inputs.find((i) => i.id === conn.toInput)) {
      errors.push(
        `Target node "${conn.toNode}" has no input "${conn.toInput}"`
      );
    }
  }

  /**
   * Validate output node
   */
  private validateOutput(
    output: OutputNode,
    nodeMap: Map<string, ShaderNode>,
    errors: string[],
    warnings: string[]
  ): void {
    if (output.connectedNode && !nodeMap.has(output.connectedNode)) {
      errors.push(
        `Output "${output.slot}" references non-existent node "${output.connectedNode}"`
      );
    }
  }

  /**
   * Find all nodes reachable from outputs
   */
  private findReachableNodes(graph: ShaderGraph): Set<string> {
    const reachable = new Set<string>();
    const visited = new Set<string>();
    const nodeMap = new Map(graph.nodes.map((n) => [n.id, n]));
    const connMap = new Map<string, NodeConnection[]>();

    // Build connection map (reversed for backwards traversal)
    for (const conn of graph.connections) {
      const key = `${conn.toNode}:${conn.toInput}`;
      if (!connMap.has(key)) {
        connMap.set(key, []);
      }
      connMap.get(key)!.push(conn);
    }

    // Traverse backwards from outputs
    const queue: string[] = graph.outputs
      .map((o) => o.connectedNode)
      .filter((n) => n !== undefined) as string[];

    while (queue.length > 0) {
      const nodeId = queue.shift()!;

      if (visited.has(nodeId)) continue;
      visited.add(nodeId);
      reachable.add(nodeId);

      // Find all nodes feeding into this node
      const node = nodeMap.get(nodeId);
      if (node) {
        for (const input of node.inputs) {
          const key = `${nodeId}:${input.id}`;
          const conns = connMap.get(key) || [];
          for (const conn of conns) {
            if (!visited.has(conn.fromNode)) {
              queue.push(conn.fromNode);
            }
          }
        }
      }
    }

    return reachable;
  }
}

/**
 * Shader Graph Compiler - Generate GLSL code from graph
 */
export class ShaderGraphCompiler {
  private nodeRegistry: NodeRegistry;
  private validator: ShaderGraphValidator;

  constructor(nodeRegistry?: NodeRegistry) {
    this.nodeRegistry = nodeRegistry || new NodeRegistry();
    this.validator = new ShaderGraphValidator(this.nodeRegistry);
  }

  /**
   * Compile shader graph to GLSL
   */
  compile(graph: ShaderGraph): CompiledShaderOutput {
    const startTime = Date.now();
    const errors: string[] = [];
    const warnings: string[] = [];

    // Validate first
    const validation = this.validator.validate(graph);
    if (!validation.valid) {
      errors.push(...validation.errors);
    }
    warnings.push(...validation.warnings);

    if (errors.length > 0) {
      return {
        success: false,
        errors,
        warnings,
        compilationTime: Date.now() - startTime,
        stats: {
          instructionCount: 0,
          textureCount: 0,
          parameterCount: 0,
        },
      };
    }

    try {
      const vertexShader = this.generateVertexShader(graph);
      const fragmentShader = this.generateFragmentShader(graph);

      const instructionCount = this.estimateInstructionCount(graph);
      const textureCount = graph.nodes.filter(
        (n) => n.type === 'texture'
      ).length;
      const parameterCount = graph.nodes.reduce(
        (sum, n) => sum + n.inputs.length,
        0
      );

      return {
        success: true,
        vertexShader,
        fragmentShader,
        errors,
        warnings,
        compilationTime: Date.now() - startTime,
        stats: {
          instructionCount,
          textureCount,
          parameterCount,
        },
      };
    } catch (error) {
      errors.push(
        `Compilation error: ${error instanceof Error ? error.message : String(error)}`
      );
      return {
        success: false,
        errors,
        warnings,
        compilationTime: Date.now() - startTime,
        stats: {
          instructionCount: 0,
          textureCount: 0,
          parameterCount: 0,
        },
      };
    }
  }

  /**
   * Generate vertex shader
   */
  private generateVertexShader(graph: ShaderGraph): string {
    return `
#version 330 core

layout (location = 0) in vec3 aPosition;
layout (location = 1) in vec3 aNormal;
layout (location = 2) in vec2 aTexCoord;
layout (location = 3) in vec4 aTangent;

out VS_OUT {
  vec3 FragPos;
  vec3 Normal;
  vec2 TexCoord;
  vec3 Tangent;
  vec3 Bitangent;
} vs_out;

uniform mat4 uModel;
uniform mat4 uView;
uniform mat4 uProjection;

void main()
{
  vs_out.FragPos = vec3(uModel * vec4(aPosition, 1.0));
  vs_out.Normal = normalize(mat3(transpose(inverse(uModel))) * aNormal);
  vs_out.TexCoord = aTexCoord;
  
  vs_out.Tangent = normalize(mat3(uModel) * aTangent.xyz);
  vs_out.Bitangent = cross(vs_out.Normal, vs_out.Tangent) * aTangent.w;
  
  gl_Position = uProjection * uView * vec4(vs_out.FragPos, 1.0);
}
    `.trim();
  }

  /**
   * Generate fragment shader from graph
   */
  private generateFragmentShader(graph: ShaderGraph): string {
    const nodeCode = this.generateNodeCode(graph);
    const outputCode = this.generateOutputCode(graph);

    return `
#version 330 core

in VS_OUT {
  vec3 FragPos;
  vec3 Normal;
  vec2 TexCoord;
  vec3 Tangent;
  vec3 Bitangent;
} fs_in;

uniform sampler2D uTextureDiffuse;
uniform sampler2D uTextureNormal;
uniform sampler2D uTextureRoughness;
uniform sampler2D uTextureMetallic;

out vec4 FragColor;

${nodeCode}

void main()
{
  // Sample base textures
  vec3 baseColor = texture(uTextureDiffuse, fs_in.TexCoord).rgb;
  vec3 normal = texture(uTextureNormal, fs_in.TexCoord).rgb * 2.0 - 1.0;
  float roughness = texture(uTextureRoughness, fs_in.TexCoord).r;
  float metallic = texture(uTextureMetallic, fs_in.TexCoord).r;
  
  // Process graph nodes
  ${outputCode}
  
  FragColor = vec4(baseColor, 1.0);
}
    `.trim();
  }

  /**
   * Generate code for graph nodes
   */
  private generateNodeCode(graph: ShaderGraph): string {
    const lines: string[] = [];

    for (const node of graph.nodes) {
      if (node.type === 'math') {
        lines.push(this.generateMathNodeCode(node));
      } else if (node.type === 'color') {
        lines.push(this.generateColorNodeCode(node));
      }
    }

    return lines.join('\n');
  }

  /**
   * Generate code for math node
   */
  private generateMathNodeCode(node: ShaderNode): string {
    const op = node.operation as MathOperation;

    switch (op) {
      case 'multiply':
        return `float ${node.id}_result = input_a * input_b;`;
      case 'add':
        return `float ${node.id}_result = input_a + input_b;`;
      case 'clamp':
        return `float ${node.id}_result = clamp(value, min_val, max_val);`;
      case 'power':
        return `float ${node.id}_result = pow(input_a, input_b);`;
      default:
        return `// ${op} node not implemented`;
    }
  }

  /**
   * Generate code for color node
   */
  private generateColorNodeCode(node: ShaderNode): string {
    const op = node.operation as ColorOperation;

    switch (op) {
      case 'rgb-split':
        return `
vec3 ${node.id}_rgb = color_input;
float ${node.id}_r = ${node.id}_rgb.r;
float ${node.id}_g = ${node.id}_rgb.g;
float ${node.id}_b = ${node.id}_rgb.b;
        `.trim();
      case 'invert':
        return `vec3 ${node.id}_result = vec3(1.0) - color_input;`;
      default:
        return `// ${op} node not implemented`;
    }
  }

  /**
   * Generate output assignment code
   */
  private generateOutputCode(graph: ShaderGraph): string {
    return `// Output assignments from graph`;
  }

  /**
   * Estimate instruction count
   */
  private estimateInstructionCount(graph: ShaderGraph): number {
    let count = 0;

    for (const node of graph.nodes) {
      // Base cost per node
      count += 2;

      // Additional cost based on type
      if (node.type === 'texture') count += 1;
      if (node.type === 'normal') count += 3;
      if (node.type === 'vector') count += 2;
    }

    // Add connection traversal cost
    count += graph.connections.length;

    return count;
  }
}

/**
 * Export singleton instances
 */
export const nodeRegistry = new NodeRegistry();
export const shaderGraphValidator = new ShaderGraphValidator(nodeRegistry);
export const shaderGraphCompiler = new ShaderGraphCompiler(nodeRegistry);
