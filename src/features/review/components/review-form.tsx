import { Star } from "lucide-react";
import { getTranslations } from "next-intl/server";
import type { ReviewFormAction } from "../model";

const RATINGS = [5, 4, 3, 2, 1] as const;

/**
 * The review form on the ticket.
 *
 * A server component on purpose. The ticket's whole promise is that it
 * renders on a dying phone with no JavaScript, and a client-side form
 * would have put React's action runtime on the one page that had none —
 * measured at +14 KB gzipped, on the page least able to afford it.
 *
 * So: a plain HTML form posting to a Server Action. Native `required` and
 * `minlength` do the validation the guest actually sees, the browser keeps
 * what they typed, and the star rating is radio inputs painted by CSS
 * (`.rating` in globals.css). The server re-validates regardless — the
 * markup is a convenience, not the rule.
 */
export async function ReviewForm({
  bookingId,
  action,
  invalid,
}: {
  bookingId: string;
  action: ReviewFormAction;
  /** Set when the server rejected a submit that skipped the browser checks. */
  invalid?: boolean;
}) {
  const t = await getTranslations("review");

  return (
    <form
      action={action}
      className="border-line flex flex-col gap-4 rounded-md border p-5"
    >
      <input type="hidden" name="bookingId" value={bookingId} />

      <div className="flex flex-col gap-1">
        <h2 className="text-heading text-fg font-semibold">{t("title")}</h2>
        <p className="text-label text-fg-3">{t("subtitle")}</p>
      </div>

      <fieldset className="flex flex-col">
        <legend className="text-label text-fg-2 mb-1.5 font-medium">
          {t("rating")}
        </legend>
        <div className="rating">
          {RATINGS.map((rating) => (
            <label key={rating}>
              <input
                type="radio"
                name="rating"
                value={rating}
                required
                className="sr-only"
              />
              <span className="sr-only">{t("ratingOption", { rating })}</span>
              <Star aria-hidden size={28} />
            </label>
          ))}
        </div>
      </fieldset>

      <label className="flex flex-col gap-1.5">
        <span className="text-label text-fg-2 font-medium">{t("name")}</span>
        <input
          name="authorName"
          required
          minLength={2}
          maxLength={40}
          autoComplete="nickname"
          className="bg-surface-2 text-body text-fg h-12 rounded-sm px-4"
        />
      </label>

      <label className="flex flex-col gap-1.5">
        <span className="text-label text-fg-2 font-medium">{t("text")}</span>
        <textarea
          name="text"
          required
          rows={4}
          minLength={20}
          maxLength={600}
          placeholder={t("textPlaceholder")}
          className="bg-surface-2 text-body text-fg placeholder:text-fg-3 rounded-sm px-4 py-3"
        />
        <span className="text-caption text-fg-3">{t("textHint")}</span>
      </label>

      {invalid && (
        <p role="alert" className="text-label text-danger">
          {t("invalid")}
        </p>
      )}

      <button
        type="submit"
        className="bg-surface-3 text-fg hover:bg-surface-2 duration-fast text-label inline-flex h-11 w-fit items-center rounded-full px-6 font-medium transition-colors ease-out active:scale-[0.98]"
      >
        {t("submit")}
      </button>
    </form>
  );
}
