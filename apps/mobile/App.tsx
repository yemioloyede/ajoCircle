import React, { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { StatusBar } from 'expo-status-bar';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AuthProvider, useAuth } from './src/context/AuthContext';

import OnboardingScreen from './src/screens/OnboardingScreen';
import AuthScreen from './src/screens/AuthScreen';
import HomeScreen from './src/screens/HomeScreen';
import CreateCircleScreen from './src/screens/CreateCircleScreen';
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
const ONBOARDING_KEY = 'ajocircle_seen_onboarding';

function HomeStackNav() {
  return (
    <HomeStack.Navigator screenOptions={{ headerShown: false }}>
      <HomeStack.Screen name="Groups" component={HomeScreen} />
      <HomeStack.Screen name="CreateCircle" component={CreateCircleScreen} />
      <HomeStack.Screen name="GroupDetail" component={GroupDetailScreen} />
    </HomeStack.Navigator>
  );
}

function WalletStackNav() {
  return (
    <WalletStack.Navigator screenOptions={{ headerShown: false }}>
      <WalletStack.Screen name="WalletMain" component={WalletScreen} />
      <WalletStack.Screen name="ContributionHistory" component={ContributionHistoryScreen} />
      <WalletStack.Screen name="PayoutHistory" component={PayoutHistoryScreen} />
    </WalletStack.Navigator>
  );
}

function ProfileStackNav() {
  return (
    <ProfileStack.Navigator screenOptions={{ headerShown: false }}>
      <ProfileStack.Screen name="ProfileMain" component={UserProfileScreen} />
      <ProfileStack.Screen name="BankAccounts" component={BankAccountScreen} />
      <ProfileStack.Screen name="KYC" component={KYCScreen} />
      <ProfileStack.Screen name="ContributionHistory" component={ContributionHistoryScreen} />
      <ProfileStack.Screen name="PayoutHistory" component={PayoutHistoryScreen} />
    </ProfileStack.Navigator>
  );
}

function TabIcon({ focused, color, label }: { focused: boolean; color: string; label: string }) {
  return <Text style={{ fontSize: 11, color, fontWeight: focused ? '700' : '400', marginTop: 2 }}>{label}</Text>;
}

function MainApp() {
  return (
    <SafeAreaView style={{ flex: 1 }} edges={['bottom']}>
      <Tab.Navigator
        screenOptions={{
          tabBarActiveTintColor: TAB_COLOR,
          tabBarInactiveTintColor: INACTIVE,
          tabBarStyle: { backgroundColor: '#121417', borderTopColor: '#2F343B', paddingBottom: 8, height: 68, paddingTop: 6 },
          tabBarLabelStyle: { fontWeight: '700', fontSize: 11 },
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
          options={{ tabBarLabel: 'Alerts', tabBarIcon: ({ color, focused }) => <TabIcon focused={focused} color={color} label="🔔" /> }}
        />
        <Tab.Screen
          name="Profile"
          component={ProfileStackNav}
          options={{ tabBarLabel: 'Profile', tabBarIcon: ({ color, focused }) => <TabIcon focused={focused} color={color} label="👤" /> }}
        />
      </Tab.Navigator>
    </SafeAreaView>
  );
}

function Root() {
  const { token, isLoading } = useAuth();
  const [ready, setReady] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(true);

  useEffect(() => {
    AsyncStorage.getItem(ONBOARDING_KEY)
      .then(value => setShowOnboarding(value !== '1'))
      .catch(() => setShowOnboarding(true))
      .finally(() => setReady(true));
  }, []);

  async function dismissOnboarding() {
    setShowOnboarding(false);
    await AsyncStorage.setItem(ONBOARDING_KEY, '1');
  }

  if (isLoading || !ready) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#080A0D' }}>
        <Text style={{ fontSize: 36, fontWeight: '900', color: '#E8EAED', marginBottom: 16 }}>AjoCircle</Text>
        <ActivityIndicator color="#0B6B45" size="large" />
      </View>
    );
  }

  return (
    <>
      {token ? <MainApp /> : showOnboarding ? <OnboardingScreen onGetStarted={dismissOnboarding} onLogin={dismissOnboarding} /> : <AuthScreen onBackToIntro={dismissOnboarding} />}
      <StatusBar style="light" />
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

