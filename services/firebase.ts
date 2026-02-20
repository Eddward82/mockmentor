import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, type Auth } from 'firebase/auth';
// Fix firestore imports by separating type and value imports
import { getFirestore } from 'firebase/firestore';
import type { Firestore } from 'firebase/firestore';

const getEnv = (key: string, fallback: string): string => {
  try {
    const env = (window as any).process?.env || (typeof process !== 'undefined' ? process.env : {});
    return env[key] || fallback;
  } catch (e) {
    return fallback;
  }
};

const firebaseConfig = {
  apiKey: getEnv('FIREBASE_API_KEY', 'AIzaSyAgok7C_4SGlOv3CibSJ9btpLRC5f1XqLY'),
  authDomain: getEnv('FIREBASE_AUTH_DOMAIN', 'sql-calculation-393000.firebaseapp.com'),
  projectId: getEnv('FIREBASE_PROJECT_ID', 'sql-calculation-393000'),
  storageBucket: getEnv('FIREBASE_STORAGE_BUCKET', 'sql-calculation-393000.firebasestorage.app'),
  messagingSenderId: getEnv('FIREBASE_MESSAGING_SENDER_ID', '755973674567'),
  appId: getEnv('FIREBASE_APP_ID', '1:755973674567:web:f3fc6016e1bfbda3144362')
};

// Ensure app is initialized exactly once with a consistent version of the SDK
let app: FirebaseApp;
if (!getApps().length) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApp();
}

// These initializations register the components with the 'app' instance
export const auth: Auth = getAuth(app);
export const db: Firestore = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();

export default app;
