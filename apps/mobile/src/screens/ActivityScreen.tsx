import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, ScrollView, RefreshControl, ActivityIndicator, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api } from '../api/client';
import { Card, Pill, SectionHeader } from '../components/ui';
import { theme } from '../theme';

interface Props {
  navigation?: any;
}

type NotificationItem = {
  id: string;
  title: string;
  body: string;
  type?: string;
  created_at: string;
  is_read?: boolean;
};

type ContributionItem = {
  id: string;
  group_name?: string;
  amount_kobo: number;
  status: string;
  created_at: string;
  payment_reference?: string;
};

type PayoutItem = {
  id: string;
  group_name?: string;
  amount_kobo: number;
  status: string;
  created_at: string;
  transfer_code?: string;
};

type FeedItem = {
  id: string;
  kind: 'notification' | 'contribution' | 'payout';
  title: string;
  body: string;
  createdAt: string;
  status?: string;
  unread?: boolean;
};

export default function ActivityScreen({ navigation }: Props) {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [contributions, setContributions] = useState<ContributionItem[]>([]);
  const [payouts, setPayouts] = useState<PayoutItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const [notificationsRes, contributionsRes, payoutsRes] = await Promise.allSettled([
      api('/api/notifications?limit=8'),
      api('/api/contributions/mine?limit=8'),
      api('/api/payouts/mine'),
    ]);

    if (notificationsRes.status === 'fulfilled') {
      const j = notificationsRes.value as any;
      setNotifications(Array.isArray(j.notifications) ? j.notifications : []);
    } else {
      setNotifications([]);
    }

    if (contributionsRes.status === 'fulfilled') {
      const j = contributionsRes.value as any;
      setContributions(Array.isArray(j.contributions) ? j.contributions : []);
    } else {
      setContributions([]);
    }

    if (payoutsRes.status === 'fulfilled') {
      const j = payoutsRes.value as any;
      setPayouts(Array.isArray(j.payouts) ? j.payouts : []);
    } else {
      setPayouts([]);
    }
  }, []);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  useEffect(() => {
    load().finally(() => setLoading(false));
  }, [load]);

  const unreadCount = notifications.filter(item => !item.is_read).length;
  const combinedFeed: FeedItem[] = [
    ...notifications.map(item => ({
      id: `notification-${item.id}`,
      kind: 'notification' as const,
      title: item.title,
      body: item.body,
      createdAt: item.created_at,
      unread: !item.is_read,
      status: String(item.type || 'Update').replace(/_/g, ' '),
    })),
    ...contributions.map(item => ({
      id: `contribution-${item.id}`,
      kind: 'contribution' as const,
      title: `${item.group_name || 'Group'} contribution`,
      body: `₦${(item.amount_kobo / 100).toLocaleString()} • ${item.status}`,
      createdAt: item.created_at,
      status: item.status,
    })),
    ...payouts.map(item => ({
      id: `payout-${item.id}`,
      kind: 'payout' as const,
      title: `${item.group_name || 'Group'} payout`,
      body: `₦${(item.amount_kobo / 100).toLocaleString()} • ${item.status}`,
      createdAt: item.created_at,
      status: item.status,
    })),
  ]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 18);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.colors.background }}>
        <ActivityIndicator color={theme.colors.primary} size="large" />
      </View>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background }} edges={['left', 'right', 'top']}>
      <ScrollView
        contentContainerStyle={{ padding: theme.spacing.lg, paddingBottom: theme.spacing.xl * 2 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={theme.colors.primary} />}>
        <Card style={{ backgroundColor: theme.colors.surfaceAlt }}>
          <SectionHeader title={`Activity${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`} actionLabel="Refresh" onAction={refresh} />
          <Text style={{ color: theme.colors.muted, lineHeight: 20 }}>
            Notifications, contribution history, and payout alerts together in one simple feed.
          </Text>
          <View style={{ flexDirection: 'row', gap: 10, flexWrap: 'wrap', marginTop: theme.spacing.md }}>
            <TouchableOpacity onPress={() => navigation?.navigate('Notifications')}>
              <Pill label="Notifications" tone="secondary" />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => navigation?.navigate('ContributionHistory')}>
              <Pill label="Contributions" tone="primary" />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => navigation?.navigate('PayoutHistory')}>
              <Pill label="Payouts" tone="primary" />
            </TouchableOpacity>
          </View>
        </Card>

        <View style={{ flexDirection: 'row', gap: 12, marginTop: 14 }}>
          <MiniStat label="Unread" value={String(unreadCount)} emoji="🔔" />
          <MiniStat label="Contributions" value={String(contributions.length)} emoji="💰" />
          <MiniStat label="Payouts" value={String(payouts.length)} emoji="💸" />
        </View>

        <Text style={{ color: theme.colors.text, fontSize: 18, fontWeight: '900', marginTop: 20, marginBottom: 12 }}>Latest Activity</Text>
        {combinedFeed.length ? combinedFeed.map(item => (
          <Card key={item.id} style={item.unread ? { borderColor: theme.colors.primary, backgroundColor: '#121913' } : undefined}>
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: theme.colors.background, alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ fontSize: 20 }}>{item.kind === 'notification' ? '🔔' : item.kind === 'contribution' ? '💰' : '💸'}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 10 }}>
                  <Text style={{ color: theme.colors.text, fontWeight: '800', flex: 1 }}>{item.title}</Text>
                  <Text style={{ color: theme.colors.mutedSoft, fontSize: 11, fontWeight: '800' }}>{item.status}</Text>
                </View>
                <Text style={{ color: theme.colors.muted, fontSize: 13, lineHeight: 18, marginTop: 3 }}>{item.body}</Text>
                <Text style={{ color: theme.colors.mutedSoft, fontSize: 11, marginTop: 4 }}>{new Date(item.createdAt).toLocaleString()}</Text>
              </View>
            </View>
          </Card>
        )) : (
          <Card>
            <Text style={{ color: theme.colors.muted, textAlign: 'center' }}>No activity yet.</Text>
          </Card>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function MiniStat({ label, value, emoji }: { label: string; value: string; emoji: string }) {
  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.surface, borderRadius: 18, borderWidth: 1, borderColor: theme.colors.border, padding: 14 }}>
      <Text style={{ fontSize: 22 }}>{emoji}</Text>
      <Text style={{ color: theme.colors.text, fontSize: 18, fontWeight: '900', marginTop: 8 }}>{value}</Text>
      <Text style={{ color: theme.colors.muted, fontSize: 12 }}>{label}</Text>
    </View>
  );
}
