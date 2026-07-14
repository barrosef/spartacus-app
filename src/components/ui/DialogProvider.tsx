import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableWithoutFeedback,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { colors, typography, spacing, radius } from "../../theme/tokens";
import { Button } from "./Button";

/**
 * Branded, promise-based confirmation/alert dialogs — the standard replacement
 * for React Native's native `Alert.alert()` (unstyled gray OS popup that breaks
 * the app's visual identity). Wrap the app in <DialogProvider> once and use the
 * `useDialog()` hook anywhere:
 *
 *   const dialog = useDialog();
 *   if (await dialog.confirm({ message: "Registrar fora do dia agendado?" })) { ... }
 *   await dialog.alert({ title: "Pronto", message: "Presença registrada." });
 */

type Tone = "default" | "danger" | "success";

interface AlertOptions {
  title?: string;
  message?: string;
  confirmText?: string;
  tone?: Tone;
}

interface ConfirmOptions extends AlertOptions {
  cancelText?: string;
}

interface DialogApi {
  /** Single-button notice. Resolves when dismissed. */
  alert: (opts: AlertOptions | string) => Promise<void>;
  /** Two-button confirmation. Resolves true (confirm) / false (cancel). */
  confirm: (opts: ConfirmOptions | string) => Promise<boolean>;
}

const DialogContext = createContext<DialogApi | null>(null);

export function useDialog(): DialogApi {
  const ctx = useContext(DialogContext);
  if (!ctx) {
    throw new Error("useDialog deve ser usado dentro de <DialogProvider>");
  }
  return ctx;
}

const TONE_META: Record<
  Tone,
  { icon: keyof typeof Feather.glyphMap; color: string; bg: string }
> = {
  default: { icon: "help-circle", color: colors.primary, bg: "rgba(198,163,78,0.12)" },
  danger: { icon: "alert-triangle", color: colors.error, bg: "rgba(239,68,68,0.12)" },
  success: { icon: "check-circle", color: colors.success, bg: "rgba(76,175,80,0.12)" },
};

interface DialogState {
  visible: boolean;
  mode: "alert" | "confirm";
  title: string;
  message: string;
  confirmText: string;
  cancelText: string;
  tone: Tone;
}

const INITIAL: DialogState = {
  visible: false,
  mode: "alert",
  title: "",
  message: "",
  confirmText: "OK",
  cancelText: "Cancelar",
  tone: "default",
};

export function DialogProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<DialogState>(INITIAL);
  const resolveRef = useRef<((value: boolean) => void) | null>(null);

  const open = useCallback(
    (mode: "alert" | "confirm", raw: AlertOptions | string) => {
      const opts: ConfirmOptions =
        typeof raw === "string" ? { message: raw } : raw;
      return new Promise<boolean>((resolve) => {
        resolveRef.current = resolve;
        setState({
          visible: true,
          mode,
          title:
            opts.title ?? (mode === "confirm" ? "Confirmar" : "Aviso"),
          message: opts.message ?? "",
          confirmText:
            opts.confirmText ?? (mode === "confirm" ? "Confirmar" : "Entendi"),
          cancelText: opts.cancelText ?? "Cancelar",
          tone: opts.tone ?? "default",
        });
      });
    },
    [],
  );

  const settle = useCallback((value: boolean) => {
    setState((s) => ({ ...s, visible: false }));
    const resolve = resolveRef.current;
    resolveRef.current = null;
    resolve?.(value);
  }, []);

  const api = useMemo<DialogApi>(
    () => ({
      alert: (opts) => open("alert", opts).then(() => undefined),
      confirm: (opts) => open("confirm", opts),
    }),
    [open],
  );

  const meta = TONE_META[state.tone];
  const onConfirm = () => settle(true);
  const onCancel = () => settle(false);

  return (
    <DialogContext.Provider value={api}>
      {children}
      <Modal
        visible={state.visible}
        transparent
        animationType="fade"
        onRequestClose={onCancel}
      >
        <TouchableWithoutFeedback onPress={onCancel}>
          <View style={styles.overlay}>
            <TouchableWithoutFeedback>
              <View style={styles.container}>
                <View
                  style={[
                    styles.iconWrapper,
                    { backgroundColor: meta.bg, borderColor: meta.color + "40" },
                  ]}
                >
                  <Feather name={meta.icon} size={26} color={meta.color} />
                </View>

                <Text style={styles.title}>{state.title}</Text>
                {!!state.message && (
                  <Text style={styles.message}>{state.message}</Text>
                )}

                <View style={styles.footer}>
                  {state.mode === "confirm" && (
                    <Button
                      variant="outline"
                      label={state.cancelText}
                      onPress={onCancel}
                      style={styles.btn}
                    />
                  )}
                  <Button
                    label={state.confirmText}
                    onPress={onConfirm}
                    style={styles.btn}
                  />
                </View>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </DialogContext.Provider>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
  },
  container: {
    width: "100%",
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    alignItems: "center",
    gap: spacing.sm,
  },
  iconWrapper: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.xs,
  },
  title: {
    fontSize: 18,
    fontFamily: typography.fontHeadingSemi,
    color: colors.foreground,
    textAlign: "center",
  },
  message: {
    fontSize: 14,
    fontFamily: typography.fontBody,
    color: colors.mutedForeground,
    textAlign: "center",
    lineHeight: 20,
    paddingHorizontal: spacing.sm,
  },
  footer: {
    flexDirection: "row",
    gap: spacing.sm,
    width: "100%",
    marginTop: spacing.md,
  },
  btn: {
    flex: 1,
  },
});
