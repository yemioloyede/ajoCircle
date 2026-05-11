import React from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '../theme';

interface Props {
  navigation?: any;
  route?: { params?: { transaction: any } };
}

const STATUS_COLORS: Record<string, string> = {
  SUCCESS: '#739A63',
  PENDING: '#C28745',
  FAILED: '#CD6B80',
  REVERSED: '#9AB5CF',
};

export default function TransactionDetailScreen({ navigation, route }: Props) {
  const tx = route?.params?.transaction;
  if (!tx) return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <TouchableOpacity onPress={() => navigation?.goBack()} style={{ margin: 24 }}>
        <Text style={{ color: theme.colors.primary, fontSize: 15, fontWeight: '700' }}>← Back</Text>
      </TouchableOpacity>
      <Text style={{ color: theme.colors.muted, textAlign: 'center', fontSize: 15 }}>No transaction data.</Text>
    </SafeAreaView>
  );

  const statusColor = STATUS_COLORS[tx.status] || theme.colors.muted;
  const direction = tx.direction === 'CREDIT' ? 'incoming' : 'outgoing';
  const sign = tx.direction === 'CREDIT' ? '+' : '-';

  const rows = [
    { label: 'Reference', value: tx.payment_reference || tx.transfer_code || tx.id || '—' },
    { label: 'Status', value: tx.status || '—', color: statusColor },
    { label: 'Type', value: tx.type || tx.description || '—' },
    { label: 'Provider', value: tx.provider_name || tx.provider || 'Paystack' },
    { label: 'Date', value: tx.created_at ? new Date(tx.created_at).toLocaleString() : '—' },
    { label: 'Group', value: tx.group_name || tx.group_id || '—' },
  ].filter(r => r.value && r.value !== '—');

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background }} edges={['left', 'right', 'top']}>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 40 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', paddingTop: 20, marginBottom: 28, gap: 14 }}>
          <TouchableOpacity onPress={() => navigation?.goBack()}>
            <Text style={{ color: theme.colors.primary, fontSize: 22 }}>←</Text>
          </TouchableOpacity>
          <Text style={{ color: theme.colors.text, fontSize: 22, fontWeight: '900' }}>Transaction Details</Text>
        </View>

        <View style={{ alignItems: 'center', backgroundColor: theme.colors.surface, borderRadius: 24, padding: 28, borderWidth: 1, borderColor: theme.colors.border, marginBottom: 22 }}>
          <Text style={{ fontSize: 48 }}>{direction === 'incoming' ? '⬆️' : '⬇️'}</Text>
          <Text style={{ color: direction === 'incoming' ? theme.colors.primary : theme.colors.danger, fontSize: 36, fontWeight: '900', marginTop: 12 }}>
            {sign}₦{(Number(tx.amount_kobo || tx.amount || 0) / 100).toLocaleString()}
          </Text>
          <Text style={{ color: theme.colors.muted, fontSize: 15, marginTop: 8 }}>{tx.description || (direction === 'incoming' ? 'Contribution received' : 'Contribution sent')}</Text>
          <View style={{ marginTop: 14, paddingHorizontal: 18, paddingVertical: 7, borderRadius: 12, backgroundColor: theme.colors.background, borderWidth: 1, borderColor: statusColor }}>
            <Text style={{ color: statusColor, fontWeight: '800', fontSize: 14 }}>{tx.status || 'UNKNOWN'}</Text>
          </View>
        </View>

        <View style={{ backgroundColor: theme.colors.surface, borderRadius: 20, borderWidth: 1, borderColor: theme.colors.border, overflow: 'hidden' }}>
          {rows.map((row, i) => (
            <View key={row.label} style={{ flexDirection: 'row', justifyContent: 'space-between', padding: 16, borderBottomWidth: i < rows.length - 1 ? 1 : 0, borderBottomColor: theme.colors.border }}>
              <Text style={{ color: theme.colors.muted, fontSize: 14, fontWeight: '700' }}>{row.label}</Text>
              <Text style={{ color: row.color || theme.colors.text, fontSize: 14, fontWeight: '800', flex: 1, textAlign: 'right', marginLeft: 14 }} numberOfLines={1}>{row.value}</Text>
            </View>
          ))}
        </View>

        {tx.status === 'FAILED' && (
          <TouchableOpacity onPress={() => navigation?.navigate('SupportTicket', { subject: 'Transaction issue', detail: `Reference: ${tx.payment_reference || tx.id}` })}
            style={{ marginTop: 22, height: 58, borderRadius: 18, backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.border, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ color: theme.colors.text, fontWeight: '800', fontSize: 16 }}>🆘 Report an issue</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
