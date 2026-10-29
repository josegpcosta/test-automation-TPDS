import type { APIResponse } from '@playwright/test';
import { z } from 'zod';
import { apiTest } from './api.fixture';
import { expect } from './matchers';
import { parseBody } from '@api/response';
import type { CollectionType } from '@api/strapi/content.client';
import { DocumentId, IsoDate, singleResponse } from '@schemas/common.schema';
import { anArticle, type ArticleInput } from '@data/article.builder';
import { env } from '@config/env';

const WrittenDocumentSchema = z.looseObject({
  documentId: DocumentId,
  locale: z.string().nullable().optional(),
  publishedAt: IsoDate.nullable(),
});

export type CreatedArticle = ArticleInput &
  z.infer<typeof WrittenDocumentSchema> & { locale: string };

export type ContentFactory = {
  /** Creates an article in one locale. Draft unless `publish: true`. */
  createArticle(options?: {
    input?: ArticleInput;
    locale?: string;
    publish?: boolean;
  }): Promise<CreatedArticle>;
  /** Adds a localization to an existing article (PUT with a locale that does not exist yet). */
  localizeArticle(
    documentId: string,
    options: { locale: string; input: ArticleInput; publish?: boolean },
  ): Promise<CreatedArticle>;
  /** Publishes the current draft of one localization. */
  publishArticle(documentId: string, locale: string): Promise<void>;
  /** Creates and publishes a redirection (non-localized). */
  createRedirection(source: string, destination: string): Promise<{ documentId: string }>;
};

type ContentFixtures = {
  /**
   * Creates CMS content through the API with STRAPI_API_TOKEN and deletes it after the test,
   * in every locale it was created in.
   */
  contentFactory: ContentFactory;
};

// Strapi 5 answers 201 on create and 200 on update; 204 on delete.
const WRITE_OK = [200, 201];
const DELETE_OK = [200, 204, 404];

export const contentTest = apiTest.extend<ContentFixtures>({
  contentFactory: async ({ adminStrapi }, use, testInfo) => {
    if (!adminStrapi) {
      throw new Error(
        'contentFactory needs STRAPI_API_TOKEN. Guard the test with test.skip(...API_TOKEN_REQUIRED).',
      );
    }

    const created = new Map<string, { type: CollectionType; locales: Set<string> }>();
    const track = (type: CollectionType, documentId: string, locale: string) => {
      const entry = created.get(documentId) ?? { type, locales: new Set<string>() };
      entry.locales.add(locale);
      created.set(documentId, entry);
    };
    const readWritten = async (response: APIResponse) =>
      (await parseBody(response, singleResponse(WrittenDocumentSchema))).data;
    // Strapi 5 REST publishes on create/update unless `status=draft` is sent explicitly.
    const status = (publish: boolean) => ({
      status: publish ? ('published' as const) : ('draft' as const),
    });

    await use({
      async createArticle({
        input = anArticle().build(),
        locale = env.DEFAULT_LOCALE,
        publish = false,
      } = {}) {
        const response = await adminStrapi.articles.create(input, { locale, ...status(publish) });
        await expect(response, `create article "${input.slug}" (${locale})`).toHaveStatus(WRITE_OK);
        const written = await readWritten(response);
        track('articles', written.documentId, locale);
        return { ...input, ...written, locale };
      },

      async localizeArticle(documentId, { locale, input, publish = false }) {
        const response = await adminStrapi.articles.update(documentId, input, {
          locale,
          ...status(publish),
        });
        await expect(response, `add ${locale} localization to ${documentId}`).toHaveStatus(
          WRITE_OK,
        );
        track('articles', documentId, locale);
        return { ...input, ...(await readWritten(response)), locale };
      },

      async publishArticle(documentId, locale) {
        const response = await adminStrapi.articles.update(
          documentId,
          {},
          { locale, status: 'published' },
        );
        await expect(response, `publish ${documentId} (${locale})`).toHaveStatus(WRITE_OK);
      },

      async createRedirection(source, destination) {
        const response = await adminStrapi.redirections.create(
          { source, destination },
          { status: 'published' },
        );
        await expect(response, `create redirection ${source} -> ${destination}`).toHaveStatus(
          WRITE_OK,
        );
        const { documentId } = await readWritten(response);
        track('redirections', documentId, '');
        return { documentId };
      },
    });

    for (const [documentId, { type, locales }] of created) {
      for (const locale of locales) {
        // Non-localized entries are tracked with an empty locale and deleted without one.
        const response = await adminStrapi
          .collection(type)
          .remove(documentId, locale ? { locale } : undefined);
        if (!DELETE_OK.includes(response.status())) {
          testInfo.annotations.push({
            type: 'cleanup',
            description: `Could not delete ${type}/${documentId} (${locale}): HTTP ${response.status()}`,
          });
        }
      }
    }
  },
});
