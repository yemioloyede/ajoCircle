import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, FlatList, RefreshControl, ActivityIndicator } from 'react-native';
import { Card } from '../components/ui';
import { api } from '../api/client';

const T = {
  CREDIT: '#0b6b45',
  DEBIT: '#c62828',
};

export default function WalletScreen() {
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

  if (loading) return <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}><ActivityIndicator color="#0B6B45" size="large" /></View>;

  return (
    <FlatList
      style={{ flex: 1, backgroundColor: '#F2F7F4', padding: 18 }}
      ListHeaderComponent={
        <>
          <Text style={{ fontSize: 26, fontWeight: '900', color: '#082017', marginBottom: 4 }}>Wallet</Text>
          {error ? <Text style={{ color: 'red', marginBottom: 8 }}>{error}</Text> : null}
          <Card>
            <Text style={{ color: '#52655c', fontSize: 14 }}>Available Balance</Text>
            <Text style={{ fontSize: 34, fontWeight: '900', color: '#082017' }}>
              ₦{balance != null ? (balance / 100).toLocaleString() : '—'}
            </Text>
          </Card>
          <Text style={{ fontSize: 18, fontWeight: '800', marginTop: 16, marginBottom: 8 }}>Ledger</Text>
        </>
      }
      data={entries}
      keyExtractor={item => item.id}
      renderItem={({ item }) => (
        <Card>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontWeight: '700' }}>{item.entry_type}</Text>
              <Text style={{ color: '#52655c', fontSize: 12 }}>{item.reference}</Text>
              <Text style={{ color: '#888', fontSize: 11 }}>{new Date(item.created_at).toLocaleDateString()}</Text>
            </View>
            <Text style={{ fontWeight: '800', color: item.direction === 'CREDIT' ? T.CREDIT : T.DEBIT, fontSize: 18 }}>
              {item.direction === 'CREDIT' ? '+' : '-'}₦{(item.amount_kobo / 100).toLocaleString()}
            </Text>
          </View>
        </Card>
      )}
      ListFooterComponent={
        nextCursor ? (
          <Text onPress={() => load(nextCursor)} style={{ color: '#0B6B45', fontWeight: '700', textAlign: 'center', padding: 16 }}>
            Load more
          </Text>
        ) : null
      }
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor="#0B6B45" />}
      ListEmptyComponent={<Text style={{ color: '#888', textAlign: 'center', marginTop: 20 }}>No transactions yet.</Text>}
    />
  );
}
