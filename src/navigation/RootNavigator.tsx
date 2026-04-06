import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { View, Text, StyleSheet } from "react-native";
import { onAuthStateChanged, type User } from "firebase/auth";
import { auth } from "../lib/firebase";
import { api } from "../lib/api";
import { AuthNavigator } from "./AuthNavigator";
import { AnamneseNavigator } from "./AnamneseNavigator";
import { PendingEmailScreen } from "../screens/auth/PendingEmailScreen";
import { BlockedStatusScreen } from "../screens/auth/BlockedStatusScreen";
import { colors, typography } from "../theme/tokens";
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

type AppState = "loading" | "auth" | "email_pending" | "blocked" | "anamnese" | "approved";

export function RootNavigator() {
  const [user, setUser] = useState<User | null>(null);
  const [appState, setAppState] = useState<AppState>("loading");
  const [accountStatus, setAccountStatus] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [timedOut, setTimedOut] = useState(false);
  const [signupInProgress, setSignupInProgress] = useState(false);

  const checkApproval = useCallback(async () => {
    try {
      const res = await api.get<{
        approvalStatus: string;
        birthDate?: string;
      }>("/auth/me");
      const status = res.approvalStatus;
      setAccountStatus(status);
      if (res.birthDate) setBirthDate(res.birthDate);
      if (status === "approved") {
        setAppState("approved");
      } else if (status === "waiting_email_confirmation") {
        setAppState("email_pending");
      } else if (status === "waiting_medical_history") {
        setAppState("anamnese");
      } else {
        setAppState("blocked");
      }
    } catch {
      setAppState("blocked");
      setAccountStatus("pending_approval");
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
      ) : appState === "email_pending" ? (
        <PendingEmailScreen
          email={user?.email ?? ""}
          onVerified={() => {
            setAccountStatus("pending_approval");
            setAppState("blocked");
          }}
        />
      ) : appState === "anamnese" ? (
        <AnamneseNavigator
          birthDate={birthDate}
          onSubmitted={() => {
            setAccountStatus("pending_medical_history_approval");
            setAppState("blocked");
          }}
        />
      ) : appState === "blocked" ? (
        <BlockedStatusScreen status={accountStatus} />
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
