import { config } from 'dotenv';
import { resolve } from 'path';

// Load test environment variables
const envPath = resolve(__dirname, '../.env.test');
config({ path: envPath });

// Override with test-specific settings
process.env.NODE_ENV = 'test';
process.env.DB_SYNCHRONIZE = 'true';

// Ensure test database is used
if (!process.env.DB_NAME?.includes('test')) {
  process.env.DB_NAME = 'coding_agent_test';
  process.env.DATABASE_URL = `postgresql://${process.env.DB_USERNAME}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`;
}

console.log('E2E Test Environment Setup:');
console.log('- NODE_ENV:', process.env.NODE_ENV);
console.log('- DB_NAME:', process.env.DB_NAME);
console.log('- DB_SYNCHRONIZE:', process.env.DB_SYNCHRONIZE);
