import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Capture 100% of errors, but only 10% of traces in production to control cost.
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,

  // Ignore common noise: wallet user-cancelled errors (Freighter, WalletConnect, etc.).
  ignoreErrors: [
    /user rejected/i,
    /user declined/i,
    /user cancelled/i,
    /wallet.*cancel/i,
    /request was aborted/i,
  ],

  beforeSend(event) {
    // Drop the typed WalletRejectedError (user cancelled a wallet signature).
    const exceptions = event.exception?.values;
    if (exceptions?.some((ex) => ex.type === "WalletRejectedError")) {
      return null;
    }
    return event;
  },
});

// Required so App Router client-side navigations become their own transactions.
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;