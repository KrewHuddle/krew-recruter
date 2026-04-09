import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { db } from "./db";
import { users, organizations, orgMembers, orgBranding } from "@shared/schema";
import { eq, and } from "drizzle-orm";

const SALT_ROUNDS = 12;
const JWT_EXPIRES_IN = "7d";

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET || process.env.SESSION_SECRET;
  if (!secret) throw new Error("JWT_SECRET or SESSION_SECRET must be set");
  return secret;
}

export interface JwtPayload {
  userId: string;
  email: string;
  orgId?: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
      orgId?: string;
    }
  }
}

function signToken(payload: JwtPayload): string {
  return jwt.sign(payload, getJwtSecret(), { expiresIn: JWT_EXPIRES_IN });
}

// Middleware: verify JWT and attach user to request
// Falls back to session auth so campaign routes work from the main dashboard
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  // Try JWT first
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith("Bearer ")) {
    try {
      const token = authHeader.slice(7);
      const decoded = jwt.verify(token, getJwtSecret()) as JwtPayload;
      req.user = decoded;
      return next();
    } catch {
      // JWT invalid — fall through to session check
    }
  }

  // Fall back to session auth
  const session = req.session as any;
  if (session?.userId) {
    req.user = {
      userId: session.userId,
      email: session.email || "",
    };
    return next();
  }

  return res.status(401).json({ error: "Missing authorization token" });
}

// Middleware: require org context (from header, JWT, or tenantId cookie)
export function requireOrg(req: Request, res: Response, next: NextFunction) {
  const orgId = req.headers["x-org-id"] as string || req.user?.orgId || req.cookies?.tenantId;
  if (!orgId) {
    return res.status(400).json({ error: "Organization context required" });
  }
  req.orgId = orgId;
  next();
}

// POST /api/auth/register — register + create org + return JWT
export async function registerHandler(req: Request, res: Response) {
  try {
    const { email, password, firstName, lastName, orgName } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }
    if (password.length < 8) {
      return res.status(400).json({ error: "Password must be at least 8 characters" });
    }

    const emailLower = email.toLowerCase().trim();

    const existing = await db.select().from(users).where(eq(users.email, emailLower)).limit(1);
    if (existing.length > 0) {
      return res.status(400).json({ error: "An account with this email already exists" });
    }

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    const [newUser] = await db.insert(users).values({
      email: emailLower,
      passwordHash,
      firstName: firstName?.trim() || null,
      lastName: lastName?.trim() || null,
      authProvider: "email",
    }).returning();

    // Create org if orgName provided
    let orgId: string | undefined;
    if (orgName) {
      const [org] = await db.insert(organizations).values({
        name: orgName.trim(),
      }).returning();
      orgId = org.id;

      // Create org membership as owner
      await db.insert(orgMembers).values({
        orgId: org.id,
        userId: newUser.id,
        role: "owner",
        acceptedAt: new Date(),
      });

      // Create default branding record
      await db.insert(orgBranding).values({
        orgId: org.id,
        name: orgName.trim(),
      });
    }

    const token = signToken({
      userId: newUser.id,
      email: newUser.email!,
      orgId,
    });

    res.json({
      token,
      user: {
        id: newUser.id,
        email: newUser.email,
        firstName: newUser.firstName,
        lastName: newUser.lastName,
      },
      orgId,
    });
  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).json({ error: "Registration failed" });
  }
}

// POST /api/auth/login — return JWT
export async function loginHandler(req: Request, res: Response) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    const emailLower = email.toLowerCase().trim();

    const [user] = await db.select().from(users).where(eq(users.email, emailLower)).limit(1);
    if (!user || !user.passwordHash) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    // Find user's first org membership
    const [membership] = await db.select()
      .from(orgMembers)
      .where(eq(orgMembers.userId, user.id))
      .limit(1);

    const token = signToken({
      userId: user.id,
      email: user.email!,
      orgId: membership?.orgId,
    });

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
      },
      orgId: membership?.orgId,
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ error: "Login failed" });
  }
}

// GET /api/auth/me — get current user + org info
export async function meHandler(req: Request, res: Response) {
  try {
    const { userId } = req.user!;

    const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Get all org memberships
    const memberships = await db.select({
      orgId: orgMembers.orgId,
      role: orgMembers.role,
      orgName: organizations.name,
    })
      .from(orgMembers)
      .innerJoin(organizations, eq(orgMembers.orgId, organizations.id))
      .where(eq(orgMembers.userId, userId));

    res.json({
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        profileImageUrl: user.profileImageUrl,
      },
      organizations: memberships,
    });
  } catch (error) {
    console.error("Me error:", error);
    res.status(500).json({ error: "Failed to fetch user" });
  }
}
