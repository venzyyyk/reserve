import { z } from "zod";

/**
 * Validated environment (MPS §10): the app refuses to boot half-configured.
 * Client vars must be NEXT_PUBLIC_* and are inlined at build time, so they
 * are referenced explicitly rather than via process.env indexing.
 */
const clientSchema = z.object({
  NEXT_PUBLIC_APP_URL: z.string().url().default("http://localhost:3000"),
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
