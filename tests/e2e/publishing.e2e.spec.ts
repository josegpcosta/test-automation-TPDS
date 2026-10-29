import { test, expect, API_TOKEN_REQUIRED, LOCALES } from '@fixtures';
import { env } from '@config/env';
import { randomUUID } from 'node:crypto';

/**
 * Editorial workflow end to end: content changed in the CMS through the API, observed on the website.
 *
 * The website caches Strapi responses (Next.js `use cache`, cacheLife('minutes')), so changes are
 * polled for up to PUBLISH_PROPAGATION_TIMEOUT_MS. A failure means editors publish and readers do
 * not see it within that window.
 */
test.describe('Publishing workflow', { tag: ['@e2e', '@content', '@slow'] }, () => {
  test.skip(...API_TOKEN_REQUIRED);
  test.describe.configure({
    mode: 'serial',
    timeout: env.PUBLISH_PROPAGATION_TIMEOUT_MS * 3 + 60_000,
  });

  const locale = LOCALES[0]!;
  const poll = { timeout: env.PUBLISH_PROPAGATION_TIMEOUT_MS, intervals: [2_000, 5_000, 10_000] };

  test('a published article reaches the website and a draft never does', async ({
    page,
    contentFactory,
    blogPage,
    articlePage,
  }) => {
    const draft = await contentFactory.createArticle({ locale });
    const published = await contentFactory.createArticle({ locale, publish: true });

    await test.step('published article appears on the blog', async () => {
      await expect(async () => {
        await blogPage.open(locale);
        await expect(blogPage.articleCard(locale, published.slug)).toBeVisible({ timeout: 1_000 });
      }).toPass(poll);
    });

    await test.step('the draft created at the same time is not on the blog', async () => {
      // The cache was refreshed after both writes, so absence here is meaningful.
      await expect(blogPage.articleCard(locale, draft.slug)).toHaveCount(0);
    });

    await test.step('the draft URL does not render the draft', async () => {
      await articlePage.open(locale, draft.slug);
      await expect(page.getByText(draft.title)).toHaveCount(0);
    });
  });

  test('a deleted article disappears from the website', async ({
    adminStrapi,
    contentFactory,
    blogPage,
  }) => {
    const article = await contentFactory.createArticle({ locale, publish: true });
    await expect(async () => {
      await blogPage.open(locale);
      await expect(blogPage.articleCard(locale, article.slug)).toBeVisible({ timeout: 1_000 });
    }).toPass(poll);

    await expect(await adminStrapi!.articles.remove(article.documentId, { locale })).toHaveStatus([
      200, 204,
    ]);

    await expect(async () => {
      await blogPage.open(locale);
      await expect(blogPage.articleCard(locale, article.slug)).toHaveCount(0, { timeout: 1_000 });
    }).toPass(poll);
  });

  test(
    'a new CMS redirection takes effect without a redeploy',
    {
      annotation: {
        type: 'known defect',
        description:
          'next.config.mjs loads redirections once, at build/start. New or changed redirections need a redeploy. ' +
          'Use a middleware or a revalidated route to read them at request time.',
      },
    },
    async ({ contentFactory, request }) => {
      test.fail();
      const source = `/e2e-redirect-${randomUUID().slice(0, 8)}`;
      await contentFactory.createRedirection(source, '/products');

      await expect(async () => {
        const response = await request.get(`/${locale}${source}`, {
          maxRedirects: 0,
          failOnStatusCode: false,
        });
        expect(response.headers()['location'] ?? '').toMatch(new RegExp(`/${locale}/products$`));
      }).toPass(poll);
    },
  );
});
