import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, type Auth } from 'firebase/auth';
// Fix firestore imports by separating type and value imports
import { getFirestore } from 'firebase/firestore';
import type { Firestore } from 'firebase/firestore';
import { initializeAppCheck, ReCaptchaV3Provider } from 'firebase/app-check';

// Firebase web config is public by design — access control lives in
// Firestore rules, App Check, and the Cloud Functions auth checks.
const firebaseConfig = {
  apiKey: 'AIzaSyAgok7C_4SGlOv3CibSJ9btpLRC5f1XqLY',
  authDomain: 'sql-calculation-393000.firebaseapp.com',
  projectId: 'sql-calculation-393000',
  storageBucket: 'sql-calculation-393000.firebasestorage.app',
  messagingSenderId: '755973674567',
  appId: '1:755973674567:web:f3fc6016e1bfbda3144362'
};

// Ensure app is initialized exactly once with a consistent version of the SDK
let app: FirebaseApp;
if (!getApps().length) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApp();
}

// App Check MUST be initialized before getAuth/getFirestore so the Firebase SDK
// automatically attaches App Check tokens to all Firestore and Auth requests.
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore — import.meta.env is defined by Vite at build time
const RECAPTCHA_SITE_KEY: string | undefined = import.meta.env.VITE_RECAPTCHA_SITE_KEY;
export const appCheck = RECAPTCHA_SITE_KEY
  ? initializeAppCheck(app, {
      provider: new ReCaptchaV3Provider(RECAPTCHA_SITE_KEY),
      isTokenAutoRefreshEnabled: true,
    })
  : null;

// These initializations register the components with the 'app' instance
export const auth: Auth = getAuth(app);
export const db: Firestore = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();

export default app;
