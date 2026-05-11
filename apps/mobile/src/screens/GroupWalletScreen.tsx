import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, FlatList, RefreshControl, ActivityIndicator, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api } from '../api/client';
import { theme } from '../theme';

interface Props {
  navigation?: any;
  route?: { params?: { groupId: string; groupName?: string } };
}

export default function GroupWalletScreen({ navigation, route }: Props) {
  const { groupId, groupName } = route?.params || {};
  const [balance, setBalance] = useState<number | null>(null);
  const [entries, setEntries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const j = await api(`/api/groups/${groupId}/ledger`);
      setBalance(j.balanceKobo ?? j.balance_kobo ?? null);
      setEntries(j.entries || []);
    } catch {
      setEntries([]);
    }
  }, [groupId]);

  const refresh = useCallback(async () => {
    setRefreshing(true); await load(); setRefreshing(false);
  }, [load]);

  useEffect(() => { load().finally(() => setLoading(false)); }, [load]);

  const totalIn = entries.filter(e => e.direction === 'CREDIT').reduce((s, e) => s + Number(e.amount_kobo || 0), 0);
  const totalOut = entries.filter(e => e.direction === 'DEBIT').reduce((s, e) => s + Number(e.amount_kobo || 0), 0);

  if (loading) return <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.colors.background }}><ActivityIndicator color={theme.colors.primary} size="large" /></View>;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background }} edges={['left', 'right', 'top']}>
      <FlatList
        data={entries}
        keyExtractor={(_, i) => String(i)}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={theme.colors.primary} />}
        contentContainerStyle={{ paddingHorizontal: 22, paddingBottom: 40 }}
        ListHeaderComponent={
          <>
            <View style={{ flexDirection: 'row', alignItems: 'center', paddingTop: 20, marginBottom: 22, gap: 14 }}>
              <TouchableOpacity onPress={() => navigation?.goBack()}>
                <Text style={{ color: theme.colors.primary, fontSize: 22 }}>←</Text>
              </TouchableOpacity>
              <View>
                <Text style={{ color: theme.colors.text, fontSize: 22, fontWeight: '900' }}>Group Wallet</Text>
                {groupName ? <Text style={{ color: theme.colors.muted, fontSize: 14, marginTop: 2 }}>{groupName}</Text> : null}
              </View>
            </View>

            <View style={{ backgroundColor: theme.colors.primary, borderRadius: 24, padding: 24, marginBottom: 20 }}>
              <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 14, fontWeight: '700' }}>Pooled Balance</Text>
              <Text style={{ color: theme.colors.white, fontSize: 36, fontWeight: '900', marginTop: 6 }}>
                ₦{balance != null ? (balance / 100).toLocaleString() : '--'}
              </Text>
              <View style={{ flexDirection: 'row', gap: 24, marginTop: 18 }}>
                <View>
                  <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13 }}>Total In</Text>
                  <Text style={{ color: theme.colors.white, fontWeight: '900', fontSize: 16, marginTop: 2 }}>+₦{(totalIn / 100).toLocaleString()}</Text>
                </View>
                <View>
                  <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13 }}>Total Out</Text>
                  <Text style={{ color: theme.colors.white, fontWeight: '900', fontSize: 16, marginTop: 2 }}>-₦{(totalOut / 100).toLocaleString()}</Text>
                </View>
              </View>
            </View>
            <Text style={{ color: theme.colors.text, fontSize: 18, fontWeight: '900', marginBottom: 14 }}>Ledger</Text>
          </>
        }
        ListEmptyComponent={<Text style={{ color: theme.colors.muted, textAlign: 'center', marginTop: 24, fontSize: 15 }}>No transactions yet.</Text>}
        renderItem={({ item }) => (
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12, backgroundColor: theme.colors.surface, borderRadius: 16, padding: 14, borderWidth: 1, borderColor: theme.colors.border }}>
            <View style={{ width: 42, height: 42, borderRadius: 21, backgroundColor: item.direction === 'CREDIT' ? '#1C2B1E' : '#2A1A1E', alignItems: 'center', justifyContent: 'center', marginRight: 14 }}>
              <Text style={{ fontSize: 18 }}>{item.direction === 'CREDIT' ? '⬆️' : '⬇️'}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: theme.colors.text, fontSize: 14, fontWeight: '800' }}>{item.description || (item.direction === 'CREDIT' ? 'Contribution received' : 'Payout sent')}</Text>
              <Text style={{ color: theme.colors.muted, fontSize: 13, marginTop: 3 }}>{item.created_at ? new Date(item.created_at).toLocaleDateString() : ''}</Text>
            </View>
            <Text style={{ color: item.direction === 'CREDIT' ? theme.colors.primary : theme.colors.danger, fontWeight: '900', fontSize: 15 }}>
              {item.direction === 'CREDIT' ? '+' : '-'}₦{(Number(item.amount_kobo || 0) / 100).toLocaleString()}
            </Text>
          </View>
        )}
      />
    </SafeAreaView>
  );
}
