import { supabase } from '@/supabaseClient';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Stack, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Easing,
  Image,
  Pressable,
  StyleSheet,
  View
} from 'react-native';

const IOS_BLUE = '#007AFF';
const LOGO = require('../assets/LaunchNB.png');






function HeaderTitle() {
  const router = useRouter();

  const floatAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const float = Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, {
          toValue: 1,
          duration: 3200,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(floatAnim, {
          toValue: 0,
          duration: 3200,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );

    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1,
       duration: 2400,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0,
      duration: 2400,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );

    float.start();
    pulse.start();

    return () => {
      float.stop();
      pulse.stop();
    };
  }, [floatAnim, pulseAnim]);

  const translateY = floatAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -1.5],
  });

  const scale = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.03],
  });

  const opacity = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.7, 1],
  });

  return (
    <View style={styles.header}>
      {/* CENTER LOGO */}
      <View style={styles.absoluteCenter}>
        <Animated.View style={{ transform: [{ translateY }] }}>
          <Image
            source={LOGO}
            style={styles.centerLogo}
            resizeMode="contain"
          />
        </Animated.View>
      </View>

      {/* INFO BUTTON */}
      <Pressable
        style={styles.infoButton}
        onPress={() => router.push('/clean-drain-dry')}
      >
        <Animated.View
          style={[
            styles.glowWrapper,
            {
              transform: [{ scale }],
              opacity,
            },
          ]}
        >
          <FontAwesome name="info-circle" size={18} color={IOS_BLUE} />
        </Animated.View>
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
          headerTitle: '', // 🔥 override here
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
glowWrapper: {
  alignItems: 'center',
  justifyContent: 'center',
  height: 36,
  width: 36,
  borderRadius: 18,
  backgroundColor: 'rgba(0,122,255,0.10)',

  shadowColor: IOS_BLUE,
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.15,
  shadowRadius: 6,

  elevation: 3,
},

});
