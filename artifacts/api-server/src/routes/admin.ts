import { Router, type IRouter } from "express";
import {
  DeleteAdminPropertyParams,
  DeleteAdminPropertyResponse,
  GetAdminOverviewResponse,
  GetAdminPropertiesResponse,
  GetAdminUsersResponse,
  GetLatestEvaluationResponse,
  RunEvaluationResponse,
  UpdateUserRoleBody,
  UpdateUserRoleParams,
  UpdateUserRoleResponse,
} from "@workspace/api-zod";
import { db } from "@workspace/db";
import { withAdmin } from "../middlewares/stayoraAuth";
import {
  mean,
  ndcgAt5,
  precisionAt5,
} from "../services/evaluation";
import { toProperty, type PropertyRecord } from "../services/mappers";
import {
  rankProperties,
  relevanceLabel,
  type RecommendationPreferences,
} from "../services/recommendations";

const router: IRouter = Router();

function toUser(user: {
  id: string;
  name: string;
  email: string;
  role: "guest" | "host" | "admin";
  createdAt: Date;
}) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    createdAt: user.createdAt.toISOString(),
  };
}

router.get(
  "/admin/overview",
  withAdmin(async (_req, res) => {
    const [userCount, propertyCount, bookingCount, reviewCount, bookings] =
      await Promise.all([
        db.user.count(),
        db.property.count(),
        db.booking.count(),
        db.review.count(),
        db.booking.findMany({
          where: {
            createdAt: {
              gte: new Date(
                Date.UTC(
                  new Date().getUTCFullYear(),
                  new Date().getUTCMonth() - 5,
                  1,
                ),
              ),
            },
          },
          select: { createdAt: true },
        }),
      ]);

    const now = new Date();
    const bookingCounts = new Map<string, number>();
    const bookingTrend = Array.from({ length: 6 }, (_, index) => {
      const monthDate = new Date(
        Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 5 + index, 1),
      );
      const key = `${monthDate.getUTCFullYear()}-${monthDate.getUTCMonth()}`;
      const label = new Intl.DateTimeFormat("en-IN", {
        month: "short",
        timeZone: "UTC",
      }).format(monthDate);
      return { key, label };
    });
    for (const booking of bookings) {
      const key = `${booking.createdAt.getUTCFullYear()}-${booking.createdAt.getUTCMonth()}`;
      bookingCounts.set(key, (bookingCounts.get(key) ?? 0) + 1);
    }

    const popularIds = await db.booking.groupBy({
      by: ["propertyId"],
      _count: { propertyId: true },
      orderBy: { _count: { propertyId: "desc" } },
      take: 5,
    });
    let popularProperties: PropertyRecord[];
    if (popularIds.length > 0) {
      const propertyRows = (await db.property.findMany({
        where: { id: { in: popularIds.map((entry) => entry.propertyId) } },
        include: { host: true },
      })) as unknown as PropertyRecord[];
      const order = new Map(
        popularIds.map((entry, index) => [entry.propertyId, index]),
      );
      popularProperties = propertyRows.sort(
        (left, right) =>
          (order.get(left.id) ?? Number.MAX_SAFE_INTEGER) -
          (order.get(right.id) ?? Number.MAX_SAFE_INTEGER),
      );
    } else {
      popularProperties = (await db.property.findMany({
        include: { host: true },
        orderBy: [{ averageRating: "desc" }, { reviewCount: "desc" }],
        take: 5,
      })) as unknown as PropertyRecord[];
    }

    res.json(
      GetAdminOverviewResponse.parse({
        userCount,
        propertyCount,
        bookingCount,
        reviewCount,
        bookingTrend: bookingTrend.map(({ key, label }) => ({
          label,
          bookings: bookingCounts.get(key) ?? 0,
        })),
        popularProperties: popularProperties.map(toProperty),
      }),
    );
  }),
);

router.get(
  "/admin/properties",
  withAdmin(async (_req, res) => {
    const properties = await db.property.findMany({
      include: { host: true },
      orderBy: { createdAt: "desc" },
    });
    res.json(
      GetAdminPropertiesResponse.parse(
        properties.map((property) => toProperty(property as PropertyRecord)),
      ),
    );
  }),
);

router.delete(
  "/admin/properties/:propertyId",
  withAdmin(async (req, res) => {
    const params = DeleteAdminPropertyParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: "Property ID is invalid." });
      return;
    }
    const property = await db.property.findUnique({
      where: { id: params.data.propertyId },
    });
    if (!property) {
      res.status(404).json({ error: "This property could not be found." });
      return;
    }
    const bookingCount = await db.booking.count({
      where: { propertyId: property.id },
    });
    if (bookingCount > 0) {
      res.status(409).json({
        error: "A property with booking history cannot be deleted.",
      });
      return;
    }
    await db.property.delete({ where: { id: property.id } });
    res.json(DeleteAdminPropertyResponse.parse({ success: true }));
  }),
);

