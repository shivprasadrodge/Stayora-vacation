import { Router, type IRouter } from "express";
import {
  CreateReviewBody,
  CreateReviewParams,
  CreateReviewResponse,
  GetDestinationsResponse,
  GetHomeResponse,
  GetPropertiesQueryParams,
  GetPropertiesResponse,
  GetPropertyParams,
  GetPropertyResponse,
  GetPropertyReviewsParams,
  GetPropertyReviewsResponse,
  GetRecommendationsQueryParams,
  GetRecommendationsResponse,
} from "@workspace/api-zod";
import { db } from "@workspace/db";
import { getSignedInUser, withSignedInUser } from "../middlewares/stayoraAuth";
import {
  dateFromCalendarDay,
  toProperty,
  toReview,
  type PropertyRecord,
} from "../services/mappers";
import {
  hasSavedPreferences,
  rankGeneral,
  rankProperties,
  type RecommendationPreferences,
} from "../services/recommendations";

const router: IRouter = Router();

async function popularDestinations() {
  const properties = await db.property.findMany({
    select: { city: true, country: true, imageUrls: true },
  });
  const grouped = new Map<
    string,
    { city: string; country: string; propertyCount: number; imageUrl: string }
  >();
  for (const property of properties) {
    const key = property.city.toLocaleLowerCase();
    const current = grouped.get(key);
    if (current) {
      current.propertyCount += 1;
    } else {
      grouped.set(key, {
        city: property.city,
        country: property.country,
        propertyCount: 1,
        imageUrl: property.imageUrls[0] ?? "",
      });
    }
  }
  return [...grouped.values()].sort(
    (left, right) => right.propertyCount - left.propertyCount,
  );
}

function preferencePayload(preferences: {
  preferredDestinations: string[];
  preferredPropertyTypes: string[];
  preferredAmenities: string[];
  budgetMin: number;
  budgetMax: number;
  preferredGuests: number;
}): RecommendationPreferences {
  return {
    preferredDestinations: preferences.preferredDestinations,
    preferredPropertyTypes: preferences.preferredPropertyTypes,
    preferredAmenities: preferences.preferredAmenities,
    budgetMin: Number(preferences.budgetMin),
    budgetMax: Number(preferences.budgetMax),
    preferredGuests: preferences.preferredGuests,
  };
}

function dateFilters(checkIn?: string | Date, checkOut?: string | Date) {
  if (!checkIn && !checkOut) return {};
  if (!checkIn || !checkOut) {
    throw Object.assign(new Error("Choose both check-in and check-out dates."), {
      status: 400,
    });
  }
  const start = dateFromCalendarDay(checkIn);
  const end = dateFromCalendarDay(checkOut);
  if (
    Number.isNaN(start.getTime()) ||
    Number.isNaN(end.getTime()) ||
    end <= start
  ) {
    throw Object.assign(
      new Error("Check-out must be later than check-in."),
      { status: 400 },
    );
  }
  return {
    bookings: {
      none: {
        status: "confirmed" as const,
        checkIn: { lt: end },
        checkOut: { gt: start },
      },
    },
  };
}

async function matchingProperties(options: {
  q?: string;
  city?: string;
  minPrice?: number;
  maxPrice?: number;
  propertyType?: string;
  bedrooms?: number;
  bathrooms?: number;
  amenities?: string[];
  guests?: number;
  checkIn?: string | Date;
  checkOut?: string | Date;
}) {
  const bookingFilter = dateFilters(options.checkIn, options.checkOut);
  const properties = await db.property.findMany({
    where: {
      ...(options.q
        ? {
            OR: [
              { title: { contains: options.q, mode: "insensitive" as const } },
              { city: { contains: options.q, mode: "insensitive" as const } },
              { country: { contains: options.q, mode: "insensitive" as const } },
              {
                description: {
                  contains: options.q,
                  mode: "insensitive" as const,
                },
              },
            ],
          }
        : {}),
      ...(options.city
        ? { city: { contains: options.city, mode: "insensitive" as const } }
        : {}),
      ...(options.minPrice !== undefined || options.maxPrice !== undefined
        ? {
            pricePerNight: {
              ...(options.minPrice !== undefined
                ? { gte: options.minPrice }
                : {}),
              ...(options.maxPrice !== undefined
                ? { lte: options.maxPrice }
                : {}),
            },
          }
        : {}),
      ...(options.propertyType
        ? {
            propertyType: {
              equals: options.propertyType,
              mode: "insensitive" as const,
            },
          }
        : {}),
      ...(options.bedrooms !== undefined
        ? { bedrooms: { gte: options.bedrooms } }
        : {}),
      ...(options.bathrooms !== undefined
        ? { bathrooms: { gte: options.bathrooms } }
        : {}),
      ...(options.amenities?.length
        ? { amenities: { hasSome: options.amenities } }
        : {}),
      ...(options.guests !== undefined
        ? { maxGuests: { gte: options.guests } }
        : {}),
      ...bookingFilter,
    },
    include: { host: true },
  });
  return properties as unknown as PropertyRecord[];
}

