# Payment Provider Abstraction Layer Architecture
## Provider-Agnostic Payment Infrastructure

---

## Overview

The payment layer is completely decoupled from business logic. All provider-specific code lives in isolated adapter modules that implement a unified interface. This enables:
- Adding new providers (10+ payment companies, 5+ currencies, 150+ countries)
- Switching providers by region without code changes
- Provider failure fallback chains
- Unified webhook handling
- Global transaction consistency

---

## Core Abstraction Interface

```typescript
// Core payment provider interface (language-agnostic contract)

interface PaymentProvider {
  // Account & recipient management
  verifyAccountDetails(
    accountId: string,
    accountType: 'BANK_ACCOUNT' | 'MOBILE_MONEY' | 'WALLET',
    country: string,
    currency: string
  ): Promise<{
    verified: boolean;
    accountName: string;
    accountNumber: string;
    bankCode?: string;
    bankName?: string;
    accountType: string;
    metadata?: Record<string, any>;
  }>;

  createPaymentRecipient(
    userId: string,
    accountDetails: {
      accountNumber: string;
      bankCode?: string;
      accountName: string;
      accountType: 'BANK_ACCOUNT' | 'MOBILE_MONEY' | 'WALLET';
      currency: string;
      country: string;
      metadata?: Record<string, any>;
    }
  ): Promise<{
    recipientId: string;
    recipientCode?: string; // Provider-specific identifier
    accountName: string;
    createdAt: Date;
  }>;

  // Payment operations
  initiateCollection(
    collectionDetails: {
      userId: string;
      amount: number; // In smallest currency unit (kobo, cents, etc.)
      currency: string;
      description: string;
      metadata?: {
        groupId?: string;
        contributionCycleId?: string;
        contributionType?: string;
      };
      idempotencyKey: string; // Deduplication key
      callbackUrl?: string;
    }
  ): Promise<{
    transactionId: string;
    paymentLink?: string; // For hosted payment pages
    authorizationUrl?: string; // For 3D Secure redirects
    status: 'PENDING' | 'PROCESSING';
    expiresAt?: Date;
    metadata?: Record<string, any>;
  }>;

  initiatePayout(
    payoutDetails: {
      recipientId: string;
      amount: number;
      currency: string;
      narration: string;
      metadata?: {
        payoutRequestId?: string;
        groupId?: string;
        withdrawalType?: string;
      };
      idempotencyKey: string;
      callbackUrl?: string;
    }
  ): Promise<{
    transactionId: string;
    status: 'PENDING' | 'PROCESSING' | 'INITIATED';
    estimatedDelivery?: Date;
    metadata?: Record<string, any>;
  }>;

  initiateRefund(
    refundDetails: {
      originalTransactionId: string;
      amount?: number; // Omit for full refund
      reason: string;
      idempotencyKey: string;
    }
  ): Promise<{
    refundId: string;
    originalTransactionId: string;
    amount: number;
    status: 'PENDING' | 'PROCESSING' | 'COMPLETED';
    metadata?: Record<string, any>;
  }>;

  // Transaction status & verification
  getTransactionStatus(transactionId: string): Promise<{
    transactionId: string;
    status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
    amount: number;
    currency: string;
    failureReason?: string;
    failureCode?: string;
    completedAt?: Date;
    metadata?: Record<string, any>;
  }>;

  verifyWebhookSignature(
    signatureHeader: string,
    payload: string,
    secret: string
  ): Promise<boolean>;

  parseWebhookPayload(payload: any): Promise<{
    eventType: 
      | 'COLLECTION_SUCCESSFUL'
      | 'COLLECTION_FAILED'
      | 'PAYOUT_SUCCESSFUL'
      | 'PAYOUT_FAILED'
      | 'REFUND_SUCCESSFUL'
      | 'SETTLEMENT_COMPLETED'
      | 'OTHER';
    transactionId: string;
    status: string;
    amount?: number;
    currency?: string;
    timestamp: Date;
    rawPayload: any;
  }>;

  // Exchange & rate information
  getExchangeRate(
    fromCurrency: string,
    toCurrency: string,
    amount?: number
  ): Promise<{
    fromCurrency: string;
    toCurrency: string;
    rate: number; // Exchange rate (1 unit of from = rate units of to)
    feePercentage?: number;
    amount?: number; // Converted amount
    timestamp: Date;
    expiresAt?: Date;
  }>;

  getTransactionFee(
    amount: number,
    currency: string,
    transactionType: 'COLLECTION' | 'PAYOUT' | 'REFUND'
  ): Promise<{
    amount: number;
    percentage?: number;
    transactionType: string;
    currency: string;
  }>;

  // Reconciliation
  reconcileTransactions(
    dateRange: {
      startDate: Date;
      endDate: Date;
    },
    currency?: string
  ): Promise<{
    transactionId: string;
    status: 'COMPLETED' | 'PENDING' | 'FAILED';
    amount: number;
    currency: string;
    completedAt?: Date;
    metadata?: Record<string, any>;
  }[]>;

  // Account lookup
  resolveAccount(
    accountNumber: string,
    bankCode: string,
    country: string
  ): Promise<{
    accountName: string;
    accountNumber: string;
    bankCode: string;
    bankName: string;
    exists: boolean;
  }>;
}
```

