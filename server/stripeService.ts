import { getStripeClient } from './stripeUtils';

export class StripeService {
  async createCustomer(email: string, tenantId: string, tenantName: string) {
    const stripe = getStripeClient();
    return await stripe.customers.create({
      email,
      name: tenantName,
      metadata: { tenantId },
    });
  }

  async createCheckoutSession(customerId: string, priceId: string, successUrl: string, cancelUrl: string) {
    const stripe = getStripeClient();
    return await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      mode: 'subscription',
      success_url: successUrl,
      cancel_url: cancelUrl,
    });
  }

  async createCustomerPortalSession(customerId: string, returnUrl: string) {
    const stripe = getStripeClient();
    return await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: returnUrl,
    });
  }

  async createConnectAccount(email: string, userId: string) {
    const stripe = getStripeClient();
    return await stripe.accounts.create({
      type: 'express',
      email,
      metadata: { userId },
      capabilities: {
        transfers: { requested: true },
      },
    });
  }

  async createConnectAccountLink(accountId: string, refreshUrl: string, returnUrl: string) {
    const stripe = getStripeClient();
    return await stripe.accountLinks.create({
      account: accountId,
      refresh_url: refreshUrl,
      return_url: returnUrl,
      type: 'account_onboarding',
    });
  }

  async createTransfer(amount: number, destination: string, metadata?: Record<string, string>) {
    const stripe = getStripeClient();
    return await stripe.transfers.create({
      amount,
      currency: 'usd',
      destination,
      metadata,
    });
  }

  async getProduct(productId: string) {
    const stripe = getStripeClient();
    return await stripe.products.retrieve(productId);
  }

  async listProducts(active = true, limit = 20) {
    const stripe = getStripeClient();
    const result = await stripe.products.list({ active, limit });
    return result.data;
  }

  async listProductsWithPrices(active = true, limit = 20) {
    const stripe = getStripeClient();
    const products = await stripe.products.list({ active, limit });

    const productsWithPrices = await Promise.all(
      products.data.map(async (product) => {
        const prices = await stripe.prices.list({
          product: product.id,
          active: true,
        });
        return {
          product_id: product.id,
          product_name: product.name,
          product_description: product.description,
          product_active: product.active,
          product_metadata: product.metadata,
          prices: prices.data.map((price) => ({
            price_id: price.id,
            unit_amount: price.unit_amount,
            currency: price.currency,
            recurring: price.recurring,
            price_active: price.active,
            price_metadata: price.metadata,
          })),
        };
      })
    );

    return productsWithPrices;
  }

  async getSubscription(subscriptionId: string) {
    const stripe = getStripeClient();
    return await stripe.subscriptions.retrieve(subscriptionId);
  }
}

export const stripeService = new StripeService();
