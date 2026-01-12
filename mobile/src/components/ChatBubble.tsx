import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface Message {
  id: string;
  sender_id: string;
  content: string;
  created_at: string;
  is_mine: boolean;
}

interface ChatBubbleProps {
  message: Message;
  isMine: boolean;
}

export default function ChatBubble({ message, isMine }: ChatBubbleProps) {
  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <View style={[styles.container, isMine ? styles.containerMine : styles.containerTheirs]}>
      <View style={[styles.bubble, isMine ? styles.bubbleMine : styles.bubbleTheirs]}>
        <Text style={[styles.content, isMine ? styles.contentMine : styles.contentTheirs]}>
          {message.content}
        </Text>
        <Text style={[styles.time, isMine ? styles.timeMine : styles.timeTheirs]}>
          {formatTime(message.created_at)}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 8,
    maxWidth: '80%',
  },
  containerMine: {
    alignSelf: 'flex-end',
  },
  containerTheirs: {
    alignSelf: 'flex-start',
  },
  bubble: {
    padding: 14,
    borderRadius: 20,
  },
  bubbleMine: {
    backgroundColor: '#8B5CF6',
    borderBottomRightRadius: 4,
  },
  bubbleTheirs: {
    backgroundColor: '#1E1E2D',
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: '#2A2A3E',
  },
  content: {
    fontSize: 16,
    lineHeight: 22,
  },
  contentMine: {
    color: '#fff',
  },
  contentTheirs: {
    color: '#fff',
  },
  time: {
    fontSize: 11,
    marginTop: 6,
  },
  timeMine: {
    color: 'rgba(255,255,255,0.6)',
    textAlign: 'right',
  },
  timeTheirs: {
    color: '#666',
  },
});
