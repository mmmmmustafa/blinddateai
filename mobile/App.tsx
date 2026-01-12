import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import AuthScreen from './src/screens/AuthScreen';
import OnboardingChatScreen from './src/screens/OnboardingChatScreen';
import WaitingScreen from './src/screens/WaitingScreen';
import BlindChatScreen from './src/screens/BlindChatScreen';
import ProfileRevealScreen from './src/screens/ProfileRevealScreen';
import { useUserStore } from './src/stores/userStore';

export type RootStackParamList = {
  Auth: undefined;
  OnboardingChat: undefined;
  Waiting: undefined;
  BlindChat: { matchId: string };
  ProfileReveal: { matchId: string };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function App() {
  const { token, status } = useUserStore();

  const getInitialRoute = (): keyof RootStackParamList => {
    if (!token) return 'Auth';
    if (status === 'onboarding') return 'OnboardingChat';
    if (status === 'active') return 'Waiting';
    if (status === 'in_chat') return 'Waiting'; // Will redirect to chat
    return 'Auth';
  };

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <NavigationContainer>
          <StatusBar style="light" />
          <Stack.Navigator
            initialRouteName={getInitialRoute()}
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: '#0A0A0F' },
              animation: 'slide_from_right',
            }}
          >
            <Stack.Screen name="Auth" component={AuthScreen} />
            <Stack.Screen name="OnboardingChat" component={OnboardingChatScreen} />
            <Stack.Screen name="Waiting" component={WaitingScreen} />
            <Stack.Screen name="BlindChat" component={BlindChatScreen} />
            <Stack.Screen name="ProfileReveal" component={ProfileRevealScreen} />
          </Stack.Navigator>
        </NavigationContainer>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
