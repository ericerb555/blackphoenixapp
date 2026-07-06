/**
 * Audio Beat Sync & Trimming Utility
 * Beat detection, sync points, and audio trimming for video editing
 */

import { MusicAsset } from './musicAssetManager';
import { VideoAsset } from './videoAssetManager';

export interface BeatMarker {
  time: number; // seconds
  strength: number; // 0-100
  isMajorBeat: boolean; // downbeat/measure start
  barNumber: number;
  beatInBar: number;
}

export interface SyncPoint {
  id: string;
  videoTime: number; // seconds in video
  musicTime: number; // seconds in music
  type: 'cut' | 'transition' | 'effect' | 'text';
  snapToBeat: boolean;
  beatMarker?: BeatMarker;
}

export interface TrimmedAudio {
  originalDuration: number;
  trimmedDuration: number;
  startTime: number;
  endTime: number;
  fadeIn: number;
  fadeOut: number;
  loops: number; // if audio shorter than video, how many times to loop
}

export interface BeatSyncSettings {
  enabled: boolean;
  snapThreshold: number; // seconds - how close to snap to beat
  autoAlignTransitions: boolean;
  visualizeBeatMarkers: boolean;
  syncToMajorBeatsOnly: boolean;
}

/**
 * Generate beat markers from BPM
 */
export function generateBeatMarkers(
  bpm: number,
  duration: number,
  beatsPerBar: number = 4
): BeatMarker[] {
  const beatDuration = 60 / bpm; // seconds per beat
  const totalBeats = Math.floor(duration / beatDuration);
  const markers: BeatMarker[] = [];
  
  for (let i = 0; i < totalBeats; i++) {
    const time = i * beatDuration;
    const beatInBar = (i % beatsPerBar) + 1;
    const barNumber = Math.floor(i / beatsPerBar) + 1;
    const isMajorBeat = beatInBar === 1;
    
    // Strength varies: downbeats are strongest
    let strength = 70;
    if (isMajorBeat) {
      strength = 100;
    } else if (beatInBar === 3) {
      strength = 85; // Secondary strong beat
    }
    
    markers.push({
      time,
      strength,
      isMajorBeat,
      barNumber,
      beatInBar,
    });
  }
  
  return markers;
}

/**
 * Find nearest beat to a given time
 */
export function findNearestBeat(
  time: number,
  beatMarkers: BeatMarker[],
  majorBeatsOnly: boolean = false
): BeatMarker | null {
  if (beatMarkers.length === 0) return null;
  
  const filteredBeats = majorBeatsOnly 
    ? beatMarkers.filter(b => b.isMajorBeat)
    : beatMarkers;
  
  if (filteredBeats.length === 0) return null;
  
  let nearest = filteredBeats[0];
  let minDistance = Math.abs(time - nearest.time);
  
  for (const beat of filteredBeats) {
    const distance = Math.abs(time - beat.time);
    if (distance < minDistance) {
      minDistance = distance;
      nearest = beat;
    }
  }
  
  return nearest;
}

/**
 * Snap time to nearest beat
 */
export function snapToBeat(
  time: number,
  beatMarkers: BeatMarker[],
  snapThreshold: number = 0.2,
  majorBeatsOnly: boolean = false
): number {
  const nearest = findNearestBeat(time, beatMarkers, majorBeatsOnly);
  if (!nearest) return time;
  
  const distance = Math.abs(time - nearest.time);
  if (distance <= snapThreshold) {
    return nearest.time;
  }
  
  return time;
}

/**
 * Generate sync points for video transitions
 */
