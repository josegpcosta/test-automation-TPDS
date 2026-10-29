import { z } from 'zod';
import {
  DocumentBase,
  DocumentId,
  LocalizedDocument,
  PublishedDocument,
  Uid,
} from './common.schema';

/* ------------------------------------------------------------------ shared */

export const MediaSchema = z.looseObject({
  id: z.number().int(),
  documentId: DocumentId,
  url: z.string().min(1),
  mime: z.string(),
  alternativeText: z.string().nullable(),
  width: z.number().nullable(),
  height: z.number().nullable(),
});

/** Component shared.seo. metaTitle and metaDescription are required in the CMS. */
export const SeoSchema = z.looseObject({
  metaTitle: z.string().min(1),
  metaDescription: z.string().min(1),
  metaImage: MediaSchema.nullable().optional(),
  canonicalURL: z.string().nullable().optional(),
  metaRobots: z.string().nullable().optional(),
});

/** Component shared.link */
export const LinkSchema = z.looseObject({
  id: z.number().int(),
  text: z.string().nullable(),
  URL: z.string().nullable(),
  target: z.string().nullable(),
});

export const PerkSchema = z.looseObject({ id: z.number().int(), text: z.string().nullable() });

/** Entries of a dynamic zone. `__component` decides which React component renders it. */
export const DynamicZoneEntrySchema = z.looseObject({
  __component: z.string().regex(/^[\w-]+\.[\w-]+$/),
  id: z.number().int(),
});

/** Entry of `localizations`. The locale switcher builds its links from `slug`. */
const LocalizationRef = z.looseObject({
  id: z.number().int(),
  documentId: DocumentId,
  locale: z.string().min(2),
  slug: Uid.optional(),
});

/* --------------------------------------------------------- collection types */

export const CategorySchema = LocalizedDocument.extend({
  name: z.string().nullable(),
});

export const ProductSchema = LocalizedDocument.extend({
  name: z.string().min(1),
  price: z.number().int().nonnegative().nullable(),
  description: z.string().nullable(),
  slug: Uid,
  featured: z.boolean().nullable(),
  images: z.array(MediaSchema).nullable(),
  perks: z.array(PerkSchema),
  plans: z.array(z.looseObject({ name: z.string().nullable() })),
  categories: z.array(z.looseObject({ name: z.string().nullable() })),
  localizations: z.array(LocalizationRef),
  dynamic_zone: z.array(DynamicZoneEntrySchema).nullable(),
});

export const ArticleSchema = LocalizedDocument.extend({
  title: z.string().min(1),
  description: z.string().min(1),
  slug: Uid,
  content: z.array(z.looseObject({ type: z.string() })).nullable(),
  image: MediaSchema.nullable(),
  seo: SeoSchema.nullable(),
  categories: z.array(z.looseObject({ name: z.string().nullable() })),
  localizations: z.array(LocalizationRef),
  dynamic_zone: z.array(DynamicZoneEntrySchema).nullable(),
});

export const PageSchema = LocalizedDocument.extend({
  slug: Uid,
  seo: SeoSchema.nullable(),
  localizations: z.array(LocalizationRef),
  dynamic_zone: z.array(DynamicZoneEntrySchema).nullable(),
});

export const PlanSchema = LocalizedDocument.extend({
  name: z.string().min(1),
  price: z.number().int().nonnegative().nullable(),
  featured: z.boolean().nullable(),
});

export const FaqSchema = LocalizedDocument.extend({
  question: z.string().nullable(),
  answer: z.string().nullable(),
});

export const TestimonialSchema = LocalizedDocument.extend({
  text: z.string().nullable(),
});

/** Not localized. */
export const LogoSchema = PublishedDocument.extend({
  company: z.string().nullable(),
});

/** Not localized. Drives Next.js redirects (next.config.mjs). */
export const RedirectionSchema = PublishedDocument.extend({
  source: z.string().regex(/^\//, 'must start with "/"'),
  destination: z.string().regex(/^\//, 'must start with "/"'),
});

/* -------------------------------------------------------------- single types */

export const GlobalSchema = LocalizedDocument.extend({
  seo: SeoSchema.nullable(),
  navbar: z.looseObject({
    left_navbar_items: z.array(LinkSchema),
    right_navbar_items: z.array(LinkSchema),
  }),
  footer: z.looseObject({
    description: z.string().nullable(),
    copyright: z.string().nullable(),
    internal_links: z.array(LinkSchema),
    policy_links: z.array(LinkSchema),
    social_media_links: z.array(LinkSchema),
  }),
  add_to_cart: z.string().nullable(),
  your_cart: z.string().nullable(),
  buy_now: z.string().nullable(),
});

export const LandingPageSchema = DocumentBase.extend({
  locale: z.string().min(2),
  heading: z.string().nullable(),
  sub_heading: z.string().nullable(),
  seo: SeoSchema.nullable().optional(),
});

/* --------------------------------------------------- frontend contract data */

/**
 * Components the Next.js DynamicZoneManager can render (next/components/dynamic-zone/manager.tsx).
 * Anything else is dropped silently with a console.warn, so editors see nothing on the page.
 */
export const RENDERABLE_DYNAMIC_ZONE_COMPONENTS = [
  'dynamic-zone.hero',
  'dynamic-zone.features',
  'dynamic-zone.testimonials',
  'dynamic-zone.how-it-works',
  'dynamic-zone.brands',
  'dynamic-zone.pricing',
  'dynamic-zone.launches',
  'dynamic-zone.cta',
  'dynamic-zone.form-next-to-section',
  'dynamic-zone.faq',
  'dynamic-zone.related-products',
  'dynamic-zone.related-articles',
] as const;

export type Product = z.infer<typeof ProductSchema>;
export type Article = z.infer<typeof ArticleSchema>;
export type Page = z.infer<typeof PageSchema>;
export type Global = z.infer<typeof GlobalSchema>;
export type Redirection = z.infer<typeof RedirectionSchema>;
