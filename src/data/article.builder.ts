import { randomUUID } from 'node:crypto';

export type ArticleInput = {
  title: string;
  description: string;
  slug: string;
};

/** Prefix shared by every entry the suite creates, so leftovers are easy to find in the admin. */
export const TEST_CONTENT_PREFIX = 'e2e';

/**
 * Test Data Builder for LaunchPad articles.
 * Titles and slugs are unique per build, so parallel workers never collide on the uid field.
 */
export class ArticleBuilder {
  private readonly article: ArticleInput;

  private constructor() {
    const id = randomUUID().slice(0, 8);
    this.article = {
      title: `${TEST_CONTENT_PREFIX.toUpperCase()} article ${id}`,
      description: `Automated test article ${id}. Safe to delete.`,
      slug: `${TEST_CONTENT_PREFIX}-article-${id}`,
    };
  }

  static anArticle(): ArticleBuilder {
    return new ArticleBuilder();
  }

  withTitle(title: string): this {
    this.article.title = title;
    return this;
  }

  withSlug(slug: string): this {
    this.article.slug = slug;
    return this;
  }

  build(): ArticleInput {
    return { ...this.article };
  }
}

export const anArticle = () => ArticleBuilder.anArticle();

/** The same article in another language: title and slug derived from the original. */
export const translationOf = (article: ArticleInput, locale: string): ArticleInput => ({
  title: `${article.title} (${locale})`,
  description: `${article.description} (${locale})`,
  slug: `${article.slug}-${locale}`,
});
