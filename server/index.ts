
import "dotenv/config";
import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { serveStatic } from "./static";
import { createServer } from "http";
import cookieParser from "cookie-parser";
import Stripe from "stripe";
import { getStripeClient } from "./stripeUtils";
import { storage } from "./storage";

const app = express();
const httpServer = createServer(app);

// Log env var status on startup
console.log("=== Environment Check ===");
console.log("NODE_ENV:", process.env.NODE_ENV || "NOT SET");
console.log("DATABASE_URL:", process.env.DATABASE_URL ? "SET (" + process.env.DATABASE_URL.substring(0, 30) + "...)" : "NOT SET");
console.log("SESSION_SECRET:", process.env.SESSION_SECRET ? "SET" : "NOT SET");
console.log("PORT:", process.env.PORT || "NOT SET (defaulting to 3000)");
console.log("=========================");

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

app.use(cookieParser());

// Stripe webhook must be registered before express.json() middleware
// Handles both /api/stripe/webhook (legacy) and /api/billing/webhook
const stripeWebhookHandler = async (req: Request, res: Response) => {
  const sig = req.headers["stripe-signature"] as string;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!sig || !webhookSecret) {
    console.error("STRIPE_WEBHOOK_SECRET not set or missing signature");
    return res.status(400).send("Webhook secret not configured");
  }

  let event: Stripe.Event;
  try {
    const stripe = getStripeClient();
    event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
  } catch (err: any) {
    console.error("Webhook signature failed:", err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const customerId = session.customer as string;
        const subscriptionId = session.subscription as string;

        await storage.updateTenantBillingByStripeCustomer(customerId, {
          stripeSubscriptionId: subscriptionId,
          subscriptionStatus: "ACTIVE" as any,
        });

        const stripe = getStripeClient();
        const subscription = await stripe.subscriptions.retrieve(subscriptionId, {
          expand: ["items.data.price.product"],
        });
        const price = subscription.items.data[0]?.price;
        const planType = (price?.metadata?.planType as string) || "PRO";
        await storage.updateTenantPlanByStripeCustomer(customerId, planType);

        const tenant = await storage.getTenantByStripeCustomer(customerId);
        if (tenant) {
          await storage.createSubscriptionEvent({
            tenantId: tenant.id,
            eventType: "CREATED" as any,
            toPlan: planType as any,
            mrrChangeCents: price?.unit_amount || 0,
          });
        }

        console.log(`Subscription activated for customer ${customerId}`);
        break;
      }

      case "customer.subscription.updated": {
        const sub = event.data.object as Stripe.Subscription;
        const customerId = sub.customer as string;

        // Stripe SDK v20 removed `current_period_end` from the top-level
        // Subscription type — it now lives on SubscriptionItem.
        // (node_modules/stripe/types/SubscriptionItems.d.ts:53). The
        // wire format still includes both during the deprecation window,
        // so we read the item's copy when available and fall back to the
        // legacy top-level field via an `any` cast. When the account's
        // API version fully drops the top-level field, the fallback
        // becomes a no-op and only the item path remains. Proper fix is
        // a Stripe API version upgrade + webhook migration, deferred.
        const periodEndSeconds =
          sub.items?.data?.[0]?.current_period_end ??
          (sub as any).current_period_end;
        await storage.updateTenantBillingByStripeCustomer(customerId, {
          subscriptionStatus: sub.status.toUpperCase() as any,
          currentPeriodEnd: new Date(periodEndSeconds * 1000),
        });

        console.log(`Subscription updated for customer ${customerId}: ${sub.status}`);
        break;
      }

      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        const customerId = sub.customer as string;

        await storage.updateTenantBillingByStripeCustomer(customerId, {
          subscriptionStatus: "CANCELED" as any,
          stripeSubscriptionId: null,
        });

        await storage.updateTenantPlanByStripeCustomer(customerId, "FREE");

        const tenant = await storage.getTenantByStripeCustomer(customerId);
        if (tenant) {
          await storage.createSubscriptionEvent({
            tenantId: tenant.id,
            eventType: "CANCELED" as any,
            fromPlan: "PRO" as any,
            toPlan: "FREE" as any,
          });
        }

        console.log(`Subscription canceled for customer ${customerId}`);
        break;
      }

      case "invoice.payment_succeeded": {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = invoice.customer as string;

        await storage.updateTenantBillingByStripeCustomer(customerId, {
          subscriptionStatus: "ACTIVE" as any,
        });

        const tenant = await storage.getTenantByStripeCustomer(customerId);
        if (tenant) {
          // Stripe SDK v20 removed `payment_intent` from the top-level
          // Invoice type. The wire format still includes it during the
          // deprecation window, so we cast to any to read it. Proper
          // fix is a Stripe API migration that uses invoice.payments
          // or follows the new recommended access path — deferred.
          await storage.createPaymentHistory({
            tenantId: tenant.id,
            stripeInvoiceId: invoice.id,
            stripePaymentIntentId: (invoice as any).payment_intent as string,
            // Schema field is amountCents, not amount. Stripe returns
            // amount_paid in the smallest currency unit (cents for USD)
            // so the units already match — just renaming the field key.
            amountCents: invoice.amount_paid,
            currency: invoice.currency,
            status: "SUCCEEDED" as any,
            description: `Subscription payment - ${invoice.lines.data[0]?.description || ""}`,
          });
        }

        console.log(`Payment succeeded: $${invoice.amount_paid / 100}`);
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = invoice.customer as string;

        await storage.updateTenantBillingByStripeCustomer(customerId, {
          subscriptionStatus: "PAST_DUE" as any,
        });

        const tenant = await storage.getTenantByStripeCustomer(customerId);
        if (tenant) {
          await storage.createPaymentHistory({
            tenantId: tenant.id,
            stripeInvoiceId: invoice.id,
            // Schema field is amountCents, not amount. Same rename
            // as the payment_succeeded branch above.
            amountCents: invoice.amount_due,
            currency: invoice.currency,
            status: "FAILED" as any,
          });
        }

        console.log(`Payment failed for customer ${customerId}`);
        break;
      }

      case "customer.subscription.trial_will_end": {
        console.log("Trial ending soon:", (event.data.object as any).customer);
        break;
      }

      default:
        console.log(`Unhandled webhook event: ${event.type}`);
    }

    res.json({ received: true });
  } catch (err) {
    console.error("Webhook processing error:", err);
    res.status(500).json({ error: "Webhook processing failed" });
  }
};

app.post("/api/stripe/webhook", express.raw({ type: "application/json" }), stripeWebhookHandler);
app.post("/api/billing/webhook", express.raw({ type: "application/json" }), stripeWebhookHandler);

app.use(
  express.json({
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  }),
);

app.use(express.urlencoded({ extended: false }));

// Serve uploaded files (org logos, cover photos, ad images)
import path from "path";
app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  await registerRoutes(httpServer, app);

  app.use((err: any, _req: Request, res: Response, next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    console.error("Internal Server Error:", err);

    if (res.headersSent) {
      return next(err);
    }

    return res.status(status).json({ message });
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (process.env.NODE_ENV === "production") {
    serveStatic(app);
  } else {
    const { setupVite } = await import("./vite");
    await setupVite(httpServer, app);
  }

  const port = parseInt(process.env.PORT || "3000", 10);
  httpServer.listen(
    {
      port,
      host: "0.0.0.0",
    },
    () => {
      log(`serving on port ${port}`);
    },
  );
})();
