import type { z } from 'zod';
import type { StrapiClient } from './strapi.client';
import type { CollectionClient } from './content.client';
import {
  ArticleSchema,
  CategorySchema,
  FaqSchema,
  PageSchema,
  PlanSchema,
  ProductSchema,
  TestimonialSchema,
} from '@schemas/content.schema';

/**
 * Registry of LaunchPad collection types with the facts tests need about each one:
 * whether it is localized, whether Draft & Publish is on, and its contract schema.
 * Mirrors strapi/src/api/<type>/content-types/<type>/schema.json.
 */
export type CollectionSpec = {
  name: string;
  client: (strapi: StrapiClient) => CollectionClient;
  schema: z.ZodType<{ documentId: string; locale: string; slug?: string }>;
  draftAndPublish: boolean;
  /** Slug that must be unique per locale, if the type has one. */
  slugField?: 'slug';
  /** True when the slug is shared by every locale (not localized in the CMS). */
  sharedSlug?: boolean;
};

export const LOCALIZED_COLLECTIONS: CollectionSpec[] = [
  {
    name: 'articles',
    client: (s) => s.articles,
    schema: ArticleSchema,
    draftAndPublish: true,
    slugField: 'slug',
  },
  {
    name: 'products',
    client: (s) => s.products,
    schema: ProductSchema,
    draftAndPublish: true,
    slugField: 'slug',
    sharedSlug: true,
  },
  {
    name: 'pages',
    client: (s) => s.pages,
    schema: PageSchema,
    draftAndPublish: true,
    slugField: 'slug',
  },
  { name: 'plans', client: (s) => s.plans, schema: PlanSchema, draftAndPublish: true },
  {
    name: 'testimonials',
    client: (s) => s.testimonials,
    schema: TestimonialSchema,
    draftAndPublish: true,
  },
  {
    name: 'categories',
    client: (s) => s.categories,
    schema: CategorySchema,
    draftAndPublish: false,
  },
  { name: 'faqs', client: (s) => s.faqs, schema: FaqSchema, draftAndPublish: false },
];

/** Every collection type with Draft & Publish on, localized or not. */
export const DRAFT_AND_PUBLISH_TYPES = [
  'articles',
  'products',
  'pages',
  'plans',
  'testimonials',
  'redirections',
] as const;

/** Every collection type exposed to the Public role. */
export const PUBLIC_COLLECTIONS = [
  'articles',
  'products',
  'plans',
  'pages',
  'categories',
  'faqs',
  'testimonials',
  'logos',
  'redirections',
] as const;
