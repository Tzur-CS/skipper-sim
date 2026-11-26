import { expect, test, type Page } from '@playwright/test';

function collectErrors(page: Page) {
  const errors: string[] = [];
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text());
  });
  page.on('pageerror', (e) => errors.push(e.message));
  return errors;
}

async function start(page: Page, id: string, variant?: string) {
  await page.goto('/');
  await page.getByTestId('home-training').click();
  if (variant) await page.getByTestId(`variant-${id}-${variant}`).click();
  await page.getByTestId(`start-${id}`).click();
  await expect(page.getByTestId('sim-screen')).toBeVisible();
}

test('leaving the marina: throttle lever drives the boat, chart and pontoons shown', async ({ page }, info) => {
  const errors = collectErrors(page);
  await start(page, 'leaveMarina');
  await expect(page.getByTestId('throttle-label')).toHaveText('ניוטרל');
  await expect(page.getByTestId('minichart')).toBeVisible();
  await page.getByTestId('throttle-up').click();
  await expect(page.getByTestId('throttle-label')).toHaveText('איטי');
  // Software WebGL renders slowly, so the simulation may run slower than real time: poll.
  await expect.poll(() => page.evaluate(() => window.__sim!.engine.state.boat.speed), { timeout: 40_000 }).toBeGreaterThan(0.8);
  // Guided step 1 (engine ahead) is done.
  await expect.poll(() => page.evaluate(() => window.__sim!.runtime.evaluator!.stepStatus[0]), { timeout: 10_000 }).toBe('done');
  await page.screenshot({ path: `screenshots/e2e-${info.project.name}-leave-marina.png` });
  await page.getByTestId('throttle-neutral').click();
  await expect(page.getByTestId('throttle-label')).toHaveText('ניוטרל');
  expect(errors).toEqual([]);
});

test('night lights: identification question, answer and feedback', async ({ page }, info) => {
  const errors = collectErrors(page);
  await start(page, 'nightLights');
  await expect(page.getByTestId('question')).toBeVisible();
  await page.screenshot({ path: `screenshots/e2e-${info.project.name}-night-question.png` });
  await page.getByTestId('answer-masthead').click();
  await expect(page.getByTestId('question-feedback')).toContainText('לא נכון');
  await expect(page.getByTestId('question-feedback')).toContainText('תקנה 25');
  expect(await page.evaluate(() => window.__sim!.runtime.evaluator!.errors.map((e) => e.ruleId))).toContain('wrongAnswer');
  await page.getByText('סגור').click();
  // The next question (vessel ahead) follows.
  await expect(page.getByTestId('question')).toContainText('אור לבן גבוה');
  expect(errors).toEqual([]);
});
