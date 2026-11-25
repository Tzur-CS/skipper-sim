const { chromium, devices } = require('playwright');
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const ctx = await b.newContext({ ...devices['iPhone 13 landscape'] });
  const p = await ctx.newPage();
  const logs = [];
  p.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') logs.push(m.type() + ': ' + m.text()); });
  p.on('pageerror', (e) => logs.push('pageerror: ' + e.message));
  await p.goto('http://localhost:4173/');
  await p.waitForTimeout(800);
  await p.screenshot({ path: 'screenshots/' + (process.argv[2]||'x') + '-home.png' });
  await p.click('[data-testid=home-free]');
  await p.waitForTimeout(4000);
  await p.screenshot({ path: 'screenshots/' + (process.argv[2]||'x') + '-free.png' });
  console.log(logs.join('\n'));
  await b.close();
})();
