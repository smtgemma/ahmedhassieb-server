// Stripe.interface: Module file for the Stripe.interface functionality.
export interface HostData {
  email: string;
  userId: string;
  name: string;
  country?: string;
  phone?: string;
}

export interface ITransferAmount {
  hostEarnings: number;
  hostConnectedAccountId: string;
  bookingId: string;
  payoutPeriod: "daily" | "weekly" | "monthly";
}
