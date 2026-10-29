import type { Locator, Page } from '@playwright/test';
import { BasePage } from './base.page';

/** /{locale}/products. Heading from single type `product-page`, cards from collection `products`. */
export class ProductListPage extends BasePage {
  readonly heading: Locator;

  constructor(page: Page) {
    super(page);
    this.heading = page.getByRole('heading', { level: 1 });
  }

  open(locale: string) {
    return this.visit(locale, '/products');
  }

  /** Featured and regular listings can both show a product; the first card is enough. */
  productCard(locale: string, slug: string): Locator {
    return this.page.locator(`a[href="/${locale}/products/${slug}"]`).first();
  }
}
