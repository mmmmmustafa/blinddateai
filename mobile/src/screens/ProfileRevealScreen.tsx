import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  ScrollView,
  ActivityIndicator,
  Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';

import { RootStackParamList } from '../../App';
import { api } from '../services/api';
import { useUserStore } from '../stores/userStore';

type ProfileRevealNavigationProp = NativeStackNavigationProp<RootStackParamList, 'ProfileReveal'>;
type ProfileRevealRouteProp = RouteProp<RootStackParamList, 'ProfileReveal'>;

interface RevealedProfile {
  id: string;
  display_name: string;
  age: number;
  location: string;
  bio: string;
  photos: string[];
  compatibility_highlights: string[];
}

export default function ProfileRevealScreen() {
  const navigation = useNavigation<ProfileRevealNavigationProp>();
  const route = useRoute<ProfileRevealRouteProp>();
  const { matchId } = route.params;
  const { setStatus, setCurrentMatch } = useUserStore();

  const [loading, setLoading] = useState(true);
  const [revealing, setRevealing] = useState(true);
  const [profile, setProfile] = useState<RevealedProfile | null>(null);
  const [decision, setDecision] = useState<'continue' | 'pass' | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [waitingForPartner, setWaitingForPartner] = useState(false);

  const revealAnim = new Animated.Value(0);
  const scaleAnim = new Animated.Value(0.8);

  useEffect(() => {
    loadProfile();
  }, [matchId]);

  useEffect(() => {
    if (profile) {
      // Reveal animation
      setTimeout(() => {
        setRevealing(false);
        Animated.parallel([
          Animated.timing(revealAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.spring(scaleAnim, {
            toValue: 1,
            friction: 4,
            useNativeDriver: true,
          }),
        ]).start();
      }, 2000);
    }
  }, [profile]);

  const loadProfile = async () => {
    const { data, error } = await api.getRevealedProfile(matchId);
    setLoading(false);

    if (data) {
      setProfile(data);
    }
  };

  const submitDecision = async (choice: 'continue' | 'pass') => {
    setDecision(choice);
    setSubmitting(true);

    const { data, error } = await api.submitDecision(matchId, choice);
    setSubmitting(false);

    if (data) {
      if (data.waiting_for_partner) {
        setWaitingForPartner(true);
        // Poll for result
        pollForResult();
      } else {
        handleResult(data.match_status);
      }
    }
  };

  const pollForResult = async () => {
    const interval = setInterval(async () => {
      const { data } = await api.getCurrentMatch();
      if (data && data.status !== 'revealed') {
        clearInterval(interval);
        handleResult(data.status);
      }
    }, 2000);
  };

  const handleResult = (status: string) => {
    if (status === 'continued') {
      // Both said continue - go back to chat
      navigation.replace('BlindChat', { matchId });
    } else {
      // Match ended
      setStatus('active');
      setCurrentMatch(null);
      navigation.replace('Waiting');
    }
  };

  if (loading) {
    return (
      <LinearGradient colors={['#0A0A0F', '#1A1A2E', '#0A0A0F']} style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#8B5CF6" />
        </View>
      </LinearGradient>
    );
  }

  if (revealing) {
    return (
      <LinearGradient colors={['#0A0A0F', '#1A1A2E', '#0A0A0F']} style={styles.container}>
        <View style={styles.revealingContainer}>
          <Text style={styles.revealingEmoji}>✨</Text>
          <Text style={styles.revealingTitle}>It's a Match!</Text>
          <Text style={styles.revealingSubtitle}>
            You've reached 80% compatibility
          </Text>
          <Text style={styles.revealingText}>
            Get ready to meet your match...
          </Text>
          <ActivityIndicator size="large" color="#8B5CF6" style={{ marginTop: 30 }} />
        </View>
      </LinearGradient>
    );
  }

  if (waitingForPartner) {
    return (
      <LinearGradient colors={['#0A0A0F', '#1A1A2E', '#0A0A0F']} style={styles.container}>
        <View style={styles.waitingContainer}>
          <Text style={styles.waitingEmoji}>⏳</Text>
          <Text style={styles.waitingTitle}>
            You chose to {decision === 'continue' ? 'continue' : 'pass'}
          </Text>
          <Text style={styles.waitingText}>
            Waiting for your match to decide...
          </Text>
          <ActivityIndicator size="large" color="#8B5CF6" style={{ marginTop: 30 }} />
        </View>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient colors={['#0A0A0F', '#1A1A2E', '#0A0A0F']} style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* Profile Card */}
          <Animated.View
            style={[
              styles.profileCard,
              {
                opacity: revealAnim,
                transform: [{ scale: scaleAnim }],
              },
            ]}
          >
            {/* Photo */}
            <View style={styles.photoContainer}>
              {profile?.photos && profile.photos.length > 0 ? (
                <Image source={{ uri: profile.photos[0] }} style={styles.photo} />
              ) : (
                <View style={styles.noPhoto}>
                  <Text style={styles.noPhotoText}>No photo yet</Text>
                </View>
              )}
              <LinearGradient
                colors={['transparent', 'rgba(0,0,0,0.8)']}
                style={styles.photoGradient}
              />
              <View style={styles.nameOverlay}>
                <Text style={styles.name}>
                  {profile?.display_name}, {profile?.age}
                </Text>
                <Text style={styles.location}>📍 {profile?.location}</Text>
              </View>
            </View>

            {/* Bio */}
            <View style={styles.bioSection}>
              <Text style={styles.sectionTitle}>About</Text>
              <Text style={styles.bio}>{profile?.bio || 'No bio yet'}</Text>
            </View>

            {/* Compatibility Highlights */}
            {profile?.compatibility_highlights && profile.compatibility_highlights.length > 0 && (
              <View style={styles.highlightsSection}>
                <Text style={styles.sectionTitle}>Why you matched</Text>
                {profile.compatibility_highlights.map((highlight, index) => (
                  <View key={index} style={styles.highlightItem}>
                    <Text style={styles.highlightIcon}>✓</Text>
                    <Text style={styles.highlightText}>{highlight}</Text>
                  </View>
                ))}
              </View>
            )}
          </Animated.View>

          {/* Decision buttons */}
          <View style={styles.decisionContainer}>
            <Text style={styles.decisionTitle}>What do you think?</Text>
            <View style={styles.buttonsRow}>
              <TouchableOpacity
                style={[styles.decisionButton, styles.passButton]}
                onPress={() => submitDecision('pass')}
                disabled={submitting}
              >
                <Text style={styles.passButtonText}>Pass</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.decisionButton, styles.continueButton]}
                onPress={() => submitDecision('continue')}
                disabled={submitting}
              >
                <LinearGradient
                  colors={['#8B5CF6', '#A855F7']}
                  style={styles.continueButtonGradient}
                >
                  {submitting ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.continueButtonText}>Continue</Text>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </View>
            <Text style={styles.decisionNote}>
              Both of you need to choose "Continue" to keep chatting
            </Text>
          </View>
        </ScrollView>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  revealingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  revealingEmoji: {
    fontSize: 80,
    marginBottom: 24,
  },
  revealingTitle: {
    fontSize: 36,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 8,
  },
  revealingSubtitle: {
    fontSize: 18,
    color: '#8B5CF6',
    marginBottom: 16,
  },
  revealingText: {
    fontSize: 16,
    color: '#888',
  },
  waitingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  waitingEmoji: {
    fontSize: 64,
    marginBottom: 24,
  },
  waitingTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 8,
    textAlign: 'center',
  },
  waitingText: {
    fontSize: 16,
    color: '#888',
    textAlign: 'center',
  },
  scrollContent: {
    padding: 20,
  },
  profileCard: {
    backgroundColor: '#1E1E2D',
    borderRadius: 24,
    overflow: 'hidden',
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#2A2A3E',
  },
  photoContainer: {
    height: 400,
    position: 'relative',
  },
  photo: {
    width: '100%',
    height: '100%',
  },
  noPhoto: {
    flex: 1,
    backgroundColor: '#2A2A3E',
    justifyContent: 'center',
    alignItems: 'center',
  },
  noPhotoText: {
    color: '#666',
    fontSize: 18,
  },
  photoGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 150,
  },
  nameOverlay: {
    position: 'absolute',
    bottom: 20,
    left: 20,
  },
  name: {
    fontSize: 32,
    fontWeight: '700',
    color: '#fff',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 4,
  },
  location: {
    fontSize: 16,
    color: '#ddd',
    marginTop: 4,
  },
  bioSection: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#8B5CF6',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  bio: {
    fontSize: 16,
    color: '#fff',
    lineHeight: 24,
  },
  highlightsSection: {
    padding: 20,
    paddingTop: 0,
  },
  highlightItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 10,
  },
  highlightIcon: {
    color: '#10B981',
    fontSize: 16,
    fontWeight: '700',
  },
  highlightText: {
    color: '#fff',
    fontSize: 15,
  },
  decisionContainer: {
    alignItems: 'center',
  },
  decisionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 20,
  },
  buttonsRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 16,
  },
  decisionButton: {
    flex: 1,
    borderRadius: 16,
    overflow: 'hidden',
  },
  passButton: {
    backgroundColor: '#2A2A3E',
    paddingVertical: 18,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#3A3A4E',
    borderRadius: 16,
  },
  passButtonText: {
    color: '#888',
    fontSize: 18,
    fontWeight: '600',
  },
  continueButton: {
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  continueButtonGradient: {
    paddingVertical: 18,
    alignItems: 'center',
    borderRadius: 16,
  },
  continueButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  decisionNote: {
    color: '#666',
    fontSize: 13,
    textAlign: 'center',
  },
});
