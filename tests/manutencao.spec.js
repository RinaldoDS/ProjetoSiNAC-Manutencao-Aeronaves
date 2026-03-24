/**
 * manutencao.spec.js
 * Testes Cross-Browser - Playwright
 * Projeto Saindo do Zero (ANAC Maintenance System)
 * Sprint 1 | Playwright
 *
 * Cobre:
 *   - Persistencia de dados apos login/logout
 *   - Validacao de prefixo via API
 *   - Seguranca: acesso sem token, acesso negado por role
 *   - Cross-browser: Chromium, Firefox, WebKit
 */

const { test, expect, request } = require('@playwright/test');

const BASE_URL = 'http://localhost:3000';

// ─────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────

async function loginAPI(apiContext, username, password) {
  const res = await apiContext.post(`${BASE_URL}/login`, {
    data: { username, password }
  });
  expect(res.status()).toBe(200);
  const body = await res.json();
  expect(body.token).toBeTruthy();
  return body;
}

async function criarSolicitacao(apiContext, token, payload) {
  const res = await apiContext.post(`${BASE_URL}/solicitacoes`, {
    data: payload,
    headers: { 'Authorization': token }
  });
  return res;
}

// Injeta token no localStorage antes de visitar pagina
async function autenticarPagina(page, token, role, username) {
  await page.goto(`${BASE_URL}/`);
  await page.evaluate(([t, r, u]) => {
    localStorage.setItem('token', t);
    localStorage.setItem('role', r);
    localStorage.setItem('username', u);
  }, [token, role, username]);
}

// ─────────────────────────────────────────────────────────
// SUITE 1: Login UI (Cross-browser)
// ─────────────────────────────────────────────────────────

