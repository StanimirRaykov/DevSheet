import { defineConfig, devices } from "@playwright/test";

/**
 * End-to-end tests. They start their own API (Testing environment, stubbed GitHub, its own database) and their own
 * production build of the web app on other ports, so a running dev setup is never touched.
 *
 *   npx playwright test            (needs PostgreSQL on localhost:5432 and Mailpit on 1025/8025, as for development:
 *                                   docker compose up -d db mailpit)
 *   npx playwright test --ui       (watch and debug)
 */
const API_PORT = 5317;
const WEB_PORT = 3100;
const API = `http://localhost:${API_PORT}`;
const WEB = `http://localhost:${WEB_PORT}`;
const DATABASE =
  process.env.E2E_DATABASE ?? "Host=localhost;Port=5432;Database=devsheet_e2e;Username=devsheet;Password=devsheet";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : [["list"]],
  use: {
    baseURL: WEB,
    trace: "retain-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: [
    {
      name: "api",
      // Migrate and seed (skills, the demo page), then serve. --no-launch-profile: launchSettings would force Development.
      command:
        "dotnet run --project ../api/src/DevSheet.Api --no-launch-profile -- --migrate && " +
        "dotnet run --project ../api/src/DevSheet.Api --no-launch-profile --no-build",
      url: `${API}/health`,
      env: {
        ASPNETCORE_ENVIRONMENT: "Testing",
        ASPNETCORE_URLS: API,
        ConnectionStrings__Default: DATABASE,
        WebOrigin: WEB,
        Testing__StubGitHub: "true",
        // Account emails go over SMTP to Mailpit (the appsettings default, localhost:1025); tests read the links there.
        // Every test signs up from the same address, so the per-IP limits are raised; the per-email ones stay.
        Auth__RateLimits__SignInsPerIpPerMinute: "1000",
        Auth__RateLimits__EmailsPerIpPerHour: "1000",
      },
      reuseExistingServer: !process.env.CI,
      timeout: 240_000,
      stdout: "ignore",
      stderr: "pipe",
    },
    {
      name: "web",
      command: `npm run build && npx next start -p ${WEB_PORT}`,
      url: WEB,
      env: {
        NEXT_PUBLIC_API_URL: API,
        API_URL: API,
        SITE_URL: WEB,
        NEXT_DIST_DIR: ".next-e2e",
      },
      reuseExistingServer: !process.env.CI,
      timeout: 300_000,
      stdout: "ignore",
      stderr: "pipe",
    },
  ],
});
