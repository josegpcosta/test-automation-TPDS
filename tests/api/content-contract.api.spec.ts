import { test, expect, LOCALES } from '@fixtures';
import { parseBody } from '@api/response';
import { LOCALIZED_COLLECTIONS } from '@api/strapi/catalog';
import { findAll } from '@api/strapi/read';
import { listResponse, singleResponse, StrapiErrorSchema } from '@schemas/common.schema';
import {
  GlobalSchema,
  LandingPageSchema,
  LogoSchema,
  ProductSchema,
  RedirectionSchema,
} from '@schemas/content.schema';

/**
 * Contract of the public Content API, per locale, using the same calls the website makes.
 * A failure here means the website will break or render wrong data before any page is opened.
 */
test.describe('Content API contract (Public role)', { tag: '@api' }, () => {
  for (const locale of LOCALES) {
    test.describe(`locale "${locale}"`, () => {
      for (const spec of LOCALIZED_COLLECTIONS) {
        test(`${spec.name} match the contract and belong to the locale`, async ({ strapi }) => {
          const response = await spec.client(strapi).find({ locale });

          await expect(response).toHaveStatus(200);
          const { data, meta } = await parseBody(response, listResponse(spec.schema));

          expect(data.map((entry) => entry.locale).filter((l) => l !== locale)).toEqual([]);
          expect(meta.pagination.pageCount).toBe(
            Math.ceil(meta.pagination.total / meta.pagination.pageSize),
          );
        });
      }

      const singleTypes = [
        { name: 'global', client: 'global', schema: GlobalSchema },
        { name: 'product-page', client: 'productPage', schema: LandingPageSchema },
        { name: 'blog-page', client: 'blogPage', schema: LandingPageSchema },
      ] as const;

      for (const single of singleTypes) {
        test(
          `${single.name} single type matches the contract`,
          { tag: '@smoke' },
          async ({ strapi }) => {
            const response = await strapi[single.client].find({ locale });

            await expect(response).toHaveStatus(200);
            const { data } = await parseBody(response, singleResponse(single.schema));
            expect(data.locale).toBe(locale);
          },
        );
      }
    });
  }

  test('non-localized types match the contract', async ({ strapi }) => {
    const logos = await strapi.logos.find();
    const redirections = await strapi.redirections.find();

    await expect(logos).toHaveStatus(200);
    await expect(redirections).toHaveStatus(200);
    await parseBody(logos, listResponse(LogoSchema));
    await parseBody(redirections, listResponse(RedirectionSchema));
  });

  test('a document is reachable by its documentId', async ({ strapi }) => {
    const [product] = await findAll(strapi.products, ProductSchema, { locale: LOCALES[0] });
    test.skip(!product, 'No published product');

    const response = await strapi.products.findOne(product!.documentId, { locale: LOCALES[0] });

    await expect(response).toHaveStatus(200);
    const { data } = await parseBody(response, singleResponse(ProductSchema));
    expect(data).toMatchObject({
      documentId: product!.documentId,
      slug: product!.slug,
      name: product!.name,
    });
  });

  test('an unknown documentId returns a 404 error envelope', async ({ strapi }) => {
    const response = await strapi.products.findOne('zzzzzzzzzzzzzzzzzzzzzzzz');

    await expect(response).toHaveStatus(404);
    const { error } = await parseBody(response, StrapiErrorSchema);
    expect(error.name).toBe('NotFoundError');
  });

  test('pagination pages do not overlap', async ({ strapi }) => {
    const page = async (n: number) =>
      parseBody(
        await strapi.products.find({
          locale: LOCALES[0],
          sort: ['id:asc'],
          pagination: { page: n, pageSize: 1 },
        }),
        listResponse(ProductSchema),
      );

    const first = await page(1);
    test.skip(first.meta.pagination.total < 2, 'Needs at least 2 published products');
    const second = await page(2);

    expect(second.data[0]?.documentId).not.toBe(first.data[0]?.documentId);
  });

  test('admin-only fields are never exposed', { tag: '@security' }, async ({ strapi }) => {
    // createdBy / updatedBy reference admin users (name, email). They must be stripped from the public API.
    const response = await strapi.products.find({ locale: LOCALES[0] });
    const body = JSON.stringify(await response.json());

    expect(body).not.toContain('"createdBy"');
    expect(body).not.toContain('"updatedBy"');
  });
});
