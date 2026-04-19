import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { HomeScreen } from '../screens/HomeScreen';
import { BollywoodScreen } from '../screens/BollywoodScreen';
import { HollywoodScreen } from '../screens/HollywoodScreen';
import { SouthIndianScreen } from '../screens/SouthIndianScreen';
import { DJMixScreen } from '../screens/DJMixScreen';
import { LibraryScreen } from '../screens/LibraryScreen';
import { PlayerScreen } from '../screens/PlayerScreen';
import { DJMixerScreen } from '../screens/DJMixerScreen';
import { KaraokeScreen } from '../screens/KaraokeScreen';
import { KaraokePlayerScreen } from '../screens/KaraokePlayerScreen';
import { colors } from '../constants/theme';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

const TabNavigator = () => {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.background,
          borderTopColor: colors.border,
          borderTopWidth: 1,
          height: 60,
          paddingBottom: 8,
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '600',
        },
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Bollywood"
        component={BollywoodScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="musical-notes" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Hollywood"
        component={HollywoodScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="globe" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="South"
        component={SouthIndianScreen}
        options={{
          tabBarLabel: 'South',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="disc" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="DJ Mix"
        component={DJMixScreen}
        options={{
          tabBarLabel: 'DJ',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="headset" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Karaoke"
        component={KaraokeScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="mic" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Library"
        component={LibraryScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="library" size={size} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
};

export const AppNavigator = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_bottom',
      }}
    >
      <Stack.Screen name="Main" component={TabNavigator} />
      <Stack.Screen
        name="DJMixer"
        component={DJMixerScreen}
        options={{
          presentation: 'fullScreenModal',
          animation: 'slide_from_bottom',
        }}
      />
      <Stack.Screen
        name="Player"
        component={PlayerScreen}
        options={{
          presentation: 'fullScreenModal',
          animation: 'slide_from_bottom',
        }}
      />
      <Stack.Screen
        name="KaraokePlayer"
        component={KaraokePlayerScreen}
        options={{
          presentation: 'fullScreenModal',
          animation: 'slide_from_bottom',
        }}
      />
    </Stack.Navigator>
  );
};
