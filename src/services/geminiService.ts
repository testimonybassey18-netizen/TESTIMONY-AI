import { ChatMessage, UserStatus } from '../types';
import { observeAndLearn, formatMemoryForSystem } from './memoryService';

/**
 * AI Studio Secret Environment Variable
 */
const VITE_GEMINI_API_KEY = (import.meta.env.VITE_GEMINI_API_KEY || '').trim();

/**
 * Get or create persistent User ID across page refreshes and browser tabs
 */
export function getUserId(): string {
  let uid = localStorage.getItem('testimony_user_id');
  if (!uid) {
    uid = 'user_' + Math.random().toString(36).substring(2, 11) + '_' + Date.now().toString(36);
    localStorage.setItem('testimony_user_id', uid);
  }
  return uid;
}

export function setUserId(newId: string): void {
  const clean = newId.trim().toLowerCase();
  if (clean) {
    localStorage.setItem('testimony_user_id', clean);
  }
}

export interface GenerateOptions {
  prompt: string;
  systemInstruction?: string;
  temperature?: number;
}

export interface GeminiChatResponse {
  text: string;
  freeMessagesRemaining?: number;
  isSubscribed?: boolean;
  plan?: string;
}

export class FreeLimitReachedError extends Error {
  isFreeLimitReached = true;
  constructor(
    message = 'You have used all 25 of your free AI messages. Subscribe to TESTIMONY AI ASSISTANT to continue enjoying your AI assistant.'
  ) {
    super(message);
    this.name = 'FreeLimitReachedError';
  }
}

/**
 * Common request headers, automatically including persistent user identification, temporal context, and API secret
 */
function getHeaders(): Record<string, string> {
  let clientTimezone = 'UTC';
  try {
    clientTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch (e) {
    // fallback
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'x-user-id': getUserId(),
    'x-client-date': new Date().toISOString(),
    'x-client-timezone': clientTimezone,
  };
  if (VITE_GEMINI_API_KEY) {
    headers['x-api-key'] = VITE_GEMINI_API_KEY;
  }
  return headers;
}

// Broadcast usage updates to App state
function broadcastUsageUpdate(data: any) {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('testimony_usage_update', {
        detail: {
          freeMessagesRemaining: data.freeMessagesRemaining,
          isSubscribed: data.isSubscribed,
          plan: data.plan,
        },
      })
    );
  }
}

export async function getUserStatus(): Promise<UserStatus> {
  try {
    const res = await fetch(`/api/user/status?userId=${encodeURIComponent(getUserId())}`, {
      headers: getHeaders(),
    });
    if (!res.ok) {
      throw new Error('Failed to fetch user status');
    }
    const status: UserStatus = await res.json();
    broadcastUsageUpdate(status);
    return status;
  } catch (err) {
    console.warn('Failed to fetch status from server:', err);
    return {
      userId: getUserId(),
      freeMessagesRemaining: 25,
      totalFreeAllowance: 25,
      isSubscribed: false,
      subscriptionPlan: 'free',
    };
  }
}

