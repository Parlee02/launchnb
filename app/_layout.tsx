import { supabase } from '@/supabaseClient';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Stack, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  StyleSheet,
  View
} from 'react-native';

const IOS_BLUE = '#007AFF';
const LOGO = require('../assets/LaunchNB.png');

function HeaderTitle() {
  const router = useRouter();

  return (
    <View style={styles.header}>
      
      {/* CENTER LOGO */}
      <View style={styles.absoluteCenter}>
        <Image
          source={LOGO}
          style={styles.centerLogo}
          resizeMode="contain"
        />
      </View>

      {/* INFO BUTTON */}
      <Pressable
        style={styles.infoButton}
        onPress={() => router.push('/clean-drain-dry')}
      >
        <FontAwesome name="info-circle" size={18} color={IOS_BLUE} />
      </Pressable>

    </View>
  );
}

export default function RootLayout() {
  const [authReady, setAuthReady] = useState(false);

  useEffect(() => {
    let mounted = true;

    const initAuth = async () => {
      const {
        data: { session },
        error,
      } = await supabase.auth.getSession();

      if (error) {
        console.error('❌ getSession error:', error);
      }

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
      <View style={styles.loader}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <Stack
      screenOptions={{
        headerTitle: HeaderTitle, // default header for tabs
        headerTitleAlign: 'center',
      }}
    >
      {/* Tabs use custom logo header */}
      <Stack.Screen
        name="(tabs)"
        options={{
          headerShown: true,
        }}
      />

      {/* Clean Drain Dry overrides header */}
      <Stack.Screen
        name="clean-drain-dry"
        options={{
          headerTitle: 'Clean • Drain • Dry', // 🔥 override here
          headerBackTitle: 'Back',
        }}
      />
    </Stack>
  );
}

const styles = StyleSheet.create({

  loader: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  header: {
  width: '100%',
  height: 44,
  justifyContent: 'center',
},

absoluteCenter: {
  position: 'absolute',
  left: 0,
  right: 0,
  alignItems: 'center',
},

centerLogo: {
  width: 150,
  height: 34,
},

infoButton: {
  position: 'absolute',
  right: 16,
  height: 36,
  width: 36,
  borderRadius: 18,
  alignItems: 'center',
  justifyContent: 'center',
  backgroundColor: 'rgba(0,122,255,0.08)',
},

});