---

## Provider Implementations

### 1. Paystack Provider

```typescript
// backend/src/services/payment/providers/PaystackProvider.ts

class PaystackProvider implements PaymentProvider {
  private apiKey: string;
  private baseUrl = 'https://api.paystack.co';
  private webhookSecret: string;

  constructor(apiKey: string, webhookSecret: string) {
    this.apiKey = apiKey;
    this.webhookSecret = webhookSecret;
  }

  async verifyAccountDetails(accountId, accountType, country, currency) {
    // Paystack: resolve account via nuban endpoint
    const response = await fetch(`${this.baseUrl}/bank/resolve`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${this.apiKey}` },
      body: new URLSearchParams({
        account_number: accountId,
        bank_code: country === 'NG' ? '044' : undefined,
      }).toString(),
    });
    
    if (!response.ok) throw new Error('Account verification failed');
    
    const data = await response.json();
    return {
      verified: data.status,
      accountName: data.data.account_name,
      accountNumber: data.data.account_number,
      bankCode: '044',
      bankName: 'Access Bank',
      accountType: 'BANK_ACCOUNT',
    };
  }

  async createPaymentRecipient(userId, accountDetails) {
    // Paystack: create transfer recipient
    const response = await fetch(`${this.baseUrl}/transferrecipient`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type: 'nuban',
        name: accountDetails.accountName,
        account_number: accountDetails.accountNumber,
        bank_code: accountDetails.bankCode,
        currency: accountDetails.currency,
        metadata: { userId },
      }),
    });

    if (!response.ok) throw new Error('Recipient creation failed');

    const data = await response.json();
    return {
      recipientId: data.data.id,
      recipientCode: data.data.recipient_code,
      accountName: data.data.name,
      createdAt: new Date(data.data.createdAt),
    };
  }

  async initiateCollection(collectionDetails) {
    // Paystack: initialize transaction
    const response = await fetch(`${this.baseUrl}/transaction/initialize`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: collectionDetails.userId,
        amount: collectionDetails.amount,
        currency: collectionDetails.currency,
        description: collectionDetails.description,
        metadata: collectionDetails.metadata,
        callback_url: collectionDetails.callbackUrl,
      }),
    });

    const data = await response.json();
    return {
      transactionId: data.data.reference,
      paymentLink: data.data.authorization_url,
      status: 'PENDING',
    };
  }

  async initiatePayout(payoutDetails) {
    // Paystack: initiate transfer
    const response = await fetch(`${this.baseUrl}/transfer`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        source: 'balance', // From business balance
        recipient: payoutDetails.recipientId,
        amount: payoutDetails.amount,
        reason: payoutDetails.narration,
        reference: payoutDetails.idempotencyKey,
      }),
    });

    const data = await response.json();
    return {
      transactionId: data.data.reference,
      status: 'PROCESSING',
      metadata: { paystackTransferId: data.data.id },
    };
  }

  async verifyWebhookSignature(signatureHeader, payload, secret) {
    // Paystack: HMAC-SHA512 verification
    const hash = crypto
      .createHmac('sha512', secret)
      .update(payload)
      .digest('hex');
    return hash === signatureHeader;
  }

  async parseWebhookPayload(payload) {
    // Map Paystack events to platform events
    const eventMap = {
      'charge.success': 'COLLECTION_SUCCESSFUL',
      'charge.failed': 'COLLECTION_FAILED',
      'transfer.success': 'PAYOUT_SUCCESSFUL',
      'transfer.failed': 'PAYOUT_FAILED',
    };

    return {
      eventType: eventMap[payload.event] || 'OTHER',
      transactionId: payload.data.reference,
      status: payload.data.status,
      amount: payload.data.amount,
      currency: payload.data.currency,
      timestamp: new Date(payload.data.createdAt),
      rawPayload: payload,
    };
  }

  // ... remaining methods (getExchangeRate, getTransactionFee, reconcile, resolveAccount)
}
```

### 2. Flutterwave Provider

```typescript
// backend/src/services/payment/providers/FlutterwaveProvider.ts

