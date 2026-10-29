import { z } from 'zod';

/**
 * Strapi 5 response envelopes.
 * Entries are flat ({ id, documentId, ...fields }); v4's `attributes` wrapper is gone.
 */

export const IsoDate = z.iso.datetime({ offset: true });

/** Strapi 5 documentId (cuid2). Stable across locales and draft/published versions of a document. */
export const DocumentId = z.string().regex(/^[a-z0-9]{20,32}$/, 'not a Strapi documentId');

/** Strapi `uid` fields accept A-Z a-z 0-9 - _ . ~ */
export const Uid = z.string().regex(/^[A-Za-z0-9\-_.~]+$/, 'not a valid Strapi uid');

export const DocumentBase = z.looseObject({
  id: z.number().int().positive(),
  documentId: DocumentId,
  createdAt: IsoDate,
  updatedAt: IsoDate,
  publishedAt: IsoDate.nullable(),
});

/** What the Public role should receive: published versions only. */
export const PublishedDocument = DocumentBase.extend({ publishedAt: IsoDate });

export const LocalizedDocument = PublishedDocument.extend({ locale: z.string().min(2) });

export const PaginationSchema = z.object({
  page: z.number().int().positive(),
  pageSize: z.number().int().positive(),
  pageCount: z.number().int().nonnegative(),
  total: z.number().int().nonnegative(),
});

export const listResponse = <T extends z.ZodType>(item: T) =>
  z.object({
    data: z.array(item),
    meta: z.object({ pagination: PaginationSchema }),
  });

export const singleResponse = <T extends z.ZodType>(item: T) =>
  z.object({
    data: item,
    meta: z.object({}).loose(),
  });

/** Strapi error envelope: { data: null, error: { status, name, message, details } } */
export const StrapiErrorSchema = z.object({
  data: z.null(),
  error: z.object({
    status: z.number().int(),
    name: z.string().min(1),
    message: z.string().min(1),
    details: z.unknown().optional(),
  }),
});

export type StrapiError = z.infer<typeof StrapiErrorSchema>;
