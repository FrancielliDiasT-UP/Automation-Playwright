// @ts-check
const fs = require('fs');
const path = require('path');

/**
 * Global Setup — runs once before the entire test suite.
 * Cleans all evidence folders so every run starts fresh:
 *   - playwright-report/
 *   - screenshots/
 *   - test-results/
 */
async function globalSetup() {
  const root = path.resolve(__dirname);

  // Wipe entire screenshots/ and videos/ folders then recreate browser subfolders
  for (const folder of ['screenshots', 'videos']) {
    const folderRoot = path.join(root, folder);
    fs.rmSync(folderRoot, { recursive: true, force: true });
    for (const browser of ['chromium', 'firefox', 'webkit']) {
      fs.mkdirSync(path.join(folderRoot, browser), { recursive: true });
    }
  }

  const evidenceDirs = [
    path.join(root, 'playwright-report'),
    path.join(root, 'test-results', 'chromium'),
    path.join(root, 'test-results', 'firefox'),
    path.join(root, 'test-results', 'webkit'),
  ];

  for (const dir of evidenceDirs) {
    fs.rmSync(dir, { recursive: true, force: true });
    fs.mkdirSync(dir, { recursive: true });
  }

  console.log('\n🧹  Old evidences cleaned (screenshots, videos, test-results, report) — ready for a fresh run.\n');
}

module.exports = globalSetup;
