import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('Accessibility Audits (Axe-Core)', () => {
  test('Landing page has zero serious or critical accessibility violations', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();

    const seriousViolations = accessibilityScanResults.violations.filter(
      v => v.impact === 'serious' || v.impact === 'critical'
    );

    expect(seriousViolations, JSON.stringify(seriousViolations, null, 2)).toEqual([]);
  });

  test('Workspace app has zero serious or critical accessibility violations', async ({ context, page }) => {
    // Allow extra time — React mounts workspace HTML then dynamically loads
    // vendor PDF.js + mammoth.js, which are large bundles.
    test.setTimeout(60000);

    // Stub controllerchange so automatic SW reload doesn't destroy execution context
    await page.addInitScript(() => {
      if ('serviceWorker' in navigator) {
        const orig = navigator.serviceWorker.addEventListener.bind(navigator.serviceWorker);
        navigator.serviceWorker.addEventListener = function(type, listener, options) {
          if (type === 'controllerchange') return;
          return orig(type, listener, options);
        };
      }
    });

    // Phase 1: workspace now lives at /app (React SPA route)
    await page.goto('/app');
    await page.waitForLoadState('domcontentloaded');

    // Wait for React to inject the workspace HTML and for scripts to finish loading.
    // We detect completion by waiting for the sidebar nav to appear in the DOM.
    await page.waitForSelector('.app-sidebar', { timeout: 20000 });

    // Extra settle time for all dynamic <script> tags to execute
    await page.waitForTimeout(2000);

    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();

    const seriousViolations = accessibilityScanResults.violations.filter(
      v => v.impact === 'serious' || v.impact === 'critical'
    );

    expect(seriousViolations, JSON.stringify(seriousViolations, null, 2)).toEqual([]);
  });
});
