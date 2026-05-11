import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api } from '../api/client';
import { theme } from '../theme';

interface Props {
  navigation?: any;
  route?: { params?: { mode?: 'create' | 'change' } };
}

const DOTS = [0, 1, 2, 3, 4, 5];

export default function TransactionPINScreen({ navigation, route }: Props) {
  const mode = route?.params?.mode ?? 'create';
  const [step, setStep] = useState<'enter' | 'confirm'>(mode === 'change' ? 'enter' : 'enter');
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const current = step === 'confirm' ? confirmPin : pin;
  const setter = step === 'confirm' ? setConfirmPin : setPin;

  function press(digit: string) {
    if (current.length >= 6) return;
    setter(prev => prev + digit);
  }

  function backspace() {
    setter(prev => prev.slice(0, -1));
  }

  async function advance() {
    if (step === 'enter') {
      if (pin.length < 6) { setError('Enter all 6 digits'); return; }
      setStep('confirm'); setError('');
    } else {
      if (confirmPin !== pin) { setError('PINs do not match. Try again.'); setConfirmPin(''); return; }
      setLoading(true); setError('');
      try {
        await api('/api/auth/set-pin', { method: 'POST', body: JSON.stringify({ pin }) });
        Alert.alert('PIN Set!', 'Your transaction PIN is ready.', [
          { text: 'Continue', onPress: () => navigation?.navigate(mode === 'change' ? 'ProfileMain' : 'BiometricSetup') },
        ]);
      } catch (e: any) {
        setError(e.message || 'Could not save PIN. Try again.');
        setPin(''); setConfirmPin(''); setStep('enter');
      } finally {
        setLoading(false);
      }
    }
  }

  const KEYS = [
    ['1', '2', '3'],
    ['4', '5', '6'],
    ['7', '8', '9'],
    ['', '0', '⌫'],
  ];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 28, paddingBottom: 20, alignItems: 'center' }}>
        {mode === 'change' && (
          <TouchableOpacity onPress={() => navigation?.goBack()} style={{ alignSelf: 'flex-start', marginTop: 20 }}>
            <Text style={{ color: theme.colors.primary, fontSize: 15, fontWeight: '700' }}>← Back</Text>
          </TouchableOpacity>
        )}
        <Text style={{ fontSize: 52, marginTop: mode === 'change' ? 24 : 60 }}>🔒</Text>
        <Text style={{ color: theme.colors.text, fontSize: 26, fontWeight: '900', marginTop: 18, textAlign: 'center' }}>
          {step === 'enter' ? (mode === 'change' ? 'New Transaction PIN' : 'Create Transaction PIN') : 'Confirm Your PIN'}
        </Text>
        <Text style={{ color: theme.colors.muted, fontSize: 15, marginTop: 10, textAlign: 'center', lineHeight: 22 }}>
          {step === 'enter' ? 'Choose a 6-digit PIN you\'ll remember.' : 'Enter the same PIN again to confirm.'}
        </Text>

        <View style={{ flexDirection: 'row', gap: 14, marginTop: 36 }}>
          {DOTS.map(i => (
            <View key={i} style={{ width: 18, height: 18, borderRadius: 9, backgroundColor: current.length > i ? theme.colors.primary : theme.colors.border }} />
          ))}
        </View>

        {error ? <Text style={{ color: theme.colors.danger, marginTop: 14, fontWeight: '700', fontSize: 15, textAlign: 'center' }}>{error}</Text> : null}

        <View style={{ width: '100%', marginTop: 40, gap: 14 }}>
          {KEYS.map((row, ri) => (
            <View key={ri} style={{ flexDirection: 'row', gap: 14, justifyContent: 'center' }}>
              {row.map((key, ki) => (
                <TouchableOpacity
                  key={ki}
                  onPress={() => key === '⌫' ? backspace() : key ? press(key) : null}
                  style={{ width: 90, height: 72, borderRadius: 20, backgroundColor: key ? theme.colors.surface : 'transparent', borderWidth: key ? 1 : 0, borderColor: theme.colors.border, alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ color: key === '⌫' ? theme.colors.danger : theme.colors.text, fontSize: key === '⌫' ? 22 : 26, fontWeight: '700' }}>{key}</Text>
                </TouchableOpacity>
              ))}
            </View>
          ))}
        </View>

        {loading
          ? <ActivityIndicator color={theme.colors.primary} style={{ marginTop: 28 }} size="large" />
          : <TouchableOpacity onPress={advance} style={{ marginTop: 28, width: '100%', height: 66, borderRadius: 20, backgroundColor: current.length === 6 ? theme.colors.primary : theme.colors.border, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ color: theme.colors.white, fontSize: 17, fontWeight: '900' }}>{step === 'enter' ? 'Next' : 'Confirm PIN'}</Text>
            </TouchableOpacity>
        }
      </ScrollView>
    </SafeAreaView>
  );
}