test.describe('US01 - Login UI', () => {

  test('pagina de login carrega corretamente', async ({ page }) => {
    await page.goto(`${BASE_URL}/`);

    await expect(page.locator('form#formLogin')).toBeVisible();
    await expect(page.locator('input#username')).toBeVisible();
    await expect(page.locator('input#password')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toContainText('Entrar');
  });

  test('Given Rinaldo com senha 123456, When faz login, Then vai para dashboard', async ({ page }) => {
    await page.goto(`${BASE_URL}/`);

    // Given
    await page.fill('input#username', 'Rinaldo');
    await page.fill('input#password', '123456');

    // When
    await page.click('button[type="submit"]');

    // Then
    await page.waitForURL(`${BASE_URL}/dashboard.html`);
    await expect(page).toHaveURL(/dashboard\.html/);
    await expect(page.locator('header h1')).toContainText('ANAC');
  });

  test('Given senha errada, When faz login, Then exibe erro sem redirecionar', async ({ page }) => {
    await page.goto(`${BASE_URL}/`);

    await page.fill('input#username', 'Rinaldo');
    await page.fill('input#password', 'wrongpassword');
    await page.click('button[type="submit"]');

    await expect(page.locator('#msg.error')).toBeVisible();
    await expect(page.locator('#msg.error')).toContainText('invalidos');
    await expect(page).toHaveURL(`${BASE_URL}/`);
  });

  test('Given Diretor Anac, When faz login, Then vai para anac.html', async ({ page }) => {
    await page.goto(`${BASE_URL}/`);

    await page.fill('input#username', 'Diretor Anac');
    await page.fill('input#password', '123456');
    await page.click('button[type="submit"]');

    await page.waitForURL(`${BASE_URL}/anac.html`);
    await expect(page).toHaveURL(/anac\.html/);
  });

});

// ─────────────────────────────────────────────────────────
// SUITE 2: Validacao de Prefixo (API)
// ─────────────────────────────────────────────────────────

test.describe('US02 - Validacao de Prefixo (API)', () => {

  let token;

  test.beforeAll(async ({ request: apiCtx }) => {
    const data = await loginAPI(apiCtx, 'Rinaldo', '123456');
    token = data.token;
  });

  const prefixosValidos = ['PT-ABC', 'GL-XYZ', 'AD-CYP', 'AZ-BCD', 'LA-TAM'];
  const prefixosInvalidos = [
    { prefix: 'pt-abc',  motivo: 'minusculas' },
    { prefix: 'PTABC',   motivo: 'sem hifen' },
    { prefix: 'P-ABC',   motivo: 'apenas 1 letra antes do hifen' },
    { prefix: 'PT-AB',   motivo: 'apenas 2 letras apos hifen' },
    { prefix: 'PT-ABCD', motivo: 'mais de 3 letras apos hifen' },
    { prefix: '12-ABC',  motivo: 'numeros no prefixo' },
    { prefix: '',        motivo: 'campo vazio' },
  ];

  for (const p of prefixosValidos) {
    test(`prefixo valido: "${p}"`, async ({ request: apiCtx }) => {
      const res = await criarSolicitacao(apiCtx, token, {
        company_name: 'Test Air',
        prefix: p,
        maintenance_reason: 'Teste de prefixo valido',
        origin_aerodrome: 'SBGP',
        destination_aerodrome: 'SBRJ',
        flight_date: '2026-08-01',
        flight_time: '10:00'
      });
      expect(res.status()).toBe(201);
      const body = await res.json();
      expect(body.id).toBeGreaterThan(0);
    });
  }

  for (const { prefix, motivo } of prefixosInvalidos) {
    test(`prefixo invalido: "${prefix}" (${motivo})`, async ({ request: apiCtx }) => {
      const res = await criarSolicitacao(apiCtx, token, {
        company_name: 'Test Air',
        prefix: prefix,
        maintenance_reason: 'Teste invalido',
        origin_aerodrome: 'SBGP',
        destination_aerodrome: 'SBRJ',
        flight_date: '2026-08-01',
        flight_time: '10:00'
      });
      expect(res.status()).toBe(400);
      const body = await res.json();
      expect(body.error).toBeTruthy();
    });
  }

});

// ─────────────────────────────────────────────────────────
// SUITE 3: Persistencia de Dados
// ─────────────────────────────────────────────────────────

test.describe('US02 - Persistencia de Dados', () => {

  test('Given solicitacao criada, When usuario faz logout e login novamente, Then dado ainda existe', async ({ page, request: apiCtx }) => {
    // Given: Criar solicitacao via API
    const { token } = await loginAPI(apiCtx, 'Rinaldo', '123456');
    const criarRes = await criarSolicitacao(apiCtx, token, {
      company_name:          'Persistencia Test',
      prefix:                'PS-TST',
      maintenance_reason:    'Teste de persistencia',
      origin_aerodrome:      'SBCF',
      destination_aerodrome: 'SBBR',
      flight_date:           '2026-09-01',
      flight_time:           '12:00'
    });
    expect(criarRes.status()).toBe(201);
    const { id } = await criarRes.json();

    // When: Logout via API
    await apiCtx.post(`${BASE_URL}/logout`, {
      headers: { 'Authorization': token }
    });

    // When: Login novamente com nova sessao
    const novoLogin = await loginAPI(apiCtx, 'Rinaldo', '123456');
    const novoToken = novoLogin.token;

    // Then: Dado ainda existe no banco
    const getRes = await apiCtx.get(`${BASE_URL}/solicitacoes`, {
      headers: { 'Authorization': novoToken }
    });
    expect(getRes.status()).toBe(200);
    const solicitacoes = await getRes.json();
    const encontrou = solicitacoes.some(s => s.id === id && s.prefix === 'PS-TST');
    expect(encontrou).toBe(true);
  });

  test('Given dados criados por Rinaldo, When Diretor consulta, Then ve a solicitacao com status correto apos aprovacao', async ({ request: apiCtx }) => {
    // Criar como colaborador
    const { token: tColab } = await loginAPI(apiCtx, 'Rinaldo', '123456');
    const criarRes = await criarSolicitacao(apiCtx, tColab, {
      company_name:          'Verificacao Status',
      prefix:                'VF-STS',
      maintenance_reason:    'Inspecao pre-voo',
      origin_aerodrome:      'SBPA',
      destination_aerodrome: 'SBFL',
      flight_date:           '2026-10-05',
      flight_time:           '07:30'
    });
    const { id } = await criarRes.json();

    // Aprovar como diretor
    const { token: tDir } = await loginAPI(apiCtx, 'Diretor Anac', '123456');
    const aprovRes = await apiCtx.put(`${BASE_URL}/solicitacoes/${id}`, {
      data: { status: 'Autorizado' },
      headers: { 'Authorization': tDir }
    });
    expect(aprovRes.status()).toBe(200);

    // Verificar status como colaborador
    const getRes = await apiCtx.get(`${BASE_URL}/solicitacoes`, {
      headers: { 'Authorization': tColab }
    });
    const solicitacoes = await getRes.json();
    const sol = solicitacoes.find(s => s.id === id);
    expect(sol).toBeTruthy();
    expect(sol.status).toBe('Autorizado');
  });

});

// ─────────────────────────────────────────────────────────
// SUITE 4: Seguranca e Controle de Acesso
// ─────────────────────────────────────────────────────────

test.describe('Seguranca - Controle de Acesso', () => {

  test('GET /solicitacoes sem token retorna 401', async ({ request: apiCtx }) => {
    const res = await apiCtx.get(`${BASE_URL}/solicitacoes`);
    expect(res.status()).toBe(401);
  });

  test('GET /solicitacoes com token invalido retorna 401', async ({ request: apiCtx }) => {
    const res = await apiCtx.get(`${BASE_URL}/solicitacoes`, {
      headers: { 'Authorization': 'token-invalido-fake' }
    });
    expect(res.status()).toBe(401);
  });

  test('Colaborador nao pode aprovar solicitacao (403)', async ({ request: apiCtx }) => {
    const { token } = await loginAPI(apiCtx, 'Rinaldo', '123456');
    const res = await apiCtx.put(`${BASE_URL}/solicitacoes/1`, {
      data: { status: 'Autorizado' },
      headers: { 'Authorization': token }
    });
    expect(res.status()).toBe(403);
    const body = await res.json();
    expect(body.error).toContain('Acesso negado');
  });

  test('Diretor nao pode criar solicitacao (403)', async ({ request: apiCtx }) => {
    const { token } = await loginAPI(apiCtx, 'Diretor Anac', '123456');
    const res = await criarSolicitacao(apiCtx, token, {
      company_name:          'Tentativa Indevida',
      prefix:                'DI-RET',
      maintenance_reason:    'Teste de acesso indevido',
      origin_aerodrome:      'SBGP',
      destination_aerodrome: 'SBRJ',
      flight_date:           '2026-11-01',
      flight_time:           '08:00'
    });
    expect(res.status()).toBe(403);
  });

  test('Given usuario logado, When faz logout, Then token invalido retorna 401', async ({ request: apiCtx }) => {
    // Login
    const { token } = await loginAPI(apiCtx, 'Rinaldo', '123456');

    // Verificar que token funciona
    const antes = await apiCtx.get(`${BASE_URL}/solicitacoes`, {
      headers: { 'Authorization': token }
    });
    expect(antes.status()).toBe(200);

    // Logout
    await apiCtx.post(`${BASE_URL}/logout`, {
      headers: { 'Authorization': token }
    });

    // Token deve estar invalido
    const depois = await apiCtx.get(`${BASE_URL}/solicitacoes`, {
      headers: { 'Authorization': token }
    });
    expect(depois.status()).toBe(401);
  });

  test('Status invalido retorna 400', async ({ request: apiCtx }) => {
    const { token } = await loginAPI(apiCtx, 'Diretor Anac', '123456');
    const res = await apiCtx.put(`${BASE_URL}/solicitacoes/1`, {
      data: { status: 'Qualquer' },
      headers: { 'Authorization': token }
    });
    expect(res.status()).toBe(400);
  });

});
