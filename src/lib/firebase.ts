import { initializeApp } from "firebase/app";
import { Platform } from "react-native";
import {
  initializeAuth,
  getAuth,
  GoogleAuthProvider,
} from "firebase/auth";

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

if (!firebaseConfig.apiKey) {
  throw new Error(
    "EXPO_PUBLIC_FIREBASE_API_KEY is missing. Check .env or eas.json env config.",
  );
}

export const firebaseApp = initializeApp(firebaseConfig);

// Web: getAuth() usa indexedDB + browserPopupRedirectResolver (signInWithPopup)
// Native: initializeAuth() com AsyncStorage persistence (React Native)
let _auth: ReturnType<typeof getAuth>;
if (Platform.OS === "web") {
  _auth = getAuth(firebaseApp);
} else {
  try {
    // Lazy imports — só carrega no native (evita crash no web bundler)
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { getReactNativePersistence } = require("@firebase/auth/dist/rn/index.js");
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const AsyncStorage = require("@react-native-async-storage/async-storage").default;
    _auth = initializeAuth(firebaseApp, {
      persistence: getReactNativePersistence(AsyncStorage),
    });
  } catch {
    _auth = getAuth(firebaseApp);
  }
}

export const auth = _auth;
export const googleProvider = new GoogleAuthProvider();
