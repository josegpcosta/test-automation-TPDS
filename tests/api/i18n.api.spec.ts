import { test, expect, LOCALES } from '@fixtures';
import { LOCALIZED_COLLECTIONS } from '@api/strapi/catalog';
import { findAll, findSingle } from '@api/strapi/read';
import { ArticleSchema, GlobalSchema, PageSchema, ProductSchema } from '@schemas/content.schema';

/**
 * Localization quality of published content.
 *
 * The website renders /en and /fr from the same routes. A document published in one locale and
 * missing (or still a draft) in another produces empty sections, broken locale switching and
 * pages that exist in one language only.
 */
test.describe('Localization', { tag: ['@api', '@content', '@i18n'] }, () => {
  test.skip(LOCALES.length < 2, 'Only one locale configured');

  for (const spec of LOCALIZED_COLLECTIONS) {
    test(`every published ${spec.name} document exists in every locale`, async ({ strapi }) => {
      const byLocale = new Map<string, Set<string>>();
      const labels = new Map<string, string>();
      for (const locale of LOCALES) {
        const entries = await findAll(spec.client(strapi), spec.schema, { locale });
        byLocale.set(locale, new Set(entries.map((entry) => entry.documentId)));
        entries.forEach((e) =>
          labels.set(e.documentId, e.slug ? `${e.slug} (${e.locale})` : e.documentId),
        );
      }

      const allDocuments = new Set([...byLocale.values()].flatMap((ids) => [...ids]));
      for (const locale of LOCALES) {
        const missing = [...allDocuments]
          .filter((id) => !byLocale.get(locale)!.has(id))
          .map((id) => labels.get(id));
        expect.soft(missing, `${spec.name} published elsewhere but not in "${locale}"`).toEqual([]);
      }
    });
  }

  const linkedTypes = [
    { name: 'articles', client: 'articles', schema: ArticleSchema },
    { name: 'products', client: 'products', schema: ProductSchema },
    { name: 'pages', client: 'pages', schema: PageSchema },
  ] as const;

  for (const type of linkedTypes) {
    test(`${type.name} localization links point to published documents`, async ({ strapi }) => {
      // The locale switcher builds its URLs from `localizations`. A link to a draft leads nowhere.
      const published = new Map<string, Set<string>>();
      const all = [];
      for (const locale of LOCALES) {
        const entries = await findAll(strapi[type.client], type.schema, { locale });
        published.set(locale, new Set(entries.map((e) => e.documentId)));
        all.push(...entries);
      }

      for (const entry of all) {
        for (const link of entry.localizations) {
          expect
            .soft(
              published.get(link.locale)?.has(link.documentId),
              `${type.name} ${entry.documentId} (${entry.locale}) → ${link.locale}`,
            )
            .toBe(true);
        }
      }
    });
  }

  test('product slugs are shared across locales', async ({ strapi }) => {
    // `slug` is not localized on products, so /en/products/x and /fr/products/x are the same product.
    const slugsByDocument = new Map<string, Set<string>>();
    for (const locale of LOCALES) {
      for (const product of await findAll(strapi.products, ProductSchema, { locale })) {
        const slugs = slugsByDocument.get(product.documentId) ?? new Set<string>();
        slugs.add(product.slug);
        slugsByDocument.set(product.documentId, slugs);
      }
    }

    for (const [documentId, slugs] of slugsByDocument) {
      expect.soft([...slugs], `product ${documentId}`).toHaveLength(1);
    }
  });

  test('UI strings in the global single type are translated', async ({ strapi }) => {
    const globals = await Promise.all(
      LOCALES.map((locale) => findSingle(strapi.global, GlobalSchema, { locale })),
    );

    for (const field of ['add_to_cart', 'your_cart', 'buy_now'] as const) {
      const values = globals.map((g) => g[field]);
      expect
        .soft(
          values.every(Boolean),
          `global.${field} is empty in some locale: ${JSON.stringify(values)}`,
        )
        .toBe(true);
      expect
        .soft(new Set(values).size, `global.${field} has the same text in every locale`)
        .toBe(LOCALES.length);
    }
  });
});
