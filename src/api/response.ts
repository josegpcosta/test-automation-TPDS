import type { APIResponse } from '@playwright/test';
import { z } from 'zod';

/**
 * Reads the JSON body and validates it against a contract schema.
 * Throws a readable error listing every mismatch, so a contract break fails with the field name
 * instead of a later "cannot read property of undefined".
 */
export async function parseBody<S extends z.ZodType>(
  response: APIResponse,
  schema: S,
): Promise<z.infer<S>> {
  const body = await readJson(response);
  const result = schema.safeParse(body);

  if (!result.success) {
    throw new Error(
      `Contract violation on ${response.url()} ` +
        `(HTTP ${response.status()}):\n${z.prettifyError(result.error)}`,
    );
  }

  return result.data;
}

export async function readJson(response: APIResponse): Promise<unknown> {
  const text = await response.text();
  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new Error(
      `Expected JSON from ${response.url()} (HTTP ${response.status()}) but got:\n${text.slice(0, 500)}`,
    );
  }
}
