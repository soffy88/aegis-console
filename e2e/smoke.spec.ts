import { test, expect } from '@playwright/test';

test('dashboard loads', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('nav')).toBeVisible();
});

test('apps list loads', async ({ page }) => {
  await page.goto('/apps');
  await expect(page.locator('nav')).toBeVisible();
});

test('install form loads', async ({ page }) => {
  await page.goto('/apps/install');
  await expect(page.locator('nav')).toBeVisible();
});

test('app detail loads (nonexistent id)', async ({ page }) => {
  await page.goto('/apps/nonexistent-app');
  await expect(page.locator('nav')).toBeVisible();
});

test('container detail loads (nonexistent name)', async ({ page }) => {
  await page.goto('/containers/nonexistent-container');
  await expect(page.locator('nav')).toBeVisible();
});

test('events page loads', async ({ page }) => {
  await page.goto('/events');
  await expect(page.locator('nav')).toBeVisible();
});

test('domains page loads', async ({ page }) => {
  await page.goto('/domains');
  await expect(page.locator('nav')).toBeVisible();
});

test('alert ingest page loads', async ({ page }) => {
  await page.goto('/alerts/ingest');
  await expect(page.locator('nav')).toBeVisible();
});
