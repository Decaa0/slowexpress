import { test, expect } from '@playwright/test';
import { PrismaClient } from '../../server/node_modules/@prisma/client/index.js';

// Use only the fresh database created by playwright.config.ts.
test('TEST-29 / AC-29: guest customizes, orders, staff accepts', async ({ page, browser }) => {
  const db = new PrismaClient();
  const table = await db.diningTable.findFirstOrThrow({ where: { label: 'SE-1', active: true } });
  await db.$disconnect();
  await page.goto(`/t/${table.code}`);
  await page.getByRole('button', { name: 'drink Peach Oolong', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog.getByTestId('layer-cream-cheese')).toHaveCount(0);
  await dialog.getByRole('button', { name: 'topping Cream Cheese', exact: true }).dragTo(dialog.getByTestId('cup-drop'));
  await expect(dialog.getByTestId('layer-cream-cheese')).toBeVisible();
  await expect(dialog.getByRole('button', { name: 'topping Cream Cheese', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await dialog.getByRole('button', { name: 'Add to cart' }).click();
  await page.getByLabel('call name').fill('AC29 Guest');
  const placed = page.waitForResponse(r => r.url().endsWith('/api/orders') && r.request().method() === 'POST');
  await page.getByRole('button', { name: 'Place order', exact: true }).click();
  const response = await placed;
  expect(response.status()).toBe(201);
  const order = await response.json();
  expect(order.status).toBe('PLACED');
  expect(order.totalCents).toBe(7000);
  expect(order.items[0].toppings[0].toppingName).toBe('Cream Cheese');
  await expect(page.getByTestId('server-total')).toContainText(`฿${order.totalCents / 100}`);
  await expect(page.getByTestId(`order-${order.id}`).getByTestId('status')).toHaveText('PLACED');

  // Separate context proves staff uses its own authenticated session.
  const staffContext = await browser.newContext();
  try {
    const staff = await staffContext.newPage();
    await staff.goto('http://127.0.0.1:5175/staff');
    await staff.getByLabel('email', { exact: true }).fill('slow@demo.test');
    // Synthetic seed password from the environment, not a real user credential.
    await staff.getByLabel('password', { exact: true }).fill(process.env.DEMO_PASSWORD!);
    await staff.getByRole('button', { name: 'Sign in', exact: true }).click();
    const card = staff.getByTestId(`order-${order.id}`);
    await expect(card).toContainText('AC29 Guest');
    await expect(card.getByTestId('status')).toHaveText('PLACED');
    const accepted = staff.waitForResponse(r => r.url().endsWith(`/api/orders/${order.id}/accept`) && r.request().method() === 'POST');
    await card.getByRole('button', { name: 'Accept', exact: true }).click();
    expect((await accepted).ok()).toBeTruthy();
    await expect(card.getByTestId('status')).toHaveText('ACCEPTED');
    await expect(page.getByTestId(`order-${order.id}`).getByTestId('status')).toHaveText('ACCEPTED', { timeout: 15000 });
  } finally {
    await staffContext.close();
  }
});
