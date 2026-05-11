import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { View, Text, ScrollView, RefreshControl, ActivityIndicator, Linking, Alert, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, Input } from '../components/ui';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { theme } from '../theme';

interface Props {
  navigation?: any;
}

export default function HomeScreen({ navigation }: Props) {
  const { user } = useAuth();
  const [groups, setGroups] = useState<any[]>([]);
  const [contributions, setContributions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [invite, setInvite] = useState('');
  const [joining, setJoining] = useState(false);
  const [err, setErr] = useState('');
  const [totalSavedKobo, setTotalSavedKobo] = useState(0);
  const [pendingRef, setPendingRef] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [confirmErr, setConfirmErr] = useState('');

  const load = useCallback(async () => {
    const [groupsRes, summaryRes, ledgerRes, contributionsRes] = await Promise.allSettled([
      api('/api/groups'),
      api('/api/contributions/summary'),
      api('/api/ledger/me'),
      api('/api/contributions/mine?limit=100'),
    ]);

    if (groupsRes.status === 'fulfilled') {
      const j = groupsRes.value;
      setGroups(Array.isArray(j) ? j : j.groups || []);
    } else {
      setGroups([]);
    }

    if (summaryRes.status === 'fulfilled') {
      const summary = summaryRes.value as any;
      setTotalSavedKobo(Number(summary.totalSavedKobo ?? summary.total_saved_kobo ?? 0));
    } else if (ledgerRes.status === 'fulfilled') {
      const j = ledgerRes.value as any;
      setTotalSavedKobo(Number(j.balanceKobo ?? j.balance_kobo ?? 0));
    } else {
      setTotalSavedKobo(0);
    }

    if (contributionsRes.status === 'fulfilled') {
      const c = contributionsRes.value as any;
      setContributions(Array.isArray(c) ? c : c.contributions || []);
    } else {
      setContributions([]);
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

  const totalCommittedKobo = useMemo(() => totalSavedKobo, [totalSavedKobo]);

  const upcomingDeadlines = useMemo(() => {
    const now = new Date();

    const startOfDay = (d: Date) => {
      const x = new Date(d);
      x.setHours(0, 0, 0, 0);
      return x;
    };

    const addDays = (d: Date, days: number) => {
      const x = new Date(d);
      x.setDate(x.getDate() + days);
      return x;
    };

    const addMonthsClamped = (base: Date, offset: number) => {
      const year = base.getFullYear();
      const month = base.getMonth() + offset;
      const targetYear = year + Math.floor(month / 12);
      const targetMonth = ((month % 12) + 12) % 12;
      const lastDay = new Date(targetYear, targetMonth + 1, 0).getDate();
      const day = Math.min(base.getDate(), lastDay);
      return new Date(targetYear, targetMonth, day);
    };

    const getCycleWindow = (group: any) => {
      const anchor = startOfDay(new Date(group.start_date || group.created_at || now));
      const today = startOfDay(now);
      if (today < anchor) {
        const next = group.frequency === 'DAILY'
          ? addDays(anchor, 1)
          : group.frequency === 'WEEKLY'
            ? addDays(anchor, 7)
            : addMonthsClamped(anchor, 1);
        return { periodStart: anchor, periodEnd: next, nextDue: anchor };
      }

      if (group.frequency === 'DAILY') {
        const diff = Math.floor((today.getTime() - anchor.getTime()) / 86400000);
        const periodStart = addDays(anchor, diff);
        const periodEnd = addDays(periodStart, 1);
        return { periodStart, periodEnd, nextDue: periodEnd };
      }

      if (group.frequency === 'WEEKLY') {
        const diff = Math.floor((today.getTime() - anchor.getTime()) / 86400000);
        const cycles = Math.floor(diff / 7);
        const periodStart = addDays(anchor, cycles * 7);
        const periodEnd = addDays(periodStart, 7);
        return { periodStart, periodEnd, nextDue: periodEnd };
      }

      const months = (today.getFullYear() - anchor.getFullYear()) * 12 + (today.getMonth() - anchor.getMonth());
      let periodStart = addMonthsClamped(anchor, months);
      if (periodStart > today) periodStart = addMonthsClamped(anchor, months - 1);
      const periodEnd = addMonthsClamped(periodStart, 1);
      return { periodStart, periodEnd, nextDue: periodEnd };
    };

    const scheduleLabel = (group: any) => {
      const anchor = new Date(group.start_date || group.created_at || now);
      if (group.frequency === 'DAILY') return 'Every day';
      if (group.frequency === 'WEEKLY') {
        return `Every ${anchor.toLocaleDateString(undefined, { weekday: 'long' })}`;
      }
      return `Every month on day ${anchor.getDate()}`;
    };

    return groups
      .filter(group => (group.status || 'ACTIVE') === 'ACTIVE')
      .map(group => {
        const window = getCycleWindow(group);
        const paidThisPeriod = contributions.some((c: any) => {
          if (c.group_id !== group.id) return false;
          if (c.status !== 'SUCCESS') return false;
          const when = new Date(c.paid_at || c.created_at);
          return when >= window.periodStart && when < window.periodEnd;
        });
        return {
          group,
          paidThisPeriod,
          nextDue: window.nextDue,
          schedule: scheduleLabel(group),
        };
      })
      .filter(item => !item.paidThisPeriod)
      .sort((a, b) => a.nextDue.getTime() - b.nextDue.getTime());
  }, [groups, contributions]);

  function normalizeInviteCode(input: string) {
    const value = input.trim();
    if (!value) return '';
    if (!value.includes('://') && !value.includes('?')) return value;
    try {
      const parsed = new URL(value);
      const code = parsed.searchParams.get('code') || parsed.searchParams.get('inviteCode');
      return (code || value).trim();
    } catch {
      return value;
    }
  }

  async function join() {
    const inviteCode = normalizeInviteCode(invite);
    if (!inviteCode) {
      setErr('Enter an invite code');
      return;
    }

    setJoining(true);
    setErr('');
    try {
      await api('/api/groups/join', { method: 'POST', body: JSON.stringify({ inviteCode }) });
      setInvite('');
      await load();
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setJoining(false);
    }
  }

  async function pay(groupId: string) {
    try {
      const j = await api('/api/contributions/initialize', {
        method: 'POST',
        body: JSON.stringify({ groupId }),
      });

      const url = j.payment?.authorization_url;
      const ref = j.contribution?.payment_reference;
      if (url) {
        const canOpen = await Linking.canOpenURL(url);
        if (canOpen) {
          await Linking.openURL(url);
          // Store reference so the user can confirm after returning from Paystack
          if (ref) setPendingRef(ref);
        } else {
          Alert.alert('Cannot open payment link', url);
        }
      }
    } catch (e: any) {
      Alert.alert('Error', e.message);
    }
  }

  async function confirmPayment() {
    if (!pendingRef) return;
    setConfirming(true);
    setConfirmErr('');
    try {
      const j = await api('/api/contributions/verify', {
        method: 'POST',
        body: JSON.stringify({ reference: pendingRef }),
      });
      setPendingRef(null);
      setConfirmErr('');
      Alert.alert('\u2705 Payment confirmed!', j.message || 'Your contribution has been recorded.');
      await load();
    } catch (e: any) {
      const msg = e.message || 'Unknown error';
      // 404 means backend is not yet deployed with the verify endpoint
      const hint = msg === 'Request failed'
        ? 'The backend may not be deployed yet. Push your code to GitHub to trigger a Render deployment, then try again.'
        : msg;
      setConfirmErr(hint);
    } finally {
      setConfirming(false);
    }
  }

  if (loading) {
    return <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.colors.background }}><ActivityIndicator color={theme.colors.primary} size="large" /></View>;
  }

  const activeGroup = groups[0];
  const topUpcoming = upcomingDeadlines[0];
  const userInitials = user?.full_name
    ? user.full_name.split(' ').slice(0, 2).map((part: string) => part[0]).join('').toUpperCase()
    : 'AA';

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background }} edges={['left', 'right', 'top']}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 120 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={theme.colors.primary} />}>
        <View style={{ marginTop: 14, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <View>
            <Text style={{ color: theme.colors.muted, fontSize: 14 }}>Good morning,</Text>
            <Text style={{ color: theme.colors.text, fontSize: 22, fontWeight: '900', lineHeight: 28, marginTop: 4 }}>{user?.full_name || 'Ajo User'}</Text>
          </View>
          <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: theme.colors.primary, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ color: theme.colors.white, fontSize: 18, fontWeight: '900' }}>{userInitials}</Text>
          </View>
        </View>

        {err ? <Text style={{ color: theme.colors.danger, marginBottom: theme.spacing.sm, fontWeight: '700' }}>{err}</Text> : null}

        {pendingRef ? (
          <View style={{ backgroundColor: '#2A2115', borderColor: '#5B4A31', borderWidth: 1, borderRadius: 20, padding: 16, marginTop: 18 }}>
            <Text style={{ fontWeight: '900', color: theme.colors.text }}>Payment opened in browser</Text>
            <Text style={{ marginTop: 4, color: theme.colors.muted, lineHeight: 20 }}>
              Once you have completed payment on Paystack, tap below to confirm it and update your balance.
            </Text>
            <Text style={{ marginTop: 4, color: theme.colors.mutedSoft, fontSize: 12 }}>Ref: {pendingRef}</Text>
            {confirmErr ? (
              <Text style={{ marginTop: 8, color: theme.colors.danger, fontWeight: '700', lineHeight: 20 }}>{confirmErr}</Text>
            ) : null}
            {confirming ? <ActivityIndicator color={theme.colors.primary} style={{ marginTop: 12 }} /> : <Button title="I've paid — confirm payment" onPress={confirmPayment} />}
            <Button title="Dismiss" onPress={() => { setPendingRef(null); setConfirmErr(''); }} variant="ghost" />
          </View>
        ) : null}

        <View style={{ flexDirection: 'row', gap: 14, marginTop: 18 }}>
          <MiniMetric title="Total Saved" value={`₦${(totalCommittedKobo / 100).toLocaleString()}`} />
          <MiniMetric title="Active Circles" value={String(groups.length)} />
        </View>

        <View style={{ marginTop: 24, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text style={{ color: theme.colors.text, fontSize: 20, fontWeight: '900' }}>Upcoming Payments</Text>
          <TouchableOpacity onPress={() => topUpcoming ? navigation?.navigate('GroupDetail', { groupId: topUpcoming.group.id }) : navigation?.navigate('CreateCircle')}>
            <Text style={{ color: theme.colors.primary, fontSize: 14, fontWeight: '800' }}>View All</Text>
          </TouchableOpacity>
        </View>

        {upcomingDeadlines.length ? (
          <View style={{ marginTop: 14, borderRadius: 24, backgroundColor: theme.colors.primary, padding: 20 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                <View style={{ width: 66, height: 66, borderRadius: 18, backgroundColor: 'rgba(0,0,0,0.12)', alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ color: theme.colors.white, fontSize: 16 }}>📅</Text>
                </View>
                <View style={{ marginLeft: 14, flex: 1 }}>
                  <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 13, fontWeight: '700' }}>Group: {topUpcoming?.group.name}</Text>
                  <Text style={{ color: theme.colors.white, fontSize: 16, fontWeight: '900', lineHeight: 22, marginTop: 6 }}>
                    ₦{((topUpcoming?.group.contribution_amount_kobo || 0) / 100).toLocaleString()} due {topUpcoming?.nextDue.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
                  </Text>
                  <Text style={{ color: 'rgba(255,255,255,0.85)', fontSize: 12, marginTop: 6 }}>{topUpcoming?.schedule}</Text>
                </View>
              </View>
              <TouchableOpacity onPress={() => topUpcoming && pay(topUpcoming.group.id)} style={{ width: 120, height: 52, borderRadius: 12, backgroundColor: theme.colors.secondary, alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ color: '#18212C', fontWeight: '800', fontSize: 13 }}>Pay Now</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : groups.length ? (
          <View style={{ marginTop: 14, borderRadius: 24, borderWidth: 1, borderColor: theme.colors.border, backgroundColor: theme.colors.surface, padding: 18 }}>
            <Text style={{ color: theme.colors.text, fontSize: 16, fontWeight: '900' }}>All paid up! ✅</Text>
            <Text style={{ marginTop: 6, color: theme.colors.muted, fontSize: 15 }}>
              You've paid all your circles for this period.
            </Text>
          </View>
        ) : (
          <View style={{ marginTop: 14, borderRadius: 24, borderWidth: 1, borderColor: theme.colors.border, backgroundColor: theme.colors.surface, padding: 18 }}>
            <Text style={{ color: theme.colors.muted, fontSize: 15 }}>Create your first circle to get started.</Text>
          </View>
        )}

        <Text style={{ marginTop: 28, color: theme.colors.text, fontSize: 20, fontWeight: '900' }}>Your Circles</Text>
        {groups.length === 0 ? (
          <View style={{ marginTop: 14, borderRadius: 22, borderWidth: 1, borderColor: theme.colors.border, backgroundColor: theme.colors.surface, padding: 20 }}>
            <Text style={{ color: theme.colors.text, fontSize: 16, fontWeight: '800' }}>No circles yet</Text>
            <Text style={{ color: theme.colors.muted, fontSize: 15, marginTop: 6 }}>Tap the + button below to create one, or join with an invite code.</Text>
          </View>
        ) : groups.map(group => (
          <View key={group.id} style={{ marginTop: 14, borderRadius: 22, borderWidth: 1, borderColor: theme.colors.border, backgroundColor: theme.colors.surface, padding: 16 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
              <View style={{ width: 68, height: 68, borderRadius: 14, backgroundColor: '#182018', alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ color: theme.colors.primary, fontSize: 16 }}>👥</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: theme.colors.text, fontSize: 16, fontWeight: '900' }}>{group.name}</Text>
                <Text style={{ marginTop: 6, color: theme.colors.muted, fontSize: 14 }}>Next payout: --</Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={{ color: theme.colors.text, fontSize: 14, fontWeight: '800' }}>₦{(group.contribution_amount_kobo / 100).toLocaleString()}/{group.frequency === 'WEEKLY' ? 'wk' : group.frequency === 'DAILY' ? 'day' : 'mo'}</Text>
                <View style={{ marginTop: 8, height: 34, paddingHorizontal: 12, borderRadius: 18, backgroundColor: '#182018', alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ color: theme.colors.primary, fontSize: 13, fontWeight: '800' }}>{group.status || 'Active'}</Text>
                </View>
              </View>
            </View>
            <View style={{ marginTop: 12, flexDirection: 'row', gap: 10 }}>
              <TouchableOpacity onPress={() => pay(group.id)} style={{ flex: 1, height: 52, borderRadius: 14, backgroundColor: theme.colors.primary, alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ color: theme.colors.white, fontWeight: '800', fontSize: 15 }}>💳 Contribute</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => navigation?.navigate('GroupDetail', { groupId: group.id })} style={{ flex: 1, height: 52, borderRadius: 14, borderWidth: 1, borderColor: theme.colors.border, alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ color: theme.colors.text, fontWeight: '800', fontSize: 15 }}>View Details</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}

        <View style={{ marginTop: 18, borderRadius: 20, borderWidth: 1, borderColor: theme.colors.border, backgroundColor: theme.colors.surface, padding: 18 }}>
          <Text style={{ fontSize: 17, fontWeight: '900', color: theme.colors.text }}>Join a Circle</Text>
          <Text style={{ marginTop: 6, color: theme.colors.muted, fontSize: 15 }}>Got an invite code? Paste it here to join.</Text>
          <Input placeholder="Invite code" value={invite} onChangeText={setInvite} autoCapitalize="none" style={{ marginTop: theme.spacing.sm }} />
          {joining ? <ActivityIndicator color={theme.colors.primary} /> : <Button title="Join Circle" onPress={join} />}
        </View>

      </ScrollView>
      <TouchableOpacity
        onPress={() => navigation?.navigate('CreateCircle')}
        style={{
          position: 'absolute',
          right: 22,
          bottom: 24,
          width: 58,
          height: 58,
          borderRadius: 29,
          backgroundColor: theme.colors.primary,
          alignItems: 'center',
          justifyContent: 'center',
          borderWidth: 1,
          borderColor: 'rgba(255,255,255,0.12)',
        }}>
        <Text style={{ color: theme.colors.white, fontSize: 28, lineHeight: 30, fontWeight: '600' }}>+</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

function MiniMetric({ title, value }: { title: string; value: string }) {
  return (
    <View style={{ flex: 1, borderRadius: 22, backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.border, padding: 18, minHeight: 120 }}>
      <Text style={{ color: theme.colors.muted, fontSize: 14, fontWeight: '700' }}>{title}</Text>
      <Text style={{ color: theme.colors.text, marginTop: 8, fontSize: 22, fontWeight: '900', lineHeight: 26 }}>{value}</Text>
    </View>
  );
}