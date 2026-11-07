import { test } from '@playwright/test';

const BASE_URL = 'http://localhost:19006';
const API_URL = 'http://localhost:8000';

test('Verify all banner elements', async ({ page, context, request }) => {
  // Login
  const loginResponse = await request.post(`${API_URL}/api/usuarios/login-proveedor/`, {
    data: { username: 'test_taller', password: 'test123' }
  });
  const authData = await loginResponse.json();

  // Setup context
  await context.addInitScript(({token, user, apiUrl}) => {
    localStorage.setItem('FORCE_LOCAL_API', 'true');
    localStorage.setItem('LOCAL_API_URL', apiUrl);
    localStorage.setItem('authToken', token);
    localStorage.setItem('userData', JSON.stringify(user));
  }, { token: authData.token, user: authData.user, apiUrl: `${API_URL}/api` });

  // Load order
  await page.goto(`${BASE_URL}/orden-detalle/1`);
  await page.waitForTimeout(5000);

  console.log('\\n=== Searching for Banner Elements ===');

  // Check for various possible button texts
  const searches = [
    'Próximos pasos',
    'pasos',
    'Asignar Técnico',
    'Asignar',
    'Técnico',
    'técnico',
    'Iniciar Servicio',
    'Iniciar',
    'sin Técnico'
  ];

  for (const search of searches) {
    const count = await page.locator(`text=${search}`).count();
    if (count > 0) {
      console.log(`  ✓ "${search}" - found ${count} time(s)`);
    }
  }

  // Get full page text to see what we have
  const bodyText = await page.textContent('body');
  
  // Search for key phrases
  const keyPhrases = [
    'Próximos pasos',
    'Asigna un técnico',
    '1. Asigna',
    '2. Inicia',
    'Listo para iniciar'
  ];

  console.log('\\n=== Key Phrases in Page ===');
  for (const phrase of keyPhrases) {
    const found = bodyText?.includes(phrase);
    console.log(`  ${found ? '✓' : '✗'} "${phrase}"`);
  }

  // Take annotated screenshot
  await page.screenshot({ 
    path: '/opt/cursor/artifacts/BANNER-ELEMENTS-CHECK.png',
    fullPage: true 
  });

  console.log('\\n📸 Screenshot: BANNER-ELEMENTS-CHECK.png');
});
