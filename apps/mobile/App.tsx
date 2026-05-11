import React, { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { StatusBar } from 'expo-status-bar';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AuthProvider, useAuth } from './src/context/AuthContext';

// --- Auth & Onboarding ---
import OnboardingScreen from './src/screens/OnboardingScreen';
import AuthScreen from './src/screens/AuthScreen';
import CountrySelectScreen from './src/screens/CountrySelectScreen';
import OTPVerificationScreen from './src/screens/OTPVerificationScreen';
import ForgotPasswordScreen from './src/screens/ForgotPasswordScreen';
import TransactionPINScreen from './src/screens/TransactionPINScreen';
import BiometricSetupScreen from './src/screens/BiometricSetupScreen';

// --- Home / Groups ---
import HomeScreen from './src/screens/HomeScreen';
import CreateCircleScreen from './src/screens/CreateCircleScreen';
import GroupDetailScreen from './src/screens/GroupDetailScreen';
import CirclesHubScreen from './src/screens/CirclesHubScreen';
import GroupMembersScreen from './src/screens/GroupMembersScreen';
import GroupInviteScreen from './src/screens/GroupInviteScreen';
import GroupRotationScreen from './src/screens/GroupRotationScreen';
import GroupWalletScreen from './src/screens/GroupWalletScreen';
import ContributionHistoryScreen from './src/screens/ContributionHistoryScreen';

// --- Payments ---
import MakeContributionScreen from './src/screens/MakeContributionScreen';
import PaymentSuccessScreen from './src/screens/PaymentSuccessScreen';
import FailedPaymentScreen from './src/screens/FailedPaymentScreen';
import ScheduledContributionsScreen from './src/screens/ScheduledContributionsScreen';

// --- Wallet ---
import WalletScreen from './src/screens/WalletScreen';
import PayoutHistoryScreen from './src/screens/PayoutHistoryScreen';
import TransactionDetailScreen from './src/screens/TransactionDetailScreen';
import WithdrawFundsScreen from './src/screens/WithdrawFundsScreen';
import PayoutStatusScreen from './src/screens/PayoutStatusScreen';
import LinkedAccountsScreen from './src/screens/LinkedAccountsScreen';

// --- Notifications ---
import NotificationsScreen from './src/screens/NotificationsScreen';

// --- Profile & Settings ---
import UserProfileScreen from './src/screens/UserProfileScreen';
import BankAccountScreen from './src/screens/BankAccountScreen';
import KYCScreen from './src/screens/KYCScreen';
import TwoFactorAuthScreen from './src/screens/TwoFactorAuthScreen';
import TrustScoreScreen from './src/screens/TrustScoreScreen';
import FinancialInsightsScreen from './src/screens/FinancialInsightsScreen';
import AchievementsScreen from './src/screens/AchievementsScreen';
import ReferralScreen from './src/screens/ReferralScreen';
import SecurityCenterScreen from './src/screens/SecurityCenterScreen';
import ActiveSessionsScreen from './src/screens/ActiveSessionsScreen';
import PrivacyConsentScreen from './src/screens/PrivacyConsentScreen';
import HelpCenterScreen from './src/screens/HelpCenterScreen';
import SupportTicketScreen from './src/screens/SupportTicketScreen';
import DisputeResolutionScreen from './src/screens/DisputeResolutionScreen';
import ComplianceStatusScreen from './src/screens/ComplianceStatusScreen';
import AppSettingsScreen from './src/screens/AppSettingsScreen';
import CurrencyPreferencesScreen from './src/screens/CurrencyPreferencesScreen';
import LanguageSettingsScreen from './src/screens/LanguageSettingsScreen';

const Tab = createBottomTabNavigator();
const AuthStack = createStackNavigator();
const HomeStack = createStackNavigator();
const WalletStack = createStackNavigator();
const ProfileStack = createStackNavigator();

const TAB_COLOR = '#739A63';
const INACTIVE = '#888';
const ONBOARDING_KEY = 'ajocircle_seen_onboarding';
const NO_HEADER = { headerShown: false };

// ─── Auth navigator ───────────────────────────────────────────────────────────
function AuthNavigator() {
  return (
    <AuthStack.Navigator screenOptions={NO_HEADER}>
      <AuthStack.Screen name="Login" component={AuthScreen} />
      <AuthStack.Screen name="CountrySelect" component={CountrySelectScreen} />
      <AuthStack.Screen name="OTPVerification" component={OTPVerificationScreen} />
      <AuthStack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
      <AuthStack.Screen name="TransactionPIN" component={TransactionPINScreen} />
      <AuthStack.Screen name="BiometricSetup" component={BiometricSetupScreen} />
    </AuthStack.Navigator>
  );
}

// ─── Home / Groups stack ──────────────────────────────────────────────────────
function HomeStackNav() {
  return (
    <HomeStack.Navigator screenOptions={NO_HEADER}>
      <HomeStack.Screen name="Groups" component={HomeScreen} />
      <HomeStack.Screen name="CreateCircle" component={CreateCircleScreen} />
      <HomeStack.Screen name="CirclesHub" component={CirclesHubScreen} />
      <HomeStack.Screen name="GroupDetail" component={GroupDetailScreen} />
      <HomeStack.Screen name="GroupMembers" component={GroupMembersScreen} />
      <HomeStack.Screen name="GroupInvite" component={GroupInviteScreen} />
      <HomeStack.Screen name="GroupRotation" component={GroupRotationScreen} />
      <HomeStack.Screen name="GroupWallet" component={GroupWalletScreen} />
      <HomeStack.Screen name="ContributionHistory" component={ContributionHistoryScreen} />
      <HomeStack.Screen name="MakeContribution" component={MakeContributionScreen} />
      <HomeStack.Screen name="PaymentSuccess" component={PaymentSuccessScreen} />
      <HomeStack.Screen name="FailedPayment" component={FailedPaymentScreen} />
      <HomeStack.Screen name="ScheduledContributions" component={ScheduledContributionsScreen} />
      <HomeStack.Screen name="SupportTicket" component={SupportTicketScreen} />
      <HomeStack.Screen name="DisputeResolution" component={DisputeResolutionScreen} />
    </HomeStack.Navigator>
  );
}

