/**
 * Attempt to parse JSON with basic repair attempts
 * This is a simple alternative to jsonrepair library to avoid dependency issues
 */
export function parseJSON(jsonString: string): any {
  if (!jsonString || typeof jsonString !== 'string') {
    return null;
  }

  // Try parsing as-is first
  try {
    return JSON.parse(jsonString);
  } catch (e) {
    // Attempt basic repairs
    try {
      let repaired = jsonString.trim();
      
      // Remove trailing commas
      repaired = repaired.replace(/,(\s*[}\]])/g, '$1');
      
      // Try to fix missing closing braces/brackets
      const openBraces = (repaired.match(/{/g) || []).length;
      const closeBraces = (repaired.match(/}/g) || []).length;
      const openBrackets = (repaired.match(/\[/g) || []).length;
      const closeBrackets = (repaired.match(/]/g) || []).length;
      
      if (openBraces > closeBraces) {
        repaired += '}'.repeat(openBraces - closeBraces);
      }
      if (openBrackets > closeBrackets) {
        repaired += ']'.repeat(openBrackets - closeBrackets);
      }
      
      return JSON.parse(repaired);
    } catch (e2) {
      console.error('Failed to parse JSON:', e2.message);
      return null;
    }
  }
}
