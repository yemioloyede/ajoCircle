import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator, Linking, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api } from '../api/client';
import { theme } from '../theme';

interface Props {
  navigation?: any;
  route?: { params?: { groupId: string; groupName?: string; amountKobo?: number } };
}

const METHODS = [
  { id: 'card', icon: '💳', label: 'Card Payment', desc: 'Debit or credit card' },
  { id: 'bank', icon: '🏦', label: 'Bank Transfer', desc: 'Direct bank transfer' },
  { id: 'ussd', icon: '📱', label: 'USSD', desc: 'Dial *737# etc.' },
];

export default function MakeContributionScreen({ navigation, route }: Props) {
  const { groupId, groupName, amountKobo = 0 } = route?.params || {};
  const [method, setMethod] = useState('card');
  const [loading, setLoading] = useState(false);
  const [pendingRef, setPendingRef] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);

  async function pay() {
    setLoading(true);
    try {
      const j = await api('/api/contributions/initialize', { method: 'POST', body: JSON.stringify({ groupId }) });
      const url = j.payment?.authorization_url;
      const ref = j.contribution?.payment_reference;
      if (url) {
        if (await Linking.canOpenURL(url)) {
          await Linking.openURL(url);
          if (ref) setPendingRef(ref);
        } else {
          Alert.alert('Cannot open payment link', url);
        }
      }
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setLoading(false);
    }
  }

  async function confirm() {
    if (!pendingRef) return;
    setConfirming(true);
    try {
      const j = await api('/api/contributions/verify', { method: 'POST', body: JSON.stringify({ reference: pendingRef }) });
      navigation?.navigate('PaymentSuccess', { message: j.message, reference: pendingRef });
    } catch (e: any) {
      navigation?.navigate('FailedPayment', { error: e.message, groupId, groupName, amountKobo });
    } finally {
      setConfirming(false);
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background }} edges={['left', 'right', 'top']}>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 40 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', paddingTop: 20, marginBottom: 24, gap: 14 }}>
          <TouchableOpacity onPress={() => navigation?.goBack()}>
            <Text style={{ color: theme.colors.primary, fontSize: 22 }}>←</Text>
          </TouchableOpacity>
          <Text style={{ color: theme.colors.text, fontSize: 22, fontWeight: '900' }}>Make Contribution</Text>
        </View>

        <View style={{ backgroundColor: theme.colors.surface, borderRadius: 20, padding: 20, borderWidth: 1, borderColor: theme.colors.border, marginBottom: 24 }}>
          <Text style={{ color: theme.colors.muted, fontSize: 14, fontWeight: '700' }}>Circle</Text>
          <Text style={{ color: theme.colors.text, fontSize: 18, fontWeight: '900', marginTop: 4 }}>{groupName || 'Circle'}</Text>
          <View style={{ borderTopWidth: 1, borderTopColor: theme.colors.border, marginTop: 14, paddingTop: 14 }}>
            <Text style={{ color: theme.colors.muted, fontSize: 14, fontWeight: '700' }}>Amount Due</Text>
            <Text style={{ color: theme.colors.primary, fontSize: 32, fontWeight: '900', marginTop: 4 }}>₦{(amountKobo / 100).toLocaleString()}</Text>
          </View>
        </View>

        <Text style={{ color: theme.colors.text, fontSize: 18, fontWeight: '900', marginBottom: 14 }}>Payment Method</Text>
        <View style={{ gap: 12 }}>
          {METHODS.map(m => (
            <TouchableOpacity key={m.id} onPress={() => setMethod(m.id)}
              style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: theme.colors.surface, borderRadius: 18, padding: 16, borderWidth: 2, borderColor: method === m.id ? theme.colors.primary : theme.colors.border }}>
              <Text style={{ fontSize: 26, marginRight: 14 }}>{m.icon}</Text>
              <View style={{ flex: 1 }}>
                <Text style={{ color: theme.colors.text, fontSize: 15, fontWeight: '800' }}>{m.label}</Text>
                <Text style={{ color: theme.colors.muted, fontSize: 13, marginTop: 3 }}>{m.desc}</Text>
              </View>
              {method === m.id && <Text style={{ color: theme.colors.primary, fontSize: 18 }}>✓</Text>}
            </TouchableOpacity>
          ))}
        </View>

        {pendingRef ? (
          <View style={{ marginTop: 22, backgroundColor: '#2A2115', borderRadius: 18, padding: 18, borderWidth: 1, borderColor: '#5B4A31' }}>
            <Text style={{ color: theme.colors.text, fontWeight: '900', fontSize: 16 }}>Payment opened in browser</Text>
            <Text style={{ color: theme.colors.muted, fontSize: 14, marginTop: 8, lineHeight: 22 }}>
              Once you've paid on Paystack, tap below to confirm and record your contribution.
            </Text>
            {confirming ? <ActivityIndicator color={theme.colors.primary} style={{ marginTop: 14 }} /> : (
              <TouchableOpacity onPress={confirm} style={{ marginTop: 14, height: 56, borderRadius: 16, backgroundColor: theme.colors.primary, alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ color: theme.colors.white, fontWeight: '900', fontSize: 16 }}>✅ I've paid — Confirm</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : loading ? (
          <ActivityIndicator color={theme.colors.primary} style={{ marginTop: 32 }} size="large" />
        ) : (
          <TouchableOpacity onPress={pay} style={{ marginTop: 28, height: 68, borderRadius: 22, backgroundColor: theme.colors.primary, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ color: theme.colors.white, fontSize: 18, fontWeight: '900' }}>Pay ₦{(amountKobo / 100).toLocaleString()}</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
