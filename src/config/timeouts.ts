/** Central place for timeouts so they are tuned once instead of hardcoded in every page object. */
export const Timeouts = {
  /** Default for `expect` assertions. Set in playwright.config.ts. */
  expect: 10_000,
  /** Single navigation or action. */
  action: 15_000,
  /** Full test. Set in playwright.config.ts. */
  test: 60_000,
} as const;
