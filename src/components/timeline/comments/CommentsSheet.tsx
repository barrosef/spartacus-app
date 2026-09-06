import React from "react";
import {
  View,
  Text,
  Modal,
  TouchableWithoutFeedback,
  StyleSheet,
  Dimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, typography, spacing, radius } from "../../../theme/tokens";
import { useKeyboardOffset } from "../../../hooks/useKeyboardOffset";
import { CommentsSection } from "./CommentsSection";

interface Props {
  visible: boolean;
  onClose: () => void;
  entryId: string;
  canModerate: boolean;
  viewerRoles?: string[];
  onCountChange?: (delta: number) => void;
}

/** Altura da folha em repouso, como fração da tela (padrão Instagram). */
const RESTING_TOP = 0.28;

/**
 * Comentários numa folha sobre o feed, ancorada ao teclado.
 *
 * A folha é posicionada por âncoras (top + bottom) em vez de altura fixa, e o
 * `bottom` acompanha o topo do teclado. Duas consequências:
 *
 *  - o composer, sendo o último filho, fica sempre logo acima do teclado;
 *  - com o teclado aberto a folha cresce para cima e ganha altura útil, em
 *    vez de ficar espremida.
 *
 * Nada aqui depende do layout se mexer sozinho: medido em device, o
 * `adjustResize` NÃO redimensiona a raiz do RN neste app (raiz fica em 800dp
 * com e sem teclado), e por isso KeyboardAvoidingView e rolagem calculada não
 * resolveram nas tentativas anteriores. O que funciona são os eventos de
 * teclado — ver useKeyboardOffset.
 */
export function CommentsSheet({
  visible, onClose, entryId, canModerate, viewerRoles, onCountChange,
}: Props) {
  const insets = useSafeAreaInsets();
  const kbOffset = useKeyboardOffset(insets.bottom);
  const kbOpen = kbOffset > 0;

  const restingTop = Dimensions.get("screen").height * RESTING_TOP;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      // Só chega aqui com o teclado fechado: com o teclado aberto o próprio
      // Android consome o voltar para baixá-lo (é quando a tecla vira "⌄").
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.backdrop} />
      </TouchableWithoutFeedback>

      <View
        style={[
          styles.sheet,
          {
            bottom: kbOffset,
            // Aberto o teclado, a folha sobe até abaixo da barra de status.
            top: kbOpen ? insets.top : restingTop,
            // Com teclado, o kbOffset já passa da barra de navegação.
            paddingBottom: kbOpen ? 0 : insets.bottom,
          },
        ]}
      >
        <View style={styles.grabber} />
        <View style={styles.header}>
          <Text style={styles.title}>Comentários</Text>
        </View>

        <CommentsSection
          entryId={entryId}
          canModerate={canModerate}
          viewerRoles={viewerRoles}
          onCountChange={onCountChange}
        />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.6)" },
  sheet: {
    position: "absolute",
    left: 0,
    right: 0,
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
    alignItems: "center",
    justifyContent: "center",
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
