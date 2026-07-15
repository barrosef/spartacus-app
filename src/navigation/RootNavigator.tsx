import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { Platform, View, Text, Image, StyleSheet } from "react-native";
import { onAuthStateChanged, signOut, type User } from "firebase/auth";
import { auth } from "../lib/firebase";
import { api } from "../lib/api";
import {
  registerForPushNotifications,
  setupNotificationListeners,
} from "../lib/pushNotifications";
import { AuthNavigator } from "./AuthNavigator";
import { PendingEmailScreen } from "../screens/auth/PendingEmailScreen";
import { BlockedStatusScreen } from "../screens/auth/BlockedStatusScreen";
import { SafeScreen } from "../components/ui/SafeScreen";
import { Button } from "../components/ui/Button";
import { colors, typography, spacing } from "../theme/tokens";
import { MainNavigator } from "./MainNavigator";

// eslint-disable-next-line @typescript-eslint/no-require-imports
const logo = require("../../assets/logo.png");

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

  if (appState === "loading" && !resetLanding) {
    return (
      <View style={styles.loading}>
        <Text style={styles.loadingText}>Spartacus</Text>
        {timedOut && (
          <Text style={styles.errorDetail}>
            Firebase Auth não respondeu. Verifique sua conexão.
          </Text>
        )}
      </View>
    );
  }

  const showAuth = resetLanding || appState === "auth" || signupInProgress;

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
        accountStatus === "app_banned" ? (
          <SafeScreen>
            <View style={styles.bannedContainer}>
              <Image source={logo} style={styles.bannedLogo} resizeMode="contain" />

              <Text style={styles.bannedIcon}>🚫</Text>
              <Text style={styles.bannedTitle}>Acesso bloqueado</Text>
              <Text style={styles.bannedMessage}>
                Seu acesso foi bloqueado pela equipe.
                {moderationReason ? `\n\nMotivo: ${moderationReason}` : ""}
              </Text>

              <View style={styles.bannedFooter}>
                <Button
                  label="Voltar ao login"
                  variant="outline"
                  onPress={() => signOut(auth)}
                />
              </View>
            </View>
          </SafeScreen>
        ) : (
          <BlockedStatusScreen status={accountStatus} />
        )
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
  bannedContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.lg,
  },
  bannedLogo: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 2,
    borderColor: "rgba(198,163,78,0.3)",
    marginBottom: spacing.lg,
  },
  bannedIcon: {
    fontSize: 48,
    marginBottom: spacing.md,
  },
  bannedTitle: {
    fontSize: 22,
    fontFamily: typography.fontHeading,
    color: colors.foreground,
    textTransform: "uppercase",
    letterSpacing: 1,
    textAlign: "center",
    marginBottom: spacing.sm,
  },
  bannedMessage: {
    fontSize: 14,
    fontFamily: typography.fontBody,
    color: colors.mutedForeground,
    textAlign: "center",
    lineHeight: 20,
    marginBottom: spacing.xl,
    paddingHorizontal: spacing.md,
  },
  bannedFooter: {
    width: "100%",
  },
});
