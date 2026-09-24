const { app, BrowserWindow, globalShortcut, ipcMain, screen, shell } = require('electron');
const http = require('http');
const { execFile } = require('child_process');
const crypto = require('crypto');
const os = require('os');
const path = require('path');
const fs = require('fs');

let bubbleWin = null;
let overlayWin = null;
let tray = null; // Menu bar tray
let toastWin = null;
let screenOverlayWin = null;
let regionSelectWin = null;
let loginWin = null;
let dashboardWin = null;
let isOverlayOpen = false;
let isBubbleEnabled = true; // auto-enabled — no web app needed
let toastTimer = null;
let isClickModeActive = false;
let clickModeLang = 'hi-IN';

// ── Endpoints / ports (single source of truth) ───────────────────────────────
const BACKEND_URL = process.env.SEEDLING_BACKEND_URL || 'http://127.0.0.1:8001';
const WEB_APP_URL = 'https://seedlingspeaks.vercel.app';
const CONTROL_PORT = 27182;
// Web origins allowed to talk to the local control server
const ALLOWED_ORIGINS = new Set([
  WEB_APP_URL,
  'http://localhost:5173', 'http://127.0.0.1:5173',
  'http://localhost:3000', 'http://127.0.0.1:3000',
]);
// JSON endpoints the overlay renderer may call through the main process
const RENDERER_JSON_PATHS = new Set(['/api/translate-text', '/api/suggest-tone', '/api/rewrite-tone']);

// Every window: isolated, sandboxed renderer; preload.js exposes window.widget
const SECURE_PREFS = {
  preload: path.join(__dirname, 'preload.js'),
  contextIsolation: true,
  nodeIntegration: false,
  sandbox: true,
};

// ── Async helpers (never block the main process) ─────────────────────────────
function runFile(cmd, args, opts = {}) {
  return new Promise((resolve) => {
    execFile(cmd, args, { encoding: 'utf8', ...opts }, (error, stdout, stderr) => {
      resolve({ error, stdout: stdout || '', stderr: stderr || '' });
    });
  });
}

async function backendFetch(pathname, init = {}, timeoutMs = 30000) {
  const res = await fetch(BACKEND_URL + pathname, { ...init, signal: AbortSignal.timeout(timeoutMs) });
  if (!res.ok) {
    let detail = '';
    try { const d = await res.json(); if (typeof d.detail === 'string') detail = d.detail; } catch { }
    throw new Error(detail || `HTTP ${res.status}`);
  }
  return res.json();
}

function postJson(pathname, body, { auth = false, timeoutMs = 30000 } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (auth) headers.Authorization = `Bearer ${(currentUser && currentUser.token) || ''}`;
  return backendFetch(pathname, { method: 'POST', headers, body: JSON.stringify(body) }, timeoutMs);
}

function translateAudio(bytes) {
  const form = new FormData();
  form.append('file', new Blob([bytes], { type: 'audio/webm' }), 'recording.webm');
  return backendFetch('/api/translate-audio', { method: 'POST', body: form }, 60000);
}

// ── Auth state ────────────────────────────────────────────────────────────────
let currentUser = null; // { clerkId, email, firstName, lastName, token }
let AUTH_FILE = path.join(os.homedir(), '.seedlingspeaks-auth.json');

function loadAuth() {
  try {
    try { AUTH_FILE = path.join(app.getPath('userData'), 'auth.json'); } catch { }
    if (fs.existsSync(AUTH_FILE)) {
      const saved = JSON.parse(fs.readFileSync(AUTH_FILE, 'utf8'));
      if (saved && saved.clerkId) {
        currentUser = saved;
        return true;
      }
    }
  } catch { }
  return false;
}

function saveAuth(user) {
  currentUser = user;
  try { fs.writeFileSync(AUTH_FILE, JSON.stringify(user), 'utf8'); } catch { }
}

function clearAuth() {
  currentUser = null;
  try { if (fs.existsSync(AUTH_FILE)) fs.unlinkSync(AUTH_FILE); } catch { }
}

// ── Recording state (managed in main process) ─────────────────────────────────
let isRecording = false;

let widgetConfig = { mode: 'nativeToEnglish', languages: ['hi-IN'] };

// ── Persist widget config to disk ─────────────────────────────────────────────
// CONFIG_FILE is resolved after app is ready (app.getPath needs ready state)
let CONFIG_FILE = path.join(os.homedir(), '.seedlingspeaks-widget-config.json');

function loadWidgetConfig() {
  try {
    // Resolve to userData path once app is ready
    try { CONFIG_FILE = path.join(app.getPath('userData'), 'widget-config.json'); } catch { }
    if (fs.existsSync(CONFIG_FILE)) {
      const saved = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
      if (saved && Array.isArray(saved.languages) && saved.languages.length > 0) {
        widgetConfig = { mode: 'nativeToEnglish', languages: saved.languages };
      }
    }
  } catch { }
}

function saveWidgetConfig() {
  try { fs.writeFileSync(CONFIG_FILE, JSON.stringify(widgetConfig), 'utf8'); } catch { }
}

// ── Control server ────────────────────────────────────────────────────────────
// Local HTTP API used by the web app. Only allowlisted browser origins are
// answered, the Host header must be our loopback name (blocks DNS rebinding),
// and state-changing routes are POST-only.
//
// /auth-callback contract (web DesktopAuth page):
//   POST http://127.0.0.1:27182/auth-callback, Content-Type: application/json
//   body: { id, email, firstName, lastName, token, state }
//   `state` must echo the `state` query param from the /desktop-auth URL the
//   widget opened. It is optional for now (older web builds omit it), but a
//   sign-in must have been started from this widget and, if sent, must match.
let pendingAuthState = null; // { value, expires }
const AUTH_STATE_TTL_MS = 10 * 60 * 1000;

function sendJson(res, status, obj) {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(obj));
}

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', c => { body += c; if (body.length > 64 * 1024) req.destroy(); });
    req.on('end', () => { try { resolve(JSON.parse(body)); } catch (e) { reject(e); } });
    req.on('error', reject);
  });
}

