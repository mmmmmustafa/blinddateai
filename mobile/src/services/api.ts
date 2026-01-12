import { useUserStore } from '../stores/userStore';
import { getApiUrl } from '../config';
import { mockApi } from './mockApi';

const API_BASE_URL = getApiUrl();

// Set to true to use mock API (no backend needed)
const USE_MOCK_API = true;

interface ApiResponse<T = any> {
  data?: T;
  error?: string;
}

class ApiService {
  private getToken(): string | null {
    return useUserStore.getState().token;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const token = this.getToken();
    
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    };

    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        ...options,
        headers,
      });

      const data = await response.json();

      if (!response.ok) {
        return { error: data.detail || 'Something went wrong' };
      }

      return { data };
    } catch (error) {
      console.error('API Error:', error);
      return { error: 'Network error. Please try again.' };
    }
  }

  // Auth
  async sendOTP(phoneNumber: string) {
    if (USE_MOCK_API) return mockApi.sendOTP(phoneNumber);
    return this.request('/auth/send-otp', {
      method: 'POST',
      body: JSON.stringify({ phone_number: phoneNumber }),
    });
  }

  async verifyOTP(phoneNumber: string, otp: string) {
    if (USE_MOCK_API) return mockApi.verifyOTP(phoneNumber, otp);
    return this.request<{
      access_token: string;
      user_id: string;
      status: string;
    }>('/auth/verify-otp', {
      method: 'POST',
      body: JSON.stringify({ phone_number: phoneNumber, otp }),
    });
  }

  // Onboarding
  async sendOnboardingMessage(message: string) {
    if (USE_MOCK_API) return mockApi.sendOnboardingMessage(message);
    return this.request<{
      message: string;
      profile_complete: boolean;
      extracted_data?: any;
    }>('/onboarding/chat', {
      method: 'POST',
      body: JSON.stringify({ message }),
    });
  }

  async getOnboardingProgress() {
    if (USE_MOCK_API) return mockApi.getOnboardingProgress();
    return this.request<{
      progress: number;
      messages_count: number;
      completed: boolean;
    }>('/onboarding/progress');
  }

  // Matching
  async findMatch() {
    if (USE_MOCK_API) return mockApi.findMatch();
    return this.request<{
      message: string;
      match?: {
        id: string;
        partner_pseudonym: string;
        initial_compatibility: number;
        current_compatibility: number;
        status: string;
      };
    }>('/matching/find', { method: 'POST' });
  }

  async getCurrentMatch() {
    if (USE_MOCK_API) return mockApi.getCurrentMatch();
    return this.request<{
      id: string;
      partner_pseudonym: string;
      initial_compatibility: number;
      current_compatibility: number;
      status: string;
    }>('/matching/current');
  }

  async getRevealedProfile(matchId: string) {
    if (USE_MOCK_API) return mockApi.getRevealedProfile(matchId);
    return this.request<{
      id: string;
      display_name: string;
      age: number;
      location: string;
      bio: string;
      photos: string[];
      compatibility_highlights: string[];
    }>(`/matching/reveal/${matchId}`);
  }

  async submitDecision(matchId: string, decision: 'continue' | 'pass') {
    if (USE_MOCK_API) return mockApi.submitDecision(matchId, decision);
    return this.request(`/matching/${matchId}/decision`, {
      method: 'POST',
      body: JSON.stringify({ decision }),
    });
  }

  // Chat
  async getChat(matchId: string) {
    if (USE_MOCK_API) return mockApi.getChat(matchId);
    return this.request<{
      match: {
        id: string;
        partner_pseudonym: string;
        current_compatibility: number;
        status: string;
      };
      messages: Array<{
        id: string;
        sender_id: string;
        content: string;
        created_at: string;
        is_mine: boolean;
      }>;
      ai_suggestion?: string;
    }>(`/chat/${matchId}`);
  }

  async sendMessage(matchId: string, content: string) {
    if (USE_MOCK_API) return mockApi.sendMessage(matchId, content);
    return this.request<{
      id: string;
      sender_id: string;
      content: string;
      created_at: string;
      is_mine: boolean;
    }>(`/chat/${matchId}/send`, {
      method: 'POST',
      body: JSON.stringify({ content }),
    });
  }

  async getAISuggestion(matchId: string) {
    if (USE_MOCK_API) return mockApi.getAISuggestion(matchId);
    return this.request<{ suggestion: string }>(`/chat/${matchId}/suggestion`);
  }
}

export const api = new ApiService();
