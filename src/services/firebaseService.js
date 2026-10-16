// Firebase Firestore Integration with automatic LocalStorage fallback

import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getFirestore, 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  deleteDoc, 
  query, 
  where, 
  orderBy, 
  limit 
} from 'firebase/firestore';

const FIREBASE_CONFIG_KEY = 'lucky_english_firebase_config';
const LOCAL_ACTIVITIES_KEY = 'lucky_english_local_activities';
const LOCAL_LEADERBOARD_KEY = 'lucky_english_local_leaderboard';

let firebaseApp = null;
let db = null;

// Initialize Firebase dynamically from stored config
export function initFirebase(customConfig = null) {
  try {
    const config = customConfig || getStoredFirebaseConfig();
    if (!config || !config.apiKey || !config.projectId) {
      db = null;
      return null;
    }

    if (!getApps().length) {
      firebaseApp = initializeApp(config);
    } else {
      firebaseApp = getApp();
    }

    db = getFirestore(firebaseApp);
    return db;
  } catch (err) {
    console.warn('Firebase initialization failed, falling back to LocalStorage:', err);
    db = null;
    return null;
  }
}

export function getStoredFirebaseConfig() {
  try {
    const raw = localStorage.getItem(FIREBASE_CONFIG_KEY);
    if (raw) return JSON.parse(raw);

    // Support GitHub Secrets / Vite env variables (VITE_FIREBASE_CONFIG full JSON)
    if (import.meta.env.VITE_FIREBASE_CONFIG) {
      try {
        return JSON.parse(import.meta.env.VITE_FIREBASE_CONFIG);
      } catch (err) {
        console.warn('Could not parse VITE_FIREBASE_CONFIG environment variable:', err);
      }
    }

    // Support individual GitHub Secrets / Vite env variables
    if (import.meta.env.VITE_FIREBASE_API_KEY && import.meta.env.VITE_FIREBASE_PROJECT_ID) {
      return {
        apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
        authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || `${import.meta.env.VITE_FIREBASE_PROJECT_ID}.firebaseapp.com`,
        projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
        storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || `${import.meta.env.VITE_FIREBASE_PROJECT_ID}.firebasestorage.app`,
        messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
        appId: import.meta.env.VITE_FIREBASE_APP_ID || ''
      };
    }

    return null;
  } catch {
    return null;
  }
}

export function saveStoredFirebaseConfig(config) {
  if (!config) {
    localStorage.removeItem(FIREBASE_CONFIG_KEY);
    db = null;
  } else {
    localStorage.setItem(FIREBASE_CONFIG_KEY, JSON.stringify(config));
    initFirebase(config);
  }
}

export function isFirebaseConfigured() {
  return db !== null;
}

export function getFirebaseAppInstance() {
  if (!firebaseApp && getApps().length > 0) {
    firebaseApp = getApp();
  }
  return firebaseApp;
}

// Generate a random 6-character room PIN (e.g. 777WIN, LUCK88)
export function generateGamePin() {
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  let pin = '';
  for (let i = 0; i < 6; i++) {
    pin += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return pin;
}

// Save or update an activity
export async function saveActivity(activity) {
  const now = Date.now();
  const pin = activity.pin || generateGamePin();
  const id = activity.id || `act_${now}`;

  const activityData = {
    ...activity,
    id,
    pin: pin.toUpperCase(),
    updatedAt: now,
    createdAt: activity.createdAt || now
  };

  // 1. Try Firebase if connected
  if (db) {
    try {
      await setDoc(doc(db, 'activities', id), activityData);
      return activityData;
    } catch (err) {
      console.warn('Failed to save to Firestore, falling back to localStorage:', err);
    }
  }

  // 2. LocalStorage fallback
  const localList = getLocalActivities();
  const existingIdx = localList.findIndex(a => a.id === id);
  if (existingIdx >= 0) {
    localList[existingIdx] = activityData;
  } else {
    localList.unshift(activityData);
  }
  localStorage.setItem(LOCAL_ACTIVITIES_KEY, JSON.stringify(localList));

  return activityData;
}

// Retrieve single activity by ID or 6-digit PIN
export async function getActivityByPinOrId(identifier) {
  if (!identifier) return null;
  const clean = identifier.trim().toUpperCase();

  // Try Firestore
  if (db) {
    try {
      // Direct doc ID check
      const docRef = doc(db, 'activities', identifier);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        return docSnap.data();
      }

      // PIN query check
      const q = query(collection(db, 'activities'), where('pin', '==', clean), limit(1));
      const querySnap = await getDocs(q);
      if (!querySnap.empty) {
        return querySnap.docs[0].data();
      }
    } catch (err) {
      console.warn('Firestore fetch failed, checking local storage:', err);
    }
  }

  // Check LocalStorage
  const localList = getLocalActivities();
  return localList.find(a => (a.pin && a.pin.toUpperCase() === clean) || a.id === identifier) || null;
}

