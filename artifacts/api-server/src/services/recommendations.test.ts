import { describe, expect, it } from "vitest";
import {
  explainRecommendation,
  hasSavedPreferences,
  rankProperties,
  relevanceLabel,
  scoreProperty,
  type RecommendationPreferences,
  type RecommendationProperty,
} from "./recommendations";

const preferences: RecommendationPreferences = {
  preferredDestinations: ["Goa"],
  preferredPropertyTypes: ["Villa"],
  preferredAmenities: ["Pool"],
  budgetMin: 5_000,
  budgetMax: 10_000,
  preferredGuests: 2,
};

function property(
  id: string,
  overrides: Partial<RecommendationProperty> = {},
): RecommendationProperty {
  return {
    id,
    title: `Stay ${id}`,
    city: "Goa",
    country: "India",
    pricePerNight: 7_500,
    propertyType: "Villa",
    maxGuests: 2,
    amenities: ["Pool"],
    averageRating: 4.5,
    reviewCount: 10,
    ...overrides,
  };
}

describe("recommendation ranking", () => {
  it("scores a stay that matches every weighted preference at 100", () => {
    expect(scoreProperty(property("match"), preferences)).toBe(100);
  });

  it("filters out stays that cannot fit the requested group", () => {
    const results = rankProperties(
      [property("too-small", { maxGuests: 1 }), property("fits")],
      preferences,
    );
    expect(results.map((result) => result.property.id)).toEqual(["fits"]);
  });

  it("uses a stable ID tie-breaker when preference scores are equal", () => {
    const results = rankProperties(
      [property("stay-b"), property("stay-a")],
      preferences,
    );
    expect(results.map((result) => result.property.id)).toEqual([
      "stay-a",
      "stay-b",
    ]);
  });

  it("returns only concise reasons for preferences the guest actually saved", () => {
    const noBudget: RecommendationPreferences = {
      preferredDestinations: ["Goa"],
      preferredPropertyTypes: [],
      preferredAmenities: [],
      budgetMin: 0,
      budgetMax: 0,
      preferredGuests: 2,
    };
    const reasons = explainRecommendation(property("stay"), noBudget);
    expect(reasons).toContain("Matches your preferred destination");
    expect(reasons).not.toContain("Within your nightly budget");
    expect(reasons.length).toBeLessThanOrEqual(3);
  });

  it("does not count an unspecified budget as a matching relevance dimension", () => {
    const destinationOnly: RecommendationPreferences = {
      preferredDestinations: ["Goa"],
      preferredPropertyTypes: [],
      preferredAmenities: [],
      budgetMin: 0,
      budgetMax: 0,
      preferredGuests: 2,
    };
    expect(relevanceLabel(property("one-match"), destinationOnly)).toBe(1);
    expect(
      relevanceLabel(
        property("not-enough-room", { maxGuests: 1 }),
        destinationOnly,
      ),
    ).toBe(0);
  });

  it("marks two or more matching preference dimensions as highly relevant", () => {
    expect(relevanceLabel(property("strong-match"), preferences)).toBe(2);
  });

  it("only treats non-default values as saved preferences", () => {
    expect(
      hasSavedPreferences({
        preferredDestinations: [],
        preferredPropertyTypes: [],
        preferredAmenities: [],
        budgetMin: 0,
        budgetMax: 50_000,
        preferredGuests: 2,
      }),
    ).toBe(false);
    expect(
      hasSavedPreferences({
        preferredDestinations: ["Goa"],
        preferredPropertyTypes: [],
        preferredAmenities: [],
        budgetMin: 0,
        budgetMax: 50_000,
        preferredGuests: 2,
      }),
    ).toBe(true);
  });
});
