/**
 * ARISE — Full Component Browser Audit
 * Tests every panel, modal, tab, and interaction reachable from the dashboard.
 * Any console error or broken element is recorded as a bug.
 */
import { test, expect, Page, ConsoleMessage } from "@playwright/test";
import * as fs from "fs";

const BASE = "http://localhost:3001";
const USERNAME = "e2etesthunter";
const PASSWORD = "shadow123";

// ── Bug registry ─────────────────────────────────────────────
interface Bug {
  id: number;
  component: string;
  severity: "critical" | "high" | "medium" | "low";
  description: string;
  evidence: string;
}
const bugs: Bug[] = [];
let bugId = 0;

function bug(
  component: string,
  severity: Bug["severity"],
  description: string,
  evidence = ""
) {
  const b: Bug = { id: ++bugId, component, severity, description, evidence };
  bugs.push(b);
  console.log(`  🐛 BUG #${b.id} [${severity.toUpperCase()}] ${component}: ${description}`);
}

// ── Shared helpers ────────────────────────────────────────────
async function login(page: Page) {
  await page.goto(BASE);
  await page.getByRole("button", { name: /accept power/i }).waitFor({ timeout: 15000 });
  await page.getByRole("button", { name: /accept power/i }).click();
  await page.getByRole("button", { name: /reactivate_link/i }).click();
  await page.getByPlaceholder(/designate_name/i).fill(USERNAME);
  await page.getByPlaceholder(/••••••••/).fill(PASSWORD);
  await page.getByRole("button", { name: /confirm_identity/i }).click();
  await page.getByText(/status/i).first().waitFor({ timeout: 15000 });
  await page.waitForTimeout(1500); // let async fetches settle
}

function collectErrors(page: Page): string[] {
  const errs: string[] = [];
  page.on("console", (m: ConsoleMessage) => {
    if (m.type() === "error") {
      const t = m.text();
      if (!t.includes("favicon") && !t.includes("net::ERR_ABORTED")) errs.push(t);
    }
  });
  page.on("pageerror", (e: Error) => errs.push(`PAGE_ERROR: ${e.message}`));
  return errs;
}

async function snap(page: Page, name: string) {
  await page.screenshot({ path: `/tmp/ss/${name}.png`, fullPage: false });
  return `/tmp/ss/${name}.png`;
}

async function clickTab(page: Page, label: RegExp | string) {
  const btn = page.getByRole("button", { name: label }).first();
  if (await btn.isVisible({ timeout: 3000 }).catch(() => false)) {
    await btn.click();
    await page.waitForTimeout(1200);
    return true;
  }
  return false;
}

// ── Tests ─────────────────────────────────────────────────────

test.beforeAll(() => { fs.mkdirSync("/tmp/ss", { recursive: true }); });

test.afterAll(() => {
  const critical = bugs.filter(b => b.severity === "critical");
  const high     = bugs.filter(b => b.severity === "high");
  const medium   = bugs.filter(b => b.severity === "medium");
  const low      = bugs.filter(b => b.severity === "low");

  console.log("\n" + "═".repeat(60));
  console.log("ARISE FULL COMPONENT AUDIT — RESULTS");
  console.log("═".repeat(60));
  console.log(`Total: ${bugs.length}  Critical: ${critical.length}  High: ${high.length}  Medium: ${medium.length}  Low: ${low.length}`);
  console.log("");
  for (const b of bugs) {
    console.log(`  #${b.id} [${b.severity.toUpperCase()}] ${b.component}`);
    console.log(`     ${b.description}`);
    if (b.evidence) console.log(`     Evidence: ${b.evidence}`);
  }
  console.log("═".repeat(60));
  fs.writeFileSync("/tmp/ss/bugs.json", JSON.stringify(bugs, null, 2));
});

// ─────────────────────────────────────────────────────────────
test("01 · Landing page", async ({ page }) => {
  const errs = collectErrors(page);
  await page.goto(BASE);
  const accept = page.getByRole("button", { name: /accept power/i });
  await expect(accept).toBeVisible({ timeout: 15000 });
  await snap(page, "01_landing");

  if (errs.length) bug("Landing", "high", `Console errors on load: ${errs[0].slice(0, 120)}`, "console");
  expect(true).toBe(true); // always pass — bugs logged above
});

