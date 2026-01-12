import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';

interface CompatibilityMeterProps {
  score: number; // 0-1
}

export default function CompatibilityMeter({ score }: CompatibilityMeterProps) {
  const animatedValue = useRef(new Animated.Value(0)).current;
  const percentage = Math.round(score * 100);

  useEffect(() => {
    Animated.timing(animatedValue, {
      toValue: score,
      duration: 500,
      useNativeDriver: false,
    }).start();
  }, [score]);

  const getColor = () => {
    if (percentage >= 80) return '#10B981'; // Green - reveal ready
    if (percentage >= 60) return '#8B5CF6'; // Purple - getting there
    if (percentage >= 40) return '#F59E0B'; // Orange - warming up
    return '#6B7280'; // Gray - just started
  };

  const getLabel = () => {
    if (percentage >= 80) return 'Ready to reveal!';
    if (percentage >= 60) return 'Great connection';
    if (percentage >= 40) return 'Getting warmer';
    return 'Keep chatting';
  };

  const width = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.label}>{getLabel()}</Text>
        <Text style={[styles.percentage, { color: getColor() }]}>{percentage}%</Text>
      </View>
      <View style={styles.track}>
        <Animated.View
          style={[
            styles.fill,
            {
              width,
              backgroundColor: getColor(),
            },
          ]}
        />
        {/* 80% threshold marker */}
        <View style={styles.threshold} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: 120,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  label: {
    fontSize: 10,
    color: '#888',
  },
  percentage: {
    fontSize: 14,
    fontWeight: '700',
  },
  track: {
    height: 6,
    backgroundColor: '#2A2A3E',
    borderRadius: 3,
    overflow: 'hidden',
    position: 'relative',
  },
  fill: {
    height: '100%',
    borderRadius: 3,
  },
  threshold: {
    position: 'absolute',
    left: '80%',
    top: 0,
    bottom: 0,
    width: 2,
    backgroundColor: '#10B981',
    opacity: 0.5,
  },
});
