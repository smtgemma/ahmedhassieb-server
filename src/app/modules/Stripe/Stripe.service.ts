import Stripe from "stripe";
import ApiError from "../../../errors/ApiErrors";

import httpStatus from "http-status";
import { HostData, ITransferAmount } from "./Stripe.interface";
import stripe from "../../../shared/stripe";
import prisma from "../../../shared/prisma";
import emailSender from "../../../shared/emailSernder";

// Create Stripe customer
const createStripeCustomer = async (userData: {
  email: string;
  name: string;
  userId: string;
  role: string;
}) => {
  try {
    const customer = await stripe.customers.create({
      email: userData.email,
      name: userData.name,
      metadata: {
        userId: userData.userId,
        role: userData.role,
        source: "booking_platform",
      },
    });

    return {
      success: true,
      stripeCustomerId: customer.id,
      customer,
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message,
    };
  }
};

// Update Stripe customer
const updateStripeCustomer = async (
  stripeCustomerId: string,
  updateData: {
    email?: string;
    name?: string;
    phone?: string;
  }
) => {
  try {
    const customer = await stripe.customers.update(stripeCustomerId, {
      email: updateData.email,
      name: updateData.name,
      phone: updateData.phone,
    });

    return {
      success: true,
      customer,
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message,
    };
  }
};

// Delete Stripe customer
const deleteStripeCustomer = async (customerId: string) => {
  try {
    const deletedCustomer = await stripe.customers.del(customerId);
    return { success: true, deletedCustomer };
  } catch (error) {
    console.error("❌ Failed to delete Stripe customer:", error);
    return { success: false, error };
  }
};

// Create payment intent for booking
const createPaymentIntent = async (paymentData: {
  amount: number; // in cents
  currency: string;
  stripeCustomerId: string;
  bookingId: string;
  userId: string;
  propertyId: string;
  paymentMethodId: string;
}) => {
  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(paymentData.amount * 100),
      currency: paymentData.currency,
      customer: paymentData.stripeCustomerId,
      payment_method: paymentData.paymentMethodId,
      confirm: true,
      off_session: true,
      metadata: {
        bookingId: paymentData.bookingId,
        userId: paymentData.userId,
        propertyId: paymentData.propertyId,
        type: "booking_payment",
      },
      automatic_payment_methods: {
        enabled: true,
      },
    });

    return {
      success: true,
      paymentIntent,
      clientSecret: paymentIntent.client_secret,
    };
  } catch (error: any) {
    return {
      success: false,
      error: error,
    };
  }
};

// Create Stripe product
const createStripeProduct = async (planType: string) => {
  try {
    const product = await stripe.products.create({
      name: planType,
    });
    return product;
  } catch (e) {
    console.error("Error creating product:", e);
    throw new Error("Failed to create product");
  }
};

// Update Stripe product
const updateStripeProduct = async (productId: string, planType?: string) => {
  try {
    const updatedProduct = await stripe.products.update(productId, {
      name: planType,
    });
    return updatedProduct;
  } catch (e) {
    console.error("Error updating product:", e);
    throw new Error("Failed to update product");
  }
};

// Delete Stripe product
const deleteStripeProduct = async (productId: string) => {
  try {
    // 1. List all prices for the product
    const prices = await stripe.prices.list({ product: productId });

    // 2. Archive each price instead of deleting
    for (const price of prices.data) {
      await stripe.prices.update(price.id, { active: false });
    }

    // 3. Archive the product
    const archivedProduct = await stripe.products.update(productId, {
      active: false,
    });

    return {
      success: true,
      archivedProduct,
    };
  } catch (e) {
    console.error("❌ Error deleting/archiving product:", e);
    throw new Error("Failed to delete product");
  }
};

// Create Stripe product
const createStripeProductPrice = async (
  amount: number,
  productId: string,
  interval: any
) => {
  try {
    const price = await stripe.prices.create({
      unit_amount: amount * 100,
      currency: "usd",
      product: productId,
      recurring: { interval },
    });
    return price;
  } catch (e) {
    console.error("Error creating price:", e);
    throw new Error("Failed to create price");
  }
};

