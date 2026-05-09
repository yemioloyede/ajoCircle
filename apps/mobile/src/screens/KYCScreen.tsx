import React, { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, ScrollView } from 'react-native';
import { Card, Button, Input } from '../components/ui';
import { api } from '../api/client';

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

  if (loading) return <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}><ActivityIndicator color="#0B6B45" size="large" /></View>;

  const kycStatus = status?.status || 'NOT_SUBMITTED';

  return (
    <ScrollView style={{ flex: 1, backgroundColor: '#F2F7F4', padding: 18 }}>
      <Text style={{ fontSize: 26, fontWeight: '900', color: '#082017', marginBottom: 4 }}>KYC Verification</Text>
      <Text style={{ color: '#52655c', marginBottom: 16 }}>Verify your identity to unlock payouts.</Text>

      <Card>
        <Text style={{ fontWeight: '700', marginBottom: 4 }}>Current Status</Text>
        <Text style={{ fontSize: 20, fontWeight: '900', color: STATUS_COLORS[kycStatus] || '#888' }}>{kycStatus}</Text>
        {status?.rejection_reason && (
          <Text style={{ color: '#c62828', marginTop: 8 }}>Reason: {status.rejection_reason}</Text>
        )}
      </Card>

      {(kycStatus === 'NOT_SUBMITTED' || kycStatus === 'REJECTED') && (
        <Card>
          <Text style={{ fontWeight: '800', marginBottom: 8 }}>
            {kycStatus === 'REJECTED' ? 'Resubmit KYC' : 'Submit KYC'}
          </Text>
          <Text style={{ color: '#52655c', fontSize: 13, marginBottom: 8 }}>Your data is encrypted and never stored in plain text.</Text>
          <Input placeholder="BVN (11 digits)" keyboardType="number-pad" maxLength={11} onChangeText={setBvn} value={bvn} />
          <Input placeholder="NIN (optional, 11 digits)" keyboardType="number-pad" maxLength={11} onChangeText={setNin} value={nin} />
          {msg ? <Text style={{ color: msg.includes('submitted') ? '#0b6b45' : 'red', marginBottom: 8, fontWeight: '700' }}>{msg}</Text> : null}
          {saving
            ? <ActivityIndicator color="#0B6B45" />
            : <Button title="Submit KYC" onPress={submit} />}
        </Card>
      )}

      {kycStatus === 'PENDING' && (
        <Card>
          <Text style={{ color: '#e65100', fontWeight: '700' }}>Your KYC is under review. We'll notify you once it's approved.</Text>
        </Card>
      )}
      <View style={{ height: 40 }} />
    </ScrollView>
  );
}
