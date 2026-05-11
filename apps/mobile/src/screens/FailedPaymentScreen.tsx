import React from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '../theme';

interface Props {
  navigation?: any;
  route?: { params?: { error?: string; groupId?: string; groupName?: string; amountKobo?: number } };
}

export default function FailedPaymentScreen({ navigation, route }: Props) {
  const { error, groupId, groupName, amountKobo } = route?.params || {};

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 28, paddingBottom: 60, alignItems: 'center' }}>
        <Text style={{ fontSize: 80, marginTop: 80 }}>😞</Text>

        <Text style={{ color: theme.colors.text, fontSize: 28, fontWeight: '900', marginTop: 22, textAlign: 'center' }}>Payment Failed</Text>
        <Text style={{ color: theme.colors.muted, fontSize: 16, marginTop: 12, textAlign: 'center', lineHeight: 26 }}>
          Something went wrong with your payment. Don't worry — no money was taken.
        </Text>

        {error && (
          <View style={{ marginTop: 22, backgroundColor: '#2A1A1E', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#5B2A3B', width: '100%' }}>
            <Text style={{ color: theme.colors.danger, fontSize: 14, fontWeight: '700', textAlign: 'center' }}>{error}</Text>
          </View>
        )}

        <View style={{ marginTop: 32, width: '100%', gap: 14 }}>
          <Text style={{ color: theme.colors.text, fontSize: 18, fontWeight: '900', marginBottom: 4 }}>What you can do</Text>
          {[
            { icon: '🔄', title: 'Try again', desc: 'Retry with the same payment method' },
            { icon: '💳', title: 'Use a different method', desc: 'Try another card or bank account' },
            { icon: '🆘', title: 'Contact support', desc: 'We can help if your money was debited' },
          ].map(item => (
            <View key={item.title} style={{ flexDirection: 'row', alignItems: 'flex-start', backgroundColor: theme.colors.surface, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: theme.colors.border }}>
              <Text style={{ fontSize: 24, marginRight: 14, marginTop: 2 }}>{item.icon}</Text>
              <View>
                <Text style={{ color: theme.colors.text, fontSize: 15, fontWeight: '800' }}>{item.title}</Text>
                <Text style={{ color: theme.colors.muted, fontSize: 13, marginTop: 3 }}>{item.desc}</Text>
              </View>
            </View>
          ))}
        </View>

        {groupId && (
          <TouchableOpacity
            onPress={() => navigation?.navigate('MakeContribution', { groupId, groupName, amountKobo })}
            style={{ marginTop: 32, width: '100%', height: 68, borderRadius: 22, backgroundColor: theme.colors.primary, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ color: theme.colors.white, fontSize: 18, fontWeight: '900' }}>🔄 Try Again</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          onPress={() => navigation?.navigate('SupportTicket', { subject: 'Payment issue', detail: error })}
          style={{ marginTop: 14, width: '100%', height: 56, borderRadius: 18, borderWidth: 1, borderColor: theme.colors.border, backgroundColor: theme.colors.surface, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ color: theme.colors.text, fontSize: 16, fontWeight: '800' }}>Contact Support</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => navigation?.navigate('Home')} style={{ marginTop: 10, height: 48, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ color: theme.colors.muted, fontSize: 15, fontWeight: '700' }}>Back to Home</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}
