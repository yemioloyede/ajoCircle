import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api } from '../api/client';
import { theme } from '../theme';

interface Props { navigation?: any; route?: { params?: { groupId?: string; transactionId?: string } }; }

const REASONS = ['Payout not received', 'Wrong amount paid', 'Duplicate charge', 'Member misconduct', 'Unauthorized transaction', 'Other'];

export default function DisputeResolutionScreen({ navigation, route }: Props) {
  const [reason, setReason] = useState('');
  const [detail, setDetail] = useState('');
  const [evidence, setEvidence] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!reason || !detail.trim()) { Alert.alert('Fill all fields', 'Please select a reason and describe the issue.'); return; }
    setLoading(true);
    try {
      await api('/api/disputes', { method: 'POST', body: JSON.stringify({ reason, detail, evidence_note: evidence, group_id: route?.params?.groupId, transaction_id: route?.params?.transactionId }) });
      Alert.alert('Dispute Filed ✅', 'Our compliance team will review your case within 3 business days.', [{ text: 'OK', onPress: () => navigation?.goBack() }]);
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Could not file dispute.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background }} edges={['left', 'right', 'top']}>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
        <View style={{ flexDirection: 'row', alignItems: 'center', paddingTop: 20, marginBottom: 28, gap: 14 }}>
          <TouchableOpacity onPress={() => navigation?.goBack()}>
            <Text style={{ color: theme.colors.primary, fontSize: 22 }}>←</Text>
          </TouchableOpacity>
          <View>
            <Text style={{ color: theme.colors.text, fontSize: 22, fontWeight: '900' }}>Dispute Resolution</Text>
            <Text style={{ color: theme.colors.muted, fontSize: 13 }}>Reviewed within 3 business days</Text>
          </View>
        </View>

        <View style={{ backgroundColor: '#C2874522', borderRadius: 16, borderWidth: 1, borderColor: '#C28745', padding: 14, marginBottom: 24 }}>
          <Text style={{ color: '#C28745', fontWeight: '800', fontSize: 14 }}>⚠️ Before filing a dispute</Text>
          <Text style={{ color: '#C28745', fontSize: 13, marginTop: 6 }}>Try resolving the issue directly within your circle first. Disputes may affect your Trust Score if found to be unfounded.</Text>
        </View>

        <Text style={{ color: theme.colors.muted, fontSize: 13, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 10 }}>Reason</Text>
        <View style={{ gap: 8, marginBottom: 24 }}>
          {REASONS.map(r => (
            <TouchableOpacity key={r} onPress={() => setReason(r)}
              style={{ height: 52, paddingHorizontal: 18, borderRadius: 14, borderWidth: 2, borderColor: reason === r ? theme.colors.primary : theme.colors.border, backgroundColor: theme.colors.surface, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Text style={{ color: reason === r ? theme.colors.primary : theme.colors.text, fontWeight: '700', fontSize: 14 }}>{r}</Text>
              {reason === r && <Text style={{ color: theme.colors.primary, fontWeight: '900' }}>✓</Text>}
            </TouchableOpacity>
          ))}
        </View>

        <Text style={{ color: theme.colors.muted, fontSize: 13, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 8 }}>What happened?</Text>
        <View style={{ backgroundColor: theme.colors.surface, borderRadius: 16, borderWidth: 1, borderColor: theme.colors.border, padding: 16, marginBottom: 20 }}>
          <TextInput value={detail} onChangeText={setDetail} multiline numberOfLines={5} placeholder="Describe what happened, including dates and amounts." placeholderTextColor={theme.colors.muted} style={{ color: theme.colors.text, fontSize: 15, minHeight: 100, textAlignVertical: 'top' }} />
        </View>

        <Text style={{ color: theme.colors.muted, fontSize: 13, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 8 }}>Evidence / Notes (optional)</Text>
        <View style={{ backgroundColor: theme.colors.surface, borderRadius: 16, borderWidth: 1, borderColor: theme.colors.border, padding: 16, marginBottom: 28 }}>
          <TextInput value={evidence} onChangeText={setEvidence} multiline numberOfLines={3} placeholder="Transaction references, screenshots info, witness names..." placeholderTextColor={theme.colors.muted} style={{ color: theme.colors.text, fontSize: 15, minHeight: 72, textAlignVertical: 'top' }} />
        </View>

        <TouchableOpacity onPress={submit} disabled={loading}
          style={{ height: 62, borderRadius: 20, backgroundColor: loading ? theme.colors.surface : '#C28745', alignItems: 'center', justifyContent: 'center' }}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={{ color: '#fff', fontSize: 18, fontWeight: '900' }}>File Dispute</Text>}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}
