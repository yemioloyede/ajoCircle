import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, ScrollView, RefreshControl, ActivityIndicator, Linking } from 'react-native';
import { Card, Button } from '../components/ui';
import { api } from '../api/client';

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

  async function load() {
    try {
      const [g, a] = await Promise.all([
        api(`/api/groups/${groupId}`),
        api(`/api/groups/${groupId}/analytics`),
      ]);
      setGroup(g.group || g);
      setAnalytics(a);
    } catch (e: any) { setErr(e.message); }
  }

  const refresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [groupId]);

  useEffect(() => { load().finally(() => setLoading(false)); }, [groupId]);

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
      if (url) await Linking.openURL(url);
      else setMsg('Payment initialized — check your notifications.');
    } catch (e: any) { setErr(e.message); }
    finally { setPaying(false); }
  }

  if (loading) return <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}><ActivityIndicator color="#0B6B45" size="large" /></View>;

  if (!group) return <View style={{ flex: 1, padding: 18 }}><Text style={{ color: 'red' }}>{err || 'Group not found'}</Text></View>;

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: '#F2F7F4', padding: 18 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor="#0B6B45" />}>
      <Text style={{ fontSize: 26, fontWeight: '900', color: '#082017', marginBottom: 4 }}>{group.name}</Text>
      {msg ? <Text style={{ color: '#0b6b45', fontWeight: '700', marginBottom: 8 }}>{msg}</Text> : null}
      {err ? <Text style={{ color: 'red', marginBottom: 8 }}>{err}</Text> : null}

      <Card>
        <Text style={{ fontWeight: '700', marginBottom: 6 }}>Details</Text>
        <Text>Frequency: {group.frequency}</Text>
        <Text>Contribution: ₦{(group.contribution_amount_kobo / 100).toLocaleString()}</Text>
        <Text>Members: {group.max_members}</Text>
        <Text>Invite Code: {group.invite_code}</Text>
        <Text>Status: <Text style={{ color: group.status === 'ACTIVE' ? '#0b6b45' : '#c62828', fontWeight: '700' }}>{group.status}</Text></Text>
      </Card>

      {analytics && (
        <Card>
          <Text style={{ fontWeight: '700', marginBottom: 6 }}>Analytics</Text>
          <Text>Total Contributed: ₦{(analytics.totalContributionsKobo / 100).toLocaleString()}</Text>
          <Text>Contributions: {analytics.contributionCount}</Text>
          <Text>Active Members: {analytics.activeMemberCount}</Text>
          <Text>Completion: {analytics.completionRate}%</Text>
          <Text>Successful Payouts: {analytics.successfulPayouts}</Text>
        </Card>
      )}

      {group.status === 'ACTIVE' && (
        paying
          ? <ActivityIndicator color="#0B6B45" style={{ marginTop: 16 }} />
          : <Button title="Contribute with Paystack" onPress={pay} />
      )}
      <View style={{ height: 40 }} />
    </ScrollView>
  );
}