export function generateAutoSyncPoints(
  video: VideoAsset,
  music: MusicAsset,
  beatMarkers: BeatMarker[]
): SyncPoint[] {
  const syncPoints: SyncPoint[] = [];
  const videoDuration = video.duration || 60;
  
  // Suggest cuts at major beats every 4-8 seconds
  const majorBeats = beatMarkers.filter(b => b.isMajorBeat);
  
  for (const beat of majorBeats) {
    if (beat.time >= videoDuration) break;
    
    // Add sync point every 2-3 bars
    if (beat.barNumber % 2 === 1 || beat.barNumber % 3 === 1) {
      syncPoints.push({
        id: `sync-${Date.now()}-${beat.time}`,
        videoTime: beat.time,
        musicTime: beat.time,
        type: 'transition',
        snapToBeat: true,
        beatMarker: beat,
      });
    }
  }
  
  return syncPoints;
}

/**
 * Trim audio to match video duration
 */
export function trimAudioToVideo(
  music: MusicAsset,
  videoDuration: number,
  options: {
    preferFadeOut?: boolean;
    allowLooping?: boolean;
    snapToBar?: boolean;
    beatsPerBar?: number;
  } = {}
): TrimmedAudio {
  const {
    preferFadeOut = true,
    allowLooping = true,
    snapToBar = true,
    beatsPerBar = 4,
  } = options;
  
  const musicDuration = music.duration;
  
  // If music is longer than video, trim it
  if (musicDuration >= videoDuration) {
    let endTime = videoDuration;
    
    // Optionally snap to bar end
    if (snapToBar && music.bpm) {
      const beatDuration = 60 / music.bpm;
      const barDuration = beatDuration * beatsPerBar;
      const nearestBar = Math.floor(videoDuration / barDuration) * barDuration;
      
      // Use nearest bar if close enough
      if (Math.abs(videoDuration - nearestBar) < beatDuration) {
        endTime = nearestBar;
      }
    }
    
    return {
      originalDuration: musicDuration,
      trimmedDuration: endTime,
      startTime: 0,
      endTime,
      fadeIn: music.fadeIn || 2,
      fadeOut: preferFadeOut ? (music.fadeOut || 3) : 0,
      loops: 1,
    };
  }
  
  // If music is shorter than video
  if (allowLooping) {
    const loops = Math.ceil(videoDuration / musicDuration);
    return {
      originalDuration: musicDuration,
      trimmedDuration: videoDuration,
      startTime: 0,
      endTime: musicDuration,
      fadeIn: music.fadeIn || 2,
      fadeOut: music.fadeOut || 3,
      loops,
    };
  } else {
    // Just use music as-is and video will be longer
    return {
      originalDuration: musicDuration,
      trimmedDuration: musicDuration,
      startTime: 0,
      endTime: musicDuration,
      fadeIn: music.fadeIn || 2,
      fadeOut: music.fadeOut || 3,
      loops: 1,
    };
  }
}

/**
 * Calculate optimal loop points for seamless music looping
 */
export function findLoopPoints(
  music: MusicAsset,
  beatMarkers: BeatMarker[]
): { start: number; end: number } | null {
  if (!music.bpm || beatMarkers.length === 0) return null;
  
  // Find a loop point that starts and ends on major beats
  const majorBeats = beatMarkers.filter(b => b.isMajorBeat);
  
  if (majorBeats.length < 2) return null;
  
  // Common loop lengths: 8, 16, 32 bars
  const loopLengths = [32, 16, 8, 4];
  
  for (const loopLength of loopLengths) {
    const possibleLoops = majorBeats.filter(
      (beat, idx) => {
        const endBeat = majorBeats.find(
          b => b.barNumber === beat.barNumber + loopLength
        );
        return endBeat !== undefined;
      }
    );
    
    if (possibleLoops.length > 0) {
      const start = possibleLoops[0];
      const end = majorBeats.find(
        b => b.barNumber === start.barNumber + loopLength
      );
      
      if (end) {
        return {
          start: start.time,
          end: end.time,
        };
      }
    }
  }
  
  return null;
}

/**
 * Analyze beat strength for visualization
 */
