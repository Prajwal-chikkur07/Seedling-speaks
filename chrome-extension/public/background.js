// Background service worker for Voice Translation Extension

// Backend base URL — the only place it is defined (content.js goes through here).
// Must also be covered by host_permissions in manifest.json.
const BACKEND_URL = 'http://127.0.0.1:8001';
const API_BASE = `${BACKEND_URL}/api`;

// Clicking the toolbar icon opens/toggles the sidebar panel on the active tab
chrome.action.onClicked.addListener((tab) => {
  if (tab.id) {
    chrome.tabs.sendMessage(tab.id, { type: 'TOGGLE_SIDEBAR' }).catch(() => {});
  }
});

// Create context menu on install
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'translate-selection',
    title: 'Translate with Voice Translation',
    contexts: ['selection'],
  });

  chrome.contextMenus.create({
    id: 'rewrite-tone-selection',
    title: 'Rewrite Tone with Voice Translation',
    contexts: ['selection'],
  });
});

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (!info.selectionText) return;

  if (info.menuItemId === 'translate-selection' || info.menuItemId === 'rewrite-tone-selection') {
    chrome.storage.local.set({
      pendingAction: {
        type: info.menuItemId === 'translate-selection' ? 'translate' : 'rewrite',
        text: info.selectionText,
        timestamp: Date.now(),
      },
    });

    chrome.tabs.sendMessage(tab.id, {
      type: 'SHOW_NOTIFICATION',
      message: 'Open the extension popup to complete the action.',
    });
  }
});

// ========== API PROXY ==========
// Content scripts call the backend through here: the service worker has host
// permissions, so page CORS rules don't apply.

async function apiPost(path, init) {
  const res = await fetch(`${API_BASE}${path}`, { method: 'POST', ...init });
  if (!res.ok) throw new Error(await res.text());
  return res;
}

async function postJson(path, body) {
  const res = await apiPost(path, {
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return res.json();
}

async function apiTranslateAudio(base64Data, mimeType) {
  const byteString = atob(base64Data.split(',')[1]);
  const ia = new Uint8Array(byteString.length);
  for (let i = 0; i < byteString.length; i++) ia[i] = byteString.charCodeAt(i);
  const formData = new FormData();
  formData.append('file', new Blob([ia], { type: mimeType || 'audio/webm' }), 'recording.webm');
  const res = await apiPost('/translate-audio', { body: formData });
  return res.json();
}

async function apiTextToSpeech(text, language) {
  const res = await apiPost('/text-to-speech', {
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, language }),
  });
  const blob = await res.blob();
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.readAsDataURL(blob);
  });
}

// message.type -> backend call; the result is sent back as { success, data }
const API_ROUTES = {
  API_TRANSLATE_TEXT: (m) => postJson('/translate-text', { text: m.text, target_language: m.targetLanguage }),
  API_REWRITE_TONE: (m) => postJson('/rewrite-tone', { text: m.text, tone: m.tone, user_override: m.userOverride || null }),
  API_TRANSLATE_AUDIO: (m) => apiTranslateAudio(m.audioData, m.mimeType),
  API_SEND_EMAIL: (m) => postJson('/send/email', m.data),
  API_SEND_SLACK: (m) => postJson('/send/slack', m.data),
  API_SHARE_LINKEDIN: (m) => postJson('/send/linkedin', m.data),
};

function sendToActiveTab(message, fallback, sendResponse) {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (!tabs[0]?.id) {
      sendResponse(fallback);
      return;
    }

    chrome.tabs.sendMessage(tabs[0].id, message, (response) => {
      if (chrome.runtime.lastError) {
        sendResponse({ ...fallback, error: chrome.runtime.lastError.message });
        return;
      }
      sendResponse(response || fallback);
    });
  });
}

// ========== MESSAGE HANDLER ==========

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // Only accept messages from this extension's own pages/content scripts
  if (sender.id !== chrome.runtime.id) return false;

  if (message.type === 'GET_PENDING_ACTION') {
    chrome.storage.local.get('pendingAction', (result) => {
      sendResponse(result.pendingAction || null);
      chrome.storage.local.remove('pendingAction');
    });
    return true;
  }

  if (message.type === 'GET_SELECTED_TEXT') {
    sendToActiveTab({ type: 'GET_SELECTION' }, { text: '' }, sendResponse);
    return true;
  }

  if (message.type === 'TOGGLE_ACTIVE') {
    sendToActiveTab({ type: 'TOGGLE_ACTIVE', active: message.active }, { active: message.active }, sendResponse);
    return true;
  }

  if (message.type === 'UPDATE_SETTINGS') {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        chrome.tabs.sendMessage(tabs[0].id, { type: 'UPDATE_SETTINGS', language: message.language, tone: message.tone });
      }
    });
    return;
  }

  if (message.type === 'TRANSLATE_ALL_PAGE') {
    sendToActiveTab({ type: 'TRANSLATE_ALL_PAGE' }, { started: true }, sendResponse);
    return true;
  }

  if (message.type === 'STOP_TRANSLATION') {
    sendToActiveTab({ type: 'STOP_TRANSLATION' }, { done: true }, sendResponse);
    return true;
  }

  if (message.type === 'TRANSLATE_SELECTION_FROM_POPUP') {
    sendToActiveTab({ type: 'TRANSLATE_SELECTION_FROM_POPUP' }, { started: true }, sendResponse);
    return true;
  }

  // ===== API PROXY CALLS =====
  if (Object.hasOwn(API_ROUTES, message.type)) {
    API_ROUTES[message.type](message)
      .then((data) => sendResponse({ success: true, data }))
      .catch((err) => sendResponse({ success: false, error: err.message }));
    return true;
  }
  if (message.type === 'API_TEXT_TO_SPEECH') {
    apiTextToSpeech(message.text, message.language)
      .then((dataUrl) => sendResponse({ success: true, dataUrl }))
      .catch((err) => sendResponse({ success: false, error: err.message }));
    return true;
  }

  if (message.type === 'DEACTIVATED_FROM_PAGE') { return; }
});
