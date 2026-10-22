import { Router, type IRouter } from "express";
import {
  CreateHostListingBody,
  CreateHostListingResponse,
  DeleteHostListingParams,
  DeleteHostListingResponse,
  GetHostBookingsResponse,
  GetHostListingsResponse,
  UpdateHostListingBody,
  UpdateHostListingParams,
  UpdateHostListingResponse,
} from "@workspace/api-zod";
import { db } from "@workspace/db";
import { withSignedInUser } from "../middlewares/stayoraAuth";
import { toBooking, toProperty, type BookingRecord, type PropertyRecord } from "../services/mappers";

const router: IRouter = Router();

function safeImageUrls(urls: string[]) {
  return urls.every((value) => {
    try {
      return new URL(value).protocol === "https:";
    } catch {
      return false;
    }
  });
}

router.get(
  "/host/listings",
  withSignedInUser(async (req, res) => {
    const listings = await db.property.findMany({
      where: { hostId: req.stayoraUser.id },
      include: { host: true },
      orderBy: { createdAt: "desc" },
    });
    res.json(
      GetHostListingsResponse.parse(
        listings.map((property) => toProperty(property as PropertyRecord)),
      ),
    );
  }),
);

router.post(
  "/host/listings",
  withSignedInUser(async (req, res) => {
    const input = CreateHostListingBody.safeParse(req.body);
    if (!input.success || !safeImageUrls(input.success ? input.data.imageUrls : [])) {
      res.status(400).json({
        error: "Add valid listing details and secure HTTPS image links.",
      });
      return;
    }
    const listing = await db.property.create({
      data: {
        ...input.data,
        slug: `${input.data.city.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${crypto.randomUUID()}`,
        hostId: req.stayoraUser.id,
        averageRating: 0,
        reviewCount: 0,
      },
      include: { host: true },
    });
    if (req.stayoraUser.role === "guest") {
      await db.user.update({
        where: { id: req.stayoraUser.id },
        data: { role: "host" },
      });
    }
    res
      .status(201)
      .json(
        CreateHostListingResponse.parse(toProperty(listing as PropertyRecord)),
      );
  }),
);

router.patch(
  "/host/listings/:propertyId",
  withSignedInUser(async (req, res) => {
    const params = UpdateHostListingParams.safeParse(req.params);
    const input = UpdateHostListingBody.safeParse(req.body);
    if (!params.success || !input.success) {
      res.status(400).json({ error: "Listing details are invalid." });
      return;
    }
    if (input.data.imageUrls && !safeImageUrls(input.data.imageUrls)) {
      res.status(400).json({ error: "Listing images must use secure HTTPS URLs." });
      return;
    }
    const existing = await db.property.findFirst({
      where: {
        id: params.data.propertyId,
        hostId: req.stayoraUser.id,
      },
    });
    if (!existing) {
      res.status(404).json({ error: "This listing could not be found." });
      return;
    }
    const updated = await db.property.update({
      where: { id: existing.id },
      data: input.data,
      include: { host: true },
    });
    res.json(
      UpdateHostListingResponse.parse(toProperty(updated as PropertyRecord)),
    );
  }),
);

router.delete(
  "/host/listings/:propertyId",
  withSignedInUser(async (req, res) => {
    const params = DeleteHostListingParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: "Property ID is invalid." });
      return;
    }
    const listing = await db.property.findFirst({
      where: {
        id: params.data.propertyId,
        hostId: req.stayoraUser.id,
      },
    });
    if (!listing) {
      res.status(404).json({ error: "This listing could not be found." });
      return;
    }
    const bookingCount = await db.booking.count({
      where: { propertyId: listing.id },
    });
    if (bookingCount > 0) {
      res.status(409).json({
        error: "A listing with booking history cannot be deleted.",
      });
      return;
    }
    await db.property.delete({ where: { id: listing.id } });
    res.json(DeleteHostListingResponse.parse({ success: true }));
  }),
);

router.get(
  "/host/bookings",
  withSignedInUser(async (req, res) => {
    const bookings = await db.booking.findMany({
      where: { property: { hostId: req.stayoraUser.id } },
      include: { user: true, property: true },
      orderBy: { checkIn: "asc" },
    });
    res.json(
      GetHostBookingsResponse.parse(
        bookings.map((booking) => toBooking(booking as BookingRecord)),
      ),
    );
  }),
);

export default router;
