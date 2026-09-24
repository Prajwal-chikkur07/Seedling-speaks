// Target languages for translation, keyed by language code.
export const LANG_LABELS = {
  'hi-IN': 'Hindi', 'bn-IN': 'Bengali', 'ta-IN': 'Tamil', 'te-IN': 'Telugu',
  'ml-IN': 'Malayalam', 'mr-IN': 'Marathi', 'gu-IN': 'Gujarati',
  'kn-IN': 'Kannada', 'pa-IN': 'Punjabi', 'or-IN': 'Odia',
};

// Name → code, for pickers that iterate by display name.
export const TARGET_LANGUAGES = Object.fromEntries(
  Object.entries(LANG_LABELS).map(([code, name]) => [name, code])
);

// Languages offered for video subtitles.
export const VIDEO_LANG_LABELS = {
  'hi-IN': 'Hindi', 'en-IN': 'English', 'kn-IN': 'Kannada',
  'ta-IN': 'Tamil', 'te-IN': 'Telugu', 'ml-IN': 'Malayalam',
  'bn-IN': 'Bengali', 'mr-IN': 'Marathi', 'gu-IN': 'Gujarati', 'pa-IN': 'Punjabi',
};
