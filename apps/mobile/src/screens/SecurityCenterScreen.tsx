import React from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '../theme';

interface Props { navigation?: any; }

export default function SecurityCenterScreen({ navigation }: Props) {
  const items = [
    { emoji: '🔑', title: 'Change Password', desc: 'Update your account password', screen: 'ChangePassword' },
    { emoji: '🔢', title: 'Change Transaction PIN', desc: 'Update your 6-digit payment PIN', screen: 'TransactionPIN', params: { mode: 'change' } },
    { emoji: '🧬', title: 'Biometric Login', desc: 'Face ID / Fingerprint settings', screen: 'BiometricSetup' },
    { emoji: '🔐', title: 'Two-Factor Auth', desc: 'Add an extra layer of security', screen: 'TwoFactorAuth' },
    { emoji: '📱', title: 'Active Sessions', desc: 'View and manage logged-in devices', screen: 'ActiveSessions' },
    { emoji: '🛡️', title: 'Privacy & Consent', desc: 'Manage your data and permissions', screen: 'PrivacyConsent' },
    { emoji: '⚠️', title: 'Compliance Status', desc: 'KYC verification and account limits', screen: 'ComplianceStatus' },
  ];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background }} edges={['left', 'right', 'top']}>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 40 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', paddingTop: 20, marginBottom: 10, gap: 14 }}>
          <TouchableOpacity onPress={() => navigation?.goBack()}>
            <Text style={{ color: theme.colors.primary, fontSize: 22 }}>←</Text>
          </TouchableOpacity>
          <Text style={{ color: theme.colors.text, fontSize: 22, fontWeight: '900' }}>Security Center</Text>
        </View>
        <Text style={{ color: theme.colors.muted, fontSize: 14, marginBottom: 24 }}>Manage your account security, privacy, and verification settings.</Text>

        <View style={{ backgroundColor: theme.colors.surface, borderRadius: 20, borderWidth: 1, borderColor: theme.colors.border, overflow: 'hidden' }}>
          {items.map((item, i) => (
            <TouchableOpacity key={item.screen} onPress={() => navigation?.navigate(item.screen, item.params)}
              style={{ flexDirection: 'row', alignItems: 'center', padding: 18, borderBottomWidth: i < items.length - 1 ? 1 : 0, borderBottomColor: theme.colors.border }}>
              <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: theme.colors.background, alignItems: 'center', justifyContent: 'center', marginRight: 14 }}>
                <Text style={{ fontSize: 22 }}>{item.emoji}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: theme.colors.text, fontWeight: '800', fontSize: 15 }}>{item.title}</Text>
                <Text style={{ color: theme.colors.muted, fontSize: 13 }}>{item.desc}</Text>
              </View>
              <Text style={{ color: theme.colors.muted, fontSize: 18 }}>›</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