class FlutterwaveProvider implements PaymentProvider {
  private apiKey: string;
  private baseUrl = 'https://api.flutterwave.com/v3';
  private webhookSecret: string;

  // Implementation follows same pattern as PaystackProvider
  // Flutterwave-specific endpoints:
  // - /accounts/resolve (BVN/account verification)
  // - /transfers (payouts)
  // - /transactions (collections)
  // - /transactions/verify_payment (verification)
  
  async initiateCollection(collectionDetails) {
    const response = await fetch(`${this.baseUrl}/hosted-billing-plans`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount: collectionDetails.amount,
        currency: collectionDetails.currency,
        tx_ref: collectionDetails.idempotencyKey,
        redirect_url: collectionDetails.callbackUrl,
        meta: collectionDetails.metadata,
      }),
    });

    const data = await response.json();
    return {
      transactionId: data.data.tx_ref,
      paymentLink: data.data.link,
      status: 'PENDING',
    };
  }

  // ... rest of implementation
}
```

### 3. Stripe Provider

```typescript
// backend/src/services/payment/providers/StripeProvider.ts

class StripeProvider implements PaymentProvider {
  private stripe: Stripe;
  private webhookSecret: string;

  constructor(apiKey: string, webhookSecret: string) {
    this.stripe = new Stripe(apiKey);
    this.webhookSecret = webhookSecret;
  }

