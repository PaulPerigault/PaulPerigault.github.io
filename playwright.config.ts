import { defineConfig, devices } from '@playwright/test';

const PORT = 4201;

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env['CI'],
  retries: process.env['CI'] ? 2 : 0,
  reporter: process.env['CI'] ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  webServer: {
    command: `node scripts/serve-dist.mjs`,
    url: `http://localhost:${PORT}/fr/`,
    env: { PORT: String(PORT) },
    reuseExistingServer: !process.env['CI'],
  },
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        // Permet d'utiliser un Chromium préinstallé (sandbox sans accès réseau).
        launchOptions: { executablePath: process.env['PW_CHROMIUM_PATH'] },
      },
    },
    // Navigateurs supplémentaires : exécutés par le workflow planifié (PW_ALL_BROWSERS=1).
    ...(process.env['PW_ALL_BROWSERS'] === '1'
      ? [
          { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
          { name: 'webkit', use: { ...devices['Desktop Safari'] } },
        ]
      : []),
  ],
});
