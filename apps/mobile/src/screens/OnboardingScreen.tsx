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
          <View style={{ backgroundColor: '#1A1C20', borderRadius: 28, padding: 20, marginTop: 14 }}>
            <View style={{ height: 340, borderRadius: 22, backgroundColor: '#121417', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
              <Text style={{ fontSize: 64 }}>👗</Text>
              <Text style={{ fontSize: 28, fontWeight: '900', color: '#E8EAED', marginTop: 8 }}>AjoCircle</Text>
              <View style={{ flexDirection: 'row', gap: 18, marginTop: 8 }}>
                <View style={{ alignItems: 'center' }}>
                  <Text style={{ fontSize: 32 }}>💰</Text>
                  <Text style={{ color: '#739A63', fontSize: 12, fontWeight: '700', marginTop: 4 }}>Save</Text>
                </View>
                <View style={{ alignItems: 'center' }}>
                  <Text style={{ fontSize: 32 }}>🤝</Text>
                  <Text style={{ color: '#9AB5CF', fontSize: 12, fontWeight: '700', marginTop: 4 }}>Trust</Text>
                </View>
                <View style={{ alignItems: 'center' }}>
                  <Text style={{ fontSize: 32 }}>🎉</Text>
                  <Text style={{ color: '#C57486', fontSize: 12, fontWeight: '700', marginTop: 4 }}>Win</Text>
                </View>
              </View>
            </View>
          </View>
        </View>

        <View style={{ paddingHorizontal: 24, marginTop: 26 }}>
          <Text style={{ color: '#E8EAED', fontSize: 24, fontWeight: '900', lineHeight: 32 }}>Save Together, Get Paid Together</Text>
          <Text style={{ marginTop: 14, color: '#A7ABB2', fontSize: 16, lineHeight: 26 }}>
            Join a circle of trusted friends or family. Everyone saves. Everyone wins. It's simple and fun!
          </Text>
        </View>

        <View style={{ alignItems: 'center', marginTop: 44, flexDirection: 'row', justifyContent: 'center', gap: 10 }}>
          <View style={{ width: 48, height: 16, borderRadius: 20, backgroundColor: theme.colors.primary }} />
          <View style={{ width: 16, height: 16, borderRadius: 20, backgroundColor: '#4D5158' }} />
          <View style={{ width: 16, height: 16, borderRadius: 20, backgroundColor: '#34373D' }} />
        </View>

        <TouchableOpacity onPress={onGetStarted} style={{ marginTop: 40, marginHorizontal: 24, backgroundColor: '#739A63', height: 72, borderRadius: 22, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ color: '#FFFFFF', fontSize: 18, fontWeight: '900' }}>Get Started →</Text>
        </TouchableOpacity>

        <View style={{ marginTop: 28, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 14 }}>
          <Text style={{ color: '#A7ABB2', fontSize: 15 }}>Already have an account?</Text>
          <TouchableOpacity onPress={onLogin}>
            <Text style={{ color: '#739A63', fontSize: 15, fontWeight: '900' }}>Log In</Text>
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
