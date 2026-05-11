import React, { useMemo, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert, ActivityIndicator, StyleSheet, TextInput, Share } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { api } from '../api/client';
import { theme } from '../theme';

interface Props {
  navigation: any;
}

const frequencies = [
  { label: '📅 Daily', value: 'DAILY' },
  { label: '📅 Weekly', value: 'WEEKLY' },
  { label: '📅 Monthly', value: 'MONTHLY' },
];

export default function CreateCircleScreen({ navigation }: Props) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [frequency, setFrequency] = useState<'DAILY' | 'WEEKLY' | 'MONTHLY'>('WEEKLY');
  const [members, setMembers] = useState(12);
  const [creating, setCreating] = useState(false);
  const [createdGroup, setCreatedGroup] = useState<any>(null);

  const total = useMemo(() => {
    const amt = Number(amount) || 0;
    return amt * members;
  }, [amount, members]);

  const estimate = useMemo(() => {
    const rounds = Math.max(1, members);
    const start = new Date();
    start.setDate(start.getDate() + 1);

    const end = new Date(start);
    if (frequency === 'DAILY') {
      end.setDate(end.getDate() + Math.max(rounds - 1, 0));
    } else if (frequency === 'WEEKLY') {
      end.setDate(end.getDate() + (7 * Math.max(rounds - 1, 0)));
    } else {
      end.setMonth(end.getMonth() + Math.max(rounds - 1, 0));
    }

    const durationLabel = frequency === 'DAILY'
      ? `${rounds} day${rounds > 1 ? 's' : ''}`
      : frequency === 'WEEKLY'
        ? `${rounds} week${rounds > 1 ? 's' : ''}`
        : `${rounds} month${rounds > 1 ? 's' : ''}`;

    return { rounds, start, end, durationLabel };
  }, [frequency, members]);

  async function submit() {
    if (!name.trim()) return Alert.alert('Circle name required');
    const contributionAmountKobo = Number(amount) * 100;
    if (!contributionAmountKobo || contributionAmountKobo < 100) return Alert.alert('Enter a valid amount');

    try {
      setCreating(true);
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const group = await api('/api/groups', {
        method: 'POST',
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim(),
          frequency,
          contributionAmountKobo,
          maxMembers: members,
          startDate: tomorrow.toISOString().slice(0, 10),
        }),
      });
      setCreatedGroup(group);
    } catch (e: any) {
      Alert.alert('Unable to create circle', e.message);
    } finally {
      setCreating(false);
    }
  }

  async function shareInvite() {
    if (!createdGroup?.invite_code) return;
    await Share.share({
      message: `Join my AjoCircle circle "${createdGroup.name}"\n\nInvite code: ${createdGroup.invite_code}\nContribution: ₦${Number(amount || 0).toLocaleString()} every ${frequency.toLowerCase()}.`,
    });
  }

  if (createdGroup) {
    return (
      <ScrollView style={{ flex: 1, backgroundColor: theme.colors.background }} contentContainerStyle={{ paddingBottom: 44 }}>
        <View style={{ height: 86, borderBottomWidth: 1, borderBottomColor: theme.colors.border, paddingHorizontal: 22, flexDirection: 'row', alignItems: 'center' }}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="chevron-back" size={24} color={theme.colors.text} />
          </TouchableOpacity>
          <Text style={{ color: theme.colors.text, marginLeft: 14, fontSize: 18, fontWeight: '800' }}>Circle Created</Text>
        </View>

        <View style={{ paddingHorizontal: 22, paddingTop: 20 }}>
          <View style={{ borderRadius: 24, borderWidth: 1, borderColor: '#274129', backgroundColor: '#101714', padding: 18 }}>
            <Text style={{ color: theme.colors.primary, fontSize: 14, fontWeight: '900' }}>Success</Text>
            <Text style={{ color: theme.colors.text, fontSize: 24, fontWeight: '900', marginTop: 8 }}>{createdGroup.name}</Text>
            <Text style={{ color: theme.colors.muted, marginTop: 8, lineHeight: 20 }}>
              Your circle is live. Share the invite code below so members can join immediately.
            </Text>

            <View style={{ marginTop: 18, padding: 16, borderRadius: 18, backgroundColor: '#1B2220', borderWidth: 1, borderColor: '#2E4D3B' }}>
              <Text style={{ color: theme.colors.muted, fontSize: 12, fontWeight: '800' }}>INVITE CODE</Text>
              <Text style={{ color: theme.colors.text, fontSize: 26, fontWeight: '900', letterSpacing: 2, marginTop: 6 }}>{createdGroup.invite_code}</Text>
              <Text style={{ color: theme.colors.muted, marginTop: 8 }}>
                ₦{Number(amount || 0).toLocaleString()} {frequency.toLowerCase()} contributions • {members} slots
              </Text>
            </View>

            <View style={{ marginTop: 18, flexDirection: 'row', gap: 10 }}>
              <TouchableOpacity onPress={() => navigation.replace('GroupDetail', { groupId: createdGroup.id })} style={{ flex: 1, height: 54, borderRadius: 16, backgroundColor: theme.colors.primary, alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ color: theme.colors.white, fontWeight: '900' }}>Open Circle</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={shareInvite} style={{ flex: 1, height: 54, borderRadius: 16, borderWidth: 1, borderColor: theme.colors.border, alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ color: theme.colors.text, fontWeight: '900' }}>Share Invite</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              onPress={() => {
                setCreatedGroup(null);
                setName('');
                setDescription('');
                setAmount('');
                setFrequency('WEEKLY');
                setMembers(12);
              }}
              style={{ marginTop: 12, height: 48, borderRadius: 14, borderWidth: 1, borderColor: theme.colors.border, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ color: theme.colors.muted, fontWeight: '800' }}>Create Another Circle</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    );
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: theme.colors.background }} contentContainerStyle={{ paddingBottom: 44 }}>
      <View style={{ height: 86, borderBottomWidth: 1, borderBottomColor: theme.colors.border, paddingHorizontal: 22, flexDirection: 'row', alignItems: 'center' }}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={{ color: theme.colors.text, marginLeft: 14, fontSize: 18, fontWeight: '800' }}>Create New Circle</Text>
      </View>

      <View style={{ paddingHorizontal: 22, paddingTop: 16 }}>
        <Text style={{ color: theme.colors.text, fontSize: 20, fontWeight: '900', marginTop: 4 }}>Name your Circle</Text>

        <Label label="Circle Name" />
        <Field value={name} onChangeText={setName} placeholder="e.g., December Payout Group" />

        <Label label="Description (Optional)" />
        <Field value={description} onChangeText={setDescription} placeholder="What is this group saving for?" height={70} />

        <Text style={{ color: theme.colors.text, fontSize: 20, fontWeight: '900', marginTop: 22 }}>Set Contribution Amount</Text>

        <Label label="Contribution Amount" />
        <Field value={amount} onChangeText={setAmount} placeholder="0.00" keyboardType="numeric" />
        <Text style={{ color: theme.colors.muted, fontSize: 14, marginTop: 8 }}>Amount each member pays per cycle</Text>

        <Label label="How often does everyone pay?" />
        <View style={{ gap: 10, marginTop: 10 }}>
          {frequencies.map(item => (
            <TouchableOpacity
              key={item.value}
              onPress={() => setFrequency(item.value as any)}
              style={{
                height: 56,
                borderRadius: 16,
                borderWidth: 2,
                borderColor: frequency === item.value ? theme.colors.primary : theme.colors.border,
                backgroundColor: frequency === item.value ? '#1C2B1E' : theme.colors.surface,
                alignItems: 'center',
                justifyContent: 'center',
                flexDirection: 'row',
              }}>
              <Text style={{ color: frequency === item.value ? theme.colors.primary : theme.colors.muted, fontWeight: '800', fontSize: 15 }}>{item.label}</Text>
              {frequency === item.value && <Text style={{ color: theme.colors.primary, marginLeft: 8, fontSize: 15 }}>✓</Text>}
            </TouchableOpacity>
          ))}
        </View>

        <Text style={{ color: theme.colors.text, fontSize: 20, fontWeight: '900', marginTop: 24 }}>How many people join?</Text>

        <View style={{ marginTop: 16, borderRadius: 20, borderWidth: 1, borderColor: theme.colors.border, backgroundColor: theme.colors.surface, padding: 16 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <View>
              <Text style={{ color: theme.colors.text, fontWeight: '800', fontSize: 16 }}>Number of Slots</Text>
              <Text style={{ color: theme.colors.muted, fontSize: 13, marginTop: 2 }}>Maximum 20 members</Text>
            </View>
            <View style={{ width: 70, height: 52, borderRadius: 12, borderWidth: 1, borderColor: theme.colors.border, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ color: theme.colors.primary, fontSize: 16, fontWeight: '900' }}>{members}</Text>
            </View>
          </View>

          <Text style={{ color: theme.colors.text, fontWeight: '800', fontSize: 16, marginTop: 16 }}>Adjust capacity</Text>
          <View style={{ marginTop: 14, height: 6, borderRadius: 4, backgroundColor: '#343941' }}>
            <View style={{ width: `${Math.round((members / 20) * 100)}%`, height: '100%', backgroundColor: theme.colors.primary, borderRadius: 4 }} />
            <View style={{ position: 'absolute', left: `${Math.round((members / 20) * 100)}%`, marginLeft: -10, top: -7, width: 20, height: 20, borderRadius: 10, backgroundColor: theme.colors.primary }} />
          </View>
          <View style={{ marginTop: 14, flexDirection: 'row', justifyContent: 'center', gap: 16 }}>
            <TouchableOpacity onPress={() => setMembers(prev => Math.max(3, prev - 1))} style={[slotButtonStyle.button, { width: 56, height: 56, borderRadius: 28 }]}><Text style={[slotButtonStyle.text, { fontSize: 22 }]}>−</Text></TouchableOpacity>
            <TouchableOpacity onPress={() => setMembers(prev => Math.min(20, prev + 1))} style={[slotButtonStyle.button, { width: 56, height: 56, borderRadius: 28 }]}><Text style={[slotButtonStyle.text, { fontSize: 22 }]}>+</Text></TouchableOpacity>
          </View>

          <View style={{ marginTop: 18, borderTopWidth: 1, borderTopColor: theme.colors.border, paddingTop: 14, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={{ color: theme.colors.muted, fontSize: 14 }}>Total Payout Pot</Text>
            <Text style={{ color: theme.colors.primary, fontSize: 16, fontWeight: '900' }}>N{total.toLocaleString()}.00</Text>
          </View>

          <View style={{ marginTop: 12, borderRadius: 12, borderWidth: 1, borderColor: '#243725', backgroundColor: '#101714', padding: 12 }}>
            <Text style={{ color: theme.colors.text, fontSize: 13, fontWeight: '800' }}>
              Estimated circle duration: {estimate.durationLabel}
            </Text>
            <Text style={{ color: theme.colors.muted, fontSize: 12, marginTop: 4 }}>
              Projected end date: {estimate.end.toLocaleDateString()}
            </Text>
            <Text style={{ color: theme.colors.mutedSoft, fontSize: 11, marginTop: 4 }}>
              Based on one payout per cycle and {estimate.rounds} member slot{estimate.rounds > 1 ? 's' : ''}.
            </Text>
          </View>
        </View>

        <View style={{ marginTop: 16, borderRadius: 14, borderWidth: 1, borderColor: theme.colors.border, backgroundColor: theme.colors.surface, padding: 14 }}>
          <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
            <MaterialCommunityIcons name="information-outline" size={18} color={theme.colors.muted} style={{ marginTop: 2, marginRight: 8 }} />
            <Text style={{ color: theme.colors.muted, fontSize: 13, flex: 1, lineHeight: 18 }}>
              By creating this circle, you become the Group Admin and are responsible for approving the rotation schedule.
            </Text>
          </View>
        </View>

        <View style={{ marginTop: 16, borderRadius: 18, borderWidth: 1, borderColor: theme.colors.border, backgroundColor: theme.colors.surface, padding: 16 }}>
          <Text style={{ color: theme.colors.text, fontSize: 16, fontWeight: '900' }}>Review</Text>
          <Text style={{ color: theme.colors.muted, marginTop: 6, lineHeight: 20 }}>
            Circle starts tomorrow, so members have a full cycle window to join before the first contribution is due.
          </Text>
          <View style={{ marginTop: 12, gap: 8 }}>
            <ReviewRow label="Name" value={name.trim() || 'Untitled circle'} />
            <ReviewRow label="Contribution" value={`₦${Number(amount || 0).toLocaleString()} / ${frequency.toLowerCase()}`} />
            <ReviewRow label="Capacity" value={`${members} members`} />
            <ReviewRow label="Projected pot" value={`₦${total.toLocaleString()}.00`} />
          </View>
        </View>

        {creating ? (
          <ActivityIndicator color={theme.colors.primary} style={{ marginTop: 18 }} />
        ) : (
          <TouchableOpacity onPress={submit} style={{ marginTop: 18, height: 64, borderRadius: 18, backgroundColor: theme.colors.primary, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ color: theme.colors.white, fontSize: 15, fontWeight: '800' }}>Create Circle & Invite Members</Text>
          </TouchableOpacity>
        )}
      </View>
    </ScrollView>
  );
}

function Label({ label }: { label: string }) {
  return <Text style={{ color: theme.colors.text, fontSize: 15, fontWeight: '700', marginTop: 18 }}>{label}</Text>;
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12 }}>
      <Text style={{ color: theme.colors.muted, fontSize: 13, fontWeight: '700' }}>{label}</Text>
      <Text style={{ color: theme.colors.text, fontSize: 13, fontWeight: '800', textAlign: 'right', flexShrink: 1 }}>{value}</Text>
    </View>
  );
}

function Field(props: any) {
  return (
    <TextInput
      {...props}
      placeholderTextColor={theme.colors.mutedSoft}
      style={{ marginTop: 8, height: props.height || 56, borderWidth: 1, borderColor: theme.colors.border, borderRadius: 14, color: theme.colors.text, fontSize: 15, paddingHorizontal: 16 }}
    />
  );
}

const slotButtonStyle = StyleSheet.create({
  button: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.surface,
  },
  text: {
    color: theme.colors.text,
    fontSize: 18,
    fontWeight: '900',
    lineHeight: 20,
  },
});
