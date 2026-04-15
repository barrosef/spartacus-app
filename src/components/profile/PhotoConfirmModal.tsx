import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  Modal,
  Pressable,
  Animated,
  PanResponder,
  StyleSheet,
  Dimensions,
  Platform,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { colors, typography, spacing, radius } from "../../theme/tokens";

const SCREEN_WIDTH = Dimensions.get("window").width;
const PREVIEW_SIZE = Math.min(SCREEN_WIDTH - spacing.xl * 2, 280);

export interface CropRegion {
  originX: number;
  originY: number;
  size: number;
}

interface PhotoConfirmModalProps {
  visible: boolean;
  uri: string | null;
  imageWidth: number | null;
  imageHeight: number | null;
  supportsPan: boolean;
  onConfirm: (region: CropRegion | null) => void;
  onRetry: () => void;
  onClose: () => void;
}

export function PhotoConfirmModal({
  visible,
  uri,
  imageWidth,
  imageHeight,
  supportsPan,
  onConfirm,
  onRetry,
  onClose,
}: PhotoConfirmModalProps) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;

  // Scale image so that min dimension COVERS the preview circle
  const coverScale =
    imageWidth && imageHeight
      ? PREVIEW_SIZE / Math.min(imageWidth, imageHeight)
      : 1;
  const displayedW = (imageWidth ?? PREVIEW_SIZE) * coverScale;
  const displayedH = (imageHeight ?? PREVIEW_SIZE) * coverScale;

  // Pan constraints: image can move within [-(displayed - preview)/2, +same]
  const maxPanX = Math.max(0, (displayedW - PREVIEW_SIZE) / 2);
  const maxPanY = Math.max(0, (displayedH - PREVIEW_SIZE) / 2);

  const panOffset = useRef({ x: 0, y: 0 }).current;
  const pan = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;

  // Keep latest limits/enabled in refs so PanResponder closure always reads fresh values
  const limitsRef = useRef({ x: 0, y: 0 });
  const supportsPanRef = useRef(false);
  limitsRef.current = { x: maxPanX, y: maxPanY };
  supportsPanRef.current = supportsPan;

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => supportsPanRef.current,
      onMoveShouldSetPanResponder: (_, gs) =>
        supportsPanRef.current && (Math.abs(gs.dx) > 2 || Math.abs(gs.dy) > 2),
      onPanResponderGrant: () => {
        pan.setOffset({ x: panOffset.x, y: panOffset.y });
        pan.setValue({ x: 0, y: 0 });
      },
      onPanResponderMove: Animated.event(
        [null, { dx: pan.x, dy: pan.y }],
        { useNativeDriver: false },
      ),
      onPanResponderRelease: (_, gs) => {
        const mx = limitsRef.current.x;
        const my = limitsRef.current.y;
        const nextX = Math.max(-mx, Math.min(mx, panOffset.x + gs.dx));
        const nextY = Math.max(-my, Math.min(my, panOffset.y + gs.dy));
        panOffset.x = nextX;
        panOffset.y = nextY;
        pan.flattenOffset();
        Animated.spring(pan, {
          toValue: { x: nextX, y: nextY },
          damping: 20,
          stiffness: 260,
          useNativeDriver: false,
        }).start();
      },
    }),
  ).current;

  useEffect(() => {
    if (visible) {
      panOffset.x = 0;
      panOffset.y = 0;
      pan.setValue({ x: 0, y: 0 });
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          damping: 18,
          stiffness: 220,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      fadeAnim.setValue(0);
      scaleAnim.setValue(0.9);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, uri]);

  const buildCropRegion = (): CropRegion | null => {
    if (!imageWidth || !imageHeight || !supportsPan) return null;
    // Preview center in image coords = image center - panOffset (in display px)
    // Translate display px to image px via coverScale
    const cropSize = Math.min(imageWidth, imageHeight);
    const centerXImg = imageWidth / 2 - panOffset.x / coverScale;
    const centerYImg = imageHeight / 2 - panOffset.y / coverScale;
    const originX = Math.max(0, Math.min(imageWidth - cropSize, centerXImg - cropSize / 2));
    const originY = Math.max(0, Math.min(imageHeight - cropSize, centerYImg - cropSize / 2));
    return { originX, originY, size: cropSize };
  };

  const handleConfirm = () => {
    onConfirm(buildCropRegion());
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <Animated.View style={[styles.backdrop, { opacity: fadeAnim }]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        </Animated.View>

        <Animated.View
          style={[
            styles.container,
            { opacity: fadeAnim, transform: [{ scale: scaleAnim }] },
          ]}
        >
          <View style={styles.header}>
            <Text style={styles.title}>Ajuste sua foto</Text>
            <Text style={styles.subtitle}>
              {supportsPan
                ? "Arraste para enquadrar"
                : "Assim ficará sua foto de perfil"}
            </Text>
          </View>

          <View style={styles.previewWrap} {...panResponder.panHandlers}>
            {uri && (
              <Animated.Image
                source={{ uri }}
                style={[
                  {
                    width: displayedW || PREVIEW_SIZE,
                    height: displayedH || PREVIEW_SIZE,
                    transform: [
                      { translateX: pan.x },
                      { translateY: pan.y },
                    ],
                  },
                ]}
                resizeMode="cover"
              />
            )}
            <View pointerEvents="none" style={styles.previewRing} />
          </View>

          <View style={styles.actions}>
            <TouchableOpacity
              style={styles.btnSecondary}
              activeOpacity={0.7}
              onPress={onRetry}
            >
              <Feather name="rotate-ccw" size={16} color={colors.foreground} />
              <Text style={styles.btnSecondaryText}>Trocar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.btnPrimary}
              activeOpacity={0.85}
              onPress={handleConfirm}
            >
              <Feather name="check" size={16} color={colors.primaryForeground} />
              <Text style={styles.btnPrimaryText}>Usar foto</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.7)",
  },
  container: {
    width: "100%",
    maxWidth: 360,
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 12,
  },
  header: {
    alignItems: "center",
    marginBottom: spacing.lg,
  },
  title: {
    color: colors.foreground,
    fontFamily: typography.fontHeadingSemi,
    fontSize: 18,
  },
  subtitle: {
    color: colors.mutedForeground,
    fontFamily: typography.fontBody,
    fontSize: 13,
    marginTop: 4,
  },
  previewWrap: {
    width: PREVIEW_SIZE,
    height: PREVIEW_SIZE,
    borderRadius: PREVIEW_SIZE / 2,
    overflow: "hidden",
    backgroundColor: colors.background,
    marginBottom: spacing.lg,
    alignItems: "center",
    justifyContent: "center",
    ...(Platform.OS === "web" ? { cursor: "grab" as unknown as undefined } : {}),
  },
  previewRing: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: PREVIEW_SIZE / 2,
    borderWidth: 3,
    borderColor: "rgba(198,163,78,0.5)",
  },
  actions: {
    flexDirection: "row",
    gap: spacing.sm,
    width: "100%",
  },
  btnSecondary: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs + 2,
    paddingVertical: spacing.sm + 6,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: "transparent",
  },
  btnSecondaryText: {
    color: colors.foreground,
    fontFamily: typography.fontBodySemiBold,
    fontSize: 14,
  },
  btnPrimary: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs + 2,
    paddingVertical: spacing.sm + 6,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
  },
  btnPrimaryText: {
    color: colors.primaryForeground,
    fontFamily: typography.fontBodySemiBold,
    fontSize: 14,
  },
});
