import { Pool } from 'pg';
import { CacheClient, InMemoryCache } from './cache';

/**
 * CountryConfigService
 * 
 * Provides centralized access to multi-country configuration:
 * - Countries (regions, payment providers, regulatory frameworks)
 * - Currencies and exchange rates
 * - Payment provider configs and credentials (encrypted)
 * - KYC requirements per country
 * - Transaction limits per region
 * 
 * Caches all data in Redis for fast access with TTL-based invalidation
 */

export interface Country {
  id: string;
  countryCode: string; // ISO 3166-1 alpha-2
  countryName: string;
  primaryCurrencyCode: string; // ISO 4217
  region: 'WEST_AFRICA' | 'EAST_AFRICA' | 'SOUTH_AFRICA' | 'DIASPORA' | 'ASIA';
  timezone: string;
  supportedPaymentProviders: string[];
  kycRequirements: {
    documentTypes: string[];
    [key: string]: any;
  };
  regulatoryFramework: string; // CBN, FCA, FinCEN, etc.
  maxDailyTransactionLimitKobo: number;
  maxSingleTransactionLimitKobo: number;
  reportingRequirements: {
    amlThreshold?: number;
    sarRequired?: boolean;
    [key: string]: any;
  };
  enabled: boolean;
  createdAt: Date;
}

export interface Currency {
  id: string;
  currencyCode: string; // ISO 4217
  currencyName: string;
  symbol: string;
  decimalPlaces: number;
  isFiat: boolean;
  exchangeRateToUsd: number; // 1 unit = X USD
  lastRateUpdate: Date;
  enabled: boolean;
  createdAt: Date;
}

export interface PaymentProviderConfig {
  id: string;
  providerName: string; // paystack, flutterwave, stripe, mpesa, razorpay, wise
  countryCode: string;
  currencyCode: string;
  operationType: 'COLLECTION' | 'PAYOUT' | 'REFUND' | 'TRANSFER';
  isPrimary: boolean;
  priority: number; // Lower = higher priority for failover
  dailyLimitKobo: number;
  transactionFeePercentage: number;
  fixedFeeKobo: number;
  enabled: boolean;
  createdAt: Date;
}

export interface ExchangeRate {
  id: string;
  fromCurrency: string;
  toCurrency: string;
  rate: number; // 1 from currency = rate to currency
  source: string;
  quotedAt: Date;
}

export class CountryConfigService {
  private db: Pool;
  private cache: CacheClient;
  private cacheTtl = 3600; // 1 hour default
  private exchangeRateCacheTtl = 300; // 5 minutes for rates

  constructor(db: Pool, cache: CacheClient = new InMemoryCache()) {
    this.db = db;
    this.cache = cache;
  }

  /**
   * Get country configuration by country code
   */
  async getCountry(countryCode: string): Promise<Country | null> {
    const cacheKey = `country:${countryCode}`;

    // Try cache first
    const cached = await this.getFromCache<Country>(cacheKey);
    if (cached) return cached;

    // Query database
    const result = await this.db.query(
      'SELECT * FROM countries WHERE country_code = $1',
      [countryCode]
    );

    if (result.rows.length === 0) return null;

    const country = this.mapCountryRow(result.rows[0]);
    
    // Cache it
    await this.setInCache(cacheKey, country, this.cacheTtl);

    return country;
  }

  /**
   * Get all enabled countries
   */
  async getAllCountries(): Promise<Country[]> {
    const cacheKey = 'countries:all';

    const cached = await this.getFromCache<Country[]>(cacheKey);
    if (cached) return cached;

    const result = await this.db.query(
      'SELECT * FROM countries WHERE enabled = true ORDER BY country_name ASC'
    );

    const countries = result.rows.map(row => this.mapCountryRow(row));
    await this.setInCache(cacheKey, countries, this.cacheTtl);

    return countries;
  }

  /**
   * Get countries by region
   */
  async getCountriesByRegion(region: string): Promise<Country[]> {
    const cacheKey = `countries:region:${region}`;

    const cached = await this.getFromCache<Country[]>(cacheKey);
    if (cached) return cached;

    const result = await this.db.query(
      'SELECT * FROM countries WHERE region = $1 AND enabled = true',
      [region]
    );

    const countries = result.rows.map(row => this.mapCountryRow(row));
    await this.setInCache(cacheKey, countries, this.cacheTtl);

    return countries;
  }

