import { test, expect, LOCALES } from '@fixtures';
import { env } from '@config/env';
import { LOCALIZED_COLLECTIONS } from '@api/strapi/catalog';
import { findAll, findSingle } from '@api/strapi/read';
import {
  ArticleSchema,
  GlobalSchema,
  PageSchema,
  ProductSchema,
  RedirectionSchema,
  RENDERABLE_DYNAMIC_ZONE_COMPONENTS,
} from '@schemas/content.schema';
import { ContentPage } from '@pages/content.page';

/**
 * Content QA: what editors published, checked against what the website needs.
 *
 * Every rule here comes from frontend code that breaks or degrades when the content does not
 * follow it (file references in each test). Soft assertions list every offending entry in one run.
 */
test.describe('Published content integrity', { tag: ['@api', '@content'] }, () => {
  for (const locale of LOCALES) {
    test.describe(`locale "${locale}"`, () => {
      test('the homepage exists', { tag: '@smoke' }, async ({ strapi }) => {
        // app/[locale]/(marketing)/page.tsx reads pageData.seo with no guard: no homepage, no website.
        const pages = await findAll(strapi.pages, PageSchema, {
          locale,
          filters: { slug: { $eq: ContentPage.HOMEPAGE_SLUG } },
        });
        expect(pages).toHaveLength(1);
      });

      test('products can be rendered', async ({ strapi }) => {
        const products = await findAll(strapi.products, ProductSchema, { locale });
        test.skip(products.length === 0, 'No published products');

        for (const product of products) {
          const label = `product "${product.slug}"`;
          // single-product.tsx reads product.images[0].url unguarded.
          expect
            .soft(product.images?.length ?? 0, `${label} has no image (product page crashes)`)
            .toBeGreaterThan(0);
          expect.soft(product.price, `${label} has no price`).not.toBeNull();
          expect.soft(product.description, `${label} has no description`).toBeTruthy();
        }
      });

      test('pages and articles have SEO metadata', async ({ strapi }) => {
        const [pages, articles] = await Promise.all([
          findAll(strapi.pages, PageSchema, { locale }),
          findAll(strapi.articles, ArticleSchema, { locale }),
        ]);

        for (const entry of [...pages, ...articles]) {
          expect
            .soft(entry.seo, `${entry.slug} has no SEO component (falls back to "Default Title")`)
            .not.toBeNull();
        }
      });

      for (const spec of LOCALIZED_COLLECTIONS.filter((s) => s.slugField)) {
        test(`${spec.name} slugs are unique`, async ({ strapi }) => {
          const entries = await findAll(spec.client(strapi), spec.schema, { locale });
          const slugs = entries.map((e) => e.slug);
          const duplicates = slugs.filter((slug, i) => slugs.indexOf(slug) !== i);
          expect(duplicates).toEqual([]);
        });
      }

      test('dynamic zones only use components the website can render', async ({ strapi }) => {
        // dynamic-zone/manager.tsx drops unknown components with a console.warn: the section just vanishes.
        const [pages, articles, products] = await Promise.all([
          findAll(strapi.pages, PageSchema, { locale }),
          findAll(strapi.articles, ArticleSchema, { locale }),
          findAll(strapi.products, ProductSchema, { locale }),
        ]);

        for (const entry of [...pages, ...articles, ...products]) {
          for (const block of entry.dynamic_zone ?? []) {
            expect
              .soft(RENDERABLE_DYNAMIC_ZONE_COMPONENTS, `${entry.slug}: ${block.__component}`)
              .toContain(block.__component);
          }
        }
      });

      test('navbar links are internal paths', async ({ strapi }) => {
        // desktop-navbar.tsx renders href={`/${locale}${item.URL}`}. An absolute URL becomes "/en/https://...".
        const global = await findSingle(strapi.global, GlobalSchema, { locale });
        const items = [...global.navbar.left_navbar_items, ...global.navbar.right_navbar_items];

        for (const item of items) {
          expect.soft(item.text, `navbar item ${item.id} has no text`).toBeTruthy();
          expect.soft(item.URL ?? '', `navbar item "${item.text}"`).toMatch(/^\/[^/]/);
        }
      });

      test('product images resolve', async ({ strapi, request }) => {
        const products = await findAll(strapi.products, ProductSchema, { locale });
        const urls = [
          ...new Set(products.flatMap((p) => (p.images ?? []).map((image) => image.url))),
        ];
        test.skip(urls.length === 0, 'No product images');

        const results = await Promise.all(
          urls.map(async (url) => {
            const absolute = new URL(url, env.STRAPI_URL).toString();
            const response = await request.head(absolute, { failOnStatusCode: false });
            return {
              url: absolute,
              status: response.status(),
              type: response.headers()['content-type'] ?? '',
            };
          }),
        );

        for (const media of results) {
          expect.soft(media.status, media.url).toBe(200);
          expect.soft(media.type, `${media.url} content-type`).toMatch(/^image\//);
        }
      });
    });
  }

  test('redirections have no loops or chains', async ({ strapi }) => {
    const redirections = await findAll(strapi.redirections, RedirectionSchema);
    const sources = new Set(redirections.map((r) => r.source));

    for (const { source, destination } of redirections) {
      expect.soft(destination, `${source} redirects to itself`).not.toBe(source);
      expect
        .soft(sources.has(destination), `${source} → ${destination} is itself redirected`)
        .toBe(false);
    }
    expect(sources.size, 'duplicate redirection sources').toBe(redirections.length);
  });
});
