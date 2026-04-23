import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { MusicPlayerProvider } from './src/context/MusicPlayerContext';
import { AuthProvider } from './src/context/AuthContext';
import { AppNavigator } from './src/navigation/AppNavigator';
import { MiniPlayer } from './src/components/MiniPlayer';

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <MusicPlayerProvider>
          <NavigationContainer>
            <AppNavigator />
            <MiniPlayer />
          </NavigationContainer>
        </MusicPlayerProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
