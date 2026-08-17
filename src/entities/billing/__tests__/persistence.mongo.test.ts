import { beforeEach, describe, expect, it } from "vitest";
import { closeMongo } from "@/shared/db/client";
import { mongoApplicationRepository } from "@/entities/application/repository.mongo";
import { mongoReviewRepository } from "@/entities/review/repository.mongo";
import { mongoBillingRepository as billing } from "../repository.mongo";
import seed from "../content/plans.uk.json";

/**
 * Super Admin's work has to outlive the container it was typed into.
 *
 * M3 made pricing data; M2b makes it durable. The test that matters is the
 * unglamorous one: change a price, drop every connection, read it back.
 */
const plans = seed.plans;
const features = seed.features;

async function reseed(): Promise<void> {
  await billing._reset();
  const { collection, COLLECTIONS } = await import("@/shared/db/collections");
  const [planDocs, featureDocs] = await Promise.all([
    collection(COLLECTIONS.billingPlans),
    collection(COLLECTIONS.billingFeatures),
  ]);
  await featureDocs.insertMany(features.map((feature) => ({ ...feature })));
  await planDocs.insertMany(plans.map((plan) => ({ ...plan })));
}

const vipEdit = (over: Record<string, unknown> = {}) => {
  const vip = plans.find((plan) => plan.id === "plan_vip");
  if (!vip) throw new Error("seed changed");
  return {
    name: vip.name,
    tagline: vip.tagline,
    priceMonthly: vip.priceMonthly,
    commissionPercent: vip.commissionPercent,
    featuredDays: vip.featuredDays,
    homepageBanner: vip.homepageBanner,
    priorityRecommendations: vip.priorityRecommendations,
    featureIds: vip.featureIds,
    active: vip.active,
    highlighted: vip.highlighted,
    ...over,
  };
};

describe("billing persistence", () => {
  beforeEach(reseed);

  it("keeps a new VIP price across a reconnect", async () => {
    await billing.updatePlan("plan_vip", vipEdit({ priceMonthly: 199_900 }));

    await closeMongo();

    const vip = await billing.planById("plan_vip");
    expect(vip?.priceMonthly).toBe(199_900);
  });

  it("keeps a renamed plan and its featured window across a reconnect", async () => {
    await billing.updatePlan(
      "plan_vip",
      vipEdit({ name: "VIP+", featuredDays: 45 }),
    );

    await closeMongo();

    const vip = await billing.planById("plan_vip");
    expect(vip?.name).toBe("VIP+");
    expect(vip?.featuredDays).toBe(45);
  });

  it("keeps at most one highlighted plan, and remembers which", async () => {
    await billing.updatePlan("plan_pro", {
      ...vipEdit({ highlighted: true }),
      name: "PRO",
    });

    await closeMongo();

    const highlighted = (await billing.listPlans()).filter(
      (plan) => plan.highlighted,
    );
    expect(highlighted.map((plan) => plan.id)).toEqual(["plan_pro"]);
  });

  it("drops unknown feature ids rather than storing them", async () => {
    const updated = await billing.updatePlan(
      "plan_vip",
      vipEdit({ featureIds: ["listing", "not-a-feature"] }),
    );
    expect(updated?.featureIds).toEqual(["listing"]);
  });

  it("keeps a placement across a reconnect", async () => {
    await billing.setPlacement({
      clubId: "clb_kyiv_klasyk",
      planId: "plan_vip",
      featuredDays: 30,
      bannerDays: 0,
      bannerHeadline: "  ",
    });

    await closeMongo();

    const placement = await billing.placementFor("clb_kyiv_klasyk");
    expect(placement?.planId).toBe("plan_vip");
    expect(placement?.featuredUntil).not.toBeNull();
    expect(placement?.bannerUntil).toBeNull();
    // Whitespace is not a headline.
    expect(placement?.bannerHeadline).toBeUndefined();
  });

  it("stores one placement per club, overwriting rather than accumulating", async () => {
    for (const planId of ["plan_vip", "plan_pro"]) {
      await billing.setPlacement({
        clubId: "clb_kyiv_klasyk",
        planId,
        featuredDays: 10,
        bannerDays: 0,
      });
    }

    const all = await billing.listPlacements();
    expect(
      all.filter((item) => item.clubId === "clb_kyiv_klasyk"),
    ).toHaveLength(1);
  });

  it("keeps promotion usage when the offer is edited", async () => {
    const created = await billing.savePromotion(null, {
      code: "STARTUA",
      description: "Перший місяць дешевше",
      percentOff: 30,
      expiresAt: null,
      active: true,
    });

    const edited = await billing.savePromotion(created.id, {
      code: "STARTUA",
      description: "Перший місяць дешевше",
      percentOff: 40,
      expiresAt: null,
      active: true,
    });

    expect(edited.id).toBe(created.id);
    expect(edited.percentOff).toBe(40);
    expect(edited.usedCount).toBe(created.usedCount);

    await billing.deletePromotion(created.id);
    expect(await billing.listPromotions()).toHaveLength(0);
  });
});

