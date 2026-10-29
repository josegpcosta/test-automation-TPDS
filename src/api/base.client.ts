import type { APIRequestContext, APIResponse } from '@playwright/test';
import { withQuery, type StrapiQuery } from './strapi/query';

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE';

export type RequestOptions = {
  query?: StrapiQuery;
  data?: unknown;
  /** Overrides the client's default bearer token. Pass `null` to send the request anonymously. */
  token?: string | null;
  headers?: Record<string, string>;
};

/**
 * Thin wrapper over Playwright's APIRequestContext.
 *
 * Methods return the raw APIResponse and never throw on 4xx/5xx, so negative tests
 * (permissions, validation) can assert on status and body. Parsing is done by the caller
 * with `parseBody` against a contract schema.
 *
 * Paths are relative and must not start with "/" (see src/config/env.ts).
 */
export abstract class BaseApiClient {
  constructor(
    protected readonly request: APIRequestContext,
    private readonly defaultToken?: string,
  ) {}

  protected get(path: string, options: RequestOptions = {}) {
    return this.send('GET', path, options);
  }

  protected post(path: string, options: RequestOptions = {}) {
    return this.send('POST', path, options);
  }

  protected put(path: string, options: RequestOptions = {}) {
    return this.send('PUT', path, options);
  }

  protected delete(path: string, options: RequestOptions = {}) {
    return this.send('DELETE', path, options);
  }

  private send(method: HttpMethod, path: string, options: RequestOptions): Promise<APIResponse> {
    const token = options.token === undefined ? this.defaultToken : options.token;

    return this.request.fetch(withQuery(path, options.query), {
      method,
      data: options.data,
      failOnStatusCode: false,
      headers: {
        Accept: 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers,
      },
    });
  }
}
