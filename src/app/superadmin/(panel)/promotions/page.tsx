import { getTranslations } from "next-intl/server";
import { isPromotionUsable } from "@/entities/billing";
import { billingRepository } from "@/entities/billing/repository";
import { Badge } from "@/shared/ui/badge";
import { Card } from "@/shared/ui/card";
import { AdminPage, AdminTable } from "@/widgets/superadmin";
import { deletePromotion, savePromotion } from "../../actions";

export const dynamic = "force-dynamic";

/** Promo codes: create at the top, existing ones editable inline below. */
export default async function PromotionsPage() {
  const [t, promotions] = await Promise.all([
    getTranslations("superadmin.promotions"),
    billingRepository.listPromotions(),
  ]);

  return (
    <AdminPage title={t("title")} description={t("description")}>
      <Card className="p-5">
        <form action={savePromotion} className="flex flex-col gap-4">
          <h2 className="text-heading text-fg font-semibold">{t("create")}</h2>
          <input type="hidden" name="id" value="" />

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="flex flex-col gap-1.5">
              <span className="text-label text-fg-2 font-medium">
                {t("code")}
              </span>
              <input
                name="code"
                required
                placeholder="STARTUA"
                className="bg-surface-2 text-body text-fg h-12 rounded-sm px-4 uppercase"
              />
            </label>

            <label className="flex flex-col gap-1.5">
              <span className="text-label text-fg-2 font-medium">
                {t("percentOff")}
              </span>
              <input
                name="percentOff"
                type="number"
                min={1}
                max={100}
                defaultValue={20}
                className="bg-surface-2 text-body text-fg h-12 rounded-sm px-4 tabular-nums"
              />
            </label>

            <label className="flex flex-col gap-1.5 sm:col-span-2">
              <span className="text-label text-fg-2 font-medium">
                {t("promoDescription")}
              </span>
              <input
                name="description"
                required
                maxLength={120}
                className="bg-surface-2 text-body text-fg h-12 rounded-sm px-4"
              />
            </label>

            <label className="flex flex-col gap-1.5">
              <span className="text-label text-fg-2 font-medium">
                {t("expiresAt")}
              </span>
              <input
                name="expiresAt"
                type="date"
                className="bg-surface-2 text-body text-fg h-12 rounded-sm px-4"
              />
              <span className="text-caption text-fg-3">
                {t("expiresAtHint")}
              </span>
            </label>

            <label className="flex items-center gap-2 self-end pb-3">
              <input
                type="checkbox"
                name="active"
                defaultChecked
                className="accent-gold size-4"
              />
              <span className="text-label text-fg-2">{t("active")}</span>
            </label>
          </div>

          <button
            type="submit"
            className="bg-gold text-bg hover:bg-gold-hover duration-fast text-label inline-flex h-11 w-fit items-center rounded-full px-6 font-medium transition-colors ease-out focus-visible:[outline-color:var(--color-fg)] active:scale-[0.98]"
          >
            {t("save")}
          </button>
        </form>
      </Card>

      <AdminTable
        caption={t("tableCaption")}
        head={[
          t("code"),
          t("promoDescription"),
          t("discount"),
          t("status"),
          "",
        ]}
      >
        {promotions.map((promotion) => {
          const usable = isPromotionUsable(promotion);
          return (
            <tr key={promotion.id} className="border-line border-b">
              <td className="text-label text-fg py-3 pr-3 font-medium">
                {promotion.code}
              </td>
              <td className="text-label text-fg-2 px-3 py-3">
                {promotion.description}
              </td>
              <td className="text-label text-fg px-3 py-3 tabular-nums">
                −{promotion.percentOff}%
              </td>
              <td className="px-3 py-3">
                <Badge variant={usable ? "felt" : "neutral"}>
                  {usable ? t("live") : t("inactive")}
                </Badge>
              </td>
              <td className="py-3 pl-3 text-right">
                <form action={deletePromotion}>
                  <input type="hidden" name="id" value={promotion.id} />
                  <button
                    type="submit"
                    className="text-label text-fg-3 hover:text-danger duration-fast transition-colors ease-out"
                  >
                    {t("delete")}
                  </button>
                </form>
              </td>
            </tr>
          );
        })}
      </AdminTable>
    </AdminPage>
  );
}