// Get all activities (for teacher management)
export async function getAllActivities() {
  if (db) {
    try {
      const q = query(collection(db, 'activities'), orderBy('createdAt', 'desc'));
      const snap = await getDocs(q);
      return snap.docs.map(d => d.data());
    } catch (err) {
      console.warn('Firestore getAllActivities failed, fallback to local:', err);
    }
  }

  return getLocalActivities();
}

// Delete activity
export async function deleteActivity(id) {
  if (db) {
    try {
      await deleteDoc(doc(db, 'activities', id));
    } catch (err) {
      console.warn('Firestore delete failed:', err);
    }
  }

  const localList = getLocalActivities().filter(a => a.id !== id);
  localStorage.setItem(LOCAL_ACTIVITIES_KEY, JSON.stringify(localList));
  return true;
}

// Leaderboard: Save a player's final game score
export async function submitScore({ pin, gameId, playerNick, chips, correctAnswers, totalQuestions, avatar }) {
  const scoreEntry = {
    id: `score_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    pin: (pin || 'GENERAL').toUpperCase(),
    gameId,
    playerNick: playerNick || 'Lucky Player',
    chips: chips || 0,
    correctAnswers: correctAnswers || 0,
    totalQuestions: totalQuestions || 0,
    accuracy: totalQuestions > 0 ? Math.round((correctAnswers / totalQuestions) * 100) : 0,
    avatar: avatar || '🎩',
    timestamp: Date.now()
  };

  if (db) {
    try {
      await setDoc(doc(db, 'leaderboard', scoreEntry.id), scoreEntry);
      return scoreEntry;
    } catch (err) {
      console.warn('Firestore submitScore failed:', err);
    }
  }

  // Local storage leaderboard
  const list = getLocalLeaderboard();
  list.unshift(scoreEntry);
  localStorage.setItem(LOCAL_LEADERBOARD_KEY, JSON.stringify(list.slice(0, 100)));
  return scoreEntry;
}

// Get top scores for a specific PIN or game
export async function getLeaderboard(pin = null) {
  if (db) {
    try {
      let q;
      if (pin) {
        q = query(
          collection(db, 'leaderboard'),
          where('pin', '==', pin.toUpperCase()),
          orderBy('chips', 'desc'),
          limit(20)
        );
      } else {
        q = query(collection(db, 'leaderboard'), orderBy('chips', 'desc'), limit(20));
      }
      const snap = await getDocs(q);
      return snap.docs.map(d => d.data());
    } catch (err) {
      console.warn('Firestore getLeaderboard failed:', err);
    }
  }

  const list = getLocalLeaderboard();
  if (pin) {
    return list
      .filter(item => item.pin === pin.toUpperCase())
      .sort((a, b) => b.chips - a.chips)
      .slice(0, 20);
  }
  return list.sort((a, b) => b.chips - a.chips).slice(0, 20);
}

// Helpers
function getLocalActivities() {
  try {
    const raw = localStorage.getItem(LOCAL_ACTIVITIES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function getLocalLeaderboard() {
  try {
    const raw = localStorage.getItem(LOCAL_LEADERBOARD_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

// Try auto-init on module load
initFirebase();
