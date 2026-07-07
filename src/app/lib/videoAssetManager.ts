/**
 * Video Asset Manager
 * Shared utility for managing video assets between Content Center and Ad Creator
 */

export interface VideoAsset {
  id: string;
  title: string;
  file?: File;
  url: string;
  thumbnailUrl?: string;
  duration?: number;
  size: {
    width: number;
    height: number;
  };
  aiSuggestions?: {
    trimPoints: Array<{
      id: number;
      start: number;
      end: number;
      reason: string;
    }>;
    effects: Array<{
      id: number;
      type: string;
      start: number;
      end: number;
      intensity: number;
    }>;
    transitions: Array<{
      id: number;
      type: string;
      between: number[];
      duration: number;
    }>;
  };
  appliedEdits?: {
    trimPoints: boolean;
    effects: boolean;
    transitions: boolean;
  };
  // Music and audio properties
  music?: {
    musicId: string;
    volume: number;
    fadeIn: number;
    fadeOut: number;
    trimStart?: number;
    trimEnd?: number;
    autoDucking: boolean;
  };
  audioEnhancements?: {
    normalizeAudio: boolean;
    removeNoise: boolean;
    enhanceVoice: boolean;
  };
  createdAt: string;
  updatedAt: string;
  source: 'content-center' | 'upload' | 'import';
}

const STORAGE_KEY = 'video_assets_library';

/**
 * Get all video assets from storage
 */
export function getVideoAssets(): VideoAsset[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error('Error loading video assets:', error);
    return [];
  }
}

/**
 * Get a single video asset by ID
 */
export function getVideoAsset(id: string): VideoAsset | null {
  const assets = getVideoAssets();
  return assets.find(asset => asset.id === id) || null;
}

/**
 * Save a video asset to the library
 */
export function saveVideoAsset(asset: VideoAsset): void {
  try {
    const assets = getVideoAssets();
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
    console.error('Error saving video asset:', error);
    throw new Error('Failed to save video asset');
  }
}

/**
 * Delete a video asset
 */
export function deleteVideoAsset(id: string): void {
  try {
    const assets = getVideoAssets();
    const filtered = assets.filter(asset => asset.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
  } catch (error) {
    console.error('Error deleting video asset:', error);
    throw new Error('Failed to delete video asset');
  }
}

/**
 * Get video assets filtered by source
 */
export function getVideoAssetsBySource(source: VideoAsset['source']): VideoAsset[] {
  const assets = getVideoAssets();
  return assets.filter(asset => asset.source === source);
}

/**
 * Clear all video assets
 */
export function clearVideoAssets(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.error('Error clearing video assets:', error);
  }
}

/**
 * Export video asset metadata (without File object)
 */
export function exportVideoAssetMetadata(asset: VideoAsset): Omit<VideoAsset, 'file'> {
  const { file, ...metadata } = asset;
  return metadata;
}

/**
 * Get video assets count
 */
export function getVideoAssetsCount(): number {
  return getVideoAssets().length;
}