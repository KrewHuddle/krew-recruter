import type { Request, Response, NextFunction } from "express";
import { storage } from "../storage";

export function requirePlan(...allowedPlans: string[]) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const tenantId = (req as any).tenantId;
      if (!tenantId) {
        return res.status(401).json({ error: "Authentication required" });
      }

      const tenant = await storage.getTenant(tenantId);
      const currentPlan = tenant?.planType || "FREE";

      if (!allowedPlans.includes(currentPlan)) {
        return res.status(403).json({
          error: "Plan upgrade required",
          code: "UPGRADE_REQUIRED",
          currentPlan,
          requiredPlans: allowedPlans,
          upgradeUrl: "/pricing",
          message: `This feature requires ${allowedPlans.join(" or ")} plan`,
        });
      }

      next();
    } catch (err) {
      next(err);
    }
  };
}
