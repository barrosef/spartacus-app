import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { useAuthNavigation } from "../../../navigation/AuthNavContext";
import { SafeScreen } from "../../../components/ui/SafeScreen";
import { WizardHeader } from "../../../components/wizard/WizardHeader";
import { Button } from "../../../components/ui/Button";
import { useWizard } from "../../../context/WizardContext";
import { setProjectId } from "../../../lib/api";
import { colors, typography, spacing, radius } from "../../../theme/tokens";

const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:8000";

interface ProjectOption {
  id: string;
  name: string;
  logo_url?: string;
  city?: string;
  state?: string;
}

export function Step0cProject() {
  const navigation = useAuthNavigation();
  const { state, dispatch } = useWizard();
  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [autoAdvanced, setAutoAdvanced] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${BASE_URL}/projects`);
        if (res.ok) {
          const list: ProjectOption[] = await res.json();
          setProjects(list);
          // Auto-select if single project (ADR-14 §6.3)
          if (list.length === 1) {
            dispatch({ type: "SET_PROJECT", payload: list[0].id });
            setProjectId(list[0].id);
            setAutoAdvanced(true);
            setTimeout(() => {
              navigation.navigate("Step1Profile");
            }, 400);
          }
        }
      } catch {
        // silently fail
      } finally {
        setLoading(false);
      }
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selected = state.projectId;

  function handleSelect(id: string) {
    dispatch({ type: "SET_PROJECT", payload: id });
    setProjectId(id);
  }

  function handleNext() {
    navigation.navigate("Step1Profile");
  }

  if (loading || autoAdvanced) {
    return (
      <SafeScreen noPadding>
        <WizardHeader
          onBack={() => navigation.goBack()}
          currentStep={0}
          totalSteps={6}
          stepLabel="Projeto"
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Selecionando projeto...</Text>
        </View>
      </SafeScreen>
    );
  }

  return (
    <SafeScreen noPadding>
      <WizardHeader
        onBack={() => navigation.goBack()}
        currentStep={0}
        totalSteps={6}
        stepLabel="Projeto"
      />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.heading}>Projeto</Text>
        <Text style={styles.description}>
          Selecione o projeto para criar sua conta.
        </Text>

        <View style={styles.list}>
          {projects.map((p) => {
            const isSelected = selected === p.id;
            return (
              <TouchableOpacity
                key={p.id}
                style={[styles.card, isSelected && styles.cardSelected]}
                onPress={() => handleSelect(p.id)}
                activeOpacity={0.8}
              >
                <View style={styles.cardBody}>
                  <Text style={[styles.cardName, isSelected && styles.cardNameSelected]}>
                    {p.name}
                  </Text>
                  {p.city && (
                    <Text style={styles.cardInfo}>
                      {p.city}{p.state ? `, ${p.state}` : ""}
                    </Text>
                  )}
                </View>
                <View style={[styles.checkCircle, isSelected && styles.checkCircleSelected]}>
                  {isSelected && <Text style={styles.checkMark}>✓</Text>}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={styles.footer}>
          <Button
            label="Continuar"
            onPress={handleNext}
            disabled={!selected}
          />
        </View>
      </ScrollView>
    </SafeScreen>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
  },
  heading: {
    fontSize: 24,
    fontFamily: typography.fontHeading,
    color: colors.foreground,
    marginTop: spacing.xl,
    marginBottom: spacing.xs,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  description: {
    fontSize: 14,
    fontFamily: typography.fontBody,
    color: colors.mutedForeground,
    marginBottom: spacing.xl,
    lineHeight: 20,
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.md,
  },
  loadingText: {
    color: colors.mutedForeground,
    fontSize: 14,
    fontFamily: typography.fontBody,
  },
  list: {
    gap: spacing.sm,
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
  },
  cardSelected: {
    borderColor: colors.primary,
    backgroundColor: "rgba(198,163,78,0.08)",
  },
  cardBody: {
    flex: 1,
    gap: 2,
  },
  cardName: {
    fontSize: 15,
    fontFamily: typography.fontBodySemiBold,
    color: colors.foreground,
  },
  cardNameSelected: {
    color: colors.primary,
  },
  cardInfo: {
    fontSize: 13,
    fontFamily: typography.fontBody,
    color: colors.mutedForeground,
  },
  checkCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: spacing.md,
  },
  checkCircleSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  checkMark: {
    color: colors.primaryForeground,
    fontSize: 13,
    fontFamily: typography.fontBodySemiBold,
  },
  footer: {
    marginTop: spacing.xl,
  },
});
