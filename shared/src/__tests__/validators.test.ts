/**
 * Unit tests for generic validators and transformers
 */

import {
  validate,
  assertValid,
  ValidationException,
  Validators,
  SchemaField,
} from '../schemas/validators';

import {
  toDate,
  toBoolean,
  toNumber,
  toInteger,
  toString,
  toArray,
  trim,
  toLowerCase,
  toUpperCase,
  capitalize,
  toSlug,
  parseJSON,
  stringifyJSON,
  deepClone,
  deepMerge,
  pick,
  omit,
  compact,
  flatten,
  unflatten,
  sanitize,
  truncate,
  pad,
  formatNumber,
  formatBytes,
  formatDuration,
  formatDate,
} from '../schemas/transformers';

describe('Generic Validation', () => {
  test('should validate required string field', () => {
    const schema: Record<string, SchemaField> = {
      name: { type: 'string', required: true },
    };
    
    const result = validate({ name: 'test' }, schema);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  test('should reject missing required field', () => {
    const schema: Record<string, SchemaField> = {
      name: { type: 'string', required: true },
    };
    
    const result = validate({}, schema);
    expect(result.valid).toBe(false);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].code).toBe('REQUIRED');
  });

  test('should validate string length constraints', () => {
    const schema: Record<string, SchemaField> = {
      name: { type: 'string', required: true, minLength: 3, maxLength: 10 },
    };
    
    expect(validate({ name: 'ab' }, schema).valid).toBe(false);
    expect(validate({ name: 'abc' }, schema).valid).toBe(true);
    expect(validate({ name: 'abcdefghij' }, schema).valid).toBe(true);
    expect(validate({ name: 'abcdefghijk' }, schema).valid).toBe(false);
  });

  test('should validate number range constraints', () => {
    const schema: Record<string, SchemaField> = {
      age: { type: 'number', required: true, min: 0, max: 120 },
    };
    
    expect(validate({ age: -1 }, schema).valid).toBe(false);
    expect(validate({ age: 0 }, schema).valid).toBe(true);
    expect(validate({ age: 120 }, schema).valid).toBe(true);
    expect(validate({ age: 121 }, schema).valid).toBe(false);
  });

  test('should validate pattern constraint', () => {
    const schema: Record<string, SchemaField> = {
      email: { type: 'string', required: true, pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/ },
    };
    
    expect(validate({ email: 'invalid' }, schema).valid).toBe(false);
    expect(validate({ email: 'test@example.com' }, schema).valid).toBe(true);
  });

  test('should validate enum constraint', () => {
    const schema: Record<string, SchemaField> = {
      status: { type: 'string', required: true, enum: ['active', 'inactive'] as const },
    };
    
    expect(validate({ status: 'invalid' }, schema).valid).toBe(false);
    expect(validate({ status: 'active' }, schema).valid).toBe(true);
  });

  test('should validate array items', () => {
    const schema: Record<string, SchemaField> = {
      tags: {
        type: 'array',
        required: true,
        items: { type: 'string', minLength: 1 },
      },
    };
    
    expect(validate({ tags: ['valid'] }, schema).valid).toBe(true);
    expect(validate({ tags: [''] }, schema).valid).toBe(false);
    expect(validate({ tags: 'not-array' }, schema).valid).toBe(false);
  });

  test('should validate nested objects', () => {
    const schema: Record<string, SchemaField> = {
      user: {
        type: 'object',
        required: true,
        properties: {
          name: { type: 'string', required: true },
          age: { type: 'number', required: true },
        },
      },
    };
    
    expect(validate({ user: { name: 'John', age: 30 } }, schema).valid).toBe(true);
    expect(validate({ user: { name: 'John' } }, schema).valid).toBe(false);
  });

  test('should skip validation for optional missing fields', () => {
    const schema: Record<string, SchemaField> = {
      name: { type: 'string', required: false },
    };
    
    const result = validate({}, schema);
    expect(result.valid).toBe(true);
  });

  test('should validate custom validator', () => {
    const schema: Record<string, SchemaField> = {
      value: {
        type: 'number',
        required: true,
        custom: (val) => val % 2 === 0, // Must be even
      },
    };
    
    expect(validate({ value: 2 }, schema).valid).toBe(true);
    expect(validate({ value: 3 }, schema).valid).toBe(false);
  });
});