// Update Stripe product
const updateStripeProductPrice = async (
  oldPriceId: string,
  newAmount: number,
  productId: string,
  interval: any
) => {
  try {
    // Deactivate the old price
    await stripe.prices.update(oldPriceId, { active: false });

    // Create a new price
    const newPrice = await stripe.prices.create({
      unit_amount: newAmount * 100,
      currency: "usd",
      product: productId,
      recurring: { interval },
    });

    return newPrice;
  } catch (e) {
    console.error("Error updating price:", e);
    throw new Error("Failed to update price");
  }
};

// Delete Stripe price
const deleteStripePrice = async (priceId: string) => {
  console.log(priceId);
  try {
    const deletedPrice = await stripe.prices.update(priceId, { active: false });
    return {
      success: true,
      deletedPrice,
    };
  } catch (e) {
    console.error("Error deleting price:", e);
    throw new Error("Failed to delete price");
  }
};

// Create Stripe subscription
const createStripeSubscription = async (
  customerId: string,
  stripePriceId: string,
  userId: string,
  planId: string,
  planName: string,
  price: number,
  paymentMethodId: string
) => {
  try {
    const stripeSubscription = await stripe.subscriptions.create({
      customer: customerId,
      items: [{ price: stripePriceId }],
      default_payment_method: paymentMethodId,
      payment_settings: {
        payment_method_types: ["card"],
        save_default_payment_method: "on_subscription",
      },
      expand: ["latest_invoice.payment_intent"],
      metadata: { userId, planId: planId, planName, price },
    });

    return stripeSubscription;
  } catch (e: any) {
    console.error("Error creating subscription:", e);
    console.error("Failed subscription stripe function:", e);
  }
};

// Update Stripe subscription
const updateStripeSubscription = async (
  stripeSubId: string,
  stripePriceId: string,
  userId: string,
  planId: string,
  planName: string,
  price: number
) => {
  try {
    // First retrieve the subscription to get existing items
    const currentSubscription = await stripe.subscriptions.retrieve(
      stripeSubId
    );

    // Get the first subscription item ID
    const subscriptionItemId = currentSubscription.items.data[0].id;

    // Update the subscription with the correct item ID
    const updatedSubscription = await stripe.subscriptions.update(stripeSubId, {
      items: [
        {
          id: subscriptionItemId, // Use SUBSCRIPTION ITEM ID here
          price: stripePriceId,
        },
      ],
      proration_behavior: "always_invoice",
      expand: ["latest_invoice.payment_intent"],
      cancel_at_period_end: false,
      metadata: { planId, planName, userId, price },
    });

    return updatedSubscription;
  } catch (e) {
    console.error("Subscription update failed:", e);
    throw new Error(`Failed to update subscription`);
  }
};

const cancelStripeSubscription = async (
  stripeSubId: string,
  userId: string
) => {
  try {
    const stripeSubscription = await stripe.subscriptions.update(stripeSubId, {
      cancel_at_period_end: true,
      metadata: { userId },
    });

    return stripeSubscription;
  } catch (e) {
    console.error("Error cancel subscription:", e);
    throw new Error("Failed cancel subscription");
  }
};

// Attach payment method to customer
const attachPaymentMethodToCustomer = async (
  paymentMethodId: string,
  customerId: string
) => {
  try {
    const paymentMethod = await stripe.paymentMethods.attach(paymentMethodId, {
      customer: customerId,
    });

    return {
      success: true,
      paymentMethod,
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message,
      code: error.code,
    };
  }
};

// Set default payment method for customer
const setDefaultPaymentMethod = async (
  customerId: string,
  paymentMethodId: string
) => {
  if (!customerId || !paymentMethodId) {
    return {
      success: false,
      error: "Customer ID and Payment Method ID are required",
    };
  }

  try {
    // Optional: validate that this payment method belongs to the customer
    const paymentMethod = await stripe.paymentMethods.retrieve(paymentMethodId);
    if (paymentMethod.customer !== customerId) {
      return {
        success: false,
        error: "Payment method does not belong to this customer",
      };
    }

    // Update default payment method
    await stripe.customers.update(customerId, {
      invoice_settings: { default_payment_method: paymentMethodId },
    });

    return {
      success: true,
      message: "Default payment method updated successfully",
      defaultPaymentMethodId: paymentMethodId,
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message,
    };
  }
};

