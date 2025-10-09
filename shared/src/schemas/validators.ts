/**
 * Generic validation utilities
 */

/**
 * Validation result
 */
export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

/**
 * Validation error
 */
export interface ValidationError {
  field: string;
  message: string;
  code: string;
  value?: any;
}

/**
 * Schema field definition
 */
export interface SchemaField {
  type: 'string' | 'number' | 'boolean' | 'object' | 'array' | 'any';
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  pattern?: RegExp;
  enum?: readonly any[];
  items?: SchemaField;
  properties?: Record<string, SchemaField>;
  schema?: Record<string, SchemaField>;
  custom?: (value: any) => boolean;
}

/**
 * Validate value against schema
 */
export function validate(value: any, schema: Record<string, SchemaField>, fieldPrefix = ''): ValidationResult {
  const errors: ValidationError[] = [];
  
  for (const [fieldName, fieldSchema] of Object.entries(schema)) {
    const fullFieldName = fieldPrefix ? `${fieldPrefix}.${fieldName}` : fieldName;
    const fieldValue = value?.[fieldName];
    
    // Check required
    if (fieldSchema.required && (fieldValue === undefined || fieldValue === null)) {
      errors.push({
        field: fullFieldName,
        message: `Field '${fullFieldName}' is required`,
        code: 'REQUIRED',
      });
      continue;
    }
    
    // Skip validation if field is not required and not present
    if (!fieldSchema.required && (fieldValue === undefined || fieldValue === null)) {
      continue;
    }
    
    // Validate type
    const typeErrors = validateType(fieldValue, fieldSchema, fullFieldName);
    errors.push(...typeErrors);
    
    // Validate constraints
    const constraintErrors = validateConstraints(fieldValue, fieldSchema, fullFieldName);
    errors.push(...constraintErrors);
    
    // Validate nested schema
    if (fieldSchema.schema && typeof fieldValue === 'object') {
      const nestedResult = validate(fieldValue, fieldSchema.schema, fullFieldName);
      errors.push(...nestedResult.errors);
    }
    
    // Validate nested properties
    if (fieldSchema.properties && typeof fieldValue === 'object') {
      const nestedResult = validate(fieldValue, fieldSchema.properties, fullFieldName);
      errors.push(...nestedResult.errors);
    }
    
    // Custom validation
    if (fieldSchema.custom && !fieldSchema.custom(fieldValue)) {
      errors.push({
        field: fullFieldName,
        message: `Field '${fullFieldName}' failed custom validation`,
        code: 'CUSTOM_VALIDATION',
        value: fieldValue,
      });
    }
  }
  
  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validate type
 */
function validateType(value: any, schema: SchemaField, fieldName: string): ValidationError[] {
  const errors: ValidationError[] = [];
  
  if (schema.type === 'any') {
    return errors;
  }
  
  const actualType = Array.isArray(value) ? 'array' : typeof value;
  
  if (schema.type === 'object' && actualType !== 'object') {
    errors.push({
      field: fieldName,
      message: `Field '${fieldName}' must be an object`,
      code: 'INVALID_TYPE',
      value,
    });
  } else if (schema.type === 'array' && !Array.isArray(value)) {
    errors.push({
      field: fieldName,
      message: `Field '${fieldName}' must be an array`,
      code: 'INVALID_TYPE',
      value,
    });
  } else if (schema.type !== 'object' && schema.type !== 'array' && actualType !== schema.type) {
    errors.push({
      field: fieldName,
      message: `Field '${fieldName}' must be of type ${schema.type}`,
      code: 'INVALID_TYPE',
      value,
    });
  }
  
  return errors;
}

/**
 * Validate constraints
 */
function validateConstraints(value: any, schema: SchemaField, fieldName: string): ValidationError[] {
  const errors: ValidationError[] = [];
  
  // String constraints
  if (schema.type === 'string' && typeof value === 'string') {
    if (schema.minLength !== undefined && value.length < schema.minLength) {
      errors.push({
        field: fieldName,
        message: `Field '${fieldName}' must be at least ${schema.minLength} characters`,
        code: 'MIN_LENGTH',
        value,
      });
    }
    
    if (schema.maxLength !== undefined && value.length > schema.maxLength) {
      errors.push({
        field: fieldName,
        message: `Field '${fieldName}' must be at most ${schema.maxLength} characters`,
        code: 'MAX_LENGTH',
        value,
      });
    }
    
    if (schema.pattern && !schema.pattern.test(value)) {
      errors.push({
        field: fieldName,
        message: `Field '${fieldName}' does not match required pattern`,
        code: 'PATTERN_MISMATCH',
        value,
      });
    }
  }
  
  // Number constraints
  if (schema.type === 'number' && typeof value === 'number') {
    if (schema.min !== undefined && value < schema.min) {
      errors.push({
        field: fieldName,
        message: `Field '${fieldName}' must be at least ${schema.min}`,
        code: 'MIN_VALUE',
        value,
      });
    }
    
    if (schema.max !== undefined && value > schema.max) {
      errors.push({
        field: fieldName,
        message: `Field '${fieldName}' must be at most ${schema.max}`,
        code: 'MAX_VALUE',
        value,
      });
    }
  }
  
  // Enum constraint
  if (schema.enum && !schema.enum.includes(value)) {
    errors.push({
      field: fieldName,
      message: `Field '${fieldName}' must be one of: ${schema.enum.join(', ')}`,
      code: 'INVALID_ENUM',
      value,
    });
  }
  
  // Array items validation
  if (schema.type === 'array' && Array.isArray(value) && schema.items) {
    value.forEach((item, index) => {
      const itemErrors = validateType(item, schema.items!, `${fieldName}[${index}]`);
      errors.push(...itemErrors);
      
      const constraintErrors = validateConstraints(item, schema.items!, `${fieldName}[${index}]`);
      errors.push(...constraintErrors);
      
      if (schema.items!.schema) {
        const nestedResult = validate(item, schema.items!.schema, `${fieldName}[${index}]`);
        errors.push(...nestedResult.errors);
      }
    });
  }
  
  return errors;
}

/**
 * Assert validation result
 */
export function assertValid(result: ValidationResult): void {
  if (!result.valid) {
    const errorMessages = result.errors.map(e => `${e.field}: ${e.message}`).join('; ');
    throw new ValidationException(`Validation failed: ${errorMessages}`, result.errors);
  }
}

/**
 * Validation exception
 */
export class ValidationException extends Error {
  constructor(
    message: string,
    public readonly errors: ValidationError[],
  ) {
    super(message);
    this.name = 'ValidationException';
  }
}

/**
 * Common validators
 */

export const Validators = {
  uuid: (value: any): boolean => {
    return typeof value === 'string' && /^[a-f0-9-]{36}$/i.test(value);
  },
  
  email: (value: any): boolean => {
    return typeof value === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  },
  
  url: (value: any): boolean => {
    try {
      new URL(value);
      return true;
    } catch {
      return false;
    }
  },
  
  date: (value: any): boolean => {
    return value instanceof Date && !isNaN(value.getTime());
  },
  
  isoDate: (value: any): boolean => {
    return typeof value === 'string' && !isNaN(Date.parse(value));
  },
  
  positiveNumber: (value: any): boolean => {
    return typeof value === 'number' && value > 0;
  },
  
  nonNegativeNumber: (value: any): boolean => {
    return typeof value === 'number' && value >= 0;
  },
  
  integer: (value: any): boolean => {
    return typeof value === 'number' && Number.isInteger(value);
  },
  
  alphanumeric: (value: any): boolean => {
    return typeof value === 'string' && /^[a-zA-Z0-9]+$/.test(value);
  },
  
  alphanumericWithSpaces: (value: any): boolean => {
    return typeof value === 'string' && /^[a-zA-Z0-9\s]+$/.test(value);
  },
  
  slug: (value: any): boolean => {
    return typeof value === 'string' && /^[a-z0-9-]+$/.test(value);
  },
  
  hexColor: (value: any): boolean => {
    return typeof value === 'string' && /^#[0-9A-F]{6}$/i.test(value);
  },
  
  semver: (value: any): boolean => {
    return typeof value === 'string' && /^\d+\.\d+\.\d+(-[a-zA-Z0-9.-]+)?(\+[a-zA-Z0-9.-]+)?$/.test(value);
  },
};
