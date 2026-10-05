// Sign-up -> verify (link from Mailpit) -> sign in -> sign out.
import { test, expect } from "@playwright/test";
import { PASSWORD, latestMailTo } from "./helpers";

test("[login] a wrong password gets the one generic message", async ({ page }) => {
  await page.goto("/login");
  await page.getByPlaceholder("Email").fill("user@example.com");
  await page.getByPlaceholder("Password").fill("wrong-password");
  await page.getByRole("button", { name: "Sign In" }).click();
  await expect(page.getByText(/Email or password is incorrect/)).toBeVisible();
});

test("sign up, verify from the email, sign in, sign out", async ({ page, request }) => {
  const email = `e2e-${Date.now()}@example.com`;
  await page.goto("/sign-up");
  await page.getByPlaceholder(/First/i).fill("Ee");
  await page.getByPlaceholder(/Last/i).fill("Two");
  await page.getByPlaceholder("Email").fill(email);
  const pw = page.locator('input[type="password"]');
  for (let i = 0; i < (await pw.count()); i++) await pw.nth(i).fill(PASSWORD);
  await page.getByRole("button", { name: /create|sign up/i }).click();
  await expect(page.getByRole("heading", { name: "Check your email" })).toBeVisible();

  const mail = await latestMailTo(request, email);
  const link = (mail.HTML || mail.Text).match(/\/verify-email\?token=[A-Za-z0-9_-]+/)[0];
  await page.goto(link);
  await expect(page.getByRole("heading", { name: "Email Verification" })).toBeVisible();
  await expect(page.getByText("Verifying…")).toHaveCount(0);

  await page.goto("/login");
  await page.getByPlaceholder("Email").fill(email);
  await page.getByPlaceholder("Password").fill(PASSWORD);
  await page.getByRole("button", { name: "Sign In" }).click();
  await expect(page.getByText("Sign out")).toBeVisible();

  await page.goto("/follow-rocks");
  await expect(page).toHaveURL(/follow-rocks/);

  await page.getByText("Sign out").click();
  await expect(page.locator("nav").first().getByRole("link", { name: "Sign in to follow rocks" })).toBeVisible();
});
