import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { View, Text, FlatList, RefreshControl, ActivityIndicator, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Card, Pill, SectionHeader } from '../components/ui';
import { api } from '../api/client';
import { theme } from '../theme';

interface Props {
  navigation: any;
}

type Filter = 'ALL' | 'UNREAD' | 'READ';

function getNotificationTarget(type: string) {
  const normalized = String(type || '').toUpperCase();
  if (normalized.includes('KYC')) {
    return { route: 'Profile', params: { screen: 'KYC' } };
  }
  if (normalized.includes('PAYOUT')) {
    return { route: 'Activity', params: { screen: 'PayoutHistory' } };
  }
  if (normalized.includes('CONTRIBUTION')) {
    return { route: 'Activity', params: { screen: 'ContributionHistory' } };
  }
  if (normalized.includes('GROUP')) {
    return { route: 'Groups', params: { screen: 'GroupsMain' } };
  }
  return null;
}

const FILTERS: Array<{ label: string; value: Filter }> = [
  { label: 'All', value: 'ALL' },
  { label: 'Unread', value: 'UNREAD' },
  { label: 'Read', value: 'READ' },
];

export default function NotificationsScreen({ navigation }: Props) {
  const [items, setItems] = useState<any[]>([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [filter, setFilter] = useState<Filter>('ALL');
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

  const visibleItems = useMemo(() => {
    if (filter === 'UNREAD') return items.filter(item => !item.is_read);
    if (filter === 'READ') return items.filter(item => item.is_read);
    return items;
  }, [items, filter]);

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

  async function openNotification(item: any) {
    if (!item.is_read) {
      await markRead(item.id);
    }

    const target = getNotificationTarget(item.type);
    if (target) {
      navigation.navigate(target.route, target.params);
    }
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
          <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginTop: theme.spacing.md }}>
            {FILTERS.map(item => (
              <TouchableOpacity key={item.value} onPress={() => setFilter(item.value)}>
                <Pill label={item.label} tone={filter === item.value ? 'primary' : 'secondary'} />
              </TouchableOpacity>
            ))}
          </View>
          {unread > 0 ? (
            <TouchableOpacity onPress={markAllRead} style={{ marginTop: theme.spacing.sm }}>
              <Pill label="Mark all read" tone="primary" />
            </TouchableOpacity>
          ) : null}
        </Card>
      }
      data={visibleItems}
      keyExtractor={item => item.id}
      renderItem={({ item }) => (
        <TouchableOpacity onPress={() => openNotification(item)}>
          <Card style={!item.is_read ? { borderColor: theme.colors.primary, backgroundColor: '#121913' } : undefined}>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              {!item.is_read && <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: theme.colors.primary, marginTop: 6 }} />}
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                  <Text style={{ fontWeight: item.is_read ? '600' : '900', color: theme.colors.text, flex: 1 }}>{item.title}</Text>
                  <Text style={{ color: theme.colors.mutedSoft, fontSize: 11, fontWeight: '800' }}>{String(item.type || 'UPDATE').replace(/_/g, ' ')}</Text>
                </View>
                <Text style={{ color: theme.colors.muted, fontSize: 13, marginTop: 2, lineHeight: 18 }}>{item.body}</Text>
                <Text style={{ color: theme.colors.mutedSoft, fontSize: 11, marginTop: 4 }}>{new Date(item.created_at).toLocaleString()}</Text>
                <Text style={{ color: theme.colors.primary, fontSize: 12, fontWeight: '800', marginTop: 6 }}>
                  {getNotificationTarget(item.type) ? 'Open related task' : 'Tap to mark as read'}
                </Text>
              </View>
            </View>
          </Card>
        </TouchableOpacity>
      )}
      onEndReached={() => hasMore && load()}
      onEndReachedThreshold={0.5}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={theme.colors.primary} />}
      ListFooterComponent={loadingMore ? <ActivityIndicator color={theme.colors.primary} style={{ marginVertical: 12 }} /> : null}
      ListEmptyComponent={<Card><Text style={{ color: theme.colors.muted, textAlign: 'center' }}>No notifications for this view.</Text></Card>}
    />
    </SafeAreaView>
  );
}
