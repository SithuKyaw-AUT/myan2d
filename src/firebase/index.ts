import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { firebaseConfig } from './config';

// Provides a memoized Firebase app instance.
let app: FirebaseApp;
function getFirebaseApp() {
  if (app) return app;
  const apps = getApps();
  if (apps.length > 0) {
    app = apps[0] as FirebaseApp;
  } else {
    app = initializeApp(firebaseConfig);
  }
  return app;
}

export function initializeFirebase() {
  const app = getFirebaseApp();
  const auth = getAuth(app);
  const firestore = getFirestore(app);
  return { app, auth, firestore };
}

// Export the provider and hooks
export { FirebaseProvider, useFirebase, useFirebaseApp, useAuth, useFirestore } from './provider';
export { FirebaseClientProvider } from './client-provider';
export { useUser } from './auth/use-user';
export { useCollection } from './firestore/use-collection';
export { useDoc } from './firestore/use-doc';
