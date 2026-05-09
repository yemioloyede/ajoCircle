import React from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider, useAuth } from './src/context/AuthContext';

import AuthScreen from './src/screens/AuthScreen';
import HomeScreen from './src/screens/HomeScreen';
import WalletScreen from './src/screens/WalletScreen';
import NotificationsScreen from './src/screens/NotificationsScreen';
import UserProfileScreen from './src/screens/UserProfileScreen';
import BankAccountScreen from './src/screens/BankAccountScreen';
import KYCScreen from './src/screens/KYCScreen';
import ContributionHistoryScreen from './src/screens/ContributionHistoryScreen';
import PayoutHistoryScreen from './src/screens/PayoutHistoryScreen';
import GroupDetailScreen from './src/screens/GroupDetailScreen';

const Tab = createBottomTabNavigator();
const HomeStack = createStackNavigator();
const WalletStack = createStackNavigator();
const ProfileStack = createStackNavigator();

const TAB_COLOR = '#0B6B45';
const INACTIVE = '#888';

function HomeStackNav() {
  return (
    <HomeStack.Navigator screenOptions={{ headerStyle: { backgroundColor: '#F2F7F4' }, headerTintColor: TAB_COLOR, headerShadowVisible: false }}>
      <HomeStack.Screen name="Groups" component={HomeScreen} options={{ title: 'My Groups' }} />
      <HomeStack.Screen name="GroupDetail" component={GroupDetailScreen} options={{ title: 'Group Details' }} />
    </HomeStack.Navigator>
  );
}

function WalletStackNav() {
  return (
    <WalletStack.Navigator screenOptions={{ headerStyle: { backgroundColor: '#F2F7F4' }, headerTintColor: TAB_COLOR, headerShadowVisible: false }}>
      <WalletStack.Screen name="WalletMain" component={WalletScreen} options={{ title: 'Wallet' }} />
      <WalletStack.Screen name="ContributionHistory" component={ContributionHistoryScreen} options={{ title: 'Contributions' }} />
      <WalletStack.Screen name="PayoutHistory" component={PayoutHistoryScreen} options={{ title: 'Payouts' }} />
    </WalletStack.Navigator>
  );
}

function ProfileStackNav() {
  return (
    <ProfileStack.Navigator screenOptions={{ headerStyle: { backgroundColor: '#F2F7F4' }, headerTintColor: TAB_COLOR, headerShadowVisible: false }}>
      <ProfileStack.Screen name="ProfileMain" component={UserProfileScreen} options={{ title: 'Profile' }} />
      <ProfileStack.Screen name="BankAccounts" component={BankAccountScreen} options={{ title: 'Bank Accounts' }} />
      <ProfileStack.Screen name="KYC" component={KYCScreen} options={{ title: 'KYC Verification' }} />
      <ProfileStack.Screen name="ContributionHistory" component={ContributionHistoryScreen} options={{ title: 'Contributions' }} />
      <ProfileStack.Screen name="PayoutHistory" component={PayoutHistoryScreen} options={{ title: 'Payouts' }} />
    </ProfileStack.Navigator>
  );
}

function TabIcon({ focused, color, label }: { focused: boolean; color: string; label: string }) {
  return <Text style={{ fontSize: 11, color, fontWeight: focused ? '700' : '400', marginTop: 2 }}>{label}</Text>;
}

function MainApp() {
  return (
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor: TAB_COLOR,
        tabBarInactiveTintColor: INACTIVE,
        tabBarStyle: { backgroundColor: '#fff', borderTopColor: '#e8f0ec', paddingBottom: 4, height: 60 },
        headerShown: false,
      }}>
      <Tab.Screen
        name="Home"
        component={HomeStackNav}
        options={{ tabBarLabel: 'Groups', tabBarIcon: ({ color, focused }) => <TabIcon focused={focused} color={color} label="🏠" /> }}
      />
      <Tab.Screen
        name="Wallet"
        component={WalletStackNav}
        options={{ tabBarLabel: 'Wallet', tabBarIcon: ({ color, focused }) => <TabIcon focused={focused} color={color} label="💰" /> }}
      />
      <Tab.Screen
        name="Notifications"
        component={NotificationsScreen}
        options={{ tabBarLabel: 'Alerts', headerShown: true, headerTitle: 'Notifications', headerStyle: { backgroundColor: '#F2F7F4' }, headerTintColor: TAB_COLOR, headerShadowVisible: false, tabBarIcon: ({ color, focused }) => <TabIcon focused={focused} color={color} label="🔔" /> }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileStackNav}
        options={{ tabBarLabel: 'Profile', tabBarIcon: ({ color, focused }) => <TabIcon focused={focused} color={color} label="👤" /> }}
      />
    </Tab.Navigator>
  );
}

function Root() {
  const { token, isLoading } = useAuth();

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F2F7F4' }}>
        <Text style={{ fontSize: 36, fontWeight: '900', color: '#082017', marginBottom: 16 }}>AjoCircle</Text>
        <ActivityIndicator color="#0B6B45" size="large" />
      </View>
    );
  }

  return (
    <>
      {token ? <MainApp /> : <AuthScreen />}
      <StatusBar style="dark" />
    </>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <NavigationContainer>
        <Root />
      </NavigationContainer>
    </AuthProvider>
  );
}

