import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api } from '../api/client';
import { theme } from '../theme';

interface Props { navigation?: any; }

const LANGUAGES = [
  { code: 'en', name: 'English', native: 'English', flag: '🇬🇧' },
  { code: 'yo', name: 'Yoruba', native: 'Yorùbá', flag: '🇳🇬' },
  { code: 'ig', name: 'Igbo', native: 'Igbo', flag: '🇳🇬' },
  { code: 'ha', name: 'Hausa', native: 'Hausa', flag: '🇳🇬' },
  { code: 'fr', name: 'French', native: 'Français', flag: '🇫🇷' },
  { code: 'sw', name: 'Swahili', native: 'Kiswahili', flag: '🇰🇪' },
  { code: 'pt', name: 'Portuguese', native: 'Português', flag: '🇧🇷' },
  { code: 'ar', name: 'Arabic', native: 'العربية', flag: '🇸🇦' },
  { code: 'hi', name: 'Hindi', native: 'हिंदी', flag: '🇮🇳' },
  { code: 'de', name: 'German', native: 'Deutsch', flag: '🇩🇪' },
];

export default function LanguageSettingsScreen({ navigation }: Props) {
  const [selected, setSelected] = useState('en');
  const [saving, setSaving] = useState<string | null>(null);

  const pick = async (code: string) => {
    setSelected(code);
    setSaving(code);
    try {
      await api('/api/users/preferences', { method: 'PATCH', body: JSON.stringify({ language: code }) });
    } catch {}
    finally { setSaving(null); }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background }} edges={['left', 'right', 'top']}>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 40 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', paddingTop: 20, marginBottom: 10, gap: 14 }}>
          <TouchableOpacity onPress={() => navigation?.goBack()}>
            <Text style={{ color: theme.colors.primary, fontSize: 22 }}>←</Text>
          </TouchableOpacity>
          <Text style={{ color: theme.colors.text, fontSize: 22, fontWeight: '900' }}>Language</Text>
        </View>
        <Text style={{ color: theme.colors.muted, fontSize: 14, marginBottom: 24 }}>Select your preferred app language. Some languages are partially translated.</Text>

        <View style={{ gap: 8 }}>
          {LANGUAGES.map(lang => (
            <TouchableOpacity key={lang.code} onPress={() => pick(lang.code)}
              style={{ backgroundColor: theme.colors.surface, borderRadius: 18, borderWidth: selected === lang.code ? 2 : 1, borderColor: selected === lang.code ? theme.colors.primary : theme.colors.border, padding: 16, flexDirection: 'row', alignItems: 'center' }}>
              <Text style={{ fontSize: 28, marginRight: 14 }}>{lang.flag}</Text>
              <View style={{ flex: 1 }}>
                <Text style={{ color: theme.colors.text, fontWeight: '800', fontSize: 15 }}>{lang.name}</Text>
                <Text style={{ color: theme.colors.muted, fontSize: 13 }}>{lang.native}</Text>
              </View>
              {saving === lang.code ? (
                <Text style={{ color: theme.colors.muted, fontSize: 13 }}>Saving…</Text>
              ) : selected === lang.code ? (
                <Text style={{ color: theme.colors.primary, fontWeight: '900', fontSize: 20 }}>✓</Text>
              ) : null}
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
