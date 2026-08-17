"use client";

import { CheckCircle2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useActionState } from "react";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Select, type SelectOption } from "@/shared/ui/select";

export interface ApplyState {
  status: "idle" | "error" | "sent";
  /** Field name → already-translated message. */
  errors?: Record<string, string>;
  /** Echoed back so a failed submit never empties the form. */
  values?: Record<string, string>;
}

/**
 * The application form.
 *
 * Progressive enhancement by design: it is a real <form> posting to a
 * server action, so it works before hydration and on a flaky connection —
 * which is exactly the situation a club owner filling this in from the bar
 * on a phone is in. Errors come back per field, values are preserved.
 */
export function ApplyForm({
  action,
  cities,
  plans,
  defaultPlanId,
}: {
  action: (state: ApplyState, formData: FormData) => Promise<ApplyState>;
  cities: readonly SelectOption[];
  plans: readonly SelectOption[];
  defaultPlanId: string;
}) {
  const t = useTranslations("apply");
  const [state, formAction, pending] = useActionState(action, {
    status: "idle",
  } as ApplyState);

  if (state.status === "sent") {
    return (
      <div className="flex flex-col items-center gap-4 py-10 text-center">
        <span
          aria-hidden
          className="bg-felt-soft grid size-12 place-items-center rounded-full"
        >
          <CheckCircle2 size={24} className="text-[#6FBF73]" />
        </span>
        <h2 className="font-display text-title text-fg">{t("sentTitle")}</h2>
        <p className="text-body text-fg-2 max-w-sm">{t("sentBody")}</p>
      </div>
    );
  }

  const values = state.values ?? {};

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <Input
        label={t("clubName")}
        name="clubName"
        required
        defaultValue={values.clubName ?? ""}
        {...(state.errors?.clubName && { error: state.errors.clubName })}
      />

      <Select
        label={t("city")}
        name="citySlug"
        options={cities}
        defaultValue={values.citySlug}
        {...(state.errors?.citySlug && { error: state.errors.citySlug })}
      />

      <Input
        label={t("contactName")}
        name="contactName"
        autoComplete="name"
        required
        defaultValue={values.contactName ?? ""}
        {...(state.errors?.contactName && { error: state.errors.contactName })}
      />

      <Input
        label={t("phone")}
        name="phone"
        type="tel"
        inputMode="tel"
        autoComplete="tel"
        placeholder="+380 44 200 12 34"
        required
        defaultValue={values.phone ?? "+380"}
        hint={t("phoneHint")}
        {...(state.errors?.phone && { error: state.errors.phone })}
      />

      <Input
        label={t("email")}
        name="email"
        type="email"
        autoComplete="email"
        defaultValue={values.email ?? ""}
        hint={t("emailHint")}
        {...(state.errors?.email && { error: state.errors.email })}
      />

      <Input
        label={t("tableCount")}
        name="tableCount"
        type="number"
        inputMode="numeric"
        min={1}
        max={200}
        required
        defaultValue={values.tableCount ?? ""}
        {...(state.errors?.tableCount && { error: state.errors.tableCount })}
      />

      <Select
        label={t("plan")}
        name="planId"
        options={plans}
        defaultValue={values.planId ?? defaultPlanId}
        hint={t("planHint")}
      />

      <div className="flex flex-col gap-1.5">
        <label htmlFor="message" className="text-label text-fg-2 font-medium">
          {t("message")}
        </label>
        <textarea
          id="message"
          name="message"
          rows={4}
          maxLength={500}
          defaultValue={values.message ?? ""}
          className="bg-surface-2 text-body text-fg placeholder:text-fg-3 duration-fast rounded-sm px-4 py-3 transition-colors ease-out"
          placeholder={t("messagePlaceholder")}
        />
      </div>

      <Button type="submit" variant="primary" size="lg" loading={pending}>
        {t("submit")}
      </Button>

      <p className="text-label text-fg-3 text-center">{t("footnote")}</p>
    </form>
  );
}
