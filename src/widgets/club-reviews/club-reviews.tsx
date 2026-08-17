import { Star } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { distribution, summarise, type Review } from "@/entities/review";
import { Badge } from "@/shared/ui/badge";

function Stars({ rating, size = 14 }: { rating: number; size?: number }) {
  return (
    <span className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          aria-hidden
          size={size}
          className={star <= rating ? "fill-gold text-gold" : "text-fg-3"}
        />
      ))}
    </span>
  );
}

/**
 * Published reviews for a club.
 *
 * The distribution bars are here because an average alone hides the shape:
 * 4.2 from forty fives and ten ones is a different club from 4.2 where
 * everyone said four, and a guest deciding where to spend an evening can
 * read that difference in a second.
 */
export async function ClubReviews({ reviews }: { reviews: Review[] }) {
  const t = await getTranslations("reviews");
  const summary = summarise(reviews);

  if (summary.count === 0) {
    return (
      <section
        aria-labelledby="reviews-heading"
        className="flex flex-col gap-3"
      >
        <h2 id="reviews-heading" className="font-display text-title text-fg">
          {t("title")}
        </h2>
        <p className="text-body text-fg-3">{t("empty")}</p>
      </section>
    );
  }

  const bars = distribution(reviews);

  return (
    <section aria-labelledby="reviews-heading" className="flex flex-col gap-6">
      <h2 id="reviews-heading" className="font-display text-title text-fg">
        {t("title")}
      </h2>

      <div className="flex flex-wrap items-center gap-x-10 gap-y-4">
        <div className="flex flex-col gap-1">
          <p className="flex items-baseline gap-2">
            <span className="font-display text-display text-fg tabular-nums">
              {summary.average.toLocaleString("uk-UA", {
                minimumFractionDigits: 1,
              })}
            </span>
            <Stars rating={Math.round(summary.average)} size={16} />
          </p>
          <p className="text-label text-fg-3">
            {t("count", { count: summary.count })}
          </p>
        </div>

        <ul className="flex min-w-[180px] flex-1 flex-col gap-1">
          {bars.map(([rating, count]) => (
            <li key={rating} className="flex items-center gap-2">
              <span className="text-caption text-fg-3 w-3 tabular-nums">
                {rating}
              </span>
              <span
                aria-hidden
                className="bg-surface-2 h-1.5 flex-1 overflow-hidden rounded-full"
              >
                <span
                  className="bg-gold block h-full rounded-full"
                  style={{
                    width: `${Math.round((count / summary.count) * 100)}%`,
                  }}
                />
              </span>
              <span className="text-caption text-fg-3 w-5 text-right tabular-nums">
                {count}
              </span>
            </li>
          ))}
        </ul>
      </div>

      <ul className="flex flex-col gap-5">
        {reviews.map((review) => (
          <li
            key={review.id}
            className="border-line flex flex-col gap-2 border-t pt-5 first:border-t-0 first:pt-0"
          >
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <span className="text-label text-fg font-medium">
                {review.authorName}
              </span>
              {review.verified && <Badge variant="felt">{t("verified")}</Badge>}
              <span className="text-caption text-fg-3">
                {new Intl.DateTimeFormat("uk-UA", {
                  day: "numeric",
                  month: "long",
                  timeZone: "Europe/Kyiv",
                }).format(new Date(review.createdAt))}
              </span>
            </div>
            <Stars rating={review.rating} />
            <p className="text-body text-fg-2">{review.text}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
