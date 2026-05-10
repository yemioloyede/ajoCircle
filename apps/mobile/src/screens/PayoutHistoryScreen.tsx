import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, FlatList, RefreshControl, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Card, Pill, SectionHeader } from '../components/ui';
import { api } from '../api/client';
import { theme } from '../theme';

const STATUS_COLORS: Record<string, string> = {
  PENDING_REVIEW: '#e65100',
  APPROVED: '#1565c0',
  PAID: '#0b6b45',
  FAILED: '#c62828',
  PROCESSING: '#1565c0',
  PENDING: '#e65100',
};

export default function PayoutHistoryScreen() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  async function load() {
    try {
      const j = await api('/api/payouts/mine');
      setItems(j.payouts || []);
    } catch (e: any) { setError(e.message); }
  }

  const refresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, []);

  useEffect(() => { load().finally(() => setLoading(false)); }, []);

  if (loading) return <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.colors.background }}><ActivityIndicator color={theme.colors.primary} size="large" /></View>;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background }} edges={['left', 'right', 'top']}>
      <FlatList
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: theme.spacing.lg, paddingBottom: theme.spacing.xl * 2 }}
        ListHeaderComponent={
          <Card style={{ backgroundColor: theme.colors.surfaceAlt }}>
            <SectionHeader title="My Payouts" />
            <Text style={{ color: theme.colors.muted, lineHeight: 20 }}>Review payout history, transfer references, and approval status.</Text>
          </Card>
        }
      data={items}
      keyExtractor={item => item.id}
      renderItem={({ item }) => (
        <Card>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <View>
              <Text style={{ fontWeight: '800', color: theme.colors.text }}>{item.group_name || 'Group'}</Text>
              <Text style={{ color: theme.colors.muted, fontSize: 12 }}>{new Date(item.created_at).toLocaleDateString()}</Text>
              {item.transfer_code ? <Text style={{ fontSize: 11, color: theme.colors.mutedSoft }}>{item.transfer_code}</Text> : null}
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={{ fontWeight: '900', fontSize: 18, color: theme.colors.text }}>₦{(item.amount_kobo / 100).toLocaleString()}</Text>
              <Pill label={item.status} tone={item.status === 'PAID' ? 'success' : item.status === 'FAILED' ? 'danger' : 'warning'} />
            </View>
          </View>
        </Card>
      )}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={theme.colors.primary} />}
      ListEmptyComponent={error
        ? <Text style={{ color: theme.colors.danger, textAlign: 'center', marginTop: 20 }}>{error}</Text>
        : <Card><Text style={{ color: theme.colors.muted, textAlign: 'center' }}>No payouts yet.</Text></Card>}
      />
    </SafeAreaView>
  );
}
