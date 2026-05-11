import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, Share, ActivityIndicator, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api } from '../api/client';
import { theme } from '../theme';

interface Props {
  navigation?: any;
  route?: { params?: { groupId: string; groupName?: string; inviteCode?: string } };
}

export default function GroupInviteScreen({ navigation, route }: Props) {
  const { groupId, groupName, inviteCode: passedCode } = route?.params || {};
  const [inviteCode, setInviteCode] = useState(passedCode || '');
  const [loading, setLoading] = useState(!passedCode);

  useEffect(() => {
    if (passedCode || !groupId) return;
    api(`/api/groups/${groupId}`)
      .then(j => setInviteCode(j.invite_code || j.inviteCode || ''))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [groupId, passedCode]);

  async function shareCode() {
    if (!inviteCode) return;
    await Share.share({
      message: `Join my AjoCircle savings group "${groupName || 'My Circle'}"!\n\nInvite Code: ${inviteCode}\n\nDownload AjoCircle and enter this code to join.`,
    });
  }

  async function copyCode() {
    Alert.alert('Invite Code', inviteCode, [{ text: 'OK' }]);
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background }} edges={['left', 'right', 'top']}>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 40 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', paddingTop: 20, marginBottom: 24, gap: 14 }}>
          <TouchableOpacity onPress={() => navigation?.goBack()}>
            <Text style={{ color: theme.colors.primary, fontSize: 22 }}>←</Text>
          </TouchableOpacity>
          <Text style={{ color: theme.colors.text, fontSize: 22, fontWeight: '900' }}>Invite Members</Text>
        </View>

        {loading ? (
          <ActivityIndicator color={theme.colors.primary} size="large" style={{ marginTop: 60 }} />
        ) : (
          <>
            <View style={{ backgroundColor: theme.colors.surface, borderRadius: 24, padding: 24, borderWidth: 1, borderColor: theme.colors.border, alignItems: 'center' }}>
              <Text style={{ fontSize: 48 }}>🎟️</Text>
              <Text style={{ color: theme.colors.muted, fontSize: 13, fontWeight: '800', marginTop: 16, letterSpacing: 1.5 }}>INVITE CODE</Text>
              <Text style={{ color: theme.colors.text, fontSize: 34, fontWeight: '900', letterSpacing: 4, marginTop: 8 }}>{inviteCode || '------'}</Text>
              <Text style={{ color: theme.colors.muted, fontSize: 14, marginTop: 12, textAlign: 'center' }}>
                Share this code with people you trust so they can join{groupName ? ` "${groupName}"` : ' your circle'}.
              </Text>
            </View>

            <TouchableOpacity onPress={shareCode} style={{ marginTop: 22, height: 64, borderRadius: 20, backgroundColor: theme.colors.primary, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ color: theme.colors.white, fontSize: 17, fontWeight: '900' }}>📤 Share Invite</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={copyCode} style={{ marginTop: 12, height: 56, borderRadius: 20, borderWidth: 1, borderColor: theme.colors.border, backgroundColor: theme.colors.surface, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ color: theme.colors.text, fontSize: 16, fontWeight: '800' }}>📋 Show Code</Text>
            </TouchableOpacity>

            <View style={{ marginTop: 32, gap: 16 }}>
              <Text style={{ color: theme.colors.text, fontSize: 18, fontWeight: '900' }}>How it works</Text>
              {[
                { n: '1', text: 'Share the invite code with friends or family.' },
                { n: '2', text: 'They open AjoCircle and enter the code on the Home screen.' },
                { n: '3', text: 'They join the circle and are assigned a payout slot.' },
              ].map(item => (
                <View key={item.n} style={{ flexDirection: 'row', gap: 14 }}>
                  <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: theme.colors.primary, alignItems: 'center', justifyContent: 'center' }}>
                    <Text style={{ color: theme.colors.white, fontWeight: '900', fontSize: 15 }}>{item.n}</Text>
                  </View>
                  <Text style={{ color: theme.colors.muted, fontSize: 15, flex: 1, lineHeight: 24, marginTop: 4 }}>{item.text}</Text>
                </View>
              ))}
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
