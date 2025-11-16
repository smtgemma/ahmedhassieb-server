// SubscriptionPlan.interface: Module file for the SubscriptionPlan.interface functionality.
export interface ISubscriptionPlan {
   
    name: string;
    price: number;
    description: string;
    stripePriceId: string;
    stripeProductId: string;
    currency: string;
    interval: "month" | "year" | "week" | "day";
    maxProperties: number;
    features: string[];
    isActive: boolean;
}