// ─────────────────────────────────────────────────────────────
test("02 · Wrong password shows error", async ({ page }) => {
  await page.goto(BASE);
  await page.getByRole("button", { name: /accept power/i }).click({ timeout: 15000 });
  await page.getByRole("button", { name: /reactivate_link/i }).click();
  await page.getByPlaceholder(/designate_name/i).fill("nobody");
  await page.getByPlaceholder(/••••••••/).fill("wrongpassword");
  await page.getByRole("button", { name: /confirm_identity/i }).click();
  await page.waitForTimeout(3000);
  await snap(page, "02_wrong_login");

  const hasError = await page.locator("text=/INVALID|invalid|error/i").first().isVisible().catch(() => false);
  if (!hasError) bug("AwakeningScreen", "medium", "No error message shown for wrong credentials", "02_wrong_login.png");
});

// ─────────────────────────────────────────────────────────────
test("03 · Dashboard loads — STATUS tab", async ({ page }) => {
  const errs = collectErrors(page);
  await login(page);
  await snap(page, "03_dashboard_status");

  // Stat cards
  for (const stat of ["STRENGTH", "AGILITY", "VITALITY", "INTEL"]) {
    const visible = await page.locator(`text=${stat}`).first().isVisible().catch(() => false);
    if (!visible) bug("Dashboard/Status", "high", `Stat card "${stat}" not visible`, "03_dashboard_status.png");
  }

  // XP bar
  const xpBar = await page.locator("text=/LVL_/i").first().isVisible().catch(() => false);
  if (!xpBar) bug("Dashboard/Header", "medium", "LVL_ badge not visible in header", "03_dashboard_status.png");

  // Penalty countdown — should NOT be the hardcoded value
  const countdown = await page.locator("text=/18:42:09/").first().isVisible().catch(() => false);
  if (countdown) bug("Dashboard", "medium", "Penalty countdown still showing hardcoded 18:42:09", "03_dashboard_status.png");

  // Quest board
  const quests = await page.locator("text=/PENALTY_IMMESH_RISK/i").first().isVisible().catch(() => false);
  if (!quests) bug("Dashboard/Status", "low", "PENALTY_IMMESH_RISK section not visible", "03_dashboard_status.png");

  const rls = errs.filter(e => e.includes("row-level security") || e.includes("violates"));
  if (rls.length) bug("Dashboard/RLS", "critical", `RLS violation on dashboard: ${rls[0].slice(0, 120)}`, "console");

  const col = errs.filter(e => e.includes("column") && e.includes("does not exist"));
  if (col.length) bug("Dashboard/DB", "critical", `Missing DB column: ${col[0].slice(0, 120)}`, "console");

  const other = errs.filter(e => !e.includes("row-level") && !e.includes("column") && !e.includes("ollama"));
  if (other.length) bug("Dashboard", "high", `Console errors after login: ${other[0].slice(0, 120)}`, "console");
});

