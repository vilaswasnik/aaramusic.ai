import { Song } from '../types';
import { searchSongs, fetchPlaylistTracks } from './musicService';

// ─── Mood-to-Music Mapping ───────────────────────────────────────────────────

export type Mood = 'happy' | 'sad' | 'energetic' | 'romantic' | 'chill' | 'focus' | 'party' | 'angry' | 'nostalgic' | 'spiritual';

interface MoodProfile {
  label: string;
  emoji: string;
  color: string;
  queries: string[];
  playlistIds: string[];
}

const MOOD_MAP: Record<Mood, MoodProfile> = {
  happy: {
    label: 'Happy',
    emoji: '😊',
    color: '#FFD700',
    queries: ['happy songs', 'feel good music', 'upbeat pop', 'cheerful hits'],
    playlistIds: ['3155776842', '1925105902'],
  },
  sad: {
    label: 'Sad',
    emoji: '😢',
    color: '#5C7AEA',
    queries: ['sad songs', 'heartbreak', 'emotional ballads', 'melancholy'],
    playlistIds: ['11971519481'],
  },
  energetic: {
    label: 'Energetic',
    emoji: '⚡',
    color: '#FF6B35',
    queries: ['workout music', 'high energy', 'pump up songs', 'running music'],
    playlistIds: ['9647710102'],
  },
  romantic: {
    label: 'Romantic',
    emoji: '❤️',
    color: '#FF1744',
    queries: ['love songs', 'romantic ballads', 'valentine songs', 'slow dance'],
    playlistIds: ['11971519481', '13580430301'],
  },
  chill: {
    label: 'Chill',
    emoji: '🌊',
    color: '#00BCD4',
    queries: ['chill vibes', 'lofi beats', 'ambient music', 'relaxing'],
    playlistIds: ['1925105902'],
  },
  focus: {
    label: 'Focus',
    emoji: '🧠',
    color: '#7C4DFF',
    queries: ['study music', 'concentration', 'instrumental focus', 'deep work'],
    playlistIds: [],
  },
  party: {
    label: 'Party',
    emoji: '🎉',
    color: '#FF4081',
    queries: ['party hits', 'dance music', 'club bangers', 'EDM'],
    playlistIds: ['10719125482'],
  },
  angry: {
    label: 'Angry',
    emoji: '🔥',
    color: '#D32F2F',
    queries: ['angry rock', 'metal', 'hard rock', 'rage music'],
    playlistIds: ['1306931615'],
  },
  nostalgic: {
    label: 'Nostalgic',
    emoji: '🕰️',
    color: '#FF8F00',
    queries: ['throwback hits', '90s hits', 'old school', 'retro music'],
    playlistIds: ['1318937087', '11193162724'],
  },
  spiritual: {
    label: 'Spiritual',
    emoji: '🙏',
    color: '#AB47BC',
    queries: ['devotional songs', 'spiritual music', 'meditation music', 'bhajans'],
    playlistIds: [],
  },
};

export const getMoods = (): { key: Mood; label: string; emoji: string; color: string }[] => {
  return Object.entries(MOOD_MAP).map(([key, val]) => ({
    key: key as Mood,
    label: val.label,
    emoji: val.emoji,
    color: val.color,
  }));
};

export const fetchMoodSongs = async (mood: Mood): Promise<Song[]> => {
  const profile = MOOD_MAP[mood];
  const allSongs: Song[] = [];

  // Fetch from playlists first
  if (profile.playlistIds.length > 0) {
    const playlistId = profile.playlistIds[Math.floor(Math.random() * profile.playlistIds.length)];
    const songs = await fetchPlaylistTracks(playlistId, 20);
    allSongs.push(...songs);
  }

  // Fill from search queries
  if (allSongs.length < 15) {
    const query = profile.queries[Math.floor(Math.random() * profile.queries.length)];
    const searched = await searchSongs(query);
    allSongs.push(...searched);
  }

  // Deduplicate
  const seen = new Set<string>();
  return allSongs.filter(s => {
    if (seen.has(s.id)) return false;
    seen.add(s.id);
    return true;
  }).slice(0, 25);
};