// Check if payment method belongs to customer
const verifyPaymentMethodOwnership = async (
  paymentMethodId: string,
  customerId: string
) => {
  try {
    const paymentMethod = await stripe.paymentMethods.retrieve(paymentMethodId);

    return {
      success: true,
      isAttached: paymentMethod.customer === customerId,
      paymentMethod,
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message,
    };
  }
};

// Get customer's payment methods
const getAllPaymentMethods = async (customerId: string) => {
  try {
    // 1️⃣ Get all attached payment methods of type 'card'
    const paymentMethods = await stripe.paymentMethods.list({
      customer: customerId,
      type: "card",
    });

    // 2️⃣ Get customer object to find default payment method
    const customer = await stripe.customers.retrieve(customerId);
    const defaultPaymentMethodId = (customer as Stripe.Customer)
      .invoice_settings.default_payment_method;

    // 3️⃣ Map to clean format
    const formattedMethods = paymentMethods.data.map((pm) => ({
      id: pm.id,
      brand: pm.card?.brand,
      last4: pm.card?.last4,
      exp_month: pm.card?.exp_month,
      exp_year: pm.card?.exp_year,
      isDefault: pm.id === defaultPaymentMethodId,
    }));

    return formattedMethods;
  } catch (error: any) {
    console.error("Error fetching payment methods:", error);
    throw new Error(error.message || "Failed to fetch payment methods");
  }
};

const createHostStripeAccount = async (hostData: HostData) => {
  try {
    if (!process.env.FRONTEND_URL) {
      throw new Error("FRONTEND_URL environment variable is not set");
    }

    // Create Stripe Connect account
    const account = await stripe.accounts.create({
      type: "express",
      country: hostData.country || "US",
      email: hostData.email,
      business_type: "individual",
      business_profile: {
        name: hostData.name,
        ...(hostData.phone && { support_phone: hostData.phone }),
      },
      metadata: {
        userId: hostData.userId,
        created_at: new Date().toISOString(),
        platform: "booking platform",
      },
    });

    // Create account link for onboarding
    const accountLink = await stripe.accountLinks.create({
      account: account.id,
      refresh_url: `${process.env.FRONTEND_URL}/host/stripe/refresh`,
      return_url: `${process.env.FRONTEND_URL}/host/stripe/success`,
      type: "account_onboarding",
    });

    return {
      accountId: account.id,
      accountLink: accountLink.url,
      accountStatus: account.charges_enabled
        ? "active"
        : "pending_verification",
    };
  } catch (error: any) {
    throw new ApiError(httpStatus.BAD_REQUEST, error.message);
  }
};

const transferHostEarnings = async (transferData: ITransferAmount) => {
  try {
    // Input validation
    if (transferData.hostEarnings <= 0) {
      throw new ApiError(
        httpStatus.BAD_REQUEST,
        "Host earnings must be greater than 0"
      );
    }

    if (transferData.hostEarnings < 0.5) {
      // Stripe minimum
      throw new ApiError(
        httpStatus.BAD_REQUEST,
        "Transfer amount must be at least $0.50"
      );
    }

    // Verify host's Stripe account status
    const account = await stripe.accounts.retrieve(
      transferData.hostConnectedAccountId
    );

    // More comprehensive account checks
    if (!account.payouts_enabled || !account.charges_enabled) {
      throw new ApiError(
        httpStatus.BAD_REQUEST,
        "Host account is not ready for payouts. Account may need additional verification."
      );
    }

    // Check if account has any restrictions
    if (account.requirements?.currently_due?.length! > 0) {
      throw new ApiError(
        httpStatus.BAD_REQUEST,
        "Host account has pending requirements that must be completed before payouts"
      );
    }

    // Create transfer
    const transfer = await stripe.transfers.create({
      amount: transferData.hostEarnings * 100,
      currency: "usd",
      destination: transferData.hostConnectedAccountId,
      metadata: {
        booking_id: transferData.bookingId,
        payout_period: transferData.payoutPeriod,
        transfer_type: "host_earnings",
        created_at: new Date().toISOString(),
      },
    });

    return {
      success: true,
      transfer: {
        id: transfer.id,
        amount: transfer.amount / 100,
        currency: transfer.currency,
        status: transfer.created ? "created" : "failed",
        created: transfer.created,
      },
    };
  } catch (error: any) {
    console.error("Transfer failed:", {
      hostConnectedAccountId: transferData.hostConnectedAccountId,
      bookingId: transferData.bookingId,
      error: error.message,
    });

    return {
      success: false,
      error: error.message,
      errorCode: error.code || "TRANSFER_FAILED",
    };
  }
};

