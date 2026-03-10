import { UnreadNotificationsContext } from '@/app/context/UnreadNotificationsContext';
import { supabase } from '@/supabaseClient';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { useFocusEffect } from '@react-navigation/native';
import { Image } from 'react-native';

const DECON_IMAGE = require('@/assets/images/deconstation.png');

import {
  useCallback,
  useContext,
  useState
} from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  ScrollView, // ✅ ADD THIS
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

/* ---------------- TYPES ---------------- */

type NotificationRow = {
  id: string;
  title: string;
  body: string;
  created_at: string;
  is_read: boolean;
};

/* ---------------- SCREEN ---------------- */

export default function NotificationsScreen() {
  const [notifications, setNotifications] = useState<NotificationRow[]>([]);
  const [loading, setLoading] = useState(true);
  type AlertsMode = 'alerts' | 'prevention';
const [mode, setMode] = useState<AlertsMode>('alerts');


  const { refreshUnreadCount } = useContext(UnreadNotificationsContext);

  /* ---------- LOAD NOTIFICATIONS ---------- */

  const loadNotifications = useCallback(async () => {
 setLoading(prev => prev); // do nothing

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError) {
      console.error('❌ auth error:', authError);
    }

if (!user) {
  setLoading(false);
  return;
}


const { data: notifData, error: notifError } = await supabase
  .from('notifications')
  .select(`
    id,
    title,
    body,
    created_at,
    notification_reads (
      user_id
    )
  `)
  .order('created_at', { ascending: false });



    if (notifError || !notifData) {
      console.error('❌ failed to load notifications:', notifError);
      setNotifications([]);
      setLoading(false);
      return;
    }

const formatted: NotificationRow[] = (notifData ?? []).map((n: any) => ({
  id: n.id as string,
  title: n.title as string,
  body: n.body as string,
  created_at: n.created_at as string,
  is_read:
    Array.isArray(n.notification_reads) &&
    n.notification_reads.some((r: any) => r.user_id === user.id),
}));


setNotifications(formatted);

    setLoading(false);
  }, []);

  /* ---------- REFRESH BADGE ON FOCUS ---------- */

 useFocusEffect(
  useCallback(() => {
    loadNotifications();
    refreshUnreadCount();
  }, [loadNotifications, refreshUnreadCount])
);

  /* ---------- UNREAD COUNT ---------- */

  const unreadCount = notifications.filter(n => !n.is_read).length;

  /* ---------- MARK AS READ (SMOOTH UX) ---------- */

  const markAsRead = useCallback(
    async (notificationId: string) => {
      const alreadyRead = notifications.find(
        n => n.id === notificationId
      )?.is_read;

      if (alreadyRead) return;

      // 🔥 Optimistic UI (instant, smooth)
      setNotifications(prev =>
        prev.map(n =>
          n.id === notificationId ? { ...n, is_read: true } : n
        )
      );

      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) return;

      await supabase
        .from('notification_reads')
        .upsert(
          {
            notification_id: notificationId,
            user_id: user.id,
          },
          { onConflict: 'notification_id,user_id' }
        );

      refreshUnreadCount();
      // No reload → avoids snap
    },
    [notifications, refreshUnreadCount]
  );

  /* ---------- RENDER ---------- */

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={[]}>
        <View style={styles.center}>
          <ActivityIndicator size="large" />
        </View>
      </SafeAreaView>
    );
  }

  return (
   <SafeAreaView style={styles.container} edges={[]}>

<View style={styles.segmentWrapper}>
  <Pressable
    style={[
      styles.segmentButton,
      mode === 'alerts' && styles.segmentActive,
    ]}
    onPress={() => setMode('alerts')}
  >
    <Text
      style={[
        styles.segmentText,
        mode === 'alerts' && styles.segmentTextActive,
      ]}
    >
      Alerts
    </Text>
  </Pressable>

  <Pressable
    style={[
      styles.segmentButton,
      mode === 'prevention' && styles.segmentActive,
    ]}
    onPress={() => setMode('prevention')}
  >
    <Text
      style={[
        styles.segmentText,
        mode === 'prevention' && styles.segmentTextActive,
      ]}
    >
      Prevention
    </Text>
  </Pressable>
</View>


    {mode === 'alerts' ? (
  <>
    {!notifications.length && (
      <View style={styles.center}>
        <Text style={styles.empty}>No alerts yet</Text>
      </View>
    )}

    <FlatList
      data={notifications}
      keyExtractor={item => item.id}
      contentContainerStyle={styles.list}
      renderItem={({ item }) => {
        const isRead = item.is_read;

        return (
          <Pressable
            style={[styles.card, !isRead && styles.unreadCard]}
            onPress={() => markAsRead(item.id)}
          >
            <View style={styles.cardHeader}>
              {!isRead && <View style={styles.dot} />}
              <Text style={styles.title}>{item.title}</Text>
            </View>

            <Text style={styles.body}>{item.body}</Text>

            <View style={styles.footer}>
              <FontAwesome name="clock-o" size={12} color="#8E8E93" />
              <Text style={styles.time}>
                {new Date(item.created_at).toLocaleString()}
              </Text>
            </View>
          </Pressable>
        );
      }}
    />
  </>
) : (
  <PreventionContent />
)}

    </SafeAreaView>
  );
}






