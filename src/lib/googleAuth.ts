import { useEffect, useState, useRef, useCallback } from "react";
import { Platform } from "react-native";
import { GoogleAuthProvider, signInWithCredential, signInWithPopup } from "firebase/auth";
import { auth } from "./firebase";

// IDs de cliente OAuth — configure em .env:
//   EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID
//   EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID
//   EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID
const WEB_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ?? "";
const ANDROID_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID ?? "";
const IOS_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID ?? "";

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
      .catch((err) => {
        console.error("[GoogleAuth] signInWithPopup failed:", err?.code, err?.message, err);
        setError("Falha ao autenticar com Google.");
      })
      .finally(() => setLoading(false));
  }, []);

  return { signIn, loading, error, ready: true };
}

// ── Native: uses expo-auth-session + expo-web-browser ────────────────────────
// Lazy-load to avoid crash when native modules are not available
let useAuthRequestFn: ((config: { webClientId: string; androidClientId: string; iosClientId: string }) =>
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

function useAuthRequestStub(_config: { webClientId: string; androidClientId: string; iosClientId: string }): [null, null, () => Promise<never>] {
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
    iosClientId: IOS_CLIENT_ID,
  });

  useEffect(() => {
    if (!available || !response) return;
    if (response?.type === "success") {
      const idToken = response.params?.id_token ?? response.authentication?.idToken;
      if (!idToken) {
        console.error("[GoogleAuth] No id_token in success response", response);
        setError("Nao foi possivel obter o token do Google.");
        setLoading(false);
        return;
      }
      const credential = GoogleAuthProvider.credential(idToken);
      setLoading(true);
      signInWithCredential(auth, credential)
        .then(() => onSuccessRef.current?.())
        .catch((err) => {
          const code = err?.code ?? "unknown";
          const message = err?.message ?? String(err);
          console.error(
            "[GoogleAuth] signInWithCredential failed:",
            code,
            message,
            err,
          );
          setError(`Falha ao autenticar: ${code}`);
        })
        .finally(() => setLoading(false));
    } else if (response?.type === "error") {
      console.error("[GoogleAuth] Auth request error:", response);
      setError(
        `Login Google falhou: ${response.error?.message ?? response.error?.code ?? "erro desconhecido"}`,
      );
      setLoading(false);
    } else if (response?.type === "dismiss" || response?.type === "cancel") {
      console.warn("[GoogleAuth] User cancelled login:", response.type);
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
    const platformClientId = Platform.OS === "ios" ? IOS_CLIENT_ID : ANDROID_CLIENT_ID;
    if (!WEB_CLIENT_ID || !platformClientId) {
      console.error(
        "[GoogleAuth] Missing client IDs. WEB:",
        !!WEB_CLIENT_ID,
        "ANDROID:",
        !!ANDROID_CLIENT_ID,
        "IOS:",
        !!IOS_CLIENT_ID,
      );
      setError("Configuracao do Google incompleta no app.");
      setLoading(false);
      return;
    }
    promptAsync().catch((err) => {
      console.error("[GoogleAuth] promptAsync failed:", err);
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
