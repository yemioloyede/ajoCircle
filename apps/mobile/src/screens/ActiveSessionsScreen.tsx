import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, ActivityIndicator, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api } from '../api/client';
import { theme } from '../theme';

interface Props { navigation?: any; }
interface Session { id: string; device_name: string; platform: string; ip_address: string; location?: string; last_seen: string; is_current: boolean; }

export default function ActiveSessionsScreen({ navigation }: Props) {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [revoking, setRevoking] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await api('/api/auth/sessions');
        setSessions(res.sessions || []);
      } catch {
        setSessions([{ id: '1', device_name: 'This Device', platform: 'iOS', ip_address: '197.210.xx.xx', location: 'Lagos, NG', last_seen: new Date().toISOString(), is_current: true }]);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const revoke = (sess: Session) => {
    if (sess.is_current) { Alert.alert('Cannot revoke', 'You cannot revoke your current session. Log out instead.'); return; }
    Alert.alert('Revoke session?', `Sign out from ${sess.device_name}?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Revoke', style: 'destructive', onPress: async () => {
        setRevoking(sess.id);
        try {
          await api(`/api/auth/sessions/${sess.id}`, { method: 'DELETE' });
          setSessions(prev => prev.filter(s => s.id !== sess.id));
        } catch { Alert.alert('Error', 'Could not revoke session.'); }
        finally { setRevoking(null); }
      }},
    ]);
  };

  const revokeAll = () => {
    Alert.alert('Sign out everywhere?', 'This will revoke all sessions except this device.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out All', style: 'destructive', onPress: async () => {
        try {
          await api('/api/auth/sessions/revoke-all', { method: 'POST' });
          setSessions(prev => prev.filter(s => s.is_current));
        } catch { Alert.alert('Error', 'Could not sign out all sessions.'); }
      }},
    ]);
  };

  const PLATFORM_EMOJI: Record<string, string> = { iOS: '🍎', Android: '🤖', Web: '🌐' };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background }} edges={['left', 'right', 'top']}>
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingTop: 20, paddingHorizontal: 24, marginBottom: 8, gap: 14 }}>
        <TouchableOpacity onPress={() => navigation?.goBack()}>
          <Text style={{ color: theme.colors.primary, fontSize: 22 }}>←</Text>
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={{ color: theme.colors.text, fontSize: 22, fontWeight: '900' }}>Active Sessions</Text>
          <Text style={{ color: theme.colors.muted, fontSize: 13 }}>Devices logged into your account</Text>
        </View>
        {sessions.filter(s => !s.is_current).length > 0 && (
          <TouchableOpacity onPress={revokeAll}>
            <Text style={{ color: theme.colors.danger, fontWeight: '700', fontSize: 14 }}>Sign out all</Text>
          </TouchableOpacity>
        )}
      </View>

      {loading ? <ActivityIndicator color={theme.colors.primary} style={{ flex: 1 }} /> : (
        <FlatList
          data={sessions}
          keyExtractor={s => s.id}
          contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 16, paddingBottom: 40 }}
          renderItem={({ item }) => (
            <View style={{ backgroundColor: theme.colors.surface, borderRadius: 20, borderWidth: item.is_current ? 2 : 1, borderColor: item.is_current ? theme.colors.primary : theme.colors.border, padding: 18, marginBottom: 12 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
                <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: theme.colors.background, alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ fontSize: 24 }}>{PLATFORM_EMOJI[item.platform] || '📱'}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Text style={{ color: theme.colors.text, fontWeight: '800', fontSize: 15 }}>{item.device_name}</Text>
                    {item.is_current && <View style={{ backgroundColor: theme.colors.primary, paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6 }}><Text style={{ color: '#fff', fontSize: 11, fontWeight: '800' }}>THIS DEVICE</Text></View>}
                  </View>
                  <Text style={{ color: theme.colors.muted, fontSize: 13 }}>{item.platform} · {item.ip_address}</Text>
                  {item.location && <Text style={{ color: theme.colors.muted, fontSize: 12 }}>📍 {item.location}</Text>}
                  <Text style={{ color: theme.colors.muted, fontSize: 12 }}>Last active: {new Date(item.last_seen).toLocaleString()}</Text>
                </View>
                {revoking === item.id ? <ActivityIndicator size="small" color={theme.colors.muted} /> : !item.is_current && (
                  <TouchableOpacity onPress={() => revoke(item)} style={{ padding: 8 }}>
                    <Text style={{ color: theme.colors.danger, fontWeight: '700', fontSize: 13 }}>Revoke</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          )}
        />
      )}
    </SafeAreaView>
  );
}
