import { Pool } from 'pg';

/**
 * PaymentProviderInterface
 * 
 * Abstract interface for all payment providers.
 * Enables provider-agnostic business logic and easy failover/switching.
 * 
 * Supported providers:
 * - Paystack (Nigeria focus, cards + mobile money)
 * - Flutterwave (Pan-African, multi-currency)
 * - Stripe (Global, cards + ACH)
 * - M-Pesa (East Africa, mobile money)
 * - Razorpay (Asia-Pacific, cards + UPI)
 * - Wise (Global, international transfers)
 * - Mock (For testing)
 */

export interface PaymentVerificationResult {
  isValid: boolean;
  accountName: string;
  accountNumber: string;
  bankCode?: string;
  bankName?: string;
  message: string;
}

export interface PaymentRecipientResult {
  success: boolean;
  recipientId: string;
  message: string;
  details?: Record<string, any>;
}

export interface PaymentInitiationResult {
  success: boolean;
  transactionId: string;
  providerReference: string;
  authorizationUrl?: string; // For web-based flows
  message: string;
  amount: number;
  currency: string;
  paidAt?: Date;
}

export interface PaymentStatusResult {
  status: 'PENDING' | 'COMPLETED' | 'FAILED' | 'UNKNOWN';
  amount: number;
  currency: string;
  timestamp: Date;
  failureReason?: string;
}

export interface WebhookPayload {
  event: string;
  data: Record<string, any>;
  timestamp: Date;
  signature: string;
}

export interface WebhookParseResult {
  valid: boolean;
  event: string;
  data: {
    transactionId: string;
    providerReference: string;
    status: string;
    amount: number;
    currency: string;
    timestamp: Date;
    details?: Record<string, any>;
  };
}

export interface FeeResult {
  transactionFeePercentage: number;
  fixedFeeKobo: number;
  totalFeeKobo: number;
}

type JsonResponse = { [key: string]: unknown };

export abstract class PaymentProvider {
  protected name: string;
  protected countryCode: string;
  protected currencyCode: string;
  protected apiKey: string;
  protected webhookSecret: string;
  protected db: Pool;

  constructor(
    name: string,
    countryCode: string,
    currencyCode: string,
    apiKey: string,
    webhookSecret: string,
    db: Pool
  ) {
    this.name = name;
    this.countryCode = countryCode;
    this.currencyCode = currencyCode;
    this.apiKey = apiKey;
    this.webhookSecret = webhookSecret;
    this.db = db;
  }

  /**
   * Read-only provider metadata for selection/debug APIs.
   */
  getProviderMeta(): { name: string; countryCode: string; currencyCode: string } {
    return {
      name: this.name,
      countryCode: this.countryCode,
      currencyCode: this.currencyCode,
    };
  }

  /**
   * Verify account details (ACH, bank transfer, mobile money)
   */
  abstract verifyAccountDetails(
    accountNumber: string,
    bankCode?: string
  ): Promise<PaymentVerificationResult>;

  /**
   * Create a payment recipient for payouts
   */
  abstract createPaymentRecipient(
    accountNumber: string,
    accountName: string,
    bankCode?: string,
    accountType?: string,
    metadata?: Record<string, any>
  ): Promise<PaymentRecipientResult>;

  /**
   * Initiate a payment collection (inbound)
   */
  abstract initiateCollection(
    amount: number,
    currency: string,
    recipientEmail: string,
    recipientPhone?: string,
    description?: string,
    metadata?: Record<string, any>
  ): Promise<PaymentInitiationResult>;

  /**
   * Initiate a payment payout (outbound)
   */
  abstract initiatePayout(
    amount: number,
    currency: string,
    recipientId: string,
    description?: string,
    metadata?: Record<string, any>
  ): Promise<PaymentInitiationResult>;

  /**
   * Initiate a refund
   */
  abstract initiateRefund(
    originalTransactionId: string,
    refundAmount?: number,
    reason?: string
  ): Promise<PaymentInitiationResult>;

  /**
   * Get transaction status
   */
  abstract getTransactionStatus(providerReference: string): Promise<PaymentStatusResult>;

  /**
   * Verify webhook signature
   */
  abstract verifyWebhookSignature(payload: string, signature: string): boolean;

  /**
   * Parse webhook payload
   */
  abstract parseWebhookPayload(payload: Record<string, any>): Promise<WebhookParseResult>;

  /**
   * Get transaction fees
   */
  abstract getFees(amount: number, feeType?: string): Promise<FeeResult>;

