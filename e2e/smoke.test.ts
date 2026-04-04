import { test, expect, Page } from "@playwright/test";

const BASE = "http://localhost:3001";

// Stable user for login tests (must exist in Supabase)
const USERNAME = "e2etesthunter";
const PASSWORD = "shadow123";
// Unique per run so signup always creates a fresh account
const SIGNUP_USERNAME = `hunter${Date.now().toString().slice(-6)}`;

test.describe("ARISE smoke tests", () => {

  test("1. Landing page loads — typewriter runs, ACCEPT button appears", async ({ page }) => {
    await page.goto(BASE);
    // Wait for the Accept button to appear after typewriter completes
    const acceptBtn = page.getByRole("button", { name: /accept power/i });
    await expect(acceptBtn).toBeVisible({ timeout: 15000 });
    console.log("✓ Landing page loaded, ACCEPT POWER visible");
  });

  test("2. Auth choice screen renders both paths", async ({ page }) => {
    await page.goto(BASE);
    await page.getByRole("button", { name: /accept power/i }).click({ timeout: 15000 });
    await expect(page.getByRole("button", { name: /create_identifier/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /reactivate_link/i })).toBeVisible();
    console.log("✓ Auth choice: CREATE_IDENTIFIER and REACTIVATE_LINK both visible");
  });

  test("3. Sign up flow — username → password → class select → dashboard", async ({ page }) => {
    await page.goto(BASE);
    await page.getByRole("button", { name: /accept power/i }).click({ timeout: 15000 });
    await page.getByRole("button", { name: /create_identifier/i }).click();

    // Enter username (unique per run)
    await page.getByPlaceholder(/designate_name/i).fill(SIGNUP_USERNAME);
    await page.getByRole("button", { name: /confirm_identity/i }).click();

    // Password step
    await page.getByPlaceholder(/••••••••/).fill(PASSWORD);
    await page.getByRole("button", { name: /confirm_identity/i }).click();

    // Class selection
    const fighterBtn = page.getByRole("button", { name: /fighter/i });
    await expect(fighterBtn).toBeVisible({ timeout: 5000 });
    await fighterBtn.click();

    // Should reach dashboard — look for STATUS tab (Supabase signup + redirect can take time)
    await expect(page.getByText(/status/i).first()).toBeVisible({ timeout: 20000 });
    console.log("✓ Signup complete — dashboard reached");
  });

  test("4. Login flow works for existing user", async ({ page }) => {
    await page.goto(BASE);
    await page.getByRole("button", { name: /accept power/i }).click({ timeout: 15000 });
    await page.getByRole("button", { name: /reactivate_link/i }).click();

    await page.getByPlaceholder(/designate_name/i).fill(USERNAME);
    await page.getByPlaceholder(/••••••••/).fill(PASSWORD);
    await page.getByRole("button", { name: /confirm_identity/i }).click();

    await expect(page.getByText(/status/i).first()).toBeVisible({ timeout: 10000 });
    console.log("✓ Login flow — dashboard reached");
  });

  test("5. No button-in-button console errors on workout panel", async ({ page }) => {
    const hydrationErrors: string[] = [];
    page.on("console", msg => {
      if (msg.type() === "error" && msg.text().includes("button")) {
        hydrationErrors.push(msg.text());
      }
    });

    await page.goto(BASE);
    await page.getByRole("button", { name: /accept power/i }).click({ timeout: 15000 });
    await page.getByRole("button", { name: /reactivate_link/i }).click();
    await page.getByPlaceholder(/designate_name/i).fill(USERNAME);
    await page.getByPlaceholder(/••••••••/).fill(PASSWORD);
    await page.getByRole("button", { name: /confirm_identity/i }).click();
    await expect(page.getByText(/status/i).first()).toBeVisible({ timeout: 10000 });

    // Navigate to workout/dungeon tab
    const gatesTab = page.getByRole("button", { name: /gates/i });
    if (await gatesTab.isVisible()) await gatesTab.click();

    await page.waitForTimeout(2000);
    expect(hydrationErrors).toHaveLength(0);
    console.log("✓ No button-in-button hydration errors");
  });

  test("6. RLS — inventory panel loads without 'row-level security' console errors", async ({ page }) => {
    const rlsErrors: string[] = [];
    page.on("console", msg => {
      if (msg.text().includes("row-level security") || msg.text().includes("violates")) {
        rlsErrors.push(msg.text());
      }
    });

    await page.goto(BASE);
    await page.getByRole("button", { name: /accept power/i }).click({ timeout: 15000 });
    await page.getByRole("button", { name: /reactivate_link/i }).click();
    await page.getByPlaceholder(/designate_name/i).fill(USERNAME);
    await page.getByPlaceholder(/••••••••/).fill(PASSWORD);
    await page.getByRole("button", { name: /confirm_identity/i }).click();
    await expect(page.getByText(/status/i).first()).toBeVisible({ timeout: 10000 });

    // Navigate to storage/inventory
    const storageTab = page.getByRole("button", { name: /storage/i });
    if (await storageTab.isVisible()) await storageTab.click();
    await page.waitForTimeout(2000);

    expect(rlsErrors).toHaveLength(0);
    console.log("✓ No RLS policy violations in console");
  });

});
