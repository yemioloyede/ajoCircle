import React, { useState, useRef, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api } from '../api/client';
import { theme } from '../theme';

interface Props {
  navigation?: any;
  route?: { params?: { email?: string; phone?: string; mode?: 'register' | 'forgot' } };
}

export default function OTPVerificationScreen({ navigation, route }: Props) {
  const { email, phone, mode = 'register' } = route?.params || {};
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [countdown, setCountdown] = useState(60);
  const refs = useRef<(TextInput | null)[]>([]);

  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setTimeout(() => setCountdown(c => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [countdown]);

  const code = otp.join('');

  function handleDigit(text: string, index: number) {
    const digit = text.replace(/\D/g, '').slice(-1);
    const next = [...otp];
    next[index] = digit;
    setOtp(next);
    if (digit && index < 5) refs.current[index + 1]?.focus();
    if (!digit && index > 0) refs.current[index - 1]?.focus();
  }

  async function verify() {
    if (code.length < 6) { setError('Enter all 6 digits'); return; }
    setLoading(true); setError('');
    try {
      await api('/api/auth/verify-otp', { method: 'POST', body: JSON.stringify({ email, phone, code, mode }) });
      setSuccess('Verified! Redirecting...');
      setTimeout(() => {
        if (mode === 'forgot') navigation?.navigate('ForgotPassword', { token: code });
        else navigation?.navigate('TransactionPIN');
      }, 800);
    } catch (e: any) {
      setError(e.message || 'Invalid code. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  async function resend() {
    if (countdown > 0) return;
    setCountdown(60); setError('');
    try {
      await api('/api/auth/resend-otp', { method: 'POST', body: JSON.stringify({ email, phone }) });
    } catch {}
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 28, paddingBottom: 40 }}>
        <TouchableOpacity onPress={() => navigation?.goBack()} style={{ marginTop: 20, marginBottom: 10 }}>
          <Text style={{ color: theme.colors.primary, fontSize: 15, fontWeight: '700' }}>← Back</Text>
        </TouchableOpacity>

        <View style={{ alignItems: 'center', marginTop: 32 }}>
          <Text style={{ fontSize: 52 }}>📱</Text>
          <Text style={{ color: theme.colors.text, fontSize: 26, fontWeight: '900', marginTop: 18, textAlign: 'center' }}>Check your {email ? 'email' : 'phone'}</Text>
          <Text style={{ color: theme.colors.muted, fontSize: 16, marginTop: 10, textAlign: 'center', lineHeight: 24 }}>
            We sent a 6-digit code to{'\n'}
            <Text style={{ color: theme.colors.text, fontWeight: '700' }}>{email || phone}</Text>
          </Text>
        </View>

        <View style={{ flexDirection: 'row', gap: 10, justifyContent: 'center', marginTop: 40 }}>
          {otp.map((digit, i) => (
            <TextInput
              key={i}
              ref={r => { refs.current[i] = r; }}
              style={{
                width: 48, height: 60, borderRadius: 14, borderWidth: 2,
                borderColor: digit ? theme.colors.primary : theme.colors.border,
                backgroundColor: theme.colors.surface, color: theme.colors.text,
                textAlign: 'center', fontSize: 22, fontWeight: '900',
              }}
              value={digit}
              onChangeText={t => handleDigit(t, i)}
              keyboardType="number-pad"
              maxLength={1}
              selectTextOnFocus
            />
          ))}
        </View>

        {error ? <Text style={{ color: theme.colors.danger, textAlign: 'center', marginTop: 16, fontWeight: '700', fontSize: 15 }}>{error}</Text> : null}
        {success ? <Text style={{ color: theme.colors.primary, textAlign: 'center', marginTop: 16, fontWeight: '700', fontSize: 15 }}>{success}</Text> : null}

        {loading ? (
          <ActivityIndicator color={theme.colors.primary} style={{ marginTop: 32 }} size="large" />
        ) : (
          <TouchableOpacity
            onPress={verify}
            style={{ marginTop: 32, height: 66, borderRadius: 20, backgroundColor: code.length === 6 ? theme.colors.primary : theme.colors.border, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ color: theme.colors.white, fontSize: 17, fontWeight: '900' }}>Verify Code</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity onPress={resend} style={{ marginTop: 20, alignItems: 'center' }}>
          <Text style={{ color: countdown > 0 ? theme.colors.mutedSoft : theme.colors.primary, fontSize: 15, fontWeight: '700' }}>
            {countdown > 0 ? `Resend code in ${countdown}s` : 'Resend code'}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}
