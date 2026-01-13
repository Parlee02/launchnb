import { supabase } from '@/supabaseClient';
import { Stack } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';

export default function RootLayout() {
  const [authReady, setAuthReady] = useState(false);

  useEffect(() => {
    let mounted = true;

    const initAuth = async () => {
      // 1️⃣ Explicitly check for existing session
      const {
        data: { session },
        error,
      } = await supabase.auth.getSession();

      if (error) {
        console.error('❌ getSession error:', error);
      }

      // 2️⃣ If no session → sign in anonymously
      if (!session) {
        console.log('👤 no session — signing in anonymously');

        const { error: anonError } =
          await supabase.auth.signInAnonymously();

        if (anonError) {
          console.error('❌ anonymous sign-in failed:', anonError);
        } else {
          console.log('✅ signed in anonymously');
        }
      }

      if (mounted) setAuthReady(true);
    };

    initAuth();

    // 3️⃣ Listener ONLY for logging / future changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      console.log(
        '🔐 auth event:',
        event,
        session?.user?.id ?? 'no user'
      );
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  if (!authReady) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#fff',
        }}
      >
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}
