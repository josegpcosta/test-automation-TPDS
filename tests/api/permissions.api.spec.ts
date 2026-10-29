import { test, expect, LOCALES } from '@fixtures';
import type { APIResponse } from '@playwright/test';
import type { StrapiClient } from '@api/strapi/strapi.client';
import { parseBody } from '@api/response';
import { PUBLIC_COLLECTIONS } from '@api/strapi/catalog';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';

/**
 * Role-based access control of the Content API.
 *
 * The website only reads. Everything else (writes, users, media library, sign-up) must be closed to
 * the Public role. A permission ticked by mistake in Settings > Users & Permissions is invisible
 * on the site and only shows up here.
 */
const FORBIDDEN = 403;
const ANY_DOCUMENT_ID = 'zzzzzzzzzzzzzzzzzzzzzzzz';

/** If sign-up went through, delete the account so a failing run leaves nothing behind. */
async function deleteIfCreated(response: APIResponse, admin: StrapiClient | null) {
  if (!response.ok() || !admin) return;
  const { user } = await parseBody(response, z.object({ user: z.object({ id: z.number() }) }));
  await admin.plugins.deleteUser(user.id);
}

test.describe('Public role permissions', { tag: ['@api', '@security'] }, () => {
  for (const type of PUBLIC_COLLECTIONS) {
    test(`${type}: read-only`, async ({ strapi }) => {
      const client = strapi.collection(type);

      await expect(await client.find()).toHaveStatus(200);
      await expect(await client.create({ name: 'e2e-should-not-exist' })).toHaveStatus(FORBIDDEN);
      await expect(await client.update(ANY_DOCUMENT_ID, { name: 'e2e-tampered' })).toHaveStatus(
        FORBIDDEN,
      );
      await expect(await client.remove(ANY_DOCUMENT_ID)).toHaveStatus(FORBIDDEN);
    });
  }

  test('single types are read-only', async ({ strapi }) => {
    for (const single of [strapi.global, strapi.productPage, strapi.blogPage]) {
      await expect(
        await single.update({ heading: 'e2e-tampered' }, { locale: LOCALES[0] }),
        single.type,
      ).toHaveStatus(FORBIDDEN);
    }
  });

  test('users are not listable', async ({ strapi }) => {
    await expect(await strapi.plugins.listUsers()).toHaveStatus(FORBIDDEN);
  });

  test('the media library is not listable', async ({ strapi }) => {
    // Lists every uploaded file, including ones never used in published content.
    await expect(await strapi.plugins.listMediaFiles()).toHaveStatus(FORBIDDEN);
  });

  test(
    'end-user sign-up is closed',
    {
      annotation: {
        type: 'known defect',
        description:
          'The site has no user accounts (the /sign-up page is a static form), but the Public role keeps ' +
          'users-permissions "register". Anyone can create CMS users through POST /api/auth/local/register.',
      },
    },
    async ({ strapi, adminStrapi }) => {
      test.fail();

      const id = randomUUID().slice(0, 8);
      const response = await strapi.plugins.register({
        username: `e2e_${id}`,
        email: `e2e_${id}@e2e.test`,
        password: `Pw_${id}!x`,
      });

      await deleteIfCreated(response, adminStrapi);

      // 403: Public role lacks "register". 400: "Register action is currently disabled" (Advanced settings).
      await expect(response).toHaveStatus([400, FORBIDDEN]);
    },
  );
});
