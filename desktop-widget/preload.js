// Single preload shared by every widget window. Renderers run with
// contextIsolation + sandbox and only get the IPC channels listed here.
const { contextBridge, ipcRenderer } = require('electron');

const SEND_CHANNELS = new Set([
  // overlay.js
  'resize-overlay', 'quit-app', 'hide-overlay', 'bubble-clicked', 'smart-send',
  'recording-result', 'get-active-url', 'log-transcription',
  // bubble.html
  'bubble-drag', 'process-audio', 'cancel-recording', 'show-bubble-menu',
  // dashboard.html
  'enable-widget', 'disable-widget', 'sign-out',
  // login.html
  'open-browser-auth',
  // click-overlay.html
  'click-translate', 'stop-click-mode',
  // region-select.html
  'region-selected', 'region-cancelled',
  // screen-overlay.html
  'stop-screen-mode',
  // toast.html
  'ext-action', 'hide-toast',
]);

const INVOKE_CHANNELS = new Set([
  'get-bubble-pos', 'get-widget-enabled', 'get-user-info',
  'backend-post-json', 'backend-translate-audio',
]);

const RECEIVE_CHANNELS = new Set([
  // overlay.js
  'start-recording', 'stop-recording', 'cancel-recording', 'show-result',
  'live-transcript', 'set-config', 'active-url',
  // bubble.html
  'toggle-recording', 'recording-state', 'processing-state', 'processing-done',
  // dashboard.html
  'widget-state-changed',
  // login.html
  'auth-failed',
  // click-overlay.html / region-select.html
  'init',
  // screen-overlay.html
  'clear', 'show-translations', 'show-click-result', 'start-click-mode', 'show-click-spinner',
  // toast.html
  'toast-data',
  // hint window
  'hint-text',
]);

contextBridge.exposeInMainWorld('widget', {
  send(channel, data) {
    if (SEND_CHANNELS.has(channel)) ipcRenderer.send(channel, data);
  },
  invoke(channel, ...args) {
    if (!INVOKE_CHANNELS.has(channel)) return Promise.reject(new Error('blocked channel'));
    return ipcRenderer.invoke(channel, ...args);
  },
  on(channel, callback) {
    if (RECEIVE_CHANNELS.has(channel)) ipcRenderer.on(channel, (_event, ...args) => callback(...args));
  },
});
