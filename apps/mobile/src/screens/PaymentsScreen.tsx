import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, ScrollView, RefreshControl, ActivityIndicator, TouchableOpacity, Alert, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api } from '../api/client';
import { Card, Button, Pill, SectionHeader, StatLine, InfoBanner } from '../components/ui';
import { theme } from '../theme';

type Country = {
  countryCode: string;
  countryName: string;
  primaryCurrencyCode: string;
  supportedPaymentProviders: string[];
  region: string;
};

type HealthRow = {
  providerName: string;
  isHealthy: boolean;
  failureCount: number;
  successRate: number;
};

type GroupRow = {
  id: string;
  name: string;
  contribution_amount_kobo: number;
  frequency: string;
  status: string;
};

const DEFAULT_OPERATION = 'COLLECTION';

export default function PaymentsScreen() {
  const [countries, setCountries] = useState<Country[]>([]);
  const [selectedCountry, setSelectedCountry] = useState<Country | null>(null);
  const [health, setHealth] = useState<HealthRow[]>([]);
  const [selectedProvider, setSelectedProvider] = useState<any>(null);
  const [groups, setGroups] = useState<GroupRow[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [pendingRef, setPendingRef] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [selecting, setSelecting] = useState(false);
  const [paying, setPaying] = useState(false);
  const [confirming, setConfirming] = useState(false);

  const load = useCallback(async () => {
    setError('');
    const [countriesRes, groupsRes] = await Promise.all([
      api('/api/payments/countries'),
      api('/api/groups'),
    ]);

    const rows: Country[] = countriesRes?.countries || [];
    setCountries(rows);
    if (!selectedCountry && rows.length > 0) {
      setSelectedCountry(rows[0]);
    }

    const groupRows: GroupRow[] = Array.isArray(groupsRes)
      ? groupsRes
      : groupsRes?.groups || [];
    setGroups(groupRows);
    if (!selectedGroupId && groupRows.length > 0) {
      setSelectedGroupId(groupRows[0].id);
    }
  }, [selectedCountry]);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await load();
    } finally {
      setRefreshing(false);
    }
  }, [load]);

  useEffect(() => {
    load()
      .catch((e: any) => setError(e.message || 'Failed to load payment data'))
      .finally(() => setLoading(false));
  }, [load]);

  useEffect(() => {
    if (!selectedCountry) return;
    api(`/api/payments/providers/health/${selectedCountry.countryCode}`)
      .then((j) => setHealth(j?.health || []))
      .catch(() => setHealth([]));
  }, [selectedCountry]);

  const selectedGroup = useMemo(() => groups.find((group) => group.id === selectedGroupId) || null, [groups, selectedGroupId]);

  const providerSummary = useMemo(() => {
    if (!selectedCountry) return [];
    return selectedCountry.supportedPaymentProviders.map((name) => {
      const live = health.find((row) => row.providerName === name);
      return {
        name,
        isHealthy: live?.isHealthy ?? false,
        successRate: live?.successRate ?? 0,
        failureCount: live?.failureCount ?? 0,
      };
    });
  }, [selectedCountry, health]);

  async function selectProvider() {
    if (!selectedCountry) return;
    setSelecting(true);
    setError('');
    try {
      const j = await api('/api/payments/providers/select', {
        method: 'POST',
        body: JSON.stringify({
          countryCode: selectedCountry.countryCode,
          currencyCode: selectedCountry.primaryCurrencyCode,
          operationType: DEFAULT_OPERATION,
        }),
      });
      setSelectedProvider(j);
    } catch (e: any) {
      setError(e.message || 'Unable to select provider');
    } finally {
      setSelecting(false);
    }
  }

  async function startContributionPayment() {
    if (!selectedGroup) return;
    setPaying(true);
    setError('');
    try {
      const j = await api('/api/contributions/initialize', {
        method: 'POST',
        body: JSON.stringify({ groupId: selectedGroup.id }),
      });

      const url = j?.payment?.authorization_url;
      const ref = j?.contribution?.payment_reference;
      if (ref) setPendingRef(ref);

      if (url) {
        const canOpen = await Linking.canOpenURL(url);
        if (canOpen) {
          await Linking.openURL(url);
        } else {
          Alert.alert('Payment link unavailable', url);
        }
      } else {
        Alert.alert('Payment started', j?.message || 'Contribution payment initialized.');
      }
    } catch (e: any) {
      setError(e.message || 'Unable to start payment');
    } finally {
      setPaying(false);
    }
  }

  async function confirmContributionPayment() {
    if (!pendingRef) return;
    setConfirming(true);
    setError('');
    try {
      const j = await api('/api/contributions/verify', {
        method: 'POST',
        body: JSON.stringify({ reference: pendingRef }),
      });
      setPendingRef(null);
      Alert.alert('Payment confirmed', j?.message || 'Contribution recorded.');
      await refresh();
    } catch (e: any) {
      setError(e.message || 'Could not confirm contribution');
    } finally {
      setConfirming(false);
    }
  }

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.colors.background }}>
        <ActivityIndicator color={theme.colors.primary} size="large" />
      </View>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background }} edges={['left', 'right', 'top']}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: theme.spacing.lg, paddingBottom: theme.spacing.xl * 2 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={theme.colors.primary} />}>
        <Card style={{ backgroundColor: theme.colors.surfaceAlt }}>
          <SectionHeader title="Payments" actionLabel="Refresh" onAction={refresh} />
          <Text style={{ color: theme.colors.muted, lineHeight: 20 }}>
            Inspect country routing, provider health, and the current payment selection used by the backend.
          </Text>
        </Card>

        {error ? <InfoBanner tone="warning" title="Payment routing issue" message={error} /> : null}

        <Card>
          <SectionHeader title="Country" />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
            {countries.map((country) => (
              <TouchableOpacity
                key={country.countryCode}
                onPress={() => setSelectedCountry(country)}
                style={{
                  paddingVertical: 10,
                  paddingHorizontal: 14,
                  borderRadius: 999,
                  borderWidth: 1,
                  borderColor: selectedCountry?.countryCode === country.countryCode ? theme.colors.primary : theme.colors.border,
                  backgroundColor: selectedCountry?.countryCode === country.countryCode ? theme.colors.primarySoft : theme.colors.surface,
                }}>
                <Text style={{ color: theme.colors.text, fontWeight: '800', fontSize: 13 }}>
                  {country.countryCode}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </Card>

        <Card>
          <SectionHeader title="Start a contribution" />
          <Text style={{ color: theme.colors.muted, marginBottom: 10 }}>
            Pick one of your groups and initialize a payment collection.
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
            {groups.map((group) => (
              <TouchableOpacity
                key={group.id}
                onPress={() => setSelectedGroupId(group.id)}
                style={{
                  paddingVertical: 10,
                  paddingHorizontal: 14,
                  borderRadius: 16,
                  borderWidth: 1,
                  borderColor: selectedGroupId === group.id ? theme.colors.primary : theme.colors.border,
                  backgroundColor: selectedGroupId === group.id ? theme.colors.primarySoft : theme.colors.surface,
                  minWidth: 160,
                }}>
                <Text style={{ color: theme.colors.text, fontWeight: '900', fontSize: 13 }}>{group.name}</Text>
                <Text style={{ color: theme.colors.muted, fontSize: 12, marginTop: 4 }}>
                  ₦{Math.round((group.contribution_amount_kobo || 0) / 100).toLocaleString()} · {group.frequency}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {selectedGroup ? (
            <View style={{ marginTop: 12 }}>
              <Text style={{ color: theme.colors.text, fontWeight: '800', fontSize: 15 }}>{selectedGroup.name}</Text>
              <Text style={{ color: theme.colors.muted, fontSize: 13, marginTop: 4 }}>
                Contribution amount: ₦{Math.round((selectedGroup.contribution_amount_kobo || 0) / 100).toLocaleString()}
              </Text>
              <Button title={paying ? 'Starting payment...' : 'Pay Contribution'} onPress={startContributionPayment} loading={paying} style={{ marginTop: 12 }} />
              {pendingRef ? (
                <TouchableOpacity onPress={confirmContributionPayment} disabled={confirming} style={{ marginTop: 10, height: 48, borderRadius: 12, borderWidth: 1, borderColor: theme.colors.primary, alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ color: theme.colors.primary, fontWeight: '800' }}>{confirming ? 'Confirming...' : 'Confirm Payment'}</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          ) : null}
        </Card>

        {selectedCountry ? (
          <>
            <Card>
              <SectionHeader title={`${selectedCountry.countryName} snapshot`} />
              <StatLine label="Currency" value={selectedCountry.primaryCurrencyCode} />
              <StatLine label="Region" value={selectedCountry.region} />
              <StatLine label="Providers" value={String(selectedCountry.supportedPaymentProviders.length)} />
              <Button title="Select Provider for Collection" onPress={selectProvider} loading={selecting} />
            </Card>

            {selectedProvider?.selected ? (
              <Card>
                <SectionHeader title="Selected provider" />
                <Text style={{ color: theme.colors.text, fontSize: 18, fontWeight: '900' }}>{selectedProvider.selected.name}</Text>
                <Text style={{ color: theme.colors.muted, marginTop: 6 }}>
                  {selectedProvider.selected.countryCode} / {selectedProvider.selected.currencyCode}
                </Text>
                <View style={{ marginTop: 12, flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  {(selectedProvider.alternatives || []).map((item: any) => (
                    <Pill key={`${item.name}-${item.countryCode}`} label={`${item.name} alt`} tone="secondary" />
                  ))}
                </View>
              </Card>
            ) : null}

            <Card>
              <SectionHeader title="Provider health" />
              {providerSummary.map((row) => (
                <View key={row.name} style={{ marginBottom: 12, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: theme.colors.border }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={{ color: theme.colors.text, fontWeight: '900' }}>{row.name}</Text>
                    <Pill label={row.isHealthy ? 'Healthy' : 'Watch'} tone={row.isHealthy ? 'success' : 'warning'} />
                  </View>
                  <Text style={{ color: theme.colors.muted, marginTop: 6, fontSize: 12 }}>
                    Success rate: {Math.round(row.successRate * 100)}% · Failures: {row.failureCount}
                  </Text>
                </View>
              ))}
              {!providerSummary.length ? (
                <Text style={{ color: theme.colors.muted }}>No provider data yet.</Text>
              ) : null}
            </Card>
          </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}
