export interface StoryMusicPreset {
  id: string;
  title: string;
  artist: string;
  url: string;
  genre: string;
}

/**
 * Curated, legal, 100% royalty-free instrumental backsound presets for Stories.
 * Hosted locally in public/audio/ to guarantee zero CORS issues, instant playback,
 * and reliable offline/online performance across all modern mobile and desktop browsers.
 */
export const STORY_MUSIC_PRESETS: StoryMusicPreset[] = [
  {
    id: 'lofi-study',
    title: 'Lofi Study Beats',
    artist: 'Chill Instrumental',
    url: '/audio/lofi-study.wav',
    genre: 'Lo-Fi',
  },
  {
    id: 'acoustic-breeze',
    title: 'Acoustic Breeze',
    artist: 'Warm Guitar',
    url: '/audio/acoustic-breeze.wav',
    genre: 'Acoustic',
  },
  {
    id: 'piano-reflection',
    title: 'Piano Reflection',
    artist: 'Soft Melody',
    url: '/audio/piano-reflection.wav',
    genre: 'Piano',
  },
  {
    id: 'synthwave-night',
    title: 'Synthwave Night',
    artist: 'Cyber Groove',
    url: '/audio/synthwave-night.wav',
    genre: 'Synthwave',
  },
  {
    id: 'ambient-dream',
    title: 'Ambient Dream',
    artist: 'Calm Atmosphere',
    url: '/audio/ambient-dream.wav',
    genre: 'Ambient',
  },
];
