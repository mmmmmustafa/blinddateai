import { useUserStore } from '../stores/userStore';
import { getWsUrl } from '../config';

const WS_BASE_URL = getWsUrl();

export type WSMessageType = 'message' | 'typing' | 'compatibility_update' | 'reveal';

export interface WSMessage {
  type: WSMessageType;
  data: any;
}

type MessageHandler = (message: WSMessage) => void;

class WebSocketService {
  private socket: WebSocket | null = null;
  private handlers: Map<string, MessageHandler[]> = new Map();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private matchId: string | null = null;

  connect(matchId: string) {
    if (this.socket?.readyState === WebSocket.OPEN && this.matchId === matchId) {
      return;
    }

    this.matchId = matchId;
    this.disconnect();

    const token = useUserStore.getState().token;
    const url = `${WS_BASE_URL}/chat/ws/${matchId}?token=${token}`;

    this.socket = new WebSocket(url);

    this.socket.onopen = () => {
      console.log('WebSocket connected');
      this.reconnectAttempts = 0;
    };

    this.socket.onmessage = (event) => {
      try {
        const message: WSMessage = JSON.parse(event.data);
        this.emit(message.type, message);
      } catch (error) {
        console.error('Failed to parse WebSocket message:', error);
      }
    };

    this.socket.onclose = () => {
      console.log('WebSocket disconnected');
      this.attemptReconnect();
    };

    this.socket.onerror = (error) => {
      console.error('WebSocket error:', error);
    };
  }

  disconnect() {
    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }
    this.matchId = null;
  }

  private attemptReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts && this.matchId) {
      this.reconnectAttempts++;
      console.log(`Attempting reconnect ${this.reconnectAttempts}/${this.maxReconnectAttempts}`);
      setTimeout(() => {
        if (this.matchId) {
          this.connect(this.matchId);
        }
      }, 2000 * this.reconnectAttempts);
    }
  }

  on(type: WSMessageType, handler: MessageHandler) {
    if (!this.handlers.has(type)) {
      this.handlers.set(type, []);
    }
    this.handlers.get(type)!.push(handler);
  }

  off(type: WSMessageType, handler: MessageHandler) {
    const handlers = this.handlers.get(type);
    if (handlers) {
      const index = handlers.indexOf(handler);
      if (index > -1) {
        handlers.splice(index, 1);
      }
    }
  }

  private emit(type: WSMessageType, message: WSMessage) {
    const handlers = this.handlers.get(type);
    if (handlers) {
      handlers.forEach((handler) => handler(message));
    }
  }

  send(type: string, data: any) {
    if (this.socket?.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify({ type, data }));
    }
  }

  sendTyping() {
    this.send('typing', { typing: true });
  }
}

export const wsService = new WebSocketService();
