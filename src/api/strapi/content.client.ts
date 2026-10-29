import { BaseApiClient, type RequestOptions } from '../base.client';
import type { StrapiQuery } from './query';

/** Plural API IDs of LaunchPad collection types (strapi/src/api/*). */
export const CollectionTypes = {
  articles: 'articles',
  products: 'products',
  plans: 'plans',
  pages: 'pages',
  categories: 'categories',
  faqs: 'faqs',
  testimonials: 'testimonials',
  logos: 'logos',
  redirections: 'redirections',
} as const;

/** Singular API IDs of LaunchPad single types. */
export const SingleTypes = {
  global: 'global',
  productPage: 'product-page',
  blogPage: 'blog-page',
} as const;

export type CollectionType = (typeof CollectionTypes)[keyof typeof CollectionTypes];
export type SingleType = (typeof SingleTypes)[keyof typeof SingleTypes];

type QueryOptions = Omit<RequestOptions, 'query' | 'data'>;
type WriteQuery = Pick<StrapiQuery, 'locale' | 'status'>;

/**
 * Strapi 5 collection type: documents are addressed by `documentId`, not by numeric id.
 * Request bodies are wrapped in `{ data }`, as the Content API expects.
 */
export class CollectionClient extends BaseApiClient {
  constructor(
    request: ConstructorParameters<typeof BaseApiClient>[0],
    readonly type: CollectionType,
    token?: string,
  ) {
    super(request, token);
  }

  find(query?: StrapiQuery, options: QueryOptions = {}) {
    return this.get(this.type, { ...options, query });
  }

  findOne(documentId: string, query?: StrapiQuery, options: QueryOptions = {}) {
    return this.get(`${this.type}/${documentId}`, { ...options, query });
  }

  /**
   * Strapi 5 REST publishes on create unless `status: 'draft'` is passed (the opposite of the admin UI).
   * `locale` selects the localization to create.
   */
  create(data: Record<string, unknown>, query?: WriteQuery, options: QueryOptions = {}) {
    return this.post(this.type, { ...options, query, data: { data } });
  }

  /** Updating with a locale that does not exist yet creates that localization. */
  update(
    documentId: string,
    data: Record<string, unknown>,
    query?: WriteQuery,
    options: QueryOptions = {},
  ) {
    return this.put(`${this.type}/${documentId}`, { ...options, query, data: { data } });
  }

  remove(documentId: string, query?: Pick<StrapiQuery, 'locale'>, options: QueryOptions = {}) {
    return this.delete(`${this.type}/${documentId}`, { ...options, query });
  }
}

export class SingleTypeClient extends BaseApiClient {
  constructor(
    request: ConstructorParameters<typeof BaseApiClient>[0],
    readonly type: SingleType,
    token?: string,
  ) {
    super(request, token);
  }

  find(query?: StrapiQuery, options: QueryOptions = {}) {
    return this.get(this.type, { ...options, query });
  }

  update(data: Record<string, unknown>, query?: WriteQuery, options: QueryOptions = {}) {
    return this.put(this.type, { ...options, query, data: { data } });
  }
}

/** users-permissions and upload plugin routes that matter for access control. */
export class PluginClient extends BaseApiClient {
  register(user: { username: string; email: string; password: string }) {
    return this.post('auth/local/register', { data: user, token: null });
  }

  listUsers(options: QueryOptions = {}) {
    return this.get('users', options);
  }

  deleteUser(id: number, options: QueryOptions = {}) {
    return this.delete(`users/${id}`, options);
  }

  listMediaFiles(options: QueryOptions = {}) {
    return this.get('upload/files', options);
  }

  listLocales(options: QueryOptions = {}) {
    return this.get('i18n/locales', options);
  }
}
