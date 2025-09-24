module.exports = {
  projects: [
    {
      displayName: 'frontend',
      testMatch: ['<rootDir>/frontend/**/*.test.{js,ts,tsx}'],
      testEnvironment: 'jsdom',
      setupFilesAfterEnv: ['<rootDir>/frontend/jest.setup.js'],
      moduleNameMapping: {
        '^@/(.*)$': '<rootDir>/frontend/src/$1',
        '^@shared/(.*)$': '<rootDir>/shared/src/$1',
      },
      transform: {
        '^.+\\.(js|jsx|ts|tsx)$': ['babel-jest', { presets: ['next/babel'] }],
      },
    },
    {
      displayName: 'backend',
      testMatch: ['<rootDir>/backend/**/*.test.{js,ts}'],
      testEnvironment: 'node',
      preset: 'ts-jest',
      moduleNameMapping: {
        '^@/(.*)$': '<rootDir>/backend/src/$1',
        '^@shared/(.*)$': '<rootDir>/shared/src/$1',
      },
    },
    {
      displayName: 'llm-service',
      testMatch: ['<rootDir>/llm-service/**/*.test.{js,ts}'],
      testEnvironment: 'node',
      preset: 'ts-jest',
      moduleNameMapping: {
        '^@/(.*)$': '<rootDir>/llm-service/src/$1',
        '^@shared/(.*)$': '<rootDir>/shared/src/$1',
      },
    },
    {
      displayName: 'shared',
      testMatch: ['<rootDir>/shared/**/*.test.{js,ts}'],
      testEnvironment: 'node',
      preset: 'ts-jest',
      moduleNameMapping: {
        '^@shared/(.*)$': '<rootDir>/shared/src/$1',
      },
    },
  ],
  collectCoverageFrom: [
    '**/*.{js,ts,tsx}',
    '!**/*.d.ts',
    '!**/node_modules/**',
    '!**/dist/**',
    '!**/.next/**',
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
};