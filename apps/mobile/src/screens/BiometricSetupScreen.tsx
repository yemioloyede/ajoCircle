import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Alert, Platform, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '../theme';

interface Props {
  navigation?: any;
}

export default function BiometricSetupScreen({ navigation }: Props) {
  const [enabled, setEnabled] = useState(false);

  function enable() {
    // In production: use expo-local-authentication
    Alert.alert('Enable Biometrics', 'Use Face ID or fingerprint to log in quickly and securely?', [
      { text: 'Not Now', style: 'cancel', onPress: () => navigation?.navigate('Main') },
      {
        text: 'Enable',
        onPress: () => {
          setEnabled(true);
          setTimeout(() => navigation?.navigate('Main'), 1000);
        },
      },
    ]);
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 28, paddingBottom: 40, alignItems: 'center' }}>
        <Text style={{ fontSize: 72, marginTop: 80 }}>{Platform.OS === 'ios' ? '😶' : '👆'}</Text>
        <Text style={{ color: theme.colors.text, fontSize: 28, fontWeight: '900', marginTop: 22, textAlign: 'center' }}>
          {Platform.OS === 'ios' ? 'Enable Face ID' : 'Enable Fingerprint'}
        </Text>
        <Text style={{ color: theme.colors.muted, fontSize: 16, marginTop: 14, textAlign: 'center', lineHeight: 26 }}>
          Log in faster and pay securely without typing your password every time.
        </Text>

        <View style={{ marginTop: 40, width: '100%', gap: 16 }}>
          {[
            { icon: '⚡', title: 'One-tap login', desc: 'No passwords to remember' },
            { icon: '🔒', title: 'Secure payments', desc: 'Approve transactions with your face or fingerprint' },
            { icon: '🛡️', title: 'Device-only', desc: 'Your biometrics never leave this device' },
          ].map(item => (
            <View key={item.title} style={{ flexDirection: 'row', alignItems: 'flex-start', backgroundColor: theme.colors.surface, borderRadius: 18, padding: 18, borderWidth: 1, borderColor: theme.colors.border }}>
              <Text style={{ fontSize: 28, marginRight: 14 }}>{item.icon}</Text>
              <View style={{ flex: 1 }}>
                <Text style={{ color: theme.colors.text, fontSize: 16, fontWeight: '800' }}>{item.title}</Text>
                <Text style={{ color: theme.colors.muted, fontSize: 14, marginTop: 4 }}>{item.desc}</Text>
              </View>
            </View>
          ))}
        </View>

        {enabled ? (
          <View style={{ marginTop: 36, alignItems: 'center' }}>
            <Text style={{ fontSize: 36 }}>✅</Text>
            <Text style={{ color: theme.colors.primary, fontSize: 18, fontWeight: '900', marginTop: 10 }}>Biometrics Enabled!</Text>
          </View>
        ) : (
          <>
            <TouchableOpacity onPress={enable} style={{ marginTop: 40, width: '100%', height: 68, borderRadius: 22, backgroundColor: theme.colors.primary, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ color: theme.colors.white, fontSize: 18, fontWeight: '900' }}>
                {Platform.OS === 'ios' ? 'Enable Face ID' : 'Enable Fingerprint'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => navigation?.navigate('Main')} style={{ marginTop: 16, height: 52, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ color: theme.colors.muted, fontSize: 16, fontWeight: '700' }}>Skip for now</Text>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
