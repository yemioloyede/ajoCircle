import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, FlatList, RefreshControl, ActivityIndicator, TouchableOpacity } from 'react-native';
import { Card } from '../components/ui';
import { api } from '../api/client';

export default function NotificationsScreen() {
  const [items, setItems] = useState<any[]>([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const limit = 30;

  async function load(reset = false) {
    const off = reset ? 0 : offset;
    try {
      const j = await api(`/api/notifications?limit=${limit}&offset=${off}`);
      setUnread(j.unreadCount || 0);
      if (reset) {
        setItems(j.notifications || []);
        setOffset(limit);
      } else {
        setItems(prev => [...prev, ...(j.notifications || [])]);
        setOffset(off + limit);
      }
      setHasMore((j.notifications || []).length === limit);
    } catch { /* ignore */ }
  }

  const refresh = useCallback(async () => {
    setRefreshing(true);
    await load(true);
    setRefreshing(false);
  }, []);

  useEffect(() => { load(true).finally(() => setLoading(false)); }, []);

  async function markRead(id: string) {
    await api(`/api/notifications/${id}/read`, { method: 'PATCH' }).catch(() => {});
    setItems(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
    setUnread(prev => Math.max(0, prev - 1));
  }

  async function markAllRead() {
    await api('/api/notifications/read-all', { method: 'PATCH' }).catch(() => {});
    setItems(prev => prev.map(n => ({ ...n, is_read: true })));
    setUnread(0);
  }

  if (loading) return <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}><ActivityIndicator color="#0B6B45" size="large" /></View>;

  return (
    <FlatList
      style={{ flex: 1, backgroundColor: '#F2F7F4', padding: 18 }}
      ListHeaderComponent={
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <Text style={{ fontSize: 26, fontWeight: '900', color: '#082017' }}>
            Notifications {unread > 0 ? `(${unread})` : ''}
          </Text>
          {unread > 0 && (
            <TouchableOpacity onPress={markAllRead}>
              <Text style={{ color: '#0B6B45', fontWeight: '700', fontSize: 13 }}>Mark all read</Text>
            </TouchableOpacity>
          )}
        </View>
      }
      data={items}
      keyExtractor={item => item.id}
      renderItem={({ item }) => (
        <TouchableOpacity onPress={() => !item.is_read && markRead(item.id)}>
          <Card>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              {!item.is_read && <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#0B6B45', marginTop: 6 }} />}
              <View style={{ flex: 1 }}>
                <Text style={{ fontWeight: item.is_read ? '500' : '800' }}>{item.title}</Text>
                <Text style={{ color: '#52655c', fontSize: 13, marginTop: 2 }}>{item.body}</Text>
                <Text style={{ color: '#aaa', fontSize: 11, marginTop: 4 }}>{new Date(item.created_at).toLocaleString()}</Text>
              </View>
            </View>
          </Card>
        </TouchableOpacity>
      )}
      onEndReached={() => hasMore && load()}
      onEndReachedThreshold={0.5}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor="#0B6B45" />}
      ListEmptyComponent={<Text style={{ color: '#888', textAlign: 'center', marginTop: 20 }}>No notifications.</Text>}
    />
  );
}