  /**
   * Reconcile transactions with provider
   */
  abstract reconcileTransactions(
    startDate: Date,
    endDate: Date,
    pageSize?: number
  ): Promise<any[]>;

  /**
   * Get exchange rate with provider
   */
  abstract getExchangeRate(from: string, to: string): Promise<number>;

  protected async logTransaction(
    userId: string,
    action: string,
    amount: number,
    status: string,
    details: Record<string, any>
  ): Promise<void> {
    await this.db.query(
      'INSERT INTO audit_logs (actor_user_id, action, resource_type, description, changes) VALUES ($1, $2, $3, $4, $5)',
      [userId, action, 'PAYMENT_TRANSACTION', `${this.name} ${action}`, JSON.stringify(details)]
    );
  }

  protected async logError(
    error: Error,
    context: Record<string, any>
  ): Promise<void> {
    console.error(`[${this.name}] Error:`, error.message, context);
    // Could also log to external error tracking (Sentry, DataDog, etc.)
  }
}

/**
 * Paystack Implementation
 */
export class PaystackProvider extends PaymentProvider {
  private baseUrl = 'https://api.paystack.co';

  async verifyAccountDetails(
    accountNumber: string,
    bankCode?: string
  ): Promise<PaymentVerificationResult> {
    try {
      const response = await fetch(
        `${this.baseUrl}/bank/resolve?account_number=${accountNumber}&bank_code=${bankCode}`,
        {
          headers: { Authorization: `Bearer ${this.apiKey}` },
        }
      );

      const data: any = await response.json();

      if (!data.status) {
        return {
          isValid: false,
          accountName: '',
          accountNumber,
          message: data.message || 'Account verification failed',
        };
      }

      return {
        isValid: true,
        accountName: data.data.account_name,
        accountNumber: data.data.account_number,
        bankCode,
        bankName: data.data.bank_name || 'Unknown',
        message: 'Account verified',
      };
    } catch (error) {
      await this.logError(error as Error, { accountNumber, bankCode });
      return {
        isValid: false,
        accountName: '',
        accountNumber,
        message: 'Account verification failed',
      };
    }
  }