function authStateMatches(state) {
  if (!pendingAuthState || Date.now() > pendingAuthState.expires) return false;
  if (state === undefined || state === null || state === '') return true; // legacy web page
  const a = Buffer.from(String(state));
  const b = Buffer.from(pendingAuthState.value);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

function setBubbleEnabled(enabled) {
  isBubbleEnabled = enabled;
  if (enabled) { if (bubbleWin) bubbleWin.show(); }
  else { if (bubbleWin) bubbleWin.hide(); hideOverlay(); }
}

function startControlServer() {
  const server = http.createServer(async (req, res) => {
    const origin = req.headers.origin;
    const host = req.headers.host;
    const hostOk = host === `127.0.0.1:${CONTROL_PORT}` || host === `localhost:${CONTROL_PORT}`;
    if (!hostOk || !ALLOWED_ORIGINS.has(origin)) {
      sendJson(res, 403, { error: 'forbidden' });
      return;
    }

    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
      // Chrome Private Network Access preflight (public site -> loopback)
      res.setHeader('Access-Control-Allow-Private-Network', 'true');
      res.writeHead(204);
      res.end();
      return;
    }

    const route = `${req.method} ${req.url.split('?')[0]}`;
    try {
      switch (route) {
        case 'GET /status':
          return sendJson(res, 200, { enabled: isBubbleEnabled });
        case 'GET /config':
          return sendJson(res, 200, widgetConfig);
        case 'POST /config': {
          const inc = await readJsonBody(req);
          widgetConfig = {
            mode: 'nativeToEnglish',
            languages: Array.isArray(inc.languages) && inc.languages.length > 0 ? inc.languages : ['hi-IN'],
          };
          saveWidgetConfig();
          if (overlayWin) overlayWin.webContents.send('set-config', widgetConfig);
          return sendJson(res, 200, widgetConfig);
        }
        case 'POST /enable':
          setBubbleEnabled(true);
          return sendJson(res, 200, { enabled: true });
        case 'POST /disable':
          setBubbleEnabled(false);
          return sendJson(res, 200, { enabled: false });
        case 'POST /toggle':
          setBubbleEnabled(!isBubbleEnabled);
          return sendJson(res, 200, { enabled: isBubbleEnabled });
        case 'POST /auth-callback': {
          const userData = await readJsonBody(req);
          if (!authStateMatches(userData && userData.state)) {
            return sendJson(res, 403, { error: 'invalid or expired sign-in request' });
          }
          if (!userData.id) return sendJson(res, 400, { error: 'invalid user data' });
          pendingAuthState = null; // one-time use
          saveAuth({
            clerkId: userData.id,
            email: userData.email,
            firstName: userData.firstName || '',
            lastName: userData.lastName || '',
            token: userData.token,
          });
          onAuthSuccess();
          return sendJson(res, 200, { status: 'ok' });
        }
        default:
          if (['/enable', '/disable', '/toggle', '/auth-callback'].includes(req.url.split('?')[0])) {
            return sendJson(res, 405, { error: 'method not allowed' });
          }
          return sendJson(res, 404, { error: 'not found' });
      }
    } catch {
      sendJson(res, 400, { error: 'bad payload' });
    }
  });

  let retries = 0;
  server.on('error', (e) => {
    if (e.code === 'EADDRINUSE' && retries < 5) {
      retries++;
      console.warn(`Port ${CONTROL_PORT} in use — retrying in 2s (${retries}/5)`);
      setTimeout(() => server.listen(CONTROL_PORT, '127.0.0.1'), 2000);
    } else {
      console.error('Control server failed to start:', e.message);
    }
  });
  server.listen(CONTROL_PORT, '127.0.0.1', () => console.log(`Control server: http://127.0.0.1:${CONTROL_PORT}`));
}

// ── Tray (Menu Bar) ───────────────────────────────────────────────────────────
function createTray() {
  const { Tray, Menu } = require('electron');
  // Use the same icon.png for the tray (Electron will scale it)
  tray = new Tray(path.join(__dirname, 'icon.png'));
  updateTrayMenu();
  tray.setToolTip('SeedlingSpeaks Widget');
}

function updateTrayMenu() {
  const { Menu } = require('electron');
  const items = [
    { label: 'SeedlingSpeaks Widget', enabled: false },
    { type: 'separator' },
  ];

  if (currentUser) {
    items.push(
      { label: `Signed in as ${currentUser.email || 'User'}`, enabled: false },
      { type: 'separator' },
      { label: 'Dashboard', click: () => createDashboardWindow() },
      {
        label: 'Enable Floating Widget',
        type: 'checkbox',
        checked: isBubbleEnabled,
        click: () => toggleWidgetState()
      },
      { type: 'separator' },
      { label: 'Open Settings', click: () => showOverlay('nativeToEnglish') },
      { type: 'separator' },
      { label: 'Sign Out', click: () => signOut() },
    );
  } else {
    items.push(
      { label: 'Sign In', click: () => createLoginWindow() },
    );
  }

  items.push(
    { type: 'separator' },
    { label: 'Quit', click: () => app.quit() }
  );

  const contextMenu = Menu.buildFromTemplate(items);
  tray.setContextMenu(contextMenu);
}

function toggleWidgetState() {
  isBubbleEnabled = !isBubbleEnabled;
  if (isBubbleEnabled) {
    if (bubbleWin) bubbleWin.show();
    showToast({ type: 'success', message: 'Widget Enabled' }, 2000);
  } else {
    if (bubbleWin) bubbleWin.hide();
    hideOverlay();
    showToast({ type: 'info', message: 'Widget Disabled' }, 2000);
  }
  updateTrayMenu();
}

// ── Screenshot helper — uses macOS screencapture ──────────────────────────────
async function captureScreen() {
  const tmpFile = path.join(os.tmpdir(), `vt_ss_${Date.now()}.png`);
  const r = await runFile('screencapture', ['-x', '-t', 'png', tmpFile], { timeout: 10000 });
  const exists = fs.existsSync(tmpFile);
  const stderr = r.stderr.toLowerCase();
  const permissionError =
    stderr.includes('could not create image') ||
    stderr.includes('no displays') ||
    stderr.includes('permission') ||
    (r.error && !exists);

  if (permissionError) {
    const err = new Error('SCREEN_PERMISSION');
    err.isPermission = true;
    throw err;
  }
  if (!exists) {
    throw new Error('screencapture failed: ' + (r.stderr || 'unknown'));
  }
  const buf = fs.readFileSync(tmpFile);
  try { fs.unlinkSync(tmpFile); } catch { }
  return buf;
}

function handleCaptureError(e) {
  if (e.isPermission || e.message === 'SCREEN_PERMISSION') {
    showToast({
      type: 'error',
      message: '⚠ Screen Recording permission needed.\nGo to: System Settings → Privacy & Security → Screen Recording → enable Electron',
    }, 8000);
  } else {
    showToast({ type: 'error', message: '⚠ Capture failed. ' + e.message }, 5000);
  }
}

// Crop a PNG buffer using macOS sips
async function cropPng(srcPath, x, y, w, h) {
  const dstPath = path.join(os.tmpdir(), `vt_crop_${Date.now()}.png`);
  const r = await runFile('sips', [
    '-c', String(Math.round(h)), String(Math.round(w)),
    '--cropOffset', String(Math.round(y)), String(Math.round(x)),
    srcPath, '-o', dstPath,
  ], { timeout: 8000 });
  if (!r.error && fs.existsSync(dstPath)) return dstPath;
  return null;
}

