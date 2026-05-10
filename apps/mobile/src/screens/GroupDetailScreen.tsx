import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { View, Text, ScrollView, RefreshControl, ActivityIndicator, Linking, TouchableOpacity, Share } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Constants from 'expo-constants';
import { Button, Input } from '../components/ui';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { theme } from '../theme';

interface Props {
  route: any;
  navigation: any;
}

export default function GroupDetailScreen({ route, navigation }: Props) {
  const { user } = useAuth();
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
  const [inviteEmailOrPhone, setInviteEmailOrPhone] = useState('');
  const [addingMember, setAddingMember] = useState(false);
  const [historyQuery, setHistoryQuery] = useState('');
  const [historyTypeFilter, setHistoryTypeFilter] = useState<'ALL' | 'CONTRIBUTION' | 'PAYOUT'>('ALL');
  const [historyStatusFilter, setHistoryStatusFilter] = useState<'ALL' | 'SUCCESSFUL' | 'PENDING' | 'FAILED'>('ALL');
  const [historyVisibleCount, setHistoryVisibleCount] = useState(12);

  async function load() {
    try {
      const [g, a] = await Promise.all([
        api(`/api/groups/${groupId}`),
        api(`/api/groups/${groupId}/analytics`),
      ]);

      const baseGroup = g.group || g;
      setGroup({
        ...baseGroup,
        // Backend returns members and ledger at the top level for this endpoint.
        members: g.members || baseGroup.members || [],
        ledger: g.ledger || baseGroup.ledger || [],
        history: g.history || baseGroup.history || [],
        schedule: g.schedule || baseGroup.schedule || null,
      });
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

  const members = useMemo(
    () => group?.members || group?.group_members || group?.participants || [],
    [group],
  );
  const history = useMemo(
    () => group?.history || group?.ledger || group?.transactions || [],
    [group],
  );
  const filteredHistory = useMemo(() => {
    const q = historyQuery.trim().toLowerCase();
    return history.filter((entry: any) => {
      const type = String(entry.activity_type || '').toUpperCase();
      const status = String(entry.status || '').toUpperCase();
      const actor = String(entry.actor_name || '').toLowerCase();
      const ref = String(entry.reference || '').toLowerCase();

      const typeMatch = historyTypeFilter === 'ALL' || type === historyTypeFilter;
      const statusMatch = historyStatusFilter === 'ALL'
        || (historyStatusFilter === 'SUCCESSFUL' && ['SUCCESS', 'PAID', 'APPROVED'].includes(status))
        || (historyStatusFilter === 'PENDING' && ['PENDING', 'PENDING_REVIEW', 'PROCESSING'].includes(status))
        || (historyStatusFilter === 'FAILED' && ['FAILED', 'REVERSED', 'CANCELLED'].includes(status));
      const searchMatch = !q
        || actor.includes(q)
        || ref.includes(q)
        || type.toLowerCase().includes(q)
        || status.toLowerCase().includes(q);

      return typeMatch && statusMatch && searchMatch;
    });
  }, [history, historyQuery, historyTypeFilter, historyStatusFilter]);
  const visibleHistory = useMemo(
    () => filteredHistory.slice(0, historyVisibleCount),
    [filteredHistory, historyVisibleCount],
  );
  useEffect(() => {
    setHistoryVisibleCount(12);
  }, [historyQuery, historyTypeFilter, historyStatusFilter, tab]);
  const completion = analytics?.completionRate ?? 0;
  const activeMembers = analytics?.activeMemberCount ?? members.length ?? 0;
  const potKobo = analytics?.totalContributionsKobo ?? group?.total_pot_kobo ?? 0;
  const initials = (group?.name || 'Ajo').split(' ').slice(0, 2).map((part: string) => part[0]).join('').toUpperCase();
  const schedule = group?.schedule || {};
  const myMembership = useMemo(
    () => members.find((m: any) => m.user_id === user?.id),
    [members, user?.id],
  );
  const canManageMembers = myMembership?.role === 'GROUP_ADMIN';
  const isFinished = !!schedule?.isFinished;
  const configuredSlots = Number(group?.max_members ?? schedule?.totalRounds ?? 0);
  const filledSlots = members.filter((m: any) => (m.status || 'ACTIVE') === 'ACTIVE').length;
  const completedPayoutSlots = Math.min(Number(schedule?.completedRounds ?? 0), Math.max(configuredSlots, 0));
  const projectedEndDate = schedule?.projectedEndDate
    ? new Date(schedule.projectedEndDate)
    : null;
  const nextRecipientName = schedule?.nextRecipient?.fullName
    || (schedule?.isNextSlotOpen && schedule?.nextPayoutPosition ? `Open slot #${schedule.nextPayoutPosition}` : 'Not available yet');
  const joinUrl = useMemo(() => {
    const webUrl = (Constants.expoConfig?.extra as any)?.appUrl || 'https://ajocircle.app/join';
    return `${webUrl}?code=${encodeURIComponent(group?.invite_code || '')}`;
  }, [group?.invite_code]);

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

  async function shareInviteCode() {
    if (!group?.invite_code) return;
    await Share.share({
      message: `Join my AjoCircle group "${group.name}"\n\nJoin link: ${joinUrl}\nInvite code: ${group.invite_code}`,
    });
  }

  async function addMemberManually() {
    const value = inviteEmailOrPhone.trim();
    if (!value) {
      setErr('Enter email or phone to add a member');
      return;
    }

    setAddingMember(true);
    setErr('');
    setMsg('');
    try {
      const payload = value.includes('@') ? { email: value } : { phone: value };
      const res = await api(`/api/groups/${groupId}/members`, {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      setInviteEmailOrPhone('');
      setMsg(res.message || 'Member added successfully');
      await load();
    } catch (e: any) {
      setErr(e.message || 'Could not add member');
    } finally {
      setAddingMember(false);
    }
  }

  async function recreateCircle() {
    if (!canManageMembers || !isFinished) return;
    setErr('');
    setMsg('');
    try {
      const j = await api(`/api/groups/${groupId}/recreate`, {
        method: 'POST',
        body: JSON.stringify({}),
      });
      setMsg(j.message || 'Circle recreated successfully');
      if (j?.group?.id) {
        navigation?.replace?.('GroupDetail', { groupId: j.group.id });
      }
    } catch (e: any) {
      setErr(e.message || 'Could not recreate circle');
    }
  }

  if (loading) return <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.colors.background }}><ActivityIndicator color={theme.colors.primary} size="large" /></View>;
  if (!group) return <View style={{ flex: 1, padding: 18, backgroundColor: theme.colors.background }}><Text style={{ color: theme.colors.danger }}>{err || 'Group not found'}</Text></View>;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background }} edges={['left', 'right', 'top']}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 44 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={theme.colors.primary} />}>
        <View style={{ height: 86, borderBottomWidth: 1, borderBottomColor: theme.colors.border, paddingHorizontal: 22, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <TouchableOpacity onPress={() => navigation.canGoBack() ? navigation.goBack() : navigation.navigate('Groups')}><Text style={{ color: theme.colors.text, fontSize: 18 }}>←</Text></TouchableOpacity>
          <Text style={{ color: theme.colors.text, fontSize: 18, fontWeight: '800' }}>Circle Details</Text>
          <TouchableOpacity onPress={refresh}><Text style={{ color: theme.colors.text, fontSize: 18 }}>ⓘ</Text></TouchableOpacity>
        </View>

        <View style={{ paddingHorizontal: 22, paddingTop: 18 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <View style={{ flex: 1 }}>
              <Text style={{ color: theme.colors.text, fontSize: 18, fontWeight: '900' }}>{group.name}</Text>
              <Text style={{ marginTop: 4, color: theme.colors.muted, fontSize: 13 }}>◔ {group.frequency} Contribution</Text>
            </View>
            <View style={{ height: 42, borderRadius: 22, backgroundColor: '#1C231C', paddingHorizontal: 16, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ color: theme.colors.text, fontSize: 12, fontWeight: '800' }}>{group.status || 'Active'}</Text>
            </View>
          </View>

          <View style={{ marginTop: 18, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' }}>
            <Text style={{ color: theme.colors.text, fontSize: 15, fontWeight: '900' }}>Total Pot: ₦{(potKobo / 100).toLocaleString()}</Text>
            <Text style={{ color: theme.colors.primary, fontSize: 15, fontWeight: '900' }}>{completion}%</Text>
          </View>
          <View style={{ height: 14, borderRadius: 10, backgroundColor: '#343941', marginTop: 12, overflow: 'hidden' }}>
            <View style={{ width: `${Math.max(0, Math.min(100, completion))}%`, height: '100%', backgroundColor: theme.colors.primary }} />
          </View>
          <Text style={{ marginTop: 10, color: theme.colors.muted, fontSize: 13 }}>
            Payout progress: {completedPayoutSlots} of {configuredSlots || group.max_members || 0} slots paid • Next payout to: {nextRecipientName}
          </Text>
          <Text style={{ marginTop: 6, color: theme.colors.muted, fontSize: 13 }}>
            Members in circle: {filledSlots} of {configuredSlots || group.max_members || 0} slots filled
          </Text>
          <Text style={{ marginTop: 6, color: theme.colors.muted, fontSize: 13 }}>
            Circle end date: {projectedEndDate ? projectedEndDate.toLocaleDateString() : 'Not available'}
          </Text>

          {!isFinished ? (
            <TouchableOpacity onPress={pay} style={{ height: 66, borderRadius: 18, marginTop: 16, backgroundColor: theme.colors.primary, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ color: theme.colors.white, fontSize: 15, fontWeight: '800' }}>💳  Contribute ₦{(group.contribution_amount_kobo / 100).toLocaleString()}</Text>
            </TouchableOpacity>
          ) : null}

          {isFinished && canManageMembers ? (
            <TouchableOpacity onPress={recreateCircle} style={{ height: 56, borderRadius: 18, marginTop: 16, borderWidth: 1, borderColor: theme.colors.primary, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ color: theme.colors.primary, fontSize: 15, fontWeight: '800' }}>Start Next Circle</Text>
            </TouchableOpacity>
          ) : null}
        </View>

        <View style={{ marginTop: 20, borderTopWidth: 1, borderTopColor: theme.colors.border, paddingHorizontal: 22, paddingTop: 14 }}>
          <View style={{ borderWidth: 1, borderColor: theme.colors.border, borderRadius: 14, padding: 8, flexDirection: 'row' }}>
            {(['rotation', 'members', 'history'] as const).map(item => (
              <TouchableOpacity
                key={item}
                onPress={() => setTab(item)}
                style={{ flex: 1, height: 52, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: tab === item ? '#2A3037' : 'transparent' }}>
                <Text style={{ color: tab === item ? theme.colors.text : theme.colors.muted, fontSize: 13, fontWeight: '800', textTransform: 'capitalize' }}>{item}</Text>
              </TouchableOpacity>
            ))}
          </View>

        </View>

        {tab === 'rotation' ? (
          <View style={{ marginTop: 16, borderRadius: 20, borderWidth: 1, borderColor: theme.colors.border, backgroundColor: theme.colors.surface, padding: 16 }}>
            <Text style={{ color: theme.colors.text, fontSize: 18, fontWeight: '900' }}>Payout Schedule</Text>
            <View style={{ marginTop: 12 }}>
              {members.length ? (
                members.slice(0, 10).map((member: any, idx: number) => (
                  <View key={member.id || member.user_id || idx} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 18 }}>
                    <View style={{ width: 56, height: 56, borderRadius: 30, borderWidth: 1, borderColor: theme.colors.border, alignItems: 'center', justifyContent: 'center' }}>
                      <Text style={{ color: theme.colors.text, fontSize: 13 }}>{((member.full_name || 'M').split(' ')[0][0] || 'M') + ((member.full_name || 'M').split(' ')[1]?.[0] || '')}</Text>
                    </View>
                    <View style={{ marginLeft: 14, flex: 1 }}>
                      <Text style={{ color: theme.colors.text, fontSize: 15, fontWeight: '800' }}>{member.full_name || 'Member'}</Text>
                      <Text style={{ color: theme.colors.muted, fontSize: 13 }}>
                        Position {member.payout_position || idx + 1} • {member.status || 'ACTIVE'}
                      </Text>
                    </View>
                    <Text style={{ color: (schedule?.nextRecipient?.userId === member.user_id) ? theme.colors.primary : theme.colors.muted, fontSize: 12, fontWeight: (schedule?.nextRecipient?.userId === member.user_id) ? '800' : '400' }}>
                      {(schedule?.nextRecipient?.userId === member.user_id) ? 'Next' : `#${member.payout_position || idx + 1}`}
                    </Text>
                  </View>
                ))
              ) : (
                <Text style={{ color: theme.colors.muted, fontSize: 13 }}>No rotation records yet.</Text>
              )}
              {schedule?.isNextSlotOpen && schedule?.nextPayoutPosition ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 18 }}>
                  <View style={{ width: 56, height: 56, borderRadius: 30, borderWidth: 1, borderColor: theme.colors.border, alignItems: 'center', justifyContent: 'center' }}>
                    <Text style={{ color: theme.colors.muted, fontSize: 13 }}>--</Text>
                  </View>
                  <View style={{ marginLeft: 14, flex: 1 }}>
                    <Text style={{ color: theme.colors.text, fontSize: 15, fontWeight: '800' }}>Open Slot</Text>
                    <Text style={{ color: theme.colors.muted, fontSize: 13 }}>
                      Position {schedule.nextPayoutPosition} • waiting for member
                    </Text>
                  </View>
                  <Text style={{ color: theme.colors.primary, fontSize: 12, fontWeight: '800' }}>Next</Text>
                </View>
              ) : null}
            </View>
          </View>
        ) : null}

        {tab === 'members' ? (
          <View style={{ marginTop: 16, borderRadius: 20, borderWidth: 1, borderColor: theme.colors.border, backgroundColor: theme.colors.surface, padding: 16 }}>
            <Text style={{ color: theme.colors.text, fontSize: 18, fontWeight: '900' }}>Members</Text>
            {members.length ? members.map((member: any) => (
              <View key={member.id || member.user_id} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 10 }}>
                <View style={{ width: 52, height: 52, borderRadius: 26, backgroundColor: '#171A1F', borderWidth: 1, borderColor: theme.colors.border, alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ color: theme.colors.text, fontSize: 13, fontWeight: '700' }}>{(member.full_name || member.name || 'M').slice(0, 2).toUpperCase()}</Text>
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={{ fontWeight: '800', color: theme.colors.text, fontSize: 15 }}>{member.full_name || member.name || 'Member'}</Text>
                  <Text style={{ color: theme.colors.muted, fontSize: 13 }}>{member.role || 'MEMBER'}</Text>
                </View>
              </View>
            )) : <Text style={{ color: theme.colors.muted }}>No member details returned by the API yet.</Text>}
          </View>
        ) : null}

        {tab === 'history' ? (
          <View style={{ marginTop: 16 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={{ color: theme.colors.text, fontSize: 18, fontWeight: '900' }}>Contribution & Payout History</Text>
              <Text style={{ color: theme.colors.muted, fontSize: 12 }}>{filteredHistory.length} record(s)</Text>
            </View>
            <Input
              placeholder="Search by member, status or reference"
              value={historyQuery}
              onChangeText={setHistoryQuery}
              style={{ marginTop: 10 }}
            />
            <View style={{ marginTop: 10, flexDirection: 'row', gap: 8 }}>
              {(['ALL', 'CONTRIBUTION', 'PAYOUT'] as const).map((item) => (
                <TouchableOpacity
                  key={item}
                  onPress={() => setHistoryTypeFilter(item)}
                  style={{
                    height: 34,
                    paddingHorizontal: 12,
                    borderRadius: 17,
                    borderWidth: 1,
                    borderColor: historyTypeFilter === item ? theme.colors.primary : theme.colors.border,
                    backgroundColor: historyTypeFilter === item ? '#2A3037' : 'transparent',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                  <Text style={{ color: historyTypeFilter === item ? theme.colors.text : theme.colors.muted, fontSize: 12, fontWeight: '800' }}>{item}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={{ marginTop: 8, flexDirection: 'row', gap: 8 }}>
              {(['ALL', 'SUCCESSFUL', 'PENDING', 'FAILED'] as const).map((item) => (
                <TouchableOpacity
                  key={item}
                  onPress={() => setHistoryStatusFilter(item)}
                  style={{
                    height: 30,
                    paddingHorizontal: 10,
                    borderRadius: 15,
                    borderWidth: 1,
                    borderColor: historyStatusFilter === item ? theme.colors.primary : theme.colors.border,
                    backgroundColor: historyStatusFilter === item ? '#2A3037' : 'transparent',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                  <Text style={{ color: historyStatusFilter === item ? theme.colors.text : theme.colors.muted, fontSize: 11, fontWeight: '800' }}>{item}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={{ marginTop: 12, borderRadius: 20, borderWidth: 1, borderColor: theme.colors.border, backgroundColor: theme.colors.surface, padding: 16 }}>
            {visibleHistory.length ? visibleHistory.map((entry: any) => (
              <View key={entry.id || entry.created_at} style={{ paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: theme.colors.border, flexDirection: 'row', alignItems: 'center' }}>
                <Text style={{ fontSize: 18, color: entry.activity_type === 'PAYOUT' ? '#f4a261' : theme.colors.primary }}>
                  {entry.activity_type === 'PAYOUT' ? '💸' : '💰'}
                </Text>
                <View style={{ marginLeft: 12, flex: 1 }}>
                  <Text style={{ fontWeight: '800', color: theme.colors.text, fontSize: 15 }}>
                    {entry.activity_type === 'PAYOUT' ? 'Payout' : 'Contribution'}
                  </Text>
                  <Text style={{ color: theme.colors.muted, fontSize: 13 }}>
                    {entry.actor_name || 'Member'} • {entry.status || 'UNKNOWN'} • {entry.created_at ? new Date(entry.created_at).toLocaleString() : '-'}
                  </Text>
                </View>
                <Text style={{ color: entry.activity_type === 'PAYOUT' ? '#f4a261' : theme.colors.primary, fontSize: 13, fontWeight: '800' }}>
                  ₦{((entry.amount_kobo ?? group.contribution_amount_kobo) / 100).toLocaleString()}
                </Text>
              </View>
            )) : <Text style={{ color: theme.colors.muted }}>No history entries for this filter yet.</Text>}
            {visibleHistory.length < filteredHistory.length ? (
              <TouchableOpacity
                onPress={() => setHistoryVisibleCount((n) => n + 12)}
                style={{ marginTop: 10, height: 44, borderRadius: 12, borderWidth: 1, borderColor: theme.colors.border, alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ color: theme.colors.text, fontWeight: '800' }}>Load more</Text>
              </TouchableOpacity>
            ) : null}
            </View>
          </View>
        ) : null}

        <View style={{ marginTop: 18, borderRadius: 18, borderWidth: 1, borderColor: '#243725', backgroundColor: '#101714', padding: 18, flexDirection: 'row', alignItems: 'center' }}>
          <Text style={{ fontSize: 18, color: theme.colors.text }}>🔗</Text>
          <View style={{ marginLeft: 12, flex: 1 }}>
            <Text style={{ color: theme.colors.text, fontSize: 18, fontWeight: '900' }}>Invite Members</Text>
            <Text style={{ color: theme.colors.text, fontSize: 13, fontWeight: '700' }}>Share circle code: {group.invite_code}</Text>
            <Text style={{ color: theme.colors.muted, fontSize: 12, marginTop: 4 }}>Join link: {joinUrl}</Text>
          </View>
          <TouchableOpacity onPress={shareInviteCode}>
            <Text style={{ fontSize: 18, color: theme.colors.primary }}>⧉</Text>
          </TouchableOpacity>
        </View>

        {canManageMembers ? (
          <View style={{ marginTop: 12, borderRadius: 18, borderWidth: 1, borderColor: theme.colors.border, backgroundColor: theme.colors.surface, padding: 16 }}>
            <Text style={{ color: theme.colors.text, fontSize: 15, fontWeight: '900' }}>Add Member Manually</Text>
            <Text style={{ marginTop: 4, color: theme.colors.muted, fontSize: 13 }}>
              Enter a registered member's email or phone to add them directly.
            </Text>
            <Input
              placeholder="email@example.com or 08030000000"
              autoCapitalize="none"
              value={inviteEmailOrPhone}
              onChangeText={setInviteEmailOrPhone}
              style={{ marginTop: 10 }}
            />
            {addingMember ? <ActivityIndicator color={theme.colors.primary} style={{ marginTop: 10 }} /> : <Button title="Add Member" onPress={addMemberManually} />}
          </View>
        ) : null}

        {pendingRef ? (
          <View style={{ marginTop: 16, borderRadius: 14, borderWidth: 1, borderColor: '#F3D7A8', backgroundColor: '#FFF8E8', padding: 14 }}>
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
          </View>
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