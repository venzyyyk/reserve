import { Star } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { reviewRepository } from "@/entities/review/repository";
import { Badge } from "@/shared/ui/badge";
import { Card } from "@/shared/ui/card";
import { AdminPage } from "@/widgets/superadmin";
import { moderateReview } from "../../actions";

export const dynamic = "force-dynamic";

/**
 * Review moderation.
 *
 * Whether the author actually booked is the single most useful signal on
 * this screen, so it sits next to the name rather than buried in metadata —
 * an unverified one-star review with a link in it is usually spam, and a
 * verified one is feedback the club needs to hear.
 */
export default async function ReviewsPage() {
  const [t, pending, moderated] = await Promise.all([
    getTranslations("superadmin.reviews"),
    reviewRepository.list("pending"),
    reviewRepository
      .list()
      .then((all) => all.filter((review) => review.status !== "pending")),
  ]);

  return (
    <AdminPage title={t("title")} description={t("description")}>
      <section aria-labelledby="queue" className="flex flex-col gap-4">
        <h2 id="queue" className="text-heading text-fg font-semibold">
          {t("queue", { count: pending.length })}
        </h2>

        {pending.length === 0 ? (
          <Card className="p-6">
            <p className="text-body text-fg-2">{t("empty")}</p>
          </Card>
        ) : (
          <ul className="flex flex-col gap-4">
            {pending.map((review) => (
              <li key={review.id}>
                <Card className="flex flex-col gap-4 p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex flex-col gap-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-label text-fg font-medium">
                          {review.authorName}
                        </span>
                        <Badge variant={review.verified ? "felt" : "danger"}>
                          {review.verified ? t("verified") : t("unverified")}
                        </Badge>
                      </div>
                      <p className="text-caption text-fg-3">
                        {review.clubName}
                      </p>
                    </div>
                    <p
                      className="flex items-center gap-1"
                      aria-label={t("rating", { rating: review.rating })}
                    >
                      {Array.from({ length: 5 }, (_, index) => (
                        <Star
                          key={index}
                          aria-hidden
                          size={14}
                          className={
                            index < review.rating
                              ? "fill-gold text-gold"
                              : "text-fg-3"
                          }
                        />
                      ))}
                    </p>
                  </div>

                  <p className="text-body text-fg-2">{review.text}</p>

                  <div className="border-line flex flex-wrap gap-2 border-t pt-4">
                    <form action={moderateReview}>
                      <input type="hidden" name="id" value={review.id} />
                      <input type="hidden" name="decision" value="published" />
                      <button
                        type="submit"
                        className="bg-gold text-bg hover:bg-gold-hover duration-fast text-label inline-flex h-11 items-center rounded-full px-5 font-medium transition-colors ease-out focus-visible:[outline-color:var(--color-fg)] active:scale-[0.98]"
                      >
                        {t("publish")}
                      </button>
                    </form>
                    <form action={moderateReview}>
                      <input type="hidden" name="id" value={review.id} />
                      <input type="hidden" name="decision" value="rejected" />
                      <button
                        type="submit"
                        className="bg-danger-soft text-danger hover:bg-danger hover:text-fg duration-fast text-label inline-flex h-11 items-center rounded-full px-5 font-medium transition-colors ease-out active:scale-[0.98]"
                      >
                        {t("reject")}
                      </button>
                    </form>
                  </div>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </section>

      {moderated.length > 0 && (
        <section aria-labelledby="done" className="flex flex-col gap-3">
          <h2 id="done" className="text-heading text-fg font-semibold">
            {t("moderated")}
          </h2>
          <ul className="flex flex-col">
            {moderated.map((review) => (
              <li
                key={review.id}
                className="border-line flex flex-wrap items-center justify-between gap-3 border-b py-3 last:border-b-0"
              >
                <span className="text-label text-fg-2">
                  {review.clubName} · {review.authorName}
                </span>
                <Badge
                  variant={review.status === "published" ? "felt" : "neutral"}
                >
                  {review.status === "published"
                    ? t("published")
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