// Call vision-translate API
function visionTranslate(imgPath, lang) {
  const form = new FormData();
  form.append('file', new Blob([fs.readFileSync(imgPath)], { type: 'image/png' }), path.basename(imgPath));
  form.append('target_language', lang);
  return backendFetch('/api/vision-translate', { method: 'POST', body: form }, 60000);
}

// ── Bubble hint tooltip window ────────────────────────────────────────────────
let hintWin = null;

function createHintWin() {
  hintWin = new BrowserWindow({
    width: 260, height: 34,
    frame: false, transparent: true, alwaysOnTop: true,
    skipTaskbar: true, resizable: false, movable: false, hasShadow: false,
    show: false,
    webPreferences: { ...SECURE_PREFS },
  });
  const html = `<!DOCTYPE html><html><head><meta charset="UTF-8">
  <style>
    *{margin:0;padding:0;box-sizing:border-box;}
    body{background:transparent;overflow:hidden;display:flex;align-items:center;justify-content:center;height:34px;}
    .tip{background:#111;color:#fff;font-family:-apple-system,BlinkMacSystemFont,'Inter',sans-serif;
      font-size:11px;font-weight:500;padding:5px 12px;border-radius:8px;white-space:nowrap;
      box-shadow:0 2px 10px rgba(0,0,0,0.25);animation:fadein 0.12s ease;}
    @keyframes fadein{from{opacity:0;transform:translateY(3px)}to{opacity:1;transform:translateY(0)}}
    kbd{background:rgba(255,255,255,0.18);border-radius:3px;padding:1px 5px;font-size:10px;font-family:inherit;color:#fff;border:none;}
  </style></head><body>
  <div class="tip" id="tip">hint</div>
  <script>
    window.widget.on('hint-text',(msg)=>{
      document.getElementById('tip').textContent = msg;
    });
  <\/script></body></html>`;
  const dataUrl = 'data:text/html;charset=utf-8,' + encodeURIComponent(html);
  hintWin.loadURL(dataUrl);
  hintWin.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  hintWin.setAlwaysOnTop(true, 'screen-saver');
  hintWin.setIgnoreMouseEvents(true);
  hintWin.on('closed', () => { hintWin = null; });
}

function showBubbleHint(message) {
  if (!hintWin) createHintWin();
  if (!bubbleWin) return;
  const [bx, by] = bubbleWin.getPosition();
  const [bw] = bubbleWin.getSize();
  const hw = 260, hh = 34;
  const x = Math.round(bx + bw / 2 - hw / 2);
  const y = by - hh - 6;
  hintWin.setPosition(x, y);
  hintWin.webContents.send('hint-text', message);
  hintWin.showInactive();
}

function hideBubbleHint() {
  if (hintWin) hintWin.hide();
}

ipcMain.on('show-bubble-hint', (_, { message }) => showBubbleHint(message));
ipcMain.on('hide-bubble-hint', () => hideBubbleHint());

// ── Track last active browser URL (captured before overlay shows) ─────────────
let lastActiveUrl = '';
let lastActiveApp = '';
let activeContextPromise = Promise.resolve();

const FRONT_APP_SCRIPT = 'tell application "System Events" to get name of first process whose frontmost is true';
const BROWSER_URL_SCRIPTS = [
  { match: 'chrome', script: 'tell application "Google Chrome" to get URL of active tab of front window' },
  { match: 'brave', script: 'tell application "Brave Browser" to get URL of active tab of front window' },
  { match: 'edge', script: 'tell application "Microsoft Edge" to get URL of active tab of front window' },
  { match: 'safari', script: 'tell application "Safari" to get URL of current tab of front window' },
];

// Frontmost app name + URL of its active tab (only when it is a scriptable browser,
// so we never launch or query a browser the user isn't looking at).
async function getFrontmostContext() {
  const appR = await runFile('osascript', ['-e', FRONT_APP_SCRIPT], { timeout: 1500 });
  const appName = appR.stdout.trim();
  const lower = appName.toLowerCase();
  let url = '';
  const browser = BROWSER_URL_SCRIPTS.find(b => lower.includes(b.match));
  if (browser) {
    const r = await runFile('osascript', ['-e', browser.script], { timeout: 1500 });
    const out = r.stdout.trim();
    if (!r.error && out && !out.includes('execution error')) url = out;
  }
  return { app: appName, url };
}

function captureActiveContext() {
  activeContextPromise = getFrontmostContext().then(({ app: appName, url }) => {
    lastActiveApp = appName.toLowerCase();
    lastActiveUrl = url;
  });
}

function hostMatches(url, domain) {
  try {
    const host = new URL(url).hostname;
    return host === domain || host.endsWith('.' + domain);
  } catch { return false; }
}

function startRecording() {
  if (!isBubbleEnabled || isRecording) return;
  // Capture the active app/URL BEFORE we do anything — this is the user's target
  captureActiveContext();
  isRecording = true;
  if (bubbleWin) bubbleWin.webContents.send('recording-state', true);
  // Don't show overlay during recording — bubble handles the UI
  if (!overlayWin) createOverlay();
  overlayWin.webContents.send('start-recording');
  overlayWin.webContents.send('set-config', widgetConfig);
}

function stopRecording() {
  if (!isRecording) return;
  isRecording = false;
  if (bubbleWin) bubbleWin.webContents.send('recording-state', false);
  if (overlayWin) overlayWin.webContents.send('stop-recording');
}

function cancelRecording() {
  if (!isRecording) return;
  isRecording = false;
  if (bubbleWin) bubbleWin.webContents.send('recording-state', false);
  if (overlayWin) overlayWin.webContents.send('cancel-recording');
}

function toggleRecording() {
  if (isRecording) stopRecording();
  else startRecording();
}

// ── Overlay (translation panel) ───────────────────────────────────────────────
function createOverlay() {
  overlayWin = new BrowserWindow({
    width: 380, height: 200,
    frame: false, transparent: true, alwaysOnTop: true,
    skipTaskbar: true, resizable: false, movable: true, hasShadow: false,
    show: false,
    webPreferences: { ...SECURE_PREFS },
  });
  overlayWin.loadFile('overlay.html');
  overlayWin.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  overlayWin.setAlwaysOnTop(true, 'screen-saver');
  overlayWin.on('closed', () => { overlayWin = null; isOverlayOpen = false; });
}

