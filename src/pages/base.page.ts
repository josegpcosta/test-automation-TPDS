import type { Page, Response } from '@playwright/test';
import { NavbarComponent } from '@components/navbar.component';
import { FooterComponent } from '@components/footer.component';

/**
 * Base for LaunchPad pages. Every route is prefixed with a locale (/en/..., /fr/...).
 *
 * Conventions:
 * - Locators are readonly properties built once in the constructor, or small factory methods
 *   when they depend on CMS data (a slug, a label).
 * - Actions do not assert. Specs decide what to verify.
 * - `open()` returns the navigation response so specs can check HTTP status (404s, redirects).
 */
export abstract class BasePage {
  readonly navbar: NavbarComponent;
  readonly footer: FooterComponent;

  constructor(protected readonly page: Page) {
    this.navbar = new NavbarComponent(page);
    this.footer = new FooterComponent(page);
  }

  protected async visit(locale: string, path = ''): Promise<Response | null> {
    return this.page.goto(`/${locale}${path}`);
  }

  metaDescription() {
    return this.page.locator('meta[name="description"]');
  }

  htmlRoot() {
    return this.page.locator('html');
  }
}
