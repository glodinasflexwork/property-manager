import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import type { Express, Request, Response } from "express";
import * as db from "../db";
import { getSessionCookieOptions } from "./cookies";
import { sdk } from "./sdk";
import { sendMagicLinkEmail } from "./email";
import { ENV } from "./env";
import { randomBytes } from "crypto";

function getQueryParam(req: Request, key: string): string | undefined {
  const value = req.query[key];
  return typeof value === "string" ? value : undefined;
}

/**
 * Generate a secure random token for magic links
 */
function generateToken(): string {
  return randomBytes(32).toString("hex");
}

export function registerAuthRoutes(app: Express) {
  /**
   * POST /api/auth/request-magic-link
   * Request a magic link to be sent to the user's email
   */
  app.post("/api/auth/request-magic-link", async (req: Request, res: Response) => {
    const { email } = req.body;

    if (!email || typeof email !== "string") {
      res.status(400).json({ error: "Email is required" });
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      res.status(400).json({ error: "Invalid email format" });
      return;
    }

    try {
      // Generate a unique token
      const token = generateToken();
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

      // Store the token in the database
      await db.createMagicLinkToken({
        email: email.toLowerCase(),
        token,
        expiresAt,
      });

      // Create magic link URL
      const magicLink = `${ENV.appUrl}/api/auth/verify-magic-link?token=${token}`;

      // Send email
      await sendMagicLinkEmail({
        to: email,
        magicLink,
      });

      console.log("[Auth] Magic link sent to:", email);
      res.json({ success: true, message: "Magic link sent to your email" });
    } catch (error) {
      console.error("[Auth] Failed to send magic link:", error);
      res.status(500).json({ error: "Failed to send magic link" });
    }
  });

  /**
   * GET /api/auth/verify-magic-link?token=xxx
   * Verify the magic link token and sign the user in
   */
  app.get("/api/auth/verify-magic-link", async (req: Request, res: Response) => {
    const token = getQueryParam(req, "token");
    console.log("[Auth] Verifying magic link, token:", token);

    if (!token) {
      res.status(400).send("Invalid or missing token");
      return;
    }

    try {
      // Find the token in the database
      const magicLinkToken = await db.getMagicLinkToken(token);
      console.log("[Auth] Token found:", magicLinkToken ? "Yes" : "No");

      if (!magicLinkToken) {
        res.status(400).send("Invalid magic link");
        return;
      }

      // Check if token has already been used
      if (magicLinkToken.usedAt) {
        res.status(400).send("This magic link has already been used");
        return;
      }

      // Check if token has expired
      if (new Date() > magicLinkToken.expiresAt) {
        res.status(400).send("This magic link has expired");
        return;
      }

      // Mark token as used
      await db.markMagicLinkTokenAsUsed(token);
      console.log("[Auth] Token marked as used");

      // Get or create user
      let user = await db.getUserByEmail(magicLinkToken.email);
      console.log("[Auth] User found:", user ? "Yes" : "No");
      
      if (!user) {
        // Create new user
        await db.createUser({
          email: magicLinkToken.email,
          name: null,
          openId: null,
          loginMethod: "magic-link",
          lastSignedIn: new Date(),
        });
        user = await db.getUserByEmail(magicLinkToken.email);
      } else {
        // Update last signed in
        await db.upsertUser({
          email: user.email,
          lastSignedIn: new Date(),
        });
      }

      if (!user) {
        res.status(500).send("Failed to create or retrieve user");
        return;
      }

      // Create session token using the user's email as identifier
      console.log("[Auth] Creating session for user:", user.email);
      const sessionToken = await sdk.createSessionToken(user.email, {
        name: user.name || user.email,
        expiresInMs: ONE_YEAR_MS,
      });

      // Set cookie
      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });
      console.log("[Auth] Cookie set, redirecting to /");

      // Redirect to home
      console.log("[Auth] Redirecting to home page");
      res.redirect(302, "/");
    } catch (error) {
      console.error("[Auth] Magic link verification failed:", error);
      res.status(500).send("Authentication failed");
    }
  });
}
