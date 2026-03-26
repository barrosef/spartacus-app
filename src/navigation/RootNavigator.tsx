import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { View, Text, StyleSheet } from "react-native";
import { onAuthStateChanged, type User } from "firebase/auth";
import { auth } from "../lib/firebase";
import { api } from "../lib/api";
import { AuthNavigator } from "./AuthNavigator";
import { PendingScreen } from "../screens/auth/PendingScreen";
import { PendingEmailScreen } from "../screens/auth/PendingEmailScreen";
import { colors, typography } from "../theme/tokens";

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

// Placeholder for main app navigator (post-auth, approved)
function MainNavigator() {
  return (
    <View style={styles.placeholder}>
      <Text style={styles.placeholderText}>App Principal</Text>
      <Text style={styles.placeholderSub}>Em desenvolvimento</Text>
    </View>
  );
}

type AppState = "loading" | "auth" | "pending_email" | "pending_approval" | "approved";

export function RootNavigator() {
  const [user, setUser] = useState<User | null>(null);
  const [appState, setAppState] = useState<AppState>("loading");
  const [timedOut, setTimedOut] = useState(false);
  const [signupInProgress, setSignupInProgress] = useState(false);

  const checkApproval = useCallback(async () => {
    try {
      const res = await api.get<{ approvalStatus: string }>("/auth/me");
      if (res.approvalStatus === "approved") {
        setAppState("approved");
      } else if (res.approvalStatus === "pending_email") {
        setAppState("pending_email");
      } else {
        setAppState("pending_approval");
      }
    } catch {
      setAppState("pending_approval");
    }
  }, []);

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

  if (appState === "loading") {
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

  const showAuth = appState === "auth" || signupInProgress;

  return (
    <SignupGuardCtx.Provider value={{ signupInProgress, setSignupInProgress }}>
      {showAuth ? (
        <AuthNavigator />
      ) : appState === "pending_email" ? (
        <PendingEmailScreen
          email={user?.email ?? ""}
          onVerified={() => setAppState("pending_approval")}
        />
      ) : appState === "pending_approval" ? (
        <PendingScreen />
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
  placeholder: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: "center",
    justifyContent: "center",
  },
  placeholderText: {
    color: colors.foreground,
    fontSize: 20,
    fontFamily: typography.fontHeadingSemi,
  },
  placeholderSub: {
    color: colors.mutedForeground,
    fontSize: 14,
    fontFamily: typography.fontBody,
    marginTop: 8,
  },
});
