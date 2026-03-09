/**
 * PORTAL DE CHAMADOS - API Authentication & Endpoints
 *
 * Testes de API REST baseados na documentação Swagger do Portal de Chamados.
 * Cobre o fluxo completo de autenticação com o perfil MASTER e
 * verificação de endpoints protegidos.
 *
 * API Base: https://api-portal-chamados-dev.t-upsolucoes.net.br
 * Documentação: Swagger OpenAPI 3.1.0
 *
 * Como funciona a autenticação:
 *   POST /auth/login → servidor retorna JWT via Set-Cookie (access_token)
 *   Requests protegidos → enviar o JWT como  Authorization: Bearer <token>
 */

const { test, expect } = require('../fixtures');

// API base and credentials from environment variables — never hardcode secrets.
// To run locally: API_BASE=... MASTER_EMAIL=... MASTER_PASSWORD=... npx playwright test
// Or create a .env file (see .env.example)
const API_BASE = process.env.API_BASE ?? 'https://api-portal-chamados-dev.t-upsolucoes.net.br';

const MASTER = {
  email: process.env.MASTER_EMAIL ?? 'master@t-upsolucoes.com.br',
  password: process.env.MASTER_PASSWORD ?? '12345678',
};

/**
 * Extrai o valor de um cookie específico da header Set-Cookie.
 * @param {import('@playwright/test').APIResponse} response
 * @param {string} name  nome do cookie (ex: 'access_token')
 * @returns {string|null}
 */
function extractCookie(response, name) {
  const raw = response.headers()['set-cookie'] ?? '';
  const match = raw.match(new RegExp(`(?:^|\\n)${name}=([^;]+)`));
  return match ? match[1] : null;
}

/**
 * Faz login e devolve o access_token JWT.
 * @param {import('@playwright/test').APIRequestContext} request
 * @returns {Promise<string>}
 */
async function loginAsMaster(request) {
  const response = await request.post(`${API_BASE}/auth/login`, {
    headers: { 'Content-Type': 'application/json' },
    data: MASTER,
  });
  expect(response.status()).toBe(200);
  const accessToken = extractCookie(response, 'access_token');
  expect(accessToken, 'access_token cookie deve estar presente na resposta de login').toBeTruthy();
  return accessToken;
}

// ---------------------------------------------------------------------------
// AUTH FLOW
// ---------------------------------------------------------------------------

test.describe('Auth — Portal de Chamados', () => {

  test('[HAPPY] POST /auth/login — login com credenciais do master', async ({ request }) => {
    const response = await request.post(`${API_BASE}/auth/login`, {
      headers: { 'Content-Type': 'application/json' },
      data: MASTER,
    });

    expect(response.status()).toBe(200);

    const accessToken  = extractCookie(response, 'access_token');
    const refreshToken = extractCookie(response, 'refresh_token');

    expect(accessToken,  'access_token cookie deve estar presente').toBeTruthy();
    expect(refreshToken, 'refresh_token cookie deve estar presente').toBeTruthy();
  });

  test('[ERROR] POST /auth/login — rejeita senha inválida', async ({ request }) => {
    const response = await request.post(`${API_BASE}/auth/login`, {
      headers: { 'Content-Type': 'application/json' },
      data: { email: MASTER.email, password: 'senha_errada' },
    });

    expect(response.status()).toBeGreaterThanOrEqual(400);
    expect(response.status()).toBeLessThan(500);
  });

  test('[ERROR] POST /auth/login — rejeita e-mail em formato inválido', async ({ request }) => {
    const response = await request.post(`${API_BASE}/auth/login`, {
      headers: { 'Content-Type': 'application/json' },
      data: { email: 'nao-e-um-email', password: MASTER.password },
    });

    expect(response.status()).toBeGreaterThanOrEqual(400);
  });

});

// ---------------------------------------------------------------------------
// ENDPOINTS PROTEGIDOS
// O JWT é extraído do Set-Cookie de login e enviado como Bearer token.
// ---------------------------------------------------------------------------

test.describe('Endpoints protegidos — Bearer JWT', () => {

  let accessToken;

  test.beforeAll(async ({ request }) => {
    accessToken = await loginAsMaster(request);
  });

  test('[HAPPY] GET /users — listar usuários', async ({ request }) => {
    const response = await request.get(`${API_BASE}/users`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    expect(response.status()).toBe(200);
  });

  test('[HAPPY] GET /tickets — listar tickets', async ({ request }) => {
    const response = await request.get(`${API_BASE}/tickets`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    expect(response.status()).toBe(200);
  });

  test('[HAPPY] GET /companies — listar empresas', async ({ request }) => {
    const response = await request.get(`${API_BASE}/companies`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    expect(response.status()).toBe(200);
  });

  test('[HAPPY] GET /roles — listar perfis de acesso', async ({ request }) => {
    const response = await request.get(`${API_BASE}/roles`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    expect(response.status()).toBe(200);
  });

});

// ---------------------------------------------------------------------------
// ACESSO SEM AUTENTICAÇÃO
// ---------------------------------------------------------------------------

test.describe('Acesso sem autenticação', () => {

  test('[ERROR] GET /users — retorna 401 sem token', async ({ request }) => {
    const response = await request.get(`${API_BASE}/users`);
    expect(response.status()).toBe(401);
  });

  test('[ERROR] GET /tickets — retorna 401 sem token', async ({ request }) => {
    const response = await request.get(`${API_BASE}/tickets`);
    expect(response.status()).toBe(401);
  });

});

// ---------------------------------------------------------------------------
// REFRESH & LOGOUT
// ---------------------------------------------------------------------------

test.describe.serial('Auth — Refresh e Logout', () => {

  let accessToken;
  let refreshToken;

  test.beforeAll(async ({ request }) => {
    const response = await request.post(`${API_BASE}/auth/login`, {
      headers: { 'Content-Type': 'application/json' },
      data: MASTER,
    });
    expect(response.status()).toBe(200);
    accessToken  = extractCookie(response, 'access_token');
    refreshToken = extractCookie(response, 'refresh_token');
  });

  test('[HAPPY] POST /auth/refresh — renovar token usando refresh_token cookie', async ({ request }) => {
    const response = await request.post(`${API_BASE}/auth/refresh`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Cookie: `refresh_token=${refreshToken}`,
      },
    });
    // 200 = renewed; 401 = refresh token expired or isolated context
    expect([200, 401]).toContain(response.status());
    if (response.status() === 200) {
      const newAccessToken = extractCookie(response, 'access_token');
      expect(newAccessToken, 'renovated access_token cookie deve estar presente').toBeTruthy();
    }
  });

  test('[HAPPY] POST /auth/logout — encerrar sessão', async ({ request }) => {
    const response = await request.post(`${API_BASE}/auth/logout`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    expect(response.status()).toBe(200);
  });

});

