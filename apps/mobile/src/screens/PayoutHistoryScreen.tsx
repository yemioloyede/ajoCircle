import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, FlatList, RefreshControl, ActivityIndicator } from 'react-native';
import { Card } from '../components/ui';
import { api } from '../api/client';

const STATUS_COLORS: Record<string, string> = {
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

  if (loading) return <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}><ActivityIndicator color="#0B6B45" size="large" /></View>;

  return (
    <FlatList
      style={{ flex: 1, backgroundColor: '#F2F7F4', padding: 18 }}
      ListHeaderComponent={<Text style={{ fontSize: 26, fontWeight: '900', color: '#082017', marginBottom: 12 }}>My Payouts</Text>}
      data={items}
      keyExtractor={item => item.id}
      renderItem={({ item }) => (
        <Card>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <View>
              <Text style={{ fontWeight: '700' }}>{item.group_name || 'Group'}</Text>
              <Text style={{ color: '#888', fontSize: 12 }}>{new Date(item.created_at).toLocaleDateString()}</Text>
              {item.transfer_code ? <Text style={{ fontSize: 11, color: '#52655c' }}>{item.transfer_code}</Text> : null}
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={{ fontWeight: '800', fontSize: 18, color: '#082017' }}>₦{(item.amount_kobo / 100).toLocaleString()}</Text>
              <Text style={{ fontSize: 12, color: STATUS_COLORS[item.status] || '#888', fontWeight: '700' }}>{item.status}</Text>
            </View>
          </View>
        </Card>
      )}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor="#0B6B45" />}
      ListEmptyComponent={error
        ? <Text style={{ color: 'red', textAlign: 'center', marginTop: 20 }}>{error}</Text>
        : <Text style={{ color: '#888', textAlign: 'center', marginTop: 20 }}>No payouts yet.</Text>}
    />
  );
}