router.get("/home", async (req, res) => {
  const user = await getSignedInUser(req);
  const properties = (await db.property.findMany({
    include: { host: true },
  })) as unknown as PropertyRecord[];
  const destinations = await popularDestinations();
  const preferenceRecord = user
    ? await db.userPreference.findUnique({ where: { userId: user.id } })
    : null;
  const preferences = preferenceRecord
    ? preferencePayload(preferenceRecord)
    : null;
  const recommendationsAreGeneral = !hasSavedPreferences(preferences);
  const recommendations = recommendationsAreGeneral
    ? rankGeneral(properties).slice(0, 8)
    : rankProperties(
        properties,
        preferences,
        preferences.preferredGuests,
      ).slice(0, 8);
  const data = GetHomeResponse.parse({
    featured: [...properties]
      .sort(
        (left, right) =>
          right.averageRating - left.averageRating ||
          right.reviewCount - left.reviewCount,
      )
      .slice(0, 8)
      .map(toProperty),
    popularDestinations: destinations,
    recommendations: recommendations.map((recommendation) => ({
      ...recommendation,
      property: toProperty(recommendation.property as PropertyRecord),
    })),
    recommendationsAreGeneral,
  });
  res.json(data);
});

router.get("/destinations", async (_req, res) => {
  res.json(GetDestinationsResponse.parse(await popularDestinations()));
});

router.get("/properties", async (req, res) => {
  const parsed = GetPropertiesQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: "Search filters are invalid." });
    return;
  }
  const filters = parsed.data;
  const properties = await matchingProperties({
    q: filters.q,
    city: filters.city,
    minPrice: filters.minPrice,
    maxPrice: filters.maxPrice,
    propertyType: filters.propertyType,
    bedrooms: filters.bedrooms,
    bathrooms: filters.bathrooms,
    amenities: filters.amenities,
    guests: filters.guests,
    checkIn: filters.checkIn,
    checkOut: filters.checkOut,
  });

  let ordered = properties;
  if (filters.sort === "price_asc") {
    ordered = [...properties].sort(
      (left, right) => left.pricePerNight - right.pricePerNight,
    );
  } else if (filters.sort === "price_desc") {
    ordered = [...properties].sort(
      (left, right) => right.pricePerNight - left.pricePerNight,
    );
  } else if (filters.sort === "rating") {
    ordered = [...properties].sort(
      (left, right) =>
        right.averageRating - left.averageRating ||
        right.reviewCount - left.reviewCount,
    );
  } else {
    const user = await getSignedInUser(req);
    const prefRecord = user
      ? await db.userPreference.findUnique({ where: { userId: user.id } })
      : null;
    if (prefRecord && hasSavedPreferences(preferencePayload(prefRecord))) {
      ordered = rankProperties(
        properties,
        preferencePayload(prefRecord),
        filters.guests ?? preferenceRecordGuests(prefRecord),
      ).map((item) => item.property as PropertyRecord);
    } else {
      ordered = rankGeneral(properties, filters.guests).map(
        (item) => item.property as PropertyRecord,
      );
    }
  }

  res.json(
    GetPropertiesResponse.parse({
      properties: ordered.map(toProperty),
      total: ordered.length,
    }),
  );
});

function preferenceRecordGuests(preferences: { preferredGuests: number }) {
  return preferences.preferredGuests;
}

