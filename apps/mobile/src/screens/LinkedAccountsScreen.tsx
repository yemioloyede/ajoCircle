import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, ActivityIndicator, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api } from '../api/client';
import { theme } from '../theme';

interface Props { navigation?: any; }
interface BankAccount { id: string; bank_name: string; account_number: string; account_name: string; is_default?: boolean; is_verified?: boolean; }

export default function LinkedAccountsScreen({ navigation }: Props) {
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [removing, setRemoving] = useState<string | null>(null);

  const load = async () => {
    try {
      const res = await api('/api/banking/accounts');
      setAccounts(res.accounts || []);
    } catch {
      setAccounts([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const removeAccount = (acc: BankAccount) => {
    Alert.alert('Remove account?', `Remove ${acc.bank_name} **** ${acc.account_number.slice(-4)}?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: async () => {
        setRemoving(acc.id);
        try {
          await api(`/api/banking/accounts/${acc.id}`, { method: 'DELETE' });
          setAccounts(prev => prev.filter(a => a.id !== acc.id));
        } catch (e: any) {
          Alert.alert('Error', e.message || 'Could not remove account.');
        } finally {
          setRemoving(null);
        }
      }},
    ]);
  };

  const setDefault = async (id: string) => {
    try {
      await api(`/api/banking/accounts/${id}/default`, { method: 'PATCH' });
      setAccounts(prev => prev.map(a => ({ ...a, is_default: a.id === id })));
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Could not update default.');
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background }} edges={['left', 'right', 'top']}>
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingTop: 20, paddingHorizontal: 24, marginBottom: 22, gap: 14 }}>
        <TouchableOpacity onPress={() => navigation?.goBack()}>
          <Text style={{ color: theme.colors.primary, fontSize: 22 }}>←</Text>
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={{ color: theme.colors.text, fontSize: 22, fontWeight: '900' }}>Linked Accounts</Text>
          <Text style={{ color: theme.colors.muted, fontSize: 13 }}>Bank accounts for payouts</Text>
        </View>
        <TouchableOpacity onPress={() => navigation?.navigate('BankAccount', { onComplete: load })}
          style={{ backgroundColor: theme.colors.primary, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12 }}>
          <Text style={{ color: '#fff', fontWeight: '800', fontSize: 14 }}>+ Add</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator color={theme.colors.primary} style={{ flex: 1 }} />
      ) : (
        <FlatList
          data={accounts}
          keyExtractor={a => a.id}
          contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 40 }}
          ListEmptyComponent={
            <View style={{ alignItems: 'center', paddingTop: 60 }}>
              <Text style={{ fontSize: 56, marginBottom: 16 }}>🏦</Text>
              <Text style={{ color: theme.colors.text, fontSize: 18, fontWeight: '800' }}>No accounts linked</Text>
              <Text style={{ color: theme.colors.muted, textAlign: 'center', fontSize: 14, marginTop: 8 }}>Add a bank account to receive payouts from your circles.</Text>
              <TouchableOpacity onPress={() => navigation?.navigate('BankAccount', { onComplete: load })}
                style={{ marginTop: 24, height: 54, paddingHorizontal: 32, borderRadius: 16, backgroundColor: theme.colors.primary, alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ color: '#fff', fontWeight: '800', fontSize: 16 }}>Add Bank Account</Text>
              </TouchableOpacity>
            </View>
          }
          renderItem={({ item }) => (
            <View style={{ backgroundColor: theme.colors.surface, borderRadius: 20, borderWidth: item.is_default ? 2 : 1, borderColor: item.is_default ? theme.colors.primary : theme.colors.border, padding: 18, marginBottom: 12 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
                <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: theme.colors.background, alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ fontSize: 24 }}>🏦</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Text style={{ color: theme.colors.text, fontWeight: '800', fontSize: 15 }}>{item.bank_name}</Text>
                    {item.is_default && <View style={{ backgroundColor: theme.colors.primary, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 }}><Text style={{ color: '#fff', fontSize: 11, fontWeight: '800' }}>DEFAULT</Text></View>}
                    {item.is_verified && <Text style={{ fontSize: 14 }}>✅</Text>}
                  </View>
                  <Text style={{ color: theme.colors.muted, fontSize: 13 }}>**** {item.account_number.slice(-4)}</Text>
                  <Text style={{ color: theme.colors.muted, fontSize: 13 }}>{item.account_name}</Text>
                </View>
                {removing === item.id && <ActivityIndicator color={theme.colors.muted} size="small" />}
              </View>
              <View style={{ flexDirection: 'row', gap: 10, marginTop: 14 }}>
                {!item.is_default && (
                  <TouchableOpacity onPress={() => setDefault(item.id)} style={{ flex: 1, height: 40, borderRadius: 12, borderWidth: 1, borderColor: theme.colors.primary, alignItems: 'center', justifyContent: 'center' }}>
                    <Text style={{ color: theme.colors.primary, fontWeight: '700', fontSize: 13 }}>Set as default</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity onPress={() => removeAccount(item)} style={{ flex: 1, height: 40, borderRadius: 12, borderWidth: 1, borderColor: theme.colors.danger, alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ color: theme.colors.danger, fontWeight: '700', fontSize: 13 }}>Remove</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        />
      )}
    </SafeAreaView>
  );
}
