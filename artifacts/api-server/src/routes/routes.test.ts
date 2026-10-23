import { createServer, type Server } from "node:http";
import express from "express";
import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import { randomUUID } from "node:crypto";
import { db } from "@workspace/db";

const authState = vi.hoisted(() => ({ currentUser: null as any }));

vi.mock("../middlewares/stayoraAuth", () => {
  const withSignedInUser = (handler: any) => async (
    req: any,
    res: any,
    next: any,
  ) => {
    if (!authState.currentUser) {
      res.status(401).json({ error: "Sign in with a verified email to continue." });
      return;
    }
    req.stayoraUser = authState.currentUser;
    await handler(req, res, next);
  };

  return {
    withSignedInUser,
    withAdmin: (handler: any) =>
      withSignedInUser(async (req: any, res: any, next: any) => {
        if (req.stayoraUser.role !== "admin") {
          res.status(403).json({ error: "Administrator access is required." });
          return;
        }
        await handler(req, res, next);
      }),
  };
});

import accountRouter from "./account";
import adminRouter from "./admin";
import hostingRouter from "./hosting";

type TestUser = {
  id: string;
  name: string;
  email: string;
  role: "guest" | "host" | "admin";
  createdAt: Date;
};

let server: Server;
let origin = "";
let host: TestUser;
let firstGuest: TestUser;
let secondGuest: TestUser;
let propertyId = "";

async function request(
  path: string,
  options: { method?: string; body?: unknown } = {},
) {
  return fetch(`${origin}${path}`, {
    method: options.method ?? "GET",
    headers: options.body ? { "content-type": "application/json" } : undefined,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
}

function setSignedInUser(user: TestUser | null) {
  authState.currentUser = user;
}

describe("Stayora API authorization and booking routes", () => {
  beforeAll(async () => {
    const suffix = randomUUID();
    const [hostRow, firstGuestRow, secondGuestRow] = await Promise.all([
      db.user.create({
        data: {
          name: "Stayora API Test Host",
          email: `stayora-host-${suffix}@example.test`,
          role: "host",
        },
      }),
      db.user.create({
        data: {
          name: "Stayora API Test Guest One",
          email: `stayora-guest-one-${suffix}@example.test`,
        },
      }),
      db.user.create({
        data: {
          name: "Stayora API Test Guest Two",
          email: `stayora-guest-two-${suffix}@example.test`,
        },
      }),
    ]);
    host = hostRow;
    firstGuest = firstGuestRow;
    secondGuest = secondGuestRow;

    const property = await db.property.create({
      data: {
        slug: `stayora-api-test-${suffix}`,
        hostId: host.id,
        title: "Stayora API Test Stay",
        description: "A temporary property used by the API test suite.",
        city: "Pune",
        country: "India",
        address: "Test address",
        latitude: 18.5204,
        longitude: 73.8567,
        pricePerNight: 10_000,
        propertyType: "Villa",
        maxGuests: 4,
        bedrooms: 2,
        bathrooms: 1,
        amenities: ["Wi-Fi"],
        imageUrls: ["https://images.unsplash.com/photo-1600210492486-724fe5c67fb0"],
      },
    });
    propertyId = property.id;

    const app = express();
    app.use(express.json());
    app.use(accountRouter, hostingRouter, adminRouter);
    server = createServer(app);
    await new Promise<void>((resolve, reject) => {
      server.once("error", reject);
      server.listen(0, "127.0.0.1", resolve);
    });
    const address = server.address();
    if (!address || typeof address === "string") {
      throw new Error("Could not start the API test server.");
    }
    origin = `http://127.0.0.1:${address.port}`;
  });

  afterAll(async () => {
    if (server?.listening) {
      await new Promise<void>((resolve, reject) =>
        server.close((error) => (error ? reject(error) : resolve())),
      );
    }
    if (propertyId) {
      await db.booking.deleteMany({ where: { propertyId } });
      await db.wishlist.deleteMany({ where: { propertyId } });
      await db.review.deleteMany({ where: { propertyId } });
      await db.property.deleteMany({ where: { id: propertyId } });
    }
    if (host && firstGuest && secondGuest) {
      await db.user.deleteMany({
        where: { id: { in: [host.id, firstGuest.id, secondGuest.id] } },
      });
    }
    setSignedInUser(null);
  });

  beforeEach(() => setSignedInUser(null));

  it("rejects private account requests without a signed-in identity", async () => {
    const response = await request("/me");
    expect(response.status).toBe(401);
  });

  it("denies non-admin users access to administrator endpoints", async () => {
    setSignedInUser(firstGuest);
    const response = await request("/admin/overview");
    expect(response.status).toBe(403);
  });

  it("does not allow a guest to edit another host's property", async () => {
    setSignedInUser(secondGuest);
    const response = await request(`/host/listings/${propertyId}`, {
      method: "PATCH",
      body: { title: "Unauthorized change" },
    });
    expect(response.status).toBe(404);
  });

  it("rejects a booking whose check-out is not after check-in", async () => {
    setSignedInUser(secondGuest);
    const response = await request("/bookings", {
      method: "POST",
      body: {
        propertyId,
        checkIn: "2050-01-10",
        checkOut: "2050-01-10",
        guests: 2,
      },
    });
    expect(response.status).toBe(400);
  });

  it("rejects a booking that exceeds the server-side guest capacity", async () => {
    setSignedInUser(secondGuest);
    const response = await request("/bookings", {
      method: "POST",
      body: {
        propertyId,
        checkIn: "2050-01-10",
        checkOut: "2050-01-11",
        guests: 5,
      },
    });
    expect(response.status).toBe(400);
  });

  it("creates a demo booking using the server rate and returns the same booking on retry", async () => {
    setSignedInUser(secondGuest);
    const body = {
      propertyId,
      checkIn: "2050-02-01",
      checkOut: "2050-02-04",
      guests: 2,
    };
    const firstResponse = await request("/bookings", {
      method: "POST",
      body,
    });
    expect(firstResponse.status).toBe(201);
    const firstBooking = (await firstResponse.json()) as {
      id: string;
      totalPrice: number;
      paymentStatus: string;
    };
    expect(firstBooking.totalPrice).toBe(30_000);
    expect(firstBooking.paymentStatus).toBe("demo_booking");

    const retryResponse = await request("/bookings", {
      method: "POST",
      body,
    });
    expect(retryResponse.status).toBe(201);
    const retriedBooking = (await retryResponse.json()) as { id: string };
    expect(retriedBooking.id).toBe(firstBooking.id);

    const storedBooking = await db.booking.findUnique({
      where: { id: firstBooking.id },
    });
    expect(storedBooking?.totalPrice).toBe(30_000);
    expect(storedBooking?.paymentStatus).toBe("demo_booking");
  });

  it("rejects a booking that overlaps an existing confirmed stay", async () => {
    await db.booking.create({
      data: {
        userId: firstGuest.id,
        propertyId,
        checkIn: new Date("2050-01-10T00:00:00.000Z"),
        checkOut: new Date("2050-01-12T00:00:00.000Z"),
        guests: 2,
        totalPrice: 20_000,
        status: "confirmed",
      },
    });
    setSignedInUser(secondGuest);
    const response = await request("/bookings", {
      method: "POST",
      body: {
        propertyId,
        checkIn: "2050-01-11",
        checkOut: "2050-01-13",
        guests: 2,
      },
    });
    expect(response.status).toBe(409);
  });
});
