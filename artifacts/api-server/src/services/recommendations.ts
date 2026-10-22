export interface RecommendationProperty {
  id: string;
  title: string;
  city: string;
  country: string;
  pricePerNight: number;
  propertyType: string;
  maxGuests: number;
  amenities: string[];
  averageRating: number;
  reviewCount: number;
}

export interface RecommendationPreferences {
  preferredDestinations: string[];
  preferredPropertyTypes: string[];
  preferredAmenities: string[];
  budgetMin: number;
  budgetMax: number;
  preferredGuests: number;
}

export interface RankedRecommendation<T extends RecommendationProperty> {
  property: T;
  score: number;
  reasons: string[];
}

const WEIGHTS = {
  destination: 0.3,
  budget: 0.25,
  amenities: 0.2,
  propertyType: 0.15,
  guestCapacity: 0.1,
} as const;

const normalized = (value: string) => value.trim().toLocaleLowerCase();

function destinationScore(
  property: RecommendationProperty,
  preferences: RecommendationPreferences,
): number {
  if (preferences.preferredDestinations.length === 0) return 0.5;
  const city = normalized(property.city);
  const country = normalized(property.country);
  const destinations = preferences.preferredDestinations.map(normalized);
  if (destinations.some((destination) => destination === city)) return 1;
  if (
    destinations.some(
      (destination) =>
        city.includes(destination) ||
        destination.includes(city) ||
        country.includes(destination),
    )
  ) {
    return 0.75;
  }
  return 0;
}

function budgetScore(
  property: RecommendationProperty,
  preferences: RecommendationPreferences,
): number {
  const { budgetMin, budgetMax } = preferences;
  if (budgetMin <= 0 && budgetMax <= 0) return 0.5;
  if (budgetMax > 0 && property.pricePerNight <= budgetMax) {
    if (budgetMin <= 0 || property.pricePerNight >= budgetMin) return 1;
    const belowMinimum = (budgetMin - property.pricePerNight) / Math.max(budgetMin, 1);
    return Math.max(0.4, 1 - belowMinimum * 0.6);
  }
  if (budgetMax > 0) {
    const overBudget = (property.pricePerNight - budgetMax) / Math.max(budgetMax, 1);
    return Math.max(0, 1 - overBudget);
  }
  const belowMinimum = (budgetMin - property.pricePerNight) / Math.max(budgetMin, 1);
  return Math.max(0.2, 1 - belowMinimum * 0.8);
}

function amenityScore(
  property: RecommendationProperty,
  preferences: RecommendationPreferences,
): number {
  if (preferences.preferredAmenities.length === 0) return 0.5;
  const amenities = new Set(property.amenities.map(normalized));
  const matched = preferences.preferredAmenities.filter((amenity) =>
    amenities.has(normalized(amenity)),
  ).length;
  return matched / preferences.preferredAmenities.length;
}

function typeScore(
  property: RecommendationProperty,
  preferences: RecommendationPreferences,
): number {
  if (preferences.preferredPropertyTypes.length === 0) return 0.5;
  return preferences.preferredPropertyTypes.some(
    (type) => normalized(type) === normalized(property.propertyType),
  )
    ? 1
    : 0.2;
}

function guestScore(
  property: RecommendationProperty,
  desiredGuests: number,
): number {
  if (desiredGuests < 1) return 0.5;
  if (property.maxGuests < desiredGuests) return 0;
  if (property.maxGuests === desiredGuests) return 1;
  return Math.max(0.5, 1 - (property.maxGuests - desiredGuests) / property.maxGuests);
}

export function hasSavedPreferences(
  preferences: RecommendationPreferences | null | undefined,
): preferences is RecommendationPreferences {
  if (!preferences) return false;
  return (
    preferences.preferredDestinations.length > 0 ||
    preferences.preferredPropertyTypes.length > 0 ||
    preferences.preferredAmenities.length > 0 ||
    preferences.budgetMin > 0 ||
    (preferences.budgetMax > 0 && preferences.budgetMax < 50000)
  );
}

export function scoreProperty(
  property: RecommendationProperty,
  preferences: RecommendationPreferences,
  requestedGuests = preferences.preferredGuests,
): number {
  const weighted =
    destinationScore(property, preferences) * WEIGHTS.destination +
    budgetScore(property, preferences) * WEIGHTS.budget +
    amenityScore(property, preferences) * WEIGHTS.amenities +
    typeScore(property, preferences) * WEIGHTS.propertyType +
    guestScore(property, requestedGuests) * WEIGHTS.guestCapacity;
  return Math.round(weighted * 1000) / 10;
}

