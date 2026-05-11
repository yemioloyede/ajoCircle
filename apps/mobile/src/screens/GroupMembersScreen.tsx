import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, ActivityIndicator, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api } from '../api/client';
import { theme } from '../theme';

interface Props {
  navigation?: any;
  route?: { params?: { groupId: string } };
}

export default function GroupMembersScreen({ navigation, route }: Props) {
  const groupId = route?.params?.groupId;
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!groupId) return;
    api(`/api/groups/${groupId}/members`)
      .then(j => setMembers(Array.isArray(j) ? j : j.members || []))
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [groupId]);

  const roleColor = (role: string) => role === 'ADMIN' ? theme.colors.warning : theme.colors.primary;

  if (loading) return <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.colors.background }}><ActivityIndicator color={theme.colors.primary} size="large" /></View>;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background }} edges={['left', 'right', 'top']}>
      <View style={{ paddingHorizontal: 24, paddingTop: 16, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: theme.colors.border, flexDirection: 'row', alignItems: 'center', gap: 14 }}>
        <TouchableOpacity onPress={() => navigation?.goBack()}>
          <Text style={{ color: theme.colors.primary, fontSize: 22 }}>←</Text>
        </TouchableOpacity>
        <Text style={{ color: theme.colors.text, fontSize: 22, fontWeight: '900' }}>Members</Text>
        <View style={{ marginLeft: 'auto', backgroundColor: theme.colors.surface, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 5, borderWidth: 1, borderColor: theme.colors.border }}>
          <Text style={{ color: theme.colors.muted, fontWeight: '700', fontSize: 14 }}>{members.length} people</Text>
        </View>
      </View>

      {error ? <Text style={{ color: theme.colors.danger, margin: 24, fontWeight: '700' }}>{error}</Text> : null}

      <FlatList
        data={members}
        keyExtractor={item => item.id || item.user_id}
        contentContainerStyle={{ paddingHorizontal: 22, paddingVertical: 16, gap: 12 }}
        ListEmptyComponent={<Text style={{ color: theme.colors.muted, textAlign: 'center', marginTop: 40, fontSize: 15 }}>No members yet.</Text>}
        renderItem={({ item, index }) => {
          const initials = (item.full_name || item.name || '?').split(' ').slice(0, 2).map((p: string) => p[0]).join('').toUpperCase();
          const colors = [theme.colors.primary, theme.colors.secondary, theme.colors.accent, theme.colors.warning];
          const bg = colors[index % colors.length];
          return (
            <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: theme.colors.surface, borderRadius: 18, padding: 16, borderWidth: 1, borderColor: theme.colors.border }}>
              <View style={{ width: 50, height: 50, borderRadius: 25, backgroundColor: bg, alignItems: 'center', justifyContent: 'center', marginRight: 14 }}>
                <Text style={{ color: theme.colors.white, fontWeight: '900', fontSize: 16 }}>{initials}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: theme.colors.text, fontSize: 15, fontWeight: '800' }}>{item.full_name || item.name || 'Member'}</Text>
                <Text style={{ color: theme.colors.muted, fontSize: 13, marginTop: 3 }}>Slot #{item.payout_order ?? index + 1}</Text>
              </View>
              <View style={{ gap: 6, alignItems: 'flex-end' }}>
                <View style={{ backgroundColor: '#1A1C20', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1, borderColor: roleColor(item.role) }}>
                  <Text style={{ color: roleColor(item.role), fontSize: 12, fontWeight: '800' }}>{item.role || 'MEMBER'}</Text>
                </View>
                <Text style={{ color: item.status === 'ACTIVE' ? theme.colors.primary : theme.colors.muted, fontSize: 12, fontWeight: '700' }}>{item.status || 'Active'}</Text>
              </View>
            </View>
          );
        }}
      />
    </SafeAreaView>
  );
}
