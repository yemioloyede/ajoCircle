import React, { useState } from 'react';
import { View, Text, ScrollView, Switch, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api } from '../api/client';
import { theme } from '../theme';

interface Props { navigation?: any; }

const TOGGLES = [
  { key: 'analytics', label: 'Usage Analytics', desc: 'Help us improve by sharing anonymous usage data.' },
  { key: 'marketing', label: 'Marketing Emails', desc: 'Receive news, offers, and product updates.' },
  { key: 'push_notifications', label: 'Push Notifications', desc: 'Reminders for payments and group activity.' },
  { key: 'sms_alerts', label: 'SMS Alerts', desc: 'Text message alerts for transactions.' },
];

export default function PrivacyConsentScreen({ navigation }: Props) {
  const [prefs, setPrefs] = useState<Record<string, boolean>>({ analytics: true, marketing: false, push_notifications: true, sms_alerts: true });
  const [saving, setSaving] = useState(false);

  const toggle = (key: string) => setPrefs(prev => ({ ...prev, [key]: !prev[key] }));

  const save = async () => {
    setSaving(true);
    try {
      await api('/api/users/privacy-preferences', { method: 'PATCH', body: JSON.stringify(prefs) });
      Alert.alert('Saved ✅', 'Your privacy preferences have been updated.');
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Could not save preferences.');
    } finally {
      setSaving(false);
    }
  };

  const requestDataExport = () => {
    Alert.alert('Export Data', 'We will email you a copy of your data within 30 days as required by data protection law.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Request Export', onPress: async () => {
        try { await api('/api/users/data-export', { method: 'POST' }); Alert.alert('Request Submitted', 'You will receive an email when your data export is ready.'); }
        catch { Alert.alert('Error', 'Could not submit request.'); }
      }},
    ]);
  };

  const deleteAccount = () => {
    Alert.alert('Delete Account', 'This will permanently delete your account and all data. This cannot be undone. Active circles must be settled first.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => Alert.alert('Contact Support', 'Please open a support ticket to initiate account deletion.') },
    ]);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background }} edges={['left', 'right', 'top']}>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 40 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', paddingTop: 20, marginBottom: 28, gap: 14 }}>
          <TouchableOpacity onPress={() => navigation?.goBack()}>
            <Text style={{ color: theme.colors.primary, fontSize: 22 }}>←</Text>
          </TouchableOpacity>
          <Text style={{ color: theme.colors.text, fontSize: 22, fontWeight: '900' }}>Privacy & Consent</Text>
        </View>

        <View style={{ backgroundColor: theme.colors.surface, borderRadius: 20, borderWidth: 1, borderColor: theme.colors.border, overflow: 'hidden', marginBottom: 20 }}>
          {TOGGLES.map((item, i) => (
            <View key={item.key} style={{ flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: i < TOGGLES.length - 1 ? 1 : 0, borderBottomColor: theme.colors.border }}>
              <View style={{ flex: 1, marginRight: 14 }}>
                <Text style={{ color: theme.colors.text, fontWeight: '700', fontSize: 15 }}>{item.label}</Text>
                <Text style={{ color: theme.colors.muted, fontSize: 12, marginTop: 2 }}>{item.desc}</Text>
              </View>
              <Switch value={prefs[item.key]} onValueChange={() => toggle(item.key)} trackColor={{ false: theme.colors.border, true: theme.colors.primary }} thumbColor="#fff" />
            </View>
          ))}
        </View>

        <TouchableOpacity onPress={save} disabled={saving}
          style={{ height: 56, borderRadius: 18, backgroundColor: saving ? theme.colors.surface : theme.colors.primary, alignItems: 'center', justifyContent: 'center', marginBottom: 24 }}>
          {saving ? <ActivityIndicator color="#fff" /> : <Text style={{ color: '#fff', fontWeight: '800', fontSize: 16 }}>Save Preferences</Text>}
        </TouchableOpacity>

        <View style={{ backgroundColor: theme.colors.surface, borderRadius: 20, borderWidth: 1, borderColor: theme.colors.border, overflow: 'hidden' }}>
          <TouchableOpacity onPress={requestDataExport} style={{ padding: 18, borderBottomWidth: 1, borderBottomColor: theme.colors.border, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={{ color: theme.colors.text, fontWeight: '700', fontSize: 15 }}>📥 Export My Data</Text>
            <Text style={{ color: theme.colors.muted, fontSize: 18 }}>›</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={deleteAccount} style={{ padding: 18, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={{ color: theme.colors.danger, fontWeight: '700', fontSize: 15 }}>🗑️ Delete Account</Text>
            <Text style={{ color: theme.colors.muted, fontSize: 18 }}>›</Text>
          </TouchableOpacity>
        </View>
        <Text style={{ color: theme.colors.muted, fontSize: 12, textAlign: 'center', marginTop: 14 }}>Your data is governed by our Privacy Policy. AjoCircle complies with NDPR and GDPR.</Text>
      </ScrollView>
    </SafeAreaView>
  );
}
