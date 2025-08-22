/**
 * @fileoverview Response profile models and utilities for optimized data transfer.
 * Provides standardized response profiles to balance information richness with token efficiency.
 */

/**
 * Available response profile levels for tool responses.
 * Each level provides different amounts of detail to optimize for specific use cases.
 */
export enum ResponseProfile {
  /** Minimal profile - essential data only, maximum token efficiency */
  MINIMAL = 'minimal',
  /** Standard profile - balanced information, good for most use cases */
  STANDARD = 'standard',
  /** Detailed profile - comprehensive data, maximum information */
  DETAILED = 'detailed'
}

/**
 * Standard response wrapper for all tool responses.
 * Provides consistent structure while allowing profile-based content variation.
 */
export interface StandardResponse<T> {
  /** Brief description of the response content */
  summary: string;
  /** The actual response data, varies by profile */
  data: T;
  /** Optional metadata, only included when relevant */
  meta?: ResponseMetadata;
}

/**
 * Optional metadata that may be included in responses.
 * Only populated when the information adds value.
 */
export interface ResponseMetadata {
  /** Total items available (when showing subset) */
  totalCount?: number;
  /** Number of items currently shown */
  showing?: number;
  /** Applied filters or search criteria */
  filters?: Record<string, any>;
  /** Response profile level used */
  profile?: ResponseProfile;
}

/**
 * Error response format for consistent error handling.
 * Simplified structure focuses on essential error information.
 */
export interface ErrorResponse {
  /** Error message describing what went wrong */
  error: string;
  /** Optional error code for programmatic handling */
  code?: string;
}

/**
 * Utility functions for response profile management and data transformation.
 */
export class ResponseProfileUtils {
  /**
   * Parses response profile from string input, with fallback to minimal.
   * Maintains backward compatibility with existing 'detailed' boolean flag.
   * @param profile - Profile string or boolean detailed flag
   * @param legacyDetailed - Legacy detailed boolean flag for backward compatibility
   * @returns Parsed ResponseProfile enum value
   */
  static parseProfile(profile?: string | boolean, legacyDetailed?: boolean): ResponseProfile {
    // Handle legacy boolean detailed flag
    if (typeof profile === 'boolean') {
      return profile ? ResponseProfile.DETAILED : ResponseProfile.MINIMAL;
    }
    
    if (typeof legacyDetailed === 'boolean') {
      return legacyDetailed ? ResponseProfile.DETAILED : ResponseProfile.MINIMAL;
    }

    // Parse string profile
    switch (profile?.toLowerCase()) {
      case 'detailed':
        return ResponseProfile.DETAILED;
      case 'standard':
        return ResponseProfile.STANDARD;
      case 'minimal':
      default:
        return ResponseProfile.MINIMAL;
    }
  }

  /**
   * Creates a standardized response object with optional metadata.
   * @param summary - Brief description of the response
   * @param data - The response data
   * @param metadata - Optional metadata to include
   * @returns Standardized response object
   */
  static createResponse<T>(
    summary: string, 
    data: T, 
    metadata?: Partial<ResponseMetadata>
  ): StandardResponse<T> {
    const response: StandardResponse<T> = { summary, data };
    
    if (metadata && Object.keys(metadata).length > 0) {
      response.meta = metadata;
    }

    return response;
  }

  /**
   * Creates a standardized error response.
   * @param message - Error message
   * @param code - Optional error code
   * @returns Error response object
   */
  static createErrorResponse(message: string, code?: string): ErrorResponse {
    const response: ErrorResponse = { error: message };
    if (code) {
      response.code = code;
    }
    return response;
  }

  /**
   * Determines if metadata should be included based on profile level.
   * Minimal profiles exclude metadata to save tokens unless critical.
   * @param profile - Response profile level
   * @param metadata - Metadata to potentially include
   * @returns Whether metadata should be included
   */
  static shouldIncludeMetadata(
    profile: ResponseProfile, 
    metadata?: Partial<ResponseMetadata>
  ): boolean {
    if (!metadata || Object.keys(metadata).length === 0) {
      return false;
    }

    // Always include metadata for standard and detailed profiles
    if (profile !== ResponseProfile.MINIMAL) {
      return true;
    }

    // For minimal profile, only include critical metadata
    const criticalFields = ['totalCount', 'showing'];
    return criticalFields.some(field => metadata[field as keyof ResponseMetadata] !== undefined);
  }

  /**
   * Filters object properties based on response profile level.
   * Used to create profile-appropriate data representations.
   * @param obj - Object to filter
   * @param minimalFields - Fields to include in minimal profile
   * @param standardFields - Additional fields for standard profile (optional)
   * @param profile - Target response profile
   * @returns Filtered object with profile-appropriate fields
   */
  static filterObjectByProfile<T extends Record<string, any>>(
    obj: T,
    minimalFields: (keyof T)[],
    standardFields: (keyof T)[] = [],
    profile: ResponseProfile = ResponseProfile.MINIMAL
  ): Partial<T> {
    let fieldsToInclude: (keyof T)[];

    switch (profile) {
      case ResponseProfile.MINIMAL:
        fieldsToInclude = minimalFields;
        break;
      case ResponseProfile.STANDARD:
        fieldsToInclude = [...minimalFields, ...standardFields];
        break;
      case ResponseProfile.DETAILED:
        return obj; // Return all fields for detailed profile
    }

    const filtered: Partial<T> = {};
    fieldsToInclude.forEach(field => {
      if (obj[field] !== undefined) {
        filtered[field] = obj[field];
      }
    });

    return filtered;
  }
}