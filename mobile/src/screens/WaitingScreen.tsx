import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';

import { RootStackParamList } from '../../App';
import { api } from '../services/api';
import { useUserStore } from '../stores/userStore';

type WaitingNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Waiting'>;

const TIPS = [
  "Be yourself - authenticity attracts the right people",
  "Ask open-ended questions to spark deeper conversations",
  "Share stories, not just facts about yourself",
  "Humor is attractive - don't be afraid to be playful",
  "Listen actively - respond to what they actually say",
  "Vulnerability creates connection - share what matters to you",
];

export default function WaitingScreen() {
  const navigation = useNavigation<WaitingNavigationProp>();
  const { setStatus, setCurrentMatch } = useUserStore();

  const [searching, setSearching] = useState(false);
  const [currentTip, setCurrentTip] = useState(0);
  const [error, setError] = useState('');

  const pulseAnim = new Animated.Value(1);

  useEffect(() => {
    // Check if user already has an active match
    checkExistingMatch();

    // Rotate tips
    const tipInterval = setInterval(() => {
      setCurrentTip((prev) => (prev + 1) % TIPS.length);
    }, 5000);

    return () => clearInterval(tipInterval);
  }, []);

  useEffect(() => {
    // Pulse animation
    const pulse = () => {
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.2,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ]).start(() => pulse());
    };

    if (searching) {
      pulse();
    }
  }, [searching]);

  const checkExistingMatch = async () => {
    const { data, error } = await api.getCurrentMatch();
    if (data) {
      setCurrentMatch(data.id);
      if (data.status === 'revealed') {
        navigation.replace('ProfileReveal', { matchId: data.id });
      } else {
        navigation.replace('BlindChat', { matchId: data.id });
      }
    }
  };

  const findMatch = async () => {
    setSearching(true);
    setError('');

    const { data, error: apiError } = await api.findMatch();

    if (apiError) {
      setSearching(false);
      setError(apiError);
      return;
    }

    if (data?.match) {
      setCurrentMatch(data.match.id);
      setStatus('in_chat');
      navigation.replace('BlindChat', { matchId: data.match.id });
    } else {
      setSearching(false);
      setError(data?.message || 'No matches found yet. Try again in a bit!');
    }
  };

  return (
    <LinearGradient colors={['#0A0A0F', '#1A1A2E', '#0A0A0F']} style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.content}>
          {/* Main visual */}
          <View style={styles.visualContainer}>
            {searching ? (
              <Animated.View style={[styles.searchingCircle, { transform: [{ scale: pulseAnim }] }]}>
                <Text style={styles.searchingEmoji}>🔮</Text>
              </Animated.View>
            ) : (
              <View style={styles.readyCircle}>
                <Text style={styles.readyEmoji}>💫</Text>
              </View>
            )}
          </View>

          {/* Status text */}
          <View style={styles.statusContainer}>
            <Text style={styles.statusTitle}>
              {searching ? 'Finding your match...' : 'Ready to connect?'}
            </Text>
            <Text style={styles.statusSubtitle}>
              {searching
                ? "We're looking for someone special for you"
                : 'Your perfect conversation partner is waiting'}
            </Text>
          </View>

          {/* Tip card */}
          <View style={styles.tipCard}>
            <Text style={styles.tipLabel}>💡 Dating Tip</Text>
            <Text style={styles.tipText}>{TIPS[currentTip]}</Text>
          </View>

          {/* Error message */}
          {error ? (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          {/* Action button */}
          {!searching && (
            <TouchableOpacity style={styles.button} onPress={findMatch}>
              <LinearGradient
                colors={['#8B5CF6', '#A855F7']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.buttonGradient}
              >
                <Text style={styles.buttonText}>Find My Match</Text>
              </LinearGradient>
            </TouchableOpacity>
          )}

          {searching && (
            <View style={styles.searchingInfo}>
              <ActivityIndicator color="#8B5CF6" />
              <Text style={styles.searchingText}>This may take a moment...</Text>
            </View>
          )}
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  visualContainer: {
    marginBottom: 40,
  },
  searchingCircle: {
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: '#1E1E2D',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#8B5CF6',
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
  },
  readyCircle: {
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: '#1E1E2D',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#2A2A3E',
  },
  searchingEmoji: {
    fontSize: 64,
  },
  readyEmoji: {
    fontSize: 64,
  },
  statusContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  statusTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#fff',
    textAlign: 'center',
  },
  statusSubtitle: {
    fontSize: 16,
    color: '#888',
    marginTop: 8,
    textAlign: 'center',
  },
  tipCard: {
    backgroundColor: '#1E1E2D',
    borderRadius: 16,
    padding: 20,
    width: '100%',
    marginBottom: 40,
    borderWidth: 1,
    borderColor: '#2A2A3E',
  },
  tipLabel: {
    fontSize: 12,
    color: '#8B5CF6',
    fontWeight: '600',
    marginBottom: 8,
  },
  tipText: {
    fontSize: 16,
    color: '#fff',
    lineHeight: 24,
  },
  errorContainer: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    width: '100%',
  },
  errorText: {
    color: '#EF4444',
    fontSize: 14,
    textAlign: 'center',
  },
  button: {
    width: '100%',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonGradient: {
    paddingVertical: 18,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  searchingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  searchingText: {
    color: '#888',
    fontSize: 16,
  },
});
