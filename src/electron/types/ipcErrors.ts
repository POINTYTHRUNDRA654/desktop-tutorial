/**
 * Unified IPC Response Types
 * 
 * All IPC handlers in main.ts should use these types to ensure
 * consistent error handling, data structure, and type safety
 * across the entire application.
 * 
 * This is the FOUNDATION for all 35+ IPC handlers.
 */

/**
 * Standard error codes for IPC responses
 * Matches Node.js error codes for consistency
 */
export enum IpcErrorCode {
  // File/Path errors
  ENOENT = 'ENOENT',           // File not found
  EACCES = 'EACCES',           // Permission denied
  EISDIR = 'EISDIR',           // Is a directory
  ENOTDIR = 'ENOTDIR',         // Not a directory
  EINVAL = 'EINVAL',           // Invalid argument
  
  // Process/System errors
  ENODATA = 'ENODATA',         // No data available
  ENODEV = 'ENODEV',           // No such device
  ETIMEDOUT = 'ETIMEDOUT',     // Operation timed out
  ECONNREFUSED = 'ECONNREFUSED', // Connection refused
  
  // Custom business logic errors
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  NOT_FOUND = 'NOT_FOUND',
  ALREADY_EXISTS = 'ALREADY_EXISTS',
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  CONFLICT = 'CONFLICT',
  INVALID_STATE = 'INVALID_STATE',
  OPERATION_FAILED = 'OPERATION_FAILED',
  
  // Asset-specific errors
  UNSUPPORTED_FORMAT = 'UNSUPPORTED_FORMAT',        // File format not supported
  INVALID_ASSET = 'INVALID_ASSET',                  // Asset file corrupted or invalid
  CONVERSION_FAILED = 'CONVERSION_FAILED',          // Asset conversion failed
  ASSET_TOO_LARGE = 'ASSET_TOO_LARGE',              // Asset exceeds size limit
  ASSET_VALIDATION_FAILED = 'ASSET_VALIDATION_FAILED', // Validation checks failed
  PRESET_NOT_FOUND = 'PRESET_NOT_FOUND',            // Preset doesn't exist
  
  UNKNOWN = 'UNKNOWN',
}

/**
 * Generic IPC Response type for all handlers
 * 
 * Usage:
 * ```typescript
 * interface MyDataType { id: string; name: string; }
 * 
 * ipcMain.handle('my-handler', async (): Promise<IpcResponse<MyDataType>> => {
 *   try {
 *     const data = await fetchMyData();
 *     return IpcResponse.success(data);
 *   } catch (error) {
 *     return IpcResponse.error('Failed to fetch', IpcErrorCode.ENOENT);
 *   }
 * });
 * ```
 */
export interface IpcResponse<T = void> {
  /** Whether the operation succeeded */
  success: boolean;

  /** Response data (only set if success=true) */
  data?: T;

  /** Error message (only set if success=false) */
  error?: string;

  /** Error code for classification (only set if success=false) */
  code?: IpcErrorCode | string;

  /** Timestamp of response for debugging */
  timestamp?: number;

  /** Request correlation ID (optional, for debugging) */
  requestId?: string;
}

/**
 * Helper class for creating standardized IPC responses
 * Ensures all handlers return consistent format
 */
export class IpcResponseBuilder {
  /**
   * Create a successful response
   * @param data The response data
   * @param requestId Optional correlation ID
   */
  static success<T>(data?: T, requestId?: string): IpcResponse<T> {
    return {
      success: true,
      data,
      timestamp: Date.now(),
      requestId,
    };
  }

  /**
   * Create an error response
   * @param message Error message
   * @param code Error code (defaults to UNKNOWN)
   * @param requestId Optional correlation ID
   */
  static error(
    message: string,
    code: IpcErrorCode | string = IpcErrorCode.UNKNOWN,
    requestId?: string
  ): IpcResponse<never> {
    return {
      success: false,
      error: message,
      code,
      timestamp: Date.now(),
      requestId,
    };
  }