// ─── Natural Language Intent Parser ──────────────────────────────────────────

export interface AIIntent {
  type: 'mood' | 'search' | 'recommendation' | 'radio' | 'greeting' | 'unknown';
  mood?: Mood;
  query?: string;
  message: string;
}

// Common artist name typo corrections
const ARTIST_TYPOS: Record<string, string> = {
  'taylro': 'taylor', 'tayler': 'taylor', 'talyor': 'taylor',
  'swft': 'swift', 'siwft': 'swift',
  'arjit': 'arijit', 'arijt': 'arijit', 'arjiti': 'arijit',
  'weekdn': 'weeknd', 'weeked': 'weeknd', 'weknd': 'weeknd',
  'beyonce': 'beyonce', 'beyonc': 'beyonce', 'beyoncee': 'beyonce',
  'eminm': 'eminem', 'emimem': 'eminem',
  'drake': 'drake', 'drak': 'drake',
  'rihana': 'rihanna', 'rihnna': 'rihanna',
  'justinbieber': 'justin bieber', 'beiber': 'bieber',
  'edsheeran': 'ed sheeran', 'sheeran': 'sheeran', 'sheran': 'sheeran',
  'bilish': 'billie eilish', 'eillish': 'eilish', 'eilsh': 'eilish',
  'adel': 'adele', 'adelle': 'adele',
  'arianna': 'ariana', 'ariena': 'ariana',
  'grande': 'grande', 'garnde': 'grande',
  'selina': 'selena', 'gomaz': 'gomez',
  'coldpaly': 'coldplay', 'colplay': 'coldplay',
  'imagin': 'imagine', 'imagnie': 'imagine',
  'linkin': 'linkin', 'linkn': 'linkin',
  'marroon': 'maroon', 'maron': 'maroon',
  'rahmaan': 'rahman', 'rehman': 'rahman',
  'shreya': 'shreya', 'shreyya': 'shreya',
  'kishor': 'kishore', 'kisore': 'kishore',
  'mohamad': 'mohammed', 'mohd': 'mohammed',
};

// Words to strip from queries (filler/noise words)
const FILLER_WORDS = [
  'list', 'all', 'the', 'of', 'from', 'by', 'in', 'a', 'an',
  'please', 'can', 'you', 'me', 'show', 'give', 'get',
  'month', 'year', 'january', 'february', 'march', 'april', 'may', 'june',
  'july', 'august', 'september', 'october', 'november', 'december',
  'latest', 'best', 'top', 'most', 'popular', 'famous', 'greatest',
  'every', 'some', 'their', 'his', 'her',
];

const cleanQuery = (raw: string): string => {
  let words = raw.toLowerCase().split(/\s+/);

  // Fix typos
  words = words.map(w => ARTIST_TYPOS[w] || w);

  // Remove filler words (but keep at least 1-2 meaningful words)
  const meaningful = words.filter(w => !FILLER_WORDS.includes(w));
  const cleaned = meaningful.length >= 1 ? meaningful : words;

  return cleaned.join(' ').trim();
};

const MOOD_KEYWORDS: Record<Mood, string[]> = {
  happy: ['happy', 'cheerful', 'joyful', 'upbeat', 'feel good', 'bright', 'positive'],
  sad: ['sad', 'depressed', 'heartbreak', 'cry', 'emotional', 'blue', 'melancholy', 'lonely'],
  energetic: ['energetic', 'workout', 'exercise', 'gym', 'pump', 'running', 'power', 'hype'],
  romantic: ['romantic', 'love', 'romance', 'valentine', 'crush', 'date night', 'passionate'],
  chill: ['chill', 'relax', 'calm', 'peaceful', 'lofi', 'ambient', 'mellow', 'soothing'],
  focus: ['focus', 'study', 'concentrate', 'work', 'productive', 'deep work', 'homework'],
  party: ['party', 'dance', 'club', 'edm', 'celebration', 'friday night', 'dj'],
  angry: ['angry', 'rage', 'metal', 'hard rock', 'frustrat', 'scream', 'heavy'],
  nostalgic: ['nostalgic', 'throwback', 'old school', 'retro', '90s', '80s', '2000s', 'classic', 'remember'],
  spiritual: ['spiritual', 'devotional', 'meditation', 'bhajan', 'prayer', 'peaceful', 'divine'],
};

