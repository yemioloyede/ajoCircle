import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import { theme } from '../theme';

interface Props {
  navigation: any;
}

export default function UserProfileScreen({ navigation }: Props) {
  const { user, logout } = useAuth();
  const payoutAccounts = Array.isArray((user as any)?.payout_accounts) ? (user as any).payout_accounts : [];
  const [kyc, setKyc] = useState<any>(null);

  useEffect(() => {
    api('/api/users/kyc').then((j) => setKyc(j?.kyc ?? j ?? null)).catch(() => setKyc(null));
  }, []);

  const initials = useMemo(() => {
    if (!user?.full_name) return 'A';
    return user.full_name
      .split(' ')
      .slice(0, 2)
      .map((part: string) => part[0])
      .join('')
      .toUpperCase();
  }, [user?.full_name]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background }} edges={['left', 'right', 'top']}>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: 22, paddingBottom: 44 }}>
        <View style={{ height: 86, borderBottomWidth: 1, borderBottomColor: theme.colors.border, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <TouchableOpacity onPress={() => navigation.canGoBack() ? navigation.goBack() : navigation.navigate('ProfileMain')}>
            <Ionicons name="chevron-back" size={24} color={theme.colors.text} />
          </TouchableOpacity>
          <Text style={{ color: theme.colors.text, fontSize: 18, fontWeight: '800' }}>Profile & Banking</Text>
          <TouchableOpacity onPress={() => navigation.navigate('KYC')}>
            <MaterialCommunityIcons name="square-edit-outline" size={22} color={theme.colors.primary} />
          </TouchableOpacity>
        </View>

        <View style={{ marginTop: 18, flexDirection: 'row', alignItems: 'center' }}>
          <View style={{ width: 114, height: 114, borderRadius: 57, backgroundColor: theme.colors.primary, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ color: theme.colors.text, fontSize: 18, fontWeight: '800' }}>{initials}</Text>
          </View>
          <View style={{ flex: 1, marginLeft: 16 }}>
            <Text style={{ color: theme.colors.text, fontSize: 18, fontWeight: '900' }}>{user?.full_name || 'Member'}</Text>
            <Text style={{ color: theme.colors.muted, fontSize: 13, marginTop: 4 }}>{user?.email || ''}</Text>
            <View style={{ marginTop: 10, height: 36, borderRadius: 18, backgroundColor: '#1D241D', paddingHorizontal: 12, alignItems: 'center', justifyContent: 'center', alignSelf: 'flex-start' }}>
              <Text style={{ color: theme.colors.text, fontSize: 12, fontWeight: '800' }}>Verified Member</Text>
            </View>
          </View>
        </View>

        <View style={{ marginTop: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text style={{ color: theme.colors.text, fontSize: 18, fontWeight: '900' }}>Payout Accounts</Text>
          <TouchableOpacity onPress={() => navigation.navigate('LinkedAccounts')}>
            <Text style={{ color: theme.colors.primary, fontSize: 13, fontWeight: '800' }}>Manage →</Text>
          </TouchableOpacity>
        </View>

        {payoutAccounts.length ? payoutAccounts.map((account: any, index: number) => (
          <BankCard
            key={account.id || `${account.bank_name || 'bank'}-${index}`}
            bank={account.bank_name || account.bank || 'Bank Account'}
            acct={account.masked_account_number || account.account_number_masked || account.account_number || '****'}
            owner={(account.account_name || user?.full_name || '').toUpperCase()}
            primary={Boolean(account.is_primary)}
          />
        )) : (
          <View style={{ marginTop: 14, borderRadius: 18, borderWidth: 1, borderColor: theme.colors.border, backgroundColor: theme.colors.surface, padding: 16 }}>
            <Text style={{ color: theme.colors.muted, fontSize: 13 }}>No payout account linked yet.</Text>
          </View>
        )}

        <View style={{ marginTop: 14, borderRadius: 14, borderWidth: 1, borderColor: '#274129', backgroundColor: '#111815', padding: 14 }}>
          <Text style={{ color: theme.colors.text, fontSize: 13, lineHeight: 18 }}>Payouts are automatically sent to your primary account at the end of your circle rotation.</Text>
        </View>

        <View style={{ marginTop: 16, borderRadius: 18, borderWidth: 1, borderColor: theme.colors.border, backgroundColor: theme.colors.surface, padding: 16 }}>
          <Text style={{ color: theme.colors.text, fontSize: 18, fontWeight: '900' }}>KYC Status</Text>
          <Text style={{ color: theme.colors.muted, marginTop: 8, fontSize: 13 }}>
            {kyc?.status || 'NOT_SUBMITTED'}
            {kyc?.updated_at ? ` • Updated ${new Date(kyc.updated_at).toLocaleDateString()}` : ''}
          </Text>
          {kyc?.rejection_reason ? (
            <Text style={{ color: theme.colors.danger, marginTop: 8, fontSize: 12 }}>{kyc.rejection_reason}</Text>
          ) : null}
          <TouchableOpacity onPress={() => navigation.navigate('KYC')} style={{ marginTop: 12, height: 48, borderRadius: 12, backgroundColor: theme.colors.primary, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ color: theme.colors.white, fontWeight: '800' }}>Complete KYC</Text>
          </TouchableOpacity>
        </View>

        {/* ── Finance & Analytics ── */}
        <Text style={{ marginTop: 28, marginBottom: 4, color: theme.colors.muted, fontSize: 12, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase' }}>Finance & Analytics</Text>
        <SettingRow title="Trust Score" subtitle="See how reliable you are in circles" icon="star-circle-outline" onPress={() => navigation.navigate('TrustScore')} />
        <SettingRow title="Financial Insights" subtitle="Savings stats and contribution trends" icon="chart-line" onPress={() => navigation.navigate('FinancialInsights')} />
        <SettingRow title="Achievements" subtitle="Badges and milestones you have earned" icon="trophy-outline" onPress={() => navigation.navigate('Achievements')} />
        <SettingRow title="Refer & Earn" subtitle="Invite friends and earn rewards" icon="gift-outline" onPress={() => navigation.navigate('Referral')} />

        {/* ── Security ── */}
        <Text style={{ marginTop: 28, marginBottom: 4, color: theme.colors.muted, fontSize: 12, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase' }}>Security</Text>
        <SettingRow title="Security Center" subtitle="Password, PIN, biometrics, sessions" icon="shield-lock-outline" onPress={() => navigation.navigate('SecurityCenter')} />
        <SettingRow title="Two-Factor Auth" subtitle="Add an extra layer of security" icon="shield-key-outline" onPress={() => navigation.navigate('TwoFactorAuth')} />
        <SettingRow title="Active Sessions" subtitle="View devices logged into your account" icon="monitor-multiple" onPress={() => navigation.navigate('ActiveSessions')} />
        <SettingRow title="Privacy & Consent" subtitle="Data usage and permissions" icon="eye-off-outline" onPress={() => navigation.navigate('PrivacyConsent')} />
        <SettingRow title="Compliance Status" subtitle="KYC progress and account limits" icon="check-decagram-outline" onPress={() => navigation.navigate('ComplianceStatus')} />

        {/* ── Support ── */}
        <Text style={{ marginTop: 28, marginBottom: 4, color: theme.colors.muted, fontSize: 12, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase' }}>Support</Text>
        <SettingRow title="Help Center" subtitle="FAQs and step-by-step guides" icon="help-circle-outline" onPress={() => navigation.navigate('HelpCenter')} />
        <SettingRow title="Contact Support" subtitle="Open a ticket with our team" icon="message-text-outline" onPress={() => navigation.navigate('SupportTicket')} />
        <SettingRow title="Dispute Resolution" subtitle="Report a payment or payout issue" icon="alert-circle-outline" onPress={() => navigation.navigate('DisputeResolution')} />

        {/* ── App Settings ── */}
        <Text style={{ marginTop: 28, marginBottom: 4, color: theme.colors.muted, fontSize: 12, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase' }}>App Settings</Text>
        <SettingRow title="Activity" subtitle="Manage alerts and history" icon="bell-outline" onPress={() => navigation.getParent()?.navigate('Activity')} />
        <SettingRow title="Currency" subtitle="Choose your preferred display currency" icon="currency-usd" onPress={() => navigation.navigate('CurrencyPreferences')} />
        <SettingRow title="Language" subtitle="Change your app language" icon="translate" onPress={() => navigation.navigate('LanguageSettings')} />
        <SettingRow title="App Settings" subtitle="Notifications, sounds, and theme" icon="cog-outline" onPress={() => navigation.navigate('AppSettings')} />

        <View style={{ marginTop: 28, borderRadius: 16, borderWidth: 1, borderColor: '#5A2A36', padding: 16 }}>
          <TouchableOpacity onPress={logout} style={{ height: 54, borderRadius: 14, backgroundColor: theme.colors.danger, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ color: '#180E13', fontSize: 15, fontWeight: '900' }}>Sign Out</Text>
          </TouchableOpacity>
        </View>

        <Text style={{ marginTop: 24, textAlign: 'center', color: theme.colors.muted, fontSize: 12, fontWeight: '700' }}>Privacy Policy and Terms of Service</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function BankCard({ bank, acct, owner, primary = false }: { bank: string; acct: string; owner: string; primary?: boolean }) {
  return (
    <View style={{ marginTop: 14, borderRadius: 18, borderWidth: 1, borderColor: theme.colors.border, backgroundColor: theme.colors.surface, padding: 16, flexDirection: 'row', alignItems: 'center' }}>
      <View style={{ width: 66, height: 66, borderRadius: 33, backgroundColor: '#11161B', borderWidth: 1, borderColor: theme.colors.border, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ color: theme.colors.primary, fontSize: 12, fontWeight: '800' }}>BANK</Text>
      </View>
      <View style={{ marginLeft: 12, flex: 1 }}>
        <Text style={{ color: theme.colors.text, fontSize: 15, fontWeight: '900' }}>{bank}</Text>
        <Text style={{ color: theme.colors.muted, fontSize: 13, marginTop: 2 }}>{acct}</Text>
        <Text style={{ color: theme.colors.mutedSoft, fontSize: 14, marginTop: 2 }}>{owner}</Text>
      </View>
      {primary ? <Text style={{ color: theme.colors.primary, fontSize: 12, fontWeight: '800' }}>YES</Text> : null}
    </View>
  );
}

function SettingRow({ title, subtitle, icon, onPress }: { title: string; subtitle: string; icon: keyof typeof MaterialCommunityIcons.glyphMap; onPress: () => void }) {
  return (
    <TouchableOpacity onPress={onPress} style={{ paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: theme.colors.border, flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
      <View style={{ width: 66, height: 66, borderRadius: 14, borderWidth: 1, borderColor: theme.colors.border, backgroundColor: theme.colors.surface, alignItems: 'center', justifyContent: 'center' }}>
        <MaterialCommunityIcons name={icon} size={24} color={theme.colors.text} />
      </View>
      <View style={{ flex: 1, marginLeft: 12 }}>
        <Text style={{ color: theme.colors.text, fontSize: 15, fontWeight: '800' }}>{title}</Text>
        <Text style={{ color: theme.colors.muted, fontSize: 13, marginTop: 2 }}>{subtitle}</Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color={theme.colors.mutedSoft} />
    </TouchableOpacity>
  );
}
