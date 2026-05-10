import { Pool } from 'pg';
import Redis from 'redis';
import { PaymentProvider, PaystackProvider, StripeProvider, MockProvider } from './payment-provider';
import { getCountryConfigService } from './country-config';

/**
 * PaymentProviderSelector
 * 
 * Intelligent routing layer that:
 * - Selects the best provider for a transaction based on country/currency/operation
 * - Handles provider failover if primary provider fails
 * - Monitors provider health
 * - Logs all transactions for reconciliation
 */

export interface ProviderSelectionContext {
  countryCode: string;
  currencyCode: string;
  operationType: 'COLLECTION' | 'PAYOUT' | 'REFUND' | 'TRANSFER';
  amount?: number;
  account?: {
    accountNumber: string;
    bankCode?: string;
    accountName?: string;
  };
}

export interface ProviderHealthStatus {
  providerName: string;
  isHealthy: boolean;
  lastChecked: Date;
  failureCount: number;
  successRate: number;
}

export class PaymentProviderSelector {
  private db: Pool;
  private redis: Redis.RedisClient;
  private providers: Map<string, PaymentProvider> = new Map();
  private providerCache: Map<string, PaymentProvider> = new Map();
  private healthCheckInterval = 300000; // 5 minutes
  private decayFactor = 0.9; // Exponential decay for error tracking

  constructor(db: Pool, redis: Redis.RedisClient) {
    this.db = db;
    this.redis = redis;
    this.initializeProviders();
    this.startHealthChecks();
  }

  /**
   * Initialize all payment provider instances
   */
  private async initializeProviders(): Promise<void> {
    const countryConfig = getCountryConfigService();

    // Get all countries
    const countries = await countryConfig.getAllCountries();

    for (const country of countries) {
      const providers = await countryConfig.getPaymentProviderConfigs(country.countryCode);

      for (const providerConfig of providers) {
        const key = `${providerConfig.providerName}:${country.countryCode}:${providerConfig.currencyCode}`;

        if (!this.providers.has(key)) {
          const provider = await this.createProviderInstance(
            providerConfig.providerName,
            country.countryCode,
            providerConfig.currencyCode
          );

          if (provider) {
            this.providers.set(key, provider);
          }
        }
      }
    }
  }

  /**
   * Create a provider instance
   */
  private async createProviderInstance(
    providerName: string,
    countryCode: string,
    currencyCode: string
  ): Promise<PaymentProvider | null> {
    try {
      // Fetch encrypted credentials from database
      const credResult = await this.db.query(
        'SELECT api_key_encrypted, webhook_secret_encrypted FROM provider_credentials WHERE provider_name = $1 AND country_code = $2',
        [providerName, countryCode]
      );

      if (credResult.rows.length === 0) {
        console.warn(`[PaymentProviderSelector] No credentials found for ${providerName} in ${countryCode}`);
        return new MockProvider(providerName, countryCode, currencyCode, '', '', this.db);
      }

      // Decrypt credentials (would use AWS Secrets Manager in production)
      const creds = credResult.rows[0];
      const apiKey = await this.decryptValue(creds.api_key_encrypted);
      const webhookSecret = await this.decryptValue(creds.webhook_secret_encrypted);

      switch (providerName.toLowerCase()) {
        case 'paystack':
          return new PaystackProvider(providerName, countryCode, currencyCode, apiKey, webhookSecret, this.db);
        case 'stripe':
          return new StripeProvider(providerName, countryCode, currencyCode, apiKey, webhookSecret, this.db);
        case 'flutterwave':
          // Would implement FlutterwaveProvider here
          return new MockProvider(providerName, countryCode, currencyCode, apiKey, webhookSecret, this.db);
        case 'mpesa':
          // Would implement M-PesaProvider here
          return new MockProvider(providerName, countryCode, currencyCode, apiKey, webhookSecret, this.db);
        case 'razorpay':
          // Would implement RazorpayProvider here
          return new MockProvider(providerName, countryCode, currencyCode, apiKey, webhookSecret, this.db);
        case 'wise':
          // Would implement WiseProvider here
          return new MockProvider(providerName, countryCode, currencyCode, apiKey, webhookSecret, this.db);
        default:
          return new MockProvider(providerName, countryCode, currencyCode, apiKey, webhookSecret, this.db);
      }
    } catch (error) {
      console.error('[PaymentProviderSelector] Error creating provider:', error);
      return null;
    }
  }

