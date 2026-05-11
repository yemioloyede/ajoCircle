import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, ScrollView, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '../theme';

interface Props {
  navigation?: any;
}

export default function TwoFactorAuthScreen({ navigation }: Props) {
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(false);

  async function toggle() {
    setLoading(true);
    await new Promise(r => setTimeout(r, 800));
    setEnabled(prev => !prev);
    setLoading(false);
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 40 }}>
        <TouchableOpacity onPress={() => navigation?.goBack()} style={{ marginTop: 20 }}>
          <Text style={{ color: theme.colors.primary, fontSize: 15, fontWeight: '700' }}>← Back</Text>
        </TouchableOpacity>

        <Text style={{ color: theme.colors.text, fontSize: 26, fontWeight: '900', marginTop: 22 }}>Two-Factor Authentication</Text>
        <Text style={{ color: theme.colors.muted, fontSize: 15, marginTop: 8, lineHeight: 24 }}>
          Add an extra layer of security to your account.
        </Text>

        <View style={{ marginTop: 28, backgroundColor: theme.colors.surface, borderRadius: 20, padding: 20, borderWidth: 1, borderColor: theme.colors.border }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <View style={{ flex: 1 }}>
              <Text style={{ color: theme.colors.text, fontSize: 17, fontWeight: '800' }}>Enable 2FA</Text>
              <Text style={{ color: theme.colors.muted, fontSize: 14, marginTop: 4 }}>Require a code when logging in from a new device</Text>
            </View>
            {loading ? <ActivityIndicator color={theme.colors.primary} /> : (
              <Switch
                value={enabled}
                onValueChange={toggle}
                trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
                thumbColor={theme.colors.white}
              />
            )}
          </View>
        </View>

        {enabled && (
          <View style={{ marginTop: 20, backgroundColor: '#101714', borderRadius: 18, padding: 18, borderWidth: 1, borderColor: '#274129' }}>
            <Text style={{ color: theme.colors.primary, fontSize: 16, fontWeight: '900' }}>✅ 2FA is active</Text>
            <Text style={{ color: theme.colors.muted, fontSize: 14, marginTop: 8, lineHeight: 22 }}>
              Every login from a new device will require a 6-digit code sent to your email or phone.
            </Text>
          </View>
        )}

        <View style={{ marginTop: 28, gap: 14 }}>
          {[
            { icon: '📧', title: 'Email codes', desc: 'Get your 2FA code by email' },
            { icon: '📱', title: 'SMS codes', desc: 'Get your 2FA code via text message' },
            { icon: '🔐', title: 'Authenticator app', desc: 'Use Google Authenticator or Authy (coming soon)', soon: true },
          ].map(item => (
            <View key={item.title} style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: theme.colors.surface, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: theme.colors.border }}>
              <Text style={{ fontSize: 26, marginRight: 14 }}>{item.icon}</Text>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Text style={{ color: item.soon ? theme.colors.muted : theme.colors.text, fontSize: 15, fontWeight: '800' }}>{item.title}</Text>
                  {item.soon && <View style={{ backgroundColor: '#2A2A1A', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 2 }}><Text style={{ color: theme.colors.warning, fontSize: 11, fontWeight: '800' }}>SOON</Text></View>}
                </View>
                <Text style={{ color: theme.colors.muted, fontSize: 13, marginTop: 3 }}>{item.desc}</Text>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
