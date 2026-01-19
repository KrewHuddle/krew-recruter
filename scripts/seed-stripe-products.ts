import { getUncachableStripeClient } from '../server/stripeClient';

async function seedProducts() {
  console.log('Seeding Stripe products...');
  const stripe = await getUncachableStripeClient();

  const existingProducts = await stripe.products.search({ 
    query: "metadata['app']:'krew-recruiter'" 
  });

  if (existingProducts.data.length > 0) {
    console.log('Products already exist, skipping seed');
    return;
  }

  const freeProduct = await stripe.products.create({
    name: 'Free',
    description: 'Get started with basic hiring features',
    metadata: {
      app: 'krew-recruiter',
      tier: 'free',
      features: JSON.stringify([
        'Up to 3 active job postings',
        'Basic applicant tracking',
        'Email support',
      ]),
    },
  });

  await stripe.prices.create({
    product: freeProduct.id,
    unit_amount: 0,
    currency: 'usd',
    recurring: { interval: 'month' },
    metadata: { interval: 'monthly' },
  });

  console.log('Created Free product:', freeProduct.id);

  const proProduct = await stripe.products.create({
    name: 'Pro',
    description: 'Advanced hiring tools for growing teams',
    metadata: {
      app: 'krew-recruiter',
      tier: 'pro',
      features: JSON.stringify([
        'Unlimited job postings',
        'Video interviews',
        'Job board distribution',
        'Advanced analytics',
        'Priority support',
      ]),
    },
  });

  const proMonthlyPrice = await stripe.prices.create({
    product: proProduct.id,
    unit_amount: 4900,
    currency: 'usd',
    recurring: { interval: 'month' },
    metadata: { interval: 'monthly' },
  });

  const proYearlyPrice = await stripe.prices.create({
    product: proProduct.id,
    unit_amount: 49900,
    currency: 'usd',
    recurring: { interval: 'year' },
    metadata: { interval: 'yearly' },
  });

  console.log('Created Pro product:', proProduct.id);
  console.log('  Monthly price:', proMonthlyPrice.id, '- $49/month');
  console.log('  Yearly price:', proYearlyPrice.id, '- $499/year');

  const enterpriseProduct = await stripe.products.create({
    name: 'Enterprise',
    description: 'Complete hiring solution for large organizations',
    metadata: {
      app: 'krew-recruiter',
      tier: 'enterprise',
      features: JSON.stringify([
        'Everything in Pro',
        'Gig marketplace access',
        'Stripe Connect payouts',
        'Custom integrations',
        'Dedicated account manager',
        'SSO authentication',
      ]),
    },
  });

  const enterpriseMonthlyPrice = await stripe.prices.create({
    product: enterpriseProduct.id,
    unit_amount: 14900,
    currency: 'usd',
    recurring: { interval: 'month' },
    metadata: { interval: 'monthly' },
  });

  const enterpriseYearlyPrice = await stripe.prices.create({
    product: enterpriseProduct.id,
    unit_amount: 149900,
    currency: 'usd',
    recurring: { interval: 'year' },
    metadata: { interval: 'yearly' },
  });

  console.log('Created Enterprise product:', enterpriseProduct.id);
  console.log('  Monthly price:', enterpriseMonthlyPrice.id, '- $149/month');
  console.log('  Yearly price:', enterpriseYearlyPrice.id, '- $1,499/year');

  console.log('\nStripe products seeded successfully!');
  console.log('Run the app and wait for syncBackfill to sync them to the database.');
}

seedProducts().catch(console.error);
