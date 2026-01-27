import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import {
    LayoutAnimation,
    Platform,
    Pressable,
    StyleSheet,
    Text,
    UIManager,
    View,
} from 'react-native';

if (Platform.OS === 'android') {
  UIManager.setLayoutAnimationEnabledExperimental?.(true);
}

export function LegalDisclaimer() {
  const [open, setOpen] = useState(false);

  const toggle = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setOpen(!open);
  };

  return (
    <View style={styles.container}>
      <Pressable onPress={toggle} style={styles.header}>
        <Text style={styles.title}>Legal & Disclaimer</Text>
        <Ionicons
          name={open ? 'chevron-up' : 'chevron-down'}
          size={20}
          color="#666"
        />
      </Pressable>

      {!open && <Text style={styles.hint}>Tap to view</Text>}

      {open && (
        <Text style={styles.text}>
          LaunchNB provides publicly available information for awareness purposes
          only. Availability, access conditions, and operational status may change
          without notice. LaunchNB does not own, operate, maintain, or staff any
          boat launch or decontamination station shown in the app and does not
          guarantee accuracy or availability. Users are responsible for assessing
          site conditions, personal safety, and compliance with applicable laws
          and regulations. LaunchNB is not an enforcement or regulatory authority.
          {'\n\n'}
          Tournament and event information is provided for informational purposes
          only and does not imply endorsement, affiliation, or sponsorship by
          LaunchNB.
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 28,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    paddingTop: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: 15,
    fontWeight: '600',
    color: '#444',
  },
  hint: {
    fontSize: 12,
    color: '#888',
    marginTop: 4,
  },
  text: {
    marginTop: 12,
    fontSize: 12,
    color: '#666',
    lineHeight: 18,
    textAlign: 'center',
  },
});
