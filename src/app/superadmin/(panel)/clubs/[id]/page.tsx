import { notFound } from "next/navigation";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import {
  AMENITY_LABELS,
  TABLE_TYPES,
  TABLE_TYPE_LABELS,
} from "@/entities/club";
import { DAYS, toEdit, type ClubEdit } from "@/entities/club/edit";
import { clubRepository } from "@/entities/club/repository";
import { CITIES } from "@/entities/city";
import { AdminPage } from "@/widgets/superadmin";
import { saveClub } from "../../../actions";

export const dynamic = "force-dynamic";

const BLANK: ClubEdit = {
  name: "",
  city: "kyiv",
  story: "",
  street: "",
  district: "",
  phone: "+380",
  // A new club starts as a draft: onboarding is a conversation, and the
  // catalogue should only ever show clubs somebody has finished.
  published: false,
  onlineBooking: false,
  featured: false,
  accentHue: 145,
  hours: {
    mon: "12:00-23:00",
    tue: "12:00-23:00",
    wed: "12:00-23:00",
    thu: "12:00-23:00",
    fri: "12:00-02:00",
    sat: "12:00-02:00",
    sun: "12:00-23:00",
  },
  tables: [{ type: "russian", count: 4, priceUah: 250 }],
  amenities: [],
};

/**
 * The club form.
 *
 * Everything the free listing tier needs and nothing it does not: a guest
 * deciding where to play wants the name, where it is, when it is open, what
 * a table costs and a phone number. Photographs and a floor plan are what
 * turn a listing into a bookable club, and they arrive later, by which time
 * somebody has actually visited.
 */
