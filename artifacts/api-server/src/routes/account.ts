import { Router, type IRouter } from "express";
import {
  AddWishlistBody,
  AddWishlistResponse,
  CancelBookingParams,
  CancelBookingResponse,
  CreateBookingBody,
  CreateBookingResponse,
  GetBookingsResponse,
  GetMeResponse,
  GetPreferencesResponse,
  GetWishlistResponse,
  RemoveWishlistParams,
  RemoveWishlistResponse,
  SavePreferencesBody,
  SavePreferencesResponse,
  UpdateMeBody,
  UpdateMeResponse,
} from "@workspace/api-zod";
import { db } from "@workspace/db";
import { withSignedInUser } from "../middlewares/stayoraAuth";
import {
  dateFromCalendarDay,
  toBooking,
  toPreferences,
  toProperty,
  type BookingRecord,
  type PropertyRecord,
} from "../services/mappers";

const router: IRouter = Router();

router.get(
  "/me",
  withSignedInUser(async (req, res) => {
    res.json(
      GetMeResponse.parse({
        id: req.stayoraUser.id,
        name: req.stayoraUser.name,
        email: req.stayoraUser.email,
        role: req.stayoraUser.role,
        createdAt: req.stayoraUser.createdAt.toISOString(),
      }),
    );
  }),
);

router.patch(
  "/me",
  withSignedInUser(async (req, res) => {
    const input = UpdateMeBody.safeParse(req.body);
    if (!input.success || !input.data.name?.trim()) {
      res.status(400).json({ error: "Enter a valid name." });
      return;
    }
    const user = await db.user.update({
      where: { id: req.stayoraUser.id },
      data: { name: input.data.name.trim() },
    });
    res.json(
      UpdateMeResponse.parse({
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt.toISOString(),
      }),
    );
  }),
);

router.get(
  "/preferences",
  withSignedInUser(async (req, res) => {
    const preferences = await db.userPreference.findUnique({
      where: { userId: req.stayoraUser.id },
    });
    res.json(GetPreferencesResponse.parse(toPreferences(preferences)));
  }),
);

router.put(
  "/preferences",
  withSignedInUser(async (req, res) => {
    const input = SavePreferencesBody.safeParse(req.body);
    if (!input.success) {
      res.status(400).json({ error: "Check your preference values and try again." });
      return;
    }
    if (input.data.budgetMax > 0 && input.data.budgetMin > input.data.budgetMax) {
      res.status(400).json({ error: "Maximum budget must be at least the minimum." });
      return;
    }
    const preferences = await db.userPreference.upsert({
      where: { userId: req.stayoraUser.id },
      update: input.data,
      create: { userId: req.stayoraUser.id, ...input.data },
    });
    res.json(SavePreferencesResponse.parse(toPreferences(preferences)));
  }),
);

router.get(
  "/wishlist",
  withSignedInUser(async (req, res) => {
    const saved = await db.wishlist.findMany({
      where: { userId: req.stayoraUser.id },
      include: { property: { include: { host: true } } },
      orderBy: { createdAt: "desc" },
    });
    res.json(
      GetWishlistResponse.parse(
        saved.map((entry) => toProperty(entry.property as PropertyRecord)),
      ),
    );
  }),
);

router.post(
  "/wishlist",
  withSignedInUser(async (req, res) => {
    const input = AddWishlistBody.safeParse(req.body);
    if (!input.success) {
      res.status(400).json({ error: "Choose a property to save." });
      return;
    }
    const property = await db.property.findUnique({
      where: { id: input.data.propertyId },
      include: { host: true },
    });
    if (!property) {
      res.status(404).json({ error: "This stay could not be found." });
      return;
    }
    await db.wishlist.upsert({
      where: {
        userId_propertyId: {
          userId: req.stayoraUser.id,
          propertyId: property.id,
        },
      },
      update: {},
      create: { userId: req.stayoraUser.id, propertyId: property.id },
    });
    res
      .status(201)
      .json(AddWishlistResponse.parse(toProperty(property as PropertyRecord)));
  }),
);

router.delete(
  "/wishlist/:propertyId",
  withSignedInUser(async (req, res) => {
    const params = RemoveWishlistParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: "Property ID is invalid." });
      return;
    }
    await db.wishlist.deleteMany({
      where: {
        userId: req.stayoraUser.id,
        propertyId: params.data.propertyId,
      },
    });
    res.json(RemoveWishlistResponse.parse({ success: true }));
  }),
);