  async initiateCollection(collectionDetails) {
    const session = await this.stripe.checkout.sessions.create({
      line_items: [
        {
          price_data: {
            currency: collectionDetails.currency.toLowerCase(),
            product_data: {
              name: collectionDetails.description,
            },
            unit_amount: collectionDetails.amount,
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${collectionDetails.callbackUrl}?session_id={CHECKOUT_SESSION_ID}`,
      metadata: collectionDetails.metadata,
    });

    return {
      transactionId: session.id,
      paymentLink: session.url,
      status: 'PENDING',
    };
  }

  async initiatePayout(payoutDetails) {
    const payout = await this.stripe.payouts.create({
      amount: payoutDetails.amount,
      currency: payoutDetails.currency.toLowerCase(),
      destination: payoutDetails.recipientId, // Connected account ID
      description: payoutDetails.narration,
      metadata: payoutDetails.metadata,
    });

    return {
      transactionId: payout.id,
      status: 'PROCESSING',
    };
  }

  // ... rest of implementation
}
```

### 4. M-Pesa Provider

```typescript
// backend/src/services/payment/providers/MpesaProvider.ts

class MpesaProvider implements PaymentProvider {
  private consumerKey: string;
  private consumerSecret: string;
  private baseUrl = 'https://sandbox.safaricom.co.ke'; // or production URL
  private businessCode: string;
  private passkey: string;

  async initiateCollection(collectionDetails) {
    // M-Pesa: STK Push or C2B
    const timestamp = new Date()
      .toISOString()
      .replace(/[:-]/g, '')
      .slice(0, -4);

    const password = Buffer.from(
      `${this.businessCode}${this.passkey}${timestamp}`
    ).toString('base64');

    const response = await fetch(
      `${this.baseUrl}/mpesa/stkpush/v1/processrequest`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${await this.getAccessToken()}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          BusinessShortCode: this.businessCode,
          Password: password,
          Timestamp: timestamp,
          TransactionType: 'CustomerPayBillOnline',
          Amount: Math.floor(collectionDetails.amount / 100), // Convert kobo to KES
          PartyA: collectionDetails.userId, // Phone number
          PartyB: this.businessCode,
          PhoneNumber: collectionDetails.userId,
          CallBackURL: collectionDetails.callbackUrl,
          AccountReference: collectionDetails.idempotencyKey,
          TransactionDesc: collectionDetails.description,
        }),
      }
    );

    const data = await response.json();
    return {
      transactionId: data.CheckoutRequestID,
      status: 'PENDING',
    };
  }

  // ... rest of implementation
}
```

### 5. Razorpay Provider

```typescript
// Similar pattern for India/Asia region
// Supports: Collections, Payouts, Refunds
// INR, GBP, USD, EUR
```

### 6. Wise Provider

```typescript
// International transfer provider
// Supports: 150+ currencies, cross-border payments
// Lower fees for international transfers
```

### 7. Mock Provider (Testing)

```typescript
// backend/src/services/payment/providers/MockProvider.ts

class MockProvider implements PaymentProvider {
  async initiateCollection(collectionDetails) {
    return {
      transactionId: `mock_${uuid()}`,
      paymentLink: 'https://sandbox.com/pay',
      status: 'PENDING',
    };
  }

  async verifyWebhookSignature() {
    return true; // Always valid in test mode
  }

  // ... rest of implementation (all operations succeed)
}
```

---

## Provider Selection Logic

```typescript
// backend/src/services/payment/ProviderSelector.ts

class ProviderSelector {
  private providers: Map<string, PaymentProvider> = new Map();
  private providerConfig: ProviderConfigService;

  getProviderForRegion(
    region: string,
    currency: string,
    transactionType: 'COLLECTION' | 'PAYOUT' | 'TRANSFER'
  ): PaymentProvider {
    // Query provider_config table
    const config = this.providerConfig.getConfig(
      region,
      currency,
      transactionType
    );

    // Primary provider chain with fallback
    for (const providerName of config.providers) {
      const provider = this.providers.get(providerName);
      if (provider && this.isHealthy(provider)) {
        return provider;
      }
    }

    // All providers down - throw error with retry guidance
    throw new Error('All payment providers unavailable');
  }

  isHealthy(provider: PaymentProvider): boolean {
    // Check health cache (Redis)
    // Last health check: timeout/failed count
    return true; // Simplified
  }

  registerProvider(name: string, provider: PaymentProvider) {
    this.providers.set(name, provider);
  }
}

// Usage in transactions:
const transactions = {
  async initiateCollection(userId, amount, currency, groupId) {
    const region = await userService.getRegion(userId);
    const provider = providerSelector.getProviderForRegion(
      region,
      currency,
      'COLLECTION'
    );

    try {
      return await provider.initiateCollection({
        userId,
        amount,
        currency,
        idempotencyKey: generateIdempotencyKey(),
        metadata: { groupId },
      });
    } catch (error) {
      // Log error, retry with fallback provider
      logger.error('Collection failed', { error, userId, provider });
      throw new Error('Payment failed');
    }
  },
};
```

---

## Provider Configuration Management

```sql
-- Dynamic provider configuration per region
CREATE TABLE payment_provider_configs (
  id UUID PRIMARY KEY,
  region VARCHAR NOT NULL,
  currency_code VARCHAR NOT NULL,
  operation_type VARCHAR NOT NULL, -- COLLECTION, PAYOUT, TRANSFER
  primary_provider VARCHAR NOT NULL,
  fallback_providers TEXT[], -- Array of fallback provider names
  enabled BOOLEAN DEFAULT true,
  daily_limit_kobo BIGINT,
  transaction_fee_percentage DECIMAL(5, 2),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

INSERT INTO payment_provider_configs VALUES
('id-1', 'ng', 'NGN', 'COLLECTION', 'paystack', 
 ARRAY['flutterwave', 'stripe'], true, 100000000, 1.5),
('id-2', 'ng', 'NGN', 'PAYOUT', 'paystack', 
 ARRAY['flutterwave'], true, 50000000, 2.5),
('id-3', 'ke', 'KES', 'COLLECTION', 'mpesa', 
 ARRAY['flutterwave', 'stripe'], true, 50000000, 1.0),
('id-4', 'gb', 'GBP', 'TRANSFER', 'stripe', 
 ARRAY['wise'], true, 1000000000, 0.5),
('id-5', 'us', 'USD', 'PAYOUT', 'stripe', 
 ARRAY['wise'], true, 5000000000, 0.3);

-- Encrypted API credentials per provider per region
CREATE TABLE provider_credentials (
  id UUID PRIMARY KEY,
  provider_name VARCHAR NOT NULL,
  region VARCHAR NOT NULL,
  api_key VARCHAR NOT NULL ENCRYPTED,
  webhook_secret VARCHAR NOT NULL ENCRYPTED,
  merchant_id VARCHAR ENCRYPTED,
  metadata JSONB,
  status VARCHAR DEFAULT 'ACTIVE', -- ACTIVE, TESTING, INACTIVE
  created_at TIMESTAMP DEFAULT NOW()
);

-- Health check log (for provider failover)
CREATE TABLE provider_health (
  id UUID PRIMARY KEY,
  provider_name VARCHAR NOT NULL,
  region VARCHAR NOT NULL,
  last_check TIMESTAMP,
  status VARCHAR, -- UP, DOWN, DEGRADED
  check_duration_ms INT,
  error_message TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);
```

---

## Webhook Handling (Unified)

```typescript
// backend/src/routes/webhooks.ts

router.post('/webhooks/:provider', async (req, res) => {
  const { provider } = req.params;
  const signature = req.headers['x-paystack-signature']; // Or appropriate header
  const payload = JSON.stringify(req.body);

  try {
    // Route to correct provider
    const providerInstance = providerSelector.getProviderByName(provider);
    const isValid = await providerInstance.verifyWebhookSignature(
      signature,
      payload,
      getWebhookSecret(provider)
    );

    if (!isValid) {
      return res.status(401).json({ error: 'Invalid signature' });
    }

    // Parse to unified event format
    const event = await providerInstance.parseWebhookPayload(req.body);

    // Handle event
    await transactionService.handleWebhookEvent(event);

    // Acknowledge receipt
    res.json({ status: 'ok' });
  } catch (error) {
    logger.error('Webhook processing failed', { error, provider });
    res.status(500).json({ error: 'Processing failed' });
  }
});
```

---

## Error Handling Strategy

```typescript
interface ProviderError {
  code: string; // Standardized error code
  message: string;
  retryable: boolean;
  provider: string;
  originalError: any;
}

// Map provider-specific errors to platform errors
const errorMap = {
  paystack: {
    'Invalid token': { code: 'AUTH_FAILED', retryable: false },
    'Account does not exist': { code: 'ACCOUNT_NOT_FOUND', retryable: false },
    'Transfer failed': { code: 'PAYOUT_FAILED', retryable: true },
  },
  flutterwave: {
    'Authorization failed': { code: 'AUTH_FAILED', retryable: false },
    'Request failed': { code: 'PROVIDER_ERROR', retryable: true },
  },
  // ... other providers
};
```

---

## Testing Strategy

```typescript
// Test with mock provider for unit tests
// Test with sandbox providers for integration tests
// Test provider failover with provider health checks

describe('PaymentProvider', () => {
  it('should failover to backup provider', async () => {
    const config = {
      providers: ['paystack', 'flutterwave'],
    };

    // Disable primary provider
    providerHealth.setStatus('paystack', 'DOWN');

    const provider = providerSelector.getProviderForRegion(
      'ng',
      'NGN',
      'PAYOUT'
    );
    expect(provider).toBeInstanceOf(FlutterwaveProvider);
  });

  it('should deduplicate transactions with idempotency key', async () => {
    const key = 'idempotency-key-1';
    const result1 = await provider.initiateCollection({ ...details, idempotencyKey: key });
    const result2 = await provider.initiateCollection({ ...details, idempotencyKey: key });

    expect(result1.transactionId).toBe(result2.transactionId);
  });
});
```

---

## Conclusion

This abstraction layer enables:
- **Provider flexibility**: Add/remove providers without changing business logic
- **Regional optimization**: Choose best provider per region/currency
- **Failure resilience**: Automatic fallback to backup providers
- **Transaction consistency**: Unified webhook handling, idempotency
- **Global expansion**: Support 150+ countries, 30+ payment providers

All payment processing flows through this layer, ensuring consistency and compliance across all regions.
