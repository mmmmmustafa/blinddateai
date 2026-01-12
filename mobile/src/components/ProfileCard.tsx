import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

interface ProfileCardProps {
  displayName: string;
  age: number;
  location: string;
  bio: string;
  photos: string[];
  compatibilityHighlights?: string[];
}

export default function ProfileCard({
  displayName,
  age,
  location,
  bio,
  photos,
  compatibilityHighlights = [],
}: ProfileCardProps) {
  return (
    <View style={styles.card}>
      {/* Photo */}
      <View style={styles.photoContainer}>
        {photos && photos.length > 0 ? (
          <Image source={{ uri: photos[0] }} style={styles.photo} />
        ) : (
          <View style={styles.noPhoto}>
            <Text style={styles.noPhotoEmoji}>👤</Text>
          </View>
        )}
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.9)']}
          style={styles.gradient}
        />
        <View style={styles.nameContainer}>
          <Text style={styles.name}>
            {displayName}, {age}
          </Text>
          <Text style={styles.location}>📍 {location}</Text>
        </View>
      </View>

      {/* Bio */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>About</Text>
        <Text style={styles.bio}>{bio || 'No bio yet'}</Text>
      </View>

      {/* Compatibility Highlights */}
      {compatibilityHighlights.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Why you matched</Text>
          {compatibilityHighlights.map((highlight, index) => (
            <View key={index} style={styles.highlightRow}>
              <Text style={styles.highlightCheck}>✓</Text>
              <Text style={styles.highlightText}>{highlight}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#1E1E2D',
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#2A2A3E',
  },
  photoContainer: {
    height: 350,
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
  noPhotoEmoji: {
    fontSize: 80,
    opacity: 0.5,
  },
  gradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 150,
  },
  nameContainer: {
    position: 'absolute',
    bottom: 20,
    left: 20,
  },
  name: {
    fontSize: 28,
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
  section: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#2A2A3E',
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#8B5CF6',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 10,
  },
  bio: {
    fontSize: 16,
    color: '#fff',
    lineHeight: 24,
  },
  highlightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 10,
  },
  highlightCheck: {
    color: '#10B981',
    fontSize: 16,
    fontWeight: '700',
  },
  highlightText: {
    color: '#fff',
    fontSize: 15,
  },
});