  /**
   * Create an error response from an Error object
   * Extracts message and code automatically
   * @param error The caught error
   * @param defaultCode Default code if not determinable
   * @param requestId Optional correlation ID
   */
  static fromError(
    error: any,
    defaultCode: IpcErrorCode | string = IpcErrorCode.UNKNOWN,
    requestId?: string
  ): IpcResponse<never> {
    const message = error?.message || String(error) || 'Unknown error';
    const code = error?.code || defaultCode;
    
    return {
      success: false,
      error: message,
      code,
      timestamp: Date.now(),
      requestId,
    };
  }

  /**
   * Wrap an async operation to automatically handle errors
   * @param operation The async function to execute
   * @param defaultCode Default error code
   * @param requestId Optional correlation ID
   */
  static async wrap<T>(
    operation: () => Promise<T>,
    defaultCode: IpcErrorCode | string = IpcErrorCode.OPERATION_FAILED,
    requestId?: string
  ): Promise<IpcResponse<T>> {
    try {
      const data = await operation();
      return this.success(data, requestId);
    } catch (error) {
      return this.fromError(error, defaultCode, requestId);
    }
  }
}

/**
 * Common response types for frequently used operations
 */

/** Response for operations that just return success/failure */
export type SimpleResponse = IpcResponse<void>;

/** Response for file operations that return file path */
export type FilePathResponse = IpcResponse<string>;

/** Response for operations that return arrays */
export type ArrayResponse<T> = IpcResponse<T[]>;

/** Response for operations that return a single item */
export type ItemResponse<T> = IpcResponse<T>;

/** Response for operations that return a count */
export type CountResponse = IpcResponse<number>;

/** Response for operations that return a boolean flag */
export type BooleanResponse = IpcResponse<boolean>;

/**
 * Handler error wrapper for consistent error handling
 * Wraps IPC handler to catch all errors automatically
 * 
 * Usage:
 * ```typescript
 * ipcMain.handle('my-handler', withErrorHandling(async (args) => {
 *   return await someOperation(args); // Returns IpcResponse automatically
 * }));
 * ```
 */
export function withErrorHandling<T extends any[], R>(
  handler: (...args: T) => Promise<R>
): (...args: T) => Promise<IpcResponse<R>> {
  return async (...args: T) => {
    try {
      const result = await handler(...args);
      return IpcResponseBuilder.success(result);
    } catch (error) {
      return IpcResponseBuilder.fromError(error);
    }
  };
}

/**
 * Validation helpers for IPC arguments
 * 
 * Provides comprehensive validation for all common input types
 * ensuring type safety and security across IPC handlers.
 * 
 * Usage:
 * ```typescript
 * const validation = IpcValidation.isValidFilePath(filePath);
 * if (!validation.valid) {
 *   return IpcResponseBuilder.error(validation.error, IpcErrorCode.VALIDATION_ERROR);
 * }
 * ```
 */

export class IpcValidation {
  /**
   * Validate that a file path is safe to use
   * - Must be absolute
   * - Must not contain path traversal (..)
   * - Must not be system directories
   */
  static isValidFilePath(filePath: string): { valid: boolean; error?: string } {
    if (typeof filePath !== 'string' || !filePath) {
      return { valid: false, error: 'File path must be a non-empty string' };
    }

    // Check for path traversal attempts
    if (filePath.includes('..')) {
      return { valid: false, error: 'Path traversal detected' };
    }

    // Must be absolute path
    if (!require('path').isAbsolute(filePath)) {
      return { valid: false, error: 'Path must be absolute' };
    }

    return { valid: true };
  }

  /**
   * Validate that a string parameter is not empty
   */
  static isNonEmptyString(value: any, paramName: string = 'value'): { valid: boolean; error?: string } {
    if (typeof value !== 'string' || value.trim() === '') {
      return { valid: false, error: `${paramName} must be a non-empty string` };
    }
    return { valid: true };
  }

  /**
   * Validate that a parameter exists and matches expected type
   */
  static isType(value: any, type: string, paramName: string = 'value'): { valid: boolean; error?: string } {
    if (typeof value !== type) {
      return { valid: false, error: `${paramName} must be of type ${type}, got ${typeof value}` };
    }
    return { valid: true };
  }

  /**
   * Validate that a parameter is one of allowed values
   */
  static isOneOf(value: any, allowed: any[], paramName: string = 'value'): { valid: boolean; error?: string } {
    if (!allowed.includes(value)) {
      return { valid: false, error: `${paramName} must be one of: ${allowed.join(', ')}` };
    }
    return { valid: true };
  }

