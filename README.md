# CMS Test Automation: Strapi LaunchPad

Playwright + TypeScript suite for [LaunchPad](https://github.com/strapi/launchpad), the official Strapi demo:

- **CMS**: Strapi 5, with i18n (en, fr), Draft & Publish, dynamic zones, single types and CMS-managed redirects
- **Website**: Next.js 16 App Router. Pages are rendered on the server from the Content API, with Next.js caching

The suite validates the CMS on its own (contract, localization, publication, permissions, content quality) and then checks that the website shows what the CMS publishes.

## Target environment

Either of these works. Only the URLs change.

| Option                 | How                                                                                                            | `BASE_URL`                           | `STRAPI_URL`                      |
| ---------------------- | -------------------------------------------------------------------------------------------------------------- | ------------------------------------ | --------------------------------- |
| Hosted demo (no setup) | Request an instance at [strapi.io/demo](https://strapi.io/demo)                                                | `https://client-<id>.strapidemo.com` | `https://api-<id>.strapidemo.com` |
| Local                  | `git clone https://github.com/strapi/launchpad && cd launchpad && yarn && yarn setup && yarn seed && yarn dev` | `http://localhost:3000`              | `http://localhost:1337`           |

For the tests that write content, create a token in the Strapi admin: **Settings > API Tokens > Create new API Token**, type **Full access**. Everything those tests create is deleted at the end.

## Getting started

```sh
npm ci
npx playwright install --with-deps
cp .env.example .env     # set BASE_URL, STRAPI_URL and optionally STRAPI_API_TOKEN
npm run test:api         # CMS only, no browser
npm run test:e2e         # website, Chromium
```

| Variable                         | Default                 | Purpose                                                |
| -------------------------------- | ----------------------- | ------------------------------------------------------ |
| `BASE_URL`                       | `http://localhost:3000` | LaunchPad website                                      |
| `STRAPI_URL`                     | `http://localhost:1337` | Strapi origin, without `/api`                          |
| `STRAPI_API_TOKEN`               | not set                 | Full-access token. Without it, write tests are skipped |
| `LOCALES`                        | `en,fr`                 | Locales to test. The first is the default locale       |
| `PUBLISH_PROPAGATION_TIMEOUT_MS` | `60000`                 | How long a publish may take to appear on the website   |

### Scripts

| Command                      | Runs                                                |
| ---------------------------- | --------------------------------------------------- |
| `npm test`                   | Everything, all browsers                            |
| `npm run test:api`           | Content API suites                                  |
| `npm run test:e2e`           | Website suites, Chromium                            |
| `npm run test:cross-browser` | Website suites, Chromium + Firefox + WebKit         |
| `npm run test:smoke`         | `@smoke` subset, API + Chromium                     |
| `npm run test:security`      | `@security` subset                                  |
| `npm run test:i18n`          | `@i18n` subset                                      |
| `npm run check`              | Typecheck, ESLint (with Playwright rules), Prettier |

## Structure

```text
src/
  config/      env.ts (zod-validated), timeouts.ts
  api/
    base.client.ts        APIRequestContext wrapper; never throws on 4xx/5xx
    response.ts           parseBody(): JSON + schema validation with readable errors
    strapi/
      strapi.client.ts    Facade: articles, products, pages, ..., global, plugins
      content.client.ts   Collection / single type clients (documentId, { data } bodies)
      query.ts            qs serialisation: filters, locale, status, pagination
      read.ts             findAll (all pages), findSingle, findBySlug
      catalog.ts          Registry of content types: localized? Draft & Publish? schema?
  schemas/     zod contracts for Strapi 5 responses and LaunchPad content types
  pages/       Page Objects, locale-aware (/en/..., /fr/...)
  components/  Navbar (incl. locale switcher), Footer
  data/        ArticleBuilder (Test Data Builder)
  fixtures/    api → content (factory with cleanup) → pages; custom matchers
tests/
  api/         content-contract, i18n, publication, permissions, content-integrity
  e2e/         products, blog, seo-and-pages, i18n, navigation, publishing
postman/       collection with the website's calls and the security probes
```

## Design decisions

- **Facade + typed clients.** `StrapiClient` exposes every content type. `strapi.as(token)` switches identity, so the same test can compare the Public role with an API token.
- **Contract-first.** Every response is parsed with a zod schema. A contract break fails with the field name.
- **Content-type registry.** `catalog.ts` records which types are localized and which use Draft & Publish. Contract, i18n and publication tests are generated from it, so adding a content type is one line.
- **Data-driven from the CMS.** Website tests read the expected values (names, prices, labels, SEO, navbar items) from the API at runtime. They follow whatever editors publish and run unchanged on any LaunchPad instance.
- **Content factory with cleanup.** Write tests create unique `e2e-*` content through the API and delete it in every locale it was created in.
- **Rules tied to code.** Each content-integrity rule cites the frontend file that breaks without it.
- **Known defects stay visible.** Confirmed bugs use `test.fail()` with an annotation that explains the cause. They turn red when the bug is fixed.

## Coverage

| Area              | What is checked                                                                                                                                                                               |
| ----------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Contract          | Every localized type and single type per locale, documentId lookup, 404 envelope, pagination, no admin fields (`createdBy`) exposed                                                           |
| Localization      | Every published document exists in every locale, `localizations` links point to published documents, shared product slugs, translated UI strings                                              |
| Draft & Publish   | Drafts not readable by the Public role; draft → publish → delete lifecycle; publishing one locale does not publish another                                                                    |
| Permissions       | Public role read-only on every type and single type; users, media library and sign-up closed                                                                                                  |
| Content integrity | Homepage per locale, products renderable (image, price, description), SEO present, unique slugs, renderable dynamic-zone components, internal navbar links, images resolve, no redirect loops |
| Website           | Product listing and pages (price formatted per locale, CMS button labels), blog and articles, page SEO, navbar and footer from CMS, redirects, locale detection and switching                 |
| Editorial flow    | A published article reaches the website within the cache window, a draft never does, a deleted article disappears                                                                             |

## Results on a fresh LaunchPad (seeded demo data)

Run against LaunchPad `main` (Strapi 5.58, Next.js 16), API + Chromium: **90 passed, 18 known defects confirmed, 4 content findings, 2 skipped** (no article has SEO metadata).

### Known defects (`test.fail`)

| Severity | Area     | Finding                                                                                                                                                                                                                                                                                              |
| -------- | -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| High     | Security | **Unpublished content is public.** `GET /api/articles?status=draft` returns draft versions to anyone, including the never-published "(Draft) 5 Reasons…" article. Same for products, pages, plans, testimonials and redirections. The Next.js preview relies on it (fetches drafts without a token). |
| Medium   | Security | **Open sign-up.** The site has no accounts (`/sign-up` is a static form), but `POST /api/auth/local/register` creates CMS users.                                                                                                                                                                     |
| Medium   | SEO      | Every product page is titled "Default Title": products have no SEO component and the page passes the product as `seo`.                                                                                                                                                                               |
| Medium   | SEO      | Article pages ignore `article.seo` (no `generateMetadata`) and use the global title. Found in code; the test skips on seed data because no article has SEO yet.                                                                                                                                      |
| Medium   | i18n     | `<html lang="en">` on French pages.                                                                                                                                                                                                                                                                  |
| Medium   | Routing  | Unknown page slug: TypeError on `pageData.seo`, HTTP 200 with an error screen. Unknown article: "Blog not found" with HTTP 200 (soft 404).                                                                                                                                                           |
| Low      | i18n     | Cart modal title hardcoded "Your cart" (CMS has `global.your_cart`). Article "Back" link and unknown-product redirect drop the locale.                                                                                                                                                               |
| Low      | CMS ops  | Redirections are loaded once by `next.config.mjs`. A redirection added in the CMS needs a redeploy.                                                                                                                                                                                                  |

### Content findings (failing, data to fix in the CMS)

- 7 testimonials are published in English only; French pages that show testimonials get none.
- "5 Reasons Why Your Content Needs to Go Orbital" is published in French while the English version is still a draft.
- No published article has an SEO component.

### Behaviour worth knowing

- Strapi 5 REST **publishes on create** unless `?status=draft` is sent, the opposite of the admin UI. Any integration that writes content can publish unreviewed entries by accident.
- LaunchPad route middlewares replace `populate` on most types, so clients cannot trim payloads. A product list also returns categories, related articles and their dynamic zones.

## Recommendations

1. Give the preview a read-only API token, and restrict the Public role to `status=published` (route policy or global middleware).
2. Remove `register` from the Public role, or disable sign-ups in Advanced settings.
3. Add an SEO component to products and a `generateMetadata` to articles; set `<html lang>` per locale.
4. Use `notFound()` for unknown slugs and keep the locale in internal links and redirects.
5. Read redirections at request time (middleware) or revalidate them from a Strapi webhook.
6. Run `test:api` on a schedule against production: content findings come from editors, not from deploys.