router.get(
  "/admin/users",
  withAdmin(async (_req, res) => {
    const users = await db.user.findMany({
      orderBy: { createdAt: "desc" },
    });
    res.json(GetAdminUsersResponse.parse(users.map(toUser)));
  }),
);

router.patch(
  "/admin/users/:userId/role",
  withAdmin(async (req, res) => {
    const params = UpdateUserRoleParams.safeParse(req.params);
    const input = UpdateUserRoleBody.safeParse(req.body);
    if (!params.success || !input.success) {
      res.status(400).json({ error: "User role details are invalid." });
      return;
    }
    if (
      params.data.userId === req.stayoraUser.id &&
      input.data.role !== "admin"
    ) {
      res.status(400).json({ error: "You cannot remove your own admin access." });
      return;
    }
    const user = await db.user.update({
      where: { id: params.data.userId },
      data: { role: input.data.role },
    });
    res.json(UpdateUserRoleResponse.parse(toUser(user)));
  }),
);

router.post(
  "/admin/evaluations/run",
  withAdmin(async (_req, res) => {
    const [properties, profiles] = await Promise.all([
      db.property.findMany({ orderBy: { id: "asc" } }),
      db.userPreference.findMany({
        where: { user: { email: { endsWith: ".test" } } },
        orderBy: { userId: "asc" },
      }),
    ]);
    if (properties.length === 0 || profiles.length === 0) {
      res.status(503).json({
        error: "Seed the deterministic demo properties and research profiles first.",
      });
      return;
    }

    const personalizedPrecisions: number[] = [];
    const baselinePrecisions: number[] = [];
    const personalizedNdcgs: number[] = [];
    const baselineNdcgs: number[] = [];
    const responseTimes: number[] = [];

    for (const profile of profiles) {
      const preferences: RecommendationPreferences = {
        preferredDestinations: profile.preferredDestinations,
        preferredPropertyTypes: profile.preferredPropertyTypes,
        preferredAmenities: profile.preferredAmenities,
        budgetMin: profile.budgetMin,
        budgetMax: profile.budgetMax,
        preferredGuests: profile.preferredGuests,
      };
      const eligible = properties.filter(
        (property) => property.maxGuests >= profile.preferredGuests,
      );

      const startedAt = performance.now();
      const personalized = rankProperties(
        eligible,
        preferences,
        profile.preferredGuests,
      );
      responseTimes.push(performance.now() - startedAt);
      const baseline = [...eligible].sort(
        (left, right) =>
          right.averageRating - left.averageRating ||
          right.reviewCount - left.reviewCount ||
          left.id.localeCompare(right.id),
      );

      const labels = new Map(
        eligible.map((property) => [
          property.id,
          relevanceLabel(property, preferences, profile.preferredGuests),
        ]),
      );
      personalizedPrecisions.push(
        precisionAt5(personalized.map((item) => labels.get(item.property.id) ?? 0)),
      );
      personalizedNdcgs.push(
        ndcgAt5(personalized.map((item) => labels.get(item.property.id) ?? 0)),
      );
      baselinePrecisions.push(
        precisionAt5(baseline.map((property) => labels.get(property.id) ?? 0)),
      );
      baselineNdcgs.push(
        ndcgAt5(baseline.map((property) => labels.get(property.id) ?? 0)),
      );
    }

    const result = await db.evaluationRun.create({
      data: {
        syntheticData: true,
        usersEvaluated: profiles.length,
        propertiesEvaluated: properties.length,
        personalizedPrecisionAt5: mean(personalizedPrecisions),
        baselinePrecisionAt5: mean(baselinePrecisions),
        personalizedNdcgAt5: mean(personalizedNdcgs),
        baselineNdcgAt5: mean(baselineNdcgs),
        averageRecommendationMs: mean(responseTimes),
        precisionConvention:
          "Relevant means relevance >= 2; Precision@5 divides relevant results by min(5, eligible results).",
        relevanceScale:
          "0 = no matching preference dimensions; 1 = one; 2 = two or more of destination, budget, stay type, and amenities. Guest capacity is an eligibility filter.",
      },
    });
    res.json(
      RunEvaluationResponse.parse({
        ...result,
        evaluatedAt: result.evaluatedAt.toISOString(),
      }),
    );
  }),
);

router.get(
  "/admin/evaluations/latest",
  withAdmin(async (_req, res) => {
    const result = await db.evaluationRun.findFirst({
      orderBy: { evaluatedAt: "desc" },
    });
    if (!result) {
      res.status(404).json({ error: "No research evaluation has been run yet." });
      return;
    }
    res.json(
      GetLatestEvaluationResponse.parse({
        ...result,
        evaluatedAt: result.evaluatedAt.toISOString(),
      }),
    );
  }),
);

export default router;
