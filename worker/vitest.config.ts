import { defineConfig } from 'vitest/config';

// Configuration propre au Worker : sans elle, Vitest remonterait jusqu'à celle du site (qui dépend
// d'Astro), alors que le Worker s'installe et se teste seul (job CI `worker`).
export default defineConfig({
  test: {
    include: ['src/**/*.test.ts'],
    environment: 'node',
  },
});
