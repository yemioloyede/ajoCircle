import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { View, Text, FlatList, RefreshControl, ActivityIndicator, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Button } from '../components/ui';
import { api } from '../api/client';
import { theme } from '../theme';

interface Props {
  navigation: any;
}

export default function WalletScreen({ navigation }: Props) {
  const [balance, setBalance] = useState<number | null>(null);
  const [entries, setEntries] = useState<any[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  async function load(cursor?: string) {
    try {
      const q = cursor ? `?before=${cursor}` : '';
      const j = await api(`/api/ledger/me${q}`);
      setBalance(j.balanceKobo ?? j.balance_kobo ?? null);
      if (cursor) {
        setEntries(prev => [...prev, ...(j.entries || [])]);
      } else {
        setEntries(j.entries || []);
      }
      setNextCursor(j.nextCursor || null);
    } catch (e: any) {
      setError(e.message);
    }
  }

  const refresh = useCallback(async () => {
    setRefreshing(true);
    setNextCursor(null);
    await load();
    setRefreshing(false);
  }, []);

  useEffect(() => {
    load().finally(() => setLoading(false));
  }, []);

  const inflowKobo = useMemo(() => entries.filter(item => item.direction === 'CREDIT').reduce((sum, item) => sum + Number(item.amount_kobo || 0), 0), [entries]);
  const outflowKobo = useMemo(() => entries.filter(item => item.direction === 'DEBIT').reduce((sum, item) => sum + Number(item.amount_kobo || 0), 0), [entries]);

  if (loading) return <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.colors.background }}><ActivityIndicator color={theme.colors.primary} size="large" /></View>;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background }} edges={['left', 'right', 'top']}>
      <FlatList
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 44 }}
        ListHeaderComponent={
          <>
            <View style={{ height: 86, borderBottomWidth: 1, borderBottomColor: theme.colors.border, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <TouchableOpacity onPress={() => navigation.canGoBack() ? navigation.goBack() : navigation.navigate('WalletMain')}>
                <Ionicons name="chevron-back" size={24} color={theme.colors.text} />
              </TouchableOpacity>
              <Text style={{ color: theme.colors.text, fontSize: 18, fontWeight: '800' }}>Wallet & Ledger</Text>
              <TouchableOpacity onPress={() => navigation.navigate('ContributionHistory')}>
                <Ionicons name="information-circle-outline" size={22} color={theme.colors.text} />
              </TouchableOpacity>
            </View>

            <View style={{ marginTop: 16, borderRadius: 24, backgroundColor: theme.colors.primary, padding: 20 }}>
              <Text style={{ color: theme.colors.text, fontSize: 14, fontWeight: '700' }}>Total Balance</Text>
              <Text style={{ marginTop: 8, color: theme.colors.white, fontSize: 22, fontWeight: '900' }}>N{balance != null ? (balance / 100).toLocaleString() : '--'}.00</Text>
              <View style={{ marginTop: 16, flexDirection: 'row', gap: 12 }}>
                <TouchableOpacity onPress={() => navigation.navigate('ContributionHistory')} style={{ flex: 1, height: 52, borderRadius: 12, backgroundColor: theme.colors.secondary, alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ color: '#1C2431', fontSize: 14, fontWeight: '800' }}>+ Add Funds</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => navigation.navigate('PayoutHistory')} style={{ flex: 1, height: 52, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.55)', alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ color: theme.colors.white, fontSize: 14, fontWeight: '800' }}>View Payouts</Text>
                </TouchableOpacity>
              </View>
              <TouchableOpacity
                onPress={() => navigation.navigate('Payments')}
                style={{ marginTop: 12, height: 48, borderRadius: 12, backgroundColor: '#0E1215', alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ color: theme.colors.white, fontSize: 14, fontWeight: '800' }}>Open Payments Hub</Text>
              </TouchableOpacity>
            </View>

            <View style={{ flexDirection: 'row', gap: 12, marginTop: 14 }}>
              <MiniCard title="Inflow" value={`N${Math.round(inflowKobo / 1000)}k`} tone="up" />
              <MiniCard title="Outflow" value={`N${Math.round(outflowKobo / 1000)}k`} tone="down" />
            </View>

            <View style={{ marginTop: 18, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={{ color: theme.colors.text, fontSize: 18, fontWeight: '900' }}>Recent Activity</Text>
              <TouchableOpacity onPress={refresh}>
                <Text style={{ color: theme.colors.primary, fontSize: 13, fontWeight: '800' }}>Refresh</Text>
              </TouchableOpacity>
            </View>

            {error ? <Text style={{ color: theme.colors.danger, marginBottom: 8, fontWeight: '700' }}>{error}</Text> : null}
          </>
        }
        data={entries}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <View style={{ marginTop: 12, borderRadius: 20, borderWidth: 1, borderColor: theme.colors.border, backgroundColor: theme.colors.surface, padding: 16 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View style={{ width: 62, height: 62, borderRadius: 31, backgroundColor: item.direction === 'CREDIT' ? '#1E2A1F' : '#2A1D24', alignItems: 'center', justifyContent: 'center' }}>
                <MaterialCommunityIcons
                  name={item.direction === 'CREDIT' ? 'arrow-down-left' : 'arrow-up-right'}
                  size={24}
                  color={item.direction === 'CREDIT' ? theme.colors.primary : theme.colors.danger}
                />
              </View>
              <View style={{ marginLeft: 12, flex: 1 }}>
                <Text style={{ color: theme.colors.text, fontSize: 15, fontWeight: '800' }}>{item.type || item.entry_type}</Text>
                <Text style={{ color: theme.colors.muted, fontSize: 13 }}>{new Date(item.created_at).toLocaleString()}</Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={{ color: item.direction === 'CREDIT' ? theme.colors.primary : theme.colors.danger, fontSize: 14, fontWeight: '800' }}>
                  {item.direction === 'CREDIT' ? '+' : '-'}N{(Number(item.amount_kobo || 0) / 100).toLocaleString()}
                </Text>
                <Text style={{ color: theme.colors.muted, fontSize: 12 }}>{item.status || 'Completed'}</Text>
              </View>
            </View>
          </View>
        )}
        ListFooterComponent={
          <>
            {nextCursor ? (
              <Button title="Load more" onPress={() => load(nextCursor)} variant="outline" />
            ) : null}
            <View style={{ marginTop: 16, borderWidth: 1, borderColor: theme.colors.border, borderRadius: 18, backgroundColor: theme.colors.surface, padding: 16 }}>
              <Text style={{ color: theme.colors.muted, fontSize: 13, lineHeight: 18 }}>Your transactions are secured with bank-grade encryption and verified via Paystack.</Text>
            </View>
          </>
        }
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={theme.colors.primary} />}
        ListEmptyComponent={<Text style={{ color: theme.colors.muted, textAlign: 'center', marginTop: 20 }}>No transactions yet.</Text>}
      />
    </SafeAreaView>
  );
}

function MiniCard({ title, value, tone }: { title: string; value: string; tone: 'up' | 'down' }) {
  return (
    <View style={{ flex: 1, borderRadius: 18, borderWidth: 1, borderColor: theme.colors.border, backgroundColor: theme.colors.surface, padding: 14 }}>
      <Text style={{ color: theme.colors.muted, fontSize: 13, fontWeight: '700' }}>{title}</Text>
      <Text style={{ color: theme.colors.text, fontSize: 18, fontWeight: '900', marginTop: 4 }}>{value}</Text>
      <MaterialCommunityIcons
        name={tone === 'up' ? 'trending-up' : 'trending-down'}
        size={18}
        color={tone === 'up' ? theme.colors.primary : theme.colors.danger}
      />
    </View>
  );
}