const GREETING_PATTERNS = [/^hello\b/, /^hi\b/, /^hey\b/, /what can you do/, /^help$/, /^start$/];

export const parseIntent = (input: string): AIIntent => {
  const lower = input.toLowerCase().trim();

  // Check greetings (only match word boundaries or exact phrases)
  if (GREETING_PATTERNS.some(g => g.test(lower))) {
    return {
      type: 'greeting',
      message: "Hey! I'm Aara AI 🎵 I can help you discover music based on your mood, find similar songs, or recommend tracks. Try saying:\n\n• \"Play something happy\"\n• \"I'm feeling sad\"\n• \"Recommend workout music\"\n• \"Find songs like Shape of You\"\n• \"Play chill vibes\"",
    };
  }

  // Check for trending/chart/featured patterns
  if (/song of the (month|week|day)|trending|top (songs?|hits?|charts?)|what.?s (hot|new|popular)|hit(s)? (right now|today|this month)/i.test(lower)) {
    return {
      type: 'search',
      query: '__trending__',
      message: "🔥 Here are the hottest songs right now!",
    };
  }

  // Check mood keywords
  for (const [mood, keywords] of Object.entries(MOOD_KEYWORDS)) {
    if (keywords.some(kw => lower.includes(kw))) {
      return {
        type: 'mood',
        mood: mood as Mood,
        message: `I sense a ${MOOD_MAP[mood as Mood].emoji} ${MOOD_MAP[mood as Mood].label} vibe! Let me find the perfect tracks for you...`,
      };
    }
  }

  // Check for "similar to" / "like" / "radio" patterns
  const radioPatterns = [
    /(?:similar to|songs? like|more like|radio for|tracks? like)\s+(.+)/i,
    /play (?:something |songs? )?(?:similar|like)\s+(.+)/i,
  ];
  for (const pattern of radioPatterns) {
    const match = lower.match(pattern);
    if (match) {
      return {
        type: 'radio',
        query: match[1].trim(),
        message: `Finding songs similar to "${match[1].trim()}"...`,
      };
    }
  }

  // Check for "recommend" / "suggest" patterns
  if (/recommend|suggest|what should i/i.test(lower)) {
    const raw = lower.replace(/recommend|suggest|what should i (?:listen to|play)|me/gi, '').trim();
    const cleaned = cleanQuery(raw) || undefined;
    return {
      type: 'recommendation',
      query: cleaned,
      message: cleaned
        ? `Let me find great "${cleaned}" tracks for you...`
        : "Let me pick some great tracks for you based on what's trending...",
    };
  }

  // Check for play/find/search/list patterns
  const searchPatterns = [
    /(?:play|find|search|look for|get me|put on|list|show)\s+(.+)/i,
    /i (?:want|need|wanna listen to|feel like)\s+(.+)/i,
  ];
  for (const pattern of searchPatterns) {
    const match = lower.match(pattern);
    if (match) {
      const cleaned = cleanQuery(match[1].trim());
      return {
        type: 'search',
        query: cleaned,
        message: `Searching for "${cleaned}"...`,
      };
    }
  }

  // Default: clean and treat as search
  const cleaned = cleanQuery(lower);
  return {
    type: 'search',
    query: cleaned,
    message: `Searching for "${cleaned}"...`,
  };
};

// ─── AI Radio (Similar Songs) ────────────────────────────────────────────────

export const fetchSimilarSongs = async (song: Song): Promise<Song[]> => {
  // Use artist name + genre to find similar tracks
  const queries = [
    `${song.artist}`,
    `${song.title} ${song.artist}`,
  ];

  const allSongs: Song[] = [];
  for (const query of queries) {
    const results = await searchSongs(query);
    allSongs.push(...results);
  }

  // Remove the original song and deduplicate
  const seen = new Set<string>([song.id]);
  return allSongs.filter(s => {
    if (seen.has(s.id)) return false;
    seen.add(s.id);
    return true;
  }).slice(0, 25);
};

