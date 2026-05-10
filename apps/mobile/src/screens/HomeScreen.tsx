import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { View, Text, ScrollView, RefreshControl, ActivityIndicator, Linking, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AvatarBadge, Button, Card, Input, MetricCard, Pill, SectionHeader } from '../components/ui';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { theme } from '../theme';

interface Props {
  navigation?: any;
}

export default function HomeScreen({ navigation }: Props) {
  const { user } = useAuth();
  const [groups, setGroups] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [invite, setInvite] = useState('');
  const [joining, setJoining] = useState(false);
  const [err, setErr] = useState('');
  const [pendingRef, setPendingRef] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [confirmErr, setConfirmErr] = useState('');

  const load = useCallback(async () => {
    try {
      const j = await api('/api/groups');
      setGroups(Array.isArray(j) ? j : j.groups || []);
    } catch {
      setGroups([]);
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

  const totalCommittedKobo = useMemo(
    () => groups.reduce((sum, group) => sum + Number(group.contribution_amount_kobo || 0), 0),
    [groups],
  );

  async function join() {
    if (!invite.trim()) {
      setErr('Enter an invite code');
      return;
    }

    setJoining(true);
    setErr('');
    try {
      await api('/api/groups/join', { method: 'POST', body: JSON.stringify({ inviteCode: invite.trim() }) });
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
  const userInitials = user?.full_name
    ? user.full_name.split(' ').slice(0, 2).map((part: string) => part[0]).join('').toUpperCase()
    : 'AA';

  const upcomingLabel = activeGroup
    ? `Contribution of ₦${(activeGroup.contribution_amount_kobo / 100).toLocaleString()} due soon`
    : 'Create your first circle to see upcoming deadlines';

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background }} edges={['left', 'right', 'top']}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: theme.spacing.lg, paddingBottom: theme.spacing.xl * 2 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={theme.colors.primary} />}>
        <Card style={{ backgroundColor: theme.colors.primaryDark, borderColor: theme.colors.primaryDark }}>
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' }}>
            <View style={{ flex: 1, paddingRight: theme.spacing.md }}>
              <Pill label="Live dashboard" tone="primary" />
              <Text style={{ marginTop: theme.spacing.sm, fontSize: 28, lineHeight: 34, fontWeight: '900', color: theme.colors.white }}>
                Good morning{user?.full_name ? `, ${user.full_name.split(' ')[0]}` : ''}
              </Text>
              <Text style={{ marginTop: theme.spacing.xs, color: 'rgba(255,255,255,0.88)', lineHeight: 20 }}>
                Keep track of your savings circles, upcoming contributions, and payout rotations.
              </Text>
            </View>
            <AvatarBadge initials={userInitials} tone="accent" />
          </View>
        </Card>

        {err ? <Text style={{ color: theme.colors.danger, marginBottom: theme.spacing.sm, fontWeight: '700' }}>{err}</Text> : null}

        {pendingRef ? (
          <Card style={{ backgroundColor: '#FFF8E8', borderColor: '#F3D7A8' }}>
            <Text style={{ fontWeight: '900', color: theme.colors.text }}>Payment opened in browser</Text>
            <Text style={{ marginTop: 4, color: theme.colors.muted, lineHeight: 20 }}>
              Once you have completed payment on Paystack, tap below to confirm it and update your balance.
            </Text>
            <Text style={{ marginTop: 4, color: theme.colors.mutedSoft, fontSize: 12 }}>Ref: {pendingRef}</Text>
            {confirmErr ? (
              <Text style={{ marginTop: 8, color: theme.colors.danger, fontWeight: '700', lineHeight: 20 }}>{confirmErr}</Text>
            ) : null}
            {confirming
              ? <ActivityIndicator color={theme.colors.primary} style={{ marginTop: 12 }} />
              : <Button title="I've paid — confirm payment" onPress={confirmPayment} />}
            <Button title="Dismiss" onPress={() => { setPendingRef(null); setConfirmErr(''); }} variant="ghost" />
          </Card>
        ) : null}

        <View style={{ flexDirection: 'row', gap: theme.spacing.sm }}>
          <MetricCard label="Active Circles" value={String(groups.length)} helper="Groups you belong to" tone="success" />
          <MetricCard label="Committed Value" value={`₦${(totalCommittedKobo / 100).toLocaleString()}`} helper="Total contributions per cycle" tone="accent" />
        </View>

        <SectionHeader title="Upcoming Deadlines" actionLabel="Create circle" onAction={() => navigation?.navigate('CreateCircle')} />
        {activeGroup ? (
          <Card style={{ backgroundColor: theme.colors.primary, borderColor: theme.colors.primary }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md }}>
              <View style={{ width: 54, height: 54, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.16)', alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ color: theme.colors.white, fontSize: 24 }}>⟳</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: 'rgba(255,255,255,0.82)', fontSize: 12, fontWeight: '700' }}>Group: {activeGroup.name}</Text>
                <Text style={{ color: theme.colors.white, fontSize: 16, fontWeight: '800', marginTop: 2 }}>{upcomingLabel}</Text>
              </View>
            </View>
            <View style={{ marginTop: theme.spacing.md, flexDirection: 'row', gap: theme.spacing.sm }}>
              <Button title="Pay Now" onPress={() => pay(activeGroup.id)} variant="secondary" style={{ flex: 1, marginVertical: 0 }} />
              <Button title="Details" onPress={() => navigation?.navigate('GroupDetail', { groupId: activeGroup.id })} variant="outline" style={{ flex: 1, marginVertical: 0 }} />
            </View>
          </Card>
        ) : (
          <Card>
            <Text style={{ fontSize: 18, fontWeight: '900', color: theme.colors.text }}>No active circles yet</Text>
            <Text style={{ marginTop: 4, color: theme.colors.muted, lineHeight: 20 }}>Create your first circle or join one with an invite code to begin saving.</Text>
          </Card>
        )}

        <SectionHeader title="Your Active Circles" actionLabel="Create circle" onAction={() => navigation?.navigate('CreateCircle')} />
        {groups.length === 0 ? (
          <Card>
            <Text style={{ color: theme.colors.muted }}>No circles yet. Start one below or join via code.</Text>
          </Card>
        ) : groups.map(group => (
          <Card key={group.id}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: theme.spacing.md }}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 18, fontWeight: '900', color: theme.colors.text }}>{group.name}</Text>
                <Text style={{ marginTop: 2, color: theme.colors.muted }}>{group.frequency} • ₦{(group.contribution_amount_kobo / 100).toLocaleString()}</Text>
                <Text style={{ marginTop: 4, color: theme.colors.mutedSoft, fontSize: 12 }}>Invite code: {group.invite_code}</Text>
              </View>
              <Pill label={group.status || 'ACTIVE'} tone={group.status === 'ACTIVE' ? 'success' : 'warning'} />
            </View>
            <View style={{ flexDirection: 'row', gap: theme.spacing.sm, marginTop: theme.spacing.md }}>
              <Button title="Contribute" onPress={() => pay(group.id)} style={{ flex: 1, marginVertical: 0 }} />
              <Button title="Details" onPress={() => navigation?.navigate('GroupDetail', { groupId: group.id })} variant="outline" style={{ flex: 1, marginVertical: 0 }} />
            </View>
          </Card>
        ))}

        <SectionHeader title="Quick Actions" />
        <View style={{ flexDirection: 'row', gap: theme.spacing.sm }}>
          <Button title="Create Circle" onPress={() => navigation?.navigate('CreateCircle')} style={{ flex: 1, marginVertical: 0 }} />
          <Button title="Join via Code" onPress={() => {}} variant="outline" style={{ flex: 1, marginVertical: 0 }} />
        </View>

        <Card>
          <Text style={{ fontSize: 18, fontWeight: '900', color: theme.colors.text }}>Join Circle</Text>
          <Text style={{ marginTop: 4, color: theme.colors.muted }}>Enter an invite code to join a savings group.</Text>
          <Input placeholder="Invite code" value={invite} onChangeText={setInvite} autoCapitalize="none" style={{ marginTop: theme.spacing.sm }} />
          {joining ? <ActivityIndicator color={theme.colors.primary} /> : <Button title="Join Group" onPress={join} />}
        </Card>

        <Card>
          <Text style={{ fontWeight: '900', color: theme.colors.text, marginBottom: theme.spacing.xs }}>Security note</Text>
          <Text style={{ color: theme.colors.muted, lineHeight: 20 }}>
            Your balances are calculated from the ledger on the backend, not from the app UI. That keeps balances and payouts trustworthy.
          </Text>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}