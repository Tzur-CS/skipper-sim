import { defineConfig, devices } from '@playwright/test';

// NOTE: runs Chromium with iPhone viewport/touch emulation. This is NOT WebKit/Safari and
// NOT a physical iOS device. See README "Testing" for what was and was not verified.
export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 120_000,
  fullyParallel: false,
  reporter: [['list']],
  use: {
    baseURL: 'http://localhost:4173',
    trace: 'off',
    launchOptions: { args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] },
  },
  projects: [
    { name: 'iphone-landscape', use: { ...devices['iPhone 13 landscape'], browserName: 'chromium' } },
    { name: 'ipad-landscape', use: { ...devices['iPad (gen 7) landscape'], browserName: 'chromium' } },
  ],
  webServer: { command: 'npx vite preview --port 4173 --strictPort', port: 4173, reuseExistingServer: true },
});
