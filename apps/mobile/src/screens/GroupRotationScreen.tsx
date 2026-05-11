import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, ActivityIndicator, TouchableOpacity, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api } from '../api/client';
import { theme } from '../theme';

interface Props {
  navigation?: any;
  route?: { params?: { groupId: string; groupName?: string } };
}

export default function GroupRotationScreen({ navigation, route }: Props) {
  const { groupId, groupName } = route?.params || {};
  const [members, setMembers] = useState<any[]>([]);
  const [group, setGroup] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  async function load() {
    try {
      const [groupRes, membersRes] = await Promise.allSettled([
        api(`/api/groups/${groupId}`),
        api(`/api/groups/${groupId}/members`),
      ]);
      if (groupRes.status === 'fulfilled') setGroup(groupRes.value);
      if (membersRes.status === 'fulfilled') {
        const m = membersRes.value;
        setMembers(Array.isArray(m) ? m : m.members || []);
      }
    } catch {}
  }

  useEffect(() => { load().finally(() => setLoading(false)); }, [groupId]);

  const sorted = [...members].sort((a, b) => (a.payout_order ?? 99) - (b.payout_order ?? 99));

  if (loading) return <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.colors.background }}><ActivityIndicator color={theme.colors.primary} size="large" /></View>;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background }} edges={['left', 'right', 'top']}>
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} tintColor={theme.colors.primary} />}>

        <View style={{ flexDirection: 'row', alignItems: 'center', paddingTop: 20, marginBottom: 24, gap: 14 }}>
          <TouchableOpacity onPress={() => navigation?.goBack()}>
            <Text style={{ color: theme.colors.primary, fontSize: 22 }}>←</Text>
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={{ color: theme.colors.text, fontSize: 22, fontWeight: '900' }}>Payout Rotation</Text>
            {groupName ? <Text style={{ color: theme.colors.muted, fontSize: 14, marginTop: 2 }}>{groupName}</Text> : null}
          </View>
        </View>

        {group && (
          <View style={{ backgroundColor: theme.colors.surface, borderRadius: 20, padding: 18, borderWidth: 1, borderColor: theme.colors.border, marginBottom: 22 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <View>
                <Text style={{ color: theme.colors.muted, fontSize: 13, fontWeight: '700' }}>Contribution</Text>
                <Text style={{ color: theme.colors.text, fontSize: 20, fontWeight: '900', marginTop: 4 }}>₦{(group.contribution_amount_kobo / 100).toLocaleString()}</Text>
              </View>
              <View>
                <Text style={{ color: theme.colors.muted, fontSize: 13, fontWeight: '700' }}>Frequency</Text>
                <Text style={{ color: theme.colors.text, fontSize: 20, fontWeight: '900', marginTop: 4 }}>{group.frequency}</Text>
              </View>
              <View>
                <Text style={{ color: theme.colors.muted, fontSize: 13, fontWeight: '700' }}>Members</Text>
                <Text style={{ color: theme.colors.text, fontSize: 20, fontWeight: '900', marginTop: 4 }}>{sorted.length}</Text>
              </View>
            </View>
          </View>
        )}

        <Text style={{ color: theme.colors.text, fontSize: 18, fontWeight: '900', marginBottom: 14 }}>Payout Order</Text>

        {sorted.length === 0 ? (
          <Text style={{ color: theme.colors.muted, fontSize: 15, textAlign: 'center', marginTop: 24 }}>No members assigned yet.</Text>
        ) : sorted.map((member, index) => {
          const isPaid = member.has_received_payout;
          const isCurrent = !isPaid && index === sorted.findIndex(m => !m.has_received_payout);
          return (
            <View key={member.id || member.user_id}
              style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12, backgroundColor: isCurrent ? '#1C2B1E' : theme.colors.surface, borderRadius: 18, padding: 16, borderWidth: 1.5, borderColor: isCurrent ? theme.colors.primary : theme.colors.border }}>
              <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: isPaid ? '#182018' : isCurrent ? theme.colors.primary : theme.colors.border, alignItems: 'center', justifyContent: 'center', marginRight: 14 }}>
                <Text style={{ color: isPaid ? theme.colors.primary : isCurrent ? theme.colors.white : theme.colors.muted, fontWeight: '900', fontSize: 15 }}>
                  {isPaid ? '✓' : `${index + 1}`}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: theme.colors.text, fontSize: 15, fontWeight: '800' }}>{member.full_name || member.name || 'Member'}</Text>
                {isCurrent && <Text style={{ color: theme.colors.primary, fontSize: 13, fontWeight: '700', marginTop: 3 }}>🎯 Up next to receive payout</Text>}
                {isPaid && <Text style={{ color: theme.colors.muted, fontSize: 13, marginTop: 3 }}>Payout received ✓</Text>}
              </View>
              <Text style={{ color: theme.colors.muted, fontSize: 13, fontWeight: '700' }}>#{member.payout_order ?? index + 1}</Text>
            </View>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}
