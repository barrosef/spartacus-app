import React, { createContext, useContext, useState, useEffect } from "react";
import { View, Text, StyleSheet } from "react-native";
import { onAuthStateChanged, type User } from "firebase/auth";
import { auth } from "../lib/firebase";
import { AuthNavigator } from "./AuthNavigator";
import { colors, typography } from "../theme/tokens";

// ── Signup guard ─────────────────────────────────────────────────────────────
// Google Sign-In creates a Firebase user mid-wizard. Without this guard,
// onAuthStateChanged fires immediately and swaps to MainNavigator before the
// wizard can collect the remaining profile data.

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

// Placeholder for main app navigator (post-auth)
function MainNavigator() {
  return (
    <View style={styles.placeholder}>
      <Text style={styles.placeholderText}>App Principal</Text>
      <Text style={styles.placeholderSub}>Em desenvolvimento</Text>
    </View>
  );
}

export function RootNavigator() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [signupInProgress, setSignupInProgress] = useState(false);

  useEffect(() => {
    return onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
  }, []);

  if (loading) {
    return (
      <View style={styles.loading}>
        <Text style={styles.loadingText}>Spartacus</Text>
      </View>
    );
  }

  const showAuth = !user || signupInProgress;

  return (
    <SignupGuardCtx.Provider value={{ signupInProgress, setSignupInProgress }}>
      {showAuth ? <AuthNavigator /> : <MainNavigator />}
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
