import React from "react";
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  TouchableWithoutFeedback,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, typography, spacing, radius } from "../../../theme/tokens";
import { CommentsSection } from "./CommentsSection";

interface Props {
  visible: boolean;
  onClose: () => void;
  entryId: string;
  count: number;
  canModerate: boolean;
  viewerRoles?: string[];
  onCountChange?: (delta: number) => void;
}

/**
 * Comentários numa folha sobre o feed, em vez de inline dentro do card.
 *
 * O motivo é o teclado: inline, o campo fica no meio de um feed rolante e
 * some atrás do teclado — rolar o feed na mão para compensar nunca alinhou
 * direito. Aqui o campo é o último elemento de uma superfície de tela cheia,
 * então o teclado não tem como cobri-lo e nenhuma medição é necessária.
 *
 * O KeyboardAvoidingView sem `behavior` no Android é o mesmo padrão do
 * RemoveCommentDialog e das telas de formulário: lá o adjustResize já dá
 * conta sozinho.
 */
export function CommentsSheet({
  visible, onClose, entryId, count, canModerate, viewerRoles, onCountChange,
}: Props) {
  // Sob edge-to-edge o sheet desenha por baixo da barra de navegação.
  const insets = useSafeAreaInsets();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}   // botão voltar do Android fecha a folha
    >
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <TouchableWithoutFeedback onPress={onClose}>
          <View style={styles.backdrop} />
        </TouchableWithoutFeedback>

        <View style={[styles.sheet, { paddingBottom: insets.bottom }]}>
          <View style={styles.grabber} />
          <View style={styles.header}>
            <Text style={styles.title}>
              {count > 0 ? `Comentários (${count})` : "Comentários"}
            </Text>
            <TouchableOpacity onPress={onClose} hitSlop={HIT_SLOP}>
              <Feather name="x" size={20} color={colors.mutedForeground} />
            </TouchableOpacity>
          </View>

          <CommentsSection
            entryId={entryId}
            canModerate={canModerate}
            viewerRoles={viewerRoles}
            onCountChange={onCountChange}
          />
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const HIT_SLOP = { top: 8, bottom: 8, left: 8, right: 8 };

const styles = StyleSheet.create({
  flex: { flex: 1 },
  // O backdrop preenche o que sobra acima da folha e fecha ao toque.
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)" },
  sheet: {
    // Altura fixa em fração da tela: a folha não deve crescer com o número de
    // comentários — quem rola é a lista lá dentro.
    height: "85%",
    backgroundColor: colors.background,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    borderTopWidth: 1,
    borderColor: colors.border,
  },
  grabber: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    alignSelf: "center",
    marginTop: spacing.sm,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: {
    color: colors.foreground,
    fontFamily: typography.fontHeading,
    fontSize: 16,
  },
});
