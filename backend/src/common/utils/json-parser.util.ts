import * as jsonrepairModule from 'jsonrepair';

// Handle both named and default exports
const jsonrepair = (jsonrepairModule as any).jsonrepair || jsonrepairModule;

/**
 * Attempt to parse JSON with repair using jsonrepair library
 * Falls back to null on failure to maintain consistent behavior
 */
export function parseJSON(jsonString: string): any {
  if (!jsonString || typeof jsonString !== 'string') {
    return null;
  }

  // Try parsing as-is first
  try {
    return JSON.parse(jsonString);
  } catch (e) {
    // Attempt repair using jsonrepair library
    try {
      if (typeof jsonrepair !== 'function') {
        console.error('jsonrepair is not a function, type:', typeof jsonrepair);
        console.error('jsonrepair module:', jsonrepairModule);
        return null;
      }
      const repaired = jsonrepair(jsonString);
      return JSON.parse(repaired);
    } catch (e2) {
      console.error('Failed to parse JSON even after repair attempts:', e2.message);
      console.error('Original JSON:', jsonString);
      return null;
    }
  }
}
