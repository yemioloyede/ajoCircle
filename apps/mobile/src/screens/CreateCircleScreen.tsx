import React, { useMemo, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert, ActivityIndicator, StyleSheet, TextInput } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { api } from '../api/client';
import { theme } from '../theme';

interface Props {
  navigation: any;
}

const frequencies = [
  { label: 'D', value: 'DAILY' },
  { label: 'W', value: 'WEEKLY' },
  { label: 'M', value: 'MONTHLY' },
];

export default function CreateCircleScreen({ navigation }: Props) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [frequency, setFrequency] = useState<'DAILY' | 'WEEKLY' | 'MONTHLY'>('WEEKLY');
  const [members, setMembers] = useState(12);
  const [creating, setCreating] = useState(false);

  const total = useMemo(() => {
    const amt = Number(amount) || 0;
    return amt * members;
  }, [amount, members]);

  async function submit() {
    if (!name.trim()) return Alert.alert('Circle name required');
    const contributionAmountKobo = Number(amount) * 100;
    if (!contributionAmountKobo || contributionAmountKobo < 100) return Alert.alert('Enter a valid amount');

    try {
      setCreating(true);
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      await api('/api/groups', {
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
      navigation.goBack();
    } catch (e: any) {
      Alert.alert('Unable to create circle', e.message);
    } finally {
      setCreating(false);
    }
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
        <Text style={{ color: theme.colors.primary, fontSize: 16, fontWeight: '800' }}>Step 1 of 3</Text>
        <Text style={{ color: theme.colors.text, fontSize: 18, fontWeight: '900', marginTop: 4 }}>General Information</Text>

        <Label label="Circle Name" />
        <Field value={name} onChangeText={setName} placeholder="e.g., December Payout Group" />

        <Label label="Description (Optional)" />
        <Field value={description} onChangeText={setDescription} placeholder="What is this group saving for?" height={70} />

        <Text style={{ color: theme.colors.primary, fontSize: 16, fontWeight: '800', marginTop: 22 }}>Step 2 of 3</Text>
        <Text style={{ color: theme.colors.text, fontSize: 18, fontWeight: '900', marginTop: 4 }}>Contribution Rules</Text>

        <Label label="Contribution Amount" />
        <Field value={amount} onChangeText={setAmount} placeholder="0.00" keyboardType="numeric" />
        <Text style={{ color: theme.colors.muted, fontSize: 14, marginTop: 8 }}>Amount each member pays per cycle</Text>

        <Label label="Contribution Frequency" />
        <View style={{ flexDirection: 'row', gap: 12, marginTop: 8 }}>
          {frequencies.map(item => (
            <TouchableOpacity
              key={item.value}
              onPress={() => setFrequency(item.value as any)}
              style={{
                width: 42,
                height: 42,
                borderRadius: 21,
                borderWidth: 1,
                borderColor: frequency === item.value ? theme.colors.primary : theme.colors.border,
                backgroundColor: frequency === item.value ? '#2A3037' : theme.colors.surface,
                alignItems: 'center',
                justifyContent: 'center',
              }}>
              <Text style={{ color: frequency === item.value ? theme.colors.text : theme.colors.muted, fontWeight: '900' }}>{item.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={{ color: theme.colors.primary, fontSize: 16, fontWeight: '800', marginTop: 24 }}>Step 3 of 3</Text>
        <Text style={{ color: theme.colors.text, fontSize: 18, fontWeight: '900', marginTop: 4 }}>Member Slots</Text>

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
          <View style={{ marginTop: 14, flexDirection: 'row', justifyContent: 'center', gap: 10 }}>
            <TouchableOpacity onPress={() => setMembers(prev => Math.max(3, prev - 1))} style={slotButtonStyle.button}><Text style={slotButtonStyle.text}>-</Text></TouchableOpacity>
            <TouchableOpacity onPress={() => setMembers(prev => Math.min(20, prev + 1))} style={slotButtonStyle.button}><Text style={slotButtonStyle.text}>+</Text></TouchableOpacity>
          </View>

          <View style={{ marginTop: 18, borderTopWidth: 1, borderTopColor: theme.colors.border, paddingTop: 14, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={{ color: theme.colors.muted, fontSize: 14 }}>Total Payout Pot</Text>
            <Text style={{ color: theme.colors.primary, fontSize: 16, fontWeight: '900' }}>N{total.toLocaleString()}.00</Text>
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
  return <Text style={{ color: theme.colors.text, fontSize: 13, fontWeight: '700', marginTop: 16 }}>{label}</Text>;
}

function Field(props: any) {
  return (
    <TextInput
      {...props}
      placeholderTextColor={theme.colors.mutedSoft}
      style={{ marginTop: 8, height: props.height || 52, borderWidth: 1, borderColor: theme.colors.border, borderRadius: 12, color: theme.colors.text, fontSize: 13, paddingHorizontal: 14 }}
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