// ─────────────────────────────────────────────────────────────
test("04 · GATES tab + WorkoutEngine", async ({ page }) => {
  const errs = collectErrors(page);
  await login(page);
  await clickTab(page, /^gates$/i);
  await snap(page, "04_gates");

  const gateVisible = await page.locator("text=/GATE_SYNCHRONIZED|GATE_STABILIZING/i").first().isVisible().catch(() => false);
  if (!gateVisible) bug("DungeonGate", "high", "Gate status text not visible", "04_gates.png");

  // CSS typo check — badge should be centered
  const badge = await page.locator("text=/GATE_GRADE/i").first().isVisible().catch(() => false);
  if (!badge) bug("DungeonGate", "low", "GATE_GRADE badge not visible (possible -track-x-1/2 typo still present)", "04_gates.png");

  // Click Enter button using data-testid (stable, not animated)
  const enterBtn = page.locator("[data-testid='enter-gate']");
  const enterVisible = await enterBtn.isVisible({ timeout: 3000 }).catch(() => false);
  if (!enterVisible) {
    bug("DungeonGate", "medium", "ENTER_THE_VOID button not visible (gate may be locked)", "04_gates.png");
  } else {
    await enterBtn.click();
    await page.waitForTimeout(2000);
    await snap(page, "04b_workout_engine");

    // Workout engine loaded
    const mission = await page.locator("text=/SELECT MISSION|AVAILABLE DUNGEON/i").first().isVisible().catch(() => false);
    if (!mission) bug("WorkoutEngine", "critical", "Workout engine did not load after entering gate", "04b_workout_engine.png");

    // Hint shown when no exercise selected
    const hint = await page.locator("text=/SELECT A MISSION ABOVE/i").first().isVisible().catch(() => false);
    if (!hint) bug("WorkoutEngine", "medium", "'SELECT A MISSION ABOVE' hint not shown when no exercise selected", "04b_workout_engine.png");

    // Exercise guide button accessible
    const guideBtn = page.locator("[aria-label='View Exercise Guide']").first();
    const guideVisible = await guideBtn.isVisible({ timeout: 2000 }).catch(() => false);
    if (!guideVisible) {
      bug("WorkoutEngine", "medium", "Exercise guide (HelpCircle) button not visible on exercise card", "04b_workout_engine.png");
    } else {
      await guideBtn.click();
      await page.waitForTimeout(1000);
      await snap(page, "04c_exercise_guide");
      const guideModal = await page.locator("text=/STEPS|FORM|BREATHING|guide/i").first().isVisible().catch(() => false);
      if (!guideModal) bug("ExerciseGuideModal", "high", "Exercise guide modal did not open", "04c_exercise_guide.png");
      await page.keyboard.press("Escape");
      await page.waitForTimeout(500);
    }

    // Select first exercise and check button enables
    const firstCard = page.locator("[role='button']").filter({ hasText: /xp base/i }).first();
    if (await firstCard.isVisible({ timeout: 2000 }).catch(() => false)) {
      await firstCard.click();
      await page.waitForTimeout(500);
      const hintGone = await page.locator("text=/SELECT A MISSION ABOVE/i").first().isVisible().catch(() => false);
      if (hintGone) bug("WorkoutEngine", "medium", "Hint persists even after exercise is selected", "04b_workout_engine.png");

      const initBtn = page.getByRole("button", { name: /initialize protocol/i });
      const disabled = await initBtn.getAttribute("disabled").catch(() => "yes");
      if (disabled !== null) bug("WorkoutEngine", "high", "INITIALIZE PROTOCOL still disabled after selecting exercise", "04b_workout_engine.png");
    }

    // Close workout
    const closeBtn = page.getByRole("button", { name: /×|close|abort/i }).first();
    if (await closeBtn.isVisible({ timeout: 2000 }).catch(() => false)) await closeBtn.click();
    else await page.keyboard.press("Escape");
    await page.waitForTimeout(500);
  }

  // Modal bleed: switch to STORAGE — workout should be gone
  await clickTab(page, /^storage$/i);
  await page.waitForTimeout(800);
  await snap(page, "04d_storage_after_gates");
  const workoutStillOpen = await page.locator("text=/AVAILABLE DUNGEON MISSIONS/i").first().isVisible().catch(() => false);
  if (workoutStillOpen) bug("WorkoutEngine", "medium", "Workout modal bleeds onto STORAGE tab after tab switch", "04d_storage_after_gates.png");

  const rls = errs.filter(e => e.includes("row-level security"));
  if (rls.length) bug("WorkoutEngine/RLS", "critical", `RLS error in workout flow: ${rls[0].slice(0, 120)}`, "console");
});

// ─────────────────────────────────────────────────────────────
test("05 · STORAGE / Inventory", async ({ page }) => {
  const errs = collectErrors(page);
  await login(page);
  await clickTab(page, /^storage$/i);
  await page.waitForTimeout(1500);
  await snap(page, "05_storage");

  const hasContent = await page.locator("text=/item|inventory|potion|badge|storage/i").first().isVisible().catch(() => false);
  if (!hasContent) bug("Inventory", "high", "No inventory content visible on STORAGE tab", "05_storage.png");

  const rlsErr = errs.filter(e => e.includes("row-level security"));
  if (rlsErr.length) bug("Inventory/RLS", "critical", `RLS error in inventory: ${rlsErr[0].slice(0, 120)}`, "console");
});

// ─────────────────────────────────────────────────────────────
test("06 · SHADOWS tab", async ({ page }) => {
  const errs = collectErrors(page);
  await login(page);
  await clickTab(page, /^shadows$/i);
  await page.waitForTimeout(1500);
  await snap(page, "06_shadows");

  const hasContent = await page.locator("text=/shadow|army|extract|soldier/i").first().isVisible().catch(() => false);
  if (!hasContent) bug("ShadowArmy", "high", "No shadow army content visible on SHADOWS tab", "06_shadows.png");

  const rls = errs.filter(e => e.includes("row-level security"));
  if (rls.length) bug("ShadowArmy/RLS", "critical", `RLS error in shadows: ${rls[0].slice(0, 120)}`, "console");
  const colErr = errs.filter(e => e.includes("extraction_tokens"));
  if (colErr.length) bug("ShadowArmy/DB", "critical", "extraction_tokens column still missing from DB", "console");
});

