import React from "react";
import {
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  type ViewStyle,
} from "react-native";
import { colors, radius, typography } from "../../theme/tokens";
import type { TimelineAttachment } from "./types";
import { useMediaViewer } from "./MediaViewerContext";

const GAP = 3;
const TALL = 240;
const WIDE = 180;

interface MediaGalleryProps {
  images: TimelineAttachment[];
}

/**
 * Facebook/Instagram-style media grid: collapses a card's images into a single
 * rounded mosaic sized by count (1, 2, 3, 4, "+N"). Tapping any tile opens the
 * fullscreen swipeable viewer at that image.
 */
export function MediaGallery({ images }: MediaGalleryProps) {
  const { open } = useMediaViewer();
  if (!images.length) return null;

  return (
    <View style={styles.wrap}>
      {renderGrid(images, (index) => open(images, index))}
    </View>
  );
}

function renderGrid(
  images: TimelineAttachment[],
  open: (i: number) => void,
) {
  const n = images.length;

  if (n === 1) {
    return (
      <Tile uri={images[0].url} onPress={() => open(0)} style={styles.single} />
    );
  }

  if (n === 2) {
    return (
      <View style={[styles.row, { height: WIDE }]}>
        <Tile uri={images[0].url} onPress={() => open(0)} style={styles.flex1} />
        <Tile uri={images[1].url} onPress={() => open(1)} style={styles.flex1} />
      </View>
    );
  }

  if (n === 3) {
    return (
      <View style={[styles.row, { height: TALL }]}>
        <Tile uri={images[0].url} onPress={() => open(0)} style={styles.flex1} />
        <View style={[styles.col, styles.flex1]}>
          <Tile uri={images[1].url} onPress={() => open(1)} style={styles.flex1} />
          <Tile uri={images[2].url} onPress={() => open(2)} style={styles.flex1} />
        </View>
      </View>
    );
  }

  // 4 or more — 2×2 mosaic, last tile shows "+N" when there are extras.
  const extra = n - 4;
  return (
    <View style={[styles.col, { height: TALL }]}>
      <View style={[styles.row, styles.flex1]}>
        <Tile uri={images[0].url} onPress={() => open(0)} style={styles.flex1} />
        <Tile uri={images[1].url} onPress={() => open(1)} style={styles.flex1} />
      </View>
      <View style={[styles.row, styles.flex1]}>
        <Tile uri={images[2].url} onPress={() => open(2)} style={styles.flex1} />
        <Tile
          uri={images[3].url}
          onPress={() => open(3)}
          style={styles.flex1}
          overlay={extra > 0 ? extra : undefined}
        />
      </View>
    </View>
  );
}

function Tile({
  uri,
  onPress,
  style,
  overlay,
}: {
  uri: string;
  onPress: () => void;
  style?: ViewStyle;
  overlay?: number;
}) {
  return (
    <TouchableOpacity
      style={[styles.tile, style]}
      onPress={onPress}
      activeOpacity={0.85}
    >
      <Image source={{ uri }} style={styles.tileImg} resizeMode="cover" />
      {overlay ? (
        <View style={styles.moreOverlay}>
          <Text style={styles.moreText}>+{overlay}</Text>
        </View>
      ) : null}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  // Rounded outer clip so the GAP between tiles reads as one cohesive unit.
  wrap: {
    borderRadius: radius.md,
    overflow: "hidden",
    backgroundColor: colors.border,
  },
  row: {
    flexDirection: "row",
    gap: GAP,
  },
  col: {
    flexDirection: "column",
    gap: GAP,
  },
  flex1: {
    flex: 1,
  },
  single: {
    width: "100%",
    height: TALL,
  },
  tile: {
    overflow: "hidden",
    backgroundColor: colors.card,
  },
  tileImg: {
    width: "100%",
    height: "100%",
  },
  moreOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.55)",
  },
  moreText: {
    color: "#fff",
    fontFamily: typography.fontHeadingSemi,
    fontSize: 24,
  },
});
