import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { View, Text, FlatList, RefreshControl, ActivityIndicator, Alert, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Card, Button, Input, Pill, SectionHeader } from '../components/ui';
import { api } from '../api/client';
import { theme } from '../theme';

export default function BankAccountScreen() {
  const [accounts, setAccounts] = useState<any[]>([]);
  const [banks, setBanks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');
  const [adding, setAdding] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form state
  const [bankQuery, setBankQuery] = useState('');
  const [bankCode, setBankCode] = useState('');
  const [bankName, setBankName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [makePrimary, setMakePrimary] = useState(true);

  async function load() {
    try {
      const [accountsRes, banksRes] = await Promise.all([
        api('/api/users/bank-accounts'),
        api('/api/users/banks'),
      ]);
      setAccounts(Array.isArray(accountsRes) ? accountsRes : (accountsRes.accounts || []));
      setBanks(Array.isArray(banksRes?.banks) ? banksRes.banks : []);
    } catch (e: any) { setError(e.message); }
  }

  const refresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, []);

  useEffect(() => { load().finally(() => setLoading(false)); }, []);

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
              <Pill label="Nigeria payout rail" tone="warning" />
              <Pill label="Encrypted storage" tone="success" />
            </View>
            <Text style={{ color: theme.colors.mutedSoft, fontSize: 12, marginTop: 8, lineHeight: 18 }}>
              This release supports Nigerian bank settlements. The backend keeps account numbers encrypted and resolves the account name before saving.
            </Text>
            {error ? <Text style={{ color: theme.colors.danger, marginTop: 8 }}>{error}</Text> : null}
            {msg ? <Text style={{ color: msg.includes('added') ? theme.colors.primary : theme.colors.danger, marginTop: 8, fontWeight: '700' }}>{msg}</Text> : null}
            {!adding && <Button title="+ Add Bank Account" onPress={() => setAdding(true)} />}
            {adding && (
              <Card>
                <Pill label="Primary payout destination" tone="primary" />
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
                {bankCode ? <Pill label={`Selected bank: ${bankName || bankCode}`} tone="success" /> : null}
                <Input label="Bank code" placeholder="e.g. 057 for Zenith" onChangeText={setBankCode} value={bankCode} keyboardType="number-pad" />
                <Input label="Account number" placeholder="10 digits" onChangeText={setAccountNumber} value={accountNumber} keyboardType="number-pad" maxLength={10} />
                <Text style={{ color: theme.colors.muted, marginBottom: 8 }}>We'll resolve your account name via Paystack before saving.</Text>
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
