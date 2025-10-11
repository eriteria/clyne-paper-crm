import express from "express";
import jwt from "jsonwebtoken";
import { prisma } from "../server";
import {
  buildAuthorizeUrl,
  exchangeCodeForToken,
  fetchZohoUserInfo,
} from "../utils/zohoOAuth";
import { logger } from "../utils/logger";

const router = express.Router();

// GET /api/auth/zoho/login -> redirect to Zoho authorization
router.get("/login", async (req, res) => {
  const state = (req.query.state as string) || "";
  const url = buildAuthorizeUrl(state);
  res.redirect(url);
});

// GET /api/auth/zoho/callback -> receive code, exchange for tokens, fetch user, login locally
router.get("/callback", async (req, res) => {
  try {
    const code = req.query.code as string;
    const state = (req.query.state as string) || undefined;
    if (!code) {
      res.status(400).json({ success: false, error: "Missing code" });
      return;
    }

    // 1) Exchange code for token
    const token = await exchangeCodeForToken(code);

    // 2) Get Zoho user info
    const info = await fetchZohoUserInfo(token.access_token);
    // Zoho returns user info with keys like Email, Display_Name, ZUID etc.
    const email: string | undefined = info.Email || info.email;
    const fullName: string =
      info.Display_Name || info.display_name || info.First_Name || "Zoho User";

    if (!email) {
      res.status(400).json({
        success: false,
        error: "Zoho did not return an email address",
      });
      return;
    }

    // 3) Upsert local user by email
    let user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      // Create a minimal user; assign a default role
      const defaultRole = await prisma.role.findFirst({
        where: { name: "USER" },
      });
      const roleId = defaultRole?.id || (await ensureAnyRole());

      user = await prisma.user.create({
        data: {
          email,
          fullName,
          passwordHash: "!oauth!", // marker - not used for login
          roleId,
          isActive: true,
        },
      });
    }

    if (!user.isActive) {
      res.status(403).json({ success: false, error: "Account is deactivated" });
      return;
    }

    // 4) Issue local JWTs
    const jwtSecret = process.env.JWT_SECRET as string;
    const jwtRefreshSecret = process.env.JWT_REFRESH_SECRET as string;

    const accessToken = (jwt.sign as any)(
      {
        userId: user.id,
        email: user.email,
        role: (await prisma.role.findUnique({ where: { id: user.roleId } }))
          ?.name,
      },
      jwtSecret,
      { expiresIn: process.env.JWT_EXPIRES_IN || "1h" }
    );
    const refreshToken = (jwt.sign as any)(
      { userId: user.id },
      jwtRefreshSecret,
      { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || "7d" }
    );

    // 5) Set JWTs as secure HTTP-only cookies and redirect to frontend
    // Cookie options: secure in prod, httpOnly, sameSite=lax
    const isProd = process.env.NODE_ENV === "production";
    res.cookie("accessToken", accessToken, {
      httpOnly: true,
      secure: isProd,
      sameSite: isProd ? "strict" : "lax",
      maxAge: 60 * 60 * 1000, // 1 hour
      path: "/",
    });
    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: isProd,
      sameSite: isProd ? "strict" : "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      path: "/",
    });

    // Prepare user data for frontend
    const userData = {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: (await prisma.role.findUnique({ where: { id: user.roleId } }))
        ?.name,
    };

    // Encode tokens and user data in URL for frontend to extract
    const frontend = process.env.FRONTEND_URL || "http://localhost:3000";
    const redirectUrl = new URL("/zoho-auth-complete", frontend);
    redirectUrl.searchParams.set("accessToken", accessToken);
    redirectUrl.searchParams.set("refreshToken", refreshToken);
    redirectUrl.searchParams.set("user", JSON.stringify(userData));

    res.redirect(redirectUrl.toString());
  } catch (err: any) {
    logger.error("Zoho OAuth callback error", err);
    res.status(500).json({ success: false, error: "Zoho OAuth failed" });
  }
});

async function ensureAnyRole(): Promise<string> {
  // Create a very basic role if none exists
  const existing = await prisma.role.findFirst();
  if (existing) return existing.id;
  const created = await prisma.role.create({ data: { name: "USER" } });
  return created.id;
}

export default router;
