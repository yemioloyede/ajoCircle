import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

const envApiUrl = (globalThis as any)?.process?.env?.EXPO_PUBLIC_API_URL as string | undefined;

export const API_URL: string =
  envApiUrl ||
  (Constants.expoConfig?.extra?.apiUrl as string) ||
  'https://ajocircle.onrender.com';

export async function api(path: string, options: any = {}) {
  const token = await AsyncStorage.getItem('token');
  const r = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.error || 'Request failed');
  return j;
}
