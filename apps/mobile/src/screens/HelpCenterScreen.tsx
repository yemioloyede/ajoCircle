import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, LayoutAnimation } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '../theme';

interface Props { navigation?: any; }

const FAQS = [
  { q: 'What is a Circle?', a: 'A Circle is a savings group where members contribute a fixed amount regularly. Each member takes turns receiving the full pooled amount (payout).' },
  { q: 'How do payouts work?', a: 'Payouts are distributed in rounds based on the payout rotation order set when the circle was created. You can see your slot in the Circle Rotation screen.' },
  { q: 'What happens if I miss a payment?', a: 'Late payments affect your Trust Score. Repeated misses may result in removal from the circle. Enable auto-pay to avoid missing contributions.' },
  { q: 'Is my money safe?', a: 'All transactions are processed via Paystack, a PCI-DSS certified payment provider. Funds are held in escrow until your payout round.' },
  { q: 'How do I verify my identity (KYC)?', a: 'Go to Profile → Identity Verification. You will need to provide a government-issued ID and a selfie. Most verifications are approved within 24 hours.' },
  { q: 'Can I leave a circle?', a: 'You can only leave a circle before your payout round. Leaving after you have received your payout may incur a penalty.' },
  { q: 'How do I add a bank account?', a: 'Go to Profile → Linked Accounts → Add Account. Enter your bank details and we will verify the account with a small test deposit.' },
  { q: 'What currencies are supported?', a: 'We currently support NGN, GHS, KES, ZAR, and USD. More currencies are being added. Check Settings → Currency Preferences.' },
];

export default function HelpCenterScreen({ navigation }: Props) {
  const [openIdx, setOpenIdx] = useState<number | null>(null);

  const toggle = (i: number) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setOpenIdx(prev => prev === i ? null : i);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background }} edges={['left', 'right', 'top']}>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 40 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', paddingTop: 20, marginBottom: 10, gap: 14 }}>
          <TouchableOpacity onPress={() => navigation?.goBack()}>
            <Text style={{ color: theme.colors.primary, fontSize: 22 }}>←</Text>
          </TouchableOpacity>
          <Text style={{ color: theme.colors.text, fontSize: 22, fontWeight: '900' }}>Help Center</Text>
        </View>

        <Text style={{ color: theme.colors.muted, fontSize: 14, marginBottom: 24 }}>Find answers to common questions below, or contact our support team.</Text>

        {FAQS.map((item, i) => (
          <TouchableOpacity key={i} onPress={() => toggle(i)} activeOpacity={0.85}
            style={{ backgroundColor: theme.colors.surface, borderRadius: 18, borderWidth: 1, borderColor: openIdx === i ? theme.colors.primary : theme.colors.border, marginBottom: 10, overflow: 'hidden' }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 18 }}>
              <Text style={{ color: theme.colors.text, fontSize: 15, fontWeight: '700', flex: 1, paddingRight: 8 }}>{item.q}</Text>
              <Text style={{ color: theme.colors.muted, fontSize: 18 }}>{openIdx === i ? '−' : '+'}</Text>
            </View>
            {openIdx === i && (
              <View style={{ paddingHorizontal: 18, paddingBottom: 16, borderTopWidth: 1, borderTopColor: theme.colors.border }}>
                <Text style={{ color: theme.colors.muted, fontSize: 14, lineHeight: 22, paddingTop: 12 }}>{item.a}</Text>
              </View>
            )}
          </TouchableOpacity>
        ))}

        <View style={{ backgroundColor: theme.colors.surface, borderRadius: 20, borderWidth: 1, borderColor: theme.colors.border, padding: 20, marginTop: 14, alignItems: 'center' }}>
          <Text style={{ fontSize: 32, marginBottom: 10 }}>💬</Text>
          <Text style={{ color: theme.colors.text, fontWeight: '800', fontSize: 16 }}>Still need help?</Text>
          <Text style={{ color: theme.colors.muted, fontSize: 14, textAlign: 'center', marginTop: 6, marginBottom: 16 }}>Our support team typically responds within 2 hours.</Text>
          <TouchableOpacity onPress={() => navigation?.navigate('SupportTicket')}
            style={{ height: 52, paddingHorizontal: 32, borderRadius: 16, backgroundColor: theme.colors.primary, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ color: '#fff', fontWeight: '800', fontSize: 15 }}>Open a Support Ticket</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
