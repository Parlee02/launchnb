import { LegalDisclaimer } from '@/components/LegalDisclaimer';
import {
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

/* ---------------- COLORS ---------------- */

const IOS_BLUE = '#007AFF';

export default function CleanDrainDryScreen() {
  const openEmail = async () => {
    const url = 'mailto:info@launchnb.ca?subject=LaunchNB Inquiry';
    const supported = await Linking.canOpenURL(url);
    if (supported) Linking.openURL(url);
    else alert('Email: info@launchnb.ca');
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>

      {/* ---------------- ABOUT ---------------- */}

      <Text style={styles.header}>About LaunchNB</Text>

      <View style={styles.card}>
        <Text style={styles.cardText}>
          LaunchNB is an independent, non-government informational tool designed
          to support awareness of aquatic invasive species prevention, safe
          boating practices, and access to public water resources in
          New Brunswick.
        </Text>
      </View>

      {/* ---------------- CONTACT ---------------- */}

      <Text style={styles.header}>Contact Us</Text>

      <View style={styles.card}>
        <Text style={styles.cardText}>
          If you notice missing or incorrect information (boat launches,
          tournaments, or detections), or if you have questions, suggestions,
          or feedback, feel free to reach out. We review all submissions to
          continuously improve LaunchNB.
        </Text>

        <Pressable style={styles.primaryButton} onPress={openEmail}>
          <Text style={styles.primaryButtonText}>Email Us</Text>
        </Pressable>
      </View>

      {/* ---------------- LEGAL ---------------- */}

      <View style={styles.legalContainer}>
        <LegalDisclaimer />
      </View>

    </ScrollView>
  );
}

/* ---------------- STYLES ---------------- */

const styles = StyleSheet.create({
  container: {
    paddingTop: 20,
    paddingBottom: 50,
    backgroundColor: '#F5F7FA',
  },

  /* ---------------- HEADERS ---------------- */

  header: {
    fontSize: 22,
    fontWeight: '700',
    marginTop: 10,
    marginBottom: 14,
    color: IOS_BLUE,
    paddingHorizontal: 20,
  },

  /* ---------------- CARDS ---------------- */

  card: {
    padding: 18,
    borderRadius: 18,
    marginBottom: 18,
    marginHorizontal: 20,
    backgroundColor: '#FFFFFF',

    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },

  cardText: {
    fontSize: 15,
    lineHeight: 22,
    color: '#444',
  },

  /* ---------------- BUTTON ---------------- */

  primaryButton: {
    marginTop: 16,
    backgroundColor: IOS_BLUE,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
  },

  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },

  /* ---------------- LEGAL ---------------- */

  legalContainer: {
    marginHorizontal: 20,
    marginTop: 10,
  },
});
