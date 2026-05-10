import React from 'react';
import { View, Text, ScrollView, StatusBar, TouchableOpacity } from 'react-native';
import { theme } from '../theme';

type Props = {
  onGetStarted: () => void;
  onLogin: () => void;
};

export default function OnboardingScreen({ onGetStarted, onLogin }: Props) {
  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <StatusBar barStyle="light-content" />
      <ScrollView contentContainerStyle={{ paddingBottom: 44 }}>
        <View style={{ alignItems: 'flex-end', marginTop: 20, marginHorizontal: 24 }}>
          <TouchableOpacity onPress={onLogin} style={{ paddingVertical: 6, paddingHorizontal: 2 }}>
            <Text style={{ color: theme.colors.primary, fontWeight: '800' }}>Skip</Text>
          </TouchableOpacity>
        </View>

        <View style={{ marginHorizontal: 0 }}>
          <View style={{ backgroundColor: '#1A1C20', borderRadius: 28, padding: 16, marginTop: 14 }}>
            <View style={{ height: 410, borderRadius: 22, backgroundColor: '#212327', alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ fontSize: 20 }}>🐷</Text>
            </View>
          </View>
        </View>

        <View style={{ paddingHorizontal: 24, marginTop: 26 }}>
          <Text style={{ color: theme.colors.text, fontSize: 18, fontWeight: '900', lineHeight: 24 }}>Save Together, Grow Faster</Text>
          <Text style={{ marginTop: 18, color: theme.colors.muted, fontSize: 13, lineHeight: 20 }}>
            Join a circle of trusted friends and family to save money and take turns receiving the total pot.
          </Text>
        </View>

        <View style={{ alignItems: 'center', marginTop: 44, flexDirection: 'row', justifyContent: 'center', gap: 10 }}>
          <View style={{ width: 48, height: 16, borderRadius: 20, backgroundColor: theme.colors.primary }} />
          <View style={{ width: 16, height: 16, borderRadius: 20, backgroundColor: '#4D5158' }} />
          <View style={{ width: 16, height: 16, borderRadius: 20, backgroundColor: '#34373D' }} />
        </View>

        <TouchableOpacity onPress={onGetStarted} style={{ marginTop: 48, marginHorizontal: 24, backgroundColor: theme.colors.primary, height: 64, borderRadius: 20, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ color: theme.colors.white, fontSize: 15, fontWeight: '800' }}>Get Started</Text>
        </TouchableOpacity>

        <View style={{ marginTop: 28, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 14 }}>
          <Text style={{ color: theme.colors.muted, fontSize: 13 }}>Already have an account?</Text>
          <TouchableOpacity onPress={onLogin}>
            <Text style={{ color: theme.colors.primary, fontSize: 13, fontWeight: '800' }}>Log In</Text>
          </TouchableOpacity>
        </View>

        <View style={{ marginTop: 34, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8 }}>
          <Text style={{ color: theme.colors.mutedSoft, fontSize: 14 }}>🔒</Text>
          <Text style={{ color: theme.colors.muted, fontSize: 14, fontWeight: '700' }}>Secure payments powered by Paystack</Text>
        </View>
      </ScrollView>
    </View>
  );
}
