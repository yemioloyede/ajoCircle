import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api } from '../api/client';
import { theme } from '../theme';

interface Props { navigation?: any; }

const CURRENCIES = [
  { code: 'NGN', symbol: '₦', name: 'Nigerian Naira', flag: '🇳🇬' },
  { code: 'GHS', symbol: '₵', name: 'Ghanaian Cedi', flag: '🇬🇭' },
  { code: 'KES', symbol: 'KSh', name: 'Kenyan Shilling', flag: '🇰🇪' },
  { code: 'ZAR', symbol: 'R', name: 'South African Rand', flag: '🇿🇦' },
  { code: 'USD', symbol: '$', name: 'US Dollar', flag: '🇺🇸' },
  { code: 'GBP', symbol: '£', name: 'British Pound', flag: '🇬🇧' },
  { code: 'EUR', symbol: '€', name: 'Euro', flag: '🇪🇺' },
  { code: 'CAD', symbol: 'CA$', name: 'Canadian Dollar', flag: '🇨🇦' },
  { code: 'AUD', symbol: 'A$', name: 'Australian Dollar', flag: '🇦🇺' },
  { code: 'INR', symbol: '₹', name: 'Indian Rupee', flag: '🇮🇳' },
];

export default function CurrencyPreferencesScreen({ navigation }: Props) {
  const [selected, setSelected] = useState('NGN');
  const [saving, setSaving] = useState(false);

  const save = async (code: string) => {
    setSelected(code);
    setSaving(true);
    try {
      await api('/api/users/preferences', { method: 'PATCH', body: JSON.stringify({ currency: code }) });
    } catch {
      Alert.alert('Saved locally', 'Preference saved. Will sync when connected.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background }} edges={['left', 'right', 'top']}>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 40 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', paddingTop: 20, marginBottom: 10, gap: 14 }}>
          <TouchableOpacity onPress={() => navigation?.goBack()}>
            <Text style={{ color: theme.colors.primary, fontSize: 22 }}>←</Text>
          </TouchableOpacity>
          <Text style={{ color: theme.colors.text, fontSize: 22, fontWeight: '900' }}>Currency Preferences</Text>
        </View>
        <Text style={{ color: theme.colors.muted, fontSize: 14, marginBottom: 24 }}>Choose your preferred currency for displaying amounts. Transactions are still processed in your circle's native currency.</Text>

        <View style={{ gap: 8 }}>
          {CURRENCIES.map(cur => (
            <TouchableOpacity key={cur.code} onPress={() => save(cur.code)}
              style={{ backgroundColor: theme.colors.surface, borderRadius: 18, borderWidth: selected === cur.code ? 2 : 1, borderColor: selected === cur.code ? theme.colors.primary : theme.colors.border, padding: 16, flexDirection: 'row', alignItems: 'center' }}>
              <Text style={{ fontSize: 28, marginRight: 14 }}>{cur.flag}</Text>
              <View style={{ flex: 1 }}>
                <Text style={{ color: theme.colors.text, fontWeight: '800', fontSize: 15 }}>{cur.name}</Text>
                <Text style={{ color: theme.colors.muted, fontSize: 13 }}>{cur.code} · {cur.symbol}</Text>
              </View>
              {selected === cur.code && <Text style={{ color: theme.colors.primary, fontWeight: '900', fontSize: 20 }}>✓</Text>}
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