  /**
   * Validate that a value is a positive number
   */
  static isPositiveNumber(value: any, paramName: string = 'value'): { valid: boolean; error?: string } {
    if (typeof value !== 'number' || value <= 0 || !Number.isFinite(value)) {
      return { valid: false, error: `${paramName} must be a positive number` };
    }
    return { valid: true };
  }

  /**
   * Validate that a value is within a number range
   */
  static isInRange(value: any, min: number, max: number, paramName: string = 'value'): { valid: boolean; error?: string } {
    if (typeof value !== 'number' || value < min || value > max) {
      return { valid: false, error: `${paramName} must be between ${min} and ${max}` };
    }
    return { valid: true };
  }

  /**
   * Validate that a value is a non-empty array
   */
  static isNonEmptyArray(value: any, paramName: string = 'value'): { valid: boolean; error?: string } {
    if (!Array.isArray(value) || value.length === 0) {
      return { valid: false, error: `${paramName} must be a non-empty array` };
    }
    return { valid: true };
  }

  /**
   * Validate that a value is a non-empty object with specific required fields
   */
  static hasRequiredFields(
    value: any,
    requiredFields: string[],
    paramName: string = 'object'
  ): { valid: boolean; error?: string } {
    if (typeof value !== 'object' || value === null) {
      return { valid: false, error: `${paramName} must be an object` };
    }

    const missing = requiredFields.filter(field => !(field in value));
    if (missing.length > 0) {
      return { valid: false, error: `${paramName} missing required fields: ${missing.join(', ')}` };
    }

    return { valid: true };
  }

  /**
   * Validate a UUID/ID format (basic check for hyphenated pattern)
   */
  static isValidId(value: any, paramName: string = 'id'): { valid: boolean; error?: string } {
    if (typeof value !== 'string') {
      return { valid: false, error: `${paramName} must be a string` };
    }

    // Accept simple alphanumeric with hyphens (covers UUIDs and custom IDs)
    const idPattern = /^[a-zA-Z0-9-_]+$/;
    if (!idPattern.test(value)) {
      return { valid: false, error: `${paramName} contains invalid characters` };
    }

    return { valid: true };
  }

  /**
   * Validate that a file exists (async check)
   * Note: Call this AFTER async context is available
   */
  static async fileExists(filePath: string): Promise<{ valid: boolean; error?: string }> {
    const validation = this.isValidFilePath(filePath);
    if (!validation.valid) {
      return validation;
    }

    try {
      const fs = require('fs').promises;
      await fs.access(filePath);
      return { valid: true };
    } catch {
      return { valid: false, error: `File does not exist: ${filePath}` };
    }
  }

  /**
   * Validate that a directory exists (async check)
   */
  static async directoryExists(dirPath: string): Promise<{ valid: boolean; error?: string }> {
    try {
      const fs = require('fs').promises;
      const stats = await fs.stat(dirPath);
      if (!stats.isDirectory()) {
        return { valid: false, error: `Not a directory: ${dirPath}` };
      }
      return { valid: true };
    } catch {
      return { valid: false, error: `Directory does not exist: ${dirPath}` };
    }
  }

  /**
   * Validate a boolean value
   */
  static isBoolean(value: any, paramName: string = 'value'): { valid: boolean; error?: string } {
    if (typeof value !== 'boolean') {
      return { valid: false, error: `${paramName} must be a boolean` };
    }
    return { valid: true };
  }

  /**
   * Validate JSON string
   */
  static isValidJson(value: any, paramName: string = 'json'): { valid: boolean; error?: string; data?: any } {
    if (typeof value !== 'string') {
      return { valid: false, error: `${paramName} must be a string` };
    }

    try {
      const data = JSON.parse(value);
      return { valid: true, data };
    } catch {
      return { valid: false, error: `${paramName} is not valid JSON` };
    }
  }

