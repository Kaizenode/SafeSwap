export async function GET() {
  throw new Error("Sentry smoke test: intentional server error");
}

export async function POST() {
  throw new Error("Sentry smoke test: intentional server error");
}
