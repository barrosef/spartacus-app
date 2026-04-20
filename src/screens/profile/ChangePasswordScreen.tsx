import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import {
  EmailAuthProvider,
  reauthenticateWithCredential,
  updatePassword,
} from "firebase/auth";
import { auth } from "../../lib/firebase";
import { Input } from "../../components/ui/Input";
import { Button } from "../../components/ui/Button";
import { SuccessScreen } from "../../components/ui/SuccessScreen";
import { colors, typography, spacing } from "../../theme/tokens";

interface ChangePasswordScreenProps {
  onBack: () => void;
}

interface FieldErrors {
  current?: string;
  next?: string;
  confirm?: string;
}

export function ChangePasswordScreen({ onBack }: ChangePasswordScreenProps) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  function validate(): boolean {
    const newErrors: FieldErrors = {};
    if (!currentPassword) {
      newErrors.current = "Informe a senha atual";
    }
    if (!newPassword) {
      newErrors.next = "Informe a nova senha";
    } else if (newPassword.length < 6) {
      newErrors.next = "A nova senha deve ter no mínimo 6 caracteres";
    }
    if (!confirmPassword) {
      newErrors.confirm = "Confirme a nova senha";
    } else if (newPassword !== confirmPassword) {
      newErrors.confirm = "As senhas não conferem";
    }
    if (currentPassword && newPassword && currentPassword === newPassword) {
      newErrors.next = "A nova senha deve ser diferente da atual";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  async function handleSave() {
    if (!validate()) return;

    const user = auth.currentUser;
    if (!user || !user.email) {
      setErrors({ current: "Sessão inválida. Faça login novamente." });
      return;
    }

    setLoading(true);
    try {
      // Reauthenticate before sensitive operation
      const credential = EmailAuthProvider.credential(
        user.email,
        currentPassword,
      );
      await reauthenticateWithCredential(user, credential);

      // Update password
      await updatePassword(user, newPassword);
      setSuccess(true);
    } catch (e: unknown) {
      const err = e as { code?: string };
      if (
        err.code === "auth/wrong-password" ||
        err.code === "auth/invalid-credential"
      ) {
        setErrors({ current: "Senha atual incorreta" });
      } else if (err.code === "auth/weak-password") {
        setErrors({ next: "Senha muito fraca. Use pelo menos 6 caracteres." });
      } else if (err.code === "auth/requires-recent-login") {
        setErrors({
          current: "Sessão expirada. Faça login novamente para continuar.",
        });
      } else {
        setErrors({ confirm: "Erro ao alterar senha. Tente novamente." });
      }
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <SuccessScreen
        title="Senha alterada"
        message="Sua senha foi atualizada com sucesso."
        autoDismissMs={2000}
        onDismiss={onBack}
      />
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack}>
          <Feather name="chevron-left" size={24} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Alterar senha</Text>
        <View style={styles.headerSpacer} />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.flex}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.intro}>
            Para sua segurança, informe sua senha atual antes de definir uma
            nova.
          </Text>

          <View style={styles.form}>
            <Input
              label="Senha atual"
              placeholder="Informe sua senha atual"
              secureTextEntry
              value={currentPassword}
              onChangeText={(text) => {
                setCurrentPassword(text);
                setErrors((prev) => ({ ...prev, current: undefined }));
              }}
              error={errors.current}
            />

            <Input
              label="Nova senha"
              placeholder="Mínimo 6 caracteres"
              secureTextEntry
              value={newPassword}
              onChangeText={(text) => {
                setNewPassword(text);
                setErrors((prev) => ({ ...prev, next: undefined }));
              }}
              error={errors.next}
              hint="A senha deve ter no mínimo 6 caracteres"
            />

            <Input
              label="Confirme a nova senha"
              placeholder="Digite a nova senha novamente"
              secureTextEntry
              value={confirmPassword}
              onChangeText={(text) => {
                setConfirmPassword(text);
                setErrors((prev) => ({ ...prev, confirm: undefined }));
              }}
              error={errors.confirm}
            />

            <Button
              label="Alterar senha"
              onPress={handleSave}
              loading={loading}
              disabled={!currentPassword || !newPassword || !confirmPassword}
              style={styles.submitBtn}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 4,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: {
    flex: 1,
    textAlign: "center",
    color: colors.foreground,
    fontFamily: typography.fontHeadingSemi,
    fontSize: 18,
  },
  headerSpacer: { width: 24 },
  scroll: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  intro: {
    color: colors.mutedForeground,
    fontFamily: typography.fontBody,
    fontSize: 14,
    lineHeight: 21,
    marginBottom: spacing.lg,
  },
  form: {
    gap: spacing.md + 4,
  },
  submitBtn: {
    marginTop: spacing.md,
  },
});
