module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  roots: ["<rootDir>/src", "<rootDir>/tests"],
  testMatch: ["**/tests/unit/**/*.test.ts", "**/tests/unit/**/*.spec.ts"],
  transform: {
    "^.+\\.ts$": "ts-jest",
  },
  collectCoverageFrom: [
    "src/**/*.ts",
    "!src/**/*.d.ts",
    "!src/server.ts", // Exclude main server file from coverage
    "!src/seeders/**/*", // Exclude seeders
    "!src/scripts/**/*", // Exclude utility scripts
  ],
  coverageDirectory: "coverage",
  coverageReporters: ["text", "lcov", "html"],
  setupFilesAfterEnv: ["<rootDir>/tests/setup-simple.ts"],
  testTimeout: 30000, // 30 seconds for database operations
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
  },
  // Ignore node_modules except for ES modules that need transpiling
  transformIgnorePatterns: ["node_modules/(?!(.*\\.mjs$))"],
  // Clear mocks between tests
  clearMocks: true,
  restoreMocks: true,
  // Verbose output for better debugging
  verbose: true,
};
