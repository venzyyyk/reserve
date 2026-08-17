import { z } from "zod";

/**
 * The public application form. Deliberately short: name, city, phone and
 * how many tables. Everything else we can ask once there is a person to
 * ask — a long form is the fastest way to lose a club owner on a phone.
 */
export const applicationSchema = z.object({
  clubName: z.string().trim().min(2, "Вкажіть назву клубу").max(80),
  citySlug: z.string().min(1, "Оберіть місто"),
  contactName: z.string().trim().min(2, "Вкажіть контактну особу").max(80),
  phone: z
    .string()
    .transform((value) => value.replace(/[^\d+]/g, ""))
    .refine((value) => /^\+380\d{9}$/.test(value), "Перевірте номер телефону"),
  email: z
    .string()
    .trim()
    .email("Перевірте email")
    .optional()
    .or(z.literal("").transform(() => undefined)),
  tableCount: z.coerce
    .number()
    .int()
    .min(1, "Має бути щонайменше один стіл")
    .max(200),
  planId: z.string().min(1),
  message: z.string().trim().max(500).optional(),
});

export type ApplicationInput = z.infer<typeof applicationSchema>;
