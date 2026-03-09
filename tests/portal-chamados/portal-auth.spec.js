/**
 * PORTAL DE CHAMADOS — Login (UI)
 *
 * End-to-end tests for the authentication flow via the Portal de Chamados UI.
 * Covers: successful login, invalid credentials, empty-field validation, and logout.
 *
 * Base URL: https://portal-chamados-dev.t-upsolucoes.net.br
 */

const { test, expect } = require('../fixtures');
const fs   = require('fs');
const path = require('path');

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

// Credentials from environment variables — never hardcode secrets in source.
// To run locally:  MASTER_EMAIL=... MASTER_PASSWORD=... npx playwright test
// Or add them to a .env file (see .env.example).
const MASTER = {
  email:    process.env.MASTER_EMAIL    ?? 'master@t-upsolucoes.com.br',
  password: process.env.MASTER_PASSWORD ?? '12345678',
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Builds a structured screenshot path under screenshots/<browser>/.
 * Pattern: {type}__{testSlug}__{stepNumber}__{label}.png
 *
 * @param {'happy'|'error'|'validation'} type
 * @param {string} testSlug  Kebab-case identifier, e.g. 'login'
 * @param {number} step      Step sequence number (zero-padded to 2 digits)
 * @param {string} label     Short kebab-case description, e.g. 'dashboard'
 * @returns {string}
 */
function screenshotPath(type, testSlug, step, label) {
  const browser = test.info().project.name;
  const dir     = path.join('screenshots', browser);
  fs.mkdirSync(dir, { recursive: true });
  return path.join(dir, `${type}__${testSlug}__${String(step).padStart(2, '0')}__${label}.png`);
}

/**
 * Captures a full-page screenshot and attaches it inline to the Playwright
 * HTML report so reviewers can inspect the browser state at each step.
 *
 * @param {import('@playwright/test').Page} page
 * @param {string} label  Short descriptive label shown in the report
 */
async function capture(page, label) {
  const buffer = await page.screenshot({ fullPage: true });
  await test.info().attach(label, { body: buffer, contentType: 'image/png' });
}

/**
 * Performs a full login via the UI and waits for the dashboard to load.
 * Shared by the happy-path test and the Logout describe's beforeEach.
 *
 * @param {import('@playwright/test').Page} page
 */
async function loginViaUI(page) {
  await page.goto('/login');
  await page.waitForLoadState('networkidle');
  await expect(page.locator('button[type="submit"]')).toBeEnabled({ timeout: 10_000 });
  await page.fill('input[name="email"]',    MASTER.email);
  await page.fill('input[name="password"]', MASTER.password);
  await Promise.all([
    page.waitForURL('**/dashboard**', { timeout: 15_000 }),
    page.click('button[type="submit"]'),
  ]);
}

// Video evidence is saved automatically for every test via the shared
// auto fixture in tests/fixtures.js — no per-file afterEach needed.

// ---------------------------------------------------------------------------
// Login
// ---------------------------------------------------------------------------

test.describe('Login — Portal de Chamados', () => {

  test('[HAPPY] login com credenciais válidas do master', async ({ page }) => {
    await test.step('Abre a página de login', async () => {
      await page.goto('/login');
      await page.waitForLoadState('networkidle');
      await capture(page, '01 - Página de login carregada');
    });

    await test.step('Aguarda formulário ficar interativo', async () => {
      await expect(page.locator('button[type="submit"]')).toBeEnabled({ timeout: 10_000 });
    });

    await test.step('Preenche credenciais', async () => {
      await page.fill('input[name="email"]',    MASTER.email);
      await page.fill('input[name="password"]', MASTER.password);
      await capture(page, '02 - Credenciais preenchidas');
    });

    await test.step('Submete o formulário e aguarda redirecionamento', async () => {
      await Promise.all([
        page.waitForURL('**/dashboard**', { timeout: 15_000 }),
        page.click('button[type="submit"]'),
      ]);
      await capture(page, '03 - Dashboard após login bem-sucedido');
    });

    await expect(page).toHaveURL(/dashboard/);

    // Persist disk evidence under screenshots/<browser>/ for external review.
    await page.screenshot({ path: screenshotPath('happy', 'login', 3, 'dashboard-apos-login'), fullPage: true });
  });

  test('[ERROR] exibe erro com senha incorreta', async ({ page }) => {
    await test.step('Abre a página de login', async () => {
      await page.goto('/login');
      await page.waitForLoadState('networkidle');
      await capture(page, '01 - Página de login carregada');
    });

    await test.step('Preenche e-mail correto e senha errada', async () => {
      await page.fill('input[name="email"]',    MASTER.email);
      await page.fill('input[name="password"]', 'senha_errada_123');
      await capture(page, '02 - Campos preenchidos com senha inválida');
    });

    await test.step('Submete e verifica mensagem de erro', async () => {
      await page.click('button[type="submit"]');
      await expect(
        page.locator('[role="alert"], .text-destructive, [data-sonner-toast]').first()
      ).toBeVisible({ timeout: 8_000 });
      await capture(page, '03 - Mensagem de erro exibida');
    });

    await page.screenshot({ path: screenshotPath('error', 'login-senha-invalida', 3, 'mensagem-erro'), fullPage: true });
  });

  test('[VALIDATION] campos obrigatórios não permitem envio vazio', async ({ page }) => {
    await test.step('Abre a página de login', async () => {
      await page.goto('/login');
      await page.waitForLoadState('networkidle');
      await capture(page, '01 - Página de login carregada (campos vazios)');
    });

    await test.step('Tenta submeter sem preencher nada', async () => {
      await page.click('button[type="submit"]');
      // The page must remain on /login — no navigation should occur.
      await expect(page).toHaveURL(/login/, { timeout: 3_000 });
      await capture(page, '02 - Permanece em /login após envio vazio');
    });
  });

});

// ---------------------------------------------------------------------------
// Logout
// ---------------------------------------------------------------------------

test.describe('Logout — Portal de Chamados', () => {

  test.beforeEach(async ({ page }) => {
    await loginViaUI(page);
  });

  test('[HAPPY] realiza logout e redireciona para login', async ({ page }) => {
    await test.step('Confirma que está no dashboard', async () => {
      await expect(page).toHaveURL(/dashboard/);
      await capture(page, '01 - Dashboard após login');
    });

    await test.step('Abre menu do usuário', async () => {
      // The user-menu trigger is rendered by Radix UI DropdownMenu, which
      // always sets aria-haspopup="menu" on the trigger button.
      // If a data-testid is added to the element in the future, prefer that.
      await page.locator('button[aria-haspopup="menu"]').last().click();
      await page.waitForSelector('[role="menuitem"]:has-text("Sair")', { state: 'visible' });
      await capture(page, '02 - Menu do usuário aberto');
    });

    await test.step('Clica em Sair e aguarda redirecionamento', async () => {
      await Promise.all([
        page.waitForURL('**/login**', { timeout: 10_000 }),
        page.click('[role="menuitem"]:has-text("Sair")'),
      ]);
      await capture(page, '03 - Tela de login após logout');
    });

    await expect(page).toHaveURL(/login/);

    await page.screenshot({ path: screenshotPath('happy', 'logout', 3, 'tela-login-apos-logout'), fullPage: true });
  });

});
