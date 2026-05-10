import React, { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Card, Button, Input, InfoBanner, Pill, SectionHeader } from '../components/ui';
import { api } from '../api/client';
import { theme } from '../theme';

const STATUS_COLORS: Record<string, string> = {
  VERIFIED: '#0b6b45',
  REJECTED: '#c62828',
  PENDING: '#e65100',
  NOT_SUBMITTED: '#888',
};

export default function KYCScreen() {
  const [status, setStatus] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const [bvn, setBvn] = useState('');
  const [nin, setNin] = useState('');

  async function load() {
    try {
      const j = await api('/api/users/kyc');
      setStatus(j.kyc || null);
    } catch {
      // no KYC yet
      setStatus(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function submit() {
    if (bvn.trim().length !== 11) { setMsg('BVN must be 11 digits'); return; }
    setSaving(true);
    setMsg('');
    try {
      await api('/api/users/kyc', {
        method: 'POST',
        body: JSON.stringify({ bvn: bvn.trim(), ...(nin.trim() ? { nin: nin.trim() } : {}) }),
      });
      setMsg('KYC submitted — pending review');
      await load();
    } catch (e: any) { setMsg(e.message); }
    finally { setSaving(false); }
  }

  if (loading) return <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.colors.background }}><ActivityIndicator color={theme.colors.primary} size="large" /></View>;

  const kycStatus = status?.status || 'NOT_SUBMITTED';

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background }} edges={['left', 'right', 'top']}>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: theme.spacing.lg, paddingBottom: theme.spacing.xl * 2 }}>
      <Card style={{ backgroundColor: theme.colors.surfaceAlt }}>
        <SectionHeader title="KYC Verification" />
        <Text style={{ color: theme.colors.muted, lineHeight: 20 }}>Verify your identity to unlock payouts and keep the circle compliant.</Text>
      </Card>

      <Card>
        <Text style={{ fontWeight: '700', marginBottom: 4, color: theme.colors.text }}>Current Status</Text>
        <Pill label={kycStatus} tone={kycStatus === 'VERIFIED' ? 'success' : kycStatus === 'PENDING' ? 'warning' : 'secondary'} />
        {status?.rejection_reason && (
          <Text style={{ color: theme.colors.danger, marginTop: 8 }}>Reason: {status.rejection_reason}</Text>
        )}
      </Card>

      {(kycStatus === 'NOT_SUBMITTED' || kycStatus === 'REJECTED') && (
        <Card>
          <Text style={{ fontWeight: '800', marginBottom: 8, color: theme.colors.text }}>
            {kycStatus === 'REJECTED' ? 'Resubmit KYC' : 'Submit KYC'}
          </Text>
          <InfoBanner title="Encrypted by default" message="Your BVN and NIN are handled securely by the backend and are not shown in plain text." tone="primary" />
          <Input label="BVN" placeholder="11 digits" keyboardType="number-pad" maxLength={11} onChangeText={setBvn} value={bvn} />
          <Input label="NIN (optional)" placeholder="11 digits" keyboardType="number-pad" maxLength={11} onChangeText={setNin} value={nin} />
          {msg ? <Text style={{ color: msg.includes('submitted') ? theme.colors.primary : theme.colors.danger, marginBottom: 8, fontWeight: '700' }}>{msg}</Text> : null}
          {saving ? <ActivityIndicator color={theme.colors.primary} /> : <Button title="Submit KYC" onPress={submit} />}
        </Card>
      )}

      {kycStatus === 'PENDING' && (
        <Card>
          <Text style={{ color: theme.colors.warning, fontWeight: '700' }}>Your KYC is under review. We'll notify you once it's approved.</Text>
        </Card>
      )}
    </ScrollView>
    </SafeAreaView>
  );
}
