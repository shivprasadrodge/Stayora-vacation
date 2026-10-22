import { clerkClient, getAuth } from "@clerk/express";
import type { NextFunction, Request, RequestHandler, Response } from "express";
import { db } from "@workspace/db";

export type AppUser = Awaited<ReturnType<typeof db.user.findUnique>> & {};

export type AuthenticatedRequest = Request & { stayoraUser: NonNullable<AppUser> };

function getVerifiedIdentity(req: Request) {
  const auth = getAuth(req);
  return auth.userId;
}

export async function getSignedInUser(req: Request): Promise<NonNullable<AppUser> | null> {
  const clerkUserId = getVerifiedIdentity(req);
  if (!clerkUserId) return null;

  const clerkUser = await clerkClient.users.getUser(clerkUserId);
  const emailAddress = clerkUser.emailAddresses.find(
    (candidate) => candidate.id === clerkUser.primaryEmailAddressId,
  );
  if (!emailAddress || emailAddress.verification?.status !== "verified") {
    return null;
  }

  const email = emailAddress.emailAddress.trim().toLowerCase();
  const name =
    [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(" ").trim() ||
    email;
  const adminEmail = process.env.STAYORA_ADMIN_EMAIL?.trim().toLowerCase();
  const hostEmail = process.env.STAYORA_HOST_EMAIL?.trim().toLowerCase();
  const initialRole: "admin" | "host" | "guest" =
    adminEmail && email === adminEmail
      ? "admin"
      : hostEmail && email === hostEmail
        ? "host"
        : "guest";
  const trustedRoleUpgrade =
    initialRole === "admin" || initialRole === "host"
      ? { role: initialRole }
      : {};

  return db.user.upsert({
    where: { clerkUserId },
    update: {
      email,
      name,
      ...trustedRoleUpgrade,
    },
    create: {
      clerkUserId,
      email,
      name,
      role: initialRole,
    },
  });
}

export function withSignedInUser(
  handler: (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
  ) => Promise<unknown> | unknown,
): RequestHandler {
  return async (req, res, next) => {
    try {
      const user = await getSignedInUser(req);
      if (!user) {
        res.status(401).json({ error: "Sign in with a verified email to continue." });
        return;
      }
      Object.assign(req, { stayoraUser: user });
      await handler(req as AuthenticatedRequest, res, next);
    } catch (error) {
      next(error);
    }
  };
}

export function withAdmin(
  handler: (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction,
  ) => Promise<unknown> | unknown,
): RequestHandler {
  return withSignedInUser(async (req, res, next) => {
    if (req.stayoraUser.role !== "admin") {
      res.status(403).json({ error: "Administrator access is required." });
      return;
    }
    await handler(req, res, next);
  });
}
