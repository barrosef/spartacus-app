import { useEffect, useState, useRef, useCallback } from "react";
import { Platform } from "react-native";
import { GoogleAuthProvider, signInWithCredential, signInWithPopup } from "firebase/auth";
import { auth } from "./firebase";

// IDs de cliente OAuth — configure em .env:
//   EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID
//   EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID
const WEB_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ?? "";
const ANDROID_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID ?? "";

// ── Web: uses Firebase signInWithPopup directly ──────────────────────────────
function useGoogleSignInWeb(onSuccess?: () => void) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const onSuccessRef = useRef(onSuccess);
  onSuccessRef.current = onSuccess;

  const signIn = useCallback(() => {
    setError(null);
    setLoading(true);
    const provider = new GoogleAuthProvider();
    signInWithPopup(auth, provider)
      .then(() => onSuccessRef.current?.())
      .catch(() => setError("Falha ao autenticar com Google."))
      .finally(() => setLoading(false));
  }, []);

  return { signIn, loading, error, ready: true };
}

// ── Native: uses expo-auth-session + expo-web-browser ────────────────────────
// Lazy-load to avoid crash when native modules are not available
let useAuthRequestFn: ((config: { webClientId: string; androidClientId: string }) =>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [any, any, () => Promise<any>]) | null = null;

try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const Google = require("expo-auth-session/providers/google");
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const WebBrowser = require("expo-web-browser");
  WebBrowser.maybeCompleteAuthSession();
  useAuthRequestFn = Google.useAuthRequest;
} catch {
  // Native modules not available — Google Sign-In disabled
}

function useAuthRequestStub(_config: { webClientId: string; androidClientId: string }): [null, null, () => Promise<never>] {
  return [null, null, () => Promise.reject(new Error("unavailable"))] as const;
}

function useGoogleSignInNative(onSuccess?: () => void) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const onSuccessRef = useRef(onSuccess);
  onSuccessRef.current = onSuccess;

  const available = useAuthRequestFn !== null;
  const useAuthRequest = useAuthRequestFn ?? useAuthRequestStub;

  const [request, response, promptAsync] = useAuthRequest({
    webClientId: WEB_CLIENT_ID,
    androidClientId: ANDROID_CLIENT_ID,
  });

  useEffect(() => {
    if (!available || !response) return;
    if (response?.type === "success") {
      const idToken = response.params?.id_token ?? response.authentication?.idToken;
      if (!idToken) {
        setError("Nao foi possivel obter o token do Google.");
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
  }, [response, available]);

  if (!available) {
    return {
      signIn: () => setError("Google Sign-In nao disponivel neste build."),
      loading: false,
      error,
      ready: false,
    };
  }

  function signIn() {
    setError(null);
    setLoading(true);
    promptAsync().catch(() => {
      setError("Nao foi possivel abrir o login do Google.");
      setLoading(false);
    });
  }

  return { signIn, loading, error, ready: !!request };
}

// ── Public hook — delegates to web or native implementation ──────────────────
export function useGoogleSignIn(onSuccess?: () => void) {
  if (Platform.OS === "web") {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    return useGoogleSignInWeb(onSuccess);
  }
  // eslint-disable-next-line react-hooks/rules-of-hooks
  return useGoogleSignInNative(onSuccess);
}
