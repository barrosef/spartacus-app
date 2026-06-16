import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  BackHandler,
  FlatList,
  Image,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { colors, radius, spacing, typography } from "../../theme/tokens";
import type { TimelineAttachment } from "./types";

interface MediaViewerProps {
  images: TimelineAttachment[];
  initialIndex: number;
  visible: boolean;
  onClose: () => void;
}

/**
 * Fullscreen, swipeable media viewer (Instagram-style). Rendered as an absolute
 * overlay (NOT a <Modal>) at the app root: react-native-web's Modal + a flex
 * backdrop sized the inner pager to zero height (blank viewer, frozen page), so
 * an explicitly-sized absolute overlay is used for reliable web + native behavior.
 */
export function MediaViewer({
  images,
  initialIndex,
  visible,
  onClose,
}: MediaViewerProps) {
  const { width, height } = useWindowDimensions();
  const listRef = useRef<FlatList<TimelineAttachment>>(null);
  const [index, setIndex] = useState(initialIndex);

  useEffect(() => {
    if (!visible) return;
    setIndex(initialIndex);
    // Position at the tapped image after layout. scrollToOffset is reliable on
    // both native and react-native-web.
    const id = setTimeout(() => {
      listRef.current?.scrollToOffset({
        offset: initialIndex * width,
        animated: false,
      });
    }, 0);
    return () => clearTimeout(id);
  }, [visible, initialIndex, width]);

  // Android hardware back closes the viewer instead of leaving the screen.
  useEffect(() => {
    if (!visible) return;
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      onClose();
      return true;
    });
    return () => sub.remove();
  }, [visible, onClose]);

  const onMomentumEnd = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      setIndex(Math.round(e.nativeEvent.contentOffset.x / width));
    },
    [width],
  );

  const goTo = useCallback(
    (target: number) => {
      const clamped = Math.max(0, Math.min(target, images.length - 1));
      listRef.current?.scrollToIndex({ index: clamped, animated: true });
      setIndex(clamped);
    },
    [images.length],
  );

  if (!visible) return null;

  return (
    <View style={[styles.overlay, { width, height }]}>
      <StatusBar hidden />

      <FlatList
        ref={listRef}
        data={images}
        horizontal
        pagingEnabled
        style={{ width, height }}
        showsHorizontalScrollIndicator={false}
        getItemLayout={(_, i) => ({
          length: width,
          offset: width * i,
          index: i,
        })}
        onScrollToIndexFailed={() => {}}
        keyExtractor={(item, i) => `${item.url}-${i}`}
        onMomentumScrollEnd={onMomentumEnd}
        renderItem={({ item }) => (
          <TouchableOpacity
            activeOpacity={1}
            onPress={onClose}
            style={[styles.page, { width, height }]}
          >
            <Image
              source={{ uri: item.url }}
              style={{ width, height }}
              resizeMode="contain"
            />
          </TouchableOpacity>
        )}
      />

      {/* Overlay chrome */}
      <View style={styles.topBar} pointerEvents="box-none">
        {images.length > 1 ? (
          <View style={styles.counterPill}>
            <Text style={styles.counterText}>
              {index + 1} / {images.length}
            </Text>
          </View>
        ) : (
          <View />
        )}
        <TouchableOpacity
          style={styles.closeBtn}
          onPress={onClose}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Feather name="x" size={22} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Prev/next arrows — left from the 2nd image, right until the last but
          one. Faint translucent tone; swipe still works alongside them. */}
      {index > 0 ? (
        <TouchableOpacity
          style={[styles.navBtn, styles.navLeft]}
          onPress={() => goTo(index - 1)}
          hitSlop={{ top: 16, bottom: 16, left: 8, right: 8 }}
        >
          <Feather name="chevron-left" size={28} color="#fff" style={styles.navIcon} />
        </TouchableOpacity>
      ) : null}
      {index < images.length - 1 ? (
        <TouchableOpacity
          style={[styles.navBtn, styles.navRight]}
          onPress={() => goTo(index + 1)}
          hitSlop={{ top: 16, bottom: 16, left: 8, right: 8 }}
        >
          <Feather name="chevron-right" size={28} color="#fff" style={styles.navIcon} />
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "#000",
    zIndex: 9999,
    elevation: 9999,
  },
  page: {
    alignItems: "center",
    justifyContent: "center",
  },
  topBar: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    paddingTop: spacing.xl + spacing.sm,
    paddingHorizontal: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  counterPill: {
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 5,
    borderRadius: radius.lg,
    backgroundColor: "rgba(198,163,78,0.18)",
    borderWidth: 1,
    borderColor: "rgba(198,163,78,0.45)",
  },
  counterText: {
    color: colors.primary,
    fontFamily: typography.fontBodySemiBold,
    fontSize: 13,
    fontVariant: ["tabular-nums"],
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.45)",
  },
  navBtn: {
    position: "absolute",
    top: "50%",
    marginTop: -22,
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    // Translucent glass + a darker scrim so the white chevron keeps contrast
    // over both light and dark images.
    backgroundColor: "rgba(0,0,0,0.32)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.45)",
  },
  navIcon: {
    // Dark halo so the chevron stays visible even over bright photos.
    textShadowColor: "rgba(0,0,0,0.7)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  navLeft: {
    left: spacing.md,
  },
  navRight: {
    right: spacing.md,
  },
});