function PreventionContent() {
  return (
    <ScrollView contentContainerStyle={styles.preventionContainer}>
      
      {/* Hero */}
      <View style={styles.hero}>
        <Text style={styles.heroTitle}>
          Aquatic Invasive Species Prevention
        </Text>
        <Text style={styles.heroSubtitle}>
          Simple actions that help protect our waters
        </Text>
      </View>

      {/* Intro */}
      <Text style={styles.preventionSection}>
       Aquatic invasive species can threaten biodiversity, ecosystem health, and
        economic activities. These species may spread unintentionally through
        recreational boating when organisms attach to watercraft, trailers, or
        equipment.
      </Text>

      <Text style={styles.preventionSection}>
Clean • Drain • Dry is a widely recognized best-practice approach used to help reduce the spread of aquatic
        invasive species. LaunchNB promotes these actions for educational and
        awareness purposes only.
      </Text>

      {/* Prevention Steps */}
      <Text style={styles.preventionHeader}>
        Prevention Steps
      </Text>

      {/* Clean */}
      <View style={styles.preventionCard}>
        <Text style={styles.preventionCardTitle}>
          Clean
        </Text>
        <Text style={styles.preventionCardText}>
           Remove all visible plants, animals, mud, and debris. Clean watercraft,
          trailers, and equipment on dry land, away from storm drains and
          waterways where possible.
        </Text>
      </View>

      {/* Drain */}
      <View style={styles.preventionCard}>
        <Text style={styles.preventionCardTitle}>
          Drain
        </Text>
        <Text style={styles.preventionCardText}>
    Drain all water from bilges, livewells, motors, bait buckets, coolers,
          and internal compartments. Drain plug requirements may vary by
          jurisdiction.
        </Text>
      </View>

      {/* Dry */}
      <View style={styles.preventionCard}>
        <Text style={styles.preventionCardTitle}>
          Dry
        </Text>
        <Text style={styles.preventionCardText}>
             Allow all equipment to dry completely before entering another
          waterbody. Drying time may vary depending on conditions and local
          guidance.
        </Text>
      </View>

    {/* Decontamination */}
<Text style={styles.preventionHeader}>
  Decontamination Stations
</Text>

{/* Decontamination Image */}
<Image
  source={DECON_IMAGE}
  style={styles.deconImage}
  resizeMode="contain"
/>




<View style={styles.preventionCard}>
  <Text style={styles.preventionCardTitle}>
    What They Are
  </Text>
  <Text style={styles.preventionCardText}>
    Decontamination stations are designated locations where watercraft and
    equipment can be professionally cleaned to reduce the risk of spreading
    aquatic invasive species between waterbodies.
  </Text>
</View>

<View style={styles.preventionCard}>
  <Text style={styles.preventionCardTitle}>
    How They Work
  </Text>
  <Text style={styles.preventionCardText}>
    Stations use high-pressure and/or hot water systems to remove attached
    plants, animals, mud, and microscopic organisms that may not be visible
    to the eye.
  </Text>
</View>

<View style={styles.preventionCard}>
  <Text style={styles.preventionCardTitle}>
    When to Use One
  </Text>
  <Text style={styles.preventionCardText}>
    Boaters are encouraged to use a decontamination station when moving
    between waterbodies, especially if aquatic invasive species are known
    or suspected in the area.
  </Text>
</View>

    </ScrollView>
  );
}



