"use server";

import { getTranslations } from "next-intl/server";
import { applicationSchema } from "@/entities/application";
import { applicationRepository } from "@/entities/application/repository";
import type { ApplyState } from "@/features/club-application";

/**
 * Handles the public application. Validation lives in the entity schema, so
 * the same rules apply here and anywhere else an application is created.
 * Errors come back keyed by field with values echoed, so a rejected submit
 * never wipes what someone typed.
 */
export async function submitApplication(
  _state: ApplyState,
  formData: FormData,
): Promise<ApplyState> {
  const raw = Object.fromEntries(formData.entries());
  const values = Object.fromEntries(
    Object.entries(raw).map(([key, value]) => [key, String(value)]),
  );

  const parsed = applicationSchema.safeParse(raw);
  if (!parsed.success) {
    const t = await getTranslations("apply");
    const errors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const field = String(issue.path[0] ?? "form");
      errors[field] ??= issue.message || t("invalid");
    }
    return { status: "error", errors, values };
  }

  await applicationRepository.create(parsed.data);
  return { status: "sent" };
}
