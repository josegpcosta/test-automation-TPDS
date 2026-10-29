import type { Locator, Page } from '@playwright/test';

/**
 * Site footer. Description, copyright and link groups come from the CMS (global.footer).
 *
 * The footer has no <footer> landmark or data-testid, so lookups are page-wide by exact text.
 * Scope them to `getByRole('contentinfo')` once the frontend renders a <footer> element.
 */
export class FooterComponent {
  constructor(private readonly page: Page) {}

  text(content: string): Locator {
    return this.page.getByText(content, { exact: true });
  }

  link(text: string): Locator {
    return this.page.getByRole('link', { name: text, exact: true }).last();
  }
}
