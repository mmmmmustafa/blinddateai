// API Configuration
// Update these values for your environment

// For local development with Expo
// - iOS Simulator: use localhost
// - Android Emulator: use 10.0.2.2
// - Physical device: use your computer's IP address

export const config = {
  // Backend API URL
  API_URL: __DEV__ 
    ? 'http://localhost:8000/api'  // Development
    : 'https://api.blinddate.app/api',  // Production

  // WebSocket URL
  WS_URL: __DEV__
    ? 'ws://localhost:8000/api'  // Development  
    : 'wss://api.blinddate.app/api',  // Production

  // Feature flags
  features: {
    aiSuggestions: true,
    realTimeUpdates: true,
  },

  // Thresholds
  thresholds: {
    compatibilityReveal: 0.80,  // 80%
    minMatchScore: 0.50,  // 50%
  },
};

// Helper to get the right localhost for Android emulator
export const getApiUrl = () => {
  // Note: For Android emulator, you may need to use 10.0.2.2 instead of localhost
  // You can detect this with Platform.OS === 'android'
  return config.API_URL;
};

export const getWsUrl = () => {
  return config.WS_URL;
};
