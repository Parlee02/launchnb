import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { supabase } from '@/supabaseClient';

export async function registerForPushNotifications() {
  try {
    if (!Device.isDevice) {
      console.log('Must use physical device for push notifications');
      return;
    }

    // 1️⃣ Request permission
    const { status: existingStatus } =
      await Notifications.getPermissionsAsync();

    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } =
        await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.log('Notification permission not granted');
      return;
    }

    // 2️⃣ Get Expo push token
    const tokenData = await Notifications.getExpoPushTokenAsync();
    const token = tokenData.data;

    console.log('Expo push token:', token);

    // 3️⃣ Save token to Supabase (GLOBAL)
    await supabase
      .from('push_tokens')
      .upsert(
        { token },
        { onConflict: 'token' }
      );

    console.log('✅ Push token saved');

    // 4️⃣ Android channel
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
      });
    }
  } catch (err) {
    console.error('❌ Push registration failed:', err);
  }
}