// ─── Wallet stack ─────────────────────────────────────────────────────────────
function WalletStackNav() {
  return (
    <WalletStack.Navigator screenOptions={NO_HEADER}>
      <WalletStack.Screen name="WalletMain" component={WalletScreen} />
      <WalletStack.Screen name="ContributionHistory" component={ContributionHistoryScreen} />
      <WalletStack.Screen name="PayoutHistory" component={PayoutHistoryScreen} />
      <WalletStack.Screen name="TransactionDetail" component={TransactionDetailScreen} />
      <WalletStack.Screen name="WithdrawFunds" component={WithdrawFundsScreen} />
      <WalletStack.Screen name="PayoutStatus" component={PayoutStatusScreen} />
      <WalletStack.Screen name="ScheduledContributions" component={ScheduledContributionsScreen} />
      <WalletStack.Screen name="LinkedAccounts" component={LinkedAccountsScreen} />
      <WalletStack.Screen name="BankAccount" component={BankAccountScreen} />
    </WalletStack.Navigator>
  );
}

// ─── Profile stack ────────────────────────────────────────────────────────────
function ProfileStackNav() {
  return (
    <ProfileStack.Navigator screenOptions={NO_HEADER}>
      <ProfileStack.Screen name="ProfileMain" component={UserProfileScreen} />
      <ProfileStack.Screen name="KYC" component={KYCScreen} />
      <ProfileStack.Screen name="BankAccount" component={BankAccountScreen} />
      <ProfileStack.Screen name="LinkedAccounts" component={LinkedAccountsScreen} />
      <ProfileStack.Screen name="TrustScore" component={TrustScoreScreen} />
      <ProfileStack.Screen name="FinancialInsights" component={FinancialInsightsScreen} />
      <ProfileStack.Screen name="Achievements" component={AchievementsScreen} />
      <ProfileStack.Screen name="Referral" component={ReferralScreen} />
      <ProfileStack.Screen name="SecurityCenter" component={SecurityCenterScreen} />
      <ProfileStack.Screen name="ActiveSessions" component={ActiveSessionsScreen} />
      <ProfileStack.Screen name="TwoFactorAuth" component={TwoFactorAuthScreen} />
      <ProfileStack.Screen name="PrivacyConsent" component={PrivacyConsentScreen} />
      <ProfileStack.Screen name="ComplianceStatus" component={ComplianceStatusScreen} />
      <ProfileStack.Screen name="HelpCenter" component={HelpCenterScreen} />
      <ProfileStack.Screen name="SupportTicket" component={SupportTicketScreen} />
      <ProfileStack.Screen name="DisputeResolution" component={DisputeResolutionScreen} />
      <ProfileStack.Screen name="AppSettings" component={AppSettingsScreen} />
      <ProfileStack.Screen name="CurrencyPreferences" component={CurrencyPreferencesScreen} />
      <ProfileStack.Screen name="LanguageSettings" component={LanguageSettingsScreen} />
      <ProfileStack.Screen name="TransactionPIN" component={TransactionPINScreen} />
      <ProfileStack.Screen name="BiometricSetup" component={BiometricSetupScreen} />
      <ProfileStack.Screen name="ContributionHistory" component={ContributionHistoryScreen} />
      <ProfileStack.Screen name="PayoutHistory" component={PayoutHistoryScreen} />
    </ProfileStack.Navigator>
  );
}

function TabIcon({ color, label }: { focused: boolean; color: string; label: string }) {
  return <Text style={{ fontSize: 20, color }}>{label}</Text>;
}

// ─── Main app (authenticated) ─────────────────────────────────────────────────
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
          options={{ tabBarLabel: 'Circles', tabBarIcon: (p) => <TabIcon {...p} label="🏠" /> }}
        />
        <Tab.Screen
          name="Wallet"
          component={WalletStackNav}
          options={{ tabBarLabel: 'Wallet', tabBarIcon: (p) => <TabIcon {...p} label="💰" /> }}
        />
        <Tab.Screen
          name="Notifications"
          component={NotificationsScreen}
          options={{ tabBarLabel: 'Alerts', tabBarIcon: (p) => <TabIcon {...p} label="🔔" /> }}
        />
        <Tab.Screen
          name="Profile"
          component={ProfileStackNav}
          options={{ tabBarLabel: 'Profile', tabBarIcon: (p) => <TabIcon {...p} label="👤" /> }}
        />
      </Tab.Navigator>
    </SafeAreaView>
  );
}

// ─── Root ─────────────────────────────────────────────────────────────────────
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
        <ActivityIndicator color={TAB_COLOR} size="large" />
      </View>
    );
  }

  if (token) return <><MainApp /><StatusBar style="light" /></>;

  // Not authenticated: show onboarding once, then auth screen via navigator
  if (showOnboarding) {
    return (
      <>
        <OnboardingScreen onGetStarted={dismissOnboarding} onLogin={dismissOnboarding} />
        <StatusBar style="light" />
      </>
    );
  }

  return (
    <>
      <AuthNavigator />
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

