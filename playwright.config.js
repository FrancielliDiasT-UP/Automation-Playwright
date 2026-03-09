// @ts-check
const { defineConfig, devices } = require('@playwright/test');

/**
 * Playwright Configuration File
 * This file configures how Playwright runs your tests
 * Documentation: https://playwright.dev/docs/test-configuration
 */

module.exports = defineConfig({
  // Runs once before the whole suite — cleans stale evidence folders
  globalSetup: './global-setup.js',

  // Directory where test files are located
  testDir: './tests',
  
  // Maximum time one test can run (30 seconds)
  timeout: 30 * 1000,
  
  // Run tests in files in parallel
  fullyParallel: true,
  
  // Fail the build on CI if you accidentally left test.only in the source code
  forbidOnly: !!process.env.CI,
  
  // Retry on CI (2x) and locally (1x) to handle transient network flakiness
  retries: process.env.CI ? 2 : 1,
  
  // Number of parallel workers
  workers: process.env.CI ? 1 : undefined,
  
  // Reporter to use.
  // The HTML report is written to playwright-report/ and already groups tests
  // by browser project. The JUnit report adds a machine-readable XML file
  // per-browser so CI systems can parse individual browser results.
  reporter: process.env.CI
    ? [
        ['html', { outputFolder: 'playwright-report' }],
        ['junit', { outputFile: 'test-results/chromium/results.xml' }],
        ['list'],
      ]
    : [
        ['html', { outputFolder: 'playwright-report' }],
        ['junit', { outputFile: 'test-results/chromium/results.xml', projectFilter: 'chromium' }],
        ['junit', { outputFile: 'test-results/firefox/results.xml',  projectFilter: 'firefox'  }],
        ['junit', { outputFile: 'test-results/webkit/results.xml',   projectFilter: 'webkit'   }],
        ['list'],
      ],
  
  // Shared settings for all tests
  use: {
    // Base URL for the Portal de Chamados frontend
    baseURL: 'https://portal-chamados-dev.t-upsolucoes.net.br',

    // 1280×720 viewport — consistent HD baseline for screenshots and video
    viewport: { width: 1280, height: 720 },

    // Capture screenshot only on failure in CI to save time; always locally
    screenshot: process.env.CI ? 'only-on-failure' : 'on',

    // Record video only on first retry in CI; always locally
    video: process.env.CI
      ? { mode: 'retain-on-failure', size: { width: 1280, height: 720 } }
      : { mode: 'on', size: { width: 1280, height: 720 } },

    // Collect trace only on first retry in CI; always locally
    trace: process.env.CI ? 'on-first-retry' : 'on',

    // Give each UI action up to 15 s before timing out
    actionTimeout: 15 * 1000,
  },

  // Configure projects for different browsers.
  // Each project writes its artifacts (videos, traces, screenshots) into its
  // own subfolder under test-results/ so runs are easy to inspect per browser.
  projects: process.env.CI
    // On CI: Chromium only — fast, reliable, avoids 30-min timeouts
    ? [
        {
          name: 'chromium',
          outputDir: './test-results/chromium',
          use: { ...devices['Desktop Chrome'] },
        },
      ]
    // Locally: all three browsers
    : [
        {
          name: 'chromium',
          outputDir: './test-results/chromium',
          use: { ...devices['Desktop Chrome'] },
        },

        {
          name: 'firefox',
          outputDir: './test-results/firefox',
          use: { ...devices['Desktop Firefox'] },
        },

        {
          name: 'webkit',
          outputDir: './test-results/webkit',
          use: { ...devices['Desktop Safari'] },
        },
      ],

  // Run your local dev server before starting tests
  // Uncomment if you have a local server to test
  // webServer: {
  //   command: 'npm run start',
  //   url: 'http://127.0.0.1:3000',
  //   reuseExistingServer: !process.env.CI,
  // },
});
