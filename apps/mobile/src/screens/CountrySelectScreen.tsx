import React, { useState, useMemo } from 'react';
import { View, Text, TouchableOpacity, FlatList, TextInput, SafeAreaView, StatusBar } from 'react-native';
import { theme } from '../theme';

const COUNTRIES = [
  { code: 'NG', name: 'Nigeria', flag: '🇳🇬', currency: 'NGN', dial: '+234' },
  { code: 'GH', name: 'Ghana', flag: '🇬🇭', currency: 'GHS', dial: '+233' },
  { code: 'KE', name: 'Kenya', flag: '🇰🇪', currency: 'KES', dial: '+254' },
  { code: 'ZA', name: 'South Africa', flag: '🇿🇦', currency: 'ZAR', dial: '+27' },
  { code: 'UG', name: 'Uganda', flag: '🇺🇬', currency: 'UGX', dial: '+256' },
  { code: 'TZ', name: 'Tanzania', flag: '🇹🇿', currency: 'TZS', dial: '+255' },
  { code: 'RW', name: 'Rwanda', flag: '🇷🇼', currency: 'RWF', dial: '+250' },
  { code: 'US', name: 'United States', flag: '🇺🇸', currency: 'USD', dial: '+1' },
  { code: 'GB', name: 'United Kingdom', flag: '🇬🇧', currency: 'GBP', dial: '+44' },
  { code: 'CA', name: 'Canada', flag: '🇨🇦', currency: 'CAD', dial: '+1' },
  { code: 'AU', name: 'Australia', flag: '🇦🇺', currency: 'AUD', dial: '+61' },
  { code: 'DE', name: 'Germany', flag: '🇩🇪', currency: 'EUR', dial: '+49' },
  { code: 'FR', name: 'France', flag: '🇫🇷', currency: 'EUR', dial: '+33' },
  { code: 'IN', name: 'India', flag: '🇮🇳', currency: 'INR', dial: '+91' },
  { code: 'SN', name: 'Senegal', flag: '🇸🇳', currency: 'XOF', dial: '+221' },
  { code: 'CI', name: "Côte d'Ivoire", flag: '🇨🇮', currency: 'XOF', dial: '+225' },
  { code: 'CM', name: 'Cameroon', flag: '🇨🇲', currency: 'XAF', dial: '+237' },
  { code: 'ET', name: 'Ethiopia', flag: '🇪🇹', currency: 'ETB', dial: '+251' },
  { code: 'ZM', name: 'Zambia', flag: '🇿🇲', currency: 'ZMW', dial: '+260' },
  { code: 'MW', name: 'Malawi', flag: '🇲🇼', currency: 'MWK', dial: '+265' },
];

interface Props {
  navigation?: any;
  onSelect?: (country: typeof COUNTRIES[0]) => void;
}

export default function CountrySelectScreen({ navigation, onSelect }: Props) {
  const [search, setSearch] = useState('');

  const filtered = useMemo(() =>
    COUNTRIES.filter(c =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.code.toLowerCase().includes(search.toLowerCase())
    ), [search]);

  function select(country: typeof COUNTRIES[0]) {
    if (onSelect) { onSelect(country); return; }
    navigation?.goBack();
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <StatusBar barStyle="light-content" />
      <View style={{ paddingHorizontal: 24, paddingTop: 20, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: theme.colors.border }}>
        <TouchableOpacity onPress={() => navigation?.goBack()} style={{ marginBottom: 12 }}>
          <Text style={{ color: theme.colors.primary, fontSize: 15, fontWeight: '700' }}>← Back</Text>
        </TouchableOpacity>
        <Text style={{ color: theme.colors.text, fontSize: 24, fontWeight: '900' }}>Select Your Country</Text>
        <Text style={{ color: theme.colors.muted, fontSize: 15, marginTop: 6 }}>This sets your currency and payment options.</Text>
        <TextInput
          style={{ marginTop: 14, height: 52, borderRadius: 14, borderWidth: 1, borderColor: theme.colors.border, backgroundColor: theme.colors.surface, color: theme.colors.text, paddingHorizontal: 16, fontSize: 15 }}
          placeholder="Search country..."
          placeholderTextColor={theme.colors.mutedSoft}
          value={search}
          onChangeText={setSearch}
          autoCapitalize="none"
        />
      </View>

      <FlatList
        data={filtered}
        keyExtractor={item => item.code}
        contentContainerStyle={{ paddingHorizontal: 24, paddingVertical: 12 }}
        renderItem={({ item }) => (
          <TouchableOpacity
            onPress={() => select(item)}
            style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: theme.colors.border }}>
            <Text style={{ fontSize: 28, marginRight: 14 }}>{item.flag}</Text>
            <View style={{ flex: 1 }}>
              <Text style={{ color: theme.colors.text, fontSize: 16, fontWeight: '700' }}>{item.name}</Text>
              <Text style={{ color: theme.colors.muted, fontSize: 13, marginTop: 2 }}>{item.currency} • {item.dial}</Text>
            </View>
            <Text style={{ color: theme.colors.mutedSoft, fontSize: 13 }}>{item.code}</Text>
          </TouchableOpacity>
        )}
      />
    </SafeAreaView>
  );
}
