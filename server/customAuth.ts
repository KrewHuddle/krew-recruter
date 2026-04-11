import { Express, RequestHandler } from "express";
import session from "express-session";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import { db } from "./db";
import { pool } from "./db";
import { users, passwordResetTokens } from "@shared/schema";
import { eq } from "drizzle-orm";
import connectPg from "connect-pg-simple";
import { getJwtSecret } from "./jwtAuth";

const SALT_ROUNDS = 12;

export function getSession() {
  const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 week
  const pgStore = connectPg(session);
  const sessionStore = new pgStore({
    pool,
    createTableIfMissing: true,
    ttl: sessionTtl,
    tableName: "sessions",
  });
  return session({
    secret: process.env.SESSION_SECRET!,
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: sessionTtl,
      sameSite: "lax",
    },
  });
}

declare module "express-session" {
  interface SessionData {
    userId?: string;
    email?: string;
    firstName?: string;
    lastName?: string;
    profileImageUrl?: string;
  }
}

export async function setupCustomAuth(app: Express) {
  app.set("trust proxy", 1);
  app.use(getSession());

  // Register new user
  app.post("/api/auth/register", async (req, res) => {
    try {
      const { email, password, firstName, lastName } = req.body;

      if (!email || !password) {
        return res.status(400).json({ error: "Email and password are required" });
      }

      if (password.length < 8) {
        return res.status(400).json({ error: "Password must be at least 8 characters" });
      }

      const emailLower = email.toLowerCase().trim();

      // Check if user already exists
      const existingUser = await db.select().from(users).where(eq(users.email, emailLower)).limit(1);
      if (existingUser.length > 0) {
        return res.status(400).json({ error: "An account with this email already exists" });
      }

      // Hash password
      const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

      // Create user
      const [newUser] = await db.insert(users).values({
        email: emailLower,
        passwordHash,
        firstName: firstName?.trim() || null,
        lastName: lastName?.trim() || null,
        authProvider: "email",
        emailVerified: false,
      }).returning();

      // Create session
      req.session.userId = newUser.id;
      req.session.email = newUser.email ?? undefined;
      req.session.firstName = newUser.firstName ?? undefined;
      req.session.lastName = newUser.lastName ?? undefined;

      res.json({
        success: true,
        user: {
          id: newUser.id,
          email: newUser.email,
          firstName: newUser.firstName,
          lastName: newUser.lastName,
        },
      });
    } catch (error: any) {
      console.error("Registration error:", error?.message || error);
      console.error("Registration error stack:", error?.stack);
      res.status(500).json({ error: "Registration failed", detail: error?.message });
    }
  });

  // Login
  app.post("/api/auth/login", async (req, res) => {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({ error: "Email and password are required" });
      }

      const emailLower = email.toLowerCase().trim();

      // Find user
      const [user] = await db.select().from(users).where(eq(users.email, emailLower)).limit(1);
      if (!user) {
        return res.status(401).json({ error: "Invalid email or password" });
      }

      // Check if user registered with OAuth
      if (!user.passwordHash) {
        return res.status(401).json({ error: "This account uses Google sign-in. Please use the Google button to log in." });
      }

      // Verify password
      const isValid = await bcrypt.compare(password, user.passwordHash);
      if (!isValid) {
        return res.status(401).json({ error: "Invalid email or password" });
      }

      // Create session
      req.session.userId = user.id;
      req.session.email = user.email ?? undefined;
      req.session.firstName = user.firstName ?? undefined;
      req.session.lastName = user.lastName ?? undefined;
      req.session.profileImageUrl = user.profileImageUrl ?? undefined;

      // Also generate JWT for API compatibility. getJwtSecret() throws
      // if JWT_SECRET (and SESSION_SECRET) is unset — that throw is
      // caught by the surrounding try/catch and surfaces as a 500
      // "Login failed" with the underlying error in logs. The previous
      // hardcoded fallback "krew-jwt-secret" turned a missing env var
      // into a critical auth bypass: anyone reading the source could
      // mint valid tokens for any user.
      const token = jwt.sign(
        { userId: user.id, email: user.email },
        getJwtSecret(),
        { expiresIn: "7d" }
      );

      res.json({
        success: true,
        token,
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          profileImageUrl: user.profileImageUrl,
        },
      });
    } catch (error: any) {
      console.error("Login error:", error?.message || error);
      console.error("Login error stack:", error?.stack);
      res.status(500).json({ error: "Login failed", detail: error?.message });
    }
  });

  // Logout
  app.post("/api/auth/logout", (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        console.error("Logout error:", err);
        return res.status(500).json({ error: "Logout failed" });
      }
      res.clearCookie("connect.sid");
      res.json({ success: true });
    });
  });

  // Get current user
  app.get("/api/auth/user", (req, res) => {
    if (req.session.userId) {
      res.json({
        id: req.session.userId,
        email: req.session.email,
        firstName: req.session.firstName,
        lastName: req.session.lastName,
        profileImageUrl: req.session.profileImageUrl,
      });
    } else {
      res.json(null);
    }
  });

  // Request password reset
  app.post("/api/auth/forgot-password", async (req, res) => {
    try {
      const { email } = req.body;

      if (!email) {
        return res.status(400).json({ error: "Email is required" });
      }

      const emailLower = email.toLowerCase().trim();
      const [user] = await db.select().from(users).where(eq(users.email, emailLower)).limit(1);

      // Always return success to prevent email enumeration
      if (!user || !user.passwordHash) {
        return res.json({ success: true, message: "If an account exists, a reset link has been sent" });
      }

      // Generate reset token
      const token = crypto.randomBytes(32).toString("hex");
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

      await db.insert(passwordResetTokens).values({
        userId: user.id,
        token,
        expiresAt,
      });

      // In production, you would send an email here
      // For now, we'll log the reset link
      console.log(`Password reset link: /reset-password?token=${token}`);

      res.json({ success: true, message: "If an account exists, a reset link has been sent" });
    } catch (error) {
      console.error("Forgot password error:", error);
      res.status(500).json({ error: "Failed to process request" });
    }
  });

  // Reset password
  app.post("/api/auth/reset-password", async (req, res) => {
    try {
      const { token, password } = req.body;

      if (!token || !password) {
        return res.status(400).json({ error: "Token and password are required" });
      }

      if (password.length < 8) {
        return res.status(400).json({ error: "Password must be at least 8 characters" });
      }

      // Find valid token
      const [resetToken] = await db.select()
        .from(passwordResetTokens)
        .where(eq(passwordResetTokens.token, token))
        .limit(1);

      if (!resetToken || resetToken.usedAt || new Date() > resetToken.expiresAt) {
        return res.status(400).json({ error: "Invalid or expired reset token" });
      }

      // Hash new password
      const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

      // Update user password
      await db.update(users)
        .set({ passwordHash, updatedAt: new Date() })
        .where(eq(users.id, resetToken.userId));

      // Mark token as used
      await db.update(passwordResetTokens)
        .set({ usedAt: new Date() })
        .where(eq(passwordResetTokens.id, resetToken.id));

      res.json({ success: true, message: "Password has been reset" });
    } catch (error) {
      console.error("Reset password error:", error);
      res.status(500).json({ error: "Failed to reset password" });
    }
  });
}

// Middleware to check if user is authenticated
export const isAuthenticated: RequestHandler = (req, res, next) => {
  if (req.session.userId) {
    return next();
  }
  return res.status(401).json({ message: "Unauthorized" });
};

// Helper to get user ID from session
export function getUserId(req: Express.Request): string | undefined {
  return (req.session as any)?.userId;
}

// Helper to get user claims from session
export function getUserClaims(req: Express.Request) {
  const session = req.session as any;
  return {
    sub: session?.userId,
    email: session?.email,
    first_name: session?.firstName,
    last_name: session?.lastName,
    profile_image_url: session?.profileImageUrl,
  };
}
