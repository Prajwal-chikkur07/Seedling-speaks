import { Alert, Linking } from 'react-native';
import { Audio } from 'expo-av';

// Ask for mic permission. If it was permanently denied, offer to open Settings
// instead of failing silently. Returns true when recording may proceed.
export async function ensureMicPermission() {
  const perm = await Audio.requestPermissionsAsync();
  if (perm.granted) return true;
  if (perm.canAskAgain === false) {
    Alert.alert(
      'Microphone access needed',
      'Microphone access is turned off for SeedlingSpeaks. Enable it in Settings to record.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Open Settings', onPress: () => Linking.openSettings().catch(() => {}) },
      ],
    );
  } else {
    Alert.alert('Permission needed', 'Microphone access is required.');
  }
  return false;
}

export async function startRecordingSession(preset = Audio.RecordingOptionsPresets.HIGH_QUALITY) {
  await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
  const { recording } = await Audio.Recording.createAsync(preset);
  return recording;
}

// Stop + unload a recording, never throwing. Returns the file URI (or null).
export async function stopRecordingSafely(recording) {
  if (!recording) return null;
  let uri = null;
  try {
    uri = recording.getURI();
    await recording.stopAndUnloadAsync();
  } catch (e) {
    // Already stopped/unloaded, or the recorder errored — nothing more to do.
    if (__DEV__) console.warn('[recording] stopAndUnloadAsync failed', e?.message || e);
  }
  return uri;
}

// Hand the audio session back to playback so other audio isn't routed to the earpiece.
export async function resetAudioMode() {
  try {
    await Audio.setAudioModeAsync({ allowsRecordingIOS: false });
  } catch {}
}
