/**
 * Music Asset Manager
 * Shared utility for managing music assets between Content Center and Ad Creator
 */

export type MusicMood = 'upbeat' | 'calm' | 'energetic' | 'professional' | 'cinematic' | 'corporate' | 'dramatic' | 'inspiring';
export type MusicGenre = 'electronic' | 'acoustic' | 'orchestral' | 'rock' | 'ambient' | 'pop' | 'jazz' | 'corporate';

export interface MusicAsset {
  id: string;
  title: string;
  artist?: string;
  file?: File;
  url: string;
  duration: number; // in seconds
  bpm?: number; // beats per minute
  mood: MusicMood;
  genre: MusicGenre;
  instruments?: string[];
  keywords?: string[];
  isRoyaltyFree: boolean;
  license?: string;
  volume?: number; // 0-100
  fadeIn?: number; // duration in seconds
  fadeOut?: number; // duration in seconds
  trimStart?: number; // trim from start in seconds
  trimEnd?: number; // trim from end in seconds
  createdAt: string;
  updatedAt: string;
  source: 'library' | 'upload' | 'generated';
}

export interface MusicSuggestion {
  musicId: string;
  reason: string;
  confidence: number; // 0-100
  matchedKeywords: string[];
}

export interface AudioSettings {
  volume: number;
  fadeIn: number;
  fadeOut: number;
  autoDucking: boolean; // Auto-lower music when dialogue detected
  normalizeAudio: boolean;
}

const STORAGE_KEY = 'music_assets_library';
const DEFAULT_AUDIO_SETTINGS_KEY = 'default_audio_settings';

// Demo royalty-free music library
export const DEMO_MUSIC_LIBRARY: MusicAsset[] = [
  {
    id: 'music-upbeat-1',
    title: 'Upbeat Corporate Success',
    artist: 'Audio Library',
    url: 'https://example.com/demo/upbeat-corporate.mp3',
    duration: 180,
    bpm: 120,
    mood: 'upbeat',
    genre: 'corporate',
    instruments: ['Piano', 'Drums', 'Bass', 'Synth'],
    keywords: ['motivational', 'positive', 'business', 'achievement'],
    isRoyaltyFree: true,
    license: 'Royalty-Free Commercial License',
    volume: 70,
    fadeIn: 2,
    fadeOut: 3,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    source: 'library',
  },
  {
    id: 'music-calm-1',
    title: 'Peaceful Ambient Flow',
    artist: 'Audio Library',
    url: 'https://example.com/demo/calm-ambient.mp3',
    duration: 240,
    bpm: 80,
    mood: 'calm',
    genre: 'ambient',
    instruments: ['Pads', 'Piano', 'Strings'],
    keywords: ['relaxing', 'peaceful', 'meditation', 'spa'],
    isRoyaltyFree: true,
    license: 'Royalty-Free Commercial License',
    volume: 60,
    fadeIn: 3,
    fadeOut: 4,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    source: 'library',
  },
  {
    id: 'music-energetic-1',
    title: 'High Energy Drive',
    artist: 'Audio Library',
    url: 'https://example.com/demo/energetic-rock.mp3',
    duration: 150,
    bpm: 140,
    mood: 'energetic',
    genre: 'rock',
    instruments: ['Electric Guitar', 'Drums', 'Bass'],
    keywords: ['powerful', 'action', 'sports', 'fitness'],
    isRoyaltyFree: true,
    license: 'Royalty-Free Commercial License',
    volume: 75,
    fadeIn: 1,
    fadeOut: 2,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    source: 'library',
  },
  {
    id: 'music-professional-1',
    title: 'Corporate Professional',
    artist: 'Audio Library',
    url: 'https://example.com/demo/professional-corporate.mp3',
    duration: 200,
    bpm: 110,
    mood: 'professional',
    genre: 'corporate',
    instruments: ['Piano', 'Strings', 'Light Percussion'],
    keywords: ['business', 'professional', 'presentation', 'corporate'],
    isRoyaltyFree: true,
    license: 'Royalty-Free Commercial License',
    volume: 65,
    fadeIn: 2,
    fadeOut: 3,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    source: 'library',
  },
  {
    id: 'music-cinematic-1',
    title: 'Epic Cinematic Adventure',
    artist: 'Audio Library',
    url: 'https://example.com/demo/cinematic-epic.mp3',
    duration: 210,
    bpm: 95,
    mood: 'cinematic',
    genre: 'orchestral',
    instruments: ['Orchestra', 'Choir', 'Percussion'],
    keywords: ['epic', 'dramatic', 'trailer', 'hero'],
    isRoyaltyFree: true,
    license: 'Royalty-Free Commercial License',
    volume: 80,
    fadeIn: 3,
    fadeOut: 5,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    source: 'library',
  },
  {
    id: 'music-inspiring-1',
    title: 'Inspiring Journey',
    artist: 'Audio Library',
    url: 'https://example.com/demo/inspiring-acoustic.mp3',
    duration: 195,
    bpm: 100,
    mood: 'inspiring',
    genre: 'acoustic',
    instruments: ['Acoustic Guitar', 'Piano', 'Strings'],
    keywords: ['hopeful', 'emotional', 'inspiring', 'uplifting'],
    isRoyaltyFree: true,
    license: 'Royalty-Free Commercial License',
    volume: 70,
    fadeIn: 2,
    fadeOut: 4,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    source: 'library',
  },
  {
    id: 'music-tech-1',
    title: 'Modern Technology',
    artist: 'Audio Library',
    url: 'https://example.com/demo/tech-electronic.mp3',
    duration: 160,
    bpm: 128,
    mood: 'professional',
    genre: 'electronic',
    instruments: ['Synths', 'Electronic Drums', 'Bass'],
    keywords: ['technology', 'modern', 'innovation', 'digital'],
    isRoyaltyFree: true,
    license: 'Royalty-Free Commercial License',
    volume: 70,
    fadeIn: 1,
    fadeOut: 2,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    source: 'library',
  },
  {
    id: 'music-jazz-1',
    title: 'Smooth Jazz Lounge',
    artist: 'Audio Library',
    url: 'https://example.com/demo/jazz-smooth.mp3',
    duration: 220,
    bpm: 90,
    mood: 'calm',
    genre: 'jazz',
    instruments: ['Saxophone', 'Piano', 'Double Bass', 'Brushes'],
    keywords: ['sophisticated', 'elegant', 'lounge', 'relaxing'],
    isRoyaltyFree: true,
    license: 'Royalty-Free Commercial License',
    volume: 65,
    fadeIn: 2,
    fadeOut: 3,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    source: 'library',
  },
];

