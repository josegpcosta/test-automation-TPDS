import { defineConfig, devices } from '@playwright/test';
import { env } from './src/config/env';
import { Timeouts } from './src/config/timeouts';

const browserTests = /tests[\\/]e2e[\\/].*\.spec\.ts/;

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: env.CI,
  retries: env.CI ? 2 : 0,
  workers: env.CI ? 2 : undefined,
  timeout: Timeouts.test,
  expect: { timeout: Timeouts.expect },

  reporter: env.CI
    ? [['github'], ['html', { open: 'never' }], ['junit', { outputFile: 'test-results/junit.xml' }]]
    : [['list'], ['html', { open: 'never' }]],

  use: {
    baseURL: env.BASE_URL,
    actionTimeout: Timeouts.action,
    navigationTimeout: Timeouts.action,
    trace: 'retain-on-failure',
    video: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },

  projects: [
    /* Strapi Content API: contract, i18n, Draft & Publish, permissions, content integrity. No browser. */
    {
      name: 'api',
      testDir: './tests/api',
    },

    /* Website rendering of CMS content. */
    {
      name: 'chromium',
      testMatch: browserTests,
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      testMatch: browserTests,
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      testMatch: browserTests,
      use: { ...devices['Desktop Safari'] },
    },
  ],
});