function positionOverlay() {
  if (!overlayWin || !bubbleWin) return;
  const [bx, by] = bubbleWin.getPosition();
  const [bw] = bubbleWin.getSize();
  const [ow, oh] = overlayWin.getSize();
  const display = screen.getDisplayNearestPoint({ x: bx, y: by });
  const wa = display.workArea;
  let x = bx - Math.round((ow - bw) / 2);
  let y = by - oh - 10;
  x = Math.max(wa.x + 8, Math.min(x, wa.x + wa.width - ow - 8));
  y = Math.max(wa.y + 8, y);
  overlayWin.setPosition(Math.round(x), Math.round(y));
}

function showOverlay(mode) {
  if (!overlayWin) createOverlay();
  positionOverlay();
  overlayWin.show(); overlayWin.focus();
  isOverlayOpen = true;
  if (mode) {
    widgetConfig.mode = mode;
    overlayWin.webContents.send('set-mode', mode);
  }
  overlayWin.webContents.send('set-config', widgetConfig);
  if (bubbleWin) bubbleWin.webContents.send('panel-state', true);
}

function hideOverlay() {
  if (overlayWin && isOverlayOpen) {
    overlayWin.hide();
    overlayWin.blur();
    isOverlayOpen = false;
    if (bubbleWin) bubbleWin.webContents.send('panel-state', false);
  }
}

// ── Screen overlay — ALWAYS click-through, only shows labels ─────────────────
function createScreenOverlay() {
  const { bounds } = screen.getPrimaryDisplay();
  screenOverlayWin = new BrowserWindow({
    x: bounds.x, y: bounds.y,
    width: bounds.width, height: bounds.height,
    frame: false, transparent: true, alwaysOnTop: true,
    skipTaskbar: true, resizable: false, movable: false, hasShadow: false,
    show: false,
    webPreferences: { ...SECURE_PREFS },
  });
  screenOverlayWin.loadFile('screen-overlay.html');
  screenOverlayWin.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  screenOverlayWin.setAlwaysOnTop(true, 'screen-saver');
  // ALWAYS ignore mouse events — this window NEVER blocks the screen
  screenOverlayWin.setIgnoreMouseEvents(true, { forward: true });
  screenOverlayWin.on('closed', () => { screenOverlayWin = null; });
}

function ensureScreenOverlay() {
  if (!screenOverlayWin) createScreenOverlay();
  if (!screenOverlayWin.isVisible()) screenOverlayWin.show();
}

function clearScreenOverlay() {
  if (screenOverlayWin) {
    screenOverlayWin.webContents.send('clear');
  }
}

// ── Region select window — temporary, closes after drag ──────────────────────
let regionSelectorTimeout = null;

function openRegionSelector(lang) {
  if (regionSelectWin) { try { regionSelectWin.close(); } catch { } regionSelectWin = null; }
  if (regionSelectorTimeout) { clearTimeout(regionSelectorTimeout); regionSelectorTimeout = null; }

  const { bounds } = screen.getPrimaryDisplay();
  regionSelectWin = new BrowserWindow({
    x: bounds.x, y: bounds.y,
    width: bounds.width, height: bounds.height,
    frame: false, transparent: true, alwaysOnTop: true,
    skipTaskbar: true, resizable: false, movable: false, hasShadow: false,
    show: false,
    webPreferences: { ...SECURE_PREFS },
  });
  regionSelectWin.loadFile('region-select.html');
  regionSelectWin.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  regionSelectWin.setAlwaysOnTop(true, 'screen-saver');
  regionSelectWin.setIgnoreMouseEvents(false);
  regionSelectWin.on('closed', () => {
    regionSelectWin = null;
    if (regionSelectorTimeout) { clearTimeout(regionSelectorTimeout); regionSelectorTimeout = null; }
  });
  regionSelectWin.once('ready-to-show', () => {
    regionSelectWin.show();
    regionSelectWin.focus();
    regionSelectWin.webContents.send('init', { lang });
    // Safety timeout — if user doesn't select within 30s, auto-close to unfreeze screen
    regionSelectorTimeout = setTimeout(() => {
      closeRegionSelector();
      showToast({ type: 'info', message: 'Region selection timed out.' }, 3000);
    }, 30000);
  });
}

function closeRegionSelector() {
  if (regionSelectorTimeout) { clearTimeout(regionSelectorTimeout); regionSelectorTimeout = null; }
  if (regionSelectWin) {
    try { regionSelectWin.close(); } catch { }
    regionSelectWin = null;
  }
}

// ── Toast ─────────────────────────────────────────────────────────────────────
function createToast() {
  toastWin = new BrowserWindow({
    width: 360, height: 100,
    frame: false, transparent: true, alwaysOnTop: true,
    skipTaskbar: true, resizable: false, movable: false, hasShadow: false,
    show: false,
    webPreferences: { ...SECURE_PREFS },
  });
  toastWin.loadFile('toast.html');
  toastWin.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  toastWin.setAlwaysOnTop(true, 'screen-saver');
  toastWin.on('closed', () => { toastWin = null; });
}

function positionToast() {
  if (!toastWin || !bubbleWin) return;
  const [bx, by] = bubbleWin.getPosition();
  const [bw] = bubbleWin.getSize();
  const [tw, th] = toastWin.getSize();
  const display = screen.getDisplayNearestPoint({ x: bx, y: by });
  const wa = display.workArea;
  let x = bx - Math.round((tw - bw) / 2);
  let y = by - th - 14;
  x = Math.max(wa.x + 8, Math.min(x, wa.x + wa.width - tw - 8));
  y = Math.max(wa.y + 8, y);
  toastWin.setPosition(Math.round(x), Math.round(y));
}

function showToast(data, autoDismissMs = 4000) {
  if (!toastWin) createToast();
  const lines = Math.ceil((data.message || '').length / 38);
  const h = Math.min(Math.max(80, 60 + lines * 20), 180);
  toastWin.setSize(360, h);
  positionToast();
  toastWin.showInactive();
  toastWin.webContents.send('toast-data', data);
  if (toastTimer) clearTimeout(toastTimer);
  if (autoDismissMs > 0) {
    toastTimer = setTimeout(() => { if (toastWin) toastWin.hide(); }, autoDismissMs);
  }
}

// ── Login window ──────────────────────────────────────────────────────────────
function createLoginWindow() {
  if (loginWin && !loginWin.isDestroyed()) { loginWin.focus(); return; }
  loginWin = new BrowserWindow({
    width: 700, height: 520,
    resizable: false,
    titleBarStyle: 'hiddenInset',
    backgroundColor: '#FAF8F4',
    webPreferences: { ...SECURE_PREFS },
  });
  loginWin.loadFile(path.join(__dirname, 'login.html'));
  loginWin.on('closed', () => { loginWin = null; });
}

