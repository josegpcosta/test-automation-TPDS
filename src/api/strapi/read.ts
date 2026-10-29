import type { z } from 'zod';
import { parseBody } from '../response';
import type { CollectionClient, SingleTypeClient } from './content.client';
import type { StrapiQuery } from './query';
import { listResponse, singleResponse } from '@schemas/common.schema';

/** maxLimit in LaunchPad's config/api.ts. */
const MAX_PAGE_SIZE = 100;

/**
 * Reads every page of a collection type and validates each page against the schema.
 * Use for catalogue-wide checks; a single request is capped at 100 entries.
 */
export async function findAll<S extends z.ZodType>(
  client: CollectionClient,
  schema: S,
  query: Omit<StrapiQuery, 'pagination'> = {},
): Promise<z.infer<S>[]> {
  const items: z.infer<S>[] = [];

  for (let page = 1; ; page++) {
    const response = await client.find({ ...query, pagination: { page, pageSize: MAX_PAGE_SIZE } });
    if (!response.ok()) {
      throw new Error(`GET ${client.type} page ${page} failed: HTTP ${response.status()}`);
    }

    const { data, meta } = await parseBody(response, listResponse(schema));
    items.push(...data);

    if (page >= meta.pagination.pageCount) return items;
  }
}

/** Reads a single type in one locale and validates it. */
export async function findSingle<S extends z.ZodType>(
  client: SingleTypeClient,
  schema: S,
  query: StrapiQuery = {},
): Promise<z.infer<S>> {
  const response = await client.find(query);
  if (!response.ok()) {
    throw new Error(
      `GET ${client.type} (${query.locale ?? 'default locale'}) failed: HTTP ${response.status()}`,
    );
  }
  const body = (await parseBody(response, singleResponse(schema))) as { data: z.infer<S> };
  return body.data;
}

/** Finds a published entry by slug in one locale, or undefined. */
export async function findBySlug<S extends z.ZodType>(
  client: CollectionClient,
  schema: S,
  slug: string,
  locale: string,
): Promise<z.infer<S> | undefined> {
  const [entry] = await findAll(client, schema, { locale, filters: { slug: { $eq: slug } } });
  return entry;
}
