/**
 * Client observability bootstrap. Sentry is loaded only when a DSN is
 * configured, keeping it out of the bundle otherwise (MPS §8 budgets).
 * The dependency is added together with the DSN in the deploy environment;
 * `@sentry/nextjs` is intentionally not a hard dependency of M0.
 */
export function register(): void {
  if (!process.env.NEXT_PUBLIC_SENTRY_DSN) return;
  // Dynamic, optional: resolved at runtime in environments where the
  // dependency and DSN are provisioned together.
  import(/* webpackIgnore: true */ "@sentry/nextjs" as string)
    .then(
      (Sentry: {
        init: (o: { dsn: string; tracesSampleRate: number }) => void;
      }) => {
        Sentry.init({
          dsn: process.env.NEXT_PUBLIC_SENTRY_DSN as string,
          tracesSampleRate: 0.1,
        });
      },
    )
    .catch(() => {
      // Observability must never break the product.
    });
}

register();