  /**
   * Get currency by currency code
   */
  async getCurrency(currencyCode: string): Promise<Currency | null> {
    const cacheKey = `currency:${currencyCode}`;

    const cached = await this.getFromCache<Currency>(cacheKey);
    if (cached) return cached;

    const result = await this.db.query(
      'SELECT * FROM currencies WHERE currency_code = $1',
      [currencyCode]
    );

    if (result.rows.length === 0) return null;

    const currency = this.mapCurrencyRow(result.rows[0]);
    await this.setInCache(cacheKey, currency, this.cacheTtl);

    return currency;
  }

  /**
   * Get all enabled currencies
   */
  async getAllCurrencies(): Promise<Currency[]> {
    const cacheKey = 'currencies:all';

    const cached = await this.getFromCache<Currency[]>(cacheKey);
    if (cached) return cached;

    const result = await this.db.query(
      'SELECT * FROM currencies WHERE enabled = true ORDER BY currency_code ASC'
    );

    const currencies = result.rows.map(row => this.mapCurrencyRow(row));
    await this.setInCache(cacheKey, currencies, this.cacheTtl);

    return currencies;
  }

  /**
   * Get payment provider configs for a country/currency/operation
   */
  async getPaymentProviderConfigs(
    countryCode: string,
    currencyCode?: string,
    operationType?: string
  ): Promise<PaymentProviderConfig[]> {
    const cacheKey = `provider_config:${countryCode}:${currencyCode || 'ANY'}:${operationType || 'ANY'}`;

    const cached = await this.getFromCache<PaymentProviderConfig[]>(cacheKey);
    if (cached) return cached;

    let query = 'SELECT * FROM payment_provider_configs WHERE country_code = $1 AND enabled = true';
    const params: any[] = [countryCode];

    if (currencyCode) {
      query += ' AND currency_code = $' + (params.length + 1);
      params.push(currencyCode);
    }

    if (operationType) {
      query += ' AND operation_type = $' + (params.length + 1);
      params.push(operationType);
    }

    query += ' ORDER BY priority ASC';

    const result = await this.db.query(query, params);
    const configs = result.rows.map(row => this.mapProviderConfigRow(row));

    await this.setInCache(cacheKey, configs, this.cacheTtl);

    return configs;
  }

  /**
   * Get primary payment provider for a country (for failover logic)
   */
  async getPrimaryPaymentProvider(
    countryCode: string,
    operationType: 'COLLECTION' | 'PAYOUT'
  ): Promise<PaymentProviderConfig | null> {
    const configs = await this.getPaymentProviderConfigs(
      countryCode,
      undefined,
      operationType
    );

    return configs.length > 0 ? configs[0] : null; // First one has highest priority
  }

  /**
   * Get payment provider for specific currency pair
   */
  async getPaymentProviderForCurrency(
    countryCode: string,
    currencyCode: string,
    operationType: 'COLLECTION' | 'PAYOUT'
  ): Promise<PaymentProviderConfig | null> {
    const configs = await this.getPaymentProviderConfigs(
      countryCode,
      currencyCode,
      operationType
    );

    const primary = configs.find(c => c.isPrimary);
    return primary || (configs.length > 0 ? configs[0] : null);
  }

  /**
   * Get all payment providers for a country
   */
  async getAllPaymentProvidersForCountry(
    countryCode: string
  ): Promise<string[]> {
    const country = await this.getCountry(countryCode);
    return country ? country.supportedPaymentProviders : [];
  }

  /**
   * Get exchange rate between two currencies
   */
  async getExchangeRate(
    fromCurrency: string,
    toCurrency: string
  ): Promise<number | null> {
    // If same currency, return 1:1
    if (fromCurrency === toCurrency) return 1;

    const cacheKey = `exchange_rate:${fromCurrency}:${toCurrency}`;

    const cached = await this.getFromCache<number>(cacheKey);
    if (cached !== null) return cached;

    const result = await this.db.query(
      'SELECT rate FROM exchange_rates WHERE from_currency = $1 AND to_currency = $2 ORDER BY quoted_at DESC LIMIT 1',
      [fromCurrency, toCurrency]
    );

    if (result.rows.length === 0) return null;

    const rate = result.rows[0].rate;
    await this.setInCache(cacheKey, rate, this.exchangeRateCacheTtl);

    return rate;
  }

  /**
   * Get KYC requirements for a country
   */
  async getKycRequirements(countryCode: string) {
    const country = await this.getCountry(countryCode);
    return country ? country.kycRequirements : null;
  }

