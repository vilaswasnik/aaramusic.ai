# 🎵 Aara Music

A modern, feature-rich music streaming application built with React Native (Expo) for iOS and Android. Inspired by the design and functionality of Apple Music and YouTube Music.

## ✨ Features

- 🎨 **Modern UI/UX** - Beautiful, intuitive interface with smooth animations
- 🎵 **Music Playback** - Full-featured audio player with queue management
- 🔍 **Search** - Search for songs, artists, and albums
- 📚 **Library** - Organize your music with playlists and favorites
- 🎯 **Navigation** - Seamless bottom tab navigation
- 🌙 **Dark Theme** - Eye-friendly dark mode design
- 📱 **Cross-Platform** - Works on both iOS and Android

## 🚀 Quick Start

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- Expo Go app on your mobile device (for testing)

### Installation

1. Clone the repository:
```bash
git clone https://github.com/vilaswasnik/aaramusic.ai.git
cd aaramusic.ai
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm start
```

4. Scan the QR code with:
   - **iOS**: Camera app
   - **Android**: Expo Go app

## 📱 Available Scripts

- `npm start` - Start the Expo development server
- `npm run android` - Run on Android device/emulator
- `npm run ios` - Run on iOS simulator (macOS only)
- `npm run web` - Run in web browser

## 🏗️ Project Structure

```
aaramusic.ai/
├── App.tsx                 # Main app entry point
├── src/
│   ├── components/         # Reusable UI components
│   │   ├── SongCard.tsx
│   │   ├── SongListItem.tsx
│   │   └── MiniPlayer.tsx
│   ├── screens/           # App screens
│   │   ├── HomeScreen.tsx
│   │   ├── SearchScreen.tsx
│   │   ├── LibraryScreen.tsx
│   │   └── PlayerScreen.tsx
│   ├── navigation/        # Navigation configuration
│   │   └── AppNavigator.tsx
│   ├── context/          # React Context (state management)
│   │   └── MusicPlayerContext.tsx
│   ├── types/            # TypeScript type definitions
│   │   └── index.ts
│   ├── data/             # Mock data
│   │   └── mockData.ts
│   └── constants/        # App constants (theme, colors)
│       └── theme.ts
├── assets/               # Images, icons, and other assets
├── app.json             # Expo configuration
└── package.json         # Dependencies and scripts
```

## 🎨 Screens

### Home
- Recently played songs
- Featured playlists
- Personalized recommendations

### Search
- Search functionality for songs, artists, albums
- Browse by genre
- Quick results display

### Library
- View all playlists
- Access saved songs
- Organize albums and artists

### Player
- Full-screen music player
- Playback controls (play, pause, next, previous)
- Progress bar
- Shuffle and repeat modes
- Like and share options

## 🔧 Technology Stack

- **Framework**: React Native (Expo)
- **Language**: TypeScript
- **Navigation**: React Navigation (Bottom Tabs + Stack)
- **Audio**: Expo AV
- **State Management**: React Context API
- **UI Components**: React Native, Expo Vector Icons
- **Styling**: StyleSheet, Linear Gradient

## 📦 Key Dependencies

```json
{
  "@react-navigation/native": "Navigation library",
  "@react-navigation/bottom-tabs": "Bottom tab navigation",
  "@react-navigation/native-stack": "Stack navigation",
  "expo-av": "Audio/video playback",
  "expo-linear-gradient": "Gradient backgrounds",
  "@expo/vector-icons": "Icon library"
}
```

## 🚀 Building for Production

### iOS (Apple App Store)

1. Configure app.json with your bundle identifier
2. Build with EAS:
```bash
npm install -g eas-cli
eas build --platform ios
```

### Android (Google Play Store)

1. Configure app.json with your package name
2. Build with EAS:
```bash
npm install -g eas-cli
eas build --platform android
```

## 🔐 Firebase Integration (Optional)

To add backend functionality:

1. Create a Firebase project
2. Install Firebase:
```bash
npm install firebase
```
3. Add Firebase config to your app
4. Enable Authentication, Firestore, and Storage

## 🎯 Roadmap

- [ ] User authentication (Firebase)
- [ ] Cloud storage for songs
- [ ] Real-time playlist synchronization
- [ ] Social features (sharing, collaborative playlists)
- [ ] Offline playback
- [ ] Audio equalizer
- [ ] Lyrics display
- [ ] Music recommendations AI

## 📄 License

ISC

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📧 Support

For issues and questions, please open an issue on GitHub.

---

**Made with ❤️ using React Native & Expo**
