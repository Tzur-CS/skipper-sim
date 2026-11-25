import { expect, test, type Page } from '@playwright/test';

function collectErrors(page: Page) {
  const errors: string[] = [];
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text());
  });
  page.on('pageerror', (e) => errors.push(e.message));
  return errors;
}

/** Simple autopilot executed in the page: hold a signed true wind angle until the results screen. */
async function holdTwaUntilResults(page: Page, twa: number) {
  await page.evaluate(
    (target) =>
      new Promise<void>((resolve) => {
        const e = window.__sim!.engine;
        const id = setInterval(() => {
          const s = e.state;
          const desired = s.wind.trueFrom - target;
          const err = ((desired - s.boat.heading + 540) % 360) - 180;
          e.setHelm(Math.max(-1, Math.min(1, err / 12 - s.boat.yawRate * 0.08)));
          if (!document.querySelector('[data-testid=sim-screen]')) {
            clearInterval(id);
            resolve();
          }
        }, 50);
        setTimeout(() => {
          clearInterval(id);
          resolve();
        }, 90_000);
      }),
    twa,
  );
}

test('home screen in Hebrew RTL, start free sailing in one tap', async ({ page }, info) => {
  const errors = collectErrors(page);
  await page.goto('/');
  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
  await expect(page.getByTestId('home')).toContainText('הפלגה חופשית');
  await page.screenshot({ path: `screenshots/e2e-${info.project.name}-home.png` });
  await page.getByTestId('home-free').click();
  await expect(page.getByTestId('sim-screen')).toBeVisible();
  await expect(page.locator('canvas')).toBeVisible();
  await page.waitForTimeout(1500);
  // simulation is running: time advances and the boat moves
  const t0 = await page.evaluate(() => window.__sim!.engine.state.t);
  await page.waitForTimeout(1000);
  const t1 = await page.evaluate(() => window.__sim!.engine.state.t);
  expect(t1).toBeGreaterThan(t0 + 0.3);
  // steering by touch on the wheel buttons turns the boat
  const h0 = await page.evaluate(() => window.__sim!.engine.state.boat.heading);
  await page.getByTestId('helm-stbd').dispatchEvent('pointerdown');
  await page.waitForTimeout(600);
  await page.getByTestId('helm-stbd').dispatchEvent('pointerup');
  // wait in simulated time (software WebGL in CI can render slowly)
  const tStart = await page.evaluate(() => window.__sim!.engine.state.t);
  await page.waitForFunction((t) => window.__sim!.engine.state.t > t + 4, tStart, { timeout: 60_000 });
  const st = await page.evaluate(() => ({ h: window.__sim!.engine.state.boat.heading, helm: window.__sim!.engine.state.input.helm }));
  expect(st.helm).toBeGreaterThan(0);
  expect(((st.h - h0 + 540) % 360) - 180).toBeGreaterThan(2);
  // real-time wind change
  await page.getByTestId('wind-speed').fill('20');
  expect(await page.evaluate(() => window.__sim!.engine.state.wind.trueSpeed)).toBe(20);
  await page.screenshot({ path: `screenshots/e2e-${info.project.name}-free.png` });
  // camera modes
  await page.getByTestId('cam-cycle').click();
  await page.waitForTimeout(800);
  await page.screenshot({ path: `screenshots/e2e-${info.project.name}-chase.png` });
  await page.getByTestId('cam-cycle').click();
  await page.waitForTimeout(800);
  await page.screenshot({ path: `screenshots/e2e-${info.project.name}-top.png` });
  expect(errors).toEqual([]);
});

test('guided tack scenario: commands, physical tack, results screen', async ({ page }, info) => {
  const errors = collectErrors(page);
  await page.goto('/');
  await page.getByTestId('home-training').click();
  await page.screenshot({ path: `screenshots/e2e-${info.project.name}-select.png` });
  await page.getByTestId('start-tack').click();
  await expect(page.getByTestId('guided-step')).toContainText('הכן את הצוות');
  await expect(page.getByTestId('cmd-prepareTack')).toHaveClass(/hl/);
  await page.screenshot({ path: `screenshots/e2e-${info.project.name}-tack-guided.png` });
  await page.getByTestId('cmd-prepareTack').click();
  await expect(page.getByTestId('crew-ack')).toContainText(/מוכן|מתכונן/);
  await page.waitForTimeout(3000);
  await page.getByTestId('cmd-tack').click();
  await page.evaluate(() => window.__sim!.engine.setHelm(0.7));
  await expect(page.getByTestId('tack')).toHaveText('מפנה שמאלי', { timeout: 20_000 });
  await holdTwaUntilResults(page, -45);
  await expect(page.getByTestId('results')).toBeVisible();
  await expect(page.getByTestId('result-status')).toHaveText('הצלחה');
  await expect(page.getByTestId('timeline')).toContainText('החלפת מפנה');
  await page.screenshot({ path: `screenshots/e2e-${info.project.name}-results.png`, fullPage: true });
  // progress is stored locally
  const stored = await page.evaluate(() => localStorage.getItem('skipperSim.history.v1'));
  expect(stored).toContain('"scenarioId":"tack"');
  expect(errors).toEqual([]);
});

test('practice gybe without centring the main: uncontrolled gybe warning and errors in results', async ({ page }, info) => {
  const errors = collectErrors(page);
  await page.goto('/');
  await page.getByTestId('home-training').click();
  await page.getByTestId('mode-practice').click();
  await page.getByTestId('start-gybe').click();
  await page.waitForTimeout(500);
  await page.evaluate(() => window.__sim!.engine.setHelm(-0.45));
  await page.waitForFunction(() => window.__sim!.engine.events.some((e) => e.type === 'uncontrolledGybe'), null, { timeout: 60_000 });
  await expect(page.getByTestId('warning')).toBeVisible();
  await page.screenshot({ path: `screenshots/e2e-${info.project.name}-gybe-warning.png` });
  await expect(page.getByTestId('error-toast')).toBeVisible();
  await page.getByTestId('btn-finish').click();
  await expect(page.getByTestId('results')).toBeVisible();
  await expect(page.getByTestId('errors')).toContainText('מהפך לא מבוקר');
  expect(errors).toEqual([]);
});

test('English UI switch and manual line controls', async ({ page }) => {
  const errors = collectErrors(page);
  await page.goto('/');
  await page.getByTestId('home-settings').click();
  await page.getByTestId('lang-en').click();
  await expect(page.locator('html')).toHaveAttribute('dir', 'ltr');
  await page.getByTestId('settings-back').click();
  await page.getByTestId('home-free').click();
  await page.getByTestId('tab-lines').click();
  const before = await page.evaluate(() => window.__sim!.engine.state.main.sheet);
  const btn = page.getByTestId('line-mainsheet-out');
  await btn.dispatchEvent('pointerdown');
  await page.waitForTimeout(800);
  await btn.dispatchEvent('pointerup');
  const after = await page.evaluate(() => window.__sim!.engine.state.main.sheet);
  expect(after).toBeLessThan(before - 0.1);
  await expect(page.getByTestId('instruments')).toContainText('Boat speed');
  // reset language for other tests
  await page.evaluate(() => localStorage.clear());
  expect(errors).toEqual([]);
});
