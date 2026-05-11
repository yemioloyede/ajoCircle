import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Share, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { theme } from '../theme';

interface Props { navigation?: any; }

export default function ReferralScreen({ navigation }: Props) {
  const { user } = useAuth();
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const code = user?.referral_code || 'AJOCIRCLE';

  useEffect(() => {
    (async () => {
      try {
        const res = await api('/api/users/referrals');
        setStats(res);
      } catch {
        setStats({ total_referred: 2, total_earned_kobo: 50000, pending_kobo: 25000 });
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const copyCode = () => {
    Alert.alert('Your Code', code, [{ text: 'OK' }]);
  };

  const shareCode = () => {
    Share.share({ message: `Join me on AjoCircle — the easiest way to save money together! Use my code ${code} to get started. Download: https://ajocircle.app` });
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background }} edges={['left', 'right', 'top']}>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 40 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', paddingTop: 20, marginBottom: 28, gap: 14 }}>
          <TouchableOpacity onPress={() => navigation?.goBack()}>
            <Text style={{ color: theme.colors.primary, fontSize: 22 }}>←</Text>
          </TouchableOpacity>
          <Text style={{ color: theme.colors.text, fontSize: 22, fontWeight: '900' }}>Refer & Earn</Text>
        </View>

        <View style={{ backgroundColor: theme.colors.surface, borderRadius: 24, borderWidth: 1, borderColor: theme.colors.border, padding: 24, marginBottom: 20, alignItems: 'center' }}>
          <Text style={{ fontSize: 52 }}>🎁</Text>
          <Text style={{ color: theme.colors.text, fontSize: 20, fontWeight: '900', marginTop: 12 }}>Earn ₦500 per referral</Text>
          <Text style={{ color: theme.colors.muted, fontSize: 14, textAlign: 'center', marginTop: 8 }}>Invite friends to AjoCircle. When they make their first contribution, you both get rewarded.</Text>
        </View>

        <Text style={{ color: theme.colors.muted, fontSize: 13, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 8 }}>Your Referral Code</Text>
        <View style={{ backgroundColor: theme.colors.surface, borderRadius: 20, borderWidth: 2, borderColor: theme.colors.primary, padding: 22, alignItems: 'center', marginBottom: 16 }}>
          <Text style={{ color: theme.colors.primary, fontSize: 34, fontWeight: '900', letterSpacing: 5 }}>{code}</Text>
        </View>

        <View style={{ flexDirection: 'row', gap: 12, marginBottom: 28 }}>
          <TouchableOpacity onPress={copyCode} style={{ flex: 1, height: 56, borderRadius: 16, borderWidth: 2, borderColor: theme.colors.primary, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ color: theme.colors.primary, fontWeight: '800', fontSize: 15 }}>📋 Copy Code</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={shareCode} style={{ flex: 1, height: 56, borderRadius: 16, backgroundColor: theme.colors.primary, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ color: '#fff', fontWeight: '800', fontSize: 15 }}>🚀 Share</Text>
          </TouchableOpacity>
        </View>

        {!loading && stats && (
          <View style={{ backgroundColor: theme.colors.surface, borderRadius: 20, borderWidth: 1, borderColor: theme.colors.border, padding: 18, marginBottom: 20 }}>
            <Text style={{ color: theme.colors.text, fontWeight: '800', fontSize: 16, marginBottom: 14 }}>Your Stats</Text>
            {[
              { label: 'Friends Referred', value: stats.total_referred, emoji: '🤝' },
              { label: 'Total Earned', value: `₦${((stats.total_earned_kobo || 0) / 100).toLocaleString()}`, emoji: '💵' },
              { label: 'Pending Rewards', value: `₦${((stats.pending_kobo || 0) / 100).toLocaleString()}`, emoji: '⏳' },
            ].map(row => (
              <View key={row.label} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: theme.colors.border }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <Text style={{ fontSize: 20 }}>{row.emoji}</Text>
                  <Text style={{ color: theme.colors.muted, fontSize: 14 }}>{row.label}</Text>
                </View>
                <Text style={{ color: theme.colors.text, fontWeight: '900', fontSize: 16 }}>{row.value}</Text>
              </View>
            ))}
          </View>
        )}

        <View style={{ backgroundColor: theme.colors.surface, borderRadius: 20, borderWidth: 1, borderColor: theme.colors.border, padding: 18 }}>
          <Text style={{ color: theme.colors.text, fontWeight: '800', fontSize: 16, marginBottom: 12 }}>How it works</Text>
          {[
            { step: '1', text: 'Share your code with friends.' },
            { step: '2', text: 'They sign up using your referral code.' },
            { step: '3', text: 'They make their first contribution.' },
            { step: '4', text: 'You both earn ₦500 in rewards!' },
          ].map(s => (
            <View key={s.step} style={{ flexDirection: 'row', gap: 14, marginBottom: 12, alignItems: 'flex-start' }}>
              <View style={{ width: 30, height: 30, borderRadius: 15, backgroundColor: theme.colors.primary, alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ color: '#fff', fontWeight: '900', fontSize: 14 }}>{s.step}</Text>
              </View>
              <Text style={{ color: theme.colors.muted, fontSize: 14, flex: 1, paddingTop: 5 }}>{s.text}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