export async function checkoutSubscription(plan: 'weekly' | 'monthly' | 'yearly'): Promise<UserStatus> {
  const res = await fetch('/api/subscription/checkout', {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({
      userId: getUserId(),
      plan,
    }),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Subscription verification failed.');
  }

  broadcastUsageUpdate(data.user);
  return data.user;
}

export async function unlockOwnerPass(password: string): Promise<UserStatus> {
  const res = await fetch('/api/owner/unlock', {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({
      userId: getUserId(),
      password,
    }),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || data.error || 'Incorrect owner password.');
  }

  // Cache owner unlock locally so it persists immediately
  try {
    localStorage.setItem('testimony_owner_unlocked', 'true');
  } catch (e) {}

  broadcastUsageUpdate(data.user);
  return data.user;
}

export async function cancelSubscription(): Promise<UserStatus> {
  const res = await fetch('/api/subscription/cancel', {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({
      userId: getUserId(),
    }),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Failed to cancel subscription');
  }

  try {
    localStorage.removeItem('testimony_owner_unlocked');
  } catch (e) {}

  broadcastUsageUpdate(data.user);
  return data.user;
}

export async function callGeminiGenerate(options: GenerateOptions): Promise<string> {
  try {
    const res = await fetch('/api/gemini/generate', {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({
        prompt: options.prompt,
        systemInstruction: options.systemInstruction,
        temperature: options.temperature,
        apiKey: VITE_GEMINI_API_KEY || undefined,
        userId: getUserId(),
      }),
    });

    const data = await res.json();

    if (res.status === 403 || data.error === 'FREE_LIMIT_REACHED') {
      broadcastUsageUpdate({ freeMessagesRemaining: 0, isSubscribed: false });
      throw new FreeLimitReachedError(data.message);
    }

    if (!res.ok) {
      throw new Error(data.message || data.error || 'Failed to generate response');
    }

    broadcastUsageUpdate(data);
    return data.text || '';
  } catch (error: any) {
    if (error?.isFreeLimitReached) throw error;
    console.error('Gemini Generate Error:', error);
    throw error;
  }
}

export async function callGeminiChat(
  messages: ChatMessage[],
  systemInstruction?: string
): Promise<GeminiChatResponse> {
  try {
    const lastUserMsg = [...messages].reverse().find((m) => m.role === 'user');
    if (lastUserMsg && lastUserMsg.content) {
      observeAndLearn(lastUserMsg.content);
    }
    const memoryContext = formatMemoryForSystem();
    const effectiveInstruction = systemInstruction
      ? `${systemInstruction}\n\n${memoryContext}`
      : memoryContext;

    const res = await fetch('/api/gemini/chat', {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({
        messages,
        systemInstruction: effectiveInstruction,
        apiKey: VITE_GEMINI_API_KEY || undefined,
        userId: getUserId(),
      }),
    });

    const data = await res.json();

    if (res.status === 403 || data.error === 'FREE_LIMIT_REACHED') {
      broadcastUsageUpdate({ freeMessagesRemaining: 0, isSubscribed: false });
      throw new FreeLimitReachedError(data.message);
    }

    if (!res.ok) {
      throw new Error(data.message || data.error || 'Failed to receive chat response');
    }

    broadcastUsageUpdate(data);
    return {
      text: data.text || '',
      freeMessagesRemaining: data.freeMessagesRemaining,
      isSubscribed: data.isSubscribed,
      plan: data.plan,
    };
  } catch (error: any) {
    if (error?.isFreeLimitReached) throw error;
    console.error('Gemini Chat Error:', error);
    throw error;
  }
}

export async function callGeminiAnalyzeDoc(
  documentName: string,
  documentContent: string,
  task: string
): Promise<string> {
  try {
    const res = await fetch('/api/gemini/analyze-document', {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({
        documentName,
        documentContent,
        task,
        apiKey: VITE_GEMINI_API_KEY || undefined,
        userId: getUserId(),
      }),
    });

    const data = await res.json();

    if (res.status === 403 || data.error === 'FREE_LIMIT_REACHED') {
      broadcastUsageUpdate({ freeMessagesRemaining: 0, isSubscribed: false });
      throw new FreeLimitReachedError(data.message);
    }

    if (!res.ok) {
      throw new Error(data.message || data.error || 'Failed to analyze document');
    }

    broadcastUsageUpdate(data);
    return data.text || '';
  } catch (error: any) {
    if (error?.isFreeLimitReached) throw error;
    console.error('Gemini Analyze Document Error:', error);
    throw error;
  }
}

export async function transcribeVoiceAudio(
  audioData: string,
  mimeType = 'audio/webm'
): Promise<string> {
  try {
    const res = await fetch('/api/gemini/transcribe-voice', {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ audioData, mimeType }),
    });
    if (!res.ok) {
      throw new Error('Transcription failed');
    }
    const data = await res.json();
    return data.transcript || '';
  } catch (err) {
    console.warn('Voice transcription error:', err);
    return '';
  }
}

export type VoiceName = 'Fenrir' | 'Charon' | 'Puck' | 'Aoede' | 'Kore' | 'Leda';

/**
 * Generate speech audio using studio-grade Gemini TTS (Supports Male & Female voices)
 */
export async function generateSpeechAudio(
  text: string,
  voiceName: VoiceName = 'Fenrir'
): Promise<string | null> {
  try {
    const res = await fetch('/api/gemini/tts', {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ text, voiceName }),
    });
    if (!res.ok) {
      throw new Error('TTS generation failed');
    }
    const data = await res.json();
    return data.audioBase64 ? `data:audio/wav;base64,${data.audioBase64}` : null;
  } catch (err) {
    console.warn('Backend TTS failed, client speech fallback will be used:', err);
    return null;
  }
}

// Alias for backwards compatibility
export const generateMaleSpeech = generateSpeechAudio;

/**
 * Global audio controller for 1-on-1 human male or female voice speech
 */
