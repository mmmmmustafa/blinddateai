import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';

import { RootStackParamList } from '../../App';
import { api } from '../services/api';
import { useUserStore } from '../stores/userStore';

type OnboardingNavigationProp = NativeStackNavigationProp<RootStackParamList, 'OnboardingChat'>;

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

export default function OnboardingChatScreen() {
  const navigation = useNavigation<OnboardingNavigationProp>();
  const setStatus = useUserStore((state) => state.setStatus);

  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    // Start conversation with AI
    startConversation();
  }, []);

  const startConversation = async () => {
    setLoading(true);
    const { data, error } = await api.sendOnboardingMessage('');
    setLoading(false);
    setInitialLoading(false);

    if (data?.message) {
      setMessages([
        {
          id: '1',
          role: 'assistant',
          content: data.message,
        },
      ]);
    }
  };

  const sendMessage = async () => {
    if (!inputText.trim() || loading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: inputText.trim(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputText('');
    setLoading(true);

    const { data, error } = await api.sendOnboardingMessage(userMessage.content);

    setLoading(false);

    if (data?.message) {
      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.message,
      };
      setMessages((prev) => [...prev, aiMessage]);

      if (data.profile_complete) {
        // Profile is complete, move to matching
        setStatus('active');
        setTimeout(() => {
          navigation.replace('Waiting');
        }, 2000);
      }
    }
  };

  const renderMessage = ({ item }: { item: Message }) => (
    <View
      style={[
        styles.messageBubble,
        item.role === 'user' ? styles.userBubble : styles.aiBubble,
      ]}
    >
      {item.role === 'assistant' && (
        <Text style={styles.aiLabel}>✨ Your Wingman</Text>
      )}
      <Text style={styles.messageText}>{item.content}</Text>
    </View>
  );

  if (initialLoading) {
    return (
      <LinearGradient colors={['#0A0A0F', '#1A1A2E', '#0A0A0F']} style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingEmoji}>💫</Text>
          <Text style={styles.loadingText}>Preparing your wingman...</Text>
          <ActivityIndicator size="large" color="#8B5CF6" />
        </View>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient colors={['#0A0A0F', '#1A1A2E', '#0A0A0F']} style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Let's get to know you</Text>
          <Text style={styles.headerSubtitle}>Chat naturally - no boring forms</Text>
        </View>

        {/* Messages */}
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.chatContainer}
          keyboardVerticalOffset={100}
        >
          <FlatList
            ref={flatListRef}
            data={messages}
            renderItem={renderMessage}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.messagesList}
            onContentSizeChange={() => flatListRef.current?.scrollToEnd()}
            showsVerticalScrollIndicator={false}
          />

          {loading && (
            <View style={styles.typingIndicator}>
              <Text style={styles.typingText}>Thinking...</Text>
            </View>
          )}

          {/* Input */}
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              placeholder="Type your message..."
              placeholderTextColor="#666"
              value={inputText}
              onChangeText={setInputText}
              multiline
              maxLength={500}
            />
            <TouchableOpacity
              style={[styles.sendButton, !inputText.trim() && styles.sendButtonDisabled]}
              onPress={sendMessage}
              disabled={!inputText.trim() || loading}
            >
              <Text style={styles.sendButtonText}>→</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
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
    gap: 20,
  },
  loadingEmoji: {
    fontSize: 64,
  },
  loadingText: {
    color: '#888',
    fontSize: 18,
  },
  header: {
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#2A2A3E',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#888',
    marginTop: 4,
  },
  chatContainer: {
    flex: 1,
  },
  messagesList: {
    paddingHorizontal: 16,
    paddingVertical: 20,
  },
  messageBubble: {
    maxWidth: '85%',
    padding: 16,
    borderRadius: 20,
    marginBottom: 12,
  },
  userBubble: {
    backgroundColor: '#8B5CF6',
    alignSelf: 'flex-end',
    borderBottomRightRadius: 4,
  },
  aiBubble: {
    backgroundColor: '#1E1E2D',
    alignSelf: 'flex-start',
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: '#2A2A3E',
  },
  aiLabel: {
    fontSize: 12,
    color: '#8B5CF6',
    marginBottom: 6,
    fontWeight: '600',
  },
  messageText: {
    color: '#fff',
    fontSize: 16,
    lineHeight: 22,
  },
  typingIndicator: {
    paddingHorizontal: 24,
    paddingVertical: 8,
  },
  typingText: {
    color: '#888',
    fontSize: 14,
    fontStyle: 'italic',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#2A2A3E',
    gap: 12,
  },
  input: {
    flex: 1,
    backgroundColor: '#1E1E2D',
    borderRadius: 24,
    paddingHorizontal: 20,
    paddingVertical: 14,
    fontSize: 16,
    color: '#fff',
    maxHeight: 120,
    borderWidth: 1,
    borderColor: '#2A2A3E',
  },
  sendButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#8B5CF6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#3A3A4E',
  },
  sendButtonText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
  },
});
