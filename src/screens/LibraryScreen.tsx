import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Image,
  TextInput,
  Alert,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { SongListItem } from '../components/SongListItem';
import { colors, spacing, typography, borderRadius } from '../constants/theme';
import { useMusicPlayer } from '../context/MusicPlayerContext';

type TabType = 'recent' | 'liked' | 'notes' | 'playlists' | 'artists';

interface Note {
  id: string;
  title: string;
  body: string;
  createdAt: number;
  color: string;
}

const NOTE_COLORS = ['#E91E63', '#9C27B0', '#3F51B5', '#009688', '#FF9800', '#607D8B'];

export const LibraryScreen: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('recent');
  const { playSong, listeningHistory, likedSongs } = useMusicPlayer();

  // Notes state
  const [notes, setNotes] = useState<Note[]>([]);
  const [noteTitle, setNoteTitle] = useState('');
  const [noteBody, setNoteBody] = useState('');
  const [editingNote, setEditingNote] = useState<string | null>(null);
  const [showNoteForm, setShowNoteForm] = useState(false);

  const tabs: { key: TabType; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
    { key: 'recent', label: 'Recent', icon: 'time-outline' },
    { key: 'liked', label: 'Liked', icon: 'heart' },
    { key: 'notes', label: 'Notes', icon: 'document-text-outline' },
    { key: 'playlists', label: 'Playlists', icon: 'list' },
    { key: 'artists', label: 'Artists', icon: 'person-outline' },
  ];

  const handlePlaylist = (playlistSongs: any[]) => {
    if (playlistSongs.length > 0) {
      playSong(playlistSongs[0], playlistSongs);
    }
  };

  const handleSaveNote = () => {
    const title = noteTitle.trim();
    const body = noteBody.trim();
    if (!title && !body) return;

    if (editingNote) {
      setNotes((prev) =>
        prev.map((n) => (n.id === editingNote ? { ...n, title: title || 'Untitled', body } : n))
      );
      setEditingNote(null);
    } else {
      const note: Note = {
        id: Date.now().toString(),
        title: title || 'Untitled',
        body,
        createdAt: Date.now(),
        color: NOTE_COLORS[notes.length % NOTE_COLORS.length],
      };
      setNotes((prev) => [note, ...prev]);
    }
    setNoteTitle('');
    setNoteBody('');
    setShowNoteForm(false);
  };

  const handleEditNote = (note: Note) => {
    setEditingNote(note.id);
    setNoteTitle(note.title);
    setNoteBody(note.body);
    setShowNoteForm(true);
  };

  const handleDeleteNote = (id: string) => {
    const doDelete = () => setNotes((prev) => prev.filter((n) => n.id !== id));
    if (Platform.OS === 'web') {
      if (window.confirm('Delete this note?')) doDelete();
    } else {
      Alert.alert('Delete Note', 'Are you sure?', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: doDelete },
      ]);
    }
  };

  const formatDate = (ts: number) => {
    const d = new Date(ts);
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Your Library</Text>
        <View style={styles.tabs}>
          {tabs.map((tab) => (
            <TouchableOpacity
              key={tab.key}
              style={[styles.tab, activeTab === tab.key && styles.activeTab]}
              onPress={() => setActiveTab(tab.key)}
            >
              <Ionicons
                name={tab.icon}
                size={14}
                color={activeTab === tab.key ? '#fff' : colors.textSecondary}
              />
              <Text
                style={[
                  styles.tabText,
                  activeTab === tab.key && styles.activeTabText,
                ]}
              >
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Liked Songs Summary Card (always visible at top) */}
        {likedSongs.length > 0 && activeTab !== 'liked' && (
          <TouchableOpacity
            style={styles.likedCard}
            onPress={() => setActiveTab('liked')}
          >
            <LinearGradient
              colors={['#7B1FA2', '#E91E63']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.likedGradient}
            >
              <Ionicons name="heart" size={24} color="#fff" />
              <View style={styles.likedInfo}>
                <Text style={styles.likedTitle}>Liked Songs</Text>
                <Text style={styles.likedCount}>{likedSongs.length} songs</Text>
              </View>
              <Ionicons name="play-circle" size={36} color="#fff" />
            </LinearGradient>
          </TouchableOpacity>
        )}

        {/* Recently Played */}
        {activeTab === 'recent' && (
          <View>
            {listeningHistory.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="time-outline" size={64} color={colors.textSecondary} />
                <Text style={styles.emptyText}>No recent plays</Text>
                <Text style={styles.emptySubtext}>Songs you play will appear here</Text>
              </View>
            ) : (
              <>
                <Text style={styles.subHeader}>
                  {listeningHistory.length} recently played
                </Text>
                {listeningHistory.map((song) => (
                  <SongListItem
                    key={song.id}
                    song={song}
                    onPress={() => playSong(song, listeningHistory)}
                  />
                ))}
              </>
            )}
          </View>
        )}

        {/* Liked Songs */}
        {activeTab === 'liked' && (
          <View>
            {likedSongs.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="heart-outline" size={64} color={colors.textSecondary} />
                <Text style={styles.emptyText}>No liked songs yet</Text>
                <Text style={styles.emptySubtext}>
                  Tap the heart icon on any song to add it here
                </Text>
              </View>
            ) : (
              <>
                <TouchableOpacity
                  style={styles.playAllBar}
                  onPress={() => playSong(likedSongs[0], likedSongs)}
                >
                  <Ionicons name="play" size={18} color="#fff" />
                  <Text style={styles.playAllText}>Play All ({likedSongs.length})</Text>
                </TouchableOpacity>
                {likedSongs.map((song) => (
                  <SongListItem
                    key={song.id}
                    song={song}
                    onPress={() => playSong(song, likedSongs)}
                  />
                ))}
              </>
            )}
          </View>
        )}

        {/* Playlists (AI-generated) */}
        {activeTab === 'playlists' && (
          <View>
            <View style={styles.emptyState}>
              <Ionicons name="sparkles" size={64} color="#FFD700" />
              <Text style={styles.emptyText}>AI Smart Playlists</Text>
              <Text style={styles.emptySubtext}>
                Keep listening and AI will auto-create personalized playlists for you.
                Check the AI tab for your Daily Mixes!
              </Text>
            </View>
          </View>
        )}

        {/* Artists */}
        {activeTab === 'artists' && (
          <View>
            {listeningHistory.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="person-outline" size={64} color={colors.textSecondary} />
                <Text style={styles.emptyText}>No artists yet</Text>
                <Text style={styles.emptySubtext}>Artists you listen to will appear here</Text>
              </View>
            ) : (
              <>
                <Text style={styles.subHeader}>Your Top Artists</Text>
                {(() => {
                  const artistMap: Record<string, { count: number; art: string }> = {};
                  listeningHistory.forEach((s) => {
                    if (!artistMap[s.artist]) artistMap[s.artist] = { count: 0, art: s.coverArt };
                    artistMap[s.artist].count++;
                  });
                  return Object.entries(artistMap)
                    .sort((a, b) => b[1].count - a[1].count)
                    .slice(0, 20)
                    .map(([artist, info]) => (
                      <TouchableOpacity key={artist} style={styles.artistItem}>
                        <Image source={{ uri: info.art }} style={styles.artistImage} />
                        <View style={styles.artistInfo}>
                          <Text style={styles.artistName}>{artist}</Text>
                          <Text style={styles.artistCount}>
                            {info.count} {info.count === 1 ? 'play' : 'plays'}
                          </Text>
                        </View>
                      </TouchableOpacity>
                    ));
                })()}
              </>
            )}
          </View>
        )}

        {/* Notes */}
        {activeTab === 'notes' && (
          <View>
            {/* Add / Edit Form */}
            {showNoteForm ? (
              <View style={styles.noteForm}>
                <TextInput
                  style={styles.noteTitleInput}
                  placeholder="Note title..."
                  placeholderTextColor={colors.textSecondary}
                  value={noteTitle}
                  onChangeText={setNoteTitle}
                  maxLength={100}
                />
                <TextInput
                  style={styles.noteBodyInput}
                  placeholder="Write your note... (lyrics, ideas, playlists)"
                  placeholderTextColor={colors.textSecondary}
                  value={noteBody}
                  onChangeText={setNoteBody}
                  multiline
                  textAlignVertical="top"
                />
                <View style={styles.noteFormActions}>
                  <TouchableOpacity
                    style={styles.noteCancelBtn}
                    onPress={() => { setShowNoteForm(false); setEditingNote(null); setNoteTitle(''); setNoteBody(''); }}
                  >
                    <Text style={styles.noteCancelText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.noteSaveBtn, (!noteTitle.trim() && !noteBody.trim()) && { opacity: 0.5 }]}
                    onPress={handleSaveNote}
                    disabled={!noteTitle.trim() && !noteBody.trim()}
                  >
                    <Ionicons name="checkmark" size={16} color="#fff" />
                    <Text style={styles.noteSaveText}>{editingNote ? 'Update' : 'Save'}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <TouchableOpacity
                style={styles.addNoteBtn}
                onPress={() => setShowNoteForm(true)}
              >
                <Ionicons name="add-circle" size={22} color={colors.primary} />
                <Text style={styles.addNoteText}>New Note</Text>
              </TouchableOpacity>
            )}

            {/* Notes List */}
            {notes.length === 0 && !showNoteForm ? (
              <View style={styles.emptyState}>
                <Ionicons name="document-text-outline" size={64} color={colors.textSecondary} />
                <Text style={styles.emptyText}>No notes yet</Text>
                <Text style={styles.emptySubtext}>
                  Jot down lyrics, song ideas, playlist plans, or anything music-related
                </Text>
              </View>
            ) : (
              <View style={styles.notesGrid}>
                {notes.map((note) => (
                  <TouchableOpacity
                    key={note.id}
                    style={[styles.noteCard, { borderLeftColor: note.color }]}
                    onPress={() => handleEditNote(note)}
                    onLongPress={() => handleDeleteNote(note.id)}
                  >
                    <Text style={styles.noteCardTitle} numberOfLines={1}>{note.title}</Text>
                    {note.body ? <Text style={styles.noteCardBody} numberOfLines={3}>{note.body}</Text> : null}
                    <View style={styles.noteCardFooter}>
                      <Text style={styles.noteCardDate}>{formatDate(note.createdAt)}</Text>
                      <TouchableOpacity onPress={() => handleDeleteNote(note.id)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                        <Ionicons name="trash-outline" size={14} color={colors.textSecondary} />
                      </TouchableOpacity>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        )}

        <View style={{ height: 140 }} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingTop: 60,
    paddingBottom: spacing.md,
    paddingHorizontal: spacing.md,
  },
  headerTitle: {
    ...typography.h1,
    color: colors.text,
    marginBottom: spacing.lg,
  },
  tabs: {
    flexDirection: 'row',
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    marginRight: spacing.sm,
    borderRadius: borderRadius.round,
    gap: 4,
  },
  activeTab: {
    backgroundColor: colors.primary,
  },
  tabText: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
  },
  activeTabText: {
    color: colors.text,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: spacing.sm,
  },
  subHeader: {
    color: colors.textSecondary,
    fontSize: 13,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.md,
  },
  likedCard: {
    marginHorizontal: spacing.md,
    marginBottom: spacing.lg,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
  },
  likedGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    gap: 12,
  },
  likedInfo: {
    flex: 1,
  },
  likedTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  likedCount: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 12,
    marginTop: 2,
  },
  playAllBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    marginHorizontal: spacing.md,
    marginBottom: spacing.md,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 24,
    gap: 8,
    alignSelf: 'flex-start',
  },
  playAllText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  artistItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  artistImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  artistInfo: {
    flex: 1,
    marginLeft: spacing.md,
  },
  artistName: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '600',
  },
  artistCount: {
    color: colors.textSecondary,
    fontSize: 12,
    marginTop: 2,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xl * 2,
  },
  emptyText: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '600',
    marginTop: spacing.lg,
  },
  emptySubtext: {
    color: colors.textSecondary,
    fontSize: 14,
    marginTop: spacing.sm,
    textAlign: 'center',
    paddingHorizontal: spacing.xl,
    lineHeight: 20,
  },
  // Notes styles
  addNoteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: spacing.md,
    marginBottom: spacing.md,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: 'dashed',
  },
  addNoteText: {
    color: colors.primary,
    fontSize: 15,
    fontWeight: '600',
  },
  noteForm: {
    marginHorizontal: spacing.md,
    marginBottom: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  noteTitleInput: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '700',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingBottom: 8,
    marginBottom: 10,
  },
  noteBodyInput: {
    color: colors.text,
    fontSize: 14,
    minHeight: 100,
    lineHeight: 20,
  },
  noteFormActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 12,
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 12,
  },
  noteCancelBtn: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  noteCancelText: {
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: '600',
  },
  noteSaveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: colors.primary,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
  },
  noteSaveText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  notesGrid: {
    paddingHorizontal: spacing.md,
  },
  noteCard: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: 10,
    borderLeftWidth: 4,
  },
  noteCardTitle: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 4,
  },
  noteCardBody: {
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 8,
  },
  noteCardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  noteCardDate: {
    color: colors.textSecondary,
    fontSize: 11,
  },
});