// ── Dashboard window ─────────────────────────────────────────────────────────
function createDashboardWindow() {
  if (dashboardWin && !dashboardWin.isDestroyed()) { dashboardWin.focus(); return; }
  dashboardWin = new BrowserWindow({
    width: 420, height: 440,
    resizable: false,
    titleBarStyle: 'hiddenInset',
    backgroundColor: '#FAF8F4',
    webPreferences: { ...SECURE_PREFS },
  });
  dashboardWin.loadFile(path.join(__dirname, 'dashboard.html'));
  dashboardWin.on('closed', () => { dashboardWin = null; });
}

// ── Bubble window (the floating widget) ──────────────────────────────────────
function createBubble() {
  if (bubbleWin && !bubbleWin.isDestroyed()) { bubbleWin.show(); return; }
  const { width: sw, height: sh } = screen.getPrimaryDisplay().workAreaSize;

  bubbleWin = new BrowserWindow({
    width: 280, height: 160,
    x: sw - 300, y: sh - 180,
    frame: false, transparent: true, alwaysOnTop: true,
    resizable: false, skipTaskbar: true, hasShadow: false,
    webPreferences: { ...SECURE_PREFS },
  });

  bubbleWin.loadFile('bubble.html');
  // ── MAKE WIDGET APPEAR ON ALL SCREENS / FULLSCREEN ──
  bubbleWin.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  bubbleWin.setAlwaysOnTop(true, 'screen-saver');

  bubbleWin.on('closed', () => { bubbleWin = null; });
}

// ── Browser-based Auth IPC ──────────────────────────────────────────────────
ipcMain.on('open-browser-auth', () => {
  // One-time nonce; the web page must echo it back as `state` in /auth-callback
  pendingAuthState = { value: crypto.randomBytes(16).toString('hex'), expires: Date.now() + AUTH_STATE_TTL_MS };
  shell.openExternal(`${WEB_APP_URL}/desktop-auth?port=${CONTROL_PORT}&state=${pendingAuthState.value}`);
});

ipcMain.handle('get-user-info', () => currentUser);
ipcMain.handle('get-widget-enabled', () => isBubbleEnabled);

function warmUpBackend() {
  fetch(`${BACKEND_URL}/api/health`)
    .then(() => console.log('Backend warmed up successfully'))
    .catch(err => console.error('Failed to warm up backend:', err));
}

ipcMain.on('enable-widget', () => {
  isBubbleEnabled = true;
  if (bubbleWin && !bubbleWin.isDestroyed()) {
    bubbleWin.show();
  } else {
    createBubble();
  }
  updateTrayMenu();
  if (dashboardWin) dashboardWin.webContents.send('widget-state-changed', true);
  warmUpBackend(); // Ping Render to wake it up
});

ipcMain.on('disable-widget', () => {
  isBubbleEnabled = false;
  if (bubbleWin) bubbleWin.hide();
  hideOverlay();
  updateTrayMenu();
  if (dashboardWin) dashboardWin.webContents.send('widget-state-changed', false);
});

function signOut() {
  clearAuth();
  isBubbleEnabled = false;
  if (bubbleWin) bubbleWin.hide();
  hideOverlay();
  if (dashboardWin && !dashboardWin.isDestroyed()) dashboardWin.close();
  createLoginWindow();
  updateTrayMenu();
}

ipcMain.on('sign-out', () => signOut());

// Called after successful login
function onAuthSuccess() {
  if (loginWin && !loginWin.isDestroyed()) loginWin.close();
  createDashboardWindow();
  // Start the widget
  isBubbleEnabled = true;
  if (bubbleWin) bubbleWin.show();
  else createBubble();
  updateTrayMenu();
}

// ── App ready ─────────────────────────────────────────────────────────────────
app.whenReady().then(() => {
  loadAuth();
  startControlServer();
  createTray();
  createOverlay();
  createToast();
  createScreenOverlay();

  // If user is already authenticated, show dashboard; otherwise show login
  if (currentUser) {
    createDashboardWindow();
    isBubbleEnabled = false; // Wait for toggle from dashboard
  } else {
    isBubbleEnabled = false;
    createLoginWindow();
  }

  // ── fn key push-to-talk via native IOHIDManager watcher ──────────────────
  const { spawn } = require('child_process');
  const fnWatcherPath = path.join(__dirname, 'fn_watcher');

  let inputMonitoringPrompted = false;
  function promptInputMonitoring() {
    if (inputMonitoringPrompted) return;
    inputMonitoringPrompted = true;
    execFile('open', ['x-apple.systempreferences:com.apple.preference.security?Privacy_ListenEvent'], () => { });
    showToast({
      type: 'info',
      message: '⚠ Enable Input Monitoring for Electron\nSystem Settings → Privacy → Input Monitoring',
    }, 10000);
  }

  try {
    const fnProc = spawn(fnWatcherPath, [], { stdio: ['ignore', 'pipe', 'pipe'] });
    let pressStart = 0;
    const MIN_HOLD_MS = 300;
    let buf = '';

    fnProc.stderr?.on('data', (chunk) => {
      const msg = chunk.toString().toLowerCase();
      if (msg.includes('not permitted') || msg.includes('denied')) promptInputMonitoring();
    });

    fnProc.stdout.on('data', (chunk) => {
      buf += chunk.toString();
      const lines = buf.split('\n');
      buf = lines.pop();
      for (const line of lines) {
        const ev = line.trim();
        if (ev === 'down') {
          pressStart = Date.now();
          if (isBubbleEnabled && !isRecording) startRecording();
        } else if (ev === 'up') {
          const held = Date.now() - pressStart;
          if (!isRecording) continue;
          if (held >= MIN_HOLD_MS) stopRecording();
          else cancelRecording();
        }
      }
    });

    fnProc.on('error', (e) => console.error('[fn_watcher] error:', e.message));
    fnProc.on('exit', (code) => {
      // Non-zero exit is most likely missing Input Monitoring permission
      if (code !== 0 && code !== null) promptInputMonitoring();
    });

    app.on('will-quit', () => { try { fnProc.kill(); } catch { } });
    console.log('[shortcut] fn key push-to-talk active via IOHIDManager');

  } catch (e) {
    console.error('[fn_watcher] failed to start:', e.message);
  }

  // ── Fallback: F13 via uiohook-napi if fn_watcher fails ───────────────────
  try {
    const { uIOhook, UiohookKey } = require('uiohook-napi');
    const TRIGGER = UiohookKey.F13;
    let keyDown = false;
    let pressStart = 0;
    const MIN_HOLD_MS = 300;

    uIOhook.on('keydown', (e) => {
      if (e.keycode !== TRIGGER || keyDown) return;
      keyDown = true;
      pressStart = Date.now();
      if (isBubbleEnabled && !isRecording) startRecording();
    });

    uIOhook.on('keyup', (e) => {
      if (e.keycode !== TRIGGER) return;
      keyDown = false;
      const held = Date.now() - pressStart;
      if (!isRecording) return;
      if (held >= MIN_HOLD_MS) stopRecording();
      else cancelRecording();
    });

    uIOhook.start();
    console.log('[shortcut] F13 fallback push-to-talk active');
  } catch (e) {
    console.error('[shortcut] uiohook-napi failed:', e.message);
    // Fallback to toggle shortcut
    const sc = process.platform === 'darwin' ? 'Command+Shift+R' : 'Control+Shift+R';
    const ok = globalShortcut.register(sc, () => toggleRecording());
    console.log(`[shortcut] Fallback ${sc}: ${ok ? 'registered' : 'failed'}`);
  }
});