describe("club applications persistence", () => {
  beforeEach(async () => {
    const { collection, COLLECTIONS } = await import("@/shared/db/collections");
    const applications = await collection(COLLECTIONS.clubApplications);
    await applications.deleteMany({});
  });

  it("keeps a submitted application across a reconnect", async () => {
    const created = await mongoApplicationRepository.create({
      clubName: "Дуплет",
      citySlug: "kharkiv",
      contactName: "Андрій",
      phone: "+380501234567",
      tableCount: 7,
      planId: "plan_vip",
    });

    await closeMongo();

    const pending = await mongoApplicationRepository.list("pending");
    expect(pending.map((item) => item.id)).toContain(created.id);
    expect(await mongoApplicationRepository.countPending()).toBe(1);
  });

  it("keeps a decision, and keeps it one-way", async () => {
    const created = await mongoApplicationRepository.create({
      clubName: "Кий і Куля",
      citySlug: "dnipro",
      contactName: "Марина",
      phone: "+380671112233",
      tableCount: 4,
      planId: "plan_basic",
    });

    await mongoApplicationRepository.decide(created.id, "approved", "Вітаємо");
    // A second, contradictory decision must not overwrite the first.
    const again = await mongoApplicationRepository.decide(
      created.id,
      "rejected",
    );
    expect(again?.status).toBe("approved");

    await closeMongo();

    const stored = await mongoApplicationRepository.list();
    expect(stored[0]?.status).toBe("approved");
    expect(stored[0]?.decisionNote).toBe("Вітаємо");
    expect(await mongoApplicationRepository.countPending()).toBe(0);
  });
});

describe("reviews persistence", () => {
  beforeEach(async () => {
    const { collection, COLLECTIONS } = await import("@/shared/db/collections");
    const reviews = await collection(COLLECTIONS.reviews);
    await reviews.deleteMany({});
  });

  it("files one review per booking even when submitted twice at once", async () => {
    const input = {
      clubId: "clb_kyiv_klasyk",
      clubName: "Класик",
      bookingId: "bk_mongo_1",
      authorName: "Тарас",
      rating: 5 as const,
      text: "Столи рівні, сукно нове, адміністратор допоміг з києм.",
    };

    const [first, second] = await Promise.all([
      mongoReviewRepository.create(input),
      mongoReviewRepository.create({
        ...input,
        text: "Інший текст, теж довгий.",
      }),
    ]);

    expect(second.id).toBe(first.id);
    expect(await mongoReviewRepository.countPending()).toBe(1);
  });

  it("shows a review publicly only once published, and remembers that", async () => {
    const created = await mongoReviewRepository.create({
      clubId: "clb_lviv_ratusha",
      clubName: "Ратуша",
      bookingId: "bk_mongo_2",
      authorName: "Ігор",
      rating: 5,
      text: "Найкраще сукно у Львові, без перебільшення.",
    });

    expect(
      await mongoReviewRepository.listPublished("clb_lviv_ratusha"),
    ).toHaveLength(0);

    await mongoReviewRepository.moderate(created.id, "published");
    await closeMongo();

    const shown = await mongoReviewRepository.listPublished("clb_lviv_ratusha");
    expect(shown.map((review) => review.id)).toEqual([created.id]);
    expect(shown[0]?.verified).toBe(true);
  });
});