/**
 * Get all music assets from storage
 */
export function getMusicAssets(): MusicAsset[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
    // Initialize with demo library
    localStorage.setItem(STORAGE_KEY, JSON.stringify(DEMO_MUSIC_LIBRARY));
    return DEMO_MUSIC_LIBRARY;
  } catch (error) {
    console.error('Error loading music assets:', error);
    return DEMO_MUSIC_LIBRARY;
  }
}

/**
 * Get a single music asset by ID
 */
export function getMusicAsset(id: string): MusicAsset | null {
  const assets = getMusicAssets();
  return assets.find(asset => asset.id === id) || null;
}

/**
 * Save a music asset to the library
 */
export function saveMusicAsset(asset: MusicAsset): void {
  try {
    const assets = getMusicAssets();
    const existingIndex = assets.findIndex(a => a.id === asset.id);
    
    if (existingIndex >= 0) {
      // Update existing
      assets[existingIndex] = {
        ...asset,
        updatedAt: new Date().toISOString(),
      };
    } else {
      // Add new
      assets.push({
        ...asset,
        createdAt: asset.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify(assets));
  } catch (error) {
    console.error('Error saving music asset:', error);
    throw new Error('Failed to save music asset');
  }
}

/**
 * Delete a music asset
 */
export function deleteMusicAsset(id: string): void {
  try {
    const assets = getMusicAssets();
    const filtered = assets.filter(asset => asset.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
  } catch (error) {
    console.error('Error deleting music asset:', error);
    throw new Error('Failed to delete music asset');
  }
}

/**
 * Get music assets filtered by mood
 */
export function getMusicAssetsByMood(mood: MusicMood): MusicAsset[] {
  const assets = getMusicAssets();
  return assets.filter(asset => asset.mood === mood);
}

/**
 * Get music assets filtered by genre
 */
export function getMusicAssetsByGenre(genre: MusicGenre): MusicAsset[] {
  const assets = getMusicAssets();
  return assets.filter(asset => asset.genre === genre);
}

/**
 * Search music assets by keywords
 */
export function searchMusicAssets(query: string): MusicAsset[] {
  const assets = getMusicAssets();
  const lowerQuery = query.toLowerCase();
  
  return assets.filter(asset => {
    const titleMatch = asset.title.toLowerCase().includes(lowerQuery);
    const artistMatch = asset.artist?.toLowerCase().includes(lowerQuery);
    const keywordsMatch = asset.keywords?.some(k => k.toLowerCase().includes(lowerQuery));
    const instrumentsMatch = asset.instruments?.some(i => i.toLowerCase().includes(lowerQuery));
    const moodMatch = asset.mood.toLowerCase().includes(lowerQuery);
    const genreMatch = asset.genre.toLowerCase().includes(lowerQuery);
    
    return titleMatch || artistMatch || keywordsMatch || instrumentsMatch || moodMatch || genreMatch;
  });
}

/**
 * AI-powered music suggestions based on video content
 */
export function suggestMusicForVideo(videoKeywords: string[], videoMood?: string, videoDuration?: number): MusicSuggestion[] {
  const assets = getMusicAssets();
  const suggestions: MusicSuggestion[] = [];
  
  assets.forEach(asset => {
    let confidence = 0;
    const matchedKeywords: string[] = [];
    
    // Match keywords
    videoKeywords.forEach(keyword => {
      const lowerKeyword = keyword.toLowerCase();
      if (asset.keywords?.some(k => k.toLowerCase().includes(lowerKeyword))) {
        confidence += 20;
        matchedKeywords.push(keyword);
      }
      if (asset.title.toLowerCase().includes(lowerKeyword)) {
        confidence += 15;
        matchedKeywords.push(keyword);
      }
    });
    
    // Match mood
    if (videoMood && asset.mood.toLowerCase().includes(videoMood.toLowerCase())) {
      confidence += 30;
    }
    
    // Match duration (prefer tracks longer than video)
    if (videoDuration && asset.duration >= videoDuration) {
      confidence += 10;
    }
    
    // Boost royalty-free tracks
    if (asset.isRoyaltyFree) {
      confidence += 5;
    }
    
    if (confidence > 20) {
      suggestions.push({
        musicId: asset.id,
        reason: generateSuggestionReason(asset, matchedKeywords),
        confidence: Math.min(confidence, 100),
        matchedKeywords,
      });
    }
  });
  
  // Sort by confidence
  return suggestions.sort((a, b) => b.confidence - a.confidence);
}

function generateSuggestionReason(asset: MusicAsset, matchedKeywords: string[]): string {
  const reasons: string[] = [];
  
  if (matchedKeywords.length > 0) {
    reasons.push(`Matches keywords: ${matchedKeywords.slice(0, 3).join(', ')}`);
  }
  
  reasons.push(`${asset.mood} mood`);
  reasons.push(`${asset.genre} genre`);
  
  if (asset.isRoyaltyFree) {
    reasons.push('Royalty-free');
  }
  
  return reasons.join(' • ');
}

/**
 * Get music suggestions for product ads
 */
export function suggestMusicForProductAd(productCategory: string, adType: 'video' | 'social'): MusicSuggestion[] {
  const categoryMoodMap: Record<string, MusicMood[]> = {
    electronics: ['professional', 'upbeat', 'energetic'],
    fashion: ['upbeat', 'inspiring'],
    beauty: ['calm', 'inspiring'],
    sports: ['energetic', 'upbeat'],
    food: ['upbeat', 'calm'],
    home: ['calm', 'professional'],
    business: ['professional', 'corporate'],
    default: ['upbeat', 'professional'],
  };
  
  const moods = categoryMoodMap[productCategory.toLowerCase()] || categoryMoodMap.default;
  const assets = getMusicAssets();
  const suggestions: MusicSuggestion[] = [];
  
  assets.forEach(asset => {
    let confidence = 0;
    
    if (moods.includes(asset.mood)) {
      confidence += 40;
    }
    
    if (adType === 'video' && asset.duration <= 60) {
      confidence += 20; // Prefer shorter tracks for ads
    }
    
    if (asset.isRoyaltyFree) {
      confidence += 10;
    }
    
    if (asset.bpm && asset.bpm >= 100 && asset.bpm <= 130) {
      confidence += 10; // Good tempo for ads
    }
    
    if (confidence > 30) {
      suggestions.push({
        musicId: asset.id,
        reason: `Perfect for ${productCategory} ${adType} ads`,
        confidence: Math.min(confidence, 100),
        matchedKeywords: [productCategory, adType],
      });
    }
  });
  
  return suggestions.sort((a, b) => b.confidence - a.confidence);
}

/**
 * Default audio settings
 */
export function getDefaultAudioSettings(): AudioSettings {
  try {
    const stored = localStorage.getItem(DEFAULT_AUDIO_SETTINGS_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.error('Error loading audio settings:', error);
  }
  
  return {
    volume: 70,
    fadeIn: 2,
    fadeOut: 3,
    autoDucking: true,
    normalizeAudio: true,
  };
}

/**
 * Save default audio settings
 */
export function saveDefaultAudioSettings(settings: AudioSettings): void {
  try {
    localStorage.setItem(DEFAULT_AUDIO_SETTINGS_KEY, JSON.stringify(settings));
  } catch (error) {
    console.error('Error saving audio settings:', error);
  }
}

/**
 * Trim music to match video duration
 */
export function trimMusicToVideoDuration(musicAsset: MusicAsset, videoDuration: number): MusicAsset {
  return {
    ...musicAsset,
    trimEnd: musicAsset.duration - videoDuration,
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Apply beat-sync to transitions
 */
export function detectBeats(bpm: number, duration: number): number[] {
  const beatsPerSecond = bpm / 60;
  const totalBeats = Math.floor(duration * beatsPerSecond);
  const beats: number[] = [];
  
  for (let i = 0; i < totalBeats; i++) {
    beats.push(i / beatsPerSecond);
  }
  
  return beats;
}

/**
 * Get music assets count
 */
export function getMusicAssetsCount(): number {
  return getMusicAssets().length;
}

/**
 * Clear all music assets (reset to demo library)
 */
export function clearMusicAssets(): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(DEMO_MUSIC_LIBRARY));
  } catch (error) {
    console.error('Error clearing music assets:', error);
  }
}

/**
 * Export music asset metadata (without File object)
 */
export function exportMusicAssetMetadata(asset: MusicAsset): Omit<MusicAsset, 'file'> {
  const { file, ...metadata } = asset;
  return metadata;
}
