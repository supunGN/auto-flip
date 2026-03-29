// screens/SettingsScreen.js
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  ScrollView,
  Animated,
  StatusBar,
  Platform,
  KeyboardAvoidingView,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';

import Card from '../components/Card';
import PrimaryButton from '../components/PrimaryButton';
import { COLORS, SPACING, FONTS, RADIUS } from '../constants/theme';
import { getStoredIP, saveIP, fetchStatus, DEFAULT_IP } from '../constants/api';

export default function SettingsScreen() {
  const [ip, setIp] = useState('');
  const [draftIp, setDraftIp] = useState('');
  const [connected, setConnected] = useState(null);
  const [deviceInfo, setDeviceInfo] = useState(null);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [toast, setToast] = useState(null);

  const tabBarHeight = useBottomTabBarHeight();

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const toastAnim = useRef(new Animated.Value(0)).current;
  const inputFocusBorder = useRef(new Animated.Value(0)).current;
  const spinAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 700, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, friction: 7, useNativeDriver: true }),
    ]).start();
    loadIP();
  }, []);

  const loadIP = async () => {
    const stored = await getStoredIP();
    setIp(stored);
    setDraftIp(stored);
    testConnection(stored, true);
  };

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    toastAnim.setValue(0);
    Animated.sequence([
      Animated.timing(toastAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
      Animated.delay(2500),
      Animated.timing(toastAnim, { toValue: 0, duration: 300, useNativeDriver: true }),
    ]).start(() => setToast(null));
  };

  const testConnection = async (targetIp = ip, silent = false) => {
    if (!targetIp) return;
    if (!silent) setTesting(true);
    try {
      const data = await fetchStatus(targetIp);
      setConnected(true);
      setDeviceInfo(data);
      if (!silent) showToast('Device is reachable!', 'success');
    } catch {
      setConnected(false);
      setDeviceInfo(null);
      if (!silent) showToast('Cannot reach device. Check IP & WiFi.', 'error');
    } finally {
      if (!silent) setTesting(false);
    }
  };

  const handleRefresh = () => {
    spinAnim.setValue(0);
    Animated.timing(spinAnim, { toValue: 1, duration: 600, useNativeDriver: true }).start();
    testConnection(ip, true).then(() => showToast('Status refreshed!', 'success'));
  };

  const handleSave = async () => {
    const trimmed = draftIp.trim();
    if (!trimmed) {
      showToast('Please enter a valid IP address.', 'error');
      return;
    }
    setSaving(true);
    try {
      await saveIP(trimmed);
      setIp(trimmed);
      showToast('Configuration saved!', 'success');
      setTimeout(() => testConnection(trimmed, false), 400);
    } catch {
      showToast('Failed to save. Try again.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleInputFocus = () => {
    Animated.timing(inputFocusBorder, { toValue: 1, duration: 200, useNativeDriver: false }).start();
  };

  const handleInputBlur = () => {
    Animated.timing(inputFocusBorder, { toValue: 0, duration: 200, useNativeDriver: false }).start();
  };

  const inputBorderColor = inputFocusBorder.interpolate({
    inputRange: [0, 1],
    outputRange: [COLORS.border, COLORS.accent],
  });

  const spin = spinAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  // Device info grid items
  const infoItems = deviceInfo
    ? [
        {
          label: 'People',
          value: String(deviceInfo.count ?? 0),
          icon: 'people',
          color: COLORS.success,
          bg: COLORS.successDim,
        },
        {
          label: 'Brightness',
          value: `${deviceInfo.light ?? 0}%`,
          icon: 'sunny',
          color: COLORS.accent,
          bg: COLORS.accentDim,
        },
        {
          label: 'Mode',
          value: deviceInfo.autoMode ? 'Auto' : 'Manual',
          icon: deviceInfo.autoMode ? 'flash' : 'hand-left',
          color: deviceInfo.autoMode ? COLORS.success : COLORS.primary,
          bg: deviceInfo.autoMode ? COLORS.successDim : COLORS.primaryDim,
        },
        {
          label: 'Light',
          value: deviceInfo.servoState === 1 ? 'ON' : 'OFF',
          icon: 'bulb',
          color: deviceInfo.servoState === 1 ? COLORS.primary : COLORS.accent,
          bg: deviceInfo.servoState === 1 ? COLORS.primaryDim : COLORS.accentDim,
        },
      ]
    : [];

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[styles.container, { paddingBottom: tabBarHeight + SPACING.lg }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header */}
          <Animated.View style={[styles.header, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
            <View style={styles.headerLeft}>
              <Text style={styles.title}>Settings</Text>
              <Text style={styles.subtitle}>Configure your device</Text>
            </View>
            <TouchableOpacity style={styles.refreshBtn} onPress={handleRefresh} activeOpacity={0.7}>
              <Animated.View style={{ transform: [{ rotate: spin }] }}>
                <Ionicons name="refresh" size={20} color={COLORS.textSecondary} />
              </Animated.View>
            </TouchableOpacity>
          </Animated.View>

          <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>

            {/* Device Status Card */}
            <Card style={styles.card}>
              <Text style={styles.sectionLabel}>DEVICE STATUS</Text>

              {/* Connection Row */}
              <View style={styles.deviceStatusRow}>
                <View style={styles.deviceLeft}>
                  <View style={[styles.iconWrap, {
                    backgroundColor: connected ? COLORS.successDim : connected === false ? COLORS.errorDim : COLORS.border,
                  }]}>
                    <Ionicons
                      name="wifi"
                      size={20}
                      color={connected ? COLORS.success : connected === false ? COLORS.error : COLORS.textMuted}
                    />
                  </View>
                  <View>
                    <Text style={styles.deviceTitle}>
                      {connected === null ? 'Checking...' : connected ? 'Connected' : 'Disconnected'}
                    </Text>
                    <Text style={styles.deviceSubtitle}>
                      {connected === null
                        ? 'Testing connection...'
                        : connected
                        ? `ESP32 · ${ip}`
                        : 'Device is unreachable'}
                    </Text>
                  </View>
                </View>
                <View style={[styles.statusDot, {
                  backgroundColor: connected ? COLORS.success : connected === false ? COLORS.error : COLORS.textMuted,
                }]} />
              </View>

              {/* Live Stats Grid */}
              {connected && deviceInfo && (
                <View style={styles.infoGrid}>
                  {infoItems.map((item) => (
                    <View key={item.label} style={[styles.infoCell, { backgroundColor: item.bg }]}>
                      <View style={[styles.infoCellIcon, { backgroundColor: `${item.color}22` }]}>
                        <Ionicons name={item.icon} size={14} color={item.color} />
                      </View>
                      <Text style={[styles.infoCellValue, { color: item.color }]}>{item.value}</Text>
                      <Text style={styles.infoCellLabel}>{item.label}</Text>
                    </View>
                  ))}
                </View>
              )}
            </Card>

            {/* WiFi Config Card */}
            <Card style={styles.card}>
              <Text style={styles.sectionLabel}>WI-FI CONFIGURATION</Text>
              <Text style={styles.inputLabel}>ESP32 IP Address</Text>
              <Animated.View style={[styles.inputWrapper, { borderColor: inputBorderColor }]}>
                <Ionicons name="globe-outline" size={16} color={COLORS.textMuted} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  value={draftIp}
                  onChangeText={setDraftIp}
                  onFocus={handleInputFocus}
                  onBlur={handleInputBlur}
                  placeholder={DEFAULT_IP}
                  placeholderTextColor={COLORS.textMuted}
                  keyboardType="numeric"
                  autoCapitalize="none"
                  autoCorrect={false}
                  selectionColor={COLORS.accent}
                />
              </Animated.View>
              <Text style={styles.inputHint}>
                Enter the IP address shown in your ESP32 serial monitor
              </Text>

              <View style={styles.buttonGroup}>
                <PrimaryButton
                  title="Save Configuration"
                  onPress={handleSave}
                  loading={saving}
                />
                <PrimaryButton
                  title="Test Connection"
                  onPress={() => testConnection(draftIp, false)}
                  loading={testing}
                  variant="secondary"
                />
              </View>
            </Card>

            {/* About Card */}
            <Card style={[styles.card, styles.aboutCard]}>
              <View style={styles.aboutRow}>
                <View style={[styles.iconWrap, { backgroundColor: COLORS.primaryDim }]}>
                  <Ionicons name="bulb" size={20} color={COLORS.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.aboutTitle}>Smart Light App</Text>
                  <Text style={styles.aboutSub}>Control your ESP32-powered smart light remotely over your local Wi-Fi network.</Text>
                </View>
              </View>
            </Card>

          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Toast */}
      {toast && (
        <Animated.View
          style={[
            styles.toast,
            toast.type === 'error' ? styles.toastError : styles.toastSuccess,
            {
              opacity: toastAnim,
              transform: [{ translateY: toastAnim.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }],
            },
          ]}
        >
          <Ionicons
            name={toast.type === 'error' ? 'close-circle' : 'checkmark-circle'}
            size={16}
            color={toast.type === 'error' ? COLORS.error : COLORS.success}
          />
          <Text style={styles.toastText}>{toast.message}</Text>
        </Animated.View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  scroll: { flex: 1 },
  container: { paddingHorizontal: SPACING.lg },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingTop: SPACING.lg,
    paddingBottom: SPACING.md,
  },
  headerLeft: { flex: 1 },
  title: { fontSize: 30, fontWeight: FONTS.bold, color: COLORS.textPrimary, letterSpacing: -0.5 },
  subtitle: { fontSize: 14, color: COLORS.textSecondary, marginTop: 4 },
  refreshBtn: {
    width: 36,
    height: 36,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.surfaceLight,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    marginTop: 6,
  },
  card: { marginTop: SPACING.md },
  sectionLabel: {
    fontSize: 11, fontWeight: FONTS.semibold, color: COLORS.textMuted,
    letterSpacing: 1.4, marginBottom: SPACING.md,
  },
  deviceStatusRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  deviceLeft: { flexDirection: 'row', alignItems: 'center', gap: SPACING.md },
  iconWrap: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  deviceTitle: { fontSize: 16, fontWeight: FONTS.semibold, color: COLORS.textPrimary },
  deviceSubtitle: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2, maxWidth: 200 },
  statusDot: { width: 10, height: 10, borderRadius: 5 },
  infoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: SPACING.md,
    gap: SPACING.sm,
    paddingTop: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  infoCell: {
    flex: 1,
    minWidth: '44%',
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    alignItems: 'flex-start',
  },
  infoCellIcon: {
    width: 28,
    height: 28,
    borderRadius: RADIUS.sm,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.xs,
  },
  infoCellLabel: { fontSize: 11, color: COLORS.textMuted, marginTop: 2, fontWeight: FONTS.medium },
  infoCellValue: { fontSize: 18, fontWeight: FONTS.bold, color: COLORS.textPrimary },
  inputLabel: { fontSize: 13, fontWeight: FONTS.semibold, color: COLORS.textPrimary, marginBottom: SPACING.sm },
  inputWrapper: {
    borderWidth: 1.5,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.surfaceLight,
    paddingHorizontal: SPACING.md,
    flexDirection: 'row',
    alignItems: 'center',
  },
  inputIcon: { marginRight: SPACING.sm },
  input: {
    flex: 1,
    fontSize: 16,
    color: COLORS.textPrimary,
    height: 50,
    fontWeight: FONTS.regular,
  },
  inputHint: { fontSize: 12, color: COLORS.textMuted, marginTop: SPACING.sm, marginBottom: SPACING.md, lineHeight: 18 },
  buttonGroup: { gap: SPACING.sm },
  aboutCard: {
    borderColor: `${COLORS.primary}22`,
  },
  aboutRow: { flexDirection: 'row', gap: SPACING.md, alignItems: 'flex-start' },
  aboutTitle: { fontSize: 14, fontWeight: FONTS.semibold, color: COLORS.textPrimary, marginBottom: 4 },
  aboutSub: { fontSize: 12, color: COLORS.textSecondary, lineHeight: 18 },
  toast: {
    position: 'absolute',
    bottom: SPACING.xl,
    left: SPACING.lg,
    right: SPACING.lg,
    borderRadius: RADIUS.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  toastSuccess: { backgroundColor: COLORS.successDim, borderWidth: 1, borderColor: `${COLORS.success}44` },
  toastError: { backgroundColor: COLORS.errorDim, borderWidth: 1, borderColor: `${COLORS.error}44` },
  toastText: { fontSize: 13, color: COLORS.textPrimary, flex: 1, fontWeight: FONTS.medium },
});
