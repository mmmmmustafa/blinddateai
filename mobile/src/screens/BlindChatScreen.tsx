import React, { useState, useRef, useEffect, useCallback } from 'react';
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
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';

import { RootStackParamList } from '../../App';
import { api } from '../services/api';
import { wsService, WSMessage } from '../services/websocket';
import { useUserStore } from '../stores/userStore';
import CompatibilityMeter from '../components/CompatibilityMeter';
import ChatBubble from '../components/ChatBubble';

type BlindChatNavigationProp = NativeStackNavigationProp<RootStackParamList, 'BlindChat'>;
type BlindChatRouteProp = RouteProp<RootStackParamList, 'BlindChat'>;

interface Message {
  id: string;
  sender_id: string;
  content: string;
  created_at: string;
  is_mine: boolean;
}

export default function BlindChatScreen() {
  const navigation = useNavigation<BlindChatNavigationProp>();
  const route = useRoute<BlindChatRouteProp>();
  const { matchId } = route.params;
  const userId = useUserStore((state) => state.userId);

  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [compatibility, setCompatibility] = useState(0);
  const [partnerPseudonym, setPartnerPseudonym] = useState('Mystery Person');
  const [aiSuggestion, setAiSuggestion] = useState<string | null>(null);
  const [showSuggestion, setShowSuggestion] = useState(false);

  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    loadChat();
    setupWebSocket();

    return () => {
      wsService.disconnect();
    };
  }, [matchId]);

  const loadChat = async () => {
    const { data, error } = await api.getChat(matchId);
    setLoading(false);

    if (data) {
      setMessages(data.messages);
      setCompatibility(data.match.current_compatibility);
      setPartnerPseudonym(data.match.partner_pseudonym);
      if (data.ai_suggestion) {
        setAiSuggestion(data.ai_suggestion);
      }

      // Check if already revealed
      if (data.match.status === 'revealed') {
        navigation.replace('ProfileReveal', { matchId });
      }
    }
  };

  const setupWebSocket = () => {
    wsService.connect(matchId);

    wsService.on('message', handleNewMessage);
    wsService.on('compatibility_update', handleCompatibilityUpdate);
  };

  const handleNewMessage = useCallback((msg: WSMessage) => {
    const newMessage = msg.data as Message;
    if (newMessage.sender_id !== userId) {
      setMessages((prev) => [...prev, { ...newMessage, is_mine: false }]);
    }
  }, [userId]);

  const handleCompatibilityUpdate = useCallback((msg: WSMessage) => {
    setCompatibility(msg.data.score);
    if (msg.data.reveal_triggered) {
      // Navigate to reveal screen
      setTimeout(() => {
        navigation.replace('ProfileReveal', { matchId });
      }, 1500);
    }
  }, [matchId, navigation]);

  const sendMessage = async () => {
    if (!inputText.trim() || sending) return;

    const content = inputText.trim();
    setInputText('');
    setSending(true);

    // Optimistic update
    const tempMessage: Message = {
      id: `temp-${Date.now()}`,
      sender_id: userId!,
      content,
      created_at: new Date().toISOString(),
      is_mine: true,
    };
    setMessages((prev) => [...prev, tempMessage]);

    const { data, error } = await api.sendMessage(matchId, content);
    setSending(false);

    if (data) {
      // Replace temp message with real one
      setMessages((prev) =>
        prev.map((m) => (m.id === tempMessage.id ? { ...data, is_mine: true } : m))
      );
    }
  };

  const requestSuggestion = async () => {
    setShowSuggestion(true);
    const { data } = await api.getAISuggestion(matchId);
    if (data?.suggestion) {
      setAiSuggestion(data.suggestion);
    }
  };

  const useSuggestion = () => {
    if (aiSuggestion) {
      setInputText(aiSuggestion);
      setShowSuggestion(false);
      setAiSuggestion(null);
    }
  };

  if (loading) {
    return (
      <LinearGradient colors={['#0A0A0F', '#1A1A2E', '#0A0A0F']} style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#8B5CF6" />
          <Text style={styles.loadingText}>Loading chat...</Text>
        </View>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient colors={['#0A0A0F', '#1A1A2E', '#0A0A0F']} style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>?</Text>
            </View>
            <View>
              <Text style={styles.partnerName}>{partnerPseudonym}</Text>
              <Text style={styles.blindLabel}>Blind Chat</Text>
            </View>
          </View>
          <CompatibilityMeter score={compatibility} />
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
            renderItem={({ item }) => (
              <ChatBubble message={item} isMine={item.is_mine} />
            )}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.messagesList}
            onContentSizeChange={() => flatListRef.current?.scrollToEnd()}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <View style={styles.emptyChat}>
                <Text style={styles.emptyChatText}>
                  Say hi! Your match is waiting to hear from you.
                </Text>
              </View>
            }
          />

          {/* AI Suggestion */}
          {showSuggestion && aiSuggestion && (
            <View style={styles.suggestionCard}>
              <View style={styles.suggestionHeader}>
                <Text style={styles.suggestionLabel}>💡 AI Wingman suggests:</Text>
                <TouchableOpacity onPress={() => setShowSuggestion(false)}>
                  <Text style={styles.suggestionClose}>✕</Text>
                </TouchableOpacity>
              </View>
              <Text style={styles.suggestionText}>{aiSuggestion}</Text>
              <TouchableOpacity style={styles.useSuggestionButton} onPress={useSuggestion}>
                <Text style={styles.useSuggestionText}>Use this</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Input */}
          <View style={styles.inputContainer}>
            <TouchableOpacity style={styles.suggestionButton} onPress={requestSuggestion}>
              <Text style={styles.suggestionButtonText}>💡</Text>
            </TouchableOpacity>
            <TextInput
              style={styles.input}
              placeholder="Type a message..."
              placeholderTextColor="#666"
              value={inputText}
              onChangeText={setInputText}
              multiline
              maxLength={1000}
            />
            <TouchableOpacity
              style={[styles.sendButton, !inputText.trim() && styles.sendButtonDisabled]}
              onPress={sendMessage}
              disabled={!inputText.trim() || sending}
            >
              {sending ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.sendButtonText}>→</Text>
              )}
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
    gap: 16,
  },
  loadingText: {
    color: '#888',
    fontSize: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#2A2A3E',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#2A2A3E',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#8B5CF6',
  },
  avatarText: {
    fontSize: 24,
    color: '#8B5CF6',
  },
  partnerName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
  },
  blindLabel: {
    fontSize: 12,
    color: '#888',
    marginTop: 2,
  },
  chatContainer: {
    flex: 1,
  },
  messagesList: {
    paddingHorizontal: 16,
    paddingVertical: 20,
    flexGrow: 1,
  },
  emptyChat: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyChatText: {
    color: '#666',
    fontSize: 16,
    textAlign: 'center',
  },
  suggestionCard: {
    backgroundColor: '#1E1E2D',
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#8B5CF6',
  },
  suggestionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  suggestionLabel: {
    fontSize: 12,
    color: '#8B5CF6',
    fontWeight: '600',
  },
  suggestionClose: {
    color: '#666',
    fontSize: 16,
  },
  suggestionText: {
    color: '#fff',
    fontSize: 15,
    lineHeight: 22,
  },
  useSuggestionButton: {
    marginTop: 12,
    alignSelf: 'flex-end',
  },
  useSuggestionText: {
    color: '#8B5CF6',
    fontWeight: '600',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#2A2A3E',
    gap: 8,
  },
  suggestionButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#1E1E2D',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2A2A3E',
  },
  suggestionButtonText: {
    fontSize: 20,
  },
  input: {
    flex: 1,
    backgroundColor: '#1E1E2D',
    borderRadius: 24,
    paddingHorizontal: 20,
    paddingVertical: 12,
    fontSize: 16,
    color: '#fff',
    maxHeight: 120,
    borderWidth: 1,
    borderColor: '#2A2A3E',
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
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
