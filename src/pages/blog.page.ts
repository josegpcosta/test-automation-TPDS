import type { Locator, Page } from '@playwright/test';
import { BasePage } from './base.page';

/** /{locale}/blog. Heading from single type `blog-page`, list from collection `articles`. */
export class BlogPage extends BasePage {
  readonly heading: Locator;

  constructor(page: Page) {
    super(page);
    this.heading = page.getByRole('heading', { level: 1 });
  }

  open(locale: string) {
    return this.visit(locale, '/blog');
  }

  articleCard(locale: string, slug: string): Locator {
    return this.page.locator(`a[href="/${locale}/blog/${slug}"]`).first();
  }
}

/** /{locale}/blog/{slug} */
export class ArticlePage extends BasePage {
  readonly title: Locator;
  readonly backLink: Locator;
  readonly publishedDate: Locator;

  constructor(page: Page) {
    super(page);
    this.title = page.getByRole('heading', { level: 1 });
    this.backLink = page.getByRole('link', { name: 'Back', exact: true });
    this.publishedDate = page.locator('time');
  }

  open(locale: string, slug: string) {
    return this.visit(locale, `/blog/${slug}`);
  }
}
