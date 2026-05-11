import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api } from '../api/client';
import { theme } from '../theme';

interface Props {
  navigation?: any;
  route?: { params?: { groupId?: string } };
}

interface BankAccount { id: string; bank_name: string; account_number: string; account_name: string; is_default?: boolean; }

export default function WithdrawFundsScreen({ navigation, route }: Props) {
  const groupId = route?.params?.groupId;
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await api('/api/banking/accounts');
        setAccounts(res.accounts || []);
        const def = (res.accounts || []).find((a: BankAccount) => a.is_default);
        if (def) setSelected(def.id);
      } catch {
        setAccounts([]);
      } finally {
        setFetching(false);
      }
    })();
  }, []);

  const fee = Math.round(Number(amount || 0) * 0.015);
  const total = Number(amount || 0) + fee;

  const handleWithdraw = async () => {
    if (!selected) { Alert.alert('Select account', 'Please choose a bank account to withdraw to.'); return; }
    const kobo = Number(amount) * 100;
    if (kobo < 10000) { Alert.alert('Minimum', 'Minimum withdrawal is ₦100.'); return; }
    setLoading(true);
    try {
      await api('/api/payouts', { method: 'POST', body: JSON.stringify({ bank_account_id: selected, amount_kobo: kobo, group_id: groupId }) });
      navigation?.navigate('PayoutStatus');
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Withdrawal request failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background }} edges={['left', 'right', 'top']}>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 40 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', paddingTop: 20, marginBottom: 28, gap: 14 }}>
          <TouchableOpacity onPress={() => navigation?.goBack()}>
            <Text style={{ color: theme.colors.primary, fontSize: 22 }}>←</Text>
          </TouchableOpacity>
          <Text style={{ color: theme.colors.text, fontSize: 22, fontWeight: '900' }}>Withdraw Funds</Text>
        </View>

        <Text style={{ color: theme.colors.muted, fontSize: 13, fontWeight: '700', marginBottom: 8, letterSpacing: 1, textTransform: 'uppercase' }}>Amount (₦)</Text>
        <View style={{ backgroundColor: theme.colors.surface, borderRadius: 18, borderWidth: 1, borderColor: theme.colors.border, paddingHorizontal: 18, height: 64, justifyContent: 'center', marginBottom: 24 }}>
          <TextInput
            value={amount}
            onChangeText={v => setAmount(v.replace(/[^0-9]/g, ''))}
            keyboardType="numeric"
            placeholder="0"
            placeholderTextColor={theme.colors.muted}
            style={{ color: theme.colors.text, fontSize: 26, fontWeight: '900' }}
          />
        </View>

        <Text style={{ color: theme.colors.muted, fontSize: 13, fontWeight: '700', marginBottom: 12, letterSpacing: 1, textTransform: 'uppercase' }}>Withdraw To</Text>
        {fetching ? <ActivityIndicator color={theme.colors.primary} style={{ marginBottom: 24 }} /> :
          accounts.length === 0 ? (
            <TouchableOpacity onPress={() => navigation?.navigate('BankAccount')}
              style={{ backgroundColor: theme.colors.surface, borderRadius: 18, borderWidth: 1, borderColor: theme.colors.border, borderStyle: 'dashed', padding: 20, alignItems: 'center', marginBottom: 24 }}>
              <Text style={{ fontSize: 28 }}>➕</Text>
              <Text style={{ color: theme.colors.primary, fontSize: 15, fontWeight: '700', marginTop: 8 }}>Add a bank account</Text>
            </TouchableOpacity>
          ) : (
            <View style={{ gap: 10, marginBottom: 24 }}>
              {accounts.map(acc => (
                <TouchableOpacity key={acc.id} onPress={() => setSelected(acc.id)}
                  style={{ backgroundColor: theme.colors.surface, borderRadius: 18, borderWidth: 2, borderColor: selected === acc.id ? theme.colors.primary : theme.colors.border, padding: 16, flexDirection: 'row', alignItems: 'center' }}>
                  <View style={{ width: 42, height: 42, borderRadius: 21, backgroundColor: theme.colors.background, alignItems: 'center', justifyContent: 'center', marginRight: 14 }}>
                    <Text style={{ fontSize: 22 }}>🏦</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: theme.colors.text, fontWeight: '800', fontSize: 15 }}>{acc.bank_name}</Text>
                    <Text style={{ color: theme.colors.muted, fontSize: 13 }}>**** {acc.account_number.slice(-4)} · {acc.account_name}</Text>
                  </View>
                  {selected === acc.id && <Text style={{ color: theme.colors.primary, fontWeight: '900', fontSize: 18 }}>✓</Text>}
                </TouchableOpacity>
              ))}
              <TouchableOpacity onPress={() => navigation?.navigate('BankAccount')} style={{ padding: 10, alignItems: 'center' }}>
                <Text style={{ color: theme.colors.primary, fontWeight: '700', fontSize: 14 }}>+ Add another account</Text>
              </TouchableOpacity>
            </View>
          )}

        {Number(amount) > 0 && (
          <View style={{ backgroundColor: theme.colors.surface, borderRadius: 18, borderWidth: 1, borderColor: theme.colors.border, padding: 18, marginBottom: 24 }}>
            <Text style={{ color: theme.colors.muted, fontWeight: '700', marginBottom: 12, letterSpacing: 1, textTransform: 'uppercase', fontSize: 12 }}>Fee Breakdown</Text>
            {[
              { label: 'Withdrawal Amount', value: `₦${Number(amount).toLocaleString()}` },
              { label: 'Processing Fee (1.5%)', value: `₦${fee.toLocaleString()}` },
              { label: 'Total Deducted', value: `₦${total.toLocaleString()}`, bold: true },
            ].map(row => (
              <View key={row.label} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 }}>
                <Text style={{ color: theme.colors.muted, fontSize: 14 }}>{row.label}</Text>
                <Text style={{ color: row.bold ? theme.colors.primary : theme.colors.text, fontSize: 14, fontWeight: row.bold ? '900' : '700' }}>{row.value}</Text>
              </View>
            ))}
          </View>
        )}

        <TouchableOpacity onPress={handleWithdraw} disabled={loading || !amount}
          style={{ height: 62, borderRadius: 20, backgroundColor: amount && !loading ? theme.colors.primary : theme.colors.surface, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: theme.colors.border }}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={{ color: amount ? '#fff' : theme.colors.muted, fontSize: 18, fontWeight: '900' }}>Request Withdrawal</Text>}
        </TouchableOpacity>
        <Text style={{ color: theme.colors.muted, fontSize: 13, textAlign: 'center', marginTop: 12 }}>Withdrawals are processed within 24 hours on business days.</Text>
      </ScrollView>
    </SafeAreaView>
  );
}
