import React, { useCallback } from 'react';
import { View, Text, ScrollView, RefreshControl } from 'react-native';
import { Card, Button } from '../components/ui';
import { useAuth } from '../context/AuthContext';

interface Props {
  navigation: any;
}

export default function UserProfileScreen({ navigation }: Props) {
  const { user, logout, isLoading } = useAuth();

  const navTo = (screen: string) => navigation.navigate(screen);

  return (
    <ScrollView style={{ flex: 1, backgroundColor: '#F2F7F4', padding: 18 }}>
      <Text style={{ fontSize: 26, fontWeight: '900', color: '#082017', marginBottom: 16 }}>Profile</Text>

      <Card>
        <Text style={{ fontWeight: '700', fontSize: 18 }}>{user?.full_name}</Text>
        <Text style={{ color: '#52655c', marginTop: 2 }}>{user?.email}</Text>
        <Text style={{ color: '#52655c' }}>{user?.phone}</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8, gap: 8 }}>
          <Text style={{ color: '#888', fontSize: 13 }}>Role: {user?.role}</Text>
          <Text style={{ fontSize: 13 }}>  KYC: <Text style={{ color: user?.kyc_status === 'VERIFIED' ? '#0b6b45' : '#e65100', fontWeight: '700' }}>{user?.kyc_status || 'NOT_SUBMITTED'}</Text></Text>
        </View>
      </Card>

      <Card>
        <Text style={{ fontWeight: '700', marginBottom: 12 }}>Account</Text>
        <Button title="Bank Accounts" onPress={() => navTo('BankAccounts')} />
        <Button title="KYC Verification" onPress={() => navTo('KYC')} />
        <Button title="Contribution History" onPress={() => navTo('ContributionHistory')} />
        <Button title="Payout History" onPress={() => navTo('PayoutHistory')} />
      </Card>

      <Button title="Log Out" onPress={logout} />
      <View style={{ height: 40 }} />
    </ScrollView>
  );
}
