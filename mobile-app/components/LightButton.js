// components/LightButton.js
import React, { useEffect, useRef } from 'react';
import {
  TouchableOpacity,
  Animated,
  StyleSheet,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../constants/theme';

const CIRCLE_SIZE = 220;

const LightButton = ({ isOn, onPress, loading }) => {
  const glowAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.timing(glowAnim, {
      toValue: isOn ? 1 : 0,
      duration: 600,
      useNativeDriver: false,
    }).start();
  }, [isOn]);

  useEffect(() => {
    if (isOn) {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.06,
            duration: 1800,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1800,
            useNativeDriver: true,
          }),
        ])
      );
      pulse.start();
      return () => pulse.stop();
    } else {
      pulseAnim.setValue(1);
    }
  }, [isOn]);

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.93,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      friction: 4,
      useNativeDriver: true,
    }).start();
  };

  const outerGlowRadius = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 55],
  });

  const outerGlowOpacity = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 0.18],
  });

  const borderColor = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [COLORS.circleBorderOff, COLORS.circleBorderOn],
  });

  const bgColor = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [COLORS.circleOff, COLORS.circleOn],
  });

  const iconColor = isOn ? COLORS.lightOn : COLORS.lightOff;

  return (
    <View style={styles.wrapper}>
      {/* Outer glow halo */}
      <Animated.View
        style={[
          styles.glowHalo,
          {
            width: CIRCLE_SIZE + outerGlowRadius * 2,
            height: CIRCLE_SIZE + outerGlowRadius * 2,
            borderRadius: (CIRCLE_SIZE + outerGlowRadius * 2) / 2,
            opacity: outerGlowOpacity,
            backgroundColor: COLORS.primary,
            position: 'absolute',
            alignSelf: 'center',
          },
        ]}
      />

      <Animated.View style={{ transform: [{ scale: scaleAnim }, { scale: pulseAnim }] }}>
        <TouchableOpacity
          onPress={onPress}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          disabled={loading}
          activeOpacity={1}
        >
          <Animated.View
            style={[
              styles.circle,
              {
                borderColor,
                backgroundColor: bgColor,
              },
            ]}
          >
            <Ionicons
              name={isOn ? 'bulb' : 'bulb-outline'}
              size={72}
              color={iconColor}
            />
          </Animated.View>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    width: CIRCLE_SIZE + 120,
    height: CIRCLE_SIZE + 120,
  },
  glowHalo: {
    position: 'absolute',
  },
  circle: {
    width: CIRCLE_SIZE,
    height: CIRCLE_SIZE,
    borderRadius: CIRCLE_SIZE / 2,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 30,
    elevation: 10,
  },
});

export default LightButton;
