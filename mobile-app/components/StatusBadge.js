// components/StatusBadge.js
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS, RADIUS, SPACING, FONTS } from '../constants/theme';

const StatusBadge = ({ connected }) => {
  const color = connected ? COLORS.success : COLORS.error;
  const bg = connected ? COLORS.successDim : COLORS.errorDim;
  const label = connected ? 'Connected' : 'Disconnected';

  return (
    <View style={[styles.badge, { backgroundColor: bg }]}>
      <View style={[styles.dot, { backgroundColor: color }]} />
      <Text style={[styles.text, { color }]}>{label}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.sm + 2,
    paddingVertical: SPACING.xs + 1,
    borderRadius: RADIUS.full,
    gap: 6,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  text: {
    fontSize: 12,
    fontWeight: FONTS.semibold,
    letterSpacing: 0.2,
  },
});

export default StatusBadge;
