import qs from 'qs';

/**
 * Strapi 5 REST query parameters.
 * Strapi parses nested params with `qs` bracket syntax (filters[slug][$eq]=x), which Playwright's
 * flat `params` option cannot express, so queries are serialised here.
 * https://docs.strapi.io/cms/api/rest/parameters
 */
export type StrapiQuery = {
  /**
   * LaunchPad overrides `populate` with a route middleware on most types,
   * so a client-side populate is ignored there.
   */
  populate?: '*' | string[] | Record<string, unknown>;
  filters?: Record<string, unknown>;
  sort?: string | string[];
  fields?: string[];
  pagination?: { page?: number; pageSize?: number; withCount?: boolean };
  /** Draft & Publish version. Strapi 5 replaced v4's publicationState with `status`. Default: published. */
  status?: 'draft' | 'published';
  locale?: string;
};

export function toQueryString(query: StrapiQuery): string {
  return qs.stringify(query, { encodeValuesOnly: true, arrayFormat: 'indices' });
}

export function withQuery(path: string, query?: StrapiQuery): string {
  if (!query) return path;
  const search = toQueryString(query);
  return search ? `${path}?${search}` : path;
}