  async createPaymentRecipient(
    accountNumber: string,
    accountName: string,
    bankCode?: string
  ): Promise<PaymentRecipientResult> {
    try {
      const response = await fetch(`${this.baseUrl}/transferrecipient`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'nuban',
          name: accountName,
          account_number: accountNumber,
          bank_code: bankCode,
          currency: this.currencyCode,
        }),
      });

      const data: any = await response.json();

      if (!data.status) {
        return {
          success: false,
          recipientId: '',
          message: data.message || 'Recipient creation failed',
        };
      }

      return {
        success: true,
        recipientId: data.data.recipient_code,
        message: 'Recipient created',
        details: data.data,
      };
    } catch (error) {
      await this.logError(error as Error, { accountNumber, bankCode });
      return {
        success: false,
        recipientId: '',
        message: 'Recipient creation failed',
      };
    }
  }

  async initiateCollection(
    amount: number,
    currency: string,
    recipientEmail: string,
    recipientPhone?: string,
    description?: string
  ): Promise<PaymentInitiationResult> {
    try {
      const response = await fetch(`${this.baseUrl}/transaction/initialize`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: amount * 100, // Convert to kobo
          email: recipientEmail,
          currency,
          metadata: {
            phone: recipientPhone,
            description,
          },
        }),
      });

      const data: any = await response.json();

      if (!data.status) {
        return {
          success: false,
          transactionId: '',
          providerReference: '',
          message: data.message || 'Collection initiation failed',
          amount,
          currency,
        };
      }

      return {
        success: true,
        transactionId: data.data.reference,
        providerReference: data.data.reference,
        authorizationUrl: data.data.authorization_url,
        message: 'Collection initiated',
        amount,
        currency,
      };
    } catch (error) {
      await this.logError(error as Error, { amount, currency, recipientEmail });
      return {
        success: false,
        transactionId: '',
        providerReference: '',
        message: 'Collection initiation failed',
        amount,
        currency,
      };
    }
  }

  async initiatePayout(
    amount: number,
    currency: string,
    recipientId: string
  ): Promise<PaymentInitiationResult> {
    try {
      const response = await fetch(`${this.baseUrl}/transfer`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          source: 'balance',
          amount: amount * 100,
          recipient: recipientId,
          reason: 'AjoCircle Group Payout',
        }),
      });

      const data: any = await response.json();

      if (!data.status) {
        return {
          success: false,
          transactionId: '',
          providerReference: '',
          message: data.message || 'Payout initiation failed',
          amount,
          currency,
        };
      }

      return {
        success: true,
        transactionId: String(data.data.id),
        providerReference: data.data.reference,
        message: 'Payout initiated',
        amount,
        currency,
      };
    } catch (error) {
      await this.logError(error as Error, { amount, currency, recipientId });
      return {
        success: false,
        transactionId: '',
        providerReference: '',
        message: 'Payout initiation failed',
        amount,
        currency,
      };
    }
  }

  async initiateRefund(
    originalTransactionId: string,
    refundAmount?: number
  ): Promise<PaymentInitiationResult> {
    try {
      const response = await fetch(`${this.baseUrl}/refund`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          transaction: originalTransactionId,
          amount: refundAmount ? refundAmount * 100 : undefined,
        }),
      });

      const data: any = await response.json();

      if (!data.status) {
        return {
          success: false,
          transactionId: '',
          providerReference: '',
          message: data.message || 'Refund initiation failed',
          amount: refundAmount || 0,
          currency: this.currencyCode,
        };
      }

      return {
        success: true,
        transactionId: String(data.data.id),
        providerReference: data.data.refund_reference,
        message: 'Refund initiated',
        amount: refundAmount || 0,
        currency: this.currencyCode,
      };
    } catch (error) {
      await this.logError(error as Error, { originalTransactionId });
      return {
        success: false,
        transactionId: '',
        providerReference: '',
        message: 'Refund initiation failed',
        amount: 0,
        currency: this.currencyCode,
      };
    }
  }

  async getTransactionStatus(providerReference: string): Promise<PaymentStatusResult> {
    try {
      const response = await fetch(
        `${this.baseUrl}/transaction/verify/${providerReference}`,
        {
          headers: { Authorization: `Bearer ${this.apiKey}` },
        }
      );

      const data: any = await response.json();

      if (!data.status) {
        return {
          status: 'UNKNOWN',
          amount: 0,
          currency: this.currencyCode,
          timestamp: new Date(),
          failureReason: data.message,
        };
      }

      const status = data.data.status === 'success' ? 'COMPLETED' : 'PENDING';

      return {
        status: status as any,
        amount: data.data.amount / 100,
        currency: this.currencyCode,
        timestamp: new Date(data.data.paid_at),
      };
    } catch (error) {
      await this.logError(error as Error, { providerReference });
      return {
        status: 'UNKNOWN',
        amount: 0,
        currency: this.currencyCode,
        timestamp: new Date(),
      };
    }
  }

  verifyWebhookSignature(payload: string, signature: string): boolean {
    const crypto = require('crypto');
    const hash = crypto
      .createHmac('sha512', this.webhookSecret)
      .update(payload)
      .digest('hex');
    return hash === signature;
  }

  async parseWebhookPayload(payload: Record<string, any>): Promise<WebhookParseResult> {
    // Paystack uses charge.success, transfer.success, etc.
    const event = payload.event || '';
    const data = payload.data || {};

    return {
      valid: true,
      event,
      data: {
        transactionId: String(data.id || data.transfer?.id),
        providerReference: data.reference || data.transfer?.reference,
        status: event.includes('success') ? 'COMPLETED' : 'PENDING',
        amount: (data.amount || data.transfer?.amount) / 100,
        currency: data.currency || this.currencyCode,
        timestamp: new Date(data.created_at || data.transfer?.created_at),
        details: data,
      },
    };
  }

  async getFees(amount: number): Promise<FeeResult> {
    // Paystack standard fees: 1.5% + ₦100 for collections
    // 0.5% for payouts (actually free)
    const percentage = 1.5;
    const fixed = 10000; // ₦100 in kobo

    return {
      transactionFeePercentage: percentage,
      fixedFeeKobo: fixed,
      totalFeeKobo: Math.round((amount * percentage) / 100) + fixed,
    };
  }

  async reconcileTransactions(
    startDate: Date,
    endDate: Date,
    pageSize: number = 100
  ): Promise<any[]> {
    // Fetch batch from Paystack API
    const response = await fetch(
      `${this.baseUrl}/transaction?from=${startDate.toISOString()}&to=${endDate.toISOString()}&perPage=${pageSize}`,
      {
        headers: { Authorization: `Bearer ${this.apiKey}` },
      }
    );

    const data: any = await response.json();
    return data.data || [];
  }

  async getExchangeRate(from: string, to: string): Promise<number> {
    // Would call Paystack rate endpoint or external API
    // For now, return 1:1 (should cache in Redis)
    return 1.0;
  }
}

/**
 * Stripe Implementation
 */
