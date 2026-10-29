import { test, expect, API_TOKEN_REQUIRED, LOCALES } from '@fixtures';
import type { APIResponse } from '@playwright/test';
import { readJson } from '@api/response';
import { DRAFT_AND_PUBLISH_TYPES } from '@api/strapi/catalog';
import { findAll } from '@api/strapi/read';
import { ArticleSchema } from '@schemas/content.schema';
import { z } from 'zod';

const VersionSchema = z.looseObject({ documentId: z.string(), publishedAt: z.string().nullable() });

/** Entries of a list response that are draft versions (publishedAt = null). Non-2xx counts as none. */
async function draftVersions(response: APIResponse) {
  if (!response.ok()) return [];
  const body = z.object({ data: z.array(VersionSchema) }).parse(await readJson(response));
  return body.data.filter((entry) => entry.publishedAt === null);
}

/**
 * Draft & Publish: the website and the Public role must only see published versions.
 */
test.describe('Draft & Publish', { tag: ['@api', '@content'] }, () => {
  test.describe('Public role and ?status=draft', { tag: '@security' }, () => {
    for (const type of DRAFT_AND_PUBLISH_TYPES) {
      test(
        `${type}: drafts are not readable by the Public role`,
        {
          annotation: {
            type: 'known defect',
            description:
              'Strapi 5 accepts status=draft from any role with find. LaunchPad depends on it: the Next.js ' +
              'preview fetches drafts without a token (lib/strapi/client.ts). Unpublished content is public. ' +
              'Preview should use a read-only API token and the Public role should only see published content.',
          },
        },
        async ({ strapi }) => {
          test.fail();

          const response = await strapi.collection(type).find({ status: 'draft' });

          expect(await draftVersions(response)).toEqual([]);
        },
      );
    }
  });

  test.describe('lifecycle of an article', () => {
    test.skip(...API_TOKEN_REQUIRED);

    test('a draft is invisible until published, then visible, then gone after delete', async ({
      strapi,
      adminStrapi,
      contentFactory,
    }) => {
      const locale = LOCALES[0]!;
      const draft = await contentFactory.createArticle({ locale });
      const bySlug = { locale, filters: { slug: { $eq: draft.slug } } };

      await test.step('draft: admin sees it, public listing does not', async () => {
        const asAdmin = await findAll(adminStrapi!.articles, VersionSchema, {
          ...bySlug,
          status: 'draft',
        });
        expect(asAdmin.map((a) => a.documentId)).toEqual([draft.documentId]);

        expect(await findAll(strapi.articles, ArticleSchema, bySlug)).toEqual([]);
        await expect(await strapi.articles.findOne(draft.documentId, { locale })).toHaveStatus(404);
      });

      await test.step('published: public sees it', async () => {
        await contentFactory.publishArticle(draft.documentId, locale);

        const published = await findAll(strapi.articles, ArticleSchema, bySlug);
        expect(published.map((a) => a.title)).toEqual([draft.title]);
        expect(published[0]!.publishedAt).not.toBeNull();
      });

      await test.step('deleted: public no longer sees it', async () => {
        await expect(await adminStrapi!.articles.remove(draft.documentId, { locale })).toHaveStatus(
          [200, 204],
        );

        expect(await findAll(strapi.articles, ArticleSchema, bySlug)).toEqual([]);
      });
    });

    test('publishing one locale does not publish the others', async ({
      strapi,
      contentFactory,
    }) => {
      test.skip(LOCALES.length < 2, 'Only one locale configured');
      const [main, other] = LOCALES as [string, string];

      const article = await contentFactory.createArticle({ locale: main, publish: true });
      await contentFactory.localizeArticle(article.documentId, {
        locale: other,
        input: {
          title: `${article.title} (${other})`,
          description: article.description,
          slug: `${article.slug}-${other}`,
        },
      });

      const inOther = await findAll(strapi.articles, ArticleSchema, {
        locale: other,
        filters: { documentId: { $eq: article.documentId } },
      });
      expect(inOther).toEqual([]);
    });
  });
});
