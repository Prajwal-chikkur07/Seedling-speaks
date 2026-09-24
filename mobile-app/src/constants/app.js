import Constants from 'expo-constants';

// Single source of truth for the displayed version: app.json → expo.version.
export const APP_VERSION = Constants.expoConfig?.version || '';