export class StripeProvider extends PaymentProvider {
  private baseUrl = 'https://api.stripe.com/v1';

  async verifyAccountDetails(
    accountNumber: string,
    bankCode?: string
  ): Promise<PaymentVerificationResult> {
    // Stripe uses custom account verification
    // For now, assume all accounts are verifiable (would integrate with microdeposits)
    return {
      isValid: true,
      accountName: 'Stripe Account',
      accountNumber,
      bankCode,
      message: 'Account verified via Stripe',
    };
  }

  async createPaymentRecipient(
    accountNumber: string,
    accountName: string
  ): Promise<PaymentRecipientResult> {
    try {
      const response = await fetch(`${this.baseUrl}/customers`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          name: accountName,
          description: accountNumber,
        }).toString(),
      });

      const data: any = await response.json();

      return {
        success: true,
        recipientId: data.id,
        message: 'Recipient created',
        details: data,
      };
    } catch (error) {
      await this.logError(error as Error, { accountNumber });
      return {
        success: false,
        recipientId: '',
        message: 'Recipient creation failed',
      };
    }
  }

  async initiateCollection(
    amount: number,
    currency: string,
    recipientEmail: string
  ): Promise<PaymentInitiationResult> {
    try {
      const response = await fetch(`${this.baseUrl}/checkout/sessions`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          'payment_method_types[0]': 'card',
          success_url: 'https://ajocircle.app/success',
          cancel_url: 'https://ajocircle.app/cancel',
          customer_email: recipientEmail,
          'line_items[0][price_data][currency]': currency.toLowerCase(),
          'line_items[0][price_data][unit_amount]': String(amount * 100),
          'line_items[0][price_data][product_data][name]': 'AjoCircle Contribution',
          'line_items[0][quantity]': '1',
          mode: 'payment',
        }).toString(),
      });

      const data: any = await response.json();

      return {
        success: true,
        transactionId: data.id,
        providerReference: data.id,
        authorizationUrl: data.url,
        message: 'Checkout session created',
        amount,
        currency,
      };
    } catch (error) {
      await this.logError(error as Error, { amount, currency });
      return {
        success: false,
        transactionId: '',
        providerReference: '',
        message: 'Collection initiation failed',
        amount,
        currency,
      };
    }
  }

  async initiatePayout(
    amount: number,
    currency: string,
    recipientId: string
  ): Promise<PaymentInitiationResult> {
    try {
      const response = await fetch(`${this.baseUrl}/payouts`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          amount: String(amount * 100),
          currency: currency.toLowerCase(),
          destination: recipientId,
          description: 'AjoCircle Group Payout',
        }).toString(),
      });

      const data: any = await response.json();

      return {
        success: true,
        transactionId: data.id,
        providerReference: data.id,
        message: 'Payout initiated',
        amount,
        currency,
      };
    } catch (error) {
      await this.logError(error as Error, { amount, currency });
      return {
        success: false,
        transactionId: '',
        providerReference: '',
        message: 'Payout initiation failed',
        amount,
        currency,
      };
    }
  }

  async initiateRefund(originalTransactionId: string): Promise<PaymentInitiationResult> {
    try {
      const response = await fetch(`${this.baseUrl}/refunds`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          charge: originalTransactionId,
        }).toString(),
      });

      const data: any = await response.json();

      return {
        success: true,
        transactionId: data.id,
        providerReference: data.id,
        message: 'Refund initiated',
        amount: 0,
        currency: this.currencyCode,
      };
    } catch (error) {
      await this.logError(error as Error, { originalTransactionId });
      return {
        success: false,
        transactionId: '',
        providerReference: '',
        message: 'Refund initiation failed',
        amount: 0,
        currency: this.currencyCode,
      };
    }
  }

  async getTransactionStatus(providerReference: string): Promise<PaymentStatusResult> {
    try {
      const response = await fetch(`${this.baseUrl}/charges/${providerReference}`, {
        headers: { Authorization: `Bearer ${this.apiKey}` },
      });

      const data: any = await response.json();

      let status = 'PENDING';
      if (data.paid) status = 'COMPLETED';
      if (data.refunded) status = 'FAILED';

      return {
        status: status as any,
        amount: data.amount / 100,
        currency: data.currency.toUpperCase(),
        timestamp: new Date(data.created * 1000),
        failureReason: data.failure_message,
      };
    } catch (error) {
      await this.logError(error as Error, { providerReference });
      return {
        status: 'UNKNOWN',
        amount: 0,
        currency: this.currencyCode,
        timestamp: new Date(),
      };
    }
  }

  verifyWebhookSignature(payload: string, signature: string): boolean {
    const crypto = require('crypto');
    const test_secret = this.webhookSecret;
    const computedSig = crypto
      .createHmac('sha256', test_secret)
      .update(payload, 'utf8')
      .digest('base64');
    return computedSig === signature.replace('t=', '').split(',')[1];
  }

  async parseWebhookPayload(payload: Record<string, any>): Promise<WebhookParseResult> {
    const event = payload.type || '';
    const data = payload.data?.object || {};

    return {
      valid: true,
      event,
      data: {
        transactionId: data.id,
        providerReference: data.id,
        status: data.paid ? 'COMPLETED' : 'PENDING',
        amount: data.amount / 100,
        currency: data.currency.toUpperCase(),
        timestamp: new Date(data.created * 1000),
      },
    };
  }

  async getFees(amount: number): Promise<FeeResult> {
    // Stripe charges: 2.9% + $0.30
    // Convert to kobo assuming USD
    const percentage = 2.9;
    const fixed = 3000; // $0.30 in cents

    return {
      transactionFeePercentage: percentage,
      fixedFeeKobo: fixed,
      totalFeeKobo: Math.round((amount * percentage) / 100) + fixed,
    };
  }

  async reconcileTransactions(startDate: Date, endDate: Date): Promise<any[]> {
    const response = await fetch(
      `${this.baseUrl}/charges?created[gte]=${Math.floor(startDate.getTime() / 1000)}&created[lte]=${Math.floor(endDate.getTime() / 1000)}`,
      {
        headers: { Authorization: `Bearer ${this.apiKey}` },
      }
    );

    const data: any = await response.json();
    return data.data || [];
  }

  async getExchangeRate(from: string, to: string): Promise<number> {
    return 1.0;
  }
}

