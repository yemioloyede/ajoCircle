import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api } from '../api/client';
import { theme } from '../theme';

interface Props {
  navigation?: any;
  route?: { params?: { subject?: string; detail?: string } };
}

const CATEGORIES = ['Payment Issue', 'Payout Problem', 'Account Access', 'Circle Dispute', 'KYC Issue', 'Other'];
const PRIORITIES = [{ label: 'Normal', color: theme.colors.muted }, { label: 'Urgent', color: '#C28745' }, { label: 'Critical', color: '#CD6B80' }];

export default function SupportTicketScreen({ navigation, route }: Props) {
  const [subject, setSubject] = useState(route?.params?.subject || '');
  const [detail, setDetail] = useState(route?.params?.detail || '');
  const [category, setCategory] = useState('Payment Issue');
  const [priority, setPriority] = useState('Normal');
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!subject.trim() || !detail.trim()) { Alert.alert('Missing info', 'Please fill in the subject and description.'); return; }
    setLoading(true);
    try {
      await api('/api/support/tickets', { method: 'POST', body: JSON.stringify({ subject, detail, category, priority }) });
      Alert.alert('Ticket Submitted ✅', 'We received your request and will respond within 2 hours.', [{ text: 'OK', onPress: () => navigation?.goBack() }]);
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Could not submit ticket. Try again.');
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
            <Text style={{ color: theme.colors.text, fontSize: 22, fontWeight: '900' }}>Support Ticket</Text>
            <Text style={{ color: theme.colors.muted, fontSize: 13 }}>We typically reply within 2 hours</Text>
          </View>
        </View>

        <Text style={{ color: theme.colors.muted, fontSize: 13, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 8 }}>Category</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 20 }}>
          {CATEGORIES.map(cat => (
            <TouchableOpacity key={cat} onPress={() => setCategory(cat)}
              style={{ paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12, marginRight: 8, borderWidth: 1.5, borderColor: category === cat ? theme.colors.primary : theme.colors.border, backgroundColor: category === cat ? theme.colors.primary + '22' : theme.colors.surface }}>
              <Text style={{ color: category === cat ? theme.colors.primary : theme.colors.muted, fontWeight: '700', fontSize: 13 }}>{cat}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <Text style={{ color: theme.colors.muted, fontSize: 13, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 8 }}>Priority</Text>
        <View style={{ flexDirection: 'row', gap: 10, marginBottom: 24 }}>
          {PRIORITIES.map(p => (
            <TouchableOpacity key={p.label} onPress={() => setPriority(p.label)}
              style={{ flex: 1, height: 46, borderRadius: 14, borderWidth: 2, borderColor: priority === p.label ? p.color : theme.colors.border, alignItems: 'center', justifyContent: 'center', backgroundColor: priority === p.label ? p.color + '22' : theme.colors.surface }}>
              <Text style={{ color: priority === p.label ? p.color : theme.colors.muted, fontWeight: '800', fontSize: 14 }}>{p.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={{ color: theme.colors.muted, fontSize: 13, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 8 }}>Subject</Text>
        <View style={{ backgroundColor: theme.colors.surface, borderRadius: 16, borderWidth: 1, borderColor: theme.colors.border, paddingHorizontal: 16, height: 56, justifyContent: 'center', marginBottom: 20 }}>
          <TextInput value={subject} onChangeText={setSubject} placeholder="Brief description of your issue" placeholderTextColor={theme.colors.muted} style={{ color: theme.colors.text, fontSize: 15 }} />
        </View>

        <Text style={{ color: theme.colors.muted, fontSize: 13, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 8 }}>Description</Text>
        <View style={{ backgroundColor: theme.colors.surface, borderRadius: 16, borderWidth: 1, borderColor: theme.colors.border, padding: 16, marginBottom: 28 }}>
          <TextInput value={detail} onChangeText={setDetail} multiline numberOfLines={6} placeholder="Describe your issue in detail. Include transaction references if applicable." placeholderTextColor={theme.colors.muted} style={{ color: theme.colors.text, fontSize: 15, minHeight: 120, textAlignVertical: 'top' }} />
        </View>

        <TouchableOpacity onPress={submit} disabled={loading}
          style={{ height: 62, borderRadius: 20, backgroundColor: loading ? theme.colors.surface : theme.colors.primary, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: theme.colors.border }}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={{ color: '#fff', fontSize: 18, fontWeight: '900' }}>Submit Ticket</Text>}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}