export const createStripeSubscriptionWithDiscount = async ({
  customerId,
  priceId,
  paymentMethodId,
  firstPaymentAmount,
  userId,
  planId,
  planName,
}: {
  customerId: string;
  priceId: string;
  paymentMethodId: string;
  firstPaymentAmount: number; // in cents
  userId: string;
  planId: string;
  planName: string;
}) => {
  try {
    // -------------------------------------------------------
    // 1. SET DEFAULT PAYMENT METHOD FOR CUSTOMER
    // -------------------------------------------------------
    await stripe.customers.update(customerId, {
      invoice_settings: {
        default_payment_method: paymentMethodId,
      },
    });

    // -------------------------------------------------------
    // 2. GET ORIGINAL MONTHLY AMOUNT FROM PRICE ID
    // -------------------------------------------------------
    const price = await stripe.prices.retrieve(priceId);

    if (!price.unit_amount) {
      throw new Error("Invalid price: Missing unit_amount");
    }

    const originalMonthlyAmount = price.unit_amount; // in cents

    // -------------------------------------------------------
    // 3. CALCULATE DISCOUNT
    // -------------------------------------------------------
    const discountAmount = originalMonthlyAmount - firstPaymentAmount;

    // Note: discountAmount must be **negative** for Stripe invoice item
    // Example: user saved $40 → discountAmount = -4000 (cents)
    const negativeDiscount = discountAmount > 0 ? -discountAmount : 0;

    // -------------------------------------------------------
    // 4. CREATE NEGATIVE INVOICE ITEM (DISCOUNT FOR 1ST MONTH)
    // -------------------------------------------------------
    if (negativeDiscount < 0) {
      await stripe.invoiceItems.create({
        customer: customerId,
        amount: negativeDiscount, // MUST be negative
        currency: price.currency,
        description: `Token discount for first payment of ${planName}`,
      });
    }

    // -------------------------------------------------------
    // 5. CREATE SUBSCRIPTION (Monthly billing starts normally)
    // -------------------------------------------------------
    const subscription = await stripe.subscriptions.create({
      customer: customerId,
      items: [{ price: priceId }],
      expand: ["latest_invoice.payment_intent"],
      metadata: {
        userId,
        planId,
        planName,
        firstPayment: firstPaymentAmount / 100,
      },
    });

    return subscription;
  } catch (error: any) {
    console.error("Stripe Subscription Error:", error);
    throw new Error(error.message);
  }
};