export function getBeatStrengthWaveform(
  beatMarkers: BeatMarker[],
  duration: number,
  resolution: number = 100
): number[] {
  const waveform: number[] = new Array(resolution).fill(0);
  const timePerPoint = duration / resolution;
  
  for (let i = 0; i < resolution; i++) {
    const time = i * timePerPoint;
    
    // Find beats within this time segment
    const nearBeats = beatMarkers.filter(
      b => b.time >= time && b.time < time + timePerPoint
    );
    
    if (nearBeats.length > 0) {
      waveform[i] = Math.max(...nearBeats.map(b => b.strength));
    }
  }
  
  return waveform;
}

/**
 * Generate beat grid for timeline visualization
 */
export function generateBeatGrid(
  beatMarkers: BeatMarker[],
  duration: number
): {
  majorBeats: number[];
  minorBeats: number[];
  bars: number[];
} {
  const majorBeats: number[] = [];
  const minorBeats: number[] = [];
  const bars: number[] = [];
  
  const processedBars = new Set<number>();
  
  for (const beat of beatMarkers) {
    if (beat.time > duration) break;
    
    if (beat.isMajorBeat) {
      majorBeats.push(beat.time);
      
      if (!processedBars.has(beat.barNumber)) {
        bars.push(beat.time);
        processedBars.add(beat.barNumber);
      }
    } else {
      minorBeats.push(beat.time);
    }
  }
  
  return { majorBeats, minorBeats, bars };
}

/**
 * Suggest transition points based on beat analysis
 */
export function suggestTransitionPoints(
  beatMarkers: BeatMarker[],
  videoDuration: number,
  minInterval: number = 3, // minimum seconds between transitions
  maxTransitions: number = 10
): number[] {
  const transitions: number[] = [];
  const majorBeats = beatMarkers.filter(
    b => b.isMajorBeat && b.time < videoDuration
  );
  
  let lastTransition = 0;
  
  for (const beat of majorBeats) {
    if (transitions.length >= maxTransitions) break;
    
    if (beat.time - lastTransition >= minInterval) {
      transitions.push(beat.time);
      lastTransition = beat.time;
    }
  }
  
  return transitions;
}

/**
 * Calculate sync offset between video and music
 */
export function calculateSyncOffset(
  videoStartTime: number,
  musicStartTime: number
): number {
  return musicStartTime - videoStartTime;
}

/**
 * Apply beat sync to existing sync points
 */
export function alignSyncPointsToBeats(
  syncPoints: SyncPoint[],
  beatMarkers: BeatMarker[],
  snapThreshold: number = 0.2
): SyncPoint[] {
  return syncPoints.map(point => {
    if (!point.snapToBeat) return point;
    
    const nearestBeat = findNearestBeat(point.musicTime, beatMarkers);
    if (!nearestBeat) return point;
    
    const distance = Math.abs(point.musicTime - nearestBeat.time);
    if (distance <= snapThreshold) {
      return {
        ...point,
        musicTime: nearestBeat.time,
        videoTime: nearestBeat.time,
        beatMarker: nearestBeat,
      };
    }
    
    return point;
  });
}

/**
 * Get beat info at specific time
 */
export function getBeatInfoAtTime(
  time: number,
  beatMarkers: BeatMarker[]
): BeatMarker | null {
  return findNearestBeat(time, beatMarkers);
}

/**
 * Export beat sync data
 */
export interface BeatSyncExport {
  musicId: string;
  bpm: number;
  beatsPerBar: number;
  beatMarkers: BeatMarker[];
  syncPoints: SyncPoint[];
  trimSettings: TrimmedAudio;
}

export function exportBeatSyncData(
  music: MusicAsset,
  video: VideoAsset,
  beatMarkers: BeatMarker[],
  syncPoints: SyncPoint[],
  trimSettings: TrimmedAudio
): BeatSyncExport {
  return {
    musicId: music.id,
    bpm: music.bpm || 120,
    beatsPerBar: 4,
    beatMarkers,
    syncPoints,
    trimSettings,
  };
}