export function explainRecommendation(
  property: RecommendationProperty,
  preferences: RecommendationPreferences,
  requestedGuests = preferences.preferredGuests,
): string[] {
  const reasons: string[] = [];
  const hasBudgetPreference =
    preferences.budgetMin > 0 || preferences.budgetMax > 0;
  const matchedDestination = preferences.preferredDestinations.some((destination) => {
    const normalizedDestination = normalized(destination);
    return (
      normalized(property.city) === normalizedDestination ||
      normalized(property.city).includes(normalizedDestination) ||
      normalized(property.country).includes(normalizedDestination)
    );
  });
  const matchesBudget = hasBudgetPreference &&
    (preferences.budgetMin <= 0 || property.pricePerNight >= preferences.budgetMin) &&
    (preferences.budgetMax <= 0 || property.pricePerNight <= preferences.budgetMax);
  const matchingAmenities = preferences.preferredAmenities.filter((amenity) =>
    property.amenities.some((item) => normalized(item) === normalized(amenity)),
  ).length;
  const matchingType = preferences.preferredPropertyTypes.some(
    (type) => normalized(type) === normalized(property.propertyType),
  );

  if (matchedDestination) reasons.push("Matches your preferred destination");
  if (matchesBudget) reasons.push("Within your nightly budget");
  if (matchingAmenities > 0) {
    reasons.push(
      `Includes ${matchingAmenities} preferred amenit${matchingAmenities === 1 ? "y" : "ies"}`,
    );
  }
  if (matchingType) reasons.push(`Matches your preferred stay type`);
  if (requestedGuests > 0 && property.maxGuests >= requestedGuests) {
    reasons.push(`Fits your group of ${requestedGuests}`);
  }
  if (reasons.length === 0) reasons.push("A strong match across your saved preferences");
  return reasons.slice(0, 3);
}

export function rankProperties<T extends RecommendationProperty>(
  properties: T[],
  preferences: RecommendationPreferences,
  requestedGuests = preferences.preferredGuests,
): RankedRecommendation<T>[] {
  return properties
    .filter((property) => property.maxGuests >= requestedGuests)
    .map((property) => ({
      property,
      score: scoreProperty(property, preferences, requestedGuests),
      reasons: explainRecommendation(property, preferences, requestedGuests),
    }))
    .sort(
      (left, right) =>
        right.score - left.score ||
        right.property.averageRating - left.property.averageRating ||
        right.property.reviewCount - left.property.reviewCount ||
        left.property.id.localeCompare(right.property.id),
    );
}

export function rankGeneral<T extends RecommendationProperty>(
  properties: T[],
  requestedGuests = 0,
): RankedRecommendation<T>[] {
  return properties
    .filter((property) => requestedGuests < 1 || property.maxGuests >= requestedGuests)
    .sort(
      (left, right) =>
        right.averageRating - left.averageRating ||
        right.reviewCount - left.reviewCount ||
        left.id.localeCompare(right.id),
    )
    .map((property) => ({
      property,
      score: Math.round(property.averageRating * 20),
      reasons: [
        "Popular with travelers",
        `Rated ${property.averageRating.toFixed(1)} by guests`,
      ],
    }));
}

export function relevanceLabel(
  property: RecommendationProperty,
  preferences: RecommendationPreferences,
  requestedGuests = preferences.preferredGuests,
): 0 | 1 | 2 {
  if (property.maxGuests < requestedGuests) return 0;
  const destination = preferences.preferredDestinations.some(
    (item) => normalized(item) === normalized(property.city),
  );
  const hasBudgetPreference =
    preferences.budgetMin > 0 || preferences.budgetMax > 0;
  const inBudget = hasBudgetPreference &&
    (preferences.budgetMin <= 0 || property.pricePerNight >= preferences.budgetMin) &&
    (preferences.budgetMax <= 0 || property.pricePerNight <= preferences.budgetMax);
  const typeMatch = preferences.preferredPropertyTypes.some(
    (item) => normalized(item) === normalized(property.propertyType),
  );
  const amenityMatch = preferences.preferredAmenities.some((item) =>
    property.amenities.some((amenity) => normalized(amenity) === normalized(item)),
  );
  const matchingDimensions = [destination, inBudget, typeMatch, amenityMatch].filter(
    Boolean,
  ).length;
  if (matchingDimensions >= 2) return 2;
  if (matchingDimensions === 1) return 1;
  return 0;
}
