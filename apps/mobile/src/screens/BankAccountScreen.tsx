import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { View, Text, FlatList, RefreshControl, ActivityIndicator, Alert, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Card, Button, Input, Pill, SectionHeader } from '../components/ui';
import { api } from '../api/client';
import { theme } from '../theme';

type Country = {
  countryCode: string;
  countryName: string;
  primaryCurrencyCode: string;
  region: string;
};

type PayoutMethod = {
  type: 'BANK_ACCOUNT' | 'MOBILE_MONEY';
  label: string;
  description: string;
  accountNumberLabel: string;
  bankCodeLabel: string;
  bankCodePlaceholder: string;
  accountNumberPlaceholder: string;
  requiresBankCode: boolean;
  supportsBankDirectory: boolean;
};

export default function BankAccountScreen() {
  const [accounts, setAccounts] = useState<any[]>([]);
  const [banks, setBanks] = useState<any[]>([]);
  const [countries, setCountries] = useState<Country[]>([]);
  const [methods, setMethods] = useState<PayoutMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');
  const [adding, setAdding] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form state
  const [selectedCountryCode, setSelectedCountryCode] = useState('NG');
  const [selectedCurrencyCode, setSelectedCurrencyCode] = useState('NGN');
  const [selectedMethodType, setSelectedMethodType] = useState<'BANK_ACCOUNT' | 'MOBILE_MONEY'>('BANK_ACCOUNT');
  const [bankQuery, setBankQuery] = useState('');
  const [bankCode, setBankCode] = useState('');
  const [bankName, setBankName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [makePrimary, setMakePrimary] = useState(true);

  async function load() {
    try {
      const [accountsRes, countriesRes] = await Promise.all([
        api('/api/users/bank-accounts'),
        api('/api/payments/countries'),
      ]);
      setAccounts(Array.isArray(accountsRes) ? accountsRes : (accountsRes.accounts || []));
      const countryRows = Array.isArray(countriesRes?.countries) ? countriesRes.countries : [];
      setCountries(countryRows);
      if (countryRows.length) {
        const defaultCountry = countryRows.find((country: Country) => country.countryCode === selectedCountryCode) || countryRows[0];
        setSelectedCountryCode(defaultCountry.countryCode);
        setSelectedCurrencyCode(defaultCountry.primaryCurrencyCode);
      }
    } catch (e: any) { setError(e.message); }
  }

  async function loadRailOptions(countryCode: string) {
    try {
      const [methodRes, banksRes] = await Promise.all([
        api(`/api/payments/payout-methods/${countryCode}`),
        api(`/api/users/banks?countryCode=${encodeURIComponent(countryCode)}`),
      ]);
      const methodRows = Array.isArray(methodRes?.methods) ? methodRes.methods : [];
      setMethods(methodRows);
      setBanks(Array.isArray(banksRes?.banks) ? banksRes.banks : []);
      if (methodRows.length) {
        setSelectedMethodType(methodRows[0].type);
      }
      if (methodRes?.country?.primaryCurrencyCode) {
        setSelectedCurrencyCode(methodRes.country.primaryCurrencyCode);
      }
    } catch (e: any) {
      setError(e.message || 'Could not load payout rail options');
    }
  }

  const refresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    await loadRailOptions(selectedCountryCode);
    setRefreshing(false);
  }, [selectedCountryCode]);

  useEffect(() => {
    load()
      .then(() => loadRailOptions(selectedCountryCode))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!loading) {
      loadRailOptions(selectedCountryCode).catch(() => {});
    }
  }, [selectedCountryCode]);

  async function addAccount() {
    if (!bankCode.trim() || accountNumber.trim().length < 10) {
      setMsg('Enter a valid bank code and 10-digit account number');
      return;
    }
    setSaving(true);
    setMsg('');
    try {
      await api('/api/users/bank-accounts', {
        method: 'POST',
        body: JSON.stringify({
          countryCode: selectedCountryCode,
          currencyCode: selectedCurrencyCode,
          payoutMethodType: selectedMethodType,
          bankCode: bankCode.trim(),
          bankName: bankName.trim() || undefined,
          accountNumber: accountNumber.trim(),
          makePrimary,
        }),
      });
      setMsg('Bank account added');
      setBankCode('');
      setBankName('');
      setBankQuery('');
      setAccountNumber('');
      setSelectedMethodType(methods[0]?.type || 'BANK_ACCOUNT');
      setAdding(false);
      await load();
    } catch (e: any) { setMsg(e.message); }
    finally { setSaving(false); }
  }

  async function setPrimary(id: string) {
    try {
      await api(`/api/users/bank-accounts/${id}/primary`, { method: 'PATCH' });
      await load();
    } catch (e: any) { setMsg(e.message); }
  }

  const filteredBanks = useMemo(() => {
    const q = bankQuery.trim().toLowerCase();
    return banks
      .filter((bank: any) => {
        if (!q) return true;
        return String(bank?.name || '').toLowerCase().includes(q) || String(bank?.code || '').includes(q);
      })
      .slice(0, 8);
  }, [banks, bankQuery]);

  function chooseBank(bank: any) {
    setBankCode(String(bank.code || '').trim());
    setBankName(String(bank.name || '').trim());
    setBankQuery(String(bank.name || '').trim());
    setMsg('');
  }

  const selectedCountry = countries.find((country) => country.countryCode === selectedCountryCode) || null;
  const selectedMethod = methods.find((method) => method.type === selectedMethodType) || methods[0] || null;

  async function remove(id: string) {
    Alert.alert('Remove Bank Account', 'Are you sure?', [
      { text: 'Cancel' },
      {
        text: 'Remove', style: 'destructive', onPress: async () => {
          try {
            await api(`/api/users/bank-accounts/${id}`, { method: 'DELETE' });
            await load();
          } catch (e: any) { setMsg(e.message); }
        },
      },
    ]);
  }

  if (loading) return <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.colors.background }}><ActivityIndicator color={theme.colors.primary} size="large" /></View>;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background }} edges={['left', 'right', 'top']}>
      <FlatList
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: theme.spacing.lg, paddingBottom: theme.spacing.xl * 2 }}
        ListHeaderComponent={
          <Card style={{ backgroundColor: theme.colors.surfaceAlt }}>
            <SectionHeader title="Bank Accounts" />
            <Text style={{ color: theme.colors.muted, lineHeight: 20 }}>Manage the bank accounts where payouts will be sent.</Text>
            <View style={{ marginTop: 10, flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
              <Pill label={selectedCountry ? `${selectedCountry.countryName} rail` : 'Global rail'} tone="warning" />
              <Pill label="Encrypted storage" tone="success" />
            </View>
            <Text style={{ color: theme.colors.mutedSoft, fontSize: 12, marginTop: 8, lineHeight: 18 }}>
              The backend keeps payout destinations encrypted and selects the payout provider by country and currency.
            </Text>
            {error ? <Text style={{ color: theme.colors.danger, marginTop: 8 }}>{error}</Text> : null}
            {msg ? <Text style={{ color: msg.includes('added') ? theme.colors.primary : theme.colors.danger, marginTop: 8, fontWeight: '700' }}>{msg}</Text> : null}
            {!adding && <Button title="+ Add Bank Account" onPress={() => setAdding(true)} />}
            {adding && (
              <Card>
                <Pill label="Primary payout destination" tone="primary" />
                <Text style={{ color: theme.colors.text, fontWeight: '800', marginTop: 12 }}>Payout country</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
                  {countries.map((country) => (
                    <TouchableOpacity key={country.countryCode} onPress={() => setSelectedCountryCode(country.countryCode)}>
                      <View style={{ borderRadius: 999, borderWidth: 1, borderColor: selectedCountryCode === country.countryCode ? theme.colors.primary : theme.colors.border, backgroundColor: selectedCountryCode === country.countryCode ? '#101814' : theme.colors.surface, paddingHorizontal: 12, paddingVertical: 8 }}>
                        <Text style={{ color: theme.colors.text, fontWeight: '800' }}>{country.countryCode}</Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
                <Text style={{ color: theme.colors.text, fontWeight: '800', marginTop: 16 }}>Payout method</Text>
                <View style={{ gap: 8, marginTop: 8 }}>
                  {methods.map((method) => (
                    <TouchableOpacity key={method.type} onPress={() => setSelectedMethodType(method.type)}>
                      <View style={{ borderRadius: 14, borderWidth: 1, borderColor: selectedMethodType === method.type ? theme.colors.primary : theme.colors.border, backgroundColor: selectedMethodType === method.type ? '#101814' : theme.colors.surface, padding: 12 }}>
                        <Text style={{ color: theme.colors.text, fontWeight: '800' }}>{method.label}</Text>
                        <Text style={{ color: theme.colors.muted, fontSize: 12, marginTop: 4 }}>{method.description}</Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
                {selectedMethod?.supportsBankDirectory ? (
                  <>
                    <Input label="Search bank" placeholder="Type bank name or code" onChangeText={setBankQuery} value={bankQuery} autoCapitalize="none" />
                    <View style={{ marginTop: 8, gap: 8 }}>
                      {filteredBanks.map((bank: any) => (
                        <TouchableOpacity key={String(bank.code)} onPress={() => chooseBank(bank)}>
                          <View style={{ borderRadius: 14, borderWidth: 1, borderColor: bankCode === String(bank.code) ? theme.colors.primary : theme.colors.border, backgroundColor: bankCode === String(bank.code) ? '#101814' : theme.colors.surface, padding: 12 }}>
                            <Text style={{ color: theme.colors.text, fontWeight: '800' }}>{bank.name}</Text>
                            <Text style={{ color: theme.colors.mutedSoft, fontSize: 12, marginTop: 2 }}>Code {bank.code}</Text>
                          </View>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </>
                ) : null}
                {bankCode ? <Pill label={`Selected route: ${bankName || bankCode}`} tone="success" /> : null}
                <Input label={selectedMethod?.bankCodeLabel || 'Bank code'} placeholder={selectedMethod?.bankCodePlaceholder || 'Enter bank code'} onChangeText={setBankCode} value={bankCode} autoCapitalize="none" />
                <Input label={selectedMethod?.accountNumberLabel || 'Account number'} placeholder={selectedMethod?.accountNumberPlaceholder || 'Enter account number'} onChangeText={setAccountNumber} value={accountNumber} autoCapitalize="none" />
                <Text style={{ color: theme.colors.muted, marginBottom: 8 }}>
                  {selectedCountry ? `Provider and currency will be selected automatically for ${selectedCountry.countryName}.` : 'Provider and currency will be selected automatically.'}
                </Text>
                {saving ? <ActivityIndicator color={theme.colors.primary} /> : <Button title="Save Account" onPress={addAccount} />}
                <Text onPress={() => setAdding(false)} style={{ color: theme.colors.mutedSoft, textAlign: 'center', marginTop: 8 }}>Cancel</Text>
              </Card>
            )}
            <Text style={{ fontSize: 18, fontWeight: '800', marginTop: 16, marginBottom: 4, color: theme.colors.text }}>Saved Accounts</Text>
          </Card>
        }
      data={accounts}
      keyExtractor={item => item.id}
      renderItem={({ item }) => (
        <Card>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontWeight: '900', color: theme.colors.text }}>{item.account_name}</Text>
              <Text style={{ color: theme.colors.muted }}>{item.bank_name}</Text>
              <Text style={{ color: theme.colors.mutedSoft, fontSize: 12 }}>{item.country_code} • {item.currency_code} • {item.payout_method_type}</Text>
              {item.is_primary && <Pill label="PRIMARY" tone="success" />}
            </View>
            <View style={{ gap: 6 }}>
              {!item.is_primary && (
                <Text onPress={() => setPrimary(item.id)} style={{ color: theme.colors.primary, fontWeight: '800', fontSize: 13 }}>Set primary</Text>
              )}
              <Text onPress={() => remove(item.id)} style={{ color: theme.colors.danger, fontWeight: '800', fontSize: 13 }}>Remove</Text>
            </View>
          </View>
        </Card>
      )}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={theme.colors.primary} />}
      ListEmptyComponent={<Card><Text style={{ color: theme.colors.muted, textAlign: 'center' }}>No bank accounts yet.</Text></Card>}
      />
    </SafeAreaView>
  );
}
