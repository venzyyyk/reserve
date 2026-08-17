"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { applicationRepository } from "@/entities/application/repository";
import { bookingRepository } from "@/entities/booking/repository";
import { TABLE_TYPES } from "@/entities/club";
import { DAYS, applyEdit, clubEditSchema } from "@/entities/club/edit";
import { clubRepository } from "@/entities/club/repository";
import { billingRepository } from "@/entities/billing/repository";
import {
  placementEditSchema,
  planEditSchema,
  promotionEditSchema,
} from "@/entities/billing/schema";
import { reviewRepository } from "@/entities/review/repository";
import { isSuperAdmin, signIn, signOut } from "@/entities/user/session";
import { userRepository } from "@/entities/user/repository";

/**
 * Every mutation re-checks the session. The layout already redirects
 * unauthenticated visitors, but a server action is a public endpoint —
 * guarding only the page that renders the button would guard nothing.
 */
async function assertAdmin(): Promise<void> {
  if (!(await isSuperAdmin())) {
    throw new Error("Not authorised");
  }
}

export async function signInAction(
  _state: { error?: string },
  formData: FormData,
): Promise<{ error?: string }> {
  const password = String(formData.get("password") ?? "");
  if (!(await signIn(password))) {
    return { error: "Невірний пароль" };
  }
  redirect("/superadmin");
}

export async function signOutAction(): Promise<void> {
  await signOut();
  redirect("/superadmin/login");
}

export async function decideApplication(formData: FormData): Promise<void> {
  await assertAdmin();
  const id = String(formData.get("id") ?? "");
  const decision = String(formData.get("decision") ?? "");
  const note = String(formData.get("note") ?? "");
  if (decision !== "approved" && decision !== "rejected") return;

  const decided = await applicationRepository.decide(id, decision, note);
  revalidatePath("/superadmin/applications");
  revalidatePath("/superadmin");

  // Approving a club creates its draft, pre-filled with what the form
  // already told us. It is not published: a club still needs hours, prices
  // and somebody to have spoken to it. But nobody should have to retype the
  // name and phone number that are sitting right there.
  if (decision === "approved" && decided?.status === "approved") {
    const draft = applyEdit(
      {
        name: decided.clubName,
        city: decided.citySlug,
        story: "",
        street: "",
        district: "",
        phone: decided.phone,
        published: false,
        onlineBooking: false,
        featured: false,
        accentHue: 145,
        hours: {
          mon: "",
          tue: "",
          wed: "",
          thu: "",
          fri: "",
          sat: "",
          sun: "",
        },
        tables: [{ type: "russian", count: decided.tableCount, priceUah: 250 }],
        amenities: [],
      },
      undefined,
    );
    await clubRepository.save(draft);
    revalidatePath("/superadmin/clubs");
  }
}

export async function savePlan(formData: FormData): Promise<void> {
  await assertAdmin();
  const id = String(formData.get("id") ?? "");

  const parsed = planEditSchema.safeParse({
    name: String(formData.get("name") ?? ""),
    tagline: String(formData.get("tagline") ?? ""),
    // Prices are entered in hryvnia and stored in kopiykas — the admin
    // types 1490, never 149000.
    priceMonthly: Math.round(Number(formData.get("priceUah") ?? 0) * 100),
    commissionPercent: Number(formData.get("commissionPercent") ?? 0),
    featuredDays: Number(formData.get("featuredDays") ?? 0),
    homepageBanner: formData.get("homepageBanner") === "on",
    priorityRecommendations: formData.get("priorityRecommendations") === "on",
    featureIds: formData.getAll("featureIds").map(String),
    active: formData.get("active") === "on",
    highlighted: formData.get("highlighted") === "on",
  });
  if (!parsed.success) return;

  await billingRepository.updatePlan(id, parsed.data);
  revalidatePath("/superadmin/plans");
  revalidatePath("/for-clubs");
}

export async function savePlacement(formData: FormData): Promise<void> {
  await assertAdmin();
  const parsed = placementEditSchema.safeParse({
    clubId: String(formData.get("clubId") ?? ""),
    planId: String(formData.get("planId") ?? ""),
    featuredDays: Number(formData.get("featuredDays") ?? 0),
    bannerDays: Number(formData.get("bannerDays") ?? 0),
    bannerHeadline: String(formData.get("bannerHeadline") ?? ""),
  });
  if (!parsed.success) return;

  await billingRepository.setPlacement(parsed.data);
  revalidatePath("/superadmin/placements");
  revalidatePath("/");
}

