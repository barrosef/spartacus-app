import React, { useEffect, useState } from "react";
import {
  Image,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { colors, radius, spacing, typography } from "../../theme/tokens";
import { Button } from "../ui/Button";
import type { TimelineAttachment } from "./types";

interface ShareSheetProps {
  images: TimelineAttachment[];
  visible: boolean;
  onClose: () => void;
  onConfirm: (urls: string[]) => void;
}

/**
 * Bottom sheet para escolher quais fotos de um post enviar. Miniaturas
 * marcáveis (default todas), mínimo 1. Sem UI nativa de compartilhamento —
 * segue a convenção de diálogos na identidade do projeto.
 */
export function ShareSheet({
  images,
  visible,
  onClose,
  onConfirm,
}: ShareSheetProps) {
  // Índices marcados. Reinicia para "todos marcados" toda vez que abre.
  const [selected, setSelected] = useState<Set<number>>(
    () => new Set(images.map((_, i) => i)),
  );

  useEffect(() => {
    if (visible) setSelected(new Set(images.map((_, i) => i)));
  }, [visible, images]);

  const toggle = (i: number) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });

  const count = selected.size;

  const handleConfirm = () => {
    const urls = images
      .filter((_, i) => selected.has(i))
      .map((img) => img.url);
    if (urls.length === 0) return;
    onConfirm(urls);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <View style={styles.sheet}>
              <View style={styles.handle} />
              <Text style={styles.title}>Escolha as fotos</Text>
              <View style={styles.grid}>
                {images.map((img, i) => {
                  const on = selected.has(i);
                  return (
                    <TouchableOpacity
                      key={`${img.url}-${i}`}
                      style={styles.thumbWrap}
                      activeOpacity={0.85}
                      onPress={() => toggle(i)}
                    >
                      <Image
                        source={{ uri: img.url }}
                        style={styles.thumb}
                        resizeMode="cover"
                      />
                      <View
                        style={[
                          styles.check,
                          on ? styles.checkOn : styles.checkOff,
                        ]}
                      >
                        {on ? (
                          <Feather name="check" size={14} color="#fff" />
                        ) : null}
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
              <Button
                label={`Compartilhar (${count})`}
                onPress={handleConfirm}
                disabled={count === 0}
                style={styles.confirmBtn}
              />
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: colors.card,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.md,
  },
  handle: {
    alignSelf: "center",
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
  },
  title: {
    color: colors.foreground,
    fontFamily: typography.fontHeadingSemi,
    fontSize: 16,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  thumbWrap: {
    width: 72,
    height: 72,
    borderRadius: radius.sm,
    overflow: "hidden",
  },
  thumb: {
    width: "100%",
    height: "100%",
  },
  check: {
    position: "absolute",
    top: 4,
    right: 4,
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  checkOn: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  checkOff: {
    backgroundColor: "rgba(0,0,0,0.35)",
    borderColor: "rgba(255,255,255,0.7)",
  },
  confirmBtn: {
    marginTop: spacing.xs,
  },
});
