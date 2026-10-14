import { expect, test } from '@playwright/test';

test.beforeEach(async ({ request }) => {
  await request.post('/api/reset');
});

test('advanced victim journey preserves observed, inferred, and simulated boundaries', async ({ page }) => {
  const contactedOrigins = new Set<string>();
  page.on('request', (request) => contactedOrigins.add(new URL(request.url()).origin));

  await page.goto('/presentation');
  await expect(page.getByText('TRAINING ENVIRONMENT')).toBeVisible();
  await page.getByLabel('Fictional recipient').selectOption('demo-002');
  await page.getByTestId('open-email').click();
  await page.getByTestId('inspect-sender').click();
  await page.getByTestId('inspect-link').click();
  await page.getByTestId('open-training-link').click();
  await expect(page.getByTestId('leak-item-ip')).toBeVisible();
  await expect(page.getByTestId('request-overview')).toContainText('recipient=demo-002');

  await page.getByRole('button', { name: 'Browser APIs', exact: true }).click();
  await expect(page.getByTestId('browser-information-exposure')).toContainText('Browser Information Exposure');
  await expect(page.getByTestId('leak-item-platform')).toHaveCount(0);
  await page.getByTestId('transmit-browser-properties').click();
  await expect(page.getByTestId('leak-item-platform')).toBeVisible();

  await page.getByRole('button', { name: 'Identity link' }).click();
  await expect(page.getByTestId('identity-correlation')).toContainText('Jordan Example');
  await expect(page.getByTestId('identity-correlation')).toContainText('Not proven');

  await page.getByRole('button', { name: 'Form' }).click();
  await expect(page.getByLabel('Fictional employee name')).toHaveValue('Jordan Example');
  await page.getByTestId('submit-training-data').click();
  await expect(page.getByTestId('leak-item-form-code')).toBeVisible();
  await expect(page.getByTestId('training-feedback')).toContainText('received exactly what you submitted');

  await page.getByRole('button', { name: 'Continue to security boundary' }).click();
  await expect(page.getByTestId('browser-compromise-simulation')).toContainText('cannot simply read private documents');
  await page.getByTestId('simulate-boundary-failure').click();
  await expect(page.getByTestId('leak-item-document')).toBeVisible();
  await expect(page.getByTestId('browser-compromise-simulation')).toContainText('company-strategy-demo.txt');
  await expect(page.getByTestId('browser-compromise-simulation')).toContainText('FICTIONAL SESSION');

  await page.getByRole('button', { name: 'Defense' }).click();
  await expect(page.getByTestId('defense-module')).toContainText('Managed patching');
  await expect(page.getByTestId('attacker-access-list')).toContainText('recebido');
  await expect(page.getByTestId('attacker-access-list')).toContainText('já conhecido');
  await expect(page.getByTestId('attacker-access-list')).toContainText('simulado');
  expect([...contactedOrigins]).toEqual(['http://127.0.0.1:3000']);
});

test('scenario selection and reset remain synchronized', async ({ page }) => {
  await page.goto('/presentation');
  await page.getByLabel('Active scenario').selectOption('supplier');
  await page.getByLabel('Fictional recipient').selectOption('demo-003');
  await expect(page.getByLabel('Active scenario')).toHaveValue('supplier');
  await expect(page.getByText('Supplier profile must be confirmed before next invoice', { exact: true })).toBeVisible();
  await page.getByTestId('open-email').click();
  await expect(page.getByTestId('inspect-sender')).toContainText('to Taylor Example');
  await page.getByLabel('Reset simulation').click();
  await expect(page.getByTestId('attacker-access-list')).toContainText('Aguardando o clique da vítima');
  await expect(page.locator('[data-testid^="leak-item-"]')).toHaveCount(1);
  await expect(page.getByRole('heading', { name: 'Select the unread message' })).toBeVisible();
  await expect(page.getByLabel('Active scenario')).toHaveValue('benefits');
  await expect(page.getByLabel('Fictional recipient')).toHaveValue('demo-001');
});

test('sophisticated attack mode builds a non-technical attacker dossier in real time', async ({ page }) => {
  await page.goto('/presentation');
  await expect(page.getByRole('button', { name: 'Guiado', exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'Ataque sofisticado', exact: true }).click();
  await expect(page.getByTestId('attacker-access-list')).toContainText('Informações disponíveis agora');
  await expect(page.getByTestId('leak-item-identity')).toContainText('Alex Example');

  await page.getByTestId('run-sophisticated-demo').click();
  await expect(page.getByTestId('attacker-access-list')).toContainText('Lista completa da demonstração', { timeout: 12_000 });
  await expect(page.locator('[data-testid^="leak-item-"]')).toHaveCount(15);
  await expect(page.getByTestId('leak-item-ip')).toContainText('127.0.0.1');
  await expect(page.getByTestId('leak-item-form-code')).toContainText('DEMO-1234');
  await expect(page.getByTestId('leak-item-document')).toContainText('company-strategy-demo.txt');
  await expect(page.getByTestId('attacker-access-list')).toContainText('Nenhum arquivo, cookie ou sessão real foi acessado');
  await expect(page.getByTestId('sophisticated-demo-guide')).toContainText('Demonstração concluída');
});

test('observer prioritizes readable exposure information without technical clutter', async ({ page }) => {
  await page.goto('/attacker');
  await expect(page.getByRole('heading', { name: 'O que o atacante sabe agora' })).toBeVisible();
  await expect(page.getByTestId('attacker-access-list')).toBeVisible();
  await expect(page.getByTestId('observer-summary')).toContainText('Nem tudo veio do clique');
  await expect(page.getByTestId('leak-item-identity')).toContainText('Alex Example');
  await expect(page.getByRole('button', { name: 'Linha do tempo' })).toHaveCount(0);
  await expect(page.getByText('Detalhes da evidência')).toHaveCount(0);
});