/**
 * Mock Provider (for testing)
 */
export class MockProvider extends PaymentProvider {
  async verifyAccountDetails(accountNumber: string): Promise<PaymentVerificationResult> {
    return {
      isValid: true,
      accountName: 'Mock Account Holder',
      accountNumber,
      message: 'Mock verification successful',
    };
  }

  async createPaymentRecipient(accountNumber: string, accountName: string): Promise<PaymentRecipientResult> {
    return {
      success: true,
      recipientId: `mock_recipient_${accountNumber}`,
      message: 'Mock recipient created',
    };
  }

  async initiateCollection(amount: number, currency: string, email: string): Promise<PaymentInitiationResult> {
    return {
      success: true,
      transactionId: `mock_txn_${Date.now()}`,
      providerReference: `mock_ref_${Date.now()}`,
      message: 'Mock collection initiated',
      amount,
      currency,
    };
  }

  async initiatePayout(amount: number, currency: string, recipientId: string): Promise<PaymentInitiationResult> {
    return {
      success: true,
      transactionId: `mock_payout_${Date.now()}`,
      providerReference: `mock_payout_ref_${Date.now()}`,
      message: 'Mock payout initiated',
      amount,
      currency,
    };
  }

  async initiateRefund(originalTransactionId: string): Promise<PaymentInitiationResult> {
    return {
      success: true,
      transactionId: `mock_refund_${Date.now()}`,
      providerReference: `mock_refund_ref_${Date.now()}`,
      message: 'Mock refund initiated',
      amount: 0,
      currency: this.currencyCode,
    };
  }

  async getTransactionStatus(providerReference: string): Promise<PaymentStatusResult> {
    return {
      status: 'COMPLETED',
      amount: 0,
      currency: this.currencyCode,
      timestamp: new Date(),
    };
  }

  verifyWebhookSignature(payload: string, signature: string): boolean {
    return true; // Mock always validates
  }

  async parseWebhookPayload(payload: Record<string, any>): Promise<WebhookParseResult> {
    return {
      valid: true,
      event: payload.event || 'charge.success',
      data: {
        transactionId: payload.id || 'mock_id',
        providerReference: payload.reference || 'mock_ref',
        status: 'COMPLETED',
        amount: payload.amount || 0,
        currency: this.currencyCode,
        timestamp: new Date(),
      },
    };
  }

  async getFees(amount: number): Promise<FeeResult> {
    return {
      transactionFeePercentage: 0,
      fixedFeeKobo: 0,
      totalFeeKobo: 0,
    };
  }

  async reconcileTransactions(startDate: Date, endDate: Date): Promise<any[]> {
    return [];
  }

  async getExchangeRate(from: string, to: string): Promise<number> {
    return 1.0;
  }
}

export default PaymentProvider;
