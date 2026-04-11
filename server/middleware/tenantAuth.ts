/**
 * Tenant-scoped auth middleware.
 *
 * Extracted from server/routes.ts (where these functions lived inline as
 * locals) so other route files — starting with server/metaAdsRoutes.ts —
 * can reuse them without duplicating. The behavior is unchanged from the
 * inline versions that existed before the extraction.
 *
 *   requireTenant  — reads the tenantId cookie, verifies the authenticated
 *                    user is a member of that tenant, attaches `tenantId`
 *                    and `membership` to the request, and calls next().
 *                    Used on every route that operates within a tenant
 *                    scope.
 *
 *   requireRole    — composes with requireTenant. Reads the `membership`
 *                    attached by requireTenant and rejects if the role
 *                    is not in the allowed list. Does NOT use the
 *                    roleHierarchy table — it's a flat allowlist check.
 *
 *   getTenantIdFromCookie — utility for any code path that needs to
 *                    read the raw tenant cookie without going through
 *                    the full middleware (e.g. image upload routes).
 */

import { Request, Response, NextFunction } from "express";
import { storage } from "../storage";
import { getUserId } from "../customAuth";

export function getTenantIdFromCookie(req: Request): string | undefined {
  return req.cookies?.tenantId;
}

export async function requireTenant(req: Request, res: Response, next: NextFunction) {
  const tenantId = getTenantIdFromCookie(req);
  if (!tenantId) {
    return res.status(400).json({ error: "Tenant context required" });
  }

  const userId = getUserId(req);
  if (!userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const membership = await storage.getMembership(tenantId, userId);
  if (!membership) {
    return res.status(403).json({ error: "Not a member of this organization" });
  }

  // Attach tenant and membership to request
  (req as any).tenantId = tenantId;
  (req as any).membership = membership;
  next();
}

export function requireRole(...allowedRoles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const membership = (req as any).membership;
    if (!membership) {
      return res.status(403).json({ error: "No membership context" });
    }

    if (!allowedRoles.includes(membership.role)) {
      return res.status(403).json({ error: "Insufficient permissions" });
    }

    next();
  };
}