//!web hook handler
export const stripeWebhookHandler = async (req: any, res: any) => {
  const sig = req.headers["stripe-signature"];

  let event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig!,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err: any) {
    console.error("❌ Webhook signature error:", err.message);
    return res.status(400).send(`Webhook error: ${err.message}`);
  }

  // Extract the invoice if applicable
  const isInvoice = (obj: any): obj is Stripe.Invoice => {
    return obj.object === "invoice";
  };

  // ============================================================
  // 1️⃣ PAYMENT SUCCEEDED (FIRST OR MONTHLY BILLING)
  // ============================================================
  if (event.type === "invoice.payment_succeeded") {
    try {
      if (!isInvoice(event.data.object)) {
        return res.json({ received: true }); // invalid structure
      }

      const invoice = event.data.object as Stripe.Invoice;
      // FIX 2: customer ID type narrowing
      const customerId =
        typeof invoice.customer === "string" ? invoice.customer : null;

      if (!customerId) {
        console.log("❌ No customer ID in invoice");
        return res.json({ received: true });
      }

      const invoiceData = invoice as Stripe.Invoice & { subscription?: string };

      const subscriptionId = invoiceData.subscription || null;

      // Find user by Stripe customer ID
      const user = await prisma.user.findFirst({
        where: { stripeCustomerId: customerId },
      });

      if (!user) return res.json({ received: true });

      // Find user package by subscription ID
      const userPackage = await prisma.userPackage.findFirst({
        where: { stripeSubscriptionId: subscriptionId },
        include: { plan: true },
      });

      if (!userPackage) return res.json({ received: true });

      // 1) Update paidMonths & remainingMonths
      const newPaid = userPackage.paidMonths + 1;
      const newRemaining = Math.max(userPackage.remainingMonths - 1, 0);

      // 2) Update next billing date
      const nextBillingDate = new Date();
      nextBillingDate.setMonth(nextBillingDate.getMonth() + 1);

      await prisma.userPackage.update({
        where: { id: userPackage.id },
        data: {
          paidMonths: newPaid,
          remainingMonths: newRemaining,
          nextBillingDate,
          status: "ACTIVE",
        },
      });

      // Extract safe paymentMethodId
      const paymentMethodId =
        typeof invoice.default_payment_method === "string"
          ? invoice.default_payment_method
          : invoice.default_payment_method?.id || "unknown";

      // Create SubscriptionPayment
      await prisma.subscriptionPayment.create({
        data: {
          userId: user.id,
          planId: userPackage.planId,
          subscriptionId: subscriptionId || "unknown", // ✔ fixed
          amount: userPackage.plan.price,
          paymentMethodId, // ✔ fixed
          paymentStatus: "COMPLETED",
          stripePriceId: userPackage.plan.stripePriceId,
          stripeProductId: userPackage.plan.stripeProductId,
        },
      });
      // 4) EMAIL — After Paying 💌
      const subject =
        invoice.billing_reason === "subscription_create"
          ? "Subscription Activated"
          : "Monthly Payment Successful";

      const body =
        invoice.billing_reason === "subscription_create"
          ? `
Hi ${user.name},

🎉 Your subscription has been successfully activated!

Plan: ${userPackage.plan.name}
Amount Paid: $${userPackage.plan.price}
Next Billing: ${nextBillingDate.toDateString()}

Thank you for your purchase!
`
          : `
Hi ${user.name},

Your monthly subscription payment was successful.

Amount Paid: $${userPackage.plan.price}
Next Billing: ${nextBillingDate.toDateString()}

Thank you for staying with us!
`;

      await emailSender(subject, user.email, body);

      return res.json({ received: true });
    } catch (err) {
      console.error("❌ Error handling payment success", err);
      return res.json({ received: true });
    }
  }

  // ============================================================
  // 2️⃣ PAYMENT FAILED
  // ============================================================
if (event.type === "invoice.payment_failed") {
  try {
    if (!isInvoice(event.data.object)) {
      return res.json({ received: true });
    }

    const invoice = event.data.object as Stripe.Invoice;
    const customerId =
      typeof invoice.customer === "string" ? invoice.customer : null;

    if (!customerId) {
      return res.json({ received: true });
    }

    const user = await prisma.user.findFirst({
      where: { stripeCustomerId: customerId },
    });

    if (user) {
      await emailSender(
        "Payment Failed",
        user.email,
        `
Hi ${user.name},

Your monthly subscription payment failed.

Please update your payment method to avoid service interruption.

Thank you.
        `
      );
    }

    return res.json({ received: true });
  } catch (err) {
    console.error("❌ Error handling payment failure", err);
    return res.json({ received: true });
  }
}


  // ============================================================
  // 3️⃣ SUBSCRIPTION CANCELED
  // ============================================================
  if (event.type === "customer.subscription.deleted") {
    try {
      const subscription = event.data.object;

      await prisma.userPackage.updateMany({
        where: { stripeSubscriptionId: subscription.id },
        data: { billingStopped: true },
      });

      return res.json({ received: true });
    } catch (err) {
      console.error("❌ Error handling subscription cancelled", err);
      return res.json({ received: true });
    }
  }

  return res.status(200).send("OK");
};

export const StripeService = {
  createStripeCustomer,
  updateStripeCustomer,
  deleteStripeCustomer,
  createPaymentIntent,
  createStripeSubscription,
  updateStripeSubscription,
  cancelStripeSubscription,
  createStripeProduct,
  updateStripeProduct,
  createStripeProductPrice,
  updateStripeProductPrice,
  deleteStripeProduct,
  deleteStripePrice,
  attachPaymentMethodToCustomer,
  setDefaultPaymentMethod,
  getAllPaymentMethods,
  verifyPaymentMethodOwnership,
  createHostStripeAccount,
  transferHostEarnings,
  createStripeSubscriptionWithDiscount,
};
