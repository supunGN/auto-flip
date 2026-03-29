// screens/HomeScreen.js
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Animated,
  StatusBar,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';

import LightButton from '../components/LightButton';
import Card from '../components/Card';
import Toggle from '../components/Toggle';
import { COLORS, SPACING, FONTS, RADIUS } from '../constants/theme';
import { getStoredIP, fetchStatus, sendCommand } from '../constants/api';

const AUTO_REFRESH_INTERVAL = 6000; // 6 seconds

export default function HomeScreen() {
  const [isOn, setIsOn] = useState(false);
  const [autoMode, setAutoMode] = useState(true);
  const [personCount, setPersonCount] = useState(0);
  const [brightness, setBrightness] = useState(0);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [connected, setConnected] = useState(null);
  const [ip, setIp] = useState('192.168.1.100');

  const tabBarHeight = useBottomTabBarHeight();

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const statusScale = useRef(new Animated.Value(1)).current;
  const spinAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 700, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, friction: 7, useNativeDriver: true }),
    ]).start();

    loadIPAndStatus();
  }, []);

  // Auto-refresh polling
  useEffect(() => {
    const interval = setInterval(() => {
      pollStatus();
    }, AUTO_REFRESH_INTERVAL);
    return () => clearInterval(interval);
  }, [ip]);

  const loadIPAndStatus = async () => {
    const storedIp = await getStoredIP();
    setIp(storedIp);
    await pullStatus(storedIp);
  };

  const pollStatus = async () => {
    const storedIp = await getStoredIP();
    setIp(storedIp);
    await pullStatus(storedIp, true);
  };

  const pullStatus = async (targetIp, silent = false) => {
    try {
      const data = await fetchStatus(targetIp);
      setIsOn(data.servoState === 1);
      setAutoMode(data.autoMode);
      setPersonCount(data.count ?? 0);
      setBrightness(data.light ?? 0);
      setConnected(true);
      if (!silent) animatePulse();
    } catch {
      setConnected(false);
    }
  };

  const animatePulse = () => {
    Animated.sequence([
      Animated.timing(statusScale, { toValue: 1.1, duration: 150, useNativeDriver: true }),
      Animated.timing(statusScale, { toValue: 1, duration: 150, useNativeDriver: true }),
    ]).start();
  };

  const animateSpin = () => {
    spinAnim.setValue(0);
    Animated.timing(spinAnim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start();
  };

  const handleRefresh = useCallback(async () => {
    animateSpin();
    await loadIPAndStatus();
  }, []);

  // Toggle light ON / OFF (sets manual mode on ESP32)
  const handleLightToggle = useCallback(async () => {
    if (loading) return;
    const action = isOn ? 'manual/off' : 'manual/on';
    setLoading(true);
    try {
      await sendCommand(ip, action);
      setIsOn(!isOn);
      setAutoMode(false);
      setConnected(true);
      animatePulse();
    } catch {
      setConnected(false);
    } finally {
      setLoading(false);
    }
  }, [isOn, loading, ip]);

  // Auto mode toggle
  const handleAutoToggle = useCallback(async (newValue) => {
    setLoading(true);
    try {
      if (newValue) {
        await sendCommand(ip, 'auto');
        setAutoMode(true);
        await pullStatus(ip);
      } else {
        await sendCommand(ip, 'manual/off');
        setAutoMode(false);
        setIsOn(false);
      }
      setConnected(true);
    } catch {
      setConnected(false);
    } finally {
      setLoading(false);
    }
  }, [ip]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadIPAndStatus();
    setRefreshing(false);
  }, []);

  const spin = spinAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const statusColor = isOn ? COLORS.lightOn : COLORS.lightOff;
  const statusLabel = isOn ? 'ON' : 'OFF';

  // Grid stats data
  const stats = [
    {
      label: 'Light Status',
      value: statusLabel,
      icon: 'bulb',
      color: statusColor,
      bg: isOn ? COLORS.primaryDim : COLORS.accentDim,
    },
    {
      label: 'People in Room',
      value: String(personCount),
      icon: 'people',
      color: COLORS.success,
      bg: COLORS.successDim,
    },
    {
      label: 'Ambient Light',
      value: `${brightness}%`,
      icon: 'sunny',
      color: COLORS.accent,
      bg: COLORS.accentDim,
    },
    {
      label: 'Mode',
      value: autoMode ? 'Auto' : 'Manual',
      icon: autoMode ? 'flash' : 'hand-left',
      color: autoMode ? COLORS.success : COLORS.primary,
      bg: autoMode ? COLORS.successDim : COLORS.primaryDim,
    },
  ];

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.container, { paddingBottom: tabBarHeight + SPACING.lg }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={COLORS.primary}
            colors={[COLORS.primary]}
          />
        }
      >
        {/* Header */}
        <Animated.View style={[styles.header, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
          <View style={styles.headerLeft}>
            <Text style={styles.title}>Smart Light</Text>
            <Text style={styles.subtitle}>Manage your lighting with ease</Text>
          </View>
          <View style={styles.headerRight}>
            {/* Refresh Button */}
            <TouchableOpacity style={styles.refreshBtn} onPress={handleRefresh} activeOpacity={0.7}>
              <Animated.View style={{ transform: [{ rotate: spin }] }}>
                <Ionicons name="refresh" size={20} color={COLORS.textSecondary} />
              </Animated.View>
            </TouchableOpacity>
            {/* Connection dot */}
            <View style={[styles.connectionDot, {
              backgroundColor:
                connected === true ? COLORS.success
                : connected === false ? COLORS.error
                : COLORS.textMuted,
            }]} />
          </View>
        </Animated.View>

        {/* Light Button */}
        <Animated.View style={[styles.buttonWrapper, { opacity: fadeAnim }]}>
          <LightButton isOn={isOn} onPress={handleLightToggle} loading={loading} />
          <Animated.Text style={[styles.statusText, { color: statusColor, transform: [{ scale: statusScale }] }]}>
            {loading ? 'Working...' : `Light is ${statusLabel}`}
          </Animated.Text>
          {autoMode && (
            <Text style={styles.autoLabel}>🤖 Auto Mode Active</Text>
          )}
        </Animated.View>

        {/* Auto Mode Card */}
        <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
          <Card style={styles.card}>
            <View style={styles.autoModeRow}>
              <View style={styles.autoModeLeft}>
                <View style={styles.iconWrap}>
                  <Ionicons name="flash" size={18} color={COLORS.primary} />
                </View>
                <View>
                  <Text style={styles.cardTitle}>Auto Mode</Text>
                  <Text style={styles.cardSubtitle}>Automatic scheduling</Text>
                </View>
              </View>
              <Toggle value={autoMode} onValueChange={handleAutoToggle} disabled={loading} />
            </View>
          </Card>

          {/* Stats Grid Card */}
          <Card style={styles.card}>
            <View style={styles.statsHeader}>
              <Text style={styles.sectionLabel}>LIVE STATUS</Text>
              <View style={[styles.liveDot, { backgroundColor: connected === true ? COLORS.success : COLORS.textMuted }]} />
            </View>
            <View style={styles.statsGrid}>
              {stats.map((stat) => (
                <View key={stat.label} style={[styles.statCell, { backgroundColor: stat.bg }]}>
                  <View style={[styles.statIconWrap, { backgroundColor: `${stat.color}22` }]}>
                    <Ionicons name={stat.icon} size={16} color={stat.color} />
                  </View>
                  <Text style={[styles.statValue, { color: stat.color }]}>{stat.value}</Text>
                  <Text style={styles.statLabel}>{stat.label}</Text>
                </View>
              ))}
            </View>
          </Card>
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scroll: { flex: 1 },
  container: {
    paddingHorizontal: SPACING.lg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingTop: SPACING.lg,
    paddingBottom: SPACING.md,
  },
  headerLeft: { flex: 1 },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginTop: 6,
  },
  title: {
    fontSize: 26,
    fontWeight: FONTS.bold,
    color: COLORS.textPrimary,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  refreshBtn: {
    width: 36,
    height: 36,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.surfaceLight,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  connectionDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  buttonWrapper: {
    alignItems: 'center',
    marginVertical: SPACING.md,
  },
  statusText: {
    fontSize: 22,
    fontWeight: FONTS.bold,
    marginTop: SPACING.xs,
    letterSpacing: 0.3,
  },
  autoLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 6,
  },
  card: {
    marginTop: SPACING.md,
  },
  autoModeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  autoModeLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  iconWrap: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: COLORS.primaryDim,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: FONTS.semibold,
    color: COLORS.textPrimary,
  },
  cardSubtitle: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  statsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.md,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: FONTS.semibold,
    color: COLORS.textMuted,
    letterSpacing: 1.2,
  },
  liveDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  statCell: {
    flex: 1,
    minWidth: '44%',
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    alignItems: 'flex-start',
  },
  statIconWrap: {
    width: 32,
    height: 32,
    borderRadius: RADIUS.sm,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.sm,
  },
  statValue: {
    fontSize: 20,
    fontWeight: FONTS.bold,
    letterSpacing: 0.2,
  },
  statLabel: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 3,
    fontWeight: FONTS.medium,
  },
});
