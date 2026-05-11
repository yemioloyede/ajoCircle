import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, ScrollView, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api } from '../api/client';
import { theme } from '../theme';

interface Props {
  navigation?: any;
}

export default function ForgotPasswordScreen({ navigation }: Props) {
  const [step, setStep] = useState<'email' | 'reset'>('email');
  const [email, setEmail] = useState('');
  const [token, setToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  async function requestReset() {
    if (!email.trim()) { setError('Enter your email address'); return; }
    setLoading(true); setError('');
    try {
      const j = await api('/api/auth/forgot-password', { method: 'POST', body: JSON.stringify({ email: email.trim().toLowerCase() }) });
      if (j.resetToken) setToken(j.resetToken);
      setMessage('A reset code has been sent to your email.');
      setStep('reset');
    } catch (e: any) {
      setError(e.message || 'Something went wrong. Try again.');
    } finally {
      setLoading(false);
    }
  }

  async function resetPassword() {
    if (!token.trim()) { setError('Enter the reset code from your email'); return; }
    if (newPassword.length < 8) { setError('Password must be at least 8 characters'); return; }
    if (newPassword !== confirmPassword) { setError('Passwords do not match'); return; }
    setLoading(true); setError('');
    try {
      await api('/api/auth/reset-password', { method: 'POST', body: JSON.stringify({ token: token.trim(), password: newPassword }) });
      setMessage('Password updated! You can now log in.');
      setTimeout(() => navigation?.navigate('Login'), 1500);
    } catch (e: any) {
      setError(e.message || 'Invalid or expired code.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 28, paddingBottom: 40 }}>
        <TouchableOpacity onPress={() => navigation?.goBack()} style={{ marginTop: 20, marginBottom: 10 }}>
          <Text style={{ color: theme.colors.primary, fontSize: 15, fontWeight: '700' }}>← Back</Text>
        </TouchableOpacity>

        <View style={{ alignItems: 'center', marginTop: 24 }}>
          <Text style={{ fontSize: 52 }}>🔐</Text>
          <Text style={{ color: theme.colors.text, fontSize: 26, fontWeight: '900', marginTop: 18, textAlign: 'center' }}>
            {step === 'email' ? 'Forgot Password?' : 'Set New Password'}
          </Text>
          <Text style={{ color: theme.colors.muted, fontSize: 15, marginTop: 10, textAlign: 'center', lineHeight: 22 }}>
            {step === 'email'
              ? 'Enter your email and we\'ll send you a reset code.'
              : 'Enter the code from your email and choose a new password.'}
          </Text>
        </View>

        {message ? (
          <View style={{ marginTop: 20, backgroundColor: '#101714', borderRadius: 14, padding: 14, borderWidth: 1, borderColor: '#274129' }}>
            <Text style={{ color: theme.colors.primary, fontWeight: '700', fontSize: 15, textAlign: 'center' }}>{message}</Text>
          </View>
        ) : null}

        {error ? <Text style={{ color: theme.colors.danger, textAlign: 'center', marginTop: 14, fontWeight: '700', fontSize: 15 }}>{error}</Text> : null}

        {step === 'email' ? (
          <>
            <Text style={{ color: theme.colors.text, fontSize: 16, fontWeight: '700', marginTop: 28 }}>Email Address</Text>
            <TextInput
              style={{ marginTop: 10, height: 58, borderRadius: 14, borderWidth: 1, borderColor: theme.colors.border, backgroundColor: theme.colors.surface, color: theme.colors.text, paddingHorizontal: 16, fontSize: 15 }}
              placeholder="you@example.com"
              placeholderTextColor={theme.colors.mutedSoft}
              autoCapitalize="none"
              keyboardType="email-address"
              value={email}
              onChangeText={setEmail}
            />
            {loading
              ? <ActivityIndicator color={theme.colors.primary} style={{ marginTop: 28 }} size="large" />
              : <TouchableOpacity onPress={requestReset} style={{ marginTop: 28, height: 66, borderRadius: 20, backgroundColor: theme.colors.primary, alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ color: theme.colors.white, fontSize: 17, fontWeight: '900' }}>Send Reset Code</Text>
                </TouchableOpacity>
            }
          </>
        ) : (
          <>
            <Text style={{ color: theme.colors.text, fontSize: 16, fontWeight: '700', marginTop: 28 }}>Reset Code</Text>
            <TextInput
              style={{ marginTop: 10, height: 58, borderRadius: 14, borderWidth: 1, borderColor: theme.colors.border, backgroundColor: theme.colors.surface, color: theme.colors.text, paddingHorizontal: 16, fontSize: 15, letterSpacing: 2 }}
              placeholder="Code from email"
              placeholderTextColor={theme.colors.mutedSoft}
              autoCapitalize="none"
              value={token}
              onChangeText={setToken}
            />
            <Text style={{ color: theme.colors.text, fontSize: 16, fontWeight: '700', marginTop: 20 }}>New Password</Text>
            <TextInput
              style={{ marginTop: 10, height: 58, borderRadius: 14, borderWidth: 1, borderColor: theme.colors.border, backgroundColor: theme.colors.surface, color: theme.colors.text, paddingHorizontal: 16, fontSize: 15 }}
              placeholder="At least 8 characters"
              placeholderTextColor={theme.colors.mutedSoft}
              secureTextEntry
              value={newPassword}
              onChangeText={setNewPassword}
            />
            <Text style={{ color: theme.colors.text, fontSize: 16, fontWeight: '700', marginTop: 20 }}>Confirm Password</Text>
            <TextInput
              style={{ marginTop: 10, height: 58, borderRadius: 14, borderWidth: 1, borderColor: theme.colors.border, backgroundColor: theme.colors.surface, color: theme.colors.text, paddingHorizontal: 16, fontSize: 15 }}
              placeholder="Repeat new password"
              placeholderTextColor={theme.colors.mutedSoft}
              secureTextEntry
              value={confirmPassword}
              onChangeText={setConfirmPassword}
            />
            {loading
              ? <ActivityIndicator color={theme.colors.primary} style={{ marginTop: 28 }} size="large" />
              : <TouchableOpacity onPress={resetPassword} style={{ marginTop: 28, height: 66, borderRadius: 20, backgroundColor: theme.colors.primary, alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ color: theme.colors.white, fontSize: 17, fontWeight: '900' }}>Update Password</Text>
                </TouchableOpacity>
            }
            <TouchableOpacity onPress={() => setStep('email')} style={{ marginTop: 14, alignItems: 'center' }}>
              <Text style={{ color: theme.colors.muted, fontSize: 15, fontWeight: '700' }}>Didn't get a code? Try again</Text>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