app.on('window-all-closed', e => e.preventDefault());
app.on('will-quit', () => {
  globalShortcut.unregisterAll();
  try { require('uiohook-napi').uIOhook.stop(); } catch { }
});

// ── IPC ───────────────────────────────────────────────────────────────────────
ipcMain.on('toggle-panel', () => {
  if (!isBubbleEnabled) return;
  if (isOverlayOpen) hideOverlay();
  else showOverlay('nativeToEnglish');
});

ipcMain.on('select-mode', (_, mode) => { showOverlay(mode); });
ipcMain.on('hide-overlay', () => hideOverlay());

ipcMain.on('bubble-clicked', () => toggleRecording());
ipcMain.on('stop-recording-ipc', () => stopRecording());

ipcMain.on('show-bubble-menu', (event) => {
  const { Menu, MenuItem } = require('electron');
  const menu = new Menu();
  menu.append(new MenuItem({ label: 'SeedlingSpeaks Widget', enabled: false }));
  menu.append(new MenuItem({ type: 'separator' }));
  menu.append(new MenuItem({ label: 'Open Settings', click: () => showOverlay('nativeToEnglish') }));
  menu.append(new MenuItem({ type: 'separator' }));
  menu.append(new MenuItem({ label: 'Quit', click: () => app.quit() }));
  menu.popup(BrowserWindow.fromWebContents(event.sender));
});

ipcMain.on('quit-app', () => app.quit());

// ── Live transcript update → forward to overlay ───────────────────────────────
ipcMain.on('live-transcript-update', (_, text) => {
  if (overlayWin) overlayWin.webContents.send('live-transcript', text);
});

// ── Dynamic overlay resize ────────────────────────────────────────────────────
ipcMain.on('resize-overlay', (_, { height }) => {
  if (!overlayWin) return;
  const [w] = overlayWin.getSize();
  const newH = Math.max(120, Math.min(height, 800));
  const [cx, cy] = overlayWin.getPosition();
  const [, oldH] = overlayWin.getSize();
  overlayWin.setSize(w, newH);
  // Keep bottom edge anchored (card grows upward)
  const dy = oldH - newH;
  overlayWin.setPosition(cx, cy + dy);
});

// ── Cancel recording (X button during recording) ──────────────────────────────
ipcMain.on('open-dashboard', () => {
  createDashboardWindow();
});

// NOTE: currentUser.token is the Clerk session JWT the web page handed over at
// sign-in. Clerk session tokens expire after ~60s and the widget cannot refresh
// them, so session logging only succeeds shortly after sign-in; afterwards the
// backend returns 401 and logging is skipped (translation itself is unaffected).
async function logNativeSession(nativeText, englishText) {
  if (!currentUser || !currentUser.token) return null;
  let sessionId = null;
  try {
    const session = await postJson('/api/native-to-english/session', {
      user_id: currentUser.clerkId, // ignored by the server (derived from token)
      original_language: 'auto', // Sarvam auto-detects
      original_text: nativeText,
      translated_text: englishText,
    }, { auth: true });
    sessionId = session.session_id;
    await postJson('/api/native-to-english/transcription', {
      session_id: sessionId,
      original_transcript: englishText,
      tone_applied: null,
      rewritten_text: null,
      custom_tone_desc: null,
      confidence_score: null,
    }, { auth: true });
  } catch (err) {
    console.error('Failed to log session:', err.message);
  }
  return sessionId;
}

// Backend calls on behalf of the (sandboxed) overlay renderer
ipcMain.handle('backend-post-json', (_, pathname, body) => {
  if (!RENDERER_JSON_PATHS.has(pathname)) throw new Error('path not allowed');
  return postJson(pathname, body);
});
ipcMain.handle('backend-translate-audio', (_, bytes) => translateAudio(bytes));
ipcMain.on('log-transcription', (_, payload) => {
  if (!currentUser || !currentUser.token) return;
  postJson('/api/native-to-english/transcription', payload, { auth: true })
    .catch(err => console.error('Failed to log retone:', err.message));
});

ipcMain.on('process-audio', async (event, audioBytes) => {
  if (bubbleWin) bubbleWin.webContents.send('processing-state', true);
  showToast({ type: 'loading', message: 'Transcribing with Sarvam AI…' }, 0);

  try {
    // 1. Send to Sarvam Backend for Transcription/Translation
    const result = await translateAudio(audioBytes);
    const nativeTranscript = result.native_transcript || '';
    const englishTranscript = result.transcript || '';

    if (!englishTranscript) throw new Error('No transcript returned');

    // ── Log to Database (Native to English) ──────────────────────────
    const currentSessionId = await logNativeSession(nativeTranscript, englishTranscript);

    if (bubbleWin) bubbleWin.webContents.send('processing-done');
    if (toastWin) toastWin.hide();
    if (!overlayWin) createOverlay();
    positionOverlay();
    overlayWin.show();
    overlayWin.focus();
    isOverlayOpen = true;

    overlayWin.webContents.send('show-result', {
      transcript: englishTranscript,
      original: englishTranscript,
      native: nativeTranscript,
      sessionId: currentSessionId
    });

  } catch (err) {
    console.error('Processing error:', err.message);
    showToast({ type: 'error', message: `Transcription failed: ${err.message}` }, 5000);
    if (bubbleWin) bubbleWin.webContents.send('processing-done');
  }
});

ipcMain.on('recording-result', (_, { transcript }) => {
  isRecording = false;
  if (bubbleWin) bubbleWin.webContents.send('recording-state', false);
  // Context was already captured at startRecording() — don't overwrite it here
  if (!overlayWin) createOverlay();
  positionOverlay();
  overlayWin.show();
  overlayWin.focus();
  isOverlayOpen = true;
  overlayWin.webContents.send('show-result', { transcript });
});

// Dev: Cmd+Shift+I opens DevTools on overlay
ipcMain.on('open-devtools', () => { if (overlayWin) overlayWin.webContents.openDevTools({ mode: 'detach' }); });