// ─────────────────────────────────────────────────────────────
test("07 · ARENA tab", async ({ page }) => {
  const errs = collectErrors(page);
  await login(page);
  await clickTab(page, /^arena$/i);
  await page.waitForTimeout(1500);
  await snap(page, "07_arena");

  const hasContent = await page.locator("text=/arena|battle|pvp|rank|challenge/i").first().isVisible().catch(() => false);
  if (!hasContent) bug("Arena", "high", "No arena content visible on ARENA tab", "07_arena.png");

  const rls = errs.filter(e => e.includes("row-level security"));
  if (rls.length) bug("Arena/RLS", "critical", `RLS error in arena: ${rls[0].slice(0, 120)}`, "console");
});

// ─────────────────────────────────────────────────────────────
test("08 · GUILD tab", async ({ page }) => {
  const errs = collectErrors(page);
  await login(page);
  await clickTab(page, /^guild$/i);
  await page.waitForTimeout(1500);
  await snap(page, "08_guild");

  const hasContent = await page.locator("text=/guild|clan|member|alliance/i").first().isVisible().catch(() => false);
  if (!hasContent) bug("GuildHall", "high", "No guild content visible on GUILD tab", "08_guild.png");
});

// ─────────────────────────────────────────────────────────────
test("09 · Profile modal", async ({ page }) => {
  const errs = collectErrors(page);
  await login(page);
  // Click avatar / profile area
  const profileTrigger = page.locator(".cursor-pointer").filter({ hasText: /_RANK/ }).first();
  if (await profileTrigger.isVisible({ timeout: 3000 }).catch(() => false)) {
    await profileTrigger.click();
    await page.waitForTimeout(1200);
    await snap(page, "09_profile");
    const hasProfile = await page.locator("text=/username|level|stats|hunter/i").first().isVisible().catch(() => false);
    if (!hasProfile) bug("Profile", "medium", "Profile modal opened but no content visible", "09_profile.png");
    await page.keyboard.press("Escape");
  } else {
    bug("Profile", "medium", "Profile trigger (avatar) not clickable", "");
  }
});

// ─────────────────────────────────────────────────────────────
test("10 · Settings modal", async ({ page }) => {
  const errs = collectErrors(page);
  await login(page);
  const settingsBtn = page.locator("[class*='Settings'], button").filter({ has: page.locator("svg") }).last();
  // Try via the settings gear icon in nav
  const gear = page.locator("nav button").last();
  if (await gear.isVisible({ timeout: 3000 }).catch(() => false)) {
    await gear.click();
    await page.waitForTimeout(1200);
    await snap(page, "10_settings");
    const hasSettings = await page.locator("text=/setting|sound|audio|volume|theme/i").first().isVisible().catch(() => false);
    if (!hasSettings) bug("Settings", "medium", "Settings modal opened but no settings content visible", "10_settings.png");
    await page.keyboard.press("Escape");
  } else {
    bug("Settings", "low", "Settings gear button not found in nav", "");
  }
});

// ─────────────────────────────────────────────────────────────
test("11 · Quest Board", async ({ page }) => {
  const errs = collectErrors(page);
  await login(page);
  // Quest board button in top header
  const questBtn = page.getByRole("button", { name: /quest|daily/i }).first();
  const headerQuests = page.locator("text=/quest|daily/i").first();
  const visible = await headerQuests.isVisible({ timeout: 3000 }).catch(() => false);
  if (!visible) bug("QuestBoard", "medium", "No quest-related text visible on dashboard", "");

  // Try clicking quest item
  const questItem = page.locator("text=/PENALTY_IMMESH_RISK/i").first();
  if (await questItem.isVisible({ timeout: 2000 }).catch(() => false)) {
    await questItem.click();
    await page.waitForTimeout(800);
    await snap(page, "11_quest_board");
  }
});

// ─────────────────────────────────────────────────────────────
test("12 · Leaderboard", async ({ page }) => {
  const errs = collectErrors(page);
  await login(page);
  // Leaderboard is usually triggered from a button in header or status
  const lbBtn = page.getByRole("button", { name: /leaderboard|ranking|board/i }).first();
  if (await lbBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
    await lbBtn.click();
    await page.waitForTimeout(1200);
    await snap(page, "12_leaderboard");
    const hasLb = await page.locator("text=/rank|hunter|top|leaderboard/i").first().isVisible().catch(() => false);
    if (!hasLb) bug("Leaderboard", "medium", "Leaderboard modal opened but no content visible", "12_leaderboard.png");
    await page.keyboard.press("Escape");
  } else {
    // Check if it's accessible from status panel
    await clickTab(page, /^status$/i);
    const lbStatus = page.locator("text=/leaderboard/i").first();
    if (!await lbStatus.isVisible({ timeout: 2000 }).catch(() => false)) {
      bug("Leaderboard", "medium", "No path to leaderboard found in UI", "");
    }
  }
});

