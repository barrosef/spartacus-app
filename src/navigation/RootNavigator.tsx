import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { Platform, View, Text, StyleSheet } from "react-native";
import { onAuthStateChanged, type User } from "firebase/auth";
import { useShareIntentContext } from "../lib/shareIntent";
import { auth } from "../lib/firebase";
import { api } from "../lib/api";
import {
  registerForPushNotifications,
  setupNotificationListeners,
} from "../lib/pushNotifications";
import { AuthNavigator } from "./AuthNavigator";
import { PendingEmailScreen } from "../screens/auth/PendingEmailScreen";
import { BlockedStatusScreen } from "../screens/auth/BlockedStatusScreen";
import { SigningInOverlay } from "../components/ui/SigningInOverlay";
import { colors, typography } from "../theme/tokens";
import { markSharedWhileLoggedOut } from "../lib/share/loggedOutShareFlag";
import { MainNavigator } from "./MainNavigator";

// ── Signup guard ─────────────────────────────────────────────────────────────
interface SignupGuard {
  signupInProgress: boolean;
  setSignupInProgress: (v: boolean) => void;
}

const SignupGuardCtx = createContext<SignupGuard>({
  signupInProgress: false,
  setSignupInProgress: () => {},
});

export function useSignupGuard() {
  return useContext(SignupGuardCtx);
}

type AppState = "loading" | "auth" | "email_pending" | "blocked" | "approved";

function isPasswordResetLanding(): boolean {
  if (Platform.OS !== "web" || typeof window === "undefined") return false;
  try {
    return new URLSearchParams(window.location.search).has("oobCode");
  } catch {
    return false;
  }
}

export function RootNavigator() {
  const [user, setUser] = useState<User | null>(null);
  const [appState, setAppState] = useState<AppState>("loading");
  // Password-reset link landing bypasses the normal app-state routing:
  // regardless of whether the user is signed in, show AuthNavigator so the
  // ResetPassword screen can handle the oobCode.
  const resetLanding = isPasswordResetLanding();
  const [accountStatus, setAccountStatus] = useState("");
  const [moderationReason, setModerationReason] = useState("");
  const [timedOut, setTimedOut] = useState(false);
  const [signupInProgress, setSignupInProgress] = useState(false);

  const checkApproval = useCallback(async () => {
    try {
      const res = await api.get<{
        approvalStatus: string;
        birthDate?: string;
        appBanned?: boolean;
        moderationReason?: string;
      }>("/auth/me");

      if (res.appBanned) {
        setAccountStatus("app_banned");
        setModerationReason(res.moderationReason ?? "");
        setAppState("blocked");
        return;
      }

      const status = res.approvalStatus;
      setAccountStatus(status);

      if (status === "waiting_email_confirmation") {
        setAppState("email_pending");
        return;
      }

      if (status === "approved") {
        setAppState("approved");
      } else {
        setAppState("blocked");
      }
    } catch {
      setAppState("blocked");
      setAccountStatus("pending_approval");
    }
  }, [user]);

  useEffect(() => {
    const timeout = setTimeout(() => setTimedOut(true), 10_000);
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      clearTimeout(timeout);
      setUser(u);
      if (!u) {
        setAppState("auth");
      }
    });
    return () => {
      clearTimeout(timeout);
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (user && !signupInProgress) {
      checkApproval();
    }
  }, [user, signupInProgress, checkApproval]);

  // Push notifications: register token + listen as soon as user is logged in
  // (don't wait for approval — this triggers the OS permission prompt early
  // so the user grants permission right after install/login)
  useEffect(() => {
    if (!user || signupInProgress) return;

    registerForPushNotifications().catch((e) => {
      console.error("[Push] Registration failed:", e);
    });

    const cleanup = setupNotificationListeners();
    return cleanup;
  }, [user, signupInProgress]);

  const { hasShareIntent: rawHasShareIntent, resetShareIntent } =
    useShareIntentContext();

  // Enquanto a UI de login está visível, qualquer mídia compartilhada é
  // descartada (não atravessa a autenticação na v1) e sinalizada para o
  // MainNavigator avisar após o login. Cold-start já autenticado nunca passa
  // por "auth", então não descarta a mídia.
  const authScreenVisible =
    resetLanding || appState === "auth" || signupInProgress;
  useEffect(() => {
    if (authScreenVisible && rawHasShareIntent) {
      markSharedWhileLoggedOut();
      resetShareIntent();
    }
  }, [authScreenVisible, rawHasShareIntent, resetShareIntent]);

  if (appState === "loading" && !resetLanding) {
    return (
      <View style={styles.loading}>
        <SigningInOverlay message="Carregando…" hint="Um instante" />
        {timedOut && (
          <Text style={styles.errorDetail}>
            Firebase Auth não respondeu. Verifique sua conexão.
          </Text>
        )}
      </View>
    );
  }

  const showAuth = resetLanding || appState === "auth" || signupInProgress;

  // Firebase já autenticou, mas o /auth/me ainda não voltou: sem isso a tela
  // de login segue em pé com o botão do Google habilitado e a pessoa acha que
  // travou. O cadastro é exceção — lá o wizard precisa continuar visível.
  const signingIn = user !== null && !signupInProgress && appState === "auth";

  if (signingIn) {
    return <SigningInOverlay />;
  }

  return (
    <SignupGuardCtx.Provider value={{ signupInProgress, setSignupInProgress }}>
      {showAuth ? (
        <AuthNavigator />
      ) : appState === "email_pending" ? (
        <PendingEmailScreen
          email={user?.email ?? ""}
          onVerified={() => {
            setAccountStatus("pending_approval");
            setAppState("blocked");
          }}
        />
      ) : appState === "blocked" ? (
        <BlockedStatusScreen status={accountStatus} reason={moderationReason} />
      ) : (
        <MainNavigator />
      )}
    </SignupGuardCtx.Provider>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingText: {
    color: colors.primary,
    fontSize: 28,
    fontFamily: typography.fontHeading,
    letterSpacing: 4,
    textTransform: "uppercase",
  },
  errorDetail: {
    color: colors.mutedForeground,
    fontSize: 12,
    fontFamily: typography.fontBody,
    marginTop: 16,
    textAlign: "center",
    paddingHorizontal: 32,
  },
});
