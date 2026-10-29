import { expect, type Locator, type Page } from '@playwright/test';
import { BasePage } from './base.page';

/** /{locale}/products/{slug}. Product from the CMS, button labels from the `global` single type. */
export class ProductDetailPage extends BasePage {
  readonly name: Locator;
  readonly cartHeading: Locator;

  constructor(page: Page) {
    super(page);
    this.name = page.getByRole('heading', { level: 1 });
    this.cartHeading = page.getByRole('heading', { level: 4 }).filter({ visible: true });
  }

  open(locale: string, slug: string) {
    return this.visit(locale, `/products/${slug}`);
  }

  text(content: string): Locator {
    return this.page.getByText(content, { exact: true });
  }

  button(label: string): Locator {
    return this.page.getByRole('button', { name: label, exact: true });
  }

  /**
   * Adds the product and opens the cart modal. The page is server-rendered, so a click that lands
   * before hydration does nothing; the click is retried until the modal opens.
   */
  async addToCart(label: string): Promise<void> {
    await expect(async () => {
      await this.button(label).click();
      await expect(this.cartHeading).toBeVisible({ timeout: 1_000 });
    }).toPass({ timeout: 15_000 });
  }
}

/**
 * Price exactly as the frontend renders it (components/products/single-product.tsx):
 * a currency symbol picked from the locale, then Intl.NumberFormat in that locale.
 * The amount itself is not converted; each locale stores its own price in the CMS.
 */
export function formatPrice(price: number, locale: string): string {
  const symbol = locale === 'fr' ? '€' : '$';
  const amount = new Intl.NumberFormat(locale, {
    style: 'decimal',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(price);
  return `${symbol}${amount}`;
}
