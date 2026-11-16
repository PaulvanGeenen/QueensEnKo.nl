import { db, doc, setDoc } from './firebase';

export interface SessionData {
  id: string;
  startedAt: string;
  lastActiveAt: string;
  duration: number;
  referrer: string;
  city: string;
  country: string;
  latitude: number;
  longitude: number;
  device: string;
  os: string;
  userAgent: string;
  views: { [sectionId: string]: number };
  clicks: { label: string; timestamp: string }[];
}

let currentSession: SessionData | null = null;
let activeSection: string | null = null;
let sectionTimers: { [sectionId: string]: number } = {};
let lastPulseTime: number = Date.now();

const SESSION_KEY = 'queens_ko_session_id';

// Helper to generate IDs
function generateId() {
  return 'sess_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9);
}

// User Agent parsers
function getOS(ua: string): string {
  if (ua.includes('Windows')) return 'Windows';
  if (ua.includes('Macintosh') || ua.includes('Mac OS')) return 'MacOS';
  if (ua.includes('iPhone') || ua.includes('iPad')) return 'iOS';
  if (ua.includes('Android')) return 'Android';
  if (ua.includes('Linux')) return 'Linux';
  return 'Onbekend';
}

function getDevice(ua: string): string {
  if (/mobile/i.test(ua)) return 'Mobile';
  if (/tablet|ipad/i.test(ua)) return 'Tablet';
  return 'Desktop';
}

// Geolocation fetcher with robust JSON check
async function fetchGeoLocation() {
  try {
    const response = await fetch('https://ipapi.co/json/');
    if (!response.ok) throw new Error('IP api failed');
    const data = await response.json();
    return {
      city: data.city || 'Onbekend',
      country: data.country_name || 'Nederland',
      latitude: Number(data.latitude) || 52.1326,
      longitude: Number(data.longitude) || 5.2913,
    };
  } catch (err) {
    console.warn('[Tracker] Geolocation error, using default NL:', err);
    return {
      city: 'Onbekend',
      country: 'Nederland',
      latitude: 52.1326,
      longitude: 5.2913,
    };
  }
}

// Init tracking session
export async function initializeTracker() {
  if (typeof window === 'undefined') return;

  // Do not track anyone visiting the admin panel (even if not logged in yet)
  const isBeheerPath = window.location.pathname.toLowerCase().includes('/beheer') || window.location.pathname.toLowerCase().includes('beheer');
  if (isBeheerPath) {
    console.log('[Tracker] Beheer page path detected, ignoring tracking.');
    return;
  }

  const isAdmin = sessionStorage.getItem('queens_ko_admin_auth') === 'true';

  if (isAdmin) {
    console.log('[Tracker] Admin detected, ignoring initialization.');
    return;
  }

  let sessionId = sessionStorage.getItem(SESSION_KEY);
  if (!sessionId) {
    sessionId = generateId();
    sessionStorage.setItem(SESSION_KEY, sessionId);
  }

  const ua = navigator.userAgent;
  const os = getOS(ua);
  const device = getDevice(ua);
  const rawReferrer = document.referrer;
  
  let referrer = 'Direct';
  if (rawReferrer && rawReferrer.trim() !== '') {
    try {
      const url = new URL(rawReferrer);
      referrer = url.hostname;
    } catch {
      referrer = rawReferrer.substring(0, 50);
    }
  }

  const geo = await fetchGeoLocation();
  const startedAt = new Date().toISOString();

  currentSession = {
    id: sessionId,
    startedAt,
    lastActiveAt: startedAt,
    duration: 0,
    referrer,
    city: geo.city,
    country: geo.country,
    latitude: geo.latitude,
    longitude: geo.longitude,
    device,
    os,
    userAgent: ua,
    views: {},
    clicks: [],
  };

  await syncSessionWithDb();

  // Initialize heartbeat timers
  setInterval(heartbeat, 1000);
  setInterval(syncSessionWithDb, 10000); // sync every 10 seconds

  // Attach unload listener
  window.addEventListener('beforeunload', () => {
    syncSessionWithDb(true);
  });
}

// Disable tracking for administrators
export function disableTracking() {
  currentSession = null;
  activeSection = null;
  if (typeof window !== 'undefined') {
    sessionStorage.removeItem(SESSION_KEY);
  }
}

// Global hook to track component visibility duration
export function setTrackedSection(sectionId: string | null) {
  const isAdmin = typeof window !== 'undefined' && sessionStorage.getItem('queens_ko_admin_auth') === 'true';
  if (isAdmin) return;
  if (activeSection === sectionId) return;
  activeSection = sectionId;
}

// Pulse active timers
function heartbeat() {
  const isAdmin = typeof window !== 'undefined' && sessionStorage.getItem('queens_ko_admin_auth') === 'true';
  if (isAdmin) {
    currentSession = null;
    return;
  }
  if (!currentSession) return;

  const now = Date.now();
  const deltaSeconds = Math.round((now - lastPulseTime) / 1000);
  
  if (deltaSeconds > 0) {
    currentSession.duration += deltaSeconds;
    
    // Track active section time
    if (activeSection) {
      if (!currentSession.views[activeSection]) {
        currentSession.views[activeSection] = 0;
      }
      currentSession.views[activeSection] += deltaSeconds;
    }
    
    lastPulseTime = now;
    currentSession.lastActiveAt = new Date().toISOString();
  }
}

// Global event recorder
export async function trackButtonPress(label: string) {
  console.log(`[Tracker] Click recorded: ${label}`);
  const isAdmin = typeof window !== 'undefined' && sessionStorage.getItem('queens_ko_admin_auth') === 'true';
  if (isAdmin) {
    return;
  }
  if (!currentSession) return;

  const clickEvent = {
    label,
    timestamp: new Date().toISOString()
  };

  currentSession.clicks.push(clickEvent);
  
  // Throttle database writes by syncing normal clicks on heartbeat or on unload, 
  // but let's sync immediately for ticket clicks to be safe
  if (label.toLowerCase().includes('ticket') || label.toLowerCase().includes('boek')) {
    await syncSessionWithDb();
  }
}

// Sync current state to Firestore
export async function syncSessionWithDb(urgent: boolean = false) {
  const isAdmin = typeof window !== 'undefined' && sessionStorage.getItem('queens_ko_admin_auth') === 'true';
  if (isAdmin) {
    currentSession = null;
    return;
  }
  if (!currentSession) return;
  
  try {
    const sessionDocRef = doc(db, 'sessions', currentSession.id);
    await setDoc(sessionDocRef, {
      ...currentSession,
      lastActiveAt: new Date().toISOString()
    });
  } catch (err) {
    console.error('[Tracker] Failed syncing to DB:', err);
  }
}
