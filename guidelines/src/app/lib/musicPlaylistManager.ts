/**
 * Music Playlist Manager
 * Organize and manage music track collections
 */

import { MusicAsset } from './musicAssetManager';

export interface MusicPlaylist {
  id: string;
  name: string;
  description?: string;
  trackIds: string[];
  mood?: string;
  category?: 'product-ads' | 'video-content' | 'social-media' | 'corporate' | 'custom';
  isDefault?: boolean;
  coverColor?: string;
  createdAt: string;
  updatedAt: string;
}

const STORAGE_KEY = 'music_playlists';

// Default playlists
const DEFAULT_PLAYLISTS: MusicPlaylist[] = [
  {
    id: 'playlist-product-ads',
    name: 'Product Ads - Energetic',
    description: 'High-energy tracks perfect for product advertisements',
    trackIds: ['music-upbeat-1', 'music-energetic-1', 'music-tech-1'],
    category: 'product-ads',
    isDefault: true,
    coverColor: '#ea580c',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'playlist-corporate',
    name: 'Corporate & Professional',
    description: 'Professional background music for business content',
    trackIds: ['music-professional-1', 'music-upbeat-1', 'music-tech-1'],
    category: 'corporate',
    isDefault: true,
    coverColor: '#3b82f6',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'playlist-social',
    name: 'Social Media - Trending',
    description: 'Catchy tracks for social media posts and stories',
    trackIds: ['music-upbeat-1', 'music-energetic-1', 'music-inspiring-1'],
    category: 'social-media',
    isDefault: true,
    coverColor: '#8b5cf6',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'playlist-cinematic',
    name: 'Cinematic & Epic',
    description: 'Dramatic music for impactful videos',
    trackIds: ['music-cinematic-1', 'music-inspiring-1'],
    category: 'video-content',
    isDefault: true,
    coverColor: '#dc2626',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'playlist-calm',
    name: 'Calm & Relaxing',
    description: 'Soothing background music',
    trackIds: ['music-calm-1', 'music-jazz-1'],
    category: 'custom',
    isDefault: true,
    coverColor: '#10b981',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

/**
 * Get all playlists from storage
 */
export function getPlaylists(): MusicPlaylist[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
    // Initialize with default playlists
    localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_PLAYLISTS));
    return DEFAULT_PLAYLISTS;
  } catch (error) {
    console.error('Error loading playlists:', error);
    return DEFAULT_PLAYLISTS;
  }
}

/**
 * Get a single playlist by ID
 */
export function getPlaylist(id: string): MusicPlaylist | null {
  const playlists = getPlaylists();
  return playlists.find(playlist => playlist.id === id) || null;
}

/**
 * Save a playlist
 */
