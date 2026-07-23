// ─── Firebase Init ────────────────────────────────────────────────────────────

import { initializeApp, getApps } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, enableIndexedDbPersistence } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = (() => {
  const dbInstance = getFirestore(app);
  // Enable offline persistence
  if (typeof window !== 'undefined') {
    enableIndexedDbPersistence(dbInstance)
      .then(() => console.log('[BoulderHub] Firestore persistence enabled'))
      .catch((err) => {
        if (err.code === 'failed-precondition') {
          console.warn('[BoulderHub] Multiple tabs open, persistence disabled in non-primary tab');
        } else if (err.code === 'unimplemented') {
          console.warn('[BoulderHub] Browser does not support persistence');
        }
      });
  }
  return dbInstance;
})();
export const storage = getStorage(app);

export default app;
