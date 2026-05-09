import React, { useState } from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { Button, Input, Card } from '../components/ui';
import { useAuth } from '../context/AuthContext';

export default function AuthScreen() {
  const a = useAuth();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
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

  return (
    <View style={{ flex: 1, backgroundColor: '#F2F7F4', padding: 22, justifyContent: 'center' }}>
      <Text style={{ fontSize: 36, fontWeight: '900', color: '#082017' }}>AjoCircle</Text>
      <Text style={{ fontSize: 16, color: '#52655c', marginBottom: 20 }}>
        Secure rotational savings for trusted communities.
      </Text>
      <Card>
        {mode === 'register' && (
          <>
        <Input placeholder="Full name" autoCapitalize="words" onChangeText={(v: string) => setFullName(v)} />
          <Input placeholder="Phone (+2348012345678)" keyboardType="phone-pad" onChangeText={(v: string) => setPhone(v)} />
          </>
        )}
        <Input placeholder="Email" autoCapitalize="none" keyboardType="email-address" onChangeText={(v: string) => setEmail(v)} />
        <Input placeholder="Password" secureTextEntry onChangeText={(v: string) => setPassword(v)} />
        {loading
          ? <ActivityIndicator color="#0B6B45" style={{ marginVertical: 12 }} />
          : <Button title={mode === 'login' ? 'Login' : 'Create Account'} onPress={submit} />}
        {!!err && <Text style={{ color: 'red', textAlign: 'center', marginTop: 8 }}>{err}</Text>}
        <Text
          onPress={() => { setMode(mode === 'login' ? 'register' : 'login'); setErr(''); }}
          style={{ textAlign: 'center', color: '#0B6B45', fontWeight: '700', marginTop: 12 }}>
          {mode === 'login' ? 'Create account' : 'I already have an account'}
        </Text>
      </Card>
    </View>
  );
}

