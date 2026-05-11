import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, ActivityIndicator, TouchableOpacity, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api } from '../api/client';
import { theme } from '../theme';

interface Props { navigation?: any; }
interface Payout { id: string; amount_kobo: number; status: 'PENDING' | 'APPROVED' | 'FAILED' | 'COMPLETED'; group_name?: string; bank_name?: string; created_at: string; }

const STATUS_META: Record<string, { emoji: string; color: string; label: string }> = {
  PENDING:   { emoji: '⏳', color: '#C28745', label: 'Pending' },
  APPROVED:  { emoji: '✅', color: '#739A63', label: 'Approved' },
  FAILED:    { emoji: '❌', color: '#CD6B80', label: 'Failed' },
  COMPLETED: { emoji: '💸', color: '#739A63', label: 'Completed' },
};

export default function PayoutStatusScreen({ navigation }: Props) {
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = async (isRefresh = false) => {
    isRefresh ? setRefreshing(true) : setLoading(true);
    try {
      const res = await api('/api/payouts/my');
      setPayouts(res.payouts || []);
    } catch {
      setPayouts([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { load(); }, []);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background }} edges={['left', 'right', 'top']}>
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingTop: 20, paddingHorizontal: 24, marginBottom: 22, gap: 14 }}>
        <TouchableOpacity onPress={() => navigation?.goBack()}>
          <Text style={{ color: theme.colors.primary, fontSize: 22 }}>←</Text>
        </TouchableOpacity>
        <Text style={{ color: theme.colors.text, fontSize: 22, fontWeight: '900' }}>Payout Requests</Text>
      </View>

      {loading ? (
        <ActivityIndicator color={theme.colors.primary} style={{ flex: 1 }} />
      ) : (
        <FlatList
          data={payouts}
          keyExtractor={i => i.id}
          contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 40 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={theme.colors.primary} />}
          ListEmptyComponent={
            <View style={{ alignItems: 'center', marginTop: 60 }}>
              <Text style={{ fontSize: 48, marginBottom: 16 }}>💸</Text>
              <Text style={{ color: theme.colors.text, fontSize: 18, fontWeight: '800' }}>No payout requests</Text>
              <Text style={{ color: theme.colors.muted, textAlign: 'center', fontSize: 14, marginTop: 8 }}>When you request a withdrawal, it will appear here.</Text>
              <TouchableOpacity onPress={() => navigation?.navigate('WithdrawFunds')}
                style={{ marginTop: 24, height: 54, paddingHorizontal: 32, borderRadius: 16, backgroundColor: theme.colors.primary, alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ color: '#fff', fontWeight: '800', fontSize: 16 }}>Request Payout</Text>
              </TouchableOpacity>
            </View>
          }
          renderItem={({ item }) => {
            const meta = STATUS_META[item.status] || { emoji: '❓', color: theme.colors.muted, label: item.status };
            return (
              <View style={{ backgroundColor: theme.colors.surface, borderRadius: 20, borderWidth: 1, borderColor: theme.colors.border, padding: 18, marginBottom: 12 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                    <Text style={{ fontSize: 28 }}>{meta.emoji}</Text>
                    <View>
                      <Text style={{ color: theme.colors.text, fontWeight: '800', fontSize: 16 }}>₦{(item.amount_kobo / 100).toLocaleString()}</Text>
                      <Text style={{ color: theme.colors.muted, fontSize: 13 }}>{item.bank_name || 'Bank account'} · {item.group_name || 'Personal'}</Text>
                    </View>
                  </View>
                  <View style={{ paddingHorizontal: 12, paddingVertical: 5, borderRadius: 10, backgroundColor: theme.colors.background, borderWidth: 1, borderColor: meta.color }}>
                    <Text style={{ color: meta.color, fontWeight: '800', fontSize: 12 }}>{meta.label}</Text>
                  </View>
                </View>
                <Text style={{ color: theme.colors.muted, fontSize: 12, marginTop: 10 }}>{new Date(item.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</Text>
              </View>
            );
          }}
        />
      )}
    </SafeAreaView>
  );
}
