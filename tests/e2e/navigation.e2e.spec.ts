import { test, expect, LOCALES } from '@fixtures';
import { findAll, findSingle } from '@api/strapi/read';
import { GlobalSchema, RedirectionSchema } from '@schemas/content.schema';

/**
 * Site-wide elements managed in the CMS: navbar and footer (single type `global`) and
 * redirections (collection `redirections`, loaded by next.config.mjs).
 */
test.describe('Navigation', { tag: ['@e2e', '@content'] }, () => {
  for (const locale of LOCALES) {
    test.describe(`locale "${locale}"`, () => {
      test(
        'the navbar renders every CMS item with a localized link',
        { tag: '@smoke' },
        async ({ strapi, contentPage }) => {
          const global = await findSingle(strapi.global, GlobalSchema, { locale });
          const items = [
            ...global.navbar.left_navbar_items,
            ...global.navbar.right_navbar_items,
          ].filter((i) => i.text);

          await contentPage.open(locale, 'homepage');

          for (const item of items) {
            await expect
              .soft(contentPage.navbar.link(item.text!), item.text!)
              .toHaveAttribute('href', `/${locale}${item.URL}`);
          }
        },
      );

      test('the footer shows the CMS description and copyright', async ({
        strapi,
        contentPage,
      }) => {
        const { footer } = await findSingle(strapi.global, GlobalSchema, { locale });

        await contentPage.open(locale, 'homepage');

        await expect.soft(contentPage.footer.text(footer.description ?? '')).toBeVisible();
        await expect.soft(contentPage.footer.text(footer.copyright ?? '')).toBeVisible();
      });

      test('CMS redirections are applied', async ({ strapi, request }) => {
        const redirections = await findAll(strapi.redirections, RedirectionSchema);
        test.skip(redirections.length === 0, 'No redirections in the CMS');

        for (const { source, destination } of redirections) {
          const response = await request.get(`/${locale}${source}`, {
            maxRedirects: 0,
            failOnStatusCode: false,
          });

          expect.soft([307, 308], `${source} status`).toContain(response.status());
          expect
            .soft(response.headers()['location'] ?? '', `${source} location`)
            .toMatch(new RegExp(`/${locale}${destination}$`));
        }
      });
    });
  }
});