export async function savePromotion(formData: FormData): Promise<void> {
  await assertAdmin();
  const id = String(formData.get("id") ?? "");
  const expiresAt = String(formData.get("expiresAt") ?? "");

  const parsed = promotionEditSchema.safeParse({
    code: String(formData.get("code") ?? "").toUpperCase(),
    description: String(formData.get("description") ?? ""),
    percentOff: Number(formData.get("percentOff") ?? 0),
    expiresAt: expiresAt === "" ? null : expiresAt,
    active: formData.get("active") === "on",
  });
  if (!parsed.success) return;

  await billingRepository.savePromotion(id === "" ? null : id, parsed.data);
  revalidatePath("/superadmin/promotions");
}

export async function deletePromotion(formData: FormData): Promise<void> {
  await assertAdmin();
  await billingRepository.deletePromotion(String(formData.get("id") ?? ""));
  revalidatePath("/superadmin/promotions");
}

export async function moderateReview(formData: FormData): Promise<void> {
  await assertAdmin();
  const id = String(formData.get("id") ?? "");
  const decision = String(formData.get("decision") ?? "");
  if (decision !== "published" && decision !== "rejected") return;

  const moderated = await reviewRepository.moderate(id, decision);
  revalidatePath("/superadmin/reviews");
  revalidatePath("/superadmin");

  // The club page is static and refreshes hourly. A published review is the
  // one thing on it that a person is waiting to see, so it is pushed rather
  // than waited for.
  if (moderated) {
    const club = await clubRepository.byId(moderated.clubId);
    if (club) revalidatePath(`/clubs/${club.city}/${club.slug}`);
  }
}

export async function setUserBlocked(formData: FormData): Promise<void> {
  await assertAdmin();
  await userRepository.setBlocked(
    String(formData.get("id") ?? ""),
    formData.get("blocked") === "true",
  );
  revalidatePath("/superadmin/users");
}

/**
 * Cancels a booking on the club's behalf — a burst pipe, a power cut, a
 * table that broke. The repository flags a refund when the guest had
 * already paid, so the money owed shows up on this screen instead of being
 * remembered by somebody.
 */
export async function cancelBooking(formData: FormData): Promise<void> {
  await assertAdmin();
  const id = String(formData.get("id") ?? "");
  if (id === "") return;

  await bookingRepository.cancel(id);
  revalidatePath("/superadmin/bookings");
}

/**
 * Creates or updates a club.
 *
 * The form is flat strings, as HTML forms are; the shape it becomes is
 * validated by the same schema the content file always used, so a club
 * typed into the panel and a club that shipped in the repository are the
 * same thing to everything downstream.
 */
export async function saveClub(formData: FormData): Promise<void> {
  await assertAdmin();
  const id = String(formData.get("id") ?? "");

  const tables = TABLE_TYPES.map((type) => ({
    type,
    count: Number(formData.get(`tables.${type}.count`) ?? 0),
    priceUah: Number(formData.get(`tables.${type}.priceUah`) ?? 0),
  })).filter((table) => table.count > 0 && table.priceUah > 0);

  const parsed = clubEditSchema.safeParse({
    name: String(formData.get("name") ?? ""),
    city: String(formData.get("city") ?? ""),
    story: String(formData.get("story") ?? ""),
    street: String(formData.get("street") ?? ""),
    district: String(formData.get("district") ?? ""),
    phone: String(formData.get("phone") ?? ""),
    published: formData.get("published") === "on",
    onlineBooking: formData.get("onlineBooking") === "on",
    featured: formData.get("featured") === "on",
    accentHue: Number(formData.get("accentHue") ?? 145),
    hours: Object.fromEntries(
      DAYS.map((day) => [day, String(formData.get(`hours.${day}`) ?? "")]),
    ),
    tables,
    amenities: formData.getAll("amenities").map(String),
  });

  if (!parsed.success) {
    redirect(`/superadmin/clubs/${id === "" ? "new" : id}?error=invalid`);
  }

  const existing =
    id === "" ? undefined : await clubRepository.byIdIncludingDrafts(id);
  const club = applyEdit(parsed.data, existing);
  await clubRepository.save(club);

  // The catalogue and the club's own page are static; a change an operator
  // just made should not wait an hour to be visible.
  revalidatePath("/superadmin/clubs");
  revalidatePath("/clubs");
  revalidatePath(`/clubs/${club.city}`);
  revalidatePath(`/clubs/${club.city}/${club.slug}`);
  revalidatePath("/");

  redirect("/superadmin/clubs");
}

/** Hides a club from the catalogue without deleting anything. */
export async function setClubPublished(formData: FormData): Promise<void> {
  await assertAdmin();
  const id = String(formData.get("id") ?? "");
  const published = formData.get("published") === "true";

  const club = await clubRepository.byIdIncludingDrafts(id);
  if (!club) return;

  await clubRepository.save({ ...club, published });
  revalidatePath("/superadmin/clubs");
  revalidatePath("/clubs");
  revalidatePath(`/clubs/${club.city}`);
  revalidatePath(`/clubs/${club.city}/${club.slug}`);
  revalidatePath("/");
}
