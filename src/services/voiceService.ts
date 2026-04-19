import { Platform } from 'react-native';

// ─── Voice Command Service (Web Speech API) ──────────────────────────────────

export interface VoiceResult {
  transcript: string;
  isFinal: boolean;
}

type VoiceCallback = (result: VoiceResult) => void;
type VoiceErrorCallback = (error: string) => void;
type VoiceStateCallback = (listening: boolean) => void;

let recognition: any = null;
let isListening = false;
let retryCount = 0;
const MAX_RETRIES = 2;

const getSpeechRecognition = (): any => {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return null;
  const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
  return SR ? new SR() : null;
};

export const isVoiceSupported = (): boolean => {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return false;
  return !!((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);
};

export const startListening = (
  onResult: VoiceCallback,
  onError: VoiceErrorCallback,
  onStateChange: VoiceStateCallback,
): void => {
  if (isListening) {
    stopListening();
    return;
  }

  retryCount = 0;
  doStart(onResult, onError, onStateChange);
};

const doStart = (
  onResult: VoiceCallback,
  onError: VoiceErrorCallback,
  onStateChange: VoiceStateCallback,
): void => {
  recognition = getSpeechRecognition();
  if (!recognition) {
    onError('Voice recognition not supported in this browser');
    return;
  }

  recognition.continuous = false;
  recognition.interimResults = true;
  recognition.lang = 'en-US';
  recognition.maxAlternatives = 1;

  let gotResult = false;

  recognition.onstart = () => {
    isListening = true;
    onStateChange(true);
  };

  recognition.onresult = (event: any) => {
    gotResult = true;
    retryCount = 0;
    let transcript = '';
    let isFinal = false;
    for (let i = event.resultIndex; i < event.results.length; i++) {
      transcript += event.results[i][0].transcript;
      if (event.results[i].isFinal) isFinal = true;
    }
    onResult({ transcript: transcript.trim(), isFinal });
  };

  recognition.onerror = (event: any) => {
    isListening = false;

    // Auto-retry on network errors (common with proxied URLs)
    if (event.error === 'network' && retryCount < MAX_RETRIES) {
      retryCount++;
      onStateChange(true); // keep the mic UI active
      setTimeout(() => doStart(onResult, onError, onStateChange), 300);
      return;
    }

    onStateChange(false);
    if (event.error === 'network') {
      onError('🌐 Network error — check your internet connection and try again. Use Chrome for best results.');
    } else if (event.error === 'no-speech') {
      onError('No speech detected. Tap the mic and try again.');
    } else if (event.error === 'not-allowed') {
      onError('🎤 Microphone access denied. Please allow microphone permission in your browser settings.');
    } else if (event.error === 'aborted') {
      // User or system cancelled — silent
      return;
    } else {
      onError(`Voice error: ${event.error}`);
    }
  };

  recognition.onend = () => {
    isListening = false;
    onStateChange(false);
  };

  try {
    recognition.start();
  } catch (e: any) {
    isListening = false;
    onStateChange(false);
    onError(e?.message || 'Could not start voice recognition');
  }
};

export const stopListening = (): void => {
  if (recognition) {
    try {
      recognition.stop();
    } catch {}
    recognition = null;
  }
  isListening = false;
};

// ─── Voice Command Parser ────────────────────────────────────────────────────
// Extends the AI intent parser with voice-specific commands

export type VoiceCommandType =
  | 'play_likes'
  | 'play_favorites'
  | 'pause'
  | 'resume'
  | 'next'
  | 'previous'
  | 'shuffle'
  | 'repeat'
  | 'search'
  | 'unknown';

export interface VoiceCommand {
  type: VoiceCommandType;
  query?: string;
  message: string;
}

export const parseVoiceCommand = (transcript: string): VoiceCommand => {
  const lower = transcript.toLowerCase().trim();

  // Play likes / favorites
  if (/play\s+(my\s+)?(likes?|liked|favourite|favorite|favourites|favorites|loved)/i.test(lower)) {
    return { type: 'play_likes', message: '❤️ Playing your liked songs!' };
  }

  // Pause / Stop
  if (/^(pause|stop|hold|wait)$/.test(lower)) {
    return { type: 'pause', message: '⏸️ Paused' };
  }

  // Resume / Continue
  if (/^(resume|continue|play|go|unpause)$/.test(lower)) {
    return { type: 'resume', message: '▶️ Resuming playback' };
  }

  // Next / skip
  if (/^(next|skip|forward)(\s+song)?$/.test(lower)) {
    return { type: 'next', message: '⏭️ Skipping to next song' };
  }

  // Previous / back
  if (/^(previous|back|go back|last)(\s+song)?$/.test(lower)) {
    return { type: 'previous', message: '⏮️ Going to previous song' };
  }

  // Shuffle
  if (/^(shuffle|mix|random)((\s+it)?(\s+up)?)?$/.test(lower)) {
    return { type: 'shuffle', message: '🔀 Shuffle toggled' };
  }

  // Repeat
  if (/^(repeat|loop)(\s+(this|song|track))?$/.test(lower)) {
    return { type: 'repeat', message: '🔁 Repeat toggled' };
  }

  // Everything else → pass to AI search
  return { type: 'search', query: lower, message: `🎤 "${transcript}"` };
};
