/**
 * Single entry point for specs:
 *
 *   import { test, expect } from '@fixtures';
 *
 * Fixture layers (each extends the previous one):
 *   api.fixture      -> Strapi HTTP context and clients (Public role, admin token)
 *   content.fixture  -> content factory with cleanup (needs STRAPI_API_TOKEN)
 *   pages.fixture    -> page objects
 */
import { env } from '@config/env';

export { pagesTest as test } from './pages.fixture';
export { expect } from './matchers';
export type { ContentFactory, CreatedArticle } from './content.fixture';

/** Spread into test.skip() for tests that write to the CMS: `test.skip(...API_TOKEN_REQUIRED)` */
export const API_TOKEN_REQUIRED = [
  !env.STRAPI_API_TOKEN,
  'Requires STRAPI_API_TOKEN (Settings > API Tokens > Full access)',
] as const;

/** Configured locales, the first being the default. */
export const LOCALES = env.LOCALES;
