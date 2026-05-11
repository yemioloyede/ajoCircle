import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, ActivityIndicator, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api } from '../api/client';
import { theme } from '../theme';

interface Props { navigation?: any; }

const BADGES = [
  { emoji: '🌱', title: 'First Circle', earned: true },
  { emoji: '🔥', title: '3-Month Streak', earned: true },
  { emoji: '💎', title: 'Diamond Payer', earned: false },
  { emoji: '🎯', title: 'Never Missed', earned: false },
  { emoji: '🤝', title: 'Community Builder', earned: false },
  { emoji: '⭐', title: 'Top Contributor', earned: false },
];

function ScoreArc({ score }: { score: number }) {
  const color = score >= 80 ? theme.colors.primary : score >= 60 ? '#C28745' : '#CD6B80';
  const label = score >= 90 ? 'Excellent' : score >= 75 ? 'Good' : score >= 60 ? 'Fair' : 'Needs work';
  return (
    <View style={{ alignItems: 'center', paddingVertical: 20 }}>
      <View style={{ width: 140, height: 140, borderRadius: 70, borderWidth: 10, borderColor: color, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.background }}>
        <Text style={{ color, fontSize: 44, fontWeight: '900' }}>{score}</Text>
        <Text style={{ color: theme.colors.muted, fontSize: 12 }}>/ 100</Text>
      </View>
      <View style={{ marginTop: 14, paddingHorizontal: 20, paddingVertical: 8, borderRadius: 14, backgroundColor: color + '22', borderWidth: 1, borderColor: color }}>
        <Text style={{ color, fontWeight: '800', fontSize: 15 }}>{label}</Text>
      </View>
    </View>
  );
}

export default function TrustScoreScreen({ navigation }: Props) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await api('/api/users/trust-score');
        setData(res);
      } catch {
        setData({ score: 72, on_time_rate: 88, total_contributions: 24, circles_completed: 3, verification_level: 'KYC1' });
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const score = data?.score ?? 72;

  const stats = [
    { label: 'On-time Rate', value: `${data?.on_time_rate ?? 88}%`, emoji: '⚡' },
    { label: 'Contributions Made', value: data?.total_contributions ?? 24, emoji: '💰' },
    { label: 'Circles Completed', value: data?.circles_completed ?? 3, emoji: '✅' },
    { label: 'KYC Level', value: data?.verification_level ?? 'KYC1', emoji: '🔒' },
  ];

  const factors = [
    { label: 'Payment consistency', value: 85, max: 100 },
    { label: 'KYC verification', value: 60, max: 100 },
    { label: 'Community participation', value: 70, max: 100 },
    { label: 'Account age', value: 65, max: 100 },
  ];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background }} edges={['left', 'right', 'top']}>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 40 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', paddingTop: 20, marginBottom: 24, gap: 14 }}>
          <TouchableOpacity onPress={() => navigation?.goBack()}>
            <Text style={{ color: theme.colors.primary, fontSize: 22 }}>←</Text>
          </TouchableOpacity>
          <Text style={{ color: theme.colors.text, fontSize: 22, fontWeight: '900' }}>Trust Score</Text>
        </View>

        {loading ? <ActivityIndicator color={theme.colors.primary} /> : (
          <>
            <View style={{ backgroundColor: theme.colors.surface, borderRadius: 24, borderWidth: 1, borderColor: theme.colors.border, padding: 20, marginBottom: 20, alignItems: 'center' }}>
              <Text style={{ color: theme.colors.muted, fontSize: 13, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase' }}>Your Trust Score</Text>
              <ScoreArc score={score} />
              <Text style={{ color: theme.colors.muted, fontSize: 13, textAlign: 'center' }}>Higher scores unlock better circle limits and earlier payouts.</Text>
            </View>

            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 20 }}>
              {stats.map(s => (
                <View key={s.label} style={{ backgroundColor: theme.colors.surface, borderRadius: 18, borderWidth: 1, borderColor: theme.colors.border, padding: 16, flex: 1, minWidth: '45%' }}>
                  <Text style={{ fontSize: 24, marginBottom: 6 }}>{s.emoji}</Text>
                  <Text style={{ color: theme.colors.text, fontSize: 20, fontWeight: '900' }}>{s.value}</Text>
                  <Text style={{ color: theme.colors.muted, fontSize: 12 }}>{s.label}</Text>
                </View>
              ))}
            </View>

            <View style={{ backgroundColor: theme.colors.surface, borderRadius: 20, borderWidth: 1, borderColor: theme.colors.border, padding: 18, marginBottom: 20 }}>
              <Text style={{ color: theme.colors.text, fontWeight: '800', fontSize: 16, marginBottom: 16 }}>Score Breakdown</Text>
              {factors.map(f => (
                <View key={f.label} style={{ marginBottom: 14 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
                    <Text style={{ color: theme.colors.text, fontSize: 14 }}>{f.label}</Text>
                    <Text style={{ color: theme.colors.primary, fontWeight: '800', fontSize: 14 }}>{f.value}%</Text>
                  </View>
                  <View style={{ height: 8, backgroundColor: theme.colors.background, borderRadius: 4 }}>
                    <View style={{ height: 8, width: `${f.value}%`, backgroundColor: theme.colors.primary, borderRadius: 4 }} />
                  </View>
                </View>
              ))}
            </View>

            <Text style={{ color: theme.colors.text, fontWeight: '800', fontSize: 16, marginBottom: 14 }}>Badges</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
              {BADGES.map(b => (
                <View key={b.title} style={{ backgroundColor: theme.colors.surface, borderRadius: 16, borderWidth: 1, borderColor: b.earned ? theme.colors.primary : theme.colors.border, padding: 14, alignItems: 'center', minWidth: '30%', opacity: b.earned ? 1 : 0.45 }}>
                  <Text style={{ fontSize: 28 }}>{b.emoji}</Text>
                  <Text style={{ color: theme.colors.text, fontSize: 12, fontWeight: '700', textAlign: 'center', marginTop: 6 }}>{b.title}</Text>
                </View>
              ))}
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