// ─── Smart Recommendations ──────────────────────────────────────────────────

export const getSmartRecommendations = async (listeningHistory: Song[]): Promise<{ title: string; songs: Song[] }[]> => {
  const recommendations: { title: string; songs: Song[] }[] = [];

  if (listeningHistory.length === 0) {
    // Cold start: use trending
    const trending = await searchSongs('top hits 2025');
    recommendations.push({ title: '🔥 Trending For You', songs: trending.slice(0, 10) });
    const discover = await searchSongs('new music 2025');
    recommendations.push({ title: '✨ Discover Something New', songs: discover.slice(0, 10) });
    return recommendations;
  }

  // Analyze listening history
  const artistCounts: Record<string, number> = {};
  for (const song of listeningHistory) {
    artistCounts[song.artist] = (artistCounts[song.artist] || 0) + 1;
  }

  // Top artists
  const topArtists = Object.entries(artistCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([artist]) => artist);

  // "Because you listened to X"
  if (topArtists.length > 0) {
    const songs = await searchSongs(topArtists[0]);
    recommendations.push({
      title: `🎯 Because you listen to ${topArtists[0]}`,
      songs: songs.slice(0, 10),
    });
  }

  // "More from your favorites"
  if (topArtists.length > 1) {
    const songs = await searchSongs(topArtists[1]);
    recommendations.push({
      title: `💜 More from ${topArtists[1]}`,
      songs: songs.slice(0, 10),
    });
  }

  // "You might also like"
  if (listeningHistory.length > 0) {
    const lastSong = listeningHistory[listeningHistory.length - 1];
    const similar = await fetchSimilarSongs(lastSong);
    if (similar.length > 0) {
      recommendations.push({
        title: '🎵 You Might Also Like',
        songs: similar.slice(0, 10),
      });
    }
  }

  return recommendations;
};

// ─── AI Daily Mix Generator ─────────────────────────────────────────────────

export interface DailyMix {
  id: string;
  title: string;
  subtitle: string;
  color: string;
  songs: Song[];
}

export const generateDailyMixes = async (listeningHistory: Song[]): Promise<DailyMix[]> => {
  const mixes: DailyMix[] = [];
  const colors = ['#1DB954', '#E91E63', '#FF9800', '#2196F3', '#9C27B0', '#009688'];

  if (listeningHistory.length === 0) {
    // Default mixes for new users
    const defaultMixes = [
      { query: 'pop hits 2025', title: 'Daily Mix 1', subtitle: 'Pop & Trending' },
      { query: 'bollywood latest', title: 'Daily Mix 2', subtitle: 'Bollywood Vibes' },
      { query: 'chill acoustic', title: 'Daily Mix 3', subtitle: 'Chill & Acoustic' },
      { query: 'hip hop rap', title: 'Daily Mix 4', subtitle: 'Hip Hop & Rap' },
    ];

    for (let i = 0; i < defaultMixes.length; i++) {
      const songs = await searchSongs(defaultMixes[i].query);
      if (songs.length > 0) {
        mixes.push({
          id: `daily-${i + 1}`,
          title: defaultMixes[i].title,
          subtitle: defaultMixes[i].subtitle,
          color: colors[i % colors.length],
          songs: songs.slice(0, 15),
        });
      }
    }
    return mixes;
  }

  // Build mixes from listening history artists
  const artistCounts: Record<string, number> = {};
  for (const song of listeningHistory) {
    artistCounts[song.artist] = (artistCounts[song.artist] || 0) + 1;
  }

  const topArtists = Object.entries(artistCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([artist]) => artist);

  for (let i = 0; i < topArtists.length; i++) {
    const songs = await searchSongs(topArtists[i]);
    if (songs.length > 0) {
      mixes.push({
        id: `daily-${i + 1}`,
        title: `Daily Mix ${i + 1}`,
        subtitle: `${topArtists[i]} & more`,
        color: colors[i % colors.length],
        songs: songs.slice(0, 15),
      });
    }
  }

  return mixes;
};