export class VoiceAudioPlayer {
  private currentAudio: HTMLAudioElement | null = null;
  private isSpeakingState = false;

  public async speak(
    text: string,
    voiceName: VoiceName = 'Fenrir',
    onStart?: () => void,
    onEnd?: () => void
  ) {
    this.stop();

    const plainText = text
      .replace(/[*#`_\[\]()]/g, ' ')
      .replace(/https?:\/\/\S+/g, 'link')
      .slice(0, 900)
      .trim();

    if (!plainText) {
      onEnd?.();
      return;
    }

    this.isSpeakingState = true;
    onStart?.();

    // 1. Try studio-quality backend voice first
    try {
      const audioUrl = await generateSpeechAudio(plainText, voiceName);
      if (audioUrl) {
        const audio = new Audio(audioUrl);
        this.currentAudio = audio;
        audio.onended = () => {
          this.currentAudio = null;
          this.isSpeakingState = false;
          onEnd?.();
        };
        audio.onerror = () => {
          this.currentAudio = null;
          this.speakWithBrowserFallback(plainText, voiceName, onEnd);
        };
        await audio.play();
        return;
      }
    } catch (e) {
      console.warn('Studio voice play issue, falling back to browser voice:', e);
    }

    // 2. Fallback to client browser speech synthesis tuned for pitch
    this.speakWithBrowserFallback(plainText, voiceName, onEnd);
  }

  private speakWithBrowserFallback(text: string, voiceName: VoiceName = 'Fenrir', onEnd?: () => void) {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      this.isSpeakingState = false;
      onEnd?.();
      return;
    }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    const isFemale = ['Aoede', 'Kore', 'Leda'].includes(voiceName);

    utterance.pitch = isFemale ? 1.15 : 0.85;
    utterance.rate = 1.0;

    const voices = window.speechSynthesis.getVoices();
    if (isFemale) {
      const femaleVoice = voices.find(
        (v) =>
          v.lang.startsWith('en') &&
          (v.name.includes('Female') ||
            v.name.includes('Samantha') ||
            v.name.includes('Zira') ||
            v.name.includes('Victoria') ||
            v.name.includes('Karen') ||
            v.name.includes('Google US English'))
      );
      if (femaleVoice) utterance.voice = femaleVoice;
    } else {
      const maleVoice = voices.find(
        (v) =>
          v.lang.startsWith('en') &&
          (v.name.includes('Male') ||
            v.name.includes('David') ||
            v.name.includes('Guy') ||
            v.name.includes('Daniel') ||
            v.name.includes('Alex') ||
            v.name.includes('George'))
      );
      if (maleVoice) utterance.voice = maleVoice;
    }

    utterance.onend = () => {
      this.isSpeakingState = false;
      onEnd?.();
    };
    utterance.onerror = () => {
      this.isSpeakingState = false;
      onEnd?.();
    };

    window.speechSynthesis.speak(utterance);
  }

  public stop() {
    if (this.currentAudio) {
      try {
        this.currentAudio.pause();
        this.currentAudio.currentTime = 0;
      } catch (e) {}
      this.currentAudio = null;
    }
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
      } catch (e) {}
    }
    this.isSpeakingState = false;
  }

  public isSpeaking(): boolean {
    return this.isSpeakingState;
  }
}

export const globalVoicePlayer = new VoiceAudioPlayer();

export interface ScannedJobLead {
  id: string;
  type: 'website_fix' | 'online_help' | 'remote_job';
  title: string;
  businessName: string;
  country: string;
  city?: string;
  industry: string;
  websiteUrl?: string;
  issueOrNeed: string;
  urgency: 'high' | 'medium' | 'normal';
  estimatedBudget: string;
  contactPerson: string;
  contactEmail: string;
  contactPhoneOrWhatsApp?: string;
  socialOrLink?: string;
  description: string;
  pitchAngle: string;
  dateScanned: string;
}

export async function scanOnlineJobsAndLeads(params: {
  country?: string;
  category?: string;
  industry?: string;
  customQuery?: string;
}): Promise<ScannedJobLead[]> {
  try {
    const res = await fetch('/api/gemini/scan-jobs', {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(params),
    });
    if (!res.ok) {
      throw new Error('Failed to scan online jobs and leads');
    }
    const data = await res.json();
    return Array.isArray(data.leads) ? data.leads : [];
  } catch (err) {
    console.warn('Scan request error:', err);
    throw err;
  }
}


