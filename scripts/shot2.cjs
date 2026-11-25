const { chromium, devices } = require('playwright');
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const ctx = await b.newContext({ ...devices['iPhone 13 landscape'] });
  const p = await ctx.newPage();
  const logs = [];
  p.on('console', (m) => { if (m.type() === 'error') logs.push(m.text()); });
  p.on('pageerror', (e) => logs.push('pageerror: ' + e.message));
  await p.goto('http://localhost:4173/');
  await p.click('[data-testid=home-training]');
  await p.screenshot({ path: 'screenshots/c-select.png' });
  await p.click('[data-testid=start-tack]');
  await p.waitForTimeout(2500);
  await p.screenshot({ path: 'screenshots/c-tack.png' });
  await p.click('[data-testid=cmd-prepareTack]');
  await p.waitForTimeout(3000);
  await p.click('[data-testid=cmd-tack]');
  await p.evaluate(() => window.__sim.engine.setHelm(0.7));
  await p.waitForTimeout(5000);
  await p.click('[data-testid=cam-cycle]');
  await p.waitForTimeout(1500);
  await p.screenshot({ path: 'screenshots/c-chase.png' });
  // hold -45 until finished
  await p.evaluate(() => new Promise((res) => {
    const e = window.__sim.engine;
    const id = setInterval(() => {
      const s = e.state; const desired = s.wind.trueFrom + 45; let err = ((desired - s.boat.heading + 540) % 360) - 180;
      e.setHelm(Math.max(-1, Math.min(1, err / 12 - s.boat.yawRate * 0.08)));
      if (!document.querySelector('[data-testid=sim-screen]')) { clearInterval(id); res(); }
    }, 50);
    setTimeout(() => { clearInterval(id); res(); }, 60000);
  }));
  await p.waitForTimeout(800);
  await p.screenshot({ path: 'screenshots/c-results.png', fullPage: true });
  console.log(logs.join('\n') || 'no console errors');
  await b.close();
})();
