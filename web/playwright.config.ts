import { defineConfig } from '@playwright/test'

// replay: the static Replay build with the real exported results (no server).
// live-fake: the live edition against a fake server (page.route), so no credits are ever spent.
export default defineConfig({
  testDir: './e2e',
  timeout: 90_000,
  reporter: [['list']],
  webServer: [
    {
      command: 'npm run build:replay && npx vite preview --port 4173 --strictPort',
      url: 'http://localhost:4173',
      reuseExistingServer: true,
      timeout: 180_000,
    },
    { command: 'npx vite --mode live --port 5174 --strictPort', url: 'http://localhost:5174', reuseExistingServer: true, timeout: 120_000 },
  ],
  projects: [
    { name: 'replay', testMatch: /replay\..*spec\.ts/, use: { browserName: 'chromium', baseURL: 'http://localhost:4173' } },
    { name: 'live-fake', testMatch: /live\..*spec\.ts/, use: { browserName: 'chromium', baseURL: 'http://localhost:5174' } },
  ],
})
