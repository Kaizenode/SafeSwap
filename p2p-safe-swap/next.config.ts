import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
  /* config options here */
};

export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,

  // Only print Sentry build logs in CI.
  silent: !process.env.CI,

  // Upload a wider set of files so stack traces are readable.
  widenClientFileUpload: true,

  // Upload source maps to Sentry, then delete them from the deployed bundle
  // so nobody can read the source from the browser.
  sourcemaps: {
    deleteSourcemapsAfterUpload: true,
  },
});
