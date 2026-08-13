import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { openWebApp } from '../utils/webApp';

const DISMISSED_KEY = 'garagepulse_web_banner_dismissed';

/**
 * Small nudge pointing users at the web app for functionality that isn't
 * (yet) on mobile. Dismissal is persisted so it doesn't reappear once closed.
 */
export default function WebAppBanner() {
  // null = not yet loaded from storage — kept hidden until we know, so a
  // previously-dismissed banner doesn't flash on screen before hiding again.
  const [dismissed, setDismissed] = useState<boolean | null>(null);

  useEffect(() => {
    AsyncStorage.getItem(DISMISSED_KEY).then(v => setDismissed(v === 'true'));
  }, []);

  const handleDismiss = useCallback(() => {
    setDismissed(true);
    AsyncStorage.setItem(DISMISSED_KEY, 'true');
  }, []);

  if (dismissed !== false) return null;

  return (
    <View style={s.banner} testID="web-app-banner">
      <TouchableOpacity style={s.content} onPress={openWebApp} activeOpacity={0.8}>
        <View style={s.iconWrap}>
          <Ionicons name="globe-outline" size={20} color="#3b5ff8" />
        </View>
        <View style={s.textWrap}>
          <Text style={s.title}>More on the web</Text>
          <Text style={s.subtitle}>Reports, bulk actions & more</Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color="#9ca3af" />
      </TouchableOpacity>
      <TouchableOpacity
        onPress={handleDismiss}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        style={s.closeBtn}
        testID="web-app-banner-dismiss"
        accessibilityLabel="Dismiss"
      >
        <Ionicons name="close" size={18} color="#9ca3af" />
      </TouchableOpacity>
    </View>
  );
}

const s = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#eff6ff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#bfdbfe',
    marginBottom: 16,
    paddingRight: 8,
  },
  content: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: '#dbeafe',
    justifyContent: 'center',
    alignItems: 'center',
  },
  textWrap: {
    flex: 1,
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1e3a8a',
  },
  subtitle: {
    fontSize: 12,
    color: '#3b5ff8',
    marginTop: 1,
  },
  closeBtn: {
    padding: 6,
  },
});
