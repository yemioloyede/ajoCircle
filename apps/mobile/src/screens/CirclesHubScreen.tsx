import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, RefreshControl, ActivityIndicator, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api } from '../api/client';
import { theme } from '../theme';

const CIRCLE_TYPES = [
  { key: 'all', label: 'All' },
  { key: 'savings', label: '💰 Savings' },
  { key: 'event', label: '🎉 Events' },
  { key: 'family', label: '👪 Family' },
  { key: 'travel', label: '✈️ Travel' },
  { key: 'invest', label: '📈 Invest' },
];

interface Props {
  navigation?: any;
}

export default function CirclesHubScreen({ navigation }: Props) {
  const [groups, setGroups] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [tab, setTab] = useState('all');
  const [search, setSearch] = useState('');

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

  useEffect(() => { load().finally(() => setLoading(false)); }, [load]);

  const filtered = groups.filter(g =>
    (!search || g.name?.toLowerCase().includes(search.toLowerCase()))
  );

  if (loading) return <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.colors.background }}><ActivityIndicator color={theme.colors.primary} size="large" /></View>;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background }} edges={['left', 'right', 'top']}>
      <FlatList
        data={filtered}
        keyExtractor={item => item.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={theme.colors.primary} />}
        contentContainerStyle={{ paddingHorizontal: 22, paddingBottom: 100 }}
        ListHeaderComponent={
          <>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 20, marginBottom: 14 }}>
              <Text style={{ color: theme.colors.text, fontSize: 26, fontWeight: '900' }}>Circles</Text>
              <TouchableOpacity onPress={() => navigation?.navigate('CreateCircle')} style={{ height: 44, paddingHorizontal: 18, borderRadius: 22, backgroundColor: theme.colors.primary, alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ color: theme.colors.white, fontWeight: '900', fontSize: 15 }}>+ New</Text>
              </TouchableOpacity>
            </View>

            <TextInput
              style={{ height: 52, borderRadius: 14, borderWidth: 1, borderColor: theme.colors.border, backgroundColor: theme.colors.surface, color: theme.colors.text, paddingHorizontal: 16, fontSize: 15, marginBottom: 16 }}
              placeholder="Search circles..."
              placeholderTextColor={theme.colors.mutedSoft}
              value={search}
              onChangeText={setSearch}
            />

            <FlatList
              data={CIRCLE_TYPES}
              horizontal
              showsHorizontalScrollIndicator={false}
              keyExtractor={i => i.key}
              contentContainerStyle={{ gap: 10, marginBottom: 18 }}
              renderItem={({ item }) => (
                <TouchableOpacity
                  onPress={() => setTab(item.key)}
                  style={{ height: 40, paddingHorizontal: 16, borderRadius: 20, backgroundColor: tab === item.key ? theme.colors.primary : theme.colors.surface, borderWidth: 1, borderColor: tab === item.key ? theme.colors.primary : theme.colors.border, alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ color: tab === item.key ? theme.colors.white : theme.colors.muted, fontWeight: '700', fontSize: 14 }}>{item.label}</Text>
                </TouchableOpacity>
              )}
            />
          </>
        }
        ListEmptyComponent={
          <View style={{ marginTop: 40, alignItems: 'center', padding: 28 }}>
            <Text style={{ fontSize: 52 }}>🔍</Text>
            <Text style={{ color: theme.colors.text, fontSize: 20, fontWeight: '900', marginTop: 18, textAlign: 'center' }}>No circles yet</Text>
            <Text style={{ color: theme.colors.muted, fontSize: 15, marginTop: 10, textAlign: 'center' }}>Start a new circle or join one with an invite code.</Text>
            <TouchableOpacity onPress={() => navigation?.navigate('CreateCircle')} style={{ marginTop: 22, height: 56, paddingHorizontal: 28, borderRadius: 18, backgroundColor: theme.colors.primary, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ color: theme.colors.white, fontWeight: '900', fontSize: 16 }}>Create a Circle</Text>
            </TouchableOpacity>
          </View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity onPress={() => navigation?.navigate('GroupDetail', { groupId: item.id })}
            style={{ marginBottom: 14, borderRadius: 20, borderWidth: 1, borderColor: theme.colors.border, backgroundColor: theme.colors.surface, padding: 18 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
              <View style={{ width: 54, height: 54, borderRadius: 14, backgroundColor: '#182018', alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ fontSize: 22 }}>👥</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: theme.colors.text, fontSize: 16, fontWeight: '900' }}>{item.name}</Text>
                <Text style={{ color: theme.colors.muted, fontSize: 14, marginTop: 4 }}>
                  ₦{(item.contribution_amount_kobo / 100).toLocaleString()} / {item.frequency?.toLowerCase()} • {item.member_count ?? '--'} members
                </Text>
              </View>
              <View style={{ alignItems: 'flex-end', gap: 6 }}>
                <View style={{ backgroundColor: '#182018', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4 }}>
                  <Text style={{ color: theme.colors.primary, fontSize: 12, fontWeight: '800' }}>{item.status || 'Active'}</Text>
                </View>
              </View>
            </View>
          </TouchableOpacity>
        )}
      />
    </SafeAreaView>
  );
}
