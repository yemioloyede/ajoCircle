import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, FlatList, RefreshControl, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Card, Pill, SectionHeader } from '../components/ui';
import { api } from '../api/client';
import { theme } from '../theme';

export default function ContributionHistoryScreen() {
  const [items, setItems] = useState<any[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  async function load(cursor?: string) {
    try {
      const q = cursor ? `?before=${cursor}` : '';
      const j = await api(`/api/contributions/mine${q}`);
      if (cursor) {
        setItems(prev => [...prev, ...(j.contributions || [])]);
      } else {
        setItems(j.contributions || []);
      }
      setNextCursor(j.nextCursor || null);
    } catch (e: any) { setError(e.message); }
  }

  const refresh = useCallback(async () => {
    setRefreshing(true);
    setNextCursor(null);
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
            <SectionHeader title="Contributions" />
            <Text style={{ color: theme.colors.muted, lineHeight: 20 }}>Track every contribution, payment reference, and settlement status in one place.</Text>
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
              <Text style={{ fontSize: 11, color: theme.colors.mutedSoft }}>{item.payment_reference}</Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={{ fontWeight: '900', fontSize: 18, color: theme.colors.text }}>₦{(item.amount_kobo / 100).toLocaleString()}</Text>
              <Pill label={item.status} tone={item.status === 'SUCCESS' ? 'success' : item.status === 'FAILED' ? 'danger' : 'warning'} />
            </View>
          </View>
        </Card>
      )}
      ListFooterComponent={nextCursor
        ? <Text onPress={() => load(nextCursor)} style={{ color: theme.colors.primary, fontWeight: '800', textAlign: 'center', padding: 16 }}>Load more</Text>
        : null}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={theme.colors.primary} />}
      ListEmptyComponent={error
        ? <Text style={{ color: theme.colors.danger, textAlign: 'center', marginTop: 20 }}>{error}</Text>
        : <Card><Text style={{ color: theme.colors.muted, textAlign: 'center' }}>No contributions yet.</Text></Card>}
      />
    </SafeAreaView>
  );
}