/* ---------------- STYLES ---------------- */

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  empty: {
    fontSize: 16,
    color: '#8E8E93',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E5EA',
  },
  badge: {
    backgroundColor: '#FF3B30',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  badgeText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 12,
  },
  list: {
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 20,
  },
  card: {
    padding: 14,
    borderRadius: 14,
    backgroundColor: '#F2F2F7',
    marginBottom: 14,
  },
  unreadCard: {
    backgroundColor: '#EEF4FF',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#007AFF',
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    flex: 1,
  },
  body: {
    fontSize: 14,
    color: '#3C3C43',
    marginTop: 4,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
  },
  time: {
    fontSize: 12,
    color: '#8E8E93',
  },
 segmentWrapper: {
  flexDirection: 'row',
  marginHorizontal: 16,
  marginTop: 12,
  marginBottom: 10,
  backgroundColor: '#F2F2F7',
  borderRadius: 20,
  padding: 4,
  height: 40, // 👈 THIS was missing
},


segmentButton: {
  flex: 1,
  height: 32,            // 👈 exact internal height
  borderRadius: 16,
  alignItems: 'center',
  justifyContent: 'center',
},


segmentActive: {
  backgroundColor: '#007AFF',
},

segmentText: {
  fontWeight: '600',
  fontSize: 14,
  color: '#333',
},

segmentTextActive: {
  color: '#fff',
},

preventionContainer: {
  paddingHorizontal: 22,
  paddingTop: 20,
  paddingBottom: 44,
  backgroundColor: '#F5F7FA',
},

hero: {
  backgroundColor: 'rgba(0,122,255,0.08)',
  padding: 18,
  borderRadius: 16,
  marginBottom: 16,
  borderWidth: 1,
  borderColor: 'rgba(0,122,255,0.35)',
},

heroTitle: {
  fontSize: 24,
  fontWeight: '700',
  color: '#007AFF',
  marginBottom: 4,
},

heroSubtitle: {
  fontSize: 14,
  color: '#555',
},

header: {
  fontSize: 20,
  fontWeight: '600',
  marginTop: 28,
  marginBottom: 10,
  color: '#007AFF',
},

section: {
  fontSize: 15,
  lineHeight: 22,
  marginBottom: 14,
  color: '#333',
},


cardTitle: {
  fontSize: 17,
  fontWeight: '600',
  marginBottom: 6,
  color: '#007AFF',
},

cardText: {
  fontSize: 14,
  lineHeight: 20,
  color: '#444',
},


preventionHeader: {
  fontSize: 20,
  fontWeight: '600',
  marginTop: 28,
  marginBottom: 10,
  color: '#007AFF',
},

preventionSection: {
  fontSize: 15,
  lineHeight: 22,
  marginBottom: 14,
  color: '#333',
},

preventionCard: {
  padding: 16,
  borderRadius: 14,
  marginTop: 12,
  backgroundColor: '#fff',
  borderLeftWidth: 4,
  borderLeftColor: '#007AFF',
  shadowColor: '#000',
  shadowOpacity: 0.04,
  shadowRadius: 6,
  shadowOffset: { width: 0, height: 2 },
},

preventionCardTitle: {
  fontSize: 17,
  fontWeight: '600',
  marginBottom: 6,
  color: '#007AFF',
},

preventionCardText: {
  fontSize: 14,
  lineHeight: 20,
  color: '#444',
},

deconImage: {
  width: '100%',
  height: 200,
  marginTop: 16,
  borderRadius: 16,
  backgroundColor: '#fff',
},

});
