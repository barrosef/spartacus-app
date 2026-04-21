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
const PAN_ZOOM = 1.25;

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

  // Image dimensions (with fallback fetch)
  const [fallbackDims, setFallbackDims] = useState<{
    w: number;
    h: number;
  } | null>(null);
  useEffect(() => {
    if (uri && (!imageWidth || !imageHeight)) {
      Image.getSize(
        uri,
        (w, h) => setFallbackDims({ w, h }),
        () => setFallbackDims(null),
      );
    } else {
      setFallbackDims(null);
    }
  }, [uri, imageWidth, imageHeight]);

  const finalW = imageWidth ?? fallbackDims?.w ?? 0;
  const finalH = imageHeight ?? fallbackDims?.h ?? 0;

  const rawCoverScale =
    finalW > 0 && finalH > 0
      ? PREVIEW_SIZE / Math.min(finalW, finalH)
      : 1;
  const coverScale = Math.max(rawCoverScale * PAN_ZOOM, 0.0001);
  const displayedW =
    finalW > 0 ? finalW * coverScale : PREVIEW_SIZE * PAN_ZOOM;
  const displayedH =
    finalH > 0 ? finalH * coverScale : PREVIEW_SIZE * PAN_ZOOM;
  const maxPanX = Math.max(0, (displayedW - PREVIEW_SIZE) / 2);
  const maxPanY = Math.max(0, (displayedH - PREVIEW_SIZE) / 2);

  // Pan position
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const posRef = useRef({ x: 0, y: 0 });
  posRef.current = pos;

  const canPan = supportsPan && (maxPanX > 0 || maxPanY > 0);
  const canPanRef = useRef(canPan);
  canPanRef.current = canPan;
  const limitsRef = useRef({ x: 0, y: 0 });
  limitsRef.current = { x: maxPanX, y: maxPanY };

  const clamp = (x: number, y: number) => ({
    x: Math.max(-limitsRef.current.x, Math.min(limitsRef.current.x, x)),
    y: Math.max(
      -limitsRef.current.y,
      Math.min(limitsRef.current.y, y),
    ),
  });

  // ── WEB: native DOM drag ────────────────────────────────────────
  const webStartRef = useRef<{
    mx: number;
    my: number;
    px: number;
    py: number;
  } | null>(null);

  useEffect(() => {
    if (Platform.OS !== "web") return;
    const onMove = (e: MouseEvent | TouchEvent) => {
      const start = webStartRef.current;
      if (!start || !canPanRef.current) return;
      const point =
        "touches" in e ? e.touches[0] : (e as MouseEvent);
      if (!point) return;
      setPos({
        x: start.px + (point.clientX - start.mx),
        y: start.py + (point.clientY - start.my),
      });
      if ("preventDefault" in e) e.preventDefault();
    };
    const onUp = (e: MouseEvent | TouchEvent) => {
      const start = webStartRef.current;
      if (!start) return;
      const point =
        "changedTouches" in e
          ? e.changedTouches[0]
          : (e as MouseEvent);
      if (point) {
        setPos(
          clamp(
            start.px + (point.clientX - start.mx),
            start.py + (point.clientY - start.my),
          ),
        );
      }
      webStartRef.current = null;
    };
    window.addEventListener("mousemove", onMove as EventListener);
    window.addEventListener("mouseup", onUp as EventListener);
    window.addEventListener("touchmove", onMove as EventListener, {
      passive: false,
    });
    window.addEventListener("touchend", onUp as EventListener);
    return () => {
      window.removeEventListener(
        "mousemove",
        onMove as EventListener,
      );
      window.removeEventListener("mouseup", onUp as EventListener);
      window.removeEventListener(
        "touchmove",
        onMove as EventListener,
      );
      window.removeEventListener("touchend", onUp as EventListener);
    };
  }, []);

  const handleWebPointerDown = (
    e:
      | { clientX: number; clientY: number }
      | React.MouseEvent
      | React.TouchEvent,
  ) => {
    if (!canPanRef.current) return;
    let cx = 0,
      cy = 0;
    if ("touches" in e && e.touches.length > 0) {
      cx = e.touches[0].clientX;
      cy = e.touches[0].clientY;
    } else if ("clientX" in e) {
      cx = e.clientX;
      cy = e.clientY;
    }
    webStartRef.current = {
      mx: cx,
      my: cy,
      px: posRef.current.x,
      py: posRef.current.y,
    };
  };

  // ── NATIVE: PanResponder ────────────────────────────────────────
  const panStartRef = useRef({ x: 0, y: 0 });
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => canPanRef.current,
      onMoveShouldSetPanResponder: () => canPanRef.current,
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: () => {
        panStartRef.current = { ...posRef.current };
      },
      onPanResponderMove: (_, gs) => {
        if (!canPanRef.current) return;
        setPos({
          x: panStartRef.current.x + gs.dx,
          y: panStartRef.current.y + gs.dy,
        });
      },
      onPanResponderRelease: (_, gs) => {
        setPos(
          clamp(
            panStartRef.current.x + gs.dx,
            panStartRef.current.y + gs.dy,
          ),
        );
      },
    }),
  ).current;

  // Modal open/close + pos reset
  useEffect(() => {
    if (visible) {
      setPos({ x: 0, y: 0 });
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
  }, [visible]);

  const buildCropRegion = (): CropRegion | null => {
    if (!finalW || !finalH || !supportsPan) return null;
    const cropSize = PREVIEW_SIZE / coverScale;
    const centerXImg = finalW / 2 - pos.x / coverScale;
    const centerYImg = finalH / 2 - pos.y / coverScale;
    const originX = Math.max(
      0,
      Math.min(finalW - cropSize, centerXImg - cropSize / 2),
    );
    const originY = Math.max(
      0,
      Math.min(finalH - cropSize, centerYImg - cropSize / 2),
    );
    return { originX, originY, size: cropSize };
  };

  const handleConfirm = () => onConfirm(buildCropRegion());

  const wrapHandlers =
    Platform.OS === "web"
      ? {
          onMouseDown: handleWebPointerDown as unknown as (
            e: unknown,
          ) => void,
          onTouchStart: handleWebPointerDown as unknown as (
            e: unknown,
          ) => void,
        }
      : panResponder.panHandlers;

  const cursorStyle =
    Platform.OS === "web" && canPan
      ? ({
          cursor: "grab",
        } as unknown as Record<string, unknown>)
      : {};

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <Animated.View
          style={[styles.backdrop, { opacity: fadeAnim }]}
        >
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={onClose}
          />
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
              {canPan
                ? "Arraste para enquadrar"
                : "Pré-visualização"}
            </Text>
          </View>

          {/* Photo area: full image visible (dimmed outside circle) */}
          <View
            style={[styles.previewWrap, cursorStyle]}
            {...wrapHandlers}
          >
            {/* Full image behind (dimmed) */}
            {uri && (
              <View
                style={styles.previewFull}
                pointerEvents="none"
              >
                <View
                  style={{
                    width: displayedW,
                    height: displayedH,
                    transform: [
                      { translateX: pos.x },
                      { translateY: pos.y },
                    ],
                    opacity: 0.3,
                  }}
                  pointerEvents="none"
                >
                  <Image
                    source={{ uri }}
                    style={{ width: "100%", height: "100%" }}
                    resizeMode="cover"
                  />
                </View>
              </View>
            )}

            {/* Circle clip (full opacity) */}
            <View
              style={styles.previewClip}
              pointerEvents="none"
            >
              {uri && (
                <View
                  style={{
                    width: displayedW,
                    height: displayedH,
                    transform: [
                      { translateX: pos.x },
                      { translateY: pos.y },
                    ],
                  }}
                  pointerEvents="none"
                >
                  <Image
                    source={{ uri }}
                    style={{ width: "100%", height: "100%" }}
                    resizeMode="cover"
                  />
                </View>
              )}
            </View>

            {/* Gold ring */}
            <View pointerEvents="none" style={styles.previewRing} />
          </View>

          <View style={styles.actions}>
            <TouchableOpacity
              style={styles.btnSecondary}
              activeOpacity={0.7}
              onPress={onRetry}
            >
              <Feather
                name="rotate-ccw"
                size={16}
                color={colors.foreground}
              />
              <Text style={styles.btnSecondaryText}>Trocar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.btnPrimary}
              activeOpacity={0.85}
              onPress={handleConfirm}
            >
              <Feather
                name="check"
                size={16}
                color={colors.primaryForeground}
              />
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
    maxWidth: 400,
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
    elevation: 24,
    zIndex: 10,
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
    marginBottom: spacing.lg,
    position: "relative",
    userSelect: "none" as unknown as undefined,
  },
  // Full image (visible outside circle, dimmed)
  previewFull: {
    ...StyleSheet.absoluteFillObject,
    overflow: "hidden",
    borderRadius: radius.lg,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "transparent",
  },
  // Circle clip (full opacity)
  previewClip: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: PREVIEW_SIZE / 2,
    overflow: "hidden",
    backgroundColor: colors.background,
    alignItems: "center",
    justifyContent: "center",
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
