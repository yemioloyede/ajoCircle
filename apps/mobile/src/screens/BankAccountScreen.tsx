import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, FlatList, RefreshControl, ActivityIndicator, Alert } from 'react-native';
import { Card, Button, Input } from '../components/ui';
import { api } from '../api/client';

export default function BankAccountScreen() {
  const [accounts, setAccounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');
  const [adding, setAdding] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form state
  const [bankCode, setBankCode] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [makePrimary, setMakePrimary] = useState(true);

  async function load() {
    try {
      const j = await api('/api/users/bank-accounts');
      setAccounts(j.accounts || []);
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
        body: JSON.stringify({ bankCode: bankCode.trim(), accountNumber: accountNumber.trim(), makePrimary }),
      });
      setMsg('Bank account added');
      setBankCode('');
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

  if (loading) return <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}><ActivityIndicator color="#0B6B45" size="large" /></View>;

  return (
    <FlatList
      style={{ flex: 1, backgroundColor: '#F2F7F4', padding: 18 }}
      ListHeaderComponent={
        <>
          <Text style={{ fontSize: 26, fontWeight: '900', color: '#082017', marginBottom: 4 }}>Bank Accounts</Text>
          {error ? <Text style={{ color: 'red', marginBottom: 8 }}>{error}</Text> : null}
          {msg ? <Text style={{ color: msg.includes('added') ? '#0b6b45' : 'red', marginBottom: 8, fontWeight: '700' }}>{msg}</Text> : null}
          {!adding && <Button title="+ Add Bank Account" onPress={() => setAdding(true)} />}
          {adding && (
            <Card>
              <Text style={{ fontWeight: '800', marginBottom: 8 }}>Add Bank Account</Text>
              <Input placeholder="Bank code (e.g. 057 for Zenith)" onChangeText={setBankCode} value={bankCode} keyboardType="number-pad" />
              <Input placeholder="Account number (10 digits)" onChangeText={setAccountNumber} value={accountNumber} keyboardType="number-pad" maxLength={10} />
              <Text style={{ color: '#52655c', marginBottom: 8 }}>We'll resolve your account name via Paystack.</Text>
              {saving
                ? <ActivityIndicator color="#0B6B45" />
                : <Button title="Save Account" onPress={addAccount} />}
              <Text onPress={() => setAdding(false)} style={{ color: '#888', textAlign: 'center', marginTop: 8 }}>Cancel</Text>
            </Card>
          )}
          <Text style={{ fontSize: 18, fontWeight: '800', marginTop: 16, marginBottom: 4 }}>Saved Accounts</Text>
        </>
      }
      data={accounts}
      keyExtractor={item => item.id}
      renderItem={({ item }) => (
        <Card>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontWeight: '800' }}>{item.account_name}</Text>
              <Text style={{ color: '#52655c' }}>{item.bank_name}</Text>
              {item.is_primary && <Text style={{ color: '#0b6b45', fontWeight: '700', fontSize: 12, marginTop: 2 }}>PRIMARY</Text>}
            </View>
            <View style={{ gap: 6 }}>
              {!item.is_primary && (
                <Text onPress={() => setPrimary(item.id)} style={{ color: '#0B6B45', fontWeight: '700', fontSize: 13 }}>Set primary</Text>
              )}
              <Text onPress={() => remove(item.id)} style={{ color: '#c62828', fontWeight: '700', fontSize: 13 }}>Remove</Text>
            </View>
          </View>
        </Card>
      )}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor="#0B6B45" />}
      ListEmptyComponent={<Text style={{ color: '#888', textAlign: 'center', marginTop: 20 }}>No bank accounts yet.</Text>}
    />
  );
}