export function savePlaylist(playlist: MusicPlaylist): void {
  try {
    const playlists = getPlaylists();
    const existingIndex = playlists.findIndex(p => p.id === playlist.id);
    
    if (existingIndex >= 0) {
      // Update existing
      playlists[existingIndex] = {
        ...playlist,
        updatedAt: new Date().toISOString(),
      };
    } else {
      // Add new
      playlists.push({
        ...playlist,
        createdAt: playlist.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify(playlists));
  } catch (error) {
    console.error('Error saving playlist:', error);
    throw new Error('Failed to save playlist');
  }
}

/**
 * Create a new playlist
 */
export function createPlaylist(
  name: string,
  description?: string,
  category?: MusicPlaylist['category']
): MusicPlaylist {
  const playlist: MusicPlaylist = {
    id: `playlist-${Date.now()}`,
    name,
    description,
    trackIds: [],
    category,
    isDefault: false,
    coverColor: generateRandomColor(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  
  savePlaylist(playlist);
  return playlist;
}

/**
 * Delete a playlist
 */
export function deletePlaylist(id: string): void {
  try {
    const playlists = getPlaylists();
    const playlist = playlists.find(p => p.id === id);
    
    if (playlist?.isDefault) {
      throw new Error('Cannot delete default playlists');
    }
    
    const filtered = playlists.filter(p => p.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
  } catch (error) {
    console.error('Error deleting playlist:', error);
    throw error;
  }
}

/**
 * Add track to playlist
 */
export function addTrackToPlaylist(playlistId: string, trackId: string): void {
  const playlist = getPlaylist(playlistId);
  if (!playlist) {
    throw new Error('Playlist not found');
  }
  
  if (!playlist.trackIds.includes(trackId)) {
    playlist.trackIds.push(trackId);
    savePlaylist(playlist);
  }
}

/**
 * Remove track from playlist
 */
export function removeTrackFromPlaylist(playlistId: string, trackId: string): void {
  const playlist = getPlaylist(playlistId);
  if (!playlist) {
    throw new Error('Playlist not found');
  }
  
  playlist.trackIds = playlist.trackIds.filter(id => id !== trackId);
  savePlaylist(playlist);
}

/**
 * Reorder tracks in playlist
 */
export function reorderPlaylistTracks(playlistId: string, trackIds: string[]): void {
  const playlist = getPlaylist(playlistId);
  if (!playlist) {
    throw new Error('Playlist not found');
  }
  
  playlist.trackIds = trackIds;
  savePlaylist(playlist);
}

/**
 * Get playlists by category
 */
export function getPlaylistsByCategory(category: MusicPlaylist['category']): MusicPlaylist[] {
  const playlists = getPlaylists();
  return playlists.filter(p => p.category === category);
}

/**
 * Get tracks from playlist
 */
export function getPlaylistTracks(playlistId: string, allTracks: MusicAsset[]): MusicAsset[] {
  const playlist = getPlaylist(playlistId);
  if (!playlist) {
    return [];
  }
  
  return playlist.trackIds
    .map(trackId => allTracks.find(t => t.id === trackId))
    .filter((track): track is MusicAsset => track !== undefined);
}

/**
 * Get playlist duration
 */
export function getPlaylistDuration(playlistId: string, allTracks: MusicAsset[]): number {
  const tracks = getPlaylistTracks(playlistId, allTracks);
  return tracks.reduce((total, track) => total + track.duration, 0);
}

/**
 * Search playlists
 */
export function searchPlaylists(query: string): MusicPlaylist[] {
  const playlists = getPlaylists();
  const lowerQuery = query.toLowerCase();
  
  return playlists.filter(playlist => {
    const nameMatch = playlist.name.toLowerCase().includes(lowerQuery);
    const descMatch = playlist.description?.toLowerCase().includes(lowerQuery);
    return nameMatch || descMatch;
  });
}

/**
 * Duplicate playlist
 */
export function duplicatePlaylist(playlistId: string): MusicPlaylist {
  const original = getPlaylist(playlistId);
  if (!original) {
    throw new Error('Playlist not found');
  }
  
  const duplicate: MusicPlaylist = {
    ...original,
    id: `playlist-${Date.now()}`,
    name: `${original.name} (Copy)`,
    isDefault: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  
  savePlaylist(duplicate);
  return duplicate;
}

/**
 * Get playlists count
 */
export function getPlaylistsCount(): number {
  return getPlaylists().length;
}

/**
 * Reset to default playlists
 */
export function resetToDefaultPlaylists(): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_PLAYLISTS));
  } catch (error) {
    console.error('Error resetting playlists:', error);
  }
}

/**
 * Generate random color for playlist cover
 */
function generateRandomColor(): string {
  const colors = [
    '#ea580c', // orange
    '#3b82f6', // blue
    '#8b5cf6', // purple
    '#10b981', // green
    '#f59e0b', // amber
    '#ec4899', // pink
    '#06b6d4', // cyan
    '#ef4444', // red
  ];
  return colors[Math.floor(Math.random() * colors.length)];
}

/**
 * Export playlist metadata
 */
export function exportPlaylist(playlistId: string): MusicPlaylist | null {
  return getPlaylist(playlistId);
}

/**
 * Import playlist
 */
export function importPlaylist(playlistData: Omit<MusicPlaylist, 'id' | 'createdAt' | 'updatedAt'>): MusicPlaylist {
  const playlist: MusicPlaylist = {
    ...playlistData,
    id: `playlist-${Date.now()}`,
    isDefault: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  
  savePlaylist(playlist);
  return playlist;
}
