import { Router } from 'express';
import { getCountryConfigService } from '../services/country-config';
import { getPaymentProviderSelector } from '../services/payment-provider-selector';

const r = Router();

r.get('/countries', async (_req, res, next) => {
  try {
    const service = getCountryConfigService();
    const countries = await service.getAllCountries();
    res.json({ countries });
  } catch (error) {
    next(error);
  }
});

r.get('/countries/:countryCode', async (req, res, next) => {
  try {
    const service = getCountryConfigService();
    const countryCode = String(req.params.countryCode || '').toUpperCase();
    const country = await service.getCountry(countryCode);

    if (!country) {
      res.status(404).json({ error: 'Country not found' });
      return;
    }

    res.json({ country });
  } catch (error) {
    next(error);
  }
});

r.post('/providers/select', async (req, res, next) => {
  try {
    const countryCode = String(req.body?.countryCode || '').toUpperCase();
    const currencyCode = String(req.body?.currencyCode || '').toUpperCase();
    const operationType = String(req.body?.operationType || '').toUpperCase();
    const amount = Number(req.body?.amount || 0);

    if (!countryCode || !currencyCode || !operationType) {
      res.status(400).json({
        error: 'countryCode, currencyCode, and operationType are required',
      });
      return;
    }

    if (!['COLLECTION', 'PAYOUT', 'REFUND', 'TRANSFER'].includes(operationType)) {
      res.status(400).json({
        error: 'operationType must be one of COLLECTION, PAYOUT, REFUND, TRANSFER',
      });
      return;
    }

    const selector = getPaymentProviderSelector();
    const selectedProvider = await selector.selectProvider({
      countryCode,
      currencyCode,
      operationType: operationType as 'COLLECTION' | 'PAYOUT' | 'REFUND' | 'TRANSFER',
      amount,
    });
    const selectedMeta = selectedProvider.getProviderMeta();

    const alternatives = await selector.getAlternativeProviders(
      {
        countryCode,
        currencyCode,
        operationType: operationType as 'COLLECTION' | 'PAYOUT' | 'REFUND' | 'TRANSFER',
        amount,
      },
      selectedMeta.name
    );

    res.json({
      selected: {
        name: selectedMeta.name,
        countryCode: selectedMeta.countryCode,
        currencyCode: selectedMeta.currencyCode,
      },
      alternatives: alternatives.map((provider) => provider.getProviderMeta()),
    });
  } catch (error) {
    next(error);
  }
});

r.get('/providers/health/:countryCode', async (req, res, next) => {
  try {
    const selector = getPaymentProviderSelector();
    const countryCode = String(req.params.countryCode || '').toUpperCase();
    const health = await selector.getAllProviderHealth(countryCode);
    res.json({ countryCode, health });
  } catch (error) {
    next(error);
  }
});

r.post('/providers/health/test', async (req, res, next) => {
  try {
    const providerName = String(req.body?.providerName || '').toLowerCase();
    const countryCode = String(req.body?.countryCode || '').toUpperCase();
    const success = Boolean(req.body?.success);
    const amount = Number(req.body?.amount || 0);
    const errorCode = req.body?.errorCode ? String(req.body.errorCode) : undefined;

    if (!providerName || !countryCode) {
      res.status(400).json({ error: 'providerName and countryCode are required' });
      return;
    }

    const selector = getPaymentProviderSelector();
    try {
      await selector.recordTransactionResult(providerName, countryCode, success, amount, errorCode);
    } catch (recordError) {
      console.error('[payments] Failed to record provider health test event:', recordError);
    }

    const health = await selector.getProviderHealth(providerName, countryCode);
    res.json({
      message: 'Provider health test recorded',
      providerName,
      countryCode,
      health,
    });
  } catch (error) {
    next(error);
  }
});

export default r;
