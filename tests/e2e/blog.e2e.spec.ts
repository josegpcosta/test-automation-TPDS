import { test, expect, LOCALES } from '@fixtures';
import { findAll, findSingle } from '@api/strapi/read';
import { ArticleSchema, LandingPageSchema } from '@schemas/content.schema';

test.describe('Blog', { tag: ['@e2e', '@content'] }, () => {
  for (const locale of LOCALES) {
    test.describe(`locale "${locale}"`, () => {
      test(
        'the blog lists every published article',
        { tag: '@smoke' },
        async ({ strapi, blogPage }) => {
          const [copy, articles] = await Promise.all([
            findSingle(strapi.blogPage, LandingPageSchema, { locale }),
            findAll(strapi.articles, ArticleSchema, { locale }),
          ]);

          await blogPage.open(locale);

          await expect(blogPage.heading).toHaveText(copy.heading ?? '');
          for (const article of articles) {
            await expect
              .soft(blogPage.articleCard(locale, article.slug), article.slug)
              .toContainText(article.title);
          }
        },
      );

      test('each article page renders its title and publication date', async ({
        strapi,
        articlePage,
      }) => {
        const articles = await findAll(strapi.articles, ArticleSchema, { locale });
        test.skip(articles.length === 0, 'No published articles');

        for (const article of articles) {
          await test.step(article.slug, async () => {
            const response = await articlePage.open(locale, article.slug);

            expect(response?.status()).toBe(200);
            await expect(articlePage.title).toHaveText(article.title);
            await expect
              .soft(articlePage.publishedDate)
              .toHaveAttribute('datetime', article.publishedAt);
          });
        }
      });

      test(
        'an unknown article returns 404',
        {
          annotation: {
            type: 'known defect',
            description:
              'blog/[slug]/page.tsx renders "Blog not found" with HTTP 200 (soft 404) instead of notFound().',
          },
        },
        async ({ articlePage }) => {
          test.fail();

          const response = await articlePage.open(locale, 'e2e-this-article-does-not-exist');

          expect(response?.status()).toBe(404);
        },
      );
    });
  }
});
