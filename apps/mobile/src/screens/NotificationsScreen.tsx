import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, FlatList, RefreshControl, ActivityIndicator, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Card, Pill, SectionHeader } from '../components/ui';
import { api } from '../api/client';
import { theme } from '../theme';

export default function NotificationsScreen() {
  const [items, setItems] = useState<any[]>([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const limit = 30;

  async function load(reset = false) {
    if (!reset && (!nextCursor || loadingMore)) return;
    const before = reset ? null : nextCursor;
    if (!reset) setLoadingMore(true);

    try {
      const query = before
        ? `/api/notifications?limit=${limit}&before=${encodeURIComponent(before)}`
        : `/api/notifications?limit=${limit}`;
      const j = await api(query);
      const batch = j.notifications || [];

      setUnread(j.unreadCount || 0);
      if (reset) {
        setItems(batch);
      } else {
        setItems(prev => [...prev, ...batch]);
      }
      setNextCursor(j.nextCursor || null);
      setHasMore(Boolean(j.nextCursor));
    } catch { /* ignore */ }
    finally {
      if (!reset) setLoadingMore(false);
    }
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

  if (loading) return <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.colors.background }}><ActivityIndicator color={theme.colors.primary} size="large" /></View>;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background }} edges={['left', 'right', 'top']}>
      <FlatList
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: theme.spacing.lg, paddingBottom: theme.spacing.xl * 2 }}
      ListHeaderComponent={
        <Card style={{ backgroundColor: theme.colors.surfaceAlt }}>
          <SectionHeader title={`Notifications${unread > 0 ? ` (${unread})` : ''}`} />
          <Text style={{ color: theme.colors.muted, lineHeight: 20 }}>
            Stay on top of contribution reminders, payout approvals, and group activity.
          </Text>
          {unread > 0 && (
            <TouchableOpacity onPress={markAllRead} style={{ marginTop: theme.spacing.sm }}>
              <Pill label="Mark all read" tone="primary" />
            </TouchableOpacity>
          )}
        </Card>
      }
      data={items}
      keyExtractor={item => item.id}
      renderItem={({ item }) => (
        <TouchableOpacity onPress={() => !item.is_read && markRead(item.id)}>
          <Card>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              {!item.is_read && <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: theme.colors.primary, marginTop: 6 }} />}
              <View style={{ flex: 1 }}>
                <Text style={{ fontWeight: item.is_read ? '600' : '900', color: theme.colors.text }}>{item.title}</Text>
                <Text style={{ color: theme.colors.muted, fontSize: 13, marginTop: 2, lineHeight: 18 }}>{item.body}</Text>
                <Text style={{ color: theme.colors.mutedSoft, fontSize: 11, marginTop: 4 }}>{new Date(item.created_at).toLocaleString()}</Text>
              </View>
            </View>
          </Card>
        </TouchableOpacity>
      )}
      onEndReached={() => hasMore && load()}
      onEndReachedThreshold={0.5}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={theme.colors.primary} />}
      ListFooterComponent={loadingMore ? <ActivityIndicator color={theme.colors.primary} style={{ marginVertical: 12 }} /> : null}
      ListEmptyComponent={<Card><Text style={{ color: theme.colors.muted, textAlign: 'center' }}>No notifications.</Text></Card>}
    />
    </SafeAreaView>
  );
}