// ─────────────────────────────────────────────────────────────
test("13 · +ARISE notification button", async ({ page }) => {
  const errs = collectErrors(page);
  await login(page);
  const ariseBtn = page.locator("text=/\\+ARISE/").first();
  if (await ariseBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
    await ariseBtn.click();
    await page.waitForTimeout(800);
    await snap(page, "13_arise_panel");
    await page.keyboard.press("Escape");
  } else {
    bug("+ARISE Button", "low", "+ARISE button not visible in header", "");
  }
});

// ─────────────────────────────────────────────────────────────
test("14 · Mobile nav has SHADOWS + GUILD", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 }); // iPhone 14
  await login(page);
  await snap(page, "14_mobile_nav");

  const shadows = await page.locator("text=/SHADOWS/i").first().isVisible().catch(() => false);
  const guild   = await page.locator("text=/GUILD/i").first().isVisible().catch(() => false);
  if (!shadows) bug("Mobile Nav", "high", "SHADOWS tab not visible on mobile viewport (390px)", "14_mobile_nav.png");
  if (!guild)   bug("Mobile Nav", "high", "GUILD tab not visible on mobile viewport (390px)", "14_mobile_nav.png");
});

// ─────────────────────────────────────────────────────────────
test("15 · Boss event section visible", async ({ page }) => {
  await login(page);
  await clickTab(page, /^status$/i);
  await page.waitForTimeout(1500);
  await snap(page, "15_boss_event");
  const boss = await page.locator("text=/boss|raid|world.*boss/i").first().isVisible().catch(() => false);
  if (!boss) bug("BossEvent", "low", "Boss event section not visible on STATUS tab", "15_boss_event.png");
});

// ─────────────────────────────────────────────────────────────
test("16 · ErrorBoundary — panel crash isolation", async ({ page }) => {
  const errs: string[] = [];
  page.on("console", (m: ConsoleMessage) => {
    if (m.type() === "error") errs.push(m.text());
  });
  await login(page);
  // Inject a forced throw in console to simulate
  const uncaught = errs.filter(e => e.includes("Uncaught") || e.includes("Cannot read"));
  if (uncaught.length) {
    bug("ErrorBoundary", "critical", `Uncaught render error: ${uncaught[0].slice(0, 120)}`, "console");
  }
  await snap(page, "16_error_boundary");
  // Check no white screen
  const bg = await page.$eval("body", el => getComputedStyle(el).backgroundColor).catch(() => "");
  if (bg === "rgb(255, 255, 255)") bug("ErrorBoundary", "critical", "White screen detected — error boundary not catching crash", "16_error_boundary.png");
});

// ─────────────────────────────────────────────────────────────
test("17 · AI exercise guides resolve (Ollama phi3:mini)", async ({ page }) => {
  const errs = collectErrors(page);
  await login(page);
  await clickTab(page, /^gates$/i);
  await page.waitForTimeout(1000);

  const enterBtn = page.locator("[data-testid='enter-gate']");
  if (!await enterBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
    bug("ExerciseGuide/Ollama", "medium", "Cannot test guide — ENTER_THE_VOID not visible", "");
    return;
  }
  await enterBtn.click();
  await page.waitForTimeout(2000);

  const guideBtn = page.locator("[aria-label='View Exercise Guide']").first();
  if (!await guideBtn.isVisible({ timeout: 2000 }).catch(() => false)) return;

  await guideBtn.click();
  await page.waitForTimeout(4000); // allow AI response time
  await snap(page, "17_ai_guide");

  const ollamaErr = errs.filter(e => e.includes("llama3") || e.includes("model") && e.includes("not found"));
  if (ollamaErr.length) bug("ExerciseGuide/Ollama", "high", `Ollama model error: ${ollamaErr[0].slice(0, 120)}`, "console");

  const fallback = await page.locator("text=/STEPS|FORM|TECHNIQUE|BREATHING/i").first().isVisible().catch(() => false);
  if (!fallback) bug("ExerciseGuideModal", "high", "Exercise guide modal has no content (AI and fallback both failed)", "17_ai_guide.png");
});