ipcMain.on('show-toast', (_, data) => {
  const ms = data.type === 'info' ? 6000 : data.type === 'loading' ? 0 : 4000;
  showToast(data, ms);
});

ipcMain.on('hide-toast', () => {
  if (toastWin) toastWin.hide();
  if (toastTimer) { clearTimeout(toastTimer); toastTimer = null; }
});

ipcMain.on('bubble-drag', (_, { x, y }) => {
  if (bubbleWin && typeof x === 'number' && typeof y === 'number') {
    const nx = Math.round(x);
    const ny = Math.round(y);
    if (!isNaN(nx) && !isNaN(ny)) {
      bubbleWin.setPosition(nx, ny);
      if (isOverlayOpen) positionOverlay();
    }
  }
});

ipcMain.handle('get-bubble-pos', () => {
  if (!bubbleWin) return { x: 0, y: 0 };
  const [x, y] = bubbleWin.getPosition();
  return { x, y };
});

// ── Screen translation actions ────────────────────────────────────────────────

// TRANSLATE FULL SCREEN
ipcMain.on('action-translate-screen', async (_, { lang, mode }) => {
  const tgtLang = mode === 'nativeToEnglish' ? 'en-IN' : (lang || 'hi-IN');

  if (overlayWin) overlayWin.hide();
  if (toastWin) toastWin.hide();
  if (screenOverlayWin) screenOverlayWin.hide();
  await new Promise(r => setTimeout(r, 300));

  showToast({ type: 'loading', message: 'Scanning screen…' }, 0);

  try {
    const pngBuf = await captureScreen();
    const tmpImg = path.join(os.tmpdir(), `vt_screen_${Date.now()}.png`);
    fs.writeFileSync(tmpImg, pngBuf);

    showToast({ type: 'loading', message: 'Translating screen text…' }, 0);

    const data = await visionTranslate(tmpImg, tgtLang);
    try { fs.unlinkSync(tmpImg); } catch { }

    const regions = data.regions || [];
    if (regions.length === 0) {
      showToast({ type: 'info', message: 'No text found on screen.' }, 4000);
      return;
    }

    ensureScreenOverlay();
    const { bounds } = screen.getPrimaryDisplay();
    screenOverlayWin.webContents.send('show-translations', {
      regions, offsetX: 0, offsetY: 0,
      screenWidth: bounds.width, screenHeight: bounds.height,
    });
    showToast({ type: 'success', message: `✓ Translated ${regions.length} text regions on screen` }, 5000);

  } catch (e) {
    console.error('action-translate-screen error:', e);
    handleCaptureError(e);
  }
});

// SELECT REGION — opens a temporary full-screen selector window
ipcMain.on('action-translate-region', (_, { lang, mode }) => {
  const tgtLang = mode === 'nativeToEnglish' ? 'en-IN' : (lang || 'hi-IN');
  if (toastWin) toastWin.hide();
  // Show a hint toast so user knows what to do
  showToast({ type: 'info', message: 'Drag to select a region. Press Esc to cancel.' }, 0);
  openRegionSelector(tgtLang);
});

// Region selector sends this when drag is complete
ipcMain.on('region-selected', async (_, { x, y, w, h, lang }) => {
  closeRegionSelector();
  if (toastWin) toastWin.hide();
  await new Promise(r => setTimeout(r, 200)); // let region window fully close
  showToast({ type: 'loading', message: 'Translating selected region…' }, 0);

  try {
    const pngBuf = await captureScreen();
    const tmpImg = path.join(os.tmpdir(), `vt_full_${Date.now()}.png`);
    fs.writeFileSync(tmpImg, pngBuf);

    const croppedPath = await cropPng(tmpImg, x, y, w, h);
    const imgToSend = croppedPath || tmpImg;
    const data = await visionTranslate(imgToSend, lang);
    try { fs.unlinkSync(tmpImg); } catch { }
    if (croppedPath) try { fs.unlinkSync(croppedPath); } catch { }

    const regions = data.regions || [];
    if (regions.length === 0) {
      showToast({ type: 'info', message: 'No text found in selected region.' }, 4000);
      return;
    }

    ensureScreenOverlay();
    screenOverlayWin.webContents.send('show-translations', {
      regions, offsetX: x, offsetY: y,
      screenWidth: w, screenHeight: h,
    });
    showToast({ type: 'success', message: `✓ Translated ${regions.length} text regions` }, 4000);

  } catch (e) {
    console.error('region-selected error:', e);
    handleCaptureError(e);
  }
});

// Region selector cancelled (Esc or timeout)
ipcMain.on('region-cancelled', () => {
  closeRegionSelector();
  if (toastWin) toastWin.hide();
});

// CLICK MODE — transparent full-screen overlay captures real mouse clicks
// User just clicks on any text in any app — no keyboard shortcut needed
let clickOverlayWin = null;

function openClickOverlay(lang) {
  if (clickOverlayWin) { try { clickOverlayWin.close(); } catch { } clickOverlayWin = null; }

  const { bounds } = screen.getPrimaryDisplay();
  clickOverlayWin = new BrowserWindow({
    x: bounds.x, y: bounds.y,
    width: bounds.width, height: bounds.height,
    frame: false, transparent: true, alwaysOnTop: true,
    skipTaskbar: true, resizable: false, movable: false, hasShadow: false,
    show: false,
    webPreferences: { ...SECURE_PREFS },
  });
  clickOverlayWin.loadFile('click-overlay.html');
  clickOverlayWin.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  clickOverlayWin.setAlwaysOnTop(true, 'screen-saver');
  // Captures clicks but forwards everything else
  clickOverlayWin.setIgnoreMouseEvents(false);
  clickOverlayWin.on('closed', () => {
    clickOverlayWin = null;
    isClickModeActive = false;
    if (bubbleWin) bubbleWin.webContents.send('screen-mode', false);
  });
  clickOverlayWin.once('ready-to-show', () => {
    clickOverlayWin.show();
    clickOverlayWin.webContents.send('init', { lang });
  });
}

function closeClickOverlay() {
  if (clickOverlayWin) { try { clickOverlayWin.close(); } catch { } clickOverlayWin = null; }
}

ipcMain.on('action-click-mode', (_, { lang, mode }) => {
  const tgtLang = mode === 'nativeToEnglish' ? 'en-IN' : (lang || 'hi-IN');
  isClickModeActive = true;
  clickModeLang = tgtLang;
  openClickOverlay(tgtLang);
  if (bubbleWin) bubbleWin.webContents.send('screen-mode', true);
});

// ── Accessibility text reader (macOS AX API — works on ANY app, no screenshot) ──
const AX_HELPER = path.join(__dirname, 'ax_text_at_cursor');

