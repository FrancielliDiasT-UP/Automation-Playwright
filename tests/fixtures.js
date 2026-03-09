/**
 * Shared Playwright fixtures
 *
 * All spec files should import { test, expect } from this module instead of
 * directly from '@playwright/test'.
 *
 * What this adds on top of the stock test object:
 *   autoVideo — auto fixture that runs after every test and saves the recorded
 *               video to  videos/<browser>/{type}__{slug}.webm
 *               using the test title prefix [HAPPY], [ERROR] or [VALIDATION]
 *               to build the filename.
 */

const { test: base, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

const test = base.extend({
  // Auto fixture: no test file needs to call anything — it just happens.
  autoVideo: [async ({ page }, use, testInfo) => {
    // Let the test run first.
    await use();

    const video = page.video();
    if (!video) return;

    const match = testInfo.title.match(/^\[(HAPPY|ERROR|VALIDATION)\]\s+(.+)/i);
    const type  = match ? match[1].toLowerCase() : 'other';
    const rawSlug = match ? match[2] : testInfo.title;
    const slug = rawSlug
      .toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');

    const browser = testInfo.project.name;
    const dir = path.join('videos', browser);
    fs.mkdirSync(dir, { recursive: true });

    await video.saveAs(path.join(dir, `${type}__${slug}.webm`));
  }, { auto: true }],
});

module.exports = { test, expect };
