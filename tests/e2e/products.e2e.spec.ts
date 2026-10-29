import { test, expect, LOCALES } from '@fixtures';
import { env } from '@config/env';
import { findAll, findSingle } from '@api/strapi/read';
import { GlobalSchema, LandingPageSchema, ProductSchema } from '@schemas/content.schema';
import { formatPrice } from '@pages/product-detail.page';

/**
 * CMS → website consistency for the product catalogue.
 * Expected values are read from the CMS at runtime, so the tests follow whatever editors publish.
 */
test.describe('Products', { tag: ['@e2e', '@content'] }, () => {
  for (const locale of LOCALES) {
    test.describe(`locale "${locale}"`, () => {
      test(
        'the listing shows every published product',
        { tag: '@smoke' },
        async ({ strapi, productListPage }) => {
          const [copy, products] = await Promise.all([
            findSingle(strapi.productPage, LandingPageSchema, { locale }),
            findAll(strapi.products, ProductSchema, { locale }),
          ]);

          await productListPage.open(locale);

          await expect(productListPage.heading).toHaveText(copy.heading ?? '');
          for (const product of products) {
            await expect
              .soft(productListPage.productCard(locale, product.slug), product.slug)
              .toContainText(product.name);
          }
        },
      );

      test('each product page renders its CMS content', async ({ strapi, productDetailPage }) => {
        const [global, products] = await Promise.all([
          findSingle(strapi.global, GlobalSchema, { locale }),
          findAll(strapi.products, ProductSchema, { locale }),
        ]);
        test.skip(products.length === 0, 'No published products');

        for (const product of products) {
          await test.step(product.slug, async () => {
            const response = await productDetailPage.open(locale, product.slug);

            expect(response?.status()).toBe(200);
            await expect(productDetailPage.name).toHaveText(product.name);
            await expect
              .soft(productDetailPage.text(formatPrice(product.price ?? 0, locale)))
              .toBeVisible();
            await expect.soft(productDetailPage.text(product.description ?? '')).toBeVisible();
            await expect.soft(productDetailPage.button(global.add_to_cart ?? '')).toBeVisible();
          });
        }
      });

      const isDefaultLocale = locale === env.DEFAULT_LOCALE;

      test(
        'the cart title uses the CMS translation',
        {
          annotation: isDefaultLocale
            ? []
            : {
                type: 'known defect',
                description:
                  'products/modal.tsx hardcodes "Your cart" and ignores global.your_cart.',
              },
        },
        async ({ strapi, productDetailPage }) => {
          test.fail(!isDefaultLocale);
          const [global, [product]] = await Promise.all([
            findSingle(strapi.global, GlobalSchema, { locale }),
            findAll(strapi.products, ProductSchema, { locale }),
          ]);
          test.skip(!product, 'No published products');

          await productDetailPage.open(locale, product!.slug);
          await productDetailPage.addToCart(global.add_to_cart ?? '');

          await expect(productDetailPage.cartHeading).toHaveText(global.your_cart ?? '');
        },
      );
    });
  }
});