  /**
   * Select best provider for a transaction
   * Considers: availability, success rate, fees, region
   */
  async selectProvider(context: ProviderSelectionContext): Promise<PaymentProvider> {
    const countryConfig = getCountryConfigService();

    // Get configured providers for this country/currency/operation
    const configs = await countryConfig.getPaymentProviderConfigs(
      context.countryCode,
      context.currencyCode,
      context.operationType
    );

    if (configs.length === 0) {
      console.warn(
        `[PaymentProviderSelector] No providers configured for ${context.countryCode}/${context.currencyCode}/${context.operationType}`
      );
      return new MockProvider('mock', context.countryCode, context.currencyCode, '', '', this.db);
    }

    // Filter by health status
    const healthyProviders = [];
    for (const config of configs) {
      const health = await this.getProviderHealth(config.providerName, context.countryCode);
      if (health.isHealthy) {
        healthyProviders.push(config);
      }
    }

    // Use healthy provider if available, otherwise use primary
    const selectedConfig = healthyProviders.length > 0 ? healthyProviders[0] : configs[0];

    // Get or create provider instance
    const cacheKey = `${selectedConfig.providerName}:${context.countryCode}:${context.currencyCode}`;

    if (!this.providerCache.has(cacheKey)) {
      const provider = await this.createProviderInstance(
        selectedConfig.providerName,
        context.countryCode,
        context.currencyCode
      );
      if (provider) {
        this.providerCache.set(cacheKey, provider);
      }
    }

    return this.providerCache.get(cacheKey) || new MockProvider('mock', context.countryCode, context.currencyCode, '', '', this.db);
  }

  /**
   * Get alternative providers for failover
   */
  async getAlternativeProviders(
    context: ProviderSelectionContext,
    excludeProvider: string
  ): Promise<PaymentProvider[]> {
    const countryConfig = getCountryConfigService();

    const configs = await countryConfig.getPaymentProviderConfigs(
      context.countryCode,
      context.currencyCode,
      context.operationType
    );

    const alternatives = [];
    for (const config of configs) {
      if (config.providerName === excludeProvider) continue;

      const cacheKey = `${config.providerName}:${context.countryCode}:${context.currencyCode}`;

      if (!this.providerCache.has(cacheKey)) {
        const provider = await this.createProviderInstance(
          config.providerName,
          context.countryCode,
          context.currencyCode
        );
        if (provider) {
          this.providerCache.set(cacheKey, provider);
        }
      }

      const cached = this.providerCache.get(cacheKey);
      if (cached) alternatives.push(cached);
    }

    return alternatives;
  }

  /**
   * Record transaction result for health tracking
   */
  async recordTransactionResult(
    providerName: string,
    countryCode: string,
    success: boolean,
    amount?: number,
    errorCode?: string
  ): Promise<void> {
    const key = `provider_health:${providerName}:${countryCode}`;
    const timestamp = new Date().toISOString();

    // Store in Redis for TTL
    this.redis.lpush(
      key,
      JSON.stringify({
        success,
        timestamp,
        amount,
        errorCode,
      }),
      (err) => {
        if (err) console.error('[PaymentProviderSelector] Redis error:', err);
      }
    );

    // Also log to database for long-term analytics
    await this.db.query(
      'INSERT INTO audit_logs (action, resource_type, description, status) VALUES ($1, $2, $3, $4)',
      ['PAYMENT_PROVIDER_TRANSACTION', providerName, `Amount: ${amount}, Error: ${errorCode || 'none'}`, success ? 'SUCCESS' : 'FAILURE']
    );
  }

