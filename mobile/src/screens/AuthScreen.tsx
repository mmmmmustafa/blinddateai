import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';

import { RootStackParamList } from '../../App';
import { api } from '../services/api';
import { useUserStore, UserStatus } from '../stores/userStore';

type AuthScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Auth'>;

export default function AuthScreen() {
  const navigation = useNavigation<AuthScreenNavigationProp>();
  const setAuth = useUserStore((state) => state.setAuth);

  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSendOTP = async () => {
    if (!phoneNumber.trim()) {
      setError('Please enter your phone number');
      return;
    }

    setLoading(true);
    setError('');

    const { data, error: apiError } = await api.sendOTP(phoneNumber);

    setLoading(false);

    if (apiError) {
      setError(apiError);
      return;
    }

    setStep('otp');
  };

  const handleVerifyOTP = async () => {
    if (otp.length === 0) {
      setError('Please enter a code');
      return;
    }

    setLoading(true);
    setError('');

    const { data, error: apiError } = await api.verifyOTP(phoneNumber, otp);

    setLoading(false);

    if (apiError) {
      setError(apiError);
      return;
    }

    if (data) {
      await setAuth(data.access_token, data.user_id, data.status as UserStatus);

      if (data.status === 'onboarding') {
        navigation.replace('OnboardingChat');
      } else {
        navigation.replace('Waiting');
      }
    }
  };

  return (
    <LinearGradient colors={['#0A0A0F', '#1A1A2E', '#0A0A0F']} style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.content}
      >
        {/* Logo/Title */}
        <View style={styles.header}>
          <Text style={styles.logo}>💫</Text>
          <Text style={styles.title}>BlindDate</Text>
          <Text style={styles.subtitle}>Where connections happen naturally</Text>
        </View>

        {/* Form */}
        <View style={styles.form}>
          {step === 'phone' ? (
            <>
              <Text style={styles.label}>Enter your phone number</Text>
              <TextInput
                style={styles.input}
                placeholder="+1 (555) 123-4567"
                placeholderTextColor="#666"
                keyboardType="phone-pad"
                value={phoneNumber}
                onChangeText={setPhoneNumber}
                autoFocus
              />
              <TouchableOpacity
                style={[styles.button, loading && styles.buttonDisabled]}
                onPress={handleSendOTP}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.buttonText}>Continue</Text>
                )}
              </TouchableOpacity>
            </>
          ) : (
            <>
              <Text style={styles.label}>Enter the code we sent to {phoneNumber}</Text>
              <TextInput
                style={styles.input}
                placeholder="000000"
                placeholderTextColor="#666"
                keyboardType="number-pad"
                maxLength={6}
                value={otp}
                onChangeText={setOtp}
                autoFocus
              />
              <TouchableOpacity
                style={[styles.button, loading && styles.buttonDisabled]}
                onPress={handleVerifyOTP}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.buttonText}>Verify</Text>
                )}
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setStep('phone')} style={styles.backButton}>
                <Text style={styles.backButtonText}>Use different number</Text>
              </TouchableOpacity>
            </>
          )}

          {error ? <Text style={styles.error}>{error}</Text> : null}
        </View>

        {/* Footer */}
        <Text style={styles.footer}>
          By continuing, you agree to our Terms & Privacy Policy
        </Text>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 32,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 60,
  },
  logo: {
    fontSize: 64,
    marginBottom: 16,
  },
  title: {
    fontSize: 36,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 1,
  },
  subtitle: {
    fontSize: 16,
    color: '#888',
    marginTop: 8,
  },
  form: {
    marginBottom: 40,
  },
  label: {
    color: '#ccc',
    fontSize: 16,
    marginBottom: 12,
  },
  input: {
    backgroundColor: '#1E1E2D',
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingVertical: 18,
    fontSize: 18,
    color: '#fff',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#2A2A3E',
  },
  button: {
    backgroundColor: '#8B5CF6',
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: 'center',
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  backButton: {
    marginTop: 16,
    alignItems: 'center',
  },
  backButtonText: {
    color: '#8B5CF6',
    fontSize: 16,
  },
  error: {
    color: '#EF4444',
    fontSize: 14,
    marginTop: 12,
    textAlign: 'center',
  },
  footer: {
    color: '#666',
    fontSize: 12,
    textAlign: 'center',
  },
});