router.get("/properties/:propertyId", async (req, res) => {
  const parsed = GetPropertyParams.safeParse(req.params);
  if (!parsed.success) {
    res.status(400).json({ error: "Property ID is invalid." });
    return;
  }
  const property = await db.property.findUnique({
    where: { id: parsed.data.propertyId },
    include: { host: true },
  });
  if (!property) {
    res.status(404).json({ error: "This stay could not be found." });
    return;
  }
  res.json(GetPropertyResponse.parse(toProperty(property as PropertyRecord)));
});

router.get("/properties/:propertyId/reviews", async (req, res) => {
  const parsed = GetPropertyReviewsParams.safeParse(req.params);
  if (!parsed.success) {
    res.status(400).json({ error: "Property ID is invalid." });
    return;
  }
  const reviews = await db.review.findMany({
    where: { propertyId: parsed.data.propertyId },
    include: { user: true },
    orderBy: { createdAt: "desc" },
  });
  res.json(GetPropertyReviewsResponse.parse(reviews.map(toReview)));
});

router.post(
  "/properties/:propertyId/reviews",
  withSignedInUser(async (req, res) => {
    const params = CreateReviewParams.safeParse(req.params);
    const body = CreateReviewBody.safeParse(req.body);
    if (!params.success || !body.success) {
      res.status(400).json({ error: "Add a rating and a short review." });
      return;
    }
    const today = dateFromCalendarDay(new Date().toISOString().slice(0, 10));
    const eligibleBooking = await db.booking.findFirst({
      where: {
        propertyId: params.data.propertyId,
        userId: req.stayoraUser.id,
        status: { in: ["confirmed", "completed"] },
        checkOut: { lte: today },
      },
    });
    if (!eligibleBooking) {
      res.status(403).json({ error: "You can review a stay after check-out." });
      return;
    }

    try {
      const review = await db.$transaction(async (transaction) => {
        const created = await transaction.review.create({
          data: {
            userId: req.stayoraUser.id,
            propertyId: params.data.propertyId,
            bookingId: eligibleBooking.id,
            rating: body.data.rating,
            comment: body.data.comment.trim(),
          },
          include: { user: true },
        });
        const aggregate = await transaction.review.aggregate({
          where: { propertyId: params.data.propertyId },
          _avg: { rating: true },
          _count: { _all: true },
        });
        await transaction.property.update({
          where: { id: params.data.propertyId },
          data: {
            averageRating: aggregate._avg.rating ?? 0,
            reviewCount: aggregate._count._all,
          },
        });
        return created;
      });
      res
        .status(201)
        .json(CreateReviewResponse.parse(toReview(review)));
    } catch (error) {
      if (
        typeof error === "object" &&
        error !== null &&
        "code" in error &&
        error.code === "P2002"
      ) {
        res.status(409).json({ error: "You have already reviewed this stay." });
        return;
      }
      throw error;
    }
  }),
);

router.get("/recommendations", async (req, res) => {
  const parsed = GetRecommendationsQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: "Recommendation request is invalid." });
    return;
  }
  const user = await getSignedInUser(req);
  const preferenceRecord = user
    ? await db.userPreference.findUnique({ where: { userId: user.id } })
    : null;
  const preferences = preferenceRecord ? preferencePayload(preferenceRecord) : null;
  const requestedGuests =
    parsed.data.guests ?? preferences?.preferredGuests ?? 0;
  const properties = await matchingProperties({
    guests: requestedGuests || undefined,
    checkIn: parsed.data.checkIn,
    checkOut: parsed.data.checkOut,
  });
  const general = !hasSavedPreferences(preferences);
  const items = general
    ? rankGeneral(properties, requestedGuests).slice(0, parsed.data.limit)
    : rankProperties(
        properties,
        preferences,
        requestedGuests || preferences.preferredGuests,
      ).slice(0, parsed.data.limit);
  res.json(
    GetRecommendationsResponse.parse({
      items: items.map((item) => ({
        ...item,
        property: toProperty(item.property as PropertyRecord),
      })),
      general,
      method: general ? "general-popularity" : "preference-weighted-v1",
    }),
  );
});

export default router;
