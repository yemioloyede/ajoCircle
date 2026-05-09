import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, ScrollView, RefreshControl, ActivityIndicator, Linking, Alert } from 'react-native';
import { Button, Card, Input } from '../components/ui';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';

interface Props {
  navigation?: any;
}

export default function HomeScreen({ navigation }: Props) {
  const { user } = useAuth();
  const [groups, setGroups] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [name, setName] = useState('');
  const [freq, setFreq] = useState('WEEKLY');
  const [amount, setAmount] = useState('5000');
  const [invite, setInvite] = useState('');
  const [creating, setCreating] = useState(false);
  const [joining, setJoining] = useState(false);
  const [err, setErr] = useState('');

  const load = useCallback(async () => {
    try {
      const j = await api('/api/groups');
      setGroups(Array.isArray(j) ? j : j.groups || []);
    } catch { /* ignore */ }
  }, []);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  useEffect(() => { load().finally(() => setLoading(false)); }, [load]);

  async function create() {
    if (!name.trim()) { setErr('Enter a group name'); return; }
    const amtKobo = Number(amount) * 100;
    if (isNaN(amtKobo) || amtKobo < 100) { setErr('Amount must be at least ₦1'); return; }
    setCreating(true);
    setErr('');
    try {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      await api('/api/groups', {
        method: 'POST',
        body: JSON.stringify({
          name: name.trim(),
          frequency: freq.toUpperCase() as any,
          contributionAmountKobo: amtKobo,
          maxMembers: 10,
          startDate: tomorrow.toISOString().slice(0, 10),
        }),
      });
      setName('');
      await load();
    } catch (e: any) { setErr(e.message); }
    finally { setCreating(false); }
  }

  async function join() {
    if (!invite.trim()) { setErr('Enter an invite code'); return; }
    setJoining(true);
    setErr('');
    try {
      await api('/api/groups/join', { method: 'POST', body: JSON.stringify({ inviteCode: invite.trim() }) });
      setInvite('');
      await load();
    } catch (e: any) { setErr(e.message); }
    finally { setJoining(false); }
  }

  async function pay(groupId: string) {
    try {
      const j = await api('/api/contributions/initialize', {
        method: 'POST',
        body: JSON.stringify({ groupId }),
      });
      const url = j.payment?.authorization_url;
      if (url) {
        const canOpen = await Linking.canOpenURL(url);
        if (canOpen) await Linking.openURL(url);
        else Alert.alert('Cannot open payment link', url);
      }
    } catch (e: any) { Alert.alert('Error', e.message); }
  }

  if (loading) {
    return <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}><ActivityIndicator color="#0B6B45" size="large" /></View>;
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: '#F2F7F4', padding: 18 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor="#0B6B45" />}>
      <Text style={{ fontSize: 30, fontWeight: '900', color: '#082017' }}>Hello, {user?.full_name?.split(' ')[0] || 'there'} 👋</Text>
      <Text style={{ color: '#52655c', marginBottom: 16 }}>Manage your savings circles.</Text>

      {err ? <Text style={{ color: 'red', marginBottom: 8, fontWeight: '700' }}>{err}</Text> : null}

      <Card>
        <Text style={{ fontSize: 20, fontWeight: '800', marginBottom: 8 }}>Create Savings Circle</Text>
        <Input placeholder="Group name" value={name} onChangeText={setName} />
        <Input placeholder="Frequency: DAILY, WEEKLY, MONTHLY" value={freq} onChangeText={setFreq} autoCapitalize="characters" />
        <Input placeholder="Contribution amount in ₦" keyboardType="numeric" value={amount} onChangeText={setAmount} />
        {creating ? <ActivityIndicator color="#0B6B45" /> : <Button title="Create Group" onPress={create} />}
      </Card>

      <Card>
        <Text style={{ fontSize: 20, fontWeight: '800', marginBottom: 8 }}>Join Circle</Text>
        <Input placeholder="Invite code" value={invite} onChangeText={setInvite} autoCapitalize="none" />
        {joining ? <ActivityIndicator color="#0B6B45" /> : <Button title="Join Group" onPress={join} />}
      </Card>

      <Text style={{ fontSize: 22, fontWeight: '900', marginTop: 12, marginBottom: 8 }}>My Groups ({groups.length})</Text>
      {groups.length === 0 && <Text style={{ color: '#888', marginBottom: 16 }}>No groups yet. Create or join one above.</Text>}
      {groups.map(g => (
        <Card key={g.id}>
          <Text style={{ fontSize: 19, fontWeight: '800' }}>{g.name}</Text>
          <Text style={{ color: '#52655c' }}>{g.frequency} • ₦{(g.contribution_amount_kobo / 100).toLocaleString()}</Text>
          <Text style={{ color: '#888', fontSize: 12 }}>Invite: {g.invite_code}</Text>
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
            <Button title="Contribute" onPress={() => pay(g.id)} />
            {navigation && (
              <Button title="Details" onPress={() => navigation.navigate('GroupDetail', { groupId: g.id })} />
            )}
          </View>
        </Card>
      ))}
      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

