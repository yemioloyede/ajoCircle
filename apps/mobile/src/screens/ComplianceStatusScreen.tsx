import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api } from '../api/client';
import { theme } from '../theme';

interface Props { navigation?: any; }

const STEPS = [
  { key: 'email', label: 'Email Verified', desc: 'Confirm your email address' },
  { key: 'phone', label: 'Phone Verified', desc: 'Verify your mobile number' },
  { key: 'kyc1', label: 'Basic KYC', desc: 'Valid government-issued ID' },
  { key: 'kyc2', label: 'Enhanced KYC', desc: 'Proof of address document' },
  { key: 'bvn', label: 'BVN Linked', desc: 'Bank Verification Number (Nigeria)' },
];

export default function ComplianceStatusScreen({ navigation }: Props) {
  const [status, setStatus] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await api('/api/users/compliance');
        setStatus(res);
      } catch {
        setStatus({ email_verified: true, phone_verified: true, kyc1: false, kyc2: false, bvn: false, limits: { max_circle_size_kobo: 5000000, max_members: 10 } });
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background }}><ActivityIndicator color={theme.colors.primary} style={{ flex: 1 }} /></SafeAreaView>;

  const completedSteps = STEPS.filter(s => status?.[s.key]).length;
  const pct = Math.round((completedSteps / STEPS.length) * 100);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background }} edges={['left', 'right', 'top']}>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 40 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', paddingTop: 20, marginBottom: 24, gap: 14 }}>
          <TouchableOpacity onPress={() => navigation?.goBack()}>
            <Text style={{ color: theme.colors.primary, fontSize: 22 }}>←</Text>
          </TouchableOpacity>
          <Text style={{ color: theme.colors.text, fontSize: 22, fontWeight: '900' }}>Compliance Status</Text>
        </View>

        <View style={{ backgroundColor: theme.colors.surface, borderRadius: 24, borderWidth: 1, borderColor: theme.colors.border, padding: 22, marginBottom: 20 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <Text style={{ color: theme.colors.text, fontWeight: '900', fontSize: 18 }}>Verification Level</Text>
            <Text style={{ color: theme.colors.primary, fontWeight: '900', fontSize: 18 }}>{pct}%</Text>
          </View>
          <View style={{ height: 10, backgroundColor: theme.colors.background, borderRadius: 5 }}>
            <View style={{ height: 10, width: `${pct}%`, backgroundColor: theme.colors.primary, borderRadius: 5 }} />
          </View>
          <Text style={{ color: theme.colors.muted, fontSize: 13, marginTop: 10 }}>{completedSteps} of {STEPS.length} steps completed</Text>
        </View>

        <View style={{ gap: 10, marginBottom: 20 }}>
          {STEPS.map(step => {
            const done = !!status?.[step.key];
            return (
              <View key={step.key} style={{ backgroundColor: theme.colors.surface, borderRadius: 18, borderWidth: 1, borderColor: done ? theme.colors.primary : theme.colors.border, padding: 16, flexDirection: 'row', alignItems: 'center' }}>
                <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: done ? theme.colors.primary : theme.colors.background, alignItems: 'center', justifyContent: 'center', marginRight: 14 }}>
                  <Text style={{ color: done ? '#fff' : theme.colors.muted, fontWeight: '900', fontSize: 18 }}>{done ? '✓' : '○'}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: theme.colors.text, fontWeight: '800', fontSize: 14 }}>{step.label}</Text>
                  <Text style={{ color: theme.colors.muted, fontSize: 12 }}>{step.desc}</Text>
                </View>
                {!done && (
                  <TouchableOpacity onPress={() => navigation?.navigate(step.key.startsWith('kyc') ? 'KYC' : 'ProfileMain')}
                    style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10, backgroundColor: theme.colors.primary + '22', borderWidth: 1, borderColor: theme.colors.primary }}>
                    <Text style={{ color: theme.colors.primary, fontWeight: '700', fontSize: 12 }}>Start →</Text>
                  </TouchableOpacity>
                )}
              </View>
            );
          })}
        </View>

        {status?.limits && (
          <View style={{ backgroundColor: theme.colors.surface, borderRadius: 20, borderWidth: 1, borderColor: theme.colors.border, padding: 18 }}>
            <Text style={{ color: theme.colors.text, fontWeight: '800', fontSize: 16, marginBottom: 14 }}>Your Current Limits</Text>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: theme.colors.border }}>
              <Text style={{ color: theme.colors.muted, fontSize: 14 }}>Max Circle Amount</Text>
              <Text style={{ color: theme.colors.text, fontWeight: '800', fontSize: 14 }}>₦{((status.limits.max_circle_size_kobo || 0) / 100).toLocaleString()}</Text>
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10 }}>
              <Text style={{ color: theme.colors.muted, fontSize: 14 }}>Max Members per Circle</Text>
              <Text style={{ color: theme.colors.text, fontWeight: '800', fontSize: 14 }}>{status.limits.max_members}</Text>
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
