import pino from "pino";

const REDACT_PATHS = [
  "apiKey",
  "*.apiKey",
  "*.*.apiKey",
  "signedTxXdr",
  "*.signedTxXdr",
  "*.*.signedTxXdr",
  "req.headers['x-api-key']",
];

const isProd = process.env.NODE_ENV === "production";

const logger = pino({
  level: process.env.LOG_LEVEL ?? (isProd ? "info" : "debug"),
  redact: {
    paths: REDACT_PATHS,
    censor: "[REDACTED]",
  },
  transport: isProd
    ? undefined
    : {
        target: "pino-pretty",
        options: {
          colorize: true,
          translateTime: "HH:MM:ss",
          ignore: "pid,hostname",
        },
      },
});

export default logger;

interface RequestBindings {
  requestId: string;
  path: string;
  method: string;
  address?: string;
}

/**
 * Binds a per-request child logger with { requestId, path, method, address? }.
 * `address` is read from an `x-wallet-address` header if present — set it
 * explicitly with `.child({ address })` post-auth if you'd rather bind it
 * after /api/auth/verify resolves the caller.
 */
export function withRequest(request: Request): pino.Logger {
  const requestId =
    request.headers.get("x-request-id") ?? crypto.randomUUID();
  const url = new URL(request.url);

  const bindings: RequestBindings = {
    requestId,
    path: url.pathname,
    method: request.method,
  };

  const address = request.headers.get("x-wallet-address");
  if (address) bindings.address = address;

  return logger.child(bindings);
}