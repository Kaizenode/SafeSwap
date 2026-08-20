import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Capture 100% of errors, but only 10% of traces in production to control cost.
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,

  beforeSend(event) {
    // Ignore expected 401s from /api/auth/me (unauthenticated session checks).
    const statusCode = event.contexts?.response?.status_code;
    const url = event.request?.url;
    if (statusCode === 401 && url?.includes("/api/auth/me")) {
      return null;
    }
    return event;
  },
});