async function getTextViaAX(x, y) {
  try {
    const r = await runFile(AX_HELPER, [String(x), String(y)], { timeout: 3000 });
    if (r.error) return null;
    const parsed = JSON.parse(r.stdout.trim());
    return parsed.text && parsed.text.trim() ? parsed.text.trim() : null;
  } catch { return null; }
}

// Translate plain text via backend
function translateText(text, lang) {
  return postJson('/api/translate-text', {
    text,
    source_language: 'en-IN',
    target_language: lang,
  });
}

// Called from click-overlay.html when user clicks on screen
ipcMain.on('click-translate', async (_, { x, y, lang }) => {
  try {
    // ── FAST PATH: try Accessibility API first (instant, no screenshot needed) ──
    const axText = await getTextViaAX(x, y);

    if (axText) {
      // Got text directly from the app — translate it immediately
      const data = await translateText(axText, lang);
      const translated = data.translated_text || axText;

      if (clickOverlayWin) {
        clickOverlayWin.webContents.send('show-result', {
          regions: [{ translated, original: axText, x: 0.5, y: 0.5 }],
          offsetX: x - 150, offsetY: y - 60,
          regionW: 300, regionH: 120,
          clickX: x, clickY: y,
        });
      }
      return;
    }

    // ── FALLBACK: screenshot + OCR (for apps that block AX, like games, PDFs) ──
    if (clickOverlayWin) clickOverlayWin.hide();
    await new Promise(r => setTimeout(r, 180));

    const REGION_W = 480, REGION_H = 220;
    const { bounds } = screen.getPrimaryDisplay();
    const rx = Math.max(0, Math.min(Math.round(x - REGION_W / 2), bounds.width - REGION_W));
    const ry = Math.max(0, Math.min(Math.round(y - REGION_H / 2), bounds.height - REGION_H));

    const pngBuf = await captureScreen();
    const tmpImg = path.join(os.tmpdir(), `vt_click_${Date.now()}.png`);
    fs.writeFileSync(tmpImg, pngBuf);

    const croppedPath = await cropPng(tmpImg, rx, ry, REGION_W, REGION_H);
    const imgToSend = croppedPath || tmpImg;
    const data = await visionTranslate(imgToSend, lang);
    try { fs.unlinkSync(tmpImg); } catch { }
    if (croppedPath) try { fs.unlinkSync(croppedPath); } catch { }

    if (clickOverlayWin) {
      clickOverlayWin.show();
      const regions = data.regions || [];
      clickOverlayWin.webContents.send('show-result', {
        regions, offsetX: rx, offsetY: ry,
        regionW: REGION_W, regionH: REGION_H,
        clickX: x, clickY: y,
        message: regions.length === 0 ? 'No text found here' : null,
      });
    }
  } catch (e) {
    if (clickOverlayWin) clickOverlayWin.show();
    console.error('click-translate error:', e);
    handleCaptureError(e);
  }
});

ipcMain.on('stop-click-mode', () => {
  isClickModeActive = false;
  closeClickOverlay();
  if (bubbleWin) bubbleWin.webContents.send('screen-mode', false);
  if (toastWin) toastWin.hide();
});

// RESTORE — clear all screen overlays
ipcMain.on('action-restore', () => {
  isClickModeActive = false;
  closeClickOverlay();
  clearScreenOverlay();
  if (bubbleWin) bubbleWin.webContents.send('screen-mode', false);
  showToast({ type: 'success', message: '✓ Screen restored' }, 3000);
});

// Stop screen mode from overlay's stop button
ipcMain.on('stop-screen-mode', () => {
  isClickModeActive = false;
  closeClickOverlay();
  clearScreenOverlay();
  if (bubbleWin) bubbleWin.webContents.send('screen-mode', false);
  if (toastWin) toastWin.hide();
});

// ── Detect frontmost app + active browser URL ─────────────────────────────────
ipcMain.on('get-active-url', async (event) => {
  const { app: appName, url } = await getFrontmostContext();
  event.reply('active-url', url || null);
  event.reply('active-app', appName);
});

// ── Smart send — detect target and route ──────────────────────────────────────
ipcMain.on('smart-send', async (_, { text, subject, body }) => {
  const scriptPath = path.join(__dirname, 'fill_compose.sh');

  await activeContextPromise; // context captured at startRecording()
  const url = lastActiveUrl;
  const appName = lastActiveApp;

  let target = 'fallback';
  if (hostMatches(url, 'mail.google.com')) target = 'gmail';
  else if (hostMatches(url, 'slack.com')) target = 'slack';
  else if (hostMatches(url, 'web.whatsapp.com')) target = 'whatsapp';
  else if (hostMatches(url, 'linkedin.com')) target = 'linkedin';
  else if (hostMatches(url, 'outlook.live.com') || hostMatches(url, 'outlook.office.com') || hostMatches(url, 'outlook.office365.com')) target = 'outlook';
  else if (appName.includes('slack')) target = 'slack';
  else if (appName.includes('whatsapp')) target = 'whatsapp';
  else if (appName.includes('mail') && !appName.includes('gmail')) target = 'applemail';

  console.log('[smart-send] target:', target);

  hideOverlay();

  if (target === 'fallback') {
    // Try direct accessibility insertion into the focused text field
    const axPath = path.join(__dirname, 'ax_insert_text');
    app.hide();
    setTimeout(async () => {
      const r = await runFile(axPath, [text], { timeout: 5000 });
      if (r.error || r.stderr.includes('Error')) {
        // Fallback to clipboard if accessibility insert fails
        const { clipboard } = require('electron');
        clipboard.writeText(text);
        showToast({ type: 'info', message: '📋 Copied to clipboard — press Cmd+V to paste' }, 3000);
      }
      setTimeout(() => { app.show(); if (bubbleWin) bubbleWin.show(); }, 300);
    }, 400);
    return;
  }

  const pastTargets = ['gmail', 'linkedin', 'slack', 'whatsapp', 'outlook'];
  const needsAppHide = pastTargets.includes(target);

  if (needsAppHide) {
    // Hide the entire Electron app so macOS gives focus back to Chrome/browser.
    // This is the only reliable way to ensure Cmd+V goes to the right window.
    app.hide();
  }

  // Give macOS time to fully switch focus to the target app
  const delay = needsAppHide ? 600 : 400;

  setTimeout(async () => {
    const result = await runFile('bash', [scriptPath, target, subject || '', body || text], { timeout: 15000 });
    // Don't log error.message — it contains the command line (message text)
    if (result.error) console.error('[smart-send] fill_compose failed, exit code:', result.error.code);

    // Bring Electron back (bubble should reappear)
    if (needsAppHide) {
      setTimeout(() => {
        app.show();
        if (bubbleWin) bubbleWin.show();
      }, 500);
    }
  }, delay);
});
