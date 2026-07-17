import React from "react";
import { View, Text, ScrollView, StyleSheet, ActivityIndicator } from "react-native";
import { useFonts, Inter_400Regular, Inter_500Medium, Inter_600SemiBold } from "@expo-google-fonts/inter";
import { Montserrat_600SemiBold, Montserrat_700Bold } from "@expo-google-fonts/montserrat";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { ShareIntentProvider } from "expo-share-intent";
import { RootNavigator } from "./navigation/RootNavigator";
import { MediaViewerProvider } from "./components/timeline/MediaViewerContext";
import { DialogProvider } from "./components/ui/DialogProvider";
import { colors } from "./theme/tokens";

interface ErrorBoundaryState {
  error: Error | null;
}

class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  render() {
    if (this.state.error) {
      return (
        <View style={styles.errorContainer}>
          <Text style={styles.errorTitle}>Crash detectado</Text>
          <ScrollView>
            <Text style={styles.errorMessage}>
              {this.state.error.message}
            </Text>
            <Text style={styles.errorStack}>
              {this.state.error.stack}
            </Text>
          </ScrollView>
        </View>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Montserrat_600SemiBold,
    Montserrat_700Bold,
  });
  if (!fontsLoaded && !fontError) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <ShareIntentProvider>
        <ErrorBoundary>
          <DialogProvider>
            <MediaViewerProvider>
              <RootNavigator />
            </MediaViewerProvider>
          </DialogProvider>
        </ErrorBoundary>
      </ShareIntentProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: "center",
    alignItems: "center",
  },
  errorContainer: {
    flex: 1,
    backgroundColor: "#1a0000",
    padding: 20,
    paddingTop: 60,
  },
  errorTitle: {
    color: "#ff4444",
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 12,
  },
  errorMessage: {
    color: "#ffcccc",
    fontSize: 14,
    marginBottom: 12,
  },
  errorStack: {
    color: "#888",
    fontSize: 11,
    fontFamily: "monospace",
  },
});
