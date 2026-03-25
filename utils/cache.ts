import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

export interface TokenCache {
  getToken: (key: string) => Promise<string | undefined | null>;
  saveToken: (key: string, token: string) => Promise<void>;
  clearToken?: (key: string) => void;
}

export const tokenCache = Platform.OS !== 'web'
  ? {
      async getToken(key: string) {
        try {
          const item = await SecureStore.getItemAsync(key);
          return item;
        } catch (err) {
          return null;
        }
      },
      async saveToken(key: string, value: string) {
        try {
          await SecureStore.setItemAsync(key, value);
        } catch (err) {
          return;
        }
      },
    }
  : undefined;
