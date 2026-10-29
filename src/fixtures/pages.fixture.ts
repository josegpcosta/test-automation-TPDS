import { contentTest } from './content.fixture';
import { ContentPage } from '@pages/content.page';
import { ProductListPage } from '@pages/product-list.page';
import { ProductDetailPage } from '@pages/product-detail.page';
import { ArticlePage, BlogPage } from '@pages/blog.page';

type PageFixtures = {
  contentPage: ContentPage;
  productListPage: ProductListPage;
  productDetailPage: ProductDetailPage;
  blogPage: BlogPage;
  articlePage: ArticlePage;
};

export const pagesTest = contentTest.extend<PageFixtures>({
  contentPage: async ({ page }, use) => {
    await use(new ContentPage(page));
  },
  productListPage: async ({ page }, use) => {
    await use(new ProductListPage(page));
  },
  productDetailPage: async ({ page }, use) => {
    await use(new ProductDetailPage(page));
  },
  blogPage: async ({ page }, use) => {
    await use(new BlogPage(page));
  },
  articlePage: async ({ page }, use) => {
    await use(new ArticlePage(page));
  },
});
