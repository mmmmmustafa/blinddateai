/**
 * Mock API for UI development without backend
 */

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Mock conversation responses
const MOCK_AI_RESPONSES = [
  "Hey there! 👋 I'm your dating wingman. Instead of boring forms, let's just chat! So tell me - what's your name and what gets you excited to start your day?",
  "Nice to meet you! That sounds awesome. So what do you do for work? And more importantly, what do you do for fun when you're not working?",
  "A tech person who touches grass AND can cook? That's rare! 😄 What kind of cuisine do you like making? And when you're hiking, are you the 'reach the summit at sunrise' type or more 'casual trail with good views and snacks' vibe?",
  "Love it! You sound like someone who knows how to balance work and play. Now let's talk about what you're looking for. What's your ideal relationship like? Casual dating, something serious, or just seeing where things go?",
  "Got it! And what are some qualities you absolutely need in a partner? And on the flip side, any dealbreakers I should know about?",
  "Perfect, I'm getting a great picture of who you are! Just a couple more things - what age range are you looking for? And any preference on location?",
  "Awesome! I think I have everything I need. You sound like a genuine, interesting person - I'm excited to find your match! Your profile is now complete. Let me find someone special for you... ✨",
];

let conversationIndex = 0;

export const mockApi = {
  // Auth
  async sendOTP(phoneNumber: string) {
    await delay(800);
    return { data: { message: "OTP sent", debug_otp: "123456" } };
  },

  async verifyOTP(phoneNumber: string, otp: string) {
    await delay(1000);
    // Accept any OTP input for demo purposes
    if (otp && otp.length > 0) {
      return {
        data: {
          access_token: "mock-token-12345",
          user_id: "user-mock-id",
          status: "onboarding",
        },
      };
    }
    return { error: "Please enter an OTP" };
  },

  // Onboarding
  async sendOnboardingMessage(message: string) {
    await delay(1500);
    
    const isComplete = conversationIndex >= MOCK_AI_RESPONSES.length - 1;
    const response = MOCK_AI_RESPONSES[Math.min(conversationIndex, MOCK_AI_RESPONSES.length - 1)];
    conversationIndex++;

    return {
      data: {
        message: response,
        profile_complete: isComplete,
        extracted_data: isComplete ? {
          display_name: "Demo User",
          age: 28,
          location: "San Francisco",
          interests: ["hiking", "cooking", "technology"],
        } : null,
      },
    };
  },

  async getOnboardingProgress() {
    return {
      data: {
        progress: Math.min(conversationIndex * 15, 100),
        messages_count: conversationIndex * 2,
        completed: conversationIndex >= MOCK_AI_RESPONSES.length,
      },
    };
  },

  // Matching
  async findMatch() {
    await delay(3000);
    return {
      data: {
        message: "Match found!",
        match: {
          id: "match-mock-id",
          partner_pseudonym: "Sunset Wanderer",
          initial_compatibility: 0.58,
          current_compatibility: 0.58,
          status: "chatting",
          created_at: new Date().toISOString(),
        },
      },
    };
  },

  async getCurrentMatch() {
    return { error: "No active match" };
  },

  async getRevealedProfile(matchId: string) {
    await delay(1000);
    return {
      data: {
        id: "profile-mock-id",
        display_name: "Alex",
        age: 27,
        location: "San Francisco",
        bio: "Adventure seeker who loves trying new restaurants and weekend hikes. Looking for someone to explore the city with!",
        photos: [],
        compatibility_highlights: [
          "You both love hiking",
          "Strong values alignment",
          "Compatible sense of humor",
        ],
      },
    };
  },

  async submitDecision(matchId: string, decision: string) {
    await delay(1000);
    return {
      data: {
        message: "Decision recorded",
        your_decision: decision,
        waiting_for_partner: true,
        match_status: "revealed",
      },
    };
  },

  // Chat
  async getChat(matchId: string) {
    return {
      data: {
        match: {
          id: matchId,
          partner_pseudonym: "Sunset Wanderer",
          initial_compatibility: 0.58,
          current_compatibility: 0.65,
          status: "chatting",
          created_at: new Date().toISOString(),
        },
        messages: [
          {
            id: "msg-1",
            sender_id: "other-user",
            content: "Hey! Nice to match with you. I see we both love hiking - what's your favorite trail?",
            created_at: new Date(Date.now() - 300000).toISOString(),
            is_mine: false,
          },
        ],
        ai_suggestion: "They mentioned hiking! Share your favorite trail or ask about theirs.",
      },
    };
  },

  async sendMessage(matchId: string, content: string) {
    await delay(500);
    return {
      data: {
        id: `msg-${Date.now()}`,
        sender_id: "user-mock-id",
        content,
        created_at: new Date().toISOString(),
        is_mine: true,
      },
    };
  },

  async getAISuggestion(matchId: string) {
    await delay(800);
    const suggestions = [
      "Ask about their favorite weekend activity!",
      "You both seem to enjoy the outdoors - maybe ask about a memorable trip?",
      "Try sharing something personal about yourself to deepen the connection.",
      "Ask what they're looking for in a relationship.",
    ];
    return {
      data: {
        suggestion: suggestions[Math.floor(Math.random() * suggestions.length)],
      },
    };
  },

  // Reset for demo
  reset() {
    conversationIndex = 0;
  },
};
