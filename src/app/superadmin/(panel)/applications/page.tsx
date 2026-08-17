import { getTranslations } from "next-intl/server";
import { applicationRepository } from "@/entities/application/repository";
import { billingRepository } from "@/entities/billing/repository";
import { cityBySlug } from "@/entities/city";
import { Badge } from "@/shared/ui/badge";
import { Card } from "@/shared/ui/card";
import { AdminPage } from "@/widgets/superadmin";
import { decideApplication } from "../../actions";

export const dynamic = "force-dynamic";

/**
 * The approval queue. Pending applications are cards, not table rows: a
 * decision needs the whole context — who, where, how many tables, what
 * they wrote — and a rejection needs a reason typed before it is sent,
 * because that reason is what the club reads.
 */
export default async function ApplicationsPage() {
  const [t, pending, decided, plans] = await Promise.all([
    getTranslations("superadmin.applications"),
    applicationRepository.list("pending"),
    applicationRepository
      .list()
      .then((all) => all.filter((item) => item.status !== "pending")),
    billingRepository.listPlans(),
  ]);

  const planName = (id: string) =>
    plans.find((plan) => plan.id === id)?.name ?? id;

  return (
    <AdminPage title={t("title")} description={t("description")}>
      <section
        aria-labelledby="pending-heading"
        className="flex flex-col gap-4"
      >
        <h2 id="pending-heading" className="text-heading text-fg font-semibold">
          {t("pending", { count: pending.length })}
        </h2>

        {pending.length === 0 ? (
          <Card className="p-6">
            <p className="text-body text-fg-2">{t("empty")}</p>
          </Card>
        ) : (
          <ul className="flex flex-col gap-4">
            {pending.map((application) => (
              <li key={application.id}>
                <Card className="flex flex-col gap-4 p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex flex-col gap-1">
                      <h3 className="text-heading text-fg font-semibold">
                        {application.clubName}
                      </h3>
                      <p className="text-label text-fg-2">
                        {cityBySlug(application.citySlug)?.name ??
                          application.citySlug}{" "}
                        · {t("tables", { count: application.tableCount })}
                      </p>
                    </div>
                    <Badge variant="gold">{planName(application.planId)}</Badge>
                  </div>

                  <dl className="grid gap-x-6 gap-y-2 sm:grid-cols-2">
                    <div className="flex justify-between gap-3 sm:flex-col sm:justify-start">
                      <dt className="text-caption text-fg-3">{t("contact")}</dt>
                      <dd className="text-label text-fg">
                        {application.contactName}
                      </dd>
                    </div>
                    <div className="flex justify-between gap-3 sm:flex-col sm:justify-start">
                      <dt className="text-caption text-fg-3">{t("phone")}</dt>
                      <dd className="text-label text-fg">
                        <a
                          href={`tel:${application.phone}`}
                          className="hover:text-gold duration-fast transition-colors ease-out"
                        >
                          {application.phone}
                        </a>
                      </dd>
                    </div>
                    {application.email && (
                      <div className="flex justify-between gap-3 sm:flex-col sm:justify-start">
                        <dt className="text-caption text-fg-3">{t("email")}</dt>
                        <dd className="text-label text-fg">
                          {application.email}
                        </dd>
                      </div>
                    )}
                  </dl>

                  {application.message && (
                    <p className="bg-surface-2 text-label text-fg-2 rounded-sm p-3">
                      {application.message}
                    </p>
                  )}

                  <form
                    action={decideApplication}
                    className="border-line flex flex-col gap-3 border-t pt-4"
                  >
                    <input type="hidden" name="id" value={application.id} />
                    <label
                      htmlFor={`note-${application.id}`}
                      className="text-caption text-fg-3"
                    >
                      {t("noteLabel")}
                    </label>
                    <input
                      id={`note-${application.id}`}
                      name="note"
                      className="bg-surface-2 text-label text-fg placeholder:text-fg-3 h-11 rounded-sm px-3"
                      placeholder={t("notePlaceholder")}
                    />
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="submit"
                        name="decision"
                        value="approved"
                        className="bg-gold text-bg hover:bg-gold-hover duration-fast text-label inline-flex h-11 items-center rounded-full px-5 font-medium transition-colors ease-out focus-visible:[outline-color:var(--color-fg)] active:scale-[0.98]"
                      >
                        {t("approve")}
                      </button>
                      <button
                        type="submit"
                        name="decision"
                        value="rejected"
                        className="bg-danger-soft text-danger hover:bg-danger hover:text-fg duration-fast text-label inline-flex h-11 items-center rounded-full px-5 font-medium transition-colors ease-out active:scale-[0.98]"
                      >
                        {t("reject")}
                      </button>
                    </div>
                  </form>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </section>

      {decided.length > 0 && (
        <section
          aria-labelledby="decided-heading"
          className="flex flex-col gap-4"
        >
          <h2
            id="decided-heading"
            className="text-heading text-fg font-semibold"
          >
            {t("decided")}
          </h2>
          <ul className="flex flex-col gap-2">
            {decided.map((application) => (
              <li
                key={application.id}
                className="border-line flex flex-wrap items-center justify-between gap-3 border-b py-3 last:border-b-0"
              >
                <span className="text-label text-fg">
                  {application.clubName}
                  <span className="text-fg-3">
                    {" "}
                    ·{" "}
                    {cityBySlug(application.citySlug)?.name ??
                      application.citySlug}
                  </span>
                </span>
                <Badge
                  variant={
                    application.status === "approved" ? "felt" : "danger"
                  }
                >
                  {application.status === "approved"
                    ? t("approved")
                    : t("rejected")}
                </Badge>
              </li>
            ))}
          </ul>
        </section>
      )}
    </AdminPage>
  );
}
