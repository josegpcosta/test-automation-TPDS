import * as dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config({ quiet: true });

/**
 * Playwright's APIRequestContext resolves relative paths with `new URL(path, baseURL)`.
 * A base URL without a trailing slash would drop its last segment ("/api"),
 * so base URLs are normalised to end with "/".
 */
const withTrailingSlash = (url: string) => (url.endsWith('/') ? url : `${url}/`);
const withoutTrailingSlash = (url: string) => url.replace(/\/+$/, '');

const EnvSchema = z.object({
  /** LaunchPad Next.js frontend. Hosted demo: https://client-<id>.strapidemo.com */
  BASE_URL: z.url().default('http://localhost:3000').transform(withTrailingSlash),
  /** Strapi origin, without /api. Hosted demo: https://api-<id>.strapidemo.com */
  STRAPI_URL: z.url().default('http://localhost:1337').transform(withoutTrailingSlash),
  /**
   * Optional Strapi API token (Settings > API Tokens, type "Full access").
   * Enables tests that create, publish and delete content.
   */
  STRAPI_API_TOKEN: z.string().min(1).optional(),
  /** Locales enabled in the CMS and the frontend. The first one is the default locale. */
  LOCALES: z
    .string()
    .default('en,fr')
    .transform((value) =>
      value
        .split(',')
        .map((locale) => locale.trim())
        .filter(Boolean),
    )
    .pipe(z.array(z.string().min(2)).min(1)),
  /** How long published content may take to appear on the website (Next.js cache). */
  PUBLISH_PROPAGATION_TIMEOUT_MS: z.coerce.number().int().positive().default(60_000),
  CI: z
    .string()
    .optional()
    .transform((value) => value === 'true' || value === '1'),
});

// `KEY=` in .env or an unset CI variable arrives as "". Treat it as not set so defaults apply.
const definedOnly = Object.fromEntries(
  Object.entries(process.env).filter(([, value]) => value !== ''),
);
const parsed = EnvSchema.safeParse(definedOnly);

if (!parsed.success) {
  throw new Error(`Invalid environment configuration:\n${z.prettifyError(parsed.error)}`);
}

export const env = Object.freeze({
  ...parsed.data,
  /** Content API base, always ending with "/api/". */
  API_BASE_URL: withTrailingSlash(`${parsed.data.STRAPI_URL}/api`),
  DEFAULT_LOCALE: parsed.data.LOCALES[0]!,
});

export type Locale = string;
