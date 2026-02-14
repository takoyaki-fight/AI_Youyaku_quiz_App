import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, type Auth } from "firebase/auth";

const fallbackFirebaseConfig = {
  apiKey: "AIzaSyDnfcSSSJJxWzlYdJigupHKN1q3D8TqX7A",
  authDomain: "study-with-ai-daily-qa.firebaseapp.com",
  projectId: "study-with-ai-daily-qa",
};

const firebaseConfig = {
  apiKey:
    process.env.NEXT_PUBLIC_FIREBASE_API_KEY || fallbackFirebaseConfig.apiKey,
  authDomain:
    process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ||
    fallbackFirebaseConfig.authDomain,
  projectId:
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ||
    fallbackFirebaseConfig.projectId,
};

let appInstance: FirebaseApp | null = null;
let authInstance: Auth | null = null;

function validateConfig() {
  if (!firebaseConfig.apiKey || !firebaseConfig.authDomain || !firebaseConfig.projectId) {
    throw new Error("Firebase client config is missing");
  }
}

export function getFirebaseApp(): FirebaseApp {
  if (!appInstance) {
    validateConfig();
    appInstance = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
  }

  return appInstance;
}

export function getFirebaseAuth(): Auth {
  if (!authInstance) {
    authInstance = getAuth(getFirebaseApp());
  }

  return authInstance;
}

export const googleProvider = new GoogleAuthProvider();
