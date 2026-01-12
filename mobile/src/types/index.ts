// User types
export type UserStatus = 'onboarding' | 'active' | 'paused' | 'in_chat';

export interface User {
  id: string;
  phone_number: string;
  status: UserStatus;
  created_at: string;
}

// Profile types
export interface Profile {
  id: string;
  user_id: string;
  display_name: string;
  pseudonym: string;
  age: number;
  location: string;
  photos: string[];
  bio: string;
  interests: string[];
  onboarding_completed: string | null;
}

export interface ProfileReveal {
  id: string;
  display_name: string;
  age: number;
  location: string;
  bio: string;
  photos: string[];
  compatibility_highlights: string[];
}

// Match types
export type MatchStatus = 'chatting' | 'revealed' | 'continued' | 'ended';
export type Decision = 'continue' | 'pass';

export interface Match {
  id: string;
  partner_pseudonym: string;
  initial_compatibility: number;
  current_compatibility: number;
  status: MatchStatus;
  created_at: string;
}

// Message types
export interface Message {
  id: string;
  sender_id: string;
  content: string;
  created_at: string;
  is_mine: boolean;
}

// Chat types
export interface ChatData {
  match: Match;
  messages: Message[];
  ai_suggestion?: string;
}

// Onboarding types
export interface OnboardingResponse {
  message: string;
  profile_complete: boolean;
  extracted_data?: {
    display_name?: string;
    age?: number;
    location?: string;
    personality?: Record<string, any>;
    values?: Record<string, any>;
    interests?: string[];
    dealbreakers?: string[];
    looking_for?: Record<string, any>;
    bio?: string;
  };
}

// API Response types
export interface ApiError {
  detail: string;
}

export interface TokenResponse {
  access_token: string;
  user_id: string;
  status: UserStatus;
}