export default async function ClubFormPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const [{ id }, query, t] = await Promise.all([
    params,
    searchParams,
    getTranslations("superadmin.clubForm"),
  ]);

  const creating = id === "new";
  const club = creating
    ? undefined
    : await clubRepository.byIdIncludingDrafts(id);
  if (!creating && !club) notFound();

  const values = club ? toEdit(club) : BLANK;

  const field =
    "bg-surface-2 text-body text-fg placeholder:text-fg-3 h-12 w-full rounded-sm px-4";
  const label = "text-label text-fg-2 font-medium";

  return (
    <AdminPage
      title={creating ? t("createTitle") : values.name}
      description={creating ? t("createDescription") : t("editDescription")}
    >
      {query.error === "invalid" && (
        <p role="alert" className="text-label text-danger">
          {t("invalid")}
        </p>
      )}

      <form action={saveClub} className="flex max-w-[820px] flex-col gap-6">
        <input type="hidden" name="id" value={club?.id ?? ""} />

        <section className="grid gap-4 sm:grid-cols-2">
          <label className="flex flex-col gap-1.5">
            <span className={label}>{t("name")}</span>
            <input
              name="name"
              required
              defaultValue={values.name}
              className={field}
            />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className={label}>{t("city")}</span>
            <select name="city" defaultValue={values.city} className={field}>
              {CITIES.map((city) => (
                <option key={city.slug} value={city.slug}>
                  {city.name}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1.5 sm:col-span-2">
            <span className={label}>{t("story")}</span>
            <input
              name="story"
              required
              maxLength={140}
              defaultValue={values.story}
              placeholder={t("storyPlaceholder")}
              className={field}
            />
            <span className="text-caption text-fg-3">{t("storyHint")}</span>
          </label>

          <label className="flex flex-col gap-1.5">
            <span className={label}>{t("street")}</span>
            <input
              name="street"
              required
              defaultValue={values.street}
              className={field}
            />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className={label}>{t("district")}</span>
            <input
              name="district"
              required
              defaultValue={values.district}
              className={field}
            />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className={label}>{t("phone")}</span>
            <input
              name="phone"
              required
              defaultValue={values.phone}
              placeholder="+380441234567"
              className={field}
            />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className={label}>{t("accentHue")}</span>
            <input
              name="accentHue"
              type="number"
              min={0}
              max={360}
              defaultValue={values.accentHue}
              className={field}
            />
            <span className="text-caption text-fg-3">{t("accentHueHint")}</span>
          </label>
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="text-heading text-fg font-semibold">{t("hours")}</h2>
          <p className="text-caption text-fg-3">{t("hoursHint")}</p>
          <div className="grid gap-3 sm:grid-cols-4">
            {DAYS.map((day) => (
              <label key={day} className="flex flex-col gap-1.5">
                <span className={label}>{t(`day.${day}`)}</span>
                <input
                  name={`hours.${day}`}
                  defaultValue={values.hours[day]}
                  placeholder="12:00-23:00"
                  className={field}
                />
              </label>
            ))}
          </div>
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="text-heading text-fg font-semibold">{t("tables")}</h2>
          <p className="text-caption text-fg-3">{t("tablesHint")}</p>
          {TABLE_TYPES.map((type) => {
            const existing = values.tables.find((table) => table.type === type);
            return (
              <div key={type} className="grid gap-3 sm:grid-cols-3">
                <span className="text-label text-fg-2 self-center font-medium">
                  {TABLE_TYPE_LABELS[type]}
                </span>
                <label className="flex flex-col gap-1.5">
                  <span className="text-caption text-fg-3">{t("count")}</span>
                  <input
                    name={`tables.${type}.count`}
                    type="number"
                    min={0}
                    max={60}
                    defaultValue={existing?.count ?? 0}
                    className={field}
                  />
                </label>
                <label className="flex flex-col gap-1.5">
                  <span className="text-caption text-fg-3">
                    {t("priceUah")}
                  </span>
                  <input
                    name={`tables.${type}.priceUah`}
                    type="number"
                    min={0}
                    step={10}
                    defaultValue={existing?.priceUah ?? 0}
                    className={field}
                  />
                </label>
              </div>
            );
          })}
        </section>

        <fieldset className="flex flex-col gap-3">
          <legend className="text-heading text-fg mb-2 font-semibold">
            {t("amenities")}
          </legend>
          <div className="flex flex-wrap gap-x-6 gap-y-3">
            {Object.entries(AMENITY_LABELS).map(([key, name]) => (
              <label key={key} className="flex items-center gap-2">
                <input
                  type="checkbox"
                  name="amenities"
                  value={key}
                  defaultChecked={values.amenities.includes(key)}
                  className="accent-gold size-4"
                />
                <span className="text-label text-fg-2">{name}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset className="flex flex-col gap-3">
          <legend className="text-heading text-fg mb-2 font-semibold">
            {t("status")}
          </legend>
          <label className="flex items-start gap-2">
            <input
              type="checkbox"
              name="published"
              defaultChecked={values.published}
              className="accent-gold mt-1 size-4"
            />
            <span className="flex flex-col">
              <span className="text-label text-fg">{t("published")}</span>
              <span className="text-caption text-fg-3">
                {t("publishedHint")}
              </span>
            </span>
          </label>

          <label className="flex items-start gap-2">
            <input
              type="checkbox"
              name="onlineBooking"
              defaultChecked={values.onlineBooking}
              className="accent-gold mt-1 size-4"
            />
            <span className="flex flex-col">
              <span className="text-label text-fg">{t("onlineBooking")}</span>
              <span className="text-caption text-fg-3">
                {t("onlineBookingHint")}
              </span>
            </span>
          </label>

          <label className="flex items-start gap-2">
            <input
              type="checkbox"
              name="featured"
              defaultChecked={values.featured}
              className="accent-gold mt-1 size-4"
            />
            <span className="flex flex-col">
              <span className="text-label text-fg">{t("featured")}</span>
              <span className="text-caption text-fg-3">
                {t("featuredHint")}
              </span>
            </span>
          </label>
        </fieldset>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="submit"
            className="bg-gold text-bg hover:bg-gold-hover duration-fast text-label inline-flex h-11 items-center rounded-full px-6 font-medium transition-colors ease-out focus-visible:[outline-color:var(--color-fg)] active:scale-[0.98]"
          >
            {t("save")}
          </button>
          <Link
            href="/superadmin/clubs"
            className="text-label text-fg-3 hover:text-fg duration-fast transition-colors ease-out"
          >
            {t("cancel")}
          </Link>
        </div>
      </form>
    </AdminPage>
  );
}
