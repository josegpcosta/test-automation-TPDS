import type { Locator, Page } from '@playwright/test';

/**
 * Site navbar. Items come from the CMS (global.navbar.left_navbar_items / right_navbar_items)
 * and are prefixed with the current locale by the frontend.
 *
 * The desktop layout is shown from the `lg` breakpoint; the mobile layout renders the same links
 * in a drawer. Locators filter on visibility so both layouts work.
 */
export class NavbarComponent {
  readonly root: Locator;

  constructor(page: Page) {
    this.root = page.locator('nav').first();
  }

  link(text: string): Locator {
    return this.root.getByRole('link', { name: text, exact: true }).filter({ visible: true });
  }

  /** Locale switcher entries render the locale code ("en", "fr") as link text. */
  localeLink(locale: string): Locator {
    return this.root.getByRole('link', { name: locale, exact: true }).filter({ visible: true });
  }
}
