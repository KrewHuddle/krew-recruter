import "dotenv/config";
import { getStripeClient } from "../stripeUtils";

async function seedPlans() {
  const stripe = getStripeClient();

  const plans = [
    {
      name: "Krew Recruiter Starter",
      description: "For small restaurants getting started with hiring",
      metadata: { planType: "STARTER" },
      price: 4900,
      features: [
        "3 active job postings",
        "25 applicants per month",
        "Applicant tracking",
        "Gig shift posting",
        "Email support",
      ],
    },
    {
      name: "Krew Recruiter Pro",
      description: "The complete hiring platform for growing restaurants",
      metadata: { planType: "PRO" },
      price: 9900,
      features: [
        "Unlimited job postings",
        "Unlimited applicants",
        "Campaign engine (Facebook & Instagram ads)",
        "Video interviews",
        "Talent pool access",
        "Analytics dashboard",
        "Up to 5 locations",
        "Priority support",
      ],
    },
    {
      name: "Krew Recruiter Enterprise",
      description: "For restaurant groups and multi-location operators",
      metadata: { planType: "ENTERPRISE" },
      price: 29900,
      features: [
        "Everything in Pro",
        "Unlimited locations",
        "White label option",
        "API access",
        "Custom integrations",
        "Dedicated account manager",
        "SLA guarantee",
      ],
    },
  ];

  for (const plan of plans) {
    const existing = await stripe.products.search({
      query: `name:'${plan.name}'`,
    });

    let productId: string;

    if (existing.data.length > 0) {
      productId = existing.data[0].id;
      console.log(`Plan exists: ${plan.name} (${productId})`);
    } else {
      const product = await stripe.products.create({
        name: plan.name,
        description: plan.description,
        metadata: plan.metadata,
      });
      productId = product.id;
      console.log(`Created plan: ${plan.name} (${productId})`);
    }

    const prices = await stripe.prices.list({
      product: productId,
      active: true,
    });

    if (prices.data.length === 0) {
      const price = await stripe.prices.create({
        product: productId,
        unit_amount: plan.price,
        currency: "usd",
        recurring: { interval: "month" },
        metadata: plan.metadata,
      });
      console.log(`Created price: $${plan.price / 100}/mo (${price.id})`);
    } else {
      console.log(`Price exists: $${prices.data[0].unit_amount! / 100}/mo (${prices.data[0].id})`);
    }
  }

  console.log("\nStripe plans seeded successfully");
  console.log("Copy the price IDs above into your .env as:");
  console.log("STRIPE_STARTER_PRICE_ID=price_xxx");
  console.log("STRIPE_PRO_PRICE_ID=price_xxx");
  console.log("STRIPE_ENTERPRISE_PRICE_ID=price_xxx");
}

seedPlans().catch(console.error);
