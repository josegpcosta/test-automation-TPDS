import type { APIRequestContext } from '@playwright/test';
import {
  CollectionClient,
  CollectionTypes,
  PluginClient,
  SingleTypeClient,
  SingleTypes,
} from './content.client';

/**
 * Facade over the LaunchPad Content API.
 *
 * Built without a token it acts as the Public role, the identity the website uses.
 * Built with a token it acts as that API token.
 */
export class StrapiClient {
  readonly articles: CollectionClient;
  readonly products: CollectionClient;
  readonly plans: CollectionClient;
  readonly pages: CollectionClient;
  readonly categories: CollectionClient;
  readonly faqs: CollectionClient;
  readonly testimonials: CollectionClient;
  readonly logos: CollectionClient;
  readonly redirections: CollectionClient;

  readonly global: SingleTypeClient;
  readonly productPage: SingleTypeClient;
  readonly blogPage: SingleTypeClient;

  readonly plugins: PluginClient;

  constructor(
    private readonly request: APIRequestContext,
    readonly token?: string,
  ) {
    const collection = (type: (typeof CollectionTypes)[keyof typeof CollectionTypes]) =>
      new CollectionClient(request, type, token);
    const single = (type: (typeof SingleTypes)[keyof typeof SingleTypes]) =>
      new SingleTypeClient(request, type, token);

    this.articles = collection(CollectionTypes.articles);
    this.products = collection(CollectionTypes.products);
    this.plans = collection(CollectionTypes.plans);
    this.pages = collection(CollectionTypes.pages);
    this.categories = collection(CollectionTypes.categories);
    this.faqs = collection(CollectionTypes.faqs);
    this.testimonials = collection(CollectionTypes.testimonials);
    this.logos = collection(CollectionTypes.logos);
    this.redirections = collection(CollectionTypes.redirections);

    this.global = single(SingleTypes.global);
    this.productPage = single(SingleTypes.productPage);
    this.blogPage = single(SingleTypes.blogPage);

    this.plugins = new PluginClient(request, token);
  }

  /** Same connection, different identity. */
  as(token: string): StrapiClient {
    return new StrapiClient(this.request, token);
  }

  collection(type: (typeof CollectionTypes)[keyof typeof CollectionTypes]): CollectionClient {
    return new CollectionClient(this.request, type, this.token);
  }
}
