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

export const clientEnv = parse(clientSchema, {
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  NEXT_PUBLIC_SENTRY_DSN: process.env.NEXT_PUBLIC_SENTRY_DSN,
  NEXT_PUBLIC_FLAGS: process.env.NEXT_PUBLIC_FLAGS,
});

/** Server-only env. Never import from client components. */
export function serverEnv(): z.infer<typeof serverSchema> {
  return parse(serverSchema, process.env);
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
  return Boolean(process.env.MONGODB_URI);
}

/** Validated database env. Throws if MongoDB is configured incorrectly. */
export function databaseEnv(): z.infer<typeof databaseSchema> {
  return parse(databaseSchema, {
    MONGODB_URI: process.env.MONGODB_URI,
    MONGODB_DB_NAME: process.env.MONGODB_DB_NAME,
  });
}
