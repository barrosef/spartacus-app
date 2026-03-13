import { useEffect, useState, useRef } from "react";
import { GoogleAuthProvider, signInWithCredential } from "firebase/auth";
import { auth } from "./firebase";

// IDs de cliente OAuth — configure em .env:
//   EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID
//   EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID
const WEB_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ?? "";
const ANDROID_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID ?? "";

// Lazy-load expo-auth-session and expo-web-browser to avoid crash
// when native modules are not available (Expo Go without dev build)
let Google: typeof import("expo-auth-session/providers/google") | null = null;
try {
  Google = require("expo-auth-session/providers/google");
  const WebBrowser = require("expo-web-browser");
  WebBrowser.maybeCompleteAuthSession();
} catch {
  // Native modules not available — Google Sign-In disabled
}

export function useGoogleSignIn(onSuccess?: () => void) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const onSuccessRef = useRef(onSuccess);
  onSuccessRef.current = onSuccess;

  // When native modules are missing, return a disabled state
  if (!Google) {
    return {
      signIn: () => setError("Google Sign-In não disponível neste build."),
      loading: false,
      error,
      ready: false,
    };
  }

  const [request, response, promptAsync] = Google.useAuthRequest({
    webClientId: WEB_CLIENT_ID,
    androidClientId: ANDROID_CLIENT_ID,
  });

  useEffect(() => {
    if (response?.type === "success") {
      const idToken = response.params?.id_token ?? response.authentication?.idToken;
      if (!idToken) {
        setError("Não foi possível obter o token do Google.");
        setLoading(false);
        return;
      }
      const credential = GoogleAuthProvider.credential(idToken);
      setLoading(true);
      signInWithCredential(auth, credential)
        .then(() => onSuccessRef.current?.())
        .catch(() => setError("Falha ao autenticar com Google."))
        .finally(() => setLoading(false));
    } else if (response?.type === "error") {
      setError("Login com Google cancelado ou falhou.");
      setLoading(false);
    }
  }, [response]);

  function signIn() {
    setError(null);
    setLoading(true);
    promptAsync().catch(() => {
      setError("Não foi possível abrir o login do Google.");
      setLoading(false);
    });
  }

  return { signIn, loading, error, ready: !!request };
}
