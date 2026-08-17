import {
  absoluteUrl,
  breadcrumbJsonLd,
  itemListJsonLd,
  localBusinessJsonLd,
} from "../seo";

describe("seo helpers", () => {
  it("builds absolute URLs from relative paths", () => {
    expect(absoluteUrl("/clubs/kyiv")).toBe("http://localhost:3000/clubs/kyiv");
  });

  it("numbers breadcrumb positions from 1 and absolutises items", () => {
    const json = breadcrumbJsonLd([
      { name: "Головна", href: "/" },
      { name: "Київ", href: "/clubs/kyiv" },
    ]);
    expect(json.itemListElement).toHaveLength(2);
    expect(json.itemListElement[1]).toMatchObject({
      position: 2,
      item: "http://localhost:3000/clubs/kyiv",
    });
  });

  it("omits aggregateRating until a club has reviews", () => {
    const base = {
      name: "Класик",
      description: "—",
      url: "/clubs/kyiv/klasyk",
      telephone: "+380442001234",
      streetAddress: "вул. Саксаганського, 12",
      addressLocality: "Київ",
      priceRange: "від 200 ₴/год",
    };
    expect(localBusinessJsonLd(base)).not.toHaveProperty("aggregateRating");
    expect(
      localBusinessJsonLd({ ...base, rating: { value: 4.8, count: 42 } }),
    ).toHaveProperty("aggregateRating.ratingValue", 4.8);
  });

  it("emits an ordered ItemList for catalog results", () => {
    const json = itemListJsonLd(["/clubs/kyiv/a", "/clubs/kyiv/b"]);
    expect(json.itemListElement.map((i) => i.position)).toEqual([1, 2]);
  });
});
