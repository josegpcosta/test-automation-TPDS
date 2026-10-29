import { expect as baseExpect, type APIResponse } from '@playwright/test';
import { z } from 'zod';

/**
 * Custom matchers for API tests.
 *
 *   await expect(response).toHaveStatus(201)
 *   await expect(response).toHaveStatus([401, 403])
 *   expect(body).toMatchSchema(ProductSchema)
 *
 * On failure, toHaveStatus prints the response body, which is usually the fastest way to see
 * why Strapi rejected a request (validation details, policy name, etc.).
 */
export const expect = baseExpect.extend({
  async toHaveStatus(response: APIResponse, expected: number | number[]) {
    const accepted = Array.isArray(expected) ? expected : [expected];
    const actual = response.status();
    const pass = accepted.includes(actual);

    const body = pass ? '' : (await response.text()).slice(0, 1000);

    return {
      name: 'toHaveStatus',
      pass,
      expected,
      actual,
      message: () =>
        `${this.utils.matcherHint('toHaveStatus', 'response', String(expected), { isNot: this.isNot })}\n\n` +
        `${response.url()}\n` +
        `Expected status: ${this.isNot ? 'not ' : ''}${accepted.join(' or ')}\n` +
        `Received status: ${actual}\n` +
        (body ? `Body: ${body}` : ''),
    };
  },

  toMatchSchema(received: unknown, schema: z.ZodType) {
    const result = schema.safeParse(received);

    return {
      name: 'toMatchSchema',
      pass: result.success,
      message: () =>
        result.success
          ? 'Expected value not to match the schema'
          : `Value does not match the schema:\n${z.prettifyError(result.error)}`,
    };
  },
});
