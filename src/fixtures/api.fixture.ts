import { test as base, type APIRequestContext } from '@playwright/test';
import { env } from '@config/env';
import { StrapiClient } from '@api/strapi/strapi.client';

type ApiWorkerFixtures = {
  /** One HTTP connection to the Strapi Content API per worker. */
  apiRequest: APIRequestContext;
  /** Strapi client authenticated with STRAPI_API_TOKEN, or null when the token is not configured. */
  adminStrapi: StrapiClient | null;
};

type ApiTestFixtures = {
  /** Strapi client acting as the Public role, the same identity the storefront uses for catalogue reads. */
  strapi: StrapiClient;
};

export const apiTest = base.extend<ApiTestFixtures, ApiWorkerFixtures>({
  apiRequest: [
    async ({ playwright }, use) => {
      const request = await playwright.request.newContext({ baseURL: env.API_BASE_URL });
      await use(request);
      await request.dispose();
    },
    { scope: 'worker' },
  ],

  adminStrapi: [
    async ({ apiRequest }, use) => {
      await use(env.STRAPI_API_TOKEN ? new StrapiClient(apiRequest, env.STRAPI_API_TOKEN) : null);
    },
    { scope: 'worker' },
  ],

  strapi: async ({ apiRequest }, use) => {
    await use(new StrapiClient(apiRequest));
  },
});
