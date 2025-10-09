/**
 * Data transformation utilities for type conversion and normalization
 */

/**
 * Transform string to Date
 */
export function toDate(value: any): Date | null {
  if (value instanceof Date) return value;
  if (typeof value === 'string' || typeof value === 'number') {
    const date = new Date(value);
    return isNaN(date.getTime()) ? null : date;
  }
  return null;
}

/**
 * Transform value to boolean
 */
export function toBoolean(value: any): boolean {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    const lower = value.toLowerCase();
    if (lower === 'true' || lower === '1' || lower === 'yes') return true;
    if (lower === 'false' || lower === '0' || lower === 'no') return false;
  }
  if (typeof value === 'number') {
    return value !== 0;
  }
  return Boolean(value);
}

/**
 * Transform value to number
 */
export function toNumber(value: any): number | null {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const num = Number(value);
    return isNaN(num) ? null : num;
  }
  return null;
}

/**
 * Transform value to integer
 */
export function toInteger(value: any): number | null {
  const num = toNumber(value);
  return num !== null ? Math.floor(num) : null;
}

/**
 * Transform value to string
 */
export function toString(value: any): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

/**
 * Transform value to array
 */
export function toArray<T>(value: any): T[] {
  if (Array.isArray(value)) return value;
  if (value === null || value === undefined) return [];
  return [value];
}

/**
 * Trim string
 */
export function trim(value: any): string {
  return toString(value).trim();
}

/**
 * Lowercase string
 */
export function toLowerCase(value: any): string {
  return toString(value).toLowerCase();
}

/**
 * Uppercase string
 */
export function toUpperCase(value: any): string {
  return toString(value).toUpperCase();
}

/**
 * Capitalize first letter
 */
export function capitalize(value: any): string {
  const str = toString(value);
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

/**
 * Convert to slug
 */
export function toSlug(value: any): string {
  return toString(value)
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Parse JSON safely
 */
export function parseJSON<T = any>(value: any, defaultValue: T | null = null): T | null {
  if (typeof value !== 'string') return defaultValue;
  try {
    return JSON.parse(value) as T;
  } catch {
    return defaultValue;
  }
}

/**
 * Stringify JSON safely
 */
export function stringifyJSON(value: any, pretty = false): string {
  try {
    return JSON.stringify(value, null, pretty ? 2 : 0);
  } catch {
    return '';
  }
}

/**
 * Deep clone object
 */
export function deepClone<T>(value: T): T {
  if (value === null || typeof value !== 'object') return value;
  if (value instanceof Date) return new Date(value.getTime()) as any;
  if (value instanceof Array) return value.map(item => deepClone(item)) as any;
  if (value instanceof Object) {
    const cloned: any = {};
    for (const key in value) {
      if (value.hasOwnProperty(key)) {
        cloned[key] = deepClone(value[key]);
      }
    }
    return cloned;
  }
  return value;
}

/**
 * Merge objects deeply
 */
export function deepMerge<T extends object>(target: T, ...sources: Partial<T>[]): T {
  if (!sources.length) return target;
  
  const source = sources.shift();
  if (!source) return deepMerge(target, ...sources);
  
  for (const key in source) {
    if (source.hasOwnProperty(key)) {
      const sourceValue = source[key];
      const targetValue = target[key];
      
      if (sourceValue instanceof Date) {
        (target as any)[key] = new Date(sourceValue.getTime());
      } else if (sourceValue instanceof Array) {
        (target as any)[key] = deepClone(sourceValue);
      } else if (sourceValue instanceof Object && targetValue instanceof Object) {
        (target as any)[key] = deepMerge(targetValue as object, sourceValue as object);
      } else {
        (target as any)[key] = sourceValue;
      }
    }
  }
  
  return deepMerge(target, ...sources);
}

/**
 * Pick properties from object
 */
export function pick<T extends object, K extends keyof T>(obj: T, keys: K[]): Pick<T, K> {
  const result: any = {};
  for (const key of keys) {
    if (key in obj) {
      result[key] = obj[key];
    }
  }
  return result;
}

/**
 * Omit properties from object
 */
export function omit<T extends object, K extends keyof T>(obj: T, keys: K[]): Omit<T, K> {
  const result: any = { ...obj };
  for (const key of keys) {
    delete result[key];
  }
  return result;
}

/**
 * Remove null and undefined values
 */
export function compact<T extends object>(obj: T): Partial<T> {
  const result: any = {};
  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      const value = obj[key];
      if (value !== null && value !== undefined) {
        result[key] = value;
      }
    }
  }
  return result;
}

/**
 * Flatten nested object
 */
export function flatten(obj: any, prefix = '', result: Record<string, any> = {}): Record<string, any> {
  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      const value = obj[key];
      const newKey = prefix ? `${prefix}.${key}` : key;
      
      if (value !== null && typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date)) {
        flatten(value, newKey, result);
      } else {
        result[newKey] = value;
      }
    }
  }
  return result;
}

/**
 * Unflatten object
 */
export function unflatten(obj: Record<string, any>): any {
  const result: any = {};
  
  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      const keys = key.split('.');
      let current = result;
      
      for (let i = 0; i < keys.length - 1; i++) {
        const k = keys[i];
        if (!(k in current)) {
          current[k] = {};
        }
        current = current[k];
      }
      
      current[keys[keys.length - 1]] = obj[key];
    }
  }
  
  return result;
}

/**
 * Sanitize string for safe output
 */
export function sanitize(value: any): string {
  return toString(value)
    .replace(/[<>]/g, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+=/gi, '');
}

/**
 * Truncate string
 */
export function truncate(value: any, maxLength: number, suffix = '...'): string {
  const str = toString(value);
  if (str.length <= maxLength) return str;
  return str.substring(0, maxLength - suffix.length) + suffix;
}

/**
 * Pad string
 */
export function pad(value: any, length: number, char = ' ', left = true): string {
  const str = toString(value);
  if (str.length >= length) return str;
  const padding = char.repeat(length - str.length);
  return left ? padding + str : str + padding;
}

/**
 * Format number with thousands separator
 */
export function formatNumber(value: any, decimals = 0, separator = ','): string {
  const num = toNumber(value);
  if (num === null) return '';
  
  const fixed = num.toFixed(decimals);
  const parts = fixed.split('.');
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, separator);
  
  return parts.join('.');
}

/**
 * Format bytes to human readable
 */
export function formatBytes(bytes: number, decimals = 2): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(decimals)) + ' ' + sizes[i];
}

/**
 * Format duration in milliseconds to human readable
 */
export function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  if (ms < 3600000) return `${(ms / 60000).toFixed(1)}m`;
  return `${(ms / 3600000).toFixed(1)}h`;
}

/**
 * Format date to ISO string
 */
export function formatDate(date: any, format: 'iso' | 'date' | 'time' | 'datetime' = 'iso'): string {
  const d = toDate(date);
  if (!d) return '';
  
  switch (format) {
    case 'iso':
      return d.toISOString();
    case 'date':
      return d.toISOString().split('T')[0];
    case 'time':
      return d.toISOString().split('T')[1].split('.')[0];
    case 'datetime':
      return d.toISOString().replace('T', ' ').split('.')[0];
    default:
      return d.toISOString();
  }
}
