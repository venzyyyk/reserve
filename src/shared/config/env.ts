import { z } from "zod";

/**
 * Validated environment (MPS §10): the app refuses to boot half-configured.
 * Client vars must be NEXT_PUBLIC_* and are inlined at build time, so they
 * are referenced explicitly rather than via process.env indexing.
 */
/**
 * The public site address — and `url()` alone is not enough to say so.
 *
 * `NEXT_PUBLIC_*` is inlined into the JavaScript every visitor downloads, and
 * this particular value is also printed into `<link rel="canonical">`, the
 * Open Graph tags and `sitemap.xml`. So whatever lands here is published,
 * loudly, on every page.
 *
 * `mongodb+srv://user:password@cluster.mongodb.net/` is a perfectly valid URL.
 * Pasted into the wrong box on a hosting dashboard — the boxes are adjacent
 * and both want a URL — it sails through `url()` and gets served to the world
 * inside the page source. That happened on this project's first deploy.
 *
 * Two extra conditions turn a silent credential leak into a failed build:
 * the scheme has to be one a browser can visit, and the value must carry no
 * credentials. Connection strings fail both.
 */
const appUrl = z
  .string()
  .url()
  .refine(
    (value) => /^https?:\/\//i.test(value),
    "must be an http(s) address — this is the public site URL, not a service connection string",
  )
  .refine((value) => {
    // `new URL` + try/catch rather than `URL.parse`: this module is inlined
    // into the client bundle, and the static method is too new for browsers
    // we still serve.
    try {
      const parsed = new URL(value);
      return parsed.username === "" && parsed.password === "";
    } catch {
      return false;
    }
  }, "must not contain credentials");

const clientSchema = z.object({
  NEXT_PUBLIC_APP_URL: appUrl.default("http://localhost:3000"),
  NEXT_PUBLIC_SENTRY_DSN: z.string().url().optional(),
  NEXT_PUBLIC_FLAGS: z.string().optional(),
});

const serverSchema = clientSchema.extend({
  SENTRY_DSN: z.string().url().optional(),
});

/**
 * Database configuration (M2b). Kept separate from `serverSchema` because
 * it is read at a different moment: the app boots without a database for
 * static marketing pages, and only the persistence layer needs these.
 */
const databaseSchema = z.object({
  MONGODB_URI: z
    .string()
    .min(1)
    .refine(
      (value) =>
        value.startsWith("mongodb://") || value.startsWith("mongodb+srv://"),
      "must be a mongodb:// or mongodb+srv:// connection string",
    ),
  MONGODB_DB_NAME: z.string().min(1).default("reserve"),
});

function parse<T extends z.ZodTypeAny>(schema: T, input: unknown): z.infer<T> {
  const result = schema.safeParse(input);
  if (!result.success) {
    const issues = result.error.issues
      .map((i) => `${i.path.join(".")}: ${i.message}`)
      .join("; ");
    throw new Error(`Invalid environment configuration — ${issues}`);
  }
  return result.data as z.infer<T>;
}

/**
 * An empty variable is an unset variable.
 *
 * Hosting dashboards do not distinguish the two. Vercel reads `.env.example`,
 * offers every name it finds as a row to fill in, and stores `""` for the ones
 * you leave blank — so a deployment that has simply not chosen an app URL yet
 * arrives here as an empty string rather than as nothing at all. Zod is right
 * to reject `""` as a URL, and `.default()` never runs, because a value was
 * technically provided. The build then fails on a variable the operator
 * deliberately left alone.
 *
 * Normalising here rather than loosening each schema keeps the rules honest:
 * `NEXT_PUBLIC_APP_URL` still has to be a real URL when it is set, and
 * `MONGODB_URI` is still required. Whitespace counts as empty too — a value
 * pasted with a stray newline is not a configuration choice either.
 */
const unset = (value: string | undefined): string | undefined =>
  value === undefined || value.trim() === "" ? undefined : value;

export const clientEnv = parse(clientSchema, {
  NEXT_PUBLIC_APP_URL: unset(process.env.NEXT_PUBLIC_APP_URL),
  NEXT_PUBLIC_SENTRY_DSN: unset(process.env.NEXT_PUBLIC_SENTRY_DSN),
  NEXT_PUBLIC_FLAGS: unset(process.env.NEXT_PUBLIC_FLAGS),
});

/** Server-only env. Never import from client components. */
export function serverEnv(): z.infer<typeof serverSchema> {
  return parse(serverSchema, {
    NEXT_PUBLIC_APP_URL: unset(process.env.NEXT_PUBLIC_APP_URL),
    NEXT_PUBLIC_SENTRY_DSN: unset(process.env.NEXT_PUBLIC_SENTRY_DSN),
    NEXT_PUBLIC_FLAGS: unset(process.env.NEXT_PUBLIC_FLAGS),
    SENTRY_DSN: unset(process.env.SENTRY_DSN),
  });
}

/**
 * Whether this deployment is configured for MongoDB.
 *
 * Storage selection is explicit and never inferred from whether a
 * connection happens to work: a production process that quietly fell back
 * to memory would keep serving, keep taking payments, and lose every
 * booking on the next deploy. See `src/shared/db/storage.ts`.
 */
export function isMongoConfigured(): boolean {
  return unset(process.env.MONGODB_URI) !== undefined;
}

/** Validated database env. Throws if MongoDB is configured incorrectly. */
export function databaseEnv(): z.infer<typeof databaseSchema> {
  return parse(databaseSchema, {
    MONGODB_URI: unset(process.env.MONGODB_URI),
    MONGODB_DB_NAME: unset(process.env.MONGODB_DB_NAME),
  });
}
