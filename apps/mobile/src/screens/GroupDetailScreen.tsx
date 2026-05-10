import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { View, Text, ScrollView, RefreshControl, ActivityIndicator, Linking, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AvatarBadge, Button, Card, Pill, SectionHeader, StatLine } from '../components/ui';
import { api } from '../api/client';
import { theme } from '../theme';

interface Props {
  route: any;
}

export default function GroupDetailScreen({ route }: Props) {
  const groupId: string = route?.params?.groupId;
  const [group, setGroup] = useState<any>(null);
  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [paying, setPaying] = useState(false);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [tab, setTab] = useState<'rotation' | 'members' | 'history'>('rotation');
  const [pendingRef, setPendingRef] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [confirmErr, setConfirmErr] = useState('');

  async function load() {
    try {
      const [g, a] = await Promise.all([
        api(`/api/groups/${groupId}`),
        api(`/api/groups/${groupId}/analytics`),
      ]);
      setGroup(g.group || g);
      setAnalytics(a);
    } catch (e: any) {
      setErr(e.message);
    }
  }

  const refresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [groupId]);

  useEffect(() => { load().finally(() => setLoading(false)); }, [groupId]);

  const members = useMemo(() => group?.members || [], [group]);
  const history = useMemo(() => group?.history || group?.ledger || [], [group]);
  const completion = analytics?.completionRate ?? 0;
  const activeMembers = analytics?.activeMemberCount ?? members.length ?? 0;
  const potKobo = analytics?.totalContributionsKobo ?? group?.total_pot_kobo ?? 0;
  const initials = (group?.name || 'Ajo').split(' ').slice(0, 2).map((part: string) => part[0]).join('').toUpperCase();

  async function pay() {
    setPaying(true);
    setMsg('');
    setErr('');
    try {
      const j = await api('/api/contributions/initialize', {
        method: 'POST',
        body: JSON.stringify({ groupId }),
      });
      const url = j.payment?.authorization_url;
      const ref = j.contribution?.payment_reference;
      if (url) {
        await Linking.openURL(url);
        if (ref) setPendingRef(ref);
      } else {
        setMsg('Payment initialized — check your notifications.');
      }
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setPaying(false);
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
      setMsg(j.message || 'Payment confirmed!');
      await load();
    } catch (e: any) {
      const msg = e.message || 'Unknown error';
      const hint = msg === 'Request failed'
        ? 'The backend may not be deployed yet. Push to GitHub to trigger Render deployment, then try again.'
        : msg;
      setConfirmErr(hint);
    } finally {
      setConfirming(false);
    }
  }

  if (loading) return <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.colors.background }}><ActivityIndicator color={theme.colors.primary} size="large" /></View>;
  if (!group) return <View style={{ flex: 1, padding: 18, backgroundColor: theme.colors.background }}><Text style={{ color: theme.colors.danger }}>{err || 'Group not found'}</Text></View>;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background }} edges={['left', 'right', 'top']}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: theme.spacing.lg, paddingBottom: theme.spacing.xl * 2 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={theme.colors.primary} />}>
        <Card style={{ backgroundColor: theme.colors.surfaceAlt }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: theme.spacing.md }}>
            <View style={{ flex: 1 }}>
              <Pill label={group.status || 'ACTIVE'} tone={group.status === 'ACTIVE' ? 'success' : 'warning'} />
              <Text style={{ marginTop: theme.spacing.sm, fontSize: 28, fontWeight: '900', color: theme.colors.text }}>{group.name}</Text>
              <Text style={{ marginTop: 4, color: theme.colors.muted, lineHeight: 20 }}>{group.description || 'A secure rotational savings circle powered by a backend ledger.'}</Text>
            </View>
            <AvatarBadge initials={initials} tone="primary" />
          </View>

          <View style={{ marginTop: theme.spacing.md, flexDirection: 'row', gap: theme.spacing.sm, flexWrap: 'wrap' }}>
            <Pill label={group.frequency || 'WEEKLY'} tone="primary" />
            <Pill label={`Invite ${group.invite_code}`} tone="secondary" />
          </View>
        </Card>

        {msg ? <Card style={{ borderColor: '#CFE7D7', backgroundColor: '#EEF7F1' }}><Text style={{ color: theme.colors.primary, fontWeight: '700' }}>{msg}</Text></Card> : null}
        {err ? <Text style={{ color: theme.colors.danger, marginBottom: 8, fontWeight: '700' }}>{err}</Text> : null}

        <View style={{ flexDirection: 'row', gap: theme.spacing.sm }}>
          <Metric value={`₦${(potKobo / 100).toLocaleString()}`} label="Total Pot" />
          <Metric value={String(activeMembers)} label="Members" />
        </View>
        <View style={{ marginTop: theme.spacing.sm }}>
          <Metric value={`${completion}%`} label="Completion" helper="Round progress" />
        </View>

        <Card>
          <StatLine label="Frequency" value={String(group.frequency)} />
          <StatLine label="Contribution" value={`₦${(group.contribution_amount_kobo / 100).toLocaleString()}`} />
          <StatLine label="Slots" value={String(group.max_members)} />
          <StatLine label="Invite Code" value={group.invite_code} />
        </Card>

        <View style={{ flexDirection: 'row', gap: theme.spacing.sm, marginBottom: theme.spacing.sm }}>
          {(['rotation', 'members', 'history'] as const).map(item => (
            <TouchableOpacity
              key={item}
              onPress={() => setTab(item)}
              style={{
                flex: 1,
                paddingVertical: 12,
                borderRadius: theme.radii.pill,
                backgroundColor: tab === item ? theme.colors.primary : theme.colors.surface,
                borderWidth: 1,
                borderColor: tab === item ? theme.colors.primary : theme.colors.border,
                alignItems: 'center',
              }}>
              <Text style={{ color: tab === item ? theme.colors.white : theme.colors.text, fontWeight: '800', fontSize: 12, textTransform: 'capitalize' }}>{item}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {tab === 'rotation' ? (
          <Card>
            <SectionHeader title="Rotation" />
            <View style={{ marginTop: theme.spacing.sm }}>
              <Progress value={completion} />
              <Text style={{ marginTop: theme.spacing.sm, color: theme.colors.muted, lineHeight: 20 }}>
                Round {analytics?.contributionCount || 0} contributions recorded. Successful payouts: {analytics?.successfulPayouts || 0}.
              </Text>
            </View>
          </Card>
        ) : null}

        {tab === 'members' ? (
          <Card>
            <SectionHeader title="Members" />
            {members.length ? members.map((member: any) => (
              <View key={member.id || member.user_id} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: theme.spacing.sm }}>
                <AvatarBadge initials={(member.full_name || member.name || 'M').split(' ').slice(0, 2).map((part: string) => part[0]).join('').toUpperCase()} tone="secondary" />
                <View style={{ flex: 1, marginLeft: theme.spacing.md }}>
                  <Text style={{ fontWeight: '800', color: theme.colors.text }}>{member.full_name || member.name || 'Member'}</Text>
                  <Text style={{ color: theme.colors.muted, fontSize: 12 }}>{member.role || 'MEMBER'}{member.payout_position != null ? ` • Position ${member.payout_position}` : ''}</Text>
                </View>
              </View>
            )) : <Text style={{ color: theme.colors.muted }}>No member details returned by the API yet.</Text>}
          </Card>
        ) : null}

        {tab === 'history' ? (
          <Card>
            <SectionHeader title="Recent History" />
            {history.length ? history.map((entry: any) => (
              <View key={entry.id || entry.created_at} style={{ paddingVertical: theme.spacing.sm, borderBottomWidth: 1, borderBottomColor: theme.colors.border }}>
                <Text style={{ fontWeight: '800', color: theme.colors.text }}>{entry.title || entry.type || 'Ledger entry'}</Text>
                <Text style={{ color: theme.colors.muted, fontSize: 12 }}>{entry.date || new Date(entry.created_at).toLocaleString()}</Text>
              </View>
            )) : <Text style={{ color: theme.colors.muted }}>No history entries yet.</Text>}
          </Card>
        ) : null}

        <Card>
          <Text style={{ fontWeight: '900', color: theme.colors.text }}>Invite Members</Text>
          <Text style={{ marginTop: 4, color: theme.colors.muted }}>Share this circle code with trusted friends or family.</Text>
          <View style={{ marginTop: theme.spacing.md, padding: theme.spacing.md, borderRadius: theme.radii.md, backgroundColor: theme.colors.primarySoft }}>
            <Text style={{ fontSize: 18, fontWeight: '900', color: theme.colors.primary }}>{group.invite_code}</Text>
          </View>
        </Card>

        {pendingRef ? (
          <Card style={{ backgroundColor: '#FFF8E8', borderColor: '#F3D7A8' }}>
            <Text style={{ fontWeight: '900', color: theme.colors.text }}>Payment opened in browser</Text>
            <Text style={{ marginTop: 4, color: theme.colors.muted, lineHeight: 20 }}>
              Once you have completed payment on Paystack, tap below to confirm and update your group balance.
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

        {group.status === 'ACTIVE' && !pendingRef && (
          paying
            ? <ActivityIndicator color={theme.colors.primary} style={{ marginTop: 16 }} />
            : <Button title="Contribute with Paystack" onPress={pay} />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function Metric({ value, label, helper }: { value: string; label: string; helper?: string }) {
  return (
    <Card style={{ flex: 1, marginVertical: 0 }}>
      <Text style={{ color: theme.colors.muted, fontSize: 12, fontWeight: '700' }}>{label}</Text>
      <Text style={{ marginTop: 8, color: theme.colors.text, fontSize: 24, fontWeight: '900' }}>{value}</Text>
      {helper ? <Text style={{ marginTop: 4, color: theme.colors.mutedSoft, fontSize: 12 }}>{helper}</Text> : null}
    </Card>
  );
}

function Progress({ value }: { value: number }) {
  const safeValue = Math.max(0, Math.min(100, value));
  return (
    <View>
      <View style={{ height: 10, borderRadius: 999, backgroundColor: '#DFEAE4', overflow: 'hidden' }}>
        <View style={{ width: `${safeValue}%`, height: '100%', backgroundColor: theme.colors.primary, borderRadius: 999 }} />
      </View>
      <Text style={{ marginTop: 6, color: theme.colors.muted, fontSize: 12 }}>{safeValue}% complete</Text>
    </View>
  );
}