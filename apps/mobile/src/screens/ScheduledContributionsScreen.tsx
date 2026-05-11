import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, FlatList, RefreshControl, ActivityIndicator, TouchableOpacity, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api } from '../api/client';
import { theme } from '../theme';

interface Props {
  navigation?: any;
}

export default function ScheduledContributionsScreen({ navigation }: Props) {
  const [schedules, setSchedules] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const j = await api('/api/contributions/scheduled');
      setSchedules(Array.isArray(j) ? j : j.schedules || []);
    } catch {
      setSchedules([]);
    }
  }, []);

  const refresh = useCallback(async () => {
    setRefreshing(true); await load(); setRefreshing(false);
  }, [load]);

  useEffect(() => { load().finally(() => setLoading(false)); }, [load]);

  if (loading) return <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.colors.background }}><ActivityIndicator color={theme.colors.primary} size="large" /></View>;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background }} edges={['left', 'right', 'top']}>
      <FlatList
        data={schedules}
        keyExtractor={(_, i) => String(i)}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={theme.colors.primary} />}
        contentContainerStyle={{ paddingHorizontal: 22, paddingBottom: 40 }}
        ListHeaderComponent={
          <>
            <View style={{ flexDirection: 'row', alignItems: 'center', paddingTop: 20, marginBottom: 22, gap: 14 }}>
              <TouchableOpacity onPress={() => navigation?.goBack()}>
                <Text style={{ color: theme.colors.primary, fontSize: 22 }}>←</Text>
              </TouchableOpacity>
              <Text style={{ color: theme.colors.text, fontSize: 22, fontWeight: '900' }}>Auto-Pay</Text>
            </View>
            <View style={{ backgroundColor: '#101714', borderRadius: 18, padding: 18, borderWidth: 1, borderColor: '#274129', marginBottom: 22 }}>
              <Text style={{ color: theme.colors.primary, fontSize: 15, fontWeight: '800' }}>🔁 Never miss a contribution</Text>
              <Text style={{ color: theme.colors.muted, fontSize: 14, marginTop: 8, lineHeight: 22 }}>
                Enable auto-pay on a circle to have your contribution sent automatically on the due date.
              </Text>
            </View>
          </>
        }
        ListEmptyComponent={
          <View style={{ alignItems: 'center', marginTop: 40 }}>
            <Text style={{ fontSize: 48 }}>🔁</Text>
            <Text style={{ color: theme.colors.text, fontSize: 20, fontWeight: '900', marginTop: 18, textAlign: 'center' }}>No schedules set up</Text>
            <Text style={{ color: theme.colors.muted, fontSize: 15, marginTop: 10, textAlign: 'center' }}>Enable auto-pay from your circle settings to get started.</Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={{ backgroundColor: theme.colors.surface, borderRadius: 18, padding: 16, borderWidth: 1, borderColor: theme.colors.border, marginBottom: 12 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <View style={{ flex: 1 }}>
                <Text style={{ color: theme.colors.text, fontSize: 15, fontWeight: '800' }}>{item.group_name || 'Circle'}</Text>
                <Text style={{ color: theme.colors.muted, fontSize: 13, marginTop: 4 }}>
                  ₦{((item.amount_kobo || 0) / 100).toLocaleString()} · {item.frequency || 'Monthly'}
                </Text>
                <Text style={{ color: theme.colors.mutedSoft, fontSize: 12, marginTop: 3 }}>
                  Next: {item.next_date ? new Date(item.next_date).toLocaleDateString() : 'N/A'}
                </Text>
              </View>
              <Switch
                value={item.enabled}
                trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
                thumbColor={theme.colors.white}
              />
            </View>
          </View>
        )}
      />
    </SafeAreaView>
  );
}
