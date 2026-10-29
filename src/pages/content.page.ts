import { BasePage } from './base.page';

/**
 * Pages built by editors in the CMS (collection type `pages`, rendered by app/[locale]/(marketing)/[slug]).
 * The homepage is the entry with slug "homepage", served at /{locale}.
 */
export class ContentPage extends BasePage {
  static readonly HOMEPAGE_SLUG = 'homepage';

  open(locale: string, slug: string) {
    return this.visit(locale, slug === ContentPage.HOMEPAGE_SLUG ? '' : `/${slug}`);
  }
}
