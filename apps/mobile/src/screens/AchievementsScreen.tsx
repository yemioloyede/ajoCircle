import React from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '../theme';

interface Props { navigation?: any; }

const ACHIEVEMENTS = [
  { id: 1, emoji: '🌱', title: 'First Steps', desc: 'Made your first contribution', earned: true, date: 'Nov 2024' },
  { id: 2, emoji: '🔥', title: '30-Day Streak', desc: 'Contributed for 30 days straight', earned: true, date: 'Dec 2024' },
  { id: 3, emoji: '🏆', title: 'Circle Champion', desc: 'Completed a full savings circle', earned: true, date: 'Jan 2025' },
  { id: 4, emoji: '🤝', title: 'Inviter', desc: 'Invited 3+ friends to AjoCircle', earned: false, progress: 1, max: 3 },
  { id: 5, emoji: '💎', title: 'Diamond Saver', desc: 'Saved over ₦1,000,000', earned: false, progress: 120000, max: 1000000 },
  { id: 6, emoji: '📅', title: 'Year-round Saver', desc: 'Contributed every month for 12 months', earned: false, progress: 4, max: 12 },
  { id: 7, emoji: '⭐', title: 'Top Contributor', desc: 'Ranked #1 in a circle for 3 months', earned: false, progress: 1, max: 3 },
  { id: 8, emoji: '🌍', title: 'Global Citizen', desc: 'Joined circles in 3+ countries', earned: false, progress: 1, max: 3 },
];

export default function AchievementsScreen({ navigation }: Props) {
  const earned = ACHIEVEMENTS.filter(a => a.earned);
  const pending = ACHIEVEMENTS.filter(a => !a.earned);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background }} edges={['left', 'right', 'top']}>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 40 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', paddingTop: 20, marginBottom: 24, gap: 14 }}>
          <TouchableOpacity onPress={() => navigation?.goBack()}>
            <Text style={{ color: theme.colors.primary, fontSize: 22 }}>←</Text>
          </TouchableOpacity>
          <Text style={{ color: theme.colors.text, fontSize: 22, fontWeight: '900' }}>Achievements</Text>
        </View>

        <View style={{ backgroundColor: theme.colors.surface, borderRadius: 20, borderWidth: 1, borderColor: theme.colors.border, padding: 20, flexDirection: 'row', alignItems: 'center', marginBottom: 28 }}>
          <Text style={{ fontSize: 40 }}>🏅</Text>
          <View style={{ marginLeft: 16 }}>
            <Text style={{ color: theme.colors.text, fontSize: 26, fontWeight: '900' }}>{earned.length} / {ACHIEVEMENTS.length}</Text>
            <Text style={{ color: theme.colors.muted, fontSize: 14 }}>Achievements earned</Text>
          </View>
          <View style={{ flex: 1 }} />
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={{ color: theme.colors.primary, fontSize: 20, fontWeight: '900' }}>{Math.round((earned.length / ACHIEVEMENTS.length) * 100)}%</Text>
            <Text style={{ color: theme.colors.muted, fontSize: 12 }}>complete</Text>
          </View>
        </View>

        <Text style={{ color: theme.colors.text, fontWeight: '800', fontSize: 16, marginBottom: 14 }}>✅ Earned</Text>
        {earned.map(a => (
          <View key={a.id} style={{ backgroundColor: theme.colors.surface, borderRadius: 18, borderWidth: 1, borderColor: theme.colors.primary, padding: 16, marginBottom: 10, flexDirection: 'row', alignItems: 'center' }}>
            <Text style={{ fontSize: 32, marginRight: 14 }}>{a.emoji}</Text>
            <View style={{ flex: 1 }}>
              <Text style={{ color: theme.colors.text, fontWeight: '800', fontSize: 15 }}>{a.title}</Text>
              <Text style={{ color: theme.colors.muted, fontSize: 13 }}>{a.desc}</Text>
            </View>
            <Text style={{ color: theme.colors.muted, fontSize: 12 }}>{a.date}</Text>
          </View>
        ))}

        <Text style={{ color: theme.colors.text, fontWeight: '800', fontSize: 16, marginTop: 16, marginBottom: 14 }}>🔒 In Progress</Text>
        {pending.map(a => (
          <View key={a.id} style={{ backgroundColor: theme.colors.surface, borderRadius: 18, borderWidth: 1, borderColor: theme.colors.border, padding: 16, marginBottom: 10, opacity: 0.75 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text style={{ fontSize: 32, marginRight: 14, opacity: 0.5 }}>{a.emoji}</Text>
              <View style={{ flex: 1 }}>
                <Text style={{ color: theme.colors.text, fontWeight: '800', fontSize: 15 }}>{a.title}</Text>
                <Text style={{ color: theme.colors.muted, fontSize: 13 }}>{a.desc}</Text>
              </View>
            </View>
            {a.progress !== undefined && a.max !== undefined && (
              <View style={{ marginTop: 10 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                  <Text style={{ color: theme.colors.muted, fontSize: 12 }}>Progress</Text>
                  <Text style={{ color: theme.colors.muted, fontSize: 12 }}>{a.progress} / {a.max}</Text>
                </View>
                <View style={{ height: 6, backgroundColor: theme.colors.background, borderRadius: 3 }}>
                  <View style={{ height: 6, width: `${Math.min(100, (a.progress / a.max) * 100)}%`, backgroundColor: theme.colors.primary, borderRadius: 3 }} />
                </View>
              </View>
            )}
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}
