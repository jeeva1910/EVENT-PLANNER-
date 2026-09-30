import crypto from 'crypto';
import { IEvent } from '../models/types';

export interface IPaymentOrderRequest {
  eventId: string;
  registrationType: 'individual' | 'team';
  teamSize?: number;
  userId: string;
  userEmail: string;
  userName: string;
}

export interface IPaymentOrderResponse {
  orderId: string;
  amount: number; // in INR (currency units, e.g. 500)
  amountInPaisa: number; // in paise for payment gateway (50000)
  currency: string;
  isFree: boolean;
  gatewayKey?: string;
  gatewayConfigured: boolean;
  notes: Record<string, string>;
}

export class PaymentService {
  private static instance: PaymentService;

  private constructor() {}

  public static getInstance(): PaymentService {
    if (!PaymentService.instance) {
      PaymentService.instance = new PaymentService();
    }
    return PaymentService.instance;
  }

  /**
   * Calculates the exact registration fee based on event pricing config and participant/team size
   */
  public calculateFee(event: IEvent, registrationType: 'individual' | 'team', teamSize: number = 1): number {
    const isPaid = Boolean(
      event.paymentRequired ||
      event.paymentConfig?.paymentRequired ||
      event.paymentConfig?.pricingType === 'paid' ||
      (event.price && event.price > 0)
    );

    if (!isPaid) {
      return 0;
    }

    const fee = Math.max(
      0,
      Number(
        event.registrationFee ??
        event.paymentConfig?.fee ??
        event.paymentConfig?.registrationFee ??
        event.price ??
        0
      )
    );

    if (fee <= 0) {
      return 0;
    }

    const feeType = event.paymentConfig?.feeType || 'per_participant';

    if (registrationType === 'individual' || feeType === 'per_team') {
      return fee;
    }

    const size = Math.max(1, teamSize);
    return fee * size;
  }

  /**
   * Creates a payment order
   */
  public async createPaymentOrder(
    event: IEvent,
    request: IPaymentOrderRequest
  ): Promise<IPaymentOrderResponse> {
    const amount = this.calculateFee(event, request.registrationType, request.teamSize || 1);
    const isFree = amount <= 0;
    const currency = event.paymentConfig?.currency || 'INR';
    const amountInPaisa = Math.round(amount * 100);

    const razorpayKeyId = process.env.RAZORPAY_KEY_ID;
    const isGatewayConfigured = Boolean(razorpayKeyId && process.env.RAZORPAY_KEY_SECRET);

    const orderId = isFree
      ? `FREE_${Date.now()}_${Math.random().toString(36).substring(2, 8).toUpperCase()}`
      : `ORDER_${Date.now()}_${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

    return {
      orderId,
      amount,
      amountInPaisa,
      currency,
      isFree,
      gatewayKey: razorpayKeyId || undefined,
      gatewayConfigured: isGatewayConfigured,
      notes: {
        eventId: event._id,
        eventTitle: event.title,
        registrationType: request.registrationType,
        teamSize: String(request.teamSize || 1),
        userId: request.userId
      }
    };
  }

  /**
   * Verifies payment signature securely on the backend
   */
  public verifyPayment(orderId: string, paymentId: string, signature?: string): { verified: boolean; message: string } {
    const razorpaySecret = process.env.RAZORPAY_KEY_SECRET;

    if (orderId.startsWith('FREE_')) {
      return { verified: true, message: 'Free registration verified.' };
    }

    // If real Razorpay credentials exist, verify cryptographic HMAC signature
    if (razorpaySecret && signature) {
      const generatedSignature = crypto
        .createHmac('sha256', razorpaySecret)
        .update(`${orderId}|${paymentId}`)
        .digest('hex');

      if (generatedSignature === signature) {
        return { verified: true, message: 'Payment verified via Razorpay HMAC signature.' };
      } else {
        return { verified: false, message: 'Invalid payment signature.' };
      }
    }

    // In demo / test environment when gateway credentials are not yet provisioned
    if (!razorpaySecret && paymentId && orderId) {
      return {
        verified: true,
        message: 'Payment verified (Direct / Sandbox simulation).'
      };
    }

    return { verified: false, message: 'Payment verification failed: missing verification credentials.' };
  }
}

export const paymentService = PaymentService.getInstance();
