/**
 * ARISE Solo Leveling Fitness App — Comprehensive E2E Audit
 * Playwright (Node.js) script — runs headless Chromium
 */

const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const BASE_URL = 'http://localhost:3000';
const SCREENSHOT_DIR = '/tmp/arise-screenshots';
const REPORT = { pages: [], errors: [], warnings: [], working: [], broken: [] };

fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });

let screenshotIndex = 0;
function ssPath(name) {
  screenshotIndex++;
  return path.join(SCREENSHOT_DIR, `${String(screenshotIndex).padStart(2,'0')}_${name}.png`);
}

async function screenshot(page, name, report = true) {
  const p = ssPath(name);
  await page.screenshot({ path: p, fullPage: true });
  if (report) console.log(`  [SS] ${p}`);
  return p;
}

async function wait(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    recordVideo: { dir: SCREENSHOT_DIR + '/videos/' },
  });
  const page = await ctx.newPage();

  const consoleErrors = [];
  const networkErrors = [];

  // Intercept console messages
  page.on('console', msg => {
    const type = msg.type();
    const text = msg.text();
    if (type === 'error') {
      consoleErrors.push({ type: 'console.error', text, url: page.url() });
      console.log(`  [CONSOLE ERROR] ${text}`);
    } else if (type === 'warn') {
      consoleErrors.push({ type: 'console.warn', text, url: page.url() });
    }
  });

  // Intercept page errors (JS exceptions)
  page.on('pageerror', err => {
    consoleErrors.push({ type: 'pageerror', text: err.message, stack: err.stack, url: page.url() });
    console.log(`  [PAGE ERROR] ${err.message}`);
  });

  // Intercept network failures
  page.on('requestfailed', req => {
    networkErrors.push({
      type: 'request_failed',
      url: req.url(),
      method: req.method(),
      failure: req.failure()?.errorText,
      pageUrl: page.url(),
    });
    console.log(`  [NET FAIL] ${req.method()} ${req.url()} — ${req.failure()?.errorText}`);
  });

  // Intercept 4xx/5xx responses
  page.on('response', resp => {
    const status = resp.status();
    if (status >= 400) {
      networkErrors.push({
        type: 'http_error',
        status,
        url: resp.url(),
        pageUrl: page.url(),
      });
      console.log(`  [HTTP ${status}] ${resp.url()}`);
    }
  });

  // ============================================================
  // 1. LANDING / INTRO SCREEN
  // ============================================================
  console.log('\n=== [1] LANDING PAGE / AWAKENING SCREEN ===');
  try {
    // Clear any prior localStorage to get fresh state
    await page.goto(BASE_URL, { waitUntil: 'networkidle', timeout: 30000 });
    await wait(3000); // Wait for React hydration + Supabase auth check

    const title = await page.title();
    console.log(`  Page title: ${title}`);
    REPORT.pages.push({ name: 'Landing / Root', url: BASE_URL, title });

    const ss1 = await screenshot(page, '01_landing_initial');

    // Check what's visible
    const loadingText = await page.locator('text=SYSTEM_SYNC_IN_PROGRESS').count();
    const awakeningVisible = await page.locator('text=ARISE').count();
    const dashboardVisible = await page.locator('[data-testid="dashboard"]').count();

    console.log(`  Loading spinner visible: ${loadingText > 0}`);
    console.log(`  ARISE text visible: ${awakeningVisible > 0}`);
    console.log(`  Dashboard visible: ${dashboardVisible > 0}`);

    await wait(2000);
    const ss2 = await screenshot(page, '02_landing_after_wait');
    REPORT.working.push('Landing page loads without crash');
  } catch (err) {
    console.log(`  [ERROR] Landing page: ${err.message}`);
    REPORT.broken.push(`Landing page: ${err.message}`);
    await screenshot(page, '01_landing_ERROR');
  }

  // ============================================================
  // 2. AWAKENING SCREEN — Inspect all elements
  // ============================================================
  console.log('\n=== [2] AWAKENING SCREEN DEEP INSPECTION ===');
  try {
    // Re-clear storage to force awakening screen
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
    await page.goto(BASE_URL, { waitUntil: 'networkidle', timeout: 30000 });
    await wait(4000);

    await screenshot(page, '03_awakening_screen');

    // Check body content
    const bodyText = await page.locator('body').innerText().catch(() => '');
    console.log(`  Body text preview: ${bodyText.substring(0, 200)}`);

    // Check for buttons
    const buttons = await page.locator('button').all();
    console.log(`  Buttons found: ${buttons.length}`);
    for (const btn of buttons) {
      const txt = await btn.innerText().catch(() => '');
      console.log(`    Button: "${txt}"`);
    }

    // Check for inputs
    const inputs = await page.locator('input').all();
    console.log(`  Inputs found: ${inputs.length}`);

    // Check for ARISE heading or awakening content
    const ariseHeading = await page.locator('h1, h2, [class*="title"]').first().innerText().catch(() => 'not found');
    console.log(`  Main heading: ${ariseHeading}`);

    REPORT.pages.push({ name: 'Awakening Screen', url: BASE_URL });
  } catch (err) {
    console.log(`  [ERROR] Awakening screen: ${err.message}`);
    REPORT.broken.push(`Awakening screen inspection: ${err.message}`);
  }

  // ============================================================
  // 3. AUTH FLOW — Try to find and interact with auth elements
  // ============================================================
  console.log('\n=== [3] AUTH FLOW ===');
  try {
    // Look for login/signup button
    const signInBtn = await page.locator('text=/sign in|login|authenticate/i').first();
    const signInVisible = await signInBtn.isVisible().catch(() => false);
    console.log(`  Sign-in button visible: ${signInVisible}`);

    if (signInVisible) {
      await signInBtn.click();
      await wait(1500);
      await screenshot(page, '04_auth_after_signin_click');
    }

    // Look for email/password fields
    const emailInput = page.locator('input[type="email"], input[placeholder*="email" i], input[name="email"]').first();
    const pwInput = page.locator('input[type="password"]').first();

    const emailVisible = await emailInput.isVisible().catch(() => false);
    const pwVisible = await pwInput.isVisible().catch(() => false);
    console.log(`  Email input visible: ${emailVisible}`);
    console.log(`  Password input visible: ${pwVisible}`);

    if (emailVisible && pwVisible) {
      await emailInput.fill('testuser_e2e@arise.test');
      await pwInput.fill('TestPass123!');
      await screenshot(page, '05_auth_filled_form');

      // Try to submit
      const submitBtn = page.locator('button[type="submit"], button:has-text("Sign"), button:has-text("Login")').first();
      const submitVisible = await submitBtn.isVisible().catch(() => false);
      if (submitVisible) {
        await submitBtn.click();
        await wait(3000);
        await screenshot(page, '06_auth_after_submit');
        console.log(`  Auth submit clicked, URL: ${page.url()}`);
      }
      REPORT.working.push('Auth form is visible and fillable');
    } else {
      console.log('  Auth form not immediately visible — may be inside awakening flow');
    }

    REPORT.pages.push({ name: 'Auth Flow', url: page.url() });
  } catch (err) {
    console.log(`  [ERROR] Auth flow: ${err.message}`);
    REPORT.broken.push(`Auth flow: ${err.message}`);
    await screenshot(page, '04_auth_ERROR');
  }

  // ============================================================
  // 4. AWAKENING SCREEN — Interact with job class selection
  // ============================================================
  console.log('\n=== [4] AWAKENING SCREEN INTERACTION ===');
  try {
    await page.evaluate(() => { localStorage.clear(); });
    await page.goto(BASE_URL, { waitUntil: 'networkidle', timeout: 30000 });
    await wait(4000);
    await screenshot(page, '07_fresh_awakening');

    // Look for any clickable job class cards or "BEGIN" type buttons
    const allButtons = await page.locator('button').all();
    console.log(`  Total buttons on awakening: ${allButtons.length}`);

    for (let i = 0; i < Math.min(allButtons.length, 10); i++) {
      const btn = allButtons[i];
      const txt = await btn.innerText().catch(() => '');
      const visible = await btn.isVisible().catch(() => false);
      if (txt && visible) console.log(`    [${i}] "${txt}"`);
    }

    // Look for any text inputs for username
    const textInputs = await page.locator('input[type="text"], input:not([type])').all();
    console.log(`  Text inputs: ${textInputs.length}`);

    if (textInputs.length > 0) {
      await textInputs[0].fill('TestHunter_E2E');
      await screenshot(page, '08_username_filled');
      console.log('  Username input found and filled');
      REPORT.working.push('Username input on awakening screen works');
    }

    // Try clicking any visible "confirm" or "begin" button
    const beginBtn = page.locator('button:has-text("AWAKEN"), button:has-text("BEGIN"), button:has-text("ARISE"), button:has-text("START"), button:has-text("CONFIRM")').first();
    const beginVisible = await beginBtn.isVisible().catch(() => false);
    if (beginVisible) {
      const txt = await beginBtn.innerText().catch(() => '');
      console.log(`  Found begin button: "${txt}"`);
      await beginBtn.click();
      await wait(2000);
      await screenshot(page, '09_after_begin_click');
    } else {
      console.log('  No begin/awaken button found (may need auth first)');
    }
  } catch (err) {
    console.log(`  [ERROR] Awakening interaction: ${err.message}`);
    REPORT.broken.push(`Awakening interaction: ${err.message}`);
  }

  // ============================================================
  // 5. FORCE DASHBOARD STATE — Inject local state to bypass auth
  // ============================================================
  console.log('\n=== [5] FORCE DASHBOARD (inject game state) ===');
  try {
    const mockState = {
      user: {
        id: "e2e-test-user-123",
        username: "E2E_Hunter",
        email: "e2e@test.com",
        avatar: null,
        title: "Shadow Monarch",
        level: 25,
        currentXp: 1500,
        xpToNextLevel: 3000,
        rank: "S",
        jobClass: "SHADOW_MONARCH",
        createdAt: new Date().toISOString(),
        stats: {
          strength: 120,
          vitality: 100,
          agility: 110,
          intelligence: 90,
          perception: 85,
          sense: 95,
          availablePoints: 5,
          totalWorkouts: 47,
          currentStreak: 7,
          longestStreak: 14,
          totalCalories: 25000,
          totalXpEarned: 50000,
          pvpRating: 2100,
          pvpWins: 35,
          pvpLosses: 8,
          trialLastFailedAt: null,
        }
      },
      stats: null,
      activeTab: "STATUS",
      activeChapterId: null,
      isPenaltyZone: false,
      notifications: [],
      dailyQuests: [
        { id: "q1", name: "100 Push-ups", description: "Complete 100 push-ups", xpReward: 200, completed: false, type: "DAILY", targetReps: 100, currentReps: 0, exerciseType: "PUSHUPS" },
        { id: "q2", name: "5km Run", description: "Run 5 kilometers", xpReward: 300, completed: true, type: "DAILY", targetReps: 5, currentReps: 5, exerciseType: "RUN" }
      ],
      chapters: [
        { id: "ch1", title: "The Weakest Hunter", number: 1, unlocked: true, externalUrl: null },
        { id: "ch2", title: "The Dungeon Breaks", number: 2, unlocked: true, externalUrl: null },
        { id: "ch3", title: "The Cartenon Temple", number: 3, unlocked: false, externalUrl: null }
      ],
      shadows: [],
      inventory: [],
      activeChapterUnlock: null,
    };

    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded', timeout: 20000 });
    await page.evaluate((state) => {
      localStorage.setItem('arise_game_state', JSON.stringify(state));
    }, mockState);

    await page.reload({ waitUntil: 'networkidle', timeout: 30000 });
    await wait(4000);

    const ss = await screenshot(page, '10_dashboard_forced_state');
    console.log(`  Dashboard URL: ${page.url()}`);

    const bodyText = await page.locator('body').innerText().catch(() => '');
    console.log(`  Body preview: ${bodyText.substring(0, 300)}`);

    REPORT.pages.push({ name: 'Dashboard (forced state)', url: page.url() });
  } catch (err) {
    console.log(`  [ERROR] Dashboard force: ${err.message}`);
    REPORT.broken.push(`Dashboard forced state: ${err.message}`);
    await screenshot(page, '10_dashboard_ERROR');
  }

  // ============================================================
  // 6. DASHBOARD TABS — Click every nav tab
  // ============================================================
  console.log('\n=== [6] DASHBOARD NAVIGATION TABS ===');
  const tabNames = ['STATUS', 'SHADOWS', 'STORAGE', 'GATES', 'ARENA', 'GUILD'];

  for (const tab of tabNames) {
    try {
      console.log(`  Clicking tab: ${tab}`);
      const tabBtn = page.locator(`button:has-text("${tab}"), [data-tab="${tab}"]`).first();
      const visible = await tabBtn.isVisible().catch(() => false);

      if (visible) {
        await tabBtn.click();
        await wait(2000);
        const ssName = `11_tab_${tab.toLowerCase()}`;
        await screenshot(page, ssName);
        REPORT.working.push(`Tab ${tab} is clickable`);
        REPORT.pages.push({ name: `Dashboard Tab: ${tab}`, url: page.url() });
      } else {
        // Try alternative selectors
        const altBtn = page.locator(`text="${tab}"`).first();
        const altVisible = await altBtn.isVisible().catch(() => false);
        if (altVisible) {
          await altBtn.click();
          await wait(1500);
          await screenshot(page, `11_tab_${tab.toLowerCase()}_alt`);
          REPORT.working.push(`Tab ${tab} (alt selector) clickable`);
        } else {
          console.log(`    Tab ${tab} not found`);
          REPORT.broken.push(`Tab ${tab} not found in DOM`);
        }
      }
    } catch (err) {
      console.log(`    [ERROR] Tab ${tab}: ${err.message}`);
      REPORT.broken.push(`Dashboard tab ${tab}: ${err.message}`);
    }
  }

  // ============================================================
  // 7. QUEST BOARD — click via icon buttons
  // ============================================================
  console.log('\n=== [7] QUEST BOARD ===');
  try {
    // Go back to STATUS tab first
    await page.locator('button:has-text("STATUS"), text="STATUS"').first().click().catch(() => {});
    await wait(1000);

    const questBtn = page.locator('button[title*="quest" i], button[aria-label*="quest" i], button:has-text("QUEST")').first();
    const questBtnIcon = page.locator('[data-testid="quest-board-btn"]').first();

    let questVisible = await questBtn.isVisible().catch(() => false);
    if (!questVisible) questVisible = await questBtnIcon.isVisible().catch(() => false);

    // Try the bell/quest icon in the dashboard header
    const bellBtn = page.locator('button').filter({ has: page.locator('svg') }).all();
    console.log(`  Icon buttons found: ${(await bellBtn).length}`);

    // Try clicking anything labeled quest
    const anyQuestBtn = page.locator('text=/quest/i').first();
    const anyQuestVisible = await anyQuestBtn.isVisible().catch(() => false);
    if (anyQuestVisible) {
      await anyQuestBtn.click();
      await wait(2000);
      await screenshot(page, '20_quest_board');
      console.log('  Quest board opened');
      REPORT.pages.push({ name: 'Quest Board', url: page.url() });
      REPORT.working.push('Quest Board accessible');

      // Close it
      const closeBtn = page.locator('button[aria-label="close"], button:has-text("✕"), button:has-text("×")').first();
      if (await closeBtn.isVisible().catch(() => false)) {
        await closeBtn.click();
        await wait(500);
      }
    } else {
      console.log('  Quest board button not directly visible');
      REPORT.warnings.push('Quest board button not found by text selector');
    }
  } catch (err) {
    console.log(`  [ERROR] Quest board: ${err.message}`);
    REPORT.broken.push(`Quest board: ${err.message}`);
    await screenshot(page, '20_quest_ERROR');
  }

  // ============================================================
  // 8. DUNGEON GATE / PORTAL — GATES tab
  // ============================================================
  console.log('\n=== [8] DUNGEON GATE / GATES TAB ===');
  try {
    const gatesBtn = page.locator('button:has-text("GATES"), text="GATES"').first();
    const gatesVisible = await gatesBtn.isVisible().catch(() => false);
    if (gatesVisible) {
      await gatesBtn.click();
      await wait(3000); // Three.js takes time
      await screenshot(page, '21_dungeon_gates');
      REPORT.pages.push({ name: 'Dungeon Gates', url: page.url() });

      // Check for WebGL errors
      const webglError = await page.locator('text=/webgl|three.js|canvas/i').count();
      console.log(`  WebGL/Three.js related elements: ${webglError}`);

      // Check if canvas exists
      const canvas = await page.locator('canvas').count();
      console.log(`  Canvas elements: ${canvas}`);
      if (canvas > 0) {
        REPORT.working.push('Dungeon Gate canvas renders (Three.js)');
      } else {
        REPORT.warnings.push('No canvas element found in Dungeon Gates — Three.js may not be rendering');
      }
    }
  } catch (err) {
    console.log(`  [ERROR] Dungeon Gates: ${err.message}`);
    REPORT.broken.push(`Dungeon Gates: ${err.message}`);
    await screenshot(page, '21_gates_ERROR');
  }

  // ============================================================
  // 9. SHADOW ARMY — SHADOWS tab
  // ============================================================
  console.log('\n=== [9] SHADOW ARMY ===');
  try {
    const shadowsBtn = page.locator('button:has-text("SHADOWS"), text="SHADOWS"').first();
    const shadowsVisible = await shadowsBtn.isVisible().catch(() => false);
    if (shadowsVisible) {
      await shadowsBtn.click();
      await wait(2000);
      await screenshot(page, '22_shadow_army');
      REPORT.pages.push({ name: 'Shadow Army', url: page.url() });
      REPORT.working.push('Shadow Army tab accessible');
    }
  } catch (err) {
    console.log(`  [ERROR] Shadow Army: ${err.message}`);
    REPORT.broken.push(`Shadow Army: ${err.message}`);
  }

  // ============================================================
  // 10. INVENTORY / STORAGE — STORAGE tab
  // ============================================================
  console.log('\n=== [10] INVENTORY / STORAGE ===');
  try {
    const storageBtn = page.locator('button:has-text("STORAGE"), text="STORAGE"').first();
    const storageVisible = await storageBtn.isVisible().catch(() => false);
    if (storageVisible) {
      await storageBtn.click();
      await wait(2000);
      await screenshot(page, '23_inventory_storage');
      REPORT.pages.push({ name: 'Inventory / Storage', url: page.url() });
      REPORT.working.push('Storage/Inventory tab accessible');
    }
  } catch (err) {
    console.log(`  [ERROR] Storage: ${err.message}`);
    REPORT.broken.push(`Storage: ${err.message}`);
  }

  // ============================================================
  // 11. ARENA / PVP — ARENA tab
  // ============================================================
  console.log('\n=== [11] ARENA / PVP ===');
  try {
    const arenaBtn = page.locator('button:has-text("ARENA"), text="ARENA"').first();
    const arenaVisible = await arenaBtn.isVisible().catch(() => false);
    if (arenaVisible) {
      await arenaBtn.click();
      await wait(2000);
      await screenshot(page, '24_arena_pvp');
      REPORT.pages.push({ name: 'Arena / PvP', url: page.url() });
      REPORT.working.push('Arena/PvP tab accessible');
    }
  } catch (err) {
    console.log(`  [ERROR] Arena: ${err.message}`);
    REPORT.broken.push(`Arena/PvP: ${err.message}`);
  }

  // ============================================================
  // 12. GUILD HALL — GUILD tab
  // ============================================================
  console.log('\n=== [12] GUILD HALL ===');
  try {
    const guildBtn = page.locator('button:has-text("GUILD"), text="GUILD"').first();
    const guildVisible = await guildBtn.isVisible().catch(() => false);
    if (guildVisible) {
      await guildBtn.click();
      await wait(2000);
      await screenshot(page, '25_guild_hall');
      REPORT.pages.push({ name: 'Guild Hall', url: page.url() });
      REPORT.working.push('Guild Hall tab accessible');
    }
  } catch (err) {
    console.log(`  [ERROR] Guild Hall: ${err.message}`);
    REPORT.broken.push(`Guild Hall: ${err.message}`);
  }

  // ============================================================
  // 13. ICON BUTTON SCAN — Profile, Settings, Leaderboard, etc.
  // ============================================================
  console.log('\n=== [13] ICON BUTTONS SCAN ===');
  try {
    // Go to STATUS tab to see main dashboard
    await page.locator('button:has-text("STATUS"), text="STATUS"').first().click().catch(() => {});
    await wait(1000);
    await screenshot(page, '30_status_tab_full');

    // Profile button (usually avatar or user icon)
    const profileBtns = [
      page.locator('button[aria-label*="profile" i]').first(),
      page.locator('button[title*="profile" i]').first(),
      page.locator('[data-testid="profile-btn"]').first(),
    ];

    for (const btn of profileBtns) {
      if (await btn.isVisible().catch(() => false)) {
        await btn.click();
        await wait(2000);
        await screenshot(page, '31_profile_modal');
        console.log('  Profile button clicked');
        REPORT.pages.push({ name: 'Profile Modal', url: page.url() });
        REPORT.working.push('Profile button works');
        const closeBtn = page.locator('button[aria-label="close"], button:has-text("✕"), button:has-text("×"), button:has-text("CLOSE")').first();
        if (await closeBtn.isVisible().catch(() => false)) await closeBtn.click();
        break;
      }
    }

    // Leaderboard
    const lbBtn = page.locator('button:has-text("LEADERBOARD"), button[aria-label*="leaderboard" i], text=/leaderboard/i').first();
    if (await lbBtn.isVisible().catch(() => false)) {
      await lbBtn.click();
      await wait(2000);
      await screenshot(page, '32_leaderboard');
      REPORT.pages.push({ name: 'Leaderboard', url: page.url() });
      REPORT.working.push('Leaderboard accessible');
      const closeBtn = page.locator('button:has-text("✕"), button:has-text("×"), button[aria-label="close"]').first();
      if (await closeBtn.isVisible().catch(() => false)) await closeBtn.click();
      await wait(500);
    } else {
      console.log('  Leaderboard button not found');
    }

    // Settings
    const settingsBtn = page.locator('button:has-text("SETTINGS"), button[aria-label*="settings" i]').first();
    if (await settingsBtn.isVisible().catch(() => false)) {
      await settingsBtn.click();
      await wait(2000);
      await screenshot(page, '33_settings');
      REPORT.pages.push({ name: 'Settings', url: page.url() });
      REPORT.working.push('Settings accessible');
      const closeBtn = page.locator('button:has-text("✕"), button:has-text("×"), button[aria-label="close"]').first();
      if (await closeBtn.isVisible().catch(() => false)) await closeBtn.click();
      await wait(500);
    }
  } catch (err) {
    console.log(`  [ERROR] Icon buttons: ${err.message}`);
    REPORT.broken.push(`Icon buttons scan: ${err.message}`);
  }

  // ============================================================
  // 14. BOSS EVENT — Check if accessible
  // ============================================================
  console.log('\n=== [14] BOSS EVENT ===');
  try {
    const bossBtn = page.locator('text=/boss|world boss/i').first();
    const bossVisible = await bossBtn.isVisible().catch(() => false);
    if (bossVisible) {
      await bossBtn.click();
      await wait(2000);
      await screenshot(page, '40_boss_event');
      REPORT.pages.push({ name: 'Boss Event', url: page.url() });
      REPORT.working.push('Boss Event accessible');
    } else {
      console.log('  Boss event not directly visible on dashboard');
      REPORT.warnings.push('Boss Event button not found — may require specific game state');
    }
  } catch (err) {
    console.log(`  [ERROR] Boss Event: ${err.message}`);
  }

  // ============================================================
  // 15. API ROUTES — Test all API endpoints
  // ============================================================
  console.log('\n=== [15] API ROUTES ===');
  const apiRoutes = [
    '/api/user',
    '/api/quests',
    '/api/xp',
    '/api/rank',
    '/api/shadows',
    '/api/inventory',
    '/api/leaderboard',
    '/api/arena',
    '/api/boss',
    '/api/exercise-guide',
  ];

  for (const route of apiRoutes) {
    try {
      const resp = await page.evaluate(async (url) => {
        try {
          const r = await fetch(url);
          const text = await r.text();
          return { status: r.status, body: text.substring(0, 200) };
        } catch (e) {
          return { status: 0, error: e.message };
        }
      }, `${BASE_URL}${route}`);

      console.log(`  ${route}: ${resp.status} — ${resp.error || resp.body?.substring(0, 80)}`);

      if (resp.status >= 200 && resp.status < 400) {
        REPORT.working.push(`API ${route}: ${resp.status}`);
      } else if (resp.status >= 400) {
        REPORT.errors.push({ type: 'api_error', route, status: resp.status, body: resp.body });
        REPORT.broken.push(`API ${route}: HTTP ${resp.status}`);
      } else {
        REPORT.warnings.push(`API ${route}: status ${resp.status}`);
      }
    } catch (err) {
      console.log(`  [ERROR] API ${route}: ${err.message}`);
      REPORT.broken.push(`API ${route}: ${err.message}`);
    }
  }

  // ============================================================
  // 16. SCROLL & VISUAL INSPECTION — full page scroll
  // ============================================================
  console.log('\n=== [16] FULL PAGE VISUAL INSPECTION ===');
  try {
    await page.locator('button:has-text("STATUS"), text="STATUS"').first().click().catch(() => {});
    await wait(1000);

    // Scroll to top
    await page.evaluate(() => window.scrollTo(0, 0));
    await screenshot(page, '50_full_page_top');

    // Scroll to middle
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight / 2));
    await wait(500);
    await screenshot(page, '51_full_page_mid');

    // Scroll to bottom
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await wait(500);
    await screenshot(page, '52_full_page_bottom');

    // Check for broken images
    const brokenImages = await page.evaluate(() => {
      const imgs = Array.from(document.querySelectorAll('img'));
      return imgs.filter(img => !img.complete || img.naturalWidth === 0).map(img => img.src);
    });
    console.log(`  Broken images: ${brokenImages.length}`);
    if (brokenImages.length > 0) {
      brokenImages.forEach(src => {
        console.log(`    Broken: ${src}`);
        REPORT.broken.push(`Broken image: ${src}`);
      });
    }

    // Check viewport for overflow
    const hasOverflow = await page.evaluate(() => {
      return document.body.scrollWidth > window.innerWidth;
    });
    console.log(`  Horizontal overflow: ${hasOverflow}`);
    if (hasOverflow) REPORT.warnings.push('Horizontal overflow detected on main page');
  } catch (err) {
    console.log(`  [ERROR] Visual inspection: ${err.message}`);
  }

  // ============================================================
  // 17. MOBILE VIEWPORT TEST
  // ============================================================
  console.log('\n=== [17] MOBILE VIEWPORT ===');
  try {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.reload({ waitUntil: 'networkidle', timeout: 20000 });
    await wait(3000);
    await screenshot(page, '60_mobile_view');

    const mobileOverflow = await page.evaluate(() => {
      return document.body.scrollWidth > window.innerWidth;
    });
    console.log(`  Mobile horizontal overflow: ${mobileOverflow}`);
    if (mobileOverflow) REPORT.warnings.push('Mobile: horizontal overflow detected');
    else REPORT.working.push('Mobile viewport (390px) — no horizontal overflow');

    // Reset viewport
    await page.setViewportSize({ width: 1440, height: 900 });
  } catch (err) {
    console.log(`  [ERROR] Mobile viewport: ${err.message}`);
  }

  // ============================================================
  // 18. DEEP BUTTON SCAN — ALL buttons in dashboard
  // ============================================================
  console.log('\n=== [18] DEEP DASHBOARD BUTTON SCAN ===');
  try {
    await page.reload({ waitUntil: 'networkidle', timeout: 20000 });
    await wait(4000);

    const allButtons = await page.locator('button:visible').all();
    console.log(`  Total visible buttons: ${allButtons.length}`);

    const buttonData = [];
    for (const btn of allButtons) {
      const txt = await btn.innerText().catch(() => '');
      const ariaLabel = await btn.getAttribute('aria-label').catch(() => '');
      const dataTest = await btn.getAttribute('data-testid').catch(() => '');
      const title = await btn.getAttribute('title').catch(() => '');
      buttonData.push({ txt: txt.trim(), ariaLabel, dataTest, title });
    }

    console.log('  All visible buttons:');
    buttonData.forEach((b, i) => {
      const label = b.txt || b.ariaLabel || b.dataTest || b.title || '[icon-only]';
      console.log(`    [${i}] ${label}`);
    });

    await screenshot(page, '70_all_buttons_state');
  } catch (err) {
    console.log(`  [ERROR] Button scan: ${err.message}`);
  }

  // ============================================================
  // 19. WORKOUT ENGINE — Try to trigger workout flow
  // ============================================================
  console.log('\n=== [19] WORKOUT ENGINE ===');
  try {
    // Look for workout/training button
    const workoutBtn = page.locator('button:has-text("TRAIN"), button:has-text("WORKOUT"), button:has-text("START TRAINING"), text=/begin training/i').first();
    const workoutVisible = await workoutBtn.isVisible().catch(() => false);
    if (workoutVisible) {
      await workoutBtn.click();
      await wait(2000);
      await screenshot(page, '71_workout_engine');
      REPORT.pages.push({ name: 'Workout Engine', url: page.url() });
      REPORT.working.push('Workout Engine accessible');
      const closeBtn = page.locator('button:has-text("✕"), button:has-text("×"), button[aria-label="close"]').first();
      if (await closeBtn.isVisible().catch(() => false)) await closeBtn.click();
    } else {
      console.log('  Workout button not found directly');
    }
  } catch (err) {
    console.log(`  [ERROR] Workout Engine: ${err.message}`);
  }

  // ============================================================
  // 20. RANK TRIAL ENGINE
  // ============================================================
  console.log('\n=== [20] RANK TRIAL ENGINE ===');
  try {
    const rankBtn = page.locator('button:has-text("RANK TRIAL"), button:has-text("TRIAL"), text=/rank trial/i').first();
    const rankVisible = await rankBtn.isVisible().catch(() => false);
    if (rankVisible) {
      await rankBtn.click();
      await wait(2000);
      await screenshot(page, '72_rank_trial');
      REPORT.pages.push({ name: 'Rank Trial Engine', url: page.url() });
      REPORT.working.push('Rank Trial Engine accessible');
      const closeBtn = page.locator('button:has-text("✕"), button:has-text("×")').first();
      if (await closeBtn.isVisible().catch(() => false)) await closeBtn.click();
    } else {
      console.log('  Rank Trial not visible — likely locked or not in current state');
    }
  } catch (err) {
    console.log(`  [ERROR] Rank Trial: ${err.message}`);
  }

  // ============================================================
  // FINAL SUMMARY
  // ============================================================
  console.log('\n\n========== E2E AUDIT COMPLETE ==========\n');

  console.log('CONSOLE ERRORS & WARNINGS:');
  if (consoleErrors.length === 0) {
    console.log('  None detected');
  } else {
    consoleErrors.forEach((e, i) => {
      console.log(`  [${i+1}] [${e.type}] ${e.text}`);
      if (e.stack) console.log(`       Stack: ${e.stack.split('\n')[0]}`);
    });
  }

  console.log('\nNETWORK ERRORS:');
  if (networkErrors.length === 0) {
    console.log('  None detected');
  } else {
    networkErrors.forEach((e, i) => {
      if (e.type === 'http_error') {
        console.log(`  [${i+1}] HTTP ${e.status}: ${e.url}`);
      } else {
        console.log(`  [${i+1}] ${e.type}: ${e.url} — ${e.failure}`);
      }
    });
  }

  console.log('\nPAGES VISITED:');
  REPORT.pages.forEach((p, i) => console.log(`  [${i+1}] ${p.name} — ${p.url}`));

  console.log('\nWORKING:');
  REPORT.working.forEach((w, i) => console.log(`  [${i+1}] ${w}`));

  console.log('\nBROKEN:');
  REPORT.broken.forEach((b, i) => console.log(`  [${i+1}] ${b}`));

  console.log('\nWARNINGS:');
  REPORT.warnings.forEach((w, i) => console.log(`  [${i+1}] ${w}`));

  // Save JSON report
  const fullReport = {
    timestamp: new Date().toISOString(),
    baseUrl: BASE_URL,
    pages: REPORT.pages,
    consoleErrors,
    networkErrors,
    working: REPORT.working,
    broken: REPORT.broken,
    warnings: REPORT.warnings,
    screenshotDir: SCREENSHOT_DIR,
  };

  fs.writeFileSync('/tmp/arise-screenshots/audit-report.json', JSON.stringify(fullReport, null, 2));
  console.log('\nFull report saved to: /tmp/arise-screenshots/audit-report.json');
  console.log(`Screenshots saved to: ${SCREENSHOT_DIR}/`);
  console.log(`Total screenshots taken: ${screenshotIndex}`);

  await ctx.close();
  await browser.close();
}

main().catch(err => {
  console.error('AUDIT SCRIPT FATAL ERROR:', err);
  process.exit(1);
});
