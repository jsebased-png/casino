// Teacher Authentication Service with Firebase Auth & Local Secure Fallback

import { 
  getAuth, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  updateProfile,
  signOut 
} from 'firebase/auth';
import { getFirebaseAppInstance, isFirebaseConfigured } from './firebaseService';

const STORAGE_CURRENT_TEACHER_KEY = 'lucky_english_current_teacher';
const STORAGE_REGISTERED_TEACHERS_KEY = 'lucky_english_registered_teachers';

// Pre-seeded default teacher for immediate local testing if no teachers registered yet
const DEFAULT_DEMO_TEACHER = {
  id: 'teacher_default_admin',
  email: 'docente@casino.edu',
  name: 'Profesor(a) Titular',
  passwordHash: btoa('docente123'),
  role: 'teacher',
  createdAt: 1700000000000
};

// Helper to get registered teachers list from localStorage
export function getRegisteredTeachers() {
  try {
    const raw = localStorage.getItem(STORAGE_REGISTERED_TEACHERS_KEY);
    if (!raw) {
      // Seed default teacher
      const initial = [DEFAULT_DEMO_TEACHER];
      localStorage.setItem(STORAGE_REGISTERED_TEACHERS_KEY, JSON.stringify(initial));
      return initial;
    }
    return JSON.parse(raw);
  } catch {
    return [DEFAULT_DEMO_TEACHER];
  }
}

// Get currently logged-in teacher
export function getCurrentTeacher() {
  try {
    const raw = localStorage.getItem(STORAGE_CURRENT_TEACHER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

// Register a new teacher account
export async function registerTeacher({ email, password, displayName }) {
  const cleanEmail = (email || '').trim().toLowerCase();
  const cleanName = (displayName || '').trim() || cleanEmail.split('@')[0];

  if (!cleanEmail || !cleanEmail.includes('@')) {
    throw new Error('Por favor ingresa un correo electrónico válido.');
  }

  if (!password || password.length < 6) {
    throw new Error('La contraseña debe tener al menos 6 caracteres.');
  }

  // 1. Try Firebase Auth if configured
  let firebaseUser = null;
  const app = getFirebaseAppInstance();
  if (isFirebaseConfigured() && app) {
    try {
      const auth = getAuth(app);
      const userCred = await createUserWithEmailAndPassword(auth, cleanEmail, password);
      if (userCred.user && cleanName) {
        await updateProfile(userCred.user, { displayName: cleanName });
      }
      firebaseUser = userCred.user;
    } catch (fbErr) {
      console.warn('Firebase Auth registration warning:', fbErr.message);
      // If email is already in use in Firebase, pass friendly message
      if (fbErr.code === 'auth/email-already-in-use') {
        throw new Error('Este correo ya se encuentra registrado en Firebase.');
      }
      // If other Firebase error, continue to local storage fallback
    }
  }

  // 2. Persist in registered teachers database (Local / Cloud)
  const existingTeachers = getRegisteredTeachers();
  const alreadyExists = existingTeachers.some(t => t.email.toLowerCase() === cleanEmail);
  if (alreadyExists) {
    throw new Error('Ya existe un docente registrado con este correo electrónico.');
  }

  const newTeacher = {
    id: firebaseUser ? firebaseUser.uid : `teacher_${Date.now()}`,
    email: cleanEmail,
    name: cleanName,
    passwordHash: btoa(password),
    role: 'teacher',
    createdAt: Date.now(),
    authProvider: firebaseUser ? 'firebase' : 'local'
  };

  const updatedTeachers = [...existingTeachers, newTeacher];
  localStorage.setItem(STORAGE_REGISTERED_TEACHERS_KEY, JSON.stringify(updatedTeachers));
  localStorage.setItem(STORAGE_CURRENT_TEACHER_KEY, JSON.stringify(newTeacher));

  return newTeacher;
}

// Log in as teacher
export async function loginTeacher({ email, password }) {
  const cleanEmail = (email || '').trim().toLowerCase();
  if (!cleanEmail || !password) {
    throw new Error('Por favor ingresa correo y contraseña.');
  }

  // 1. Try Firebase Auth if configured
  const app = getFirebaseAppInstance();
  if (isFirebaseConfigured() && app) {
    try {
      const auth = getAuth(app);
      const userCred = await signInWithEmailAndPassword(auth, cleanEmail, password);
      const user = userCred.user;
      const loggedTeacher = {
        id: user.uid,
        email: user.email,
        name: user.displayName || cleanEmail.split('@')[0],
        role: 'teacher',
        authProvider: 'firebase'
      };
      localStorage.setItem(STORAGE_CURRENT_TEACHER_KEY, JSON.stringify(loggedTeacher));
      return loggedTeacher;
    } catch (fbErr) {
      console.warn('Firebase Auth login failed, checking local credentials:', fbErr.code);
      if (fbErr.code === 'auth/wrong-password' || fbErr.code === 'auth/invalid-credential') {
        throw new Error('Contraseña o correo incorrectos en Firebase.');
      }
      // If user-not-found in Firebase, check local fallback before rejecting
    }
  }

  // 2. Local Fallback authentication
  const registeredTeachers = getRegisteredTeachers();
  const encodedInputPass = btoa(password);

  const matched = registeredTeachers.find(
    t => t.email.toLowerCase() === cleanEmail && t.passwordHash === encodedInputPass
  );

  if (!matched) {
    throw new Error('Credenciales incorrectas. Verifica tu correo y contraseña o regístrate como nuevo docente.');
  }

  const teacherSession = {
    id: matched.id,
    email: matched.email,
    name: matched.name,
    role: 'teacher',
    authProvider: matched.authProvider || 'local'
  };

  localStorage.setItem(STORAGE_CURRENT_TEACHER_KEY, JSON.stringify(teacherSession));
  return teacherSession;
}

// Log out teacher
export async function logoutTeacher() {
  const app = getFirebaseAppInstance();
  if (isFirebaseConfigured() && app) {
    try {
      const auth = getAuth(app);
      await signOut(auth);
    } catch (err) {
      console.warn('Firebase signOut error:', err);
    }
  }
  localStorage.removeItem(STORAGE_CURRENT_TEACHER_KEY);
}