describe('Validation Assertion', () => {
  test('should not throw for valid data', () => {
    const schema: Record<string, SchemaField> = {
      name: { type: 'string', required: true },
    };
    
    const result = validate({ name: 'test' }, schema);
    expect(() => assertValid(result)).not.toThrow();
  });

  test('should throw ValidationException for invalid data', () => {
    const schema: Record<string, SchemaField> = {
      name: { type: 'string', required: true },
    };
    
    const result = validate({}, schema);
    expect(() => assertValid(result)).toThrow(ValidationException);
  });
});

describe('Common Validators', () => {
  test('should validate UUID', () => {
    expect(Validators.uuid('123e4567-e89b-12d3-a456-426614174000')).toBe(true);
    expect(Validators.uuid('not-a-uuid')).toBe(false);
  });

  test('should validate email', () => {
    expect(Validators.email('test@example.com')).toBe(true);
    expect(Validators.email('invalid')).toBe(false);
  });

  test('should validate URL', () => {
    expect(Validators.url('https://example.com')).toBe(true);
    expect(Validators.url('not-a-url')).toBe(false);
  });

  test('should validate date', () => {
    expect(Validators.date(new Date())).toBe(true);
    expect(Validators.date('not-a-date')).toBe(false);
  });

  test('should validate ISO date string', () => {
    expect(Validators.isoDate('2024-01-01T00:00:00Z')).toBe(true);
    expect(Validators.isoDate('invalid')).toBe(false);
  });

  test('should validate positive number', () => {
    expect(Validators.positiveNumber(1)).toBe(true);
    expect(Validators.positiveNumber(0)).toBe(false);
    expect(Validators.positiveNumber(-1)).toBe(false);
  });

  test('should validate non-negative number', () => {
    expect(Validators.nonNegativeNumber(0)).toBe(true);
    expect(Validators.nonNegativeNumber(1)).toBe(true);
    expect(Validators.nonNegativeNumber(-1)).toBe(false);
  });

  test('should validate integer', () => {
    expect(Validators.integer(1)).toBe(true);
    expect(Validators.integer(1.5)).toBe(false);
  });

  test('should validate alphanumeric', () => {
    expect(Validators.alphanumeric('abc123')).toBe(true);
    expect(Validators.alphanumeric('abc-123')).toBe(false);
  });

  test('should validate slug', () => {
    expect(Validators.slug('my-slug-123')).toBe(true);
    expect(Validators.slug('My Slug')).toBe(false);
  });

  test('should validate hex color', () => {
    expect(Validators.hexColor('#FF0000')).toBe(true);
    expect(Validators.hexColor('#ff0000')).toBe(true);
    expect(Validators.hexColor('FF0000')).toBe(false);
  });

  test('should validate semver', () => {
    expect(Validators.semver('1.0.0')).toBe(true);
    expect(Validators.semver('1.0.0-alpha')).toBe(true);
    expect(Validators.semver('1.0')).toBe(false);
  });
});

describe('Type Transformers', () => {
  test('should transform to date', () => {
    expect(toDate('2024-01-01')).toBeInstanceOf(Date);
    expect(toDate(new Date())).toBeInstanceOf(Date);
    expect(toDate('invalid')).toBeNull();
  });

  test('should transform to boolean', () => {
    expect(toBoolean(true)).toBe(true);
    expect(toBoolean('true')).toBe(true);
    expect(toBoolean('1')).toBe(true);
    expect(toBoolean('yes')).toBe(true);
    expect(toBoolean(false)).toBe(false);
    expect(toBoolean('false')).toBe(false);
    expect(toBoolean('0')).toBe(false);
    expect(toBoolean(1)).toBe(true);
    expect(toBoolean(0)).toBe(false);
  });

  test('should transform to number', () => {
    expect(toNumber(123)).toBe(123);
    expect(toNumber('123')).toBe(123);
    expect(toNumber('123.45')).toBe(123.45);
    expect(toNumber('invalid')).toBeNull();
  });

  test('should transform to integer', () => {
    expect(toInteger(123)).toBe(123);
    expect(toInteger(123.9)).toBe(123);
    expect(toInteger('123')).toBe(123);
  });

  test('should transform to string', () => {
    expect(toString('test')).toBe('test');
    expect(toString(123)).toBe('123');
    expect(toString(null)).toBe('');
    expect(toString({ a: 1 })).toBe('{"a":1}');
  });

  test('should transform to array', () => {
    expect(toArray([1, 2, 3])).toEqual([1, 2, 3]);
    expect(toArray(1)).toEqual([1]);
    expect(toArray(null)).toEqual([]);
  });
});

