import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Capture 100% of errors, but only 10% of traces in production to control cost.
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,
});