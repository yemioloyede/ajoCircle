import React, { useMemo, useState } from 'react';
import { View, Text, ActivityIndicator, ScrollView, TouchableOpacity, TextInput } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import { theme } from '../theme';

type Props = {
  onBackToIntro?: () => void;
};

export default function AuthScreen({ onBackToIntro }: Props) {
  const a = useAuth();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showReset, setShowReset] = useState(false);
  const [resetMsg, setResetMsg] = useState('');
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit() {
    setErr('');
    if (!email.trim() || !password.trim()) { setErr('Email and password are required'); return; }
    if (mode === 'register' && (!fullName.trim() || !phone.trim())) { setErr('All fields are required'); return; }
    setLoading(true);
    try {
      if (mode === 'login') {
        await a.login(email, password);
      } else {
        await a.register(fullName, email, phone, password);
      }
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function requestReset() {
    setErr('');
    setResetMsg('');
    if (!email.trim()) {
      setErr('Enter your email to request reset');
      return;
    }
    setLoading(true);
    try {
      const j = await api('/api/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });
      if (j.resetToken) setResetToken(j.resetToken);
      setResetMsg(j.message || 'Reset instructions sent.');
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function resetPassword() {
    setErr('');
    setResetMsg('');
    if (!resetToken.trim() || !newPassword.trim()) {
      setErr('Reset token and new password are required');
      return;
    }
    setLoading(true);
    try {
      const j = await api('/api/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({ token: resetToken.trim(), password: newPassword }),
      });
      setResetMsg(j.message || 'Password reset successful.');
      setShowReset(false);
      setMode('login');
      setPassword('');
      setNewPassword('');
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: theme.colors.background }} contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 44 }}>
      <View style={{ marginTop: 24, marginBottom: 14 }}>
        <Text style={{ color: theme.colors.primary, fontSize: 18 }}>◎</Text>
        <Text style={{ fontSize: 18, fontWeight: '900', color: theme.colors.text, marginTop: 14 }}>Join AjoCircle</Text>
        <Text style={{ fontSize: 13, color: theme.colors.muted, marginTop: 12, lineHeight: 20 }}>Secure rotational savings for your community.</Text>
      </View>

      <View style={{ borderWidth: 1, borderColor: theme.colors.border, borderRadius: 16, padding: 8, flexDirection: 'row', marginTop: 20 }}>
        <View style={{ flex: 1 }}>
          <TabChip active={mode === 'register'} label="Create Account" onPress={() => setMode('register')} />
        </View>
        <View style={{ flex: 1 }}>
          <TabChip active={mode === 'login'} label="Sign In" onPress={() => setMode('login')} />
        </View>
      </View>

      {mode === 'register' ? (
        <>
          <Text style={{ color: theme.colors.text, fontWeight: '800', fontSize: 16, marginTop: 24 }}>Phone Number</Text>
          <View style={{ flexDirection: 'row', gap: 12, marginTop: 12 }}>
            <View style={{ width: 110, borderWidth: 1, borderColor: theme.colors.border, borderRadius: 14, height: 64, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.surface }}>
              <Text style={{ color: theme.colors.text, fontWeight: '700', fontSize: 13 }}>+234</Text>
            </View>
            <TextInput
              style={{ flex: 1, borderWidth: 1, borderColor: theme.colors.border, borderRadius: 14, height: 60, color: theme.colors.text, paddingHorizontal: 18, fontSize: 15 }}
              placeholder="803 000 0000"
              placeholderTextColor={theme.colors.mutedSoft}
              keyboardType="phone-pad"
              value={phone}
              onChangeText={setPhone}
            />
          </View>

          <Text style={{ color: theme.colors.text, fontWeight: '800', fontSize: 16, marginTop: 24 }}>Full Name</Text>
          <TextInput
            style={{ borderWidth: 1, borderColor: theme.colors.border, borderRadius: 14, height: 60, color: theme.colors.text, paddingHorizontal: 18, fontSize: 15, marginTop: 12 }}
            placeholder="As it appears on your ID"
            placeholderTextColor={theme.colors.mutedSoft}
            autoCapitalize="words"
            value={fullName}
            onChangeText={setFullName}
          />
        </>
      ) : null}

      <Text style={{ color: theme.colors.text, fontWeight: '800', fontSize: 16, marginTop: 24 }}>Email Address</Text>
      <TextInput
        style={{ borderWidth: 1, borderColor: theme.colors.border, borderRadius: 14, height: 60, color: theme.colors.text, paddingHorizontal: 18, fontSize: 15, marginTop: 12 }}
        placeholder="you@example.com"
        placeholderTextColor={theme.colors.mutedSoft}
        autoCapitalize="none"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
      />

      <Text style={{ color: theme.colors.text, fontWeight: '800', fontSize: 16, marginTop: 24 }}>Password</Text>
      <TextInput
        style={{ borderWidth: 1, borderColor: theme.colors.border, borderRadius: 14, height: 60, color: theme.colors.text, paddingHorizontal: 18, fontSize: 15, marginTop: 12 }}
        placeholder="••••••••"
        placeholderTextColor={theme.colors.mutedSoft}
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />

      {mode === 'login' ? (
        <Text
          onPress={() => { setShowReset(!showReset); setErr(''); setResetMsg(''); }}
          style={{ marginTop: 10, color: theme.colors.primary, fontSize: 13, fontWeight: '700' }}>
          {showReset ? 'Hide password reset' : 'Forgot password?'}
        </Text>
      ) : null}

      {showReset ? (
        <View style={{ marginTop: 14, borderWidth: 1, borderColor: theme.colors.border, borderRadius: 14, padding: 16, backgroundColor: theme.colors.surface }}>
          <Text style={{ color: theme.colors.text, fontSize: 15, fontWeight: '800' }}>Reset Your Password</Text>
          <Text style={{ color: theme.colors.muted, fontSize: 14, marginTop: 6, lineHeight: 22 }}>Enter your email above, then tap the button below. We'll send you a recovery code.</Text>
          <TouchableOpacity onPress={requestReset} style={{ marginTop: 12, height: 52, borderRadius: 12, backgroundColor: theme.colors.primary, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ color: theme.colors.white, fontWeight: '800', fontSize: 15 }}>Send Reset Code</Text>
          </TouchableOpacity>

          {!!resetToken && (
            <>
              <Text style={{ color: theme.colors.text, fontSize: 14, fontWeight: '800', marginTop: 14 }}>Enter Reset Code</Text>
              <TextInput
                style={{ borderWidth: 1, borderColor: theme.colors.border, borderRadius: 10, height: 52, color: theme.colors.text, paddingHorizontal: 14, fontSize: 15, marginTop: 8 }}
                placeholder="Paste code from email"
                placeholderTextColor={theme.colors.mutedSoft}
                autoCapitalize="none"
                value={resetToken}
                onChangeText={setResetToken}
              />
              <TextInput
                style={{ borderWidth: 1, borderColor: theme.colors.border, borderRadius: 10, height: 52, color: theme.colors.text, paddingHorizontal: 14, fontSize: 15, marginTop: 10 }}
                placeholder="New password"
                placeholderTextColor={theme.colors.mutedSoft}
                secureTextEntry
                value={newPassword}
                onChangeText={setNewPassword}
              />
              <TouchableOpacity onPress={resetPassword} style={{ marginTop: 10, height: 52, borderRadius: 12, backgroundColor: theme.colors.primary, alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ color: theme.colors.white, fontWeight: '800', fontSize: 15 }}>Set New Password</Text>
              </TouchableOpacity>
            </>
          )}
          {!!resetMsg && <Text style={{ color: theme.colors.primary, marginTop: 10, fontWeight: '700', fontSize: 14 }}>{resetMsg}</Text>}
        </View>
      ) : null}

      {loading ? <ActivityIndicator color={theme.colors.primary} style={{ marginTop: 22 }} /> : (
        <TouchableOpacity onPress={submit} style={{ marginTop: 26, height: 66, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.primary }}>
          <Text style={{ color: theme.colors.white, fontWeight: '800', fontSize: 15 }}>{mode === 'login' ? 'Sign In' : 'Create Account'}</Text>
        </TouchableOpacity>
      )}
      {!!err && <Text style={{ color: theme.colors.danger, textAlign: 'center', marginTop: 12, fontWeight: '700' }}>{err}</Text>}

      <Text style={{ marginTop: 24, textAlign: 'center', color: theme.colors.muted, fontSize: 16 }}>
        By continuing, you agree to our <Text style={{ color: theme.colors.primary }}>Terms of Service</Text>
      </Text>

      <View style={{ marginTop: 16, borderWidth: 1, borderColor: '#28412C', borderRadius: 20, height: 52, alignItems: 'center', justifyContent: 'center', backgroundColor: '#111815' }}>
        <Text style={{ color: theme.colors.text, fontWeight: '700', fontSize: 13 }}>🔒 Bank-grade 256-bit encryption</Text>
      </View>

      <Text
        onPress={() => { setMode(mode === 'login' ? 'register' : 'login'); setErr(''); }}
        style={{ textAlign: 'center', color: theme.colors.primary, fontWeight: '800', marginTop: 14, fontSize: 16 }}>
          {mode === 'login' ? 'Create account instead' : 'I already have an account'}
      </Text>

      {onBackToIntro ? (
        <Text
          onPress={onBackToIntro}
          style={{ textAlign: 'center', color: theme.colors.muted, fontWeight: '700', marginTop: 8, fontSize: 15 }}>
          Back to intro
        </Text>
      ) : null}
    </ScrollView>
  );
}

function TabChip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={{
        flex: 1,
        paddingVertical: 14,
        borderRadius: 10,
        backgroundColor: active ? '#2A3037' : 'transparent',
        alignItems: 'center',
      }}>
      <Text style={{ color: active ? theme.colors.text : theme.colors.muted, fontWeight: '800', fontSize: 16 }}>{label}</Text>
    </TouchableOpacity>
  );
}

function StepRow({ index, label, active = false }: { index: number; label: string; active?: boolean }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
      <View style={{ width: 42, height: 42, borderRadius: 22, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: active ? theme.colors.primary : theme.colors.border, backgroundColor: active ? theme.colors.primary : 'transparent' }}>
        <Text style={{ color: active ? theme.colors.white : theme.colors.muted, fontSize: 13, fontWeight: '800' }}>{index}</Text>
      </View>
      <Text style={{ marginLeft: 14, color: active ? theme.colors.text : theme.colors.mutedSoft, fontSize: 13, fontWeight: '700' }}>{label}</Text>
    </View>
  );
}

