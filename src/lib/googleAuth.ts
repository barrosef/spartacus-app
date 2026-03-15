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

// Stub hook used when native modules are unavailable
function useAuthRequestStub(_config: { webClientId: string; androidClientId: string }): [null, null, () => Promise<never>] {
  return [null, null, () => Promise.reject(new Error("unavailable"))] as const;
}

export function useGoogleSignIn(onSuccess?: () => void) {
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
