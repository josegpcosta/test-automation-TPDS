import { test, expect, LOCALES } from '@fixtures';
import { env } from '@config/env';
import { findAll } from '@api/strapi/read';
import { ArticleSchema, PageSchema, ProductSchema } from '@schemas/content.schema';

/**
 * Editor-built pages and the SEO metadata the CMS provides for them.
 */
test.describe('Pages and SEO', { tag: ['@e2e', '@content', '@seo'] }, () => {
  for (const locale of LOCALES) {
    test.describe(`locale "${locale}"`, () => {
      test('every published page renders with its CMS title and description', async ({
        strapi,
        page,
        contentPage,
      }) => {
        const pages = await findAll(strapi.pages, PageSchema, { locale });
        test.skip(pages.length === 0, 'No published pages');

        for (const entry of pages) {
          await test.step(entry.slug, async () => {
            const response = await contentPage.open(locale, entry.slug);

            expect(response?.status()).toBe(200);
            await expect.soft(page).toHaveTitle(entry.seo?.metaTitle ?? '');
            await expect
              .soft(contentPage.metaDescription())
              .toHaveAttribute('content', entry.seo?.metaDescription ?? '');
          });
        }
      });

      test(
        'an unknown page returns 404',
        {
          annotation: {
            type: 'known defect',
            description:
              '[slug]/page.tsx generateMetadata reads pageData.seo without a guard. An unknown slug throws (500).',
          },
        },
        async ({ contentPage }) => {
          test.fail();

          const response = await contentPage.open(locale, 'e2e-this-page-does-not-exist');

          expect(response?.status()).toBe(404);
        },
      );

      test(
        'article pages use the article SEO title',
        {
          annotation: {
            type: 'known defect',
            description:
              'blog/[slug]/page.tsx exports no generateMetadata. Articles get the global title; article.seo is ignored.',
          },
        },
        async ({ strapi, page, articlePage }) => {
          test.fail();
          const [article] = (await findAll(strapi.articles, ArticleSchema, { locale })).filter(
            (a) => a.seo,
          );
          test.skip(!article, 'No article with SEO metadata');

          await articlePage.open(locale, article!.slug);

          await expect(page).toHaveTitle(article!.seo!.metaTitle);
        },
      );

      test(
        'product pages have a real title',
        {
          annotation: {
            type: 'known defect',
            description:
              'Products have no SEO component and products/[slug]/page.tsx passes the product as `seo`. Every product page is titled "Default Title".',
          },
        },
        async ({ strapi, page, productDetailPage }) => {
          test.fail();
          const [product] = await findAll(strapi.products, ProductSchema, { locale });
          test.skip(!product, 'No published products');

          await productDetailPage.open(locale, product!.slug);

          await expect(page).not.toHaveTitle('Default Title');
        },
      );

      const isDefaultLocale = locale === env.DEFAULT_LOCALE;

      test(
        'the document language matches the locale',
        {
          annotation: isDefaultLocale
            ? []
            : {
                type: 'known defect',
                description: 'app/layout.tsx hardcodes <html lang="en"> for every locale.',
              },
        },
        async ({ contentPage }) => {
          test.fail(!isDefaultLocale);

          await contentPage.open(locale, 'homepage');

          await expect(contentPage.htmlRoot()).toHaveAttribute('lang', locale);
        },
      );
    });
  }
});
