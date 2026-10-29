import { test, expect, LOCALES } from '@fixtures';
import { env } from '@config/env';
import { findAll } from '@api/strapi/read';
import { ArticleSchema, ProductSchema } from '@schemas/content.schema';

/**
 * Locale routing and switching. Every route is /{locale}/...; the proxy picks a locale from
 * Accept-Language when it is missing, and the switcher uses CMS `localizations` to keep the reader
 * on the same document.
 */
test.describe('Internationalisation', { tag: ['@e2e', '@i18n'] }, () => {
  for (const locale of LOCALES) {
    test.describe(`browser language "${locale}"`, () => {
      test.use({ locale });

      test('a URL without locale redirects to the browser language', async ({ page }) => {
        await page.goto('/');

        await expect(page).toHaveURL(new RegExp(`/${locale}/?$`));
      });
    });
  }

  test.describe('locale switcher', () => {
    test.skip(LOCALES.length < 2, 'Only one locale configured');
    const [from, to] = LOCALES as [string, string];

    test(`switching ${from} → ${to} on an article opens its translation`, async ({
      strapi,
      page,
      articlePage,
    }) => {
      const article = (await findAll(strapi.articles, ArticleSchema, { locale: from })).find((a) =>
        a.localizations.some((l) => l.locale === to && l.slug),
      );
      test.skip(!article, `No article published in both ${from} and ${to}`);
      const translatedSlug = article!.localizations.find((l) => l.locale === to)!.slug!;

      await articlePage.open(from, article!.slug);
      await articlePage.navbar.localeLink(to).click();

      await expect(page).toHaveURL(new RegExp(`/${to}/blog/${translatedSlug}$`));
    });

    test(`switching ${from} → ${to} on a product keeps the product`, async ({
      strapi,
      page,
      productDetailPage,
    }) => {
      const [product] = await findAll(strapi.products, ProductSchema, { locale: from });
      test.skip(!product, 'No published products');
      const [translated] = await findAll(strapi.products, ProductSchema, {
        locale: to,
        filters: { documentId: { $eq: product!.documentId } },
      });
      test.skip(!translated, `Product not published in ${to}`);

      await productDetailPage.open(from, product!.slug);
      await productDetailPage.navbar.localeLink(to).click();

      await expect(page).toHaveURL(new RegExp(`/${to}/products/${product!.slug}$`));
      await expect(productDetailPage.name).toHaveText(translated!.name);
    });
  });

  for (const locale of LOCALES.filter((l) => l !== env.DEFAULT_LOCALE)) {
    test.describe(`locale "${locale}" with a ${env.DEFAULT_LOCALE} browser`, () => {
      test.use({ locale: env.DEFAULT_LOCALE });

      test(
        'the article back link stays in the reader locale',
        {
          annotation: {
            type: 'known defect',
            description:
              'blog-layout.tsx links to "/blog" without the locale; the proxy then picks the browser language.',
          },
        },
        async ({ strapi, page, articlePage }) => {
          test.fail();
          const [article] = await findAll(strapi.articles, ArticleSchema, { locale });
          test.skip(!article, `No published article in ${locale}`);

          await articlePage.open(locale, article!.slug);
          await articlePage.backLink.click();

          await expect(page).toHaveURL(new RegExp(`/${locale}/blog$`));
        },
      );

      test(
        'an unknown product sends the reader to the listing in their locale',
        {
          annotation: {
            type: 'known defect',
            description: 'products/[slug]/page.tsx calls redirect("/products") without the locale.',
          },
        },
        async ({ page, productDetailPage }) => {
          test.fail();

          await productDetailPage.open(locale, 'e2e-this-product-does-not-exist');

          await expect(page).toHaveURL(new RegExp(`/${locale}/products$`));
        },
      );
    });
  }
});