  /**
   * Get transaction limits for a country
   */
  async getTransactionLimits(countryCode: string) {
    const country = await this.getCountry(countryCode);
    if (!country) return null;

    return {
      maxDailyLimitKobo: country.maxDailyTransactionLimitKobo,
      maxSingleTransactionLimitKobo: country.maxSingleTransactionLimitKobo,
    };
  }

  /**
   * Get regulatory framework for a country
   */
  async getRegulatoryFramework(countryCode: string): Promise<string | null> {
    const country = await this.getCountry(countryCode);
    return country ? country.regulatoryFramework : null;
  }

  /**
   * Get AML/CFT reporting requirements for a country
   */
  async getReportingRequirements(countryCode: string) {
    const country = await this.getCountry(countryCode);
    return country ? country.reportingRequirements : null;
  }

  /**
   * Invalidate country config cache (after admin updates)
   */
  async invalidateCountryCache(countryCode?: string): Promise<void> {
    if (countryCode) {
      await this.deleteFromCache(`country:${countryCode}`);
      await this.deleteFromCache(`provider_config:${countryCode}:*`);
    } else {
      await this.cache.delByPattern('country:*');
      await this.cache.delByPattern('provider_config:*');
    }
  }

  /**
   * Refresh exchange rates from external source
   */
  async refreshExchangeRates(): Promise<void> {
    // This would integrate with an external API (OpenExchangeRates, XE, etc.)
    // For now, just log that this needs to be async job
    console.log('[CountryConfigService] Exchange rates refresh scheduled as async job');
  }

  // ============================================================================
  // PRIVATE HELPERS
  // ============================================================================

  private mapCountryRow(row: any): Country {
    return {
      id: row.id,
      countryCode: row.country_code,
      countryName: row.country_name,
      primaryCurrencyCode: row.primary_currency_code,
      region: row.region,
      timezone: row.timezone,
      supportedPaymentProviders: row.supported_payment_providers,
      kycRequirements: row.kyc_requirements,
      regulatoryFramework: row.regulatory_framework,
      maxDailyTransactionLimitKobo: row.max_daily_transaction_limit,
      maxSingleTransactionLimitKobo: row.max_single_transaction_limit,
      reportingRequirements: row.reporting_requirements,
      enabled: row.enabled,
      createdAt: row.created_at,
    };
  }

  private mapCurrencyRow(row: any): Currency {
    return {
      id: row.id,
      currencyCode: row.currency_code,
      currencyName: row.currency_name,
      symbol: row.symbol,
      decimalPlaces: row.decimal_places,
      isFiat: row.is_fiat,
      exchangeRateToUsd: row.exchange_rate_to_usd,
      lastRateUpdate: row.last_rate_update,
      enabled: row.enabled,
      createdAt: row.created_at,
    };
  }

  private mapProviderConfigRow(row: any): PaymentProviderConfig {
    return {
      id: row.id,
      providerName: row.provider_name,
      countryCode: row.country_code,
      currencyCode: row.currency_code,
      operationType: row.operation_type,
      isPrimary: row.is_primary,
      priority: row.priority,
      dailyLimitKobo: row.daily_limit_kobo,
      transactionFeePercentage: row.transaction_fee_percentage,
      fixedFeeKobo: row.fixed_fee_kobo,
      enabled: row.enabled,
      createdAt: row.created_at,
    };
  }

  // Cache helpers
  private async getFromCache<T>(key: string): Promise<T | null> {
    const data = await this.cache.get(key);
    return data ? (JSON.parse(data) as T) : null;
  }

  private async setInCache<T>(key: string, value: T, ttl: number): Promise<void> {
    await this.cache.setex(key, ttl, JSON.stringify(value));
  }

  private async deleteFromCache(key: string): Promise<void> {
    if (key.includes('*')) {
      await this.cache.delByPattern(key);
      return;
    }
    await this.cache.del(key);
  }
}

// Export singleton instance
let instance: CountryConfigService | null = null;

export function initCountryConfigService(db: Pool, cache?: CacheClient): CountryConfigService {
  instance = new CountryConfigService(db, cache || new InMemoryCache());
  return instance;
}

export function getCountryConfigService(): CountryConfigService {
  if (!instance) {
    throw new Error('CountryConfigService not initialized. Call initCountryConfigService first');
  }
  return instance;
}
