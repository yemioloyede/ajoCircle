import React, { useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '../theme';

interface Props {
  navigation?: any;
  route?: { params?: { message?: string; reference?: string; amount?: string; groupName?: string } };
}

export default function PaymentSuccessScreen({ navigation, route }: Props) {
  const { message, reference, amount, groupName } = route?.params || {};
  const scale = useRef(new Animated.Value(0.3)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scale, { toValue: 1, useNativeDriver: true, tension: 50, friction: 7 }),
      Animated.timing(opacity, { toValue: 1, duration: 400, useNativeDriver: true }),
    ]).start();
  }, []);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 28, paddingBottom: 60, alignItems: 'center' }}>
        <Animated.View style={{ transform: [{ scale }], opacity, marginTop: 80, alignItems: 'center' }}>
          <Text style={{ fontSize: 88 }}>🎉</Text>
        </Animated.View>

        <Text style={{ color: theme.colors.text, fontSize: 30, fontWeight: '900', marginTop: 24, textAlign: 'center' }}>Payment Successful!</Text>
        <Text style={{ color: theme.colors.muted, fontSize: 16, marginTop: 12, textAlign: 'center', lineHeight: 26 }}>
          {message || `Your contribution to "${groupName || 'your circle'}" has been recorded.`}
        </Text>

        {reference && (
          <View style={{ marginTop: 28, width: '100%', backgroundColor: theme.colors.surface, borderRadius: 20, padding: 20, borderWidth: 1, borderColor: theme.colors.border }}>
            <Text style={{ color: theme.colors.muted, fontSize: 13, fontWeight: '700' }}>Transaction Reference</Text>
            <Text style={{ color: theme.colors.text, fontSize: 15, fontWeight: '800', marginTop: 6, letterSpacing: 0.5 }}>{reference}</Text>
            {amount && (
              <>
                <View style={{ height: 1, backgroundColor: theme.colors.border, marginVertical: 14 }} />
                <Text style={{ color: theme.colors.muted, fontSize: 13, fontWeight: '700' }}>Amount Paid</Text>
                <Text style={{ color: theme.colors.primary, fontSize: 22, fontWeight: '900', marginTop: 4 }}>{amount}</Text>
              </>
            )}
          </View>
        )}

        <TouchableOpacity
          onPress={() => navigation?.navigate('Home')}
          style={{ marginTop: 36, width: '100%', height: 68, borderRadius: 22, backgroundColor: theme.colors.primary, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ color: theme.colors.white, fontSize: 18, fontWeight: '900' }}>Back to Home</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => navigation?.navigate('ContributionHistory')}
          style={{ marginTop: 14, width: '100%', height: 56, borderRadius: 18, backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.border, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ color: theme.colors.text, fontSize: 16, fontWeight: '800' }}>View History</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}
