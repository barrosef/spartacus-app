import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  FlatList,
  Image,
  Modal,
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
 * Fullscreen, swipeable media viewer (Instagram-style): paginated horizontal
 * pager over all the card's images, a counter, and tap/X to dismiss.
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
    if (visible) setIndex(initialIndex);
  }, [visible, initialIndex]);

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

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <StatusBar hidden />

        <FlatList
          ref={listRef}
          data={images}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          contentOffset={{ x: initialIndex * width, y: 0 }}
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
            <Feather name="chevron-left" size={26} color="rgba(255,255,255,0.92)" />
          </TouchableOpacity>
        ) : null}
        {index < images.length - 1 ? (
          <TouchableOpacity
            style={[styles.navBtn, styles.navRight]}
            onPress={() => goTo(index + 1)}
            hitSlop={{ top: 16, bottom: 16, left: 8, right: 8 }}
          >
            <Feather name="chevron-right" size={26} color="rgba(255,255,255,0.92)" />
          </TouchableOpacity>
        ) : null}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "#000",
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
    // Faint, near-transparent glass — visible over both light and dark images.
    backgroundColor: "rgba(255,255,255,0.12)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.20)",
  },
  navLeft: {
    left: spacing.md,
  },
  navRight: {
    right: spacing.md,
  },
});