  /**
   * Get provider health status
   */
  async getProviderHealth(providerName: string, countryCode?: string): Promise<ProviderHealthStatus> {
    const cacheKey = `provider_health:${providerName}:${countryCode || 'global'}`;

    // Check cache first
    return new Promise((resolve) => {
      this.redis.lrange(cacheKey, 0, 99, async (err, results) => {
        if (err) {
          resolve({
            providerName,
            isHealthy: true,
            lastChecked: new Date(),
            failureCount: 0,
            successRate: 1.0,
          });
          return;
        }

        const transactions = results.map((r) => JSON.parse(r));
        const totalTxns = transactions.length;
        const successfulTxns = transactions.filter((t) => t.success).length;
        const failureCount = transactions.filter((t) => !t.success).length;
        const successRate = totalTxns > 0 ? successfulTxns / totalTxns : 1.0;

        // Provider is unhealthy if success rate < 90%
        const isHealthy = successRate >= 0.9;

        resolve({
          providerName,
          isHealthy,
          lastChecked: new Date(),
          failureCount,
          successRate,
        });
      });
    });
  }

  /**
   * Get health status for all providers in a country
   */
  async getAllProviderHealth(countryCode: string): Promise<ProviderHealthStatus[]> {
    const countryConfig = getCountryConfigService();
    const configs = await countryConfig.getPaymentProviderConfigs(countryCode);

    const healthStatuses = [];
    for (const config of configs) {
      const health = await this.getProviderHealth(config.providerName, countryCode);
      healthStatuses.push(health);
    }

    return healthStatuses;
  }

  /**
   * Check all providers periodically
   */
  private async startHealthChecks(): Promise<void> {
    setInterval(async () => {
      console.log('[PaymentProviderSelector] Running health checks...');

      // Get all unique countries
      const countryConfig = getCountryConfigService();
      const countries = await countryConfig.getAllCountries();

      for (const country of countries) {
        const health = await this.getAllProviderHealth(country.countryCode);
        console.log(`[PaymentProviderSelector] Health check for ${country.countryCode}:`, health);
      }
    }, this.healthCheckInterval);
  }

  /**
   * Get recommended provider based on best fees
   */
  async getProviderByBestFees(
    context: ProviderSelectionContext
  ): Promise<{ provider: PaymentProvider; fees: number }> {
    const countryConfig = getCountryConfigService();

    const configs = await countryConfig.getPaymentProviderConfigs(
      context.countryCode,
      context.currencyCode,
      context.operationType
    );

    let bestProvider = null;
    let lowestFees = Infinity;

    for (const config of configs) {
      const cacheKey = `${config.providerName}:${context.countryCode}:${context.currencyCode}`;

      if (!this.providerCache.has(cacheKey)) {
        const provider = await this.createProviderInstance(
          config.providerName,
          context.countryCode,
          context.currencyCode
        );
        if (provider) {
          this.providerCache.set(cacheKey, provider);
        }
      }

      const provider = this.providerCache.get(cacheKey);
      if (!provider) continue;

      const feeResult = await provider.getFees(context.amount || 0);
      const totalFees = feeResult.totalFeeKobo;

      if (totalFees < lowestFees) {
        lowestFees = totalFees;
        bestProvider = provider;
      }
    }

    return {
      provider: bestProvider || new MockProvider('mock', context.countryCode, context.currencyCode, '', '', this.db),
      fees: lowestFees === Infinity ? 0 : lowestFees,
    };
  }

  /**
   * Decrypt credential values (replace with AWS Secrets Manager in production)
   */
  private async decryptValue(encryptedValue: Buffer | string): Promise<string> {
    // In production, this would call AWS Secrets Manager
    // For now, just return a placeholder
    if (typeof encryptedValue === 'string') return encryptedValue;
    return encryptedValue.toString();
  }

  /**
   * Clear provider caches (after config updates)
   */
  async clearCaches(): Promise<void> {
    this.providers.clear();
    this.providerCache.clear();
    await this.initializeProviders();
  }
}

// Export singleton
let selectorInstance: PaymentProviderSelector | null = null;

export function initPaymentProviderSelector(
  db: Pool,
  redis: Redis.RedisClient
): PaymentProviderSelector {
  selectorInstance = new PaymentProviderSelector(db, redis);
  return selectorInstance;
}

export function getPaymentProviderSelector(): PaymentProviderSelector {
  if (!selectorInstance) {
    throw new Error('PaymentProviderSelector not initialized. Call initPaymentProviderSelector first');
  }
  return selectorInstance;
}

export default PaymentProviderSelector;
