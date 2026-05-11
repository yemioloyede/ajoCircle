import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, ActivityIndicator, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api } from '../api/client';
import { theme } from '../theme';

interface Props { navigation?: any; }

function MiniBar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = Math.min(100, (value / max) * 100);
  return (
    <View style={{ height: 10, backgroundColor: theme.colors.background, borderRadius: 5, marginTop: 6 }}>
      <View style={{ height: 10, width: `${pct}%`, backgroundColor: color, borderRadius: 5 }} />
    </View>
  );
}

export default function FinancialInsightsScreen({ navigation }: Props) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await api('/api/users/insights');
        setData(res);
      } catch {
        setData({
          total_saved: 120000,
          monthly_avg: 20000,
          active_circles: 3,
          completed_circles: 2,
          avg_contribution_streak: 4,
          months: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
          amounts: [15000, 18000, 22000, 19000, 25000, 21000],
        });
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <ActivityIndicator color={theme.colors.primary} style={{ flex: 1 }} />
    </SafeAreaView>
  );

  const maxAmt = Math.max(...(data?.amounts || [1]));

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background }} edges={['left', 'right', 'top']}>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 40 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', paddingTop: 20, marginBottom: 24, gap: 14 }}>
          <TouchableOpacity onPress={() => navigation?.goBack()}>
            <Text style={{ color: theme.colors.primary, fontSize: 22 }}>←</Text>
          </TouchableOpacity>
          <Text style={{ color: theme.colors.text, fontSize: 22, fontWeight: '900' }}>Financial Insights</Text>
        </View>

        {/* Hero metric */}
        <View style={{ backgroundColor: theme.colors.surface, borderRadius: 24, borderWidth: 1, borderColor: theme.colors.border, padding: 24, marginBottom: 16, alignItems: 'center' }}>
          <Text style={{ fontSize: 36 }}>💰</Text>
          <Text style={{ color: theme.colors.muted, fontSize: 13, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase', marginTop: 8 }}>Total Saved</Text>
          <Text style={{ color: theme.colors.primary, fontSize: 42, fontWeight: '900', marginTop: 6 }}>₦{(data.total_saved / 100).toLocaleString()}</Text>
          <Text style={{ color: theme.colors.muted, fontSize: 14, marginTop: 4 }}>Avg ₦{(data.monthly_avg / 100).toLocaleString()} / month</Text>
        </View>

        {/* Stats grid */}
        <View style={{ flexDirection: 'row', gap: 12, marginBottom: 20 }}>
          {[
            { emoji: '🔄', label: 'Active Circles', value: data.active_circles },
            { emoji: '✅', label: 'Completed', value: data.completed_circles },
            { emoji: '🔥', label: 'Month Streak', value: data.avg_contribution_streak },
          ].map(s => (
            <View key={s.label} style={{ flex: 1, backgroundColor: theme.colors.surface, borderRadius: 18, borderWidth: 1, borderColor: theme.colors.border, padding: 14, alignItems: 'center' }}>
              <Text style={{ fontSize: 26 }}>{s.emoji}</Text>
              <Text style={{ color: theme.colors.text, fontSize: 22, fontWeight: '900', marginTop: 6 }}>{s.value}</Text>
              <Text style={{ color: theme.colors.muted, fontSize: 11, textAlign: 'center', marginTop: 2 }}>{s.label}</Text>
            </View>
          ))}
        </View>

        {/* Bar chart */}
        {data.months && (
          <View style={{ backgroundColor: theme.colors.surface, borderRadius: 20, borderWidth: 1, borderColor: theme.colors.border, padding: 18, marginBottom: 20 }}>
            <Text style={{ color: theme.colors.text, fontWeight: '800', fontSize: 16, marginBottom: 16 }}>Monthly Contributions</Text>
            <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', height: 120, gap: 8 }}>
              {data.amounts.map((amt: number, i: number) => {
                const pct = (amt / maxAmt);
                return (
                  <View key={i} style={{ flex: 1, alignItems: 'center' }}>
                    <View style={{ flex: 1, justifyContent: 'flex-end', width: '100%' }}>
                      <View style={{ height: 100 * pct, backgroundColor: theme.colors.primary, borderRadius: 6, opacity: i === data.amounts.length - 1 ? 1 : 0.6 }} />
                    </View>
                    <Text style={{ color: theme.colors.muted, fontSize: 10, marginTop: 6 }}>{data.months[i]}</Text>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* Tips */}
        <View style={{ backgroundColor: theme.colors.surface, borderRadius: 20, borderWidth: 1, borderColor: theme.colors.border, padding: 18 }}>
          <Text style={{ color: theme.colors.text, fontWeight: '800', fontSize: 16, marginBottom: 12 }}>💡 Tips to save more</Text>
          {[
            'Join a circle with weekly contributions for faster savings.',
            'Enable auto-pay to never miss a deadline.',
            'Complete KYC to unlock higher circle limits.',
          ].map((tip, i) => (
            <View key={i} style={{ flexDirection: 'row', gap: 10, marginBottom: 10 }}>
              <Text style={{ color: theme.colors.primary, fontWeight: '900' }}>{i + 1}.</Text>
              <Text style={{ color: theme.colors.muted, fontSize: 14, flex: 1 }}>{tip}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
