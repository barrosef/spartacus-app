import { initializeApp } from "firebase/app";
import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as FirebaseAuth from "firebase/auth";
import {
  initializeAuth,
  getAuth,
  connectAuthEmulator,
  GoogleAuthProvider,
  type Persistence,
} from "firebase/auth";

/** `getReactNativePersistence` existe só no build React Native do
 * @firebase/auth e não está nos tipos públicos do `firebase/auth`. A versão
 * anterior deste arquivo importava por caminho profundo
 * (`@firebase/auth/dist/rn/index.js`), o que só funciona se o npm hoistear o
 * pacote para o topo do node_modules — quando o lock foi regerado no upgrade
 * do SDK 54, ele passou a ficar aninhado em `firebase/node_modules`, o import
 * quebrou e a sessão virou memória: todo mundo relogando a cada abertura.
 * Pelo entrypoint público não há essa dependência de layout. */
const getReactNativePersistence = (
  FirebaseAuth as unknown as {
    getReactNativePersistence?: (storage: unknown) => Persistence;
  }
).getReactNativePersistence;

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
} else if (getReactNativePersistence) {
  _auth = initializeAuth(firebaseApp, {
    persistence: getReactNativePersistence(AsyncStorage),
  });
} else {
  // Fallback ruidoso de propósito: aqui a sessão NÃO sobrevive ao fechamento
  // do app, e um catch silencioso escondeu exatamente isso por um mês.
  console.error(
    "[Firebase] getReactNativePersistence indisponível — sessão ficará só em " +
      "memória (o usuário vai relogar a cada abertura). Verifique se o Metro " +
      "está resolvendo firebase/auth para o build React Native.",
  );
  _auth = getAuth(firebaseApp);
}

// Connect to Firebase Auth Emulator only in __DEV__ (Metro) builds.
// Standalone release APKs must never hit localhost — the phone's localhost
// is the device itself, not the dev machine, causing auth/network-request-failed.
if (
  __DEV__ &&
  process.env.EXPO_PUBLIC_USE_EMULATORS === "true"
) {
  try {
    connectAuthEmulator(_auth, "http://localhost:9099", {
      disableWarnings: true,
    });
  } catch {
    // Already connected or not available — ignore
  }
}

export const auth = _auth;
export const googleProvider = new GoogleAuthProvider();
