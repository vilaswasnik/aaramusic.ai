import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  FlatList,
  Image,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useMusicPlayer } from '../context/MusicPlayerContext';
import { SongListItem } from '../components/SongListItem';
import { colors, spacing, borderRadius } from '../constants/theme';
import { Song } from '../types';
import {
  getMoods,
  fetchMoodSongs,
  parseIntent,
  fetchSimilarSongs,
  getSmartRecommendations,
  generateDailyMixes,
  Mood,
  DailyMix,
} from '../services/aiService';
import { searchSongs, fetchTopSongs } from '../services/musicService';

const { width } = Dimensions.get('window');

interface ChatMessage {
  id: string;
  text: string;
  isUser: boolean;
  songs?: Song[];
  timestamp: Date;
}

export const AIScreen: React.FC = () => {
  const { playerState, playSong, listeningHistory } = useMusicPlayer();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'chat' | 'moods' | 'mixes'>('chat');
  const [moodSongs, setMoodSongs] = useState<Song[]>([]);
  const [activeMood, setActiveMood] = useState<Mood | null>(null);
  const [moodLoading, setMoodLoading] = useState(false);
  const [dailyMixes, setDailyMixes] = useState<DailyMix[]>([]);
  const [mixesLoading, setMixesLoading] = useState(false);
  const [recommendations, setRecommendations] = useState<{ title: string; songs: Song[] }[]>([]);
  const [recsLoading, setRecsLoading] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  const moods = getMoods();

  useEffect(() => {
    // Welcome message
    setMessages([
      {
        id: '0',
        text: "Hey! I'm Aara AI 🎵\n\nI can help you discover music based on your mood, find similar songs, or recommend tracks.\n\nTry saying:\n• \"Play something happy\"\n• \"I'm feeling sad\"\n• \"Recommend workout music\"\n• \"Find songs like Shape of You\"",
        isUser: false,
        timestamp: new Date(),
      },
    ]);
  }, []);

  useEffect(() => {
    if (activeTab === 'mixes' && dailyMixes.length === 0) {
      loadDailyMixes();
    }
  }, [activeTab]);

  const loadDailyMixes = async () => {
    setMixesLoading(true);
    const history = listeningHistory.length > 0 ? listeningHistory : (playerState.queue || []);
    const [mixes, recs] = await Promise.all([
      generateDailyMixes(history),
      getSmartRecommendations(history),
    ]);
    setDailyMixes(mixes);
    setRecommendations(recs);
    setMixesLoading(false);
  };

  const handleSend = async (overrideText?: string) => {
    const text = (typeof overrideText === 'string' ? overrideText : inputText).trim();
    if (!text || loading) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      text,
      isUser: true,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInputText('');
    setLoading(true);

    try {
      const intent = parseIntent(text);

      const aiMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        text: intent.message,
        isUser: false,
        timestamp: new Date(),
      };

      let songs: Song[] = [];

      switch (intent.type) {
        case 'mood':
          if (intent.mood) {
            songs = await fetchMoodSongs(intent.mood);
          }
          break;
        case 'search':
          if (intent.query === '__trending__') {
            songs = await fetchTopSongs(25);
          } else if (intent.query) {
            songs = await searchSongs(intent.query);
          }
          break;
        case 'radio':
          if (intent.query) {
            const searchResults = await searchSongs(intent.query);
            if (searchResults.length > 0) {
              songs = await fetchSimilarSongs(searchResults[0]);
              songs = [searchResults[0], ...songs];
            }
          }
          break;
        case 'recommendation':
          const history = listeningHistory.length > 0 ? listeningHistory : (playerState.queue || []);
          if (intent.query) {
            songs = await searchSongs(intent.query);
          } else if (history.length > 0) {
            songs = await fetchSimilarSongs(history[history.length - 1]);
          } else {
            songs = await searchSongs('top hits 2025');
          }
          break;
        case 'greeting':
          // No songs, just the message
          break;
        default:
          songs = await searchSongs(text);
          break;
      }

      aiMsg.songs = songs.length > 0 ? songs : undefined;
      if (songs.length === 0 && intent.type !== 'greeting') {
        aiMsg.text += "\n\nI couldn't find matching songs. Try a different description!";
      } else if (songs.length > 0) {
        aiMsg.text += `\n\nFound ${songs.length} tracks for you! 🎶`;
      }

      setMessages((prev) => [...prev, aiMsg]);
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          text: "Oops! Something went wrong. Let me try again in a moment.",
          isUser: false,
          timestamp: new Date(),
        },
      ]);
    }

    setLoading(false);
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 200);
  };

  const handleMoodSelect = async (mood: Mood) => {
    setActiveMood(mood);
    setMoodLoading(true);
    const songs = await fetchMoodSongs(mood);
    setMoodSongs(songs);
    setMoodLoading(false);
  };

  const handlePlayMix = (mix: DailyMix) => {
    if (mix.songs.length > 0) {
      playSong(mix.songs[0], mix.songs);
    }
  };

  const renderChatTab = () => (
    <KeyboardAvoidingView
      style={styles.chatContainer}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={100}
    >
      <ScrollView
        ref={scrollRef}
        style={styles.messagesContainer}
        contentContainerStyle={styles.messagesContent}
        onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
      >
        {messages.map((msg) => (
          <View
            key={msg.id}
            style={[
              styles.messageBubble,
              msg.isUser ? styles.userBubble : styles.aiBubble,
            ]}
          >
            {!msg.isUser && (
              <View style={styles.aiAvatar}>
                <LinearGradient
                  colors={['#FF1744', '#D500F9']}
                  style={styles.avatarGradient}
                >
                  <Ionicons name="sparkles" size={14} color="#fff" />
                </LinearGradient>
              </View>
            )}
            <View style={[styles.messageContent, msg.isUser ? styles.userContent : styles.aiContent]}>
              <Text style={[styles.messageText, msg.isUser && styles.userMessageText]}>
                {msg.text}
              </Text>
              {msg.songs && msg.songs.length > 0 && (
                <View style={styles.songResults}>
                  {msg.songs.slice(0, 8).map((song) => (
                    <TouchableOpacity
                      key={song.id}
                      style={styles.chatSongItem}
                      onPress={() => playSong(song, msg.songs!)}
                    >
                      <Image source={{ uri: song.coverArt }} style={styles.chatSongArt} />
                      <View style={styles.chatSongInfo}>
                        <Text style={styles.chatSongTitle} numberOfLines={1}>{song.title}</Text>
                        <Text style={styles.chatSongArtist} numberOfLines={1}>{song.artist}</Text>
                      </View>
                      <Ionicons name="play-circle" size={28} color={colors.primary} />
                    </TouchableOpacity>
                  ))}
                  {msg.songs.length > 8 && (
                    <TouchableOpacity
                      style={styles.playAllBtn}
                      onPress={() => playSong(msg.songs![0], msg.songs!)}
                    >
                      <Ionicons name="play" size={16} color="#fff" />
                      <Text style={styles.playAllText}>Play All {msg.songs.length} Songs</Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}
            </View>
          </View>
        ))}
        {loading && (
          <View style={[styles.messageBubble, styles.aiBubble]}>
            <View style={styles.aiAvatar}>
              <LinearGradient colors={['#FF1744', '#D500F9']} style={styles.avatarGradient}>
                <Ionicons name="sparkles" size={14} color="#fff" />
              </LinearGradient>
            </View>
            <View style={[styles.messageContent, styles.aiContent]}>
              <ActivityIndicator size="small" color={colors.primary} />
              <Text style={styles.thinkingText}>Aara AI is thinking...</Text>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Quick Suggestions */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.suggestions}>
        {['Play something happy', 'Chill vibes', 'Workout music', 'Bollywood hits', 'Sad songs'].map((s) => (
          <TouchableOpacity
            key={s}
            style={styles.suggestionChip}
            onPress={() => handleSend(s)}
          >
            <Text style={styles.suggestionText}>{s}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Input */}
      <View style={[styles.inputContainer, playerState.currentSong ? styles.inputWithPlayer : null]}>
        <TextInput
          style={styles.input}
          placeholder="Ask Aara AI for music..."
          placeholderTextColor={colors.textSecondary}
          value={inputText}
          onChangeText={setInputText}
          onSubmitEditing={() => handleSend()}
          returnKeyType="send"
        />
        <TouchableOpacity
          style={[styles.sendButton, (!inputText.trim() || loading) && styles.sendButtonDisabled]}
          onPress={() => handleSend()}
          disabled={!inputText.trim() || loading}
        >
          <Ionicons name="send" size={20} color="#fff" />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );

  const renderMoodsTab = () => (
    <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
      <Text style={styles.sectionTitle}>How are you feeling?</Text>
      <Text style={styles.sectionSub}>Select a mood and let AI curate the perfect playlist</Text>

      <View style={styles.moodGrid}>
        {moods.map((mood) => (
          <TouchableOpacity
            key={mood.key}
            style={[
              styles.moodCard,
              { borderColor: mood.color },
              activeMood === mood.key && { backgroundColor: mood.color + '30' },
            ]}
            onPress={() => handleMoodSelect(mood.key)}
          >
            <Text style={styles.moodEmoji}>{mood.emoji}</Text>
            <Text style={styles.moodLabel}>{mood.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {moodLoading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>AI is curating your playlist...</Text>
        </View>
      )}

      {activeMood && moodSongs.length > 0 && !moodLoading && (
        <View style={styles.moodResults}>
          <View style={styles.moodResultsHeader}>
            <Text style={styles.moodResultsTitle}>
              {moods.find((m) => m.key === activeMood)?.emoji}{' '}
              {moods.find((m) => m.key === activeMood)?.label} Playlist
            </Text>
            <TouchableOpacity
              style={styles.playAllBtn}
              onPress={() => playSong(moodSongs[0], moodSongs)}
            >
              <Ionicons name="play" size={16} color="#fff" />
              <Text style={styles.playAllText}>Play All</Text>
            </TouchableOpacity>
          </View>
          {moodSongs.map((song) => (
            <SongListItem key={song.id} song={song} onPress={() => playSong(song, moodSongs)} />
          ))}
        </View>
      )}
    </ScrollView>
  );

  const renderMixesTab = () => (
    <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
      {mixesLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>AI is generating your daily mixes...</Text>
        </View>
      ) : (
        <>
          {/* Daily Mixes */}
          <Text style={styles.sectionTitle}>Your AI Daily Mixes</Text>
          <Text style={styles.sectionSub}>Personalized playlists generated just for you</Text>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.mixesRow}>
            {dailyMixes.map((mix) => (
              <TouchableOpacity
                key={mix.id}
                style={styles.mixCard}
                onPress={() => handlePlayMix(mix)}
              >
                <LinearGradient
                  colors={[mix.color, mix.color + '80']}
                  style={styles.mixGradient}
                >
                  <Ionicons name="sparkles" size={24} color="#fff" />
                  <Text style={styles.mixTitle}>{mix.title}</Text>
                  <Text style={styles.mixSubtitle}>{mix.subtitle}</Text>
                  <Text style={styles.mixCount}>{mix.songs.length} songs</Text>
                </LinearGradient>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Smart Recommendations */}
          {recommendations.map((rec, index) => (
            <View key={index} style={styles.recSection}>
              <Text style={styles.recTitle}>{rec.title}</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {rec.songs.map((song) => (
                  <TouchableOpacity
                    key={song.id}
                    style={styles.recSongCard}
                    onPress={() => playSong(song, rec.songs)}
                  >
                    <Image source={{ uri: song.coverArt }} style={styles.recSongArt} />
                    <Text style={styles.recSongTitle} numberOfLines={1}>{song.title}</Text>
                    <Text style={styles.recSongArtist} numberOfLines={1}>{song.artist}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          ))}

          {dailyMixes.length === 0 && recommendations.length === 0 && (
            <View style={styles.emptyMixes}>
              <Ionicons name="sparkles" size={48} color={colors.textSecondary} />
              <Text style={styles.emptyMixesText}>
                Start listening to music and AI will learn your taste to create personalized mixes!
              </Text>
            </View>
          )}
        </>
      )}
    </ScrollView>
  );

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      {/* Header */}
      <LinearGradient colors={['#D500F9', '#6200EA', colors.background]} style={styles.header}>
        <View style={styles.headerContent}>
          <View>
            <View style={styles.aiLabel}>
              <Ionicons name="sparkles" size={16} color="#FFD700" />
              <Text style={styles.aiLabelText}>Powered by AI</Text>
            </View>
            <Text style={styles.headerTitle}>Aara AI</Text>
            <Text style={styles.headerSub}>Your intelligent music companion</Text>
          </View>
        </View>
      </LinearGradient>

      {/* Tab Switcher */}
      <View style={styles.tabBar}>
        {[
          { key: 'chat' as const, label: 'AI Chat', icon: 'chatbubbles' as const },
          { key: 'moods' as const, label: 'Mood Mix', icon: 'heart' as const },
          { key: 'mixes' as const, label: 'For You', icon: 'sparkles' as const },
        ].map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tab, activeTab === tab.key && styles.activeTab]}
            onPress={() => setActiveTab(tab.key)}
          >
            <Ionicons
              name={tab.icon}
              size={18}
              color={activeTab === tab.key ? colors.primary : colors.textSecondary}
            />
            <Text
              style={[styles.tabText, activeTab === tab.key && styles.activeTabText]}
            >
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Tab Content */}
      {activeTab === 'chat' && renderChatTab()}
      {activeTab === 'moods' && renderMoodsTab()}
      {activeTab === 'mixes' && renderMixesTab()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: spacing.lg,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  aiLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  aiLabelText: {
    color: '#FFD700',
    fontSize: 12,
    fontWeight: '600',
  },
  headerTitle: {
    color: colors.text,
    fontSize: 28,
    fontWeight: 'bold',
  },
  headerSub: {
    color: colors.textSecondary,
    fontSize: 14,
    marginTop: 2,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    marginHorizontal: spacing.md,
    borderRadius: borderRadius.lg,
    padding: 4,
    marginBottom: spacing.sm,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: borderRadius.md,
    gap: 4,
  },
  activeTab: {
    backgroundColor: colors.background,
  },
  tabText: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
  activeTabText: {
    color: colors.primary,
  },
  // Chat
  chatContainer: {
    flex: 1,
  },
  messagesContainer: {
    flex: 1,
  },
  messagesContent: {
    padding: spacing.md,
    paddingBottom: 80,
  },
  messageBubble: {
    flexDirection: 'row',
    marginBottom: spacing.md,
    maxWidth: '90%',
  },
  userBubble: {
    alignSelf: 'flex-end',
    flexDirection: 'row-reverse',
  },
  aiBubble: {
    alignSelf: 'flex-start',
  },
  aiAvatar: {
    marginRight: 8,
    marginTop: 4,
  },
  avatarGradient: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  messageContent: {
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    maxWidth: '85%',
  },
  userContent: {
    backgroundColor: colors.primary,
  },
  aiContent: {
    backgroundColor: colors.card,
  },
  messageText: {
    color: colors.text,
    fontSize: 14,
    lineHeight: 20,
  },
  userMessageText: {
    color: '#fff',
  },
  songResults: {
    marginTop: spacing.sm,
  },
  chatSongItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    borderRadius: borderRadius.md,
    backgroundColor: 'rgba(255,255,255,0.05)',
    marginTop: 6,
  },
  chatSongArt: {
    width: 40,
    height: 40,
    borderRadius: 6,
  },
  chatSongInfo: {
    flex: 1,
    marginLeft: 10,
  },
  chatSongTitle: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '600',
  },
  chatSongArtist: {
    color: colors.textSecondary,
    fontSize: 11,
    marginTop: 1,
  },
  thinkingText: {
    color: colors.textSecondary,
    fontSize: 13,
    marginTop: 6,
  },
  suggestions: {
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    maxHeight: 50,
  },
  suggestionChip: {
    backgroundColor: colors.card,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  suggestionText: {
    color: colors.text,
    fontSize: 12,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    paddingBottom: spacing.lg,
    backgroundColor: colors.background,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  inputWithPlayer: {
    paddingBottom: 80,
  },
  input: {
    flex: 1,
    backgroundColor: colors.card,
    color: colors.text,
    borderRadius: 24,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    fontSize: 14,
    marginRight: spacing.sm,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
  playAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
    alignSelf: 'flex-start',
    marginTop: 8,
  },
  playAllText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  // Moods
  tabContent: {
    flex: 1,
    paddingHorizontal: spacing.md,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 22,
    fontWeight: 'bold',
    marginTop: spacing.md,
  },
  sectionSub: {
    color: colors.textSecondary,
    fontSize: 13,
    marginTop: 4,
    marginBottom: spacing.md,
  },
  moodGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  moodCard: {
    width: (width - spacing.md * 2 - 40) / 5,
    aspectRatio: 0.9,
    borderRadius: borderRadius.lg,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.card,
  },
  moodEmoji: {
    fontSize: 28,
    marginBottom: 4,
  },
  moodLabel: {
    color: colors.text,
    fontSize: 11,
    fontWeight: '600',
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    color: colors.textSecondary,
    fontSize: 14,
    marginTop: spacing.md,
  },
  moodResults: {
    marginTop: spacing.lg,
  },
  moodResultsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  moodResultsTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: 'bold',
  },
  // Mixes
  mixesRow: {
    marginBottom: spacing.lg,
  },
  mixCard: {
    width: 160,
    height: 180,
    marginRight: 12,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
  },
  mixGradient: {
    flex: 1,
    padding: spacing.md,
    justifyContent: 'flex-end',
  },
  mixTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 8,
  },
  mixSubtitle: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 12,
    marginTop: 2,
  },
  mixCount: {
    color: 'rgba(255,255,255,0.65)',
    fontSize: 11,
    marginTop: 4,
  },
  recSection: {
    marginBottom: spacing.lg,
  },
  recTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: spacing.sm,
  },
  recSongCard: {
    width: 130,
    marginRight: 12,
  },
  recSongArt: {
    width: 130,
    height: 130,
    borderRadius: borderRadius.md,
    marginBottom: 6,
  },
  recSongTitle: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '600',
  },
  recSongArtist: {
    color: colors.textSecondary,
    fontSize: 11,
  },
  emptyMixes: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyMixesText: {
    color: colors.textSecondary,
    fontSize: 14,
    textAlign: 'center',
    marginTop: spacing.md,
    paddingHorizontal: spacing.xl,
    lineHeight: 20,
  },
});
