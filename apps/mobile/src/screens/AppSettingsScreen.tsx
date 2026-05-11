import React, { useState } from 'react';
import { View, Text, ScrollView, Switch, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '../theme';

interface Props { navigation?: any; }

export default function AppSettingsScreen({ navigation }: Props) {
  const [notifPayments, setNotifPayments] = useState(true);
  const [notifReminders, setNotifReminders] = useState(true);
  const [notifCircleActivity, setNotifCircleActivity] = useState(true);
  const [notifPromos, setNotifPromos] = useState(false);
  const [sounds, setSounds] = useState(true);
  const [haptics, setHaptics] = useState(true);

  const sections = [
    {
      title: 'Notifications',
      items: [
        { label: 'Payment Confirmations', value: notifPayments, set: setNotifPayments },
        { label: 'Payment Reminders', value: notifReminders, set: setNotifReminders },
        { label: 'Circle Activity', value: notifCircleActivity, set: setNotifCircleActivity },
        { label: 'Promotions & News', value: notifPromos, set: setNotifPromos },
      ],
    },
    {
      title: 'Experience',
      items: [
        { label: 'Sound Effects', value: sounds, set: setSounds },
        { label: 'Haptic Feedback', value: haptics, set: setHaptics },
      ],
    },
  ];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background }} edges={['left', 'right', 'top']}>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 40 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', paddingTop: 20, marginBottom: 28, gap: 14 }}>
          <TouchableOpacity onPress={() => navigation?.goBack()}>
            <Text style={{ color: theme.colors.primary, fontSize: 22 }}>←</Text>
          </TouchableOpacity>
          <Text style={{ color: theme.colors.text, fontSize: 22, fontWeight: '900' }}>App Settings</Text>
        </View>

        {sections.map(section => (
          <View key={section.title} style={{ marginBottom: 24 }}>
            <Text style={{ color: theme.colors.muted, fontSize: 13, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 10 }}>{section.title}</Text>
            <View style={{ backgroundColor: theme.colors.surface, borderRadius: 20, borderWidth: 1, borderColor: theme.colors.border, overflow: 'hidden' }}>
              {section.items.map((item, i) => (
                <View key={item.label} style={{ flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: i < section.items.length - 1 ? 1 : 0, borderBottomColor: theme.colors.border }}>
                  <Text style={{ color: theme.colors.text, flex: 1, fontWeight: '700', fontSize: 15 }}>{item.label}</Text>
                  <Switch value={item.value} onValueChange={item.set} trackColor={{ false: theme.colors.border, true: theme.colors.primary }} thumbColor="#fff" />
                </View>
              ))}
            </View>
          </View>
        ))}

        <Text style={{ color: theme.colors.muted, fontSize: 13, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 10 }}>About</Text>
        <View style={{ backgroundColor: theme.colors.surface, borderRadius: 20, borderWidth: 1, borderColor: theme.colors.border, overflow: 'hidden' }}>
          {[
            { label: 'App Version', value: '1.0.0' },
            { label: 'Terms of Service', nav: 'Terms' },
            { label: 'Privacy Policy', nav: 'Privacy' },
            { label: 'Licences', nav: 'Licences' },
          ].map((item, i, arr) => (
            <TouchableOpacity key={item.label} onPress={item.nav ? () => {} : undefined}
              style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: i < arr.length - 1 ? 1 : 0, borderBottomColor: theme.colors.border }}>
              <Text style={{ color: theme.colors.text, fontWeight: '700', fontSize: 15 }}>{item.label}</Text>
              {item.value ? <Text style={{ color: theme.colors.muted, fontSize: 14 }}>{item.value}</Text> : <Text style={{ color: theme.colors.muted, fontSize: 18 }}>›</Text>}
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