describe('String Transformers', () => {
  test('should trim string', () => {
    expect(trim('  test  ')).toBe('test');
  });

  test('should convert to lowercase', () => {
    expect(toLowerCase('TEST')).toBe('test');
  });

  test('should convert to uppercase', () => {
    expect(toUpperCase('test')).toBe('TEST');
  });

  test('should capitalize', () => {
    expect(capitalize('test')).toBe('Test');
    expect(capitalize('TEST')).toBe('Test');
  });

  test('should convert to slug', () => {
    expect(toSlug('Hello World')).toBe('hello-world');
    expect(toSlug('Hello  World!')).toBe('hello-world');
  });

  test('should sanitize string', () => {
    expect(sanitize('<script>alert("xss")</script>')).not.toContain('<script>');
    expect(sanitize('javascript:alert("xss")')).not.toContain('javascript:');
  });

  test('should truncate string', () => {
    expect(truncate('Hello World', 5)).toBe('He...');
    expect(truncate('Hi', 10)).toBe('Hi');
  });

  test('should pad string', () => {
    expect(pad('5', 3, '0')).toBe('005');
    expect(pad('5', 3, '0', false)).toBe('500');
  });
});

describe('JSON Transformers', () => {
  test('should parse JSON safely', () => {
    expect(parseJSON('{"a":1}')).toEqual({ a: 1 });
    expect(parseJSON('invalid', { default: true })).toEqual({ default: true });
  });

  test('should stringify JSON safely', () => {
    expect(stringifyJSON({ a: 1 })).toBe('{"a":1}');
    expect(stringifyJSON({ a: 1 }, true)).toContain('\n');
  });
});

describe('Object Transformers', () => {
  test('should deep clone object', () => {
    const obj = { a: 1, b: { c: 2 } };
    const cloned = deepClone(obj);
    
    expect(cloned).toEqual(obj);
    expect(cloned).not.toBe(obj);
    expect(cloned.b).not.toBe(obj.b);
  });

  test('should deep merge objects', () => {
    const target = { a: 1, b: { c: 2 } };
    const source = { b: { d: 3 }, e: 4 };
    const merged = deepMerge(target, source);
    
    expect(merged).toEqual({ a: 1, b: { c: 2, d: 3 }, e: 4 });
  });

  test('should pick properties', () => {
    const obj = { a: 1, b: 2, c: 3 };
    expect(pick(obj, ['a', 'c'])).toEqual({ a: 1, c: 3 });
  });

  test('should omit properties', () => {
    const obj = { a: 1, b: 2, c: 3 };
    expect(omit(obj, ['b'])).toEqual({ a: 1, c: 3 });
  });

  test('should compact object', () => {
    const obj = { a: 1, b: null, c: undefined, d: 2 };
    expect(compact(obj)).toEqual({ a: 1, d: 2 });
  });

  test('should flatten object', () => {
    const obj = { a: 1, b: { c: 2, d: { e: 3 } } };
    expect(flatten(obj)).toEqual({ a: 1, 'b.c': 2, 'b.d.e': 3 });
  });

  test('should unflatten object', () => {
    const obj = { a: 1, 'b.c': 2, 'b.d.e': 3 };
    expect(unflatten(obj)).toEqual({ a: 1, b: { c: 2, d: { e: 3 } } });
  });
});

describe('Format Transformers', () => {
  test('should format number', () => {
    expect(formatNumber(1000)).toBe('1,000');
    expect(formatNumber(1000000, 2)).toBe('1,000,000.00');
  });

  test('should format bytes', () => {
    expect(formatBytes(0)).toBe('0 Bytes');
    expect(formatBytes(1024)).toBe('1 KB');
    expect(formatBytes(1024 * 1024)).toBe('1 MB');
    expect(formatBytes(1024 * 1024 * 1024)).toBe('1 GB');
  });

  test('should format duration', () => {
    expect(formatDuration(500)).toBe('500ms');
    expect(formatDuration(5000)).toBe('5.0s');
    expect(formatDuration(60000)).toBe('1.0m');
    expect(formatDuration(3600000)).toBe('1.0h');
  });

  test('should format date', () => {
    const date = new Date('2024-01-01T12:00:00Z');
    
    expect(formatDate(date, 'iso')).toContain('2024-01-01');
    expect(formatDate(date, 'date')).toBe('2024-01-01');
    expect(formatDate(date, 'time')).toContain('12:00:00');
    expect(formatDate(date, 'datetime')).toContain('2024-01-01 12:00:00');
  });
});