router.get(
  "/bookings",
  withSignedInUser(async (req, res) => {
    const today = dateFromCalendarDay(new Date().toISOString().slice(0, 10));
    await db.booking.updateMany({
      where: {
        userId: req.stayoraUser.id,
        status: "confirmed",
        checkOut: { lte: today },
      },
      data: { status: "completed" },
    });
    const bookings = await db.booking.findMany({
      where: { userId: req.stayoraUser.id },
      include: { user: true, property: true },
      orderBy: { checkIn: "asc" },
    });
    res.json(
      GetBookingsResponse.parse(
        bookings.map((booking) => toBooking(booking as BookingRecord)),
      ),
    );
  }),
);

router.post(
  "/bookings",
  withSignedInUser(async (req, res) => {
    const input = CreateBookingBody.safeParse(req.body);
    if (!input.success) {
      res.status(400).json({ error: "Check the dates and guest count." });
      return;
    }
    const checkIn = dateFromCalendarDay(input.data.checkIn);
    const checkOut = dateFromCalendarDay(input.data.checkOut);
    const today = dateFromCalendarDay(new Date().toISOString().slice(0, 10));
    if (checkIn < today || checkOut <= checkIn) {
      res.status(400).json({
        error: "Check-in must be today or later, and check-out must be after check-in.",
      });
      return;
    }
    const nights = Math.round(
      (checkOut.getTime() - checkIn.getTime()) / 86_400_000,
    );
    if (nights < 1 || nights > 60) {
      res.status(400).json({ error: "Bookings can be between 1 and 60 nights." });
      return;
    }

    try {
      const booking = await db.$transaction(
        async (transaction) => {
          const property = await transaction.property.findUnique({
            where: { id: input.data.propertyId },
          });
          if (!property) {
            return { kind: "missing" as const };
          }
          if (input.data.guests > property.maxGuests) {
            return { kind: "capacity" as const };
          }
          const existing = await transaction.booking.findFirst({
            where: {
              userId: req.stayoraUser.id,
              propertyId: property.id,
              checkIn,
              checkOut,
              status: "confirmed",
            },
            include: { user: true, property: true },
          });
          if (existing) return { kind: "created" as const, booking: existing };

          const conflict = await transaction.booking.findFirst({
            where: {
              propertyId: property.id,
              status: "confirmed",
              checkIn: { lt: checkOut },
              checkOut: { gt: checkIn },
            },
            select: { id: true },
          });
          if (conflict) return { kind: "unavailable" as const };

          const created = await transaction.booking.create({
            data: {
              userId: req.stayoraUser.id,
              propertyId: property.id,
              checkIn,
              checkOut,
              guests: input.data.guests,
              totalPrice: property.pricePerNight * nights,
              status: "confirmed",
              paymentStatus: "demo_booking",
            },
            include: { user: true, property: true },
          });
          return { kind: "created" as const, booking: created };
        },
        { isolationLevel: "Serializable" },
      );

      if (booking.kind === "missing") {
        res.status(404).json({ error: "This stay could not be found." });
        return;
      }
      if (booking.kind === "capacity") {
        res.status(400).json({ error: "This stay cannot fit that many guests." });
        return;
      }
      if (booking.kind === "unavailable") {
        res.status(409).json({ error: "Those dates have just been booked." });
        return;
      }
      res
        .status(201)
        .json(
          CreateBookingResponse.parse(
            toBooking(booking.booking as BookingRecord),
          ),
        );
    } catch (error) {
      if (
        typeof error === "object" &&
        error !== null &&
        "code" in error &&
        error.code === "P2034"
      ) {
        res.status(409).json({ error: "Those dates have just been booked." });
        return;
      }
      throw error;
    }
  }),
);

router.post(
  "/bookings/:bookingId/cancel",
  withSignedInUser(async (req, res) => {
    const params = CancelBookingParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: "Booking ID is invalid." });
      return;
    }
    const booking = await db.booking.findFirst({
      where: { id: params.data.bookingId, userId: req.stayoraUser.id },
      include: { user: true, property: true },
    });
    if (!booking) {
      res.status(404).json({ error: "This booking could not be found." });
      return;
    }
    if (booking.status !== "confirmed") {
      res.status(409).json({ error: "Only confirmed bookings can be cancelled." });
      return;
    }
    const cancellationDeadline = new Date(
      booking.checkIn.getTime() - 24 * 60 * 60 * 1000,
    );
    if (Date.now() >= cancellationDeadline.getTime()) {
      res.status(409).json({
        error: "Bookings can be cancelled up to 24 hours before check-in.",
      });
      return;
    }
    const cancelled = await db.booking.update({
      where: { id: booking.id },
      data: { status: "cancelled" },
      include: { user: true, property: true },
    });
    res.json(
      CancelBookingResponse.parse(toBooking(cancelled as BookingRecord)),
    );
  }),
);

export default router;
