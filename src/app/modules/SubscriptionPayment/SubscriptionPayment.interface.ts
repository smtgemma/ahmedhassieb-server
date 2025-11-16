// SubscriptionPayment.interface: Module file for the SubscriptionPayment.interface functionality.
export interface SubscriptionDetails {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    country: string;
    address: string;
    city: string;
    zipCode: string;
    amount: number;
    currency: string;
    paymentMethodId: string;
    paymentStatus: SubscriptionPaymentStatus;
    transactionId?: string;
    paymentIntentId?: string;
    billingPeriodStart: Date;
    billingPeriodEnd: Date;
    refundAmount?: number;
    refundReason?: string;
    failureReason?: string;
    paidAt?: Date;
    refundedAt?: Date;
    subscriptionId: string;
    userId: string;
    customerId: string;
    stripePriceId: string;
    planId: string;
    planName: string;
    price: number;
  }

  enum SubscriptionPaymentStatus {
    PENDING = "PENDING",
    PROCESSING = "PROCESSING",
    COMPLETED = "COMPLETED",
    FAILED = "FAILED",
    CANCELLED = "CANCELLED",
    REFUNDED = "REFUNDED",
    PARTIALLY_REFUNDED = "PARTIALLY_REFUNDED",
  }
  