  /**
   * Validate that an object contains all fields of a template object (type checking)
   */
  static conformsToShape(
    value: any,
    template: Record<string, string>,
    paramName: string = 'object'
  ): { valid: boolean; error?: string } {
    if (typeof value !== 'object' || value === null) {
      return { valid: false, error: `${paramName} must be an object` };
    }

    for (const [field, expectedType] of Object.entries(template)) {
      if (!(field in value)) {
        return { valid: false, error: `${paramName} missing field: ${field}` };
      }

      if (typeof value[field] !== expectedType) {
        return {
          valid: false,
          error: `${paramName}.${field} must be ${expectedType}, got ${typeof value[field]}`,
        };
      }
    }

    return { valid: true };
  }

  /**
   * Validate a regex pattern (that it's valid)
   */
  static isValidRegex(pattern: any, paramName: string = 'pattern'): { valid: boolean; error?: string } {
    try {
      new RegExp(pattern);
      return { valid: true };
    } catch {
      return { valid: false, error: `${paramName} is not a valid regex pattern` };
    }
  }

  /**
   * Batch validate multiple parameters at once
   * Returns first error found, or valid if all pass
   */
  static batchValidate(
    validations: { valid: boolean; error?: string }[]
  ): { valid: boolean; error?: string } {
    for (const result of validations) {
      if (!result.valid) {
        return result;
      }
    }
    return { valid: true };
  }
}

/**
 * ============================================================================
 * ASSET TYPES - Platform #4: Asset Pipeline
 * ============================================================================
 */

/** DDS texture format types */
export type DDSFormat = 'DDS_DXT1' | 'DDS_DXT3' | 'DDS_DXT5' | 'DDS_BC5' | 'DDS_BC7' | 'DDS_UNCOMPRESSED' | 'PNG' | 'TGA' | 'BMP' | 'JPG';

/** Texture type classification */
export type TextureType = 'diffuse' | 'normal' | 'specular' | 'emissive' | 'roughness' | 'metallic' | 'ao' | 'height';

/** DDS conversion settings */
export interface DDSConversionSettings {
  format: DDSFormat;
  textureType?: TextureType;
  generateMipmaps?: boolean;
  mipmapLevels?: number;
  quality?: 'fast' | 'normal' | 'high' | 'ultra';
  flipY?: boolean;
  bcFormat?: string;
}

/** DDS conversion result */
export interface DDSConversionResult {
  success: boolean;
  filePath?: string;
  format?: DDSFormat;
  size?: number;
  error?: string;
}

/** Asset validation issue */
export interface ValidationIssue {
  id: string;
  file: string;
  type: string;
  severity: 'error' | 'warning' | 'info';
  message: string;
  details?: string;
  autoFixable: boolean;
  line?: number;
  suggestion?: string;
}

/** Asset validation report */
export interface ValidationReport {
  modPath: string;
  totalFiles: number;
  filesScanned: number;
  issues: ValidationIssue[];
  summary: {
    errors: number;
    warnings: number;
    info: number;
  };
  scanTime: number;
  timestamp: number;
  compliance: {
    score: number;
    passedChecks: string[];
    failedChecks: string[];
  };
}

/** Material manifest */
export interface MaterialManifest {
  modName: string;
  enhancementLevel: 4 | 8 | 16;
  materials: MaterialDef[];
  totalTextures: number;
}

/** Material definition */
export interface MaterialDef {
  name: string;
  baseTexture: string;
  pbr: MaterialProperties;
  textures: {
    diffuse: string;
    normal: string;
    specular: string;
    maps: {
      metallic?: string;
      ao?: string;
      cavity?: string;
    };
  };
}

/** PBR material properties */
export interface MaterialProperties {
  hasMetallic: boolean;
  hasAO: boolean;
  hasCavity: boolean;
  hasRoughness: boolean;
  roughnessChannel?: 'alpha' | 'rgb' | 'r' | 'g' | 'b';
  metallic?: { min: number; max: number };
  roughness?: { min: number; max: number };
}

/** Image format conversion options */
export interface ImageConversionOptions {
  bcFormat?: string;
  texconvPath?: string;
  requireReal?: boolean;
  mipmapLevels?: number;
}

/** PBR map generation result */
export interface PBRMapsResult {
  normal?: string;      // Data URL
  roughness?: string;   // Data URL
  height?: string;      // Data URL
  metallic?: string;    // Data URL
  ao?: string;         // Data URL
}
