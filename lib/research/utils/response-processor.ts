// AI Response Processing Utilities

import { JSON_RESPONSE_INSTRUCTION } from '../config/constants';

/**
 * Cleans AI responses by removing markdown code blocks and extracting JSON
 */
export function cleanAIResponse(response: string): string {
  // Remove markdown code blocks if present
  let cleaned = response.replace(/```json\s*([\s\S]*?)\s*```/g, '$1');
  cleaned = cleaned.replace(/```\s*([\s\S]*?)\s*```/g, '$1');
  
  // Remove leading/trailing whitespace
  cleaned = cleaned.trim();
  
  // More aggressive JSON extraction - find any JSON object in the response
  const jsonMatch = cleaned.match(/({[\s\S]*})/);
  if (jsonMatch) {
    cleaned = jsonMatch[1];
  }
  
  return cleaned;
}

/**
 * Fixes URL formatting issues in JSON strings
 */
export function fixUrlsInJson(jsonString: string): string {
  // Fix double-quoted URLs like ""https://example.com""
  let fixed = jsonString.replace(/""\s*https:\/\/([^"]+)"/g, '"https://$1"');
  
  // Fix other common URL formatting issues
  fixed = fixed.replace(/"\s*https:\/\/([^"]+)\s*"/g, '"https://$1"');
  
  return fixed;
}

/**
 * Sanitizes source relevance values to ensure they're between 0 and 1
 */
export function sanitizeSourceRelevance(sources: any[]): any[] {
  return sources.map(source => {
    if (source && typeof source === 'object') {
      // Ensure relevance is a number between 0 and 1
      if (typeof source.relevance === 'string') {
        const parsed = parseFloat(source.relevance);
        source.relevance = isNaN(parsed) ? 0.8 : Math.max(0, Math.min(1, parsed));
      } else if (typeof source.relevance !== 'number' || source.relevance < 0 || source.relevance > 1) {
        source.relevance = 0.8; // Default relevance
      }
      
      // Ensure credibility is a valid value
      if (!['high', 'medium', 'low'].includes(source.credibility)) {
        source.credibility = 'medium';
      }
      
      // Ensure sourceType is valid
      const validTypes = ['documentation', 'guide', 'case_study', 'vendor', 'community', 'blog', 'news', 'other'];
      if (!validTypes.includes(source.sourceType)) {
        source.sourceType = 'other';
      }
    }
    return source;
  });
}

/**
 * Safely stringify objects with error handling
 */
export function safeStringify(obj: any, space?: number): string {
  try {
    return JSON.stringify(obj, null, space);
  } catch (error) {
    console.warn('Failed to stringify object:', error);
    return '{}';
  }
}

/**
 * Deep stringify all objects in a data structure to handle nested objects
 */
export function deepStringifyObjects(obj: any): any {
  if (Array.isArray(obj)) {
    return obj.map(deepStringifyObjects);
  } else if (obj && typeof obj === 'object') {
    const result: any = {};
    for (const [key, value] of Object.entries(obj)) {
      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        result[key] = safeStringify(value);
      } else {
        result[key] = deepStringifyObjects(value);
      }
    }
    return result;
  }
  return obj;
}

/**
 * Extracts technology name from user request
 */
export function extractTechnologyName(userRequest: string): string {
  return userRequest.split(/\s+/).slice(0, 5).join(' ').replace(/[^\w\s-]/g, '').trim() || 'Technology Solution';
}