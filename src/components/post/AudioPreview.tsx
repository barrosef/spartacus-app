import React, { useEffect, useRef, useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Audio, type AVPlaybackStatus } from "expo-av";
import { Feather } from "@expo/vector-icons";
import { colors, radius, spacing, typography } from "../../theme/tokens";

interface AudioPreviewProps {
  uri: string;
  onConfirm: () => void;
  onRetry: () => void;
  disabled?: boolean;
}

/**
 * Audio preview for the post wizard: play/pause + horizontal timeline +
 * Send/Re-record actions. Shown after the user stops recording and before
 * upload — gives a chance to review (or discard) the take.
 */
export function AudioPreview({
  uri,
  onConfirm,
  onRetry,
  disabled,
}: AudioPreviewProps) {
  const soundRef = useRef<Audio.Sound | null>(null);
  const [loading, setLoading] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [positionMs, setPositionMs] = useState(0);
  const [durationMs, setDurationMs] = useState<number | null>(null);

  useEffect(() => {
    return () => {
      soundRef.current?.unloadAsync().catch(() => {});
      soundRef.current = null;
    };
  }, []);

  const onStatus = (status: AVPlaybackStatus) => {
    if (!status.isLoaded) return;
    setPlaying(status.isPlaying);
    setPositionMs(status.positionMillis);
    if (status.durationMillis != null) setDurationMs(status.durationMillis);
    if (status.didJustFinish) {
      setPlaying(false);
      setPositionMs(0);
      soundRef.current?.setPositionAsync(0).catch(() => {});
    }
  };

  const handleToggle = async () => {
    try {
      if (!soundRef.current) {
        setLoading(true);
        const { sound } = await Audio.Sound.createAsync(
          { uri },
          { shouldPlay: true },
          onStatus,
        );
        soundRef.current = sound;
        setLoading(false);
        return;
      }
      if (playing) {
        await soundRef.current.pauseAsync();
      } else {
        await soundRef.current.playAsync();
      }
    } catch {
      setLoading(false);
    }
  };

  const progress =
    durationMs && durationMs > 0
      ? Math.min(1, positionMs / durationMs)
      : 0;

  return (
    <View style={styles.container}>
      <View style={styles.playerRow}>
        <TouchableOpacity
          style={styles.playBtn}
          onPress={handleToggle}
          activeOpacity={0.7}
          disabled={loading}
          accessibilityLabel={playing ? "Pausar" : "Reproduzir"}
        >
          <Feather
            name={loading ? "loader" : playing ? "pause" : "play"}
            size={20}
            color={colors.primary}
          />
        </TouchableOpacity>
        <View style={styles.playerBody}>
          <View style={styles.progressTrack}>
            <View
              style={[
                styles.progressFill,
                { width: `${Math.round(progress * 100)}%` },
              ]}
            />
          </View>
          <Text style={styles.time}>
            {formatTime(positionMs)}
            {durationMs != null ? ` / ${formatTime(durationMs)}` : ""}
          </Text>
        </View>
      </View>

      <View style={styles.actions}>
        <TouchableOpacity
          style={styles.btnSecondary}
          activeOpacity={0.7}
          onPress={onRetry}
          disabled={disabled}
        >
          <Feather name="rotate-ccw" size={16} color={colors.foreground} />
          <Text style={styles.btnSecondaryText}>Regravar</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.btnPrimary}
          activeOpacity={0.85}
          onPress={onConfirm}
          disabled={disabled}
        >
          <Feather name="check" size={16} color={colors.primaryForeground} />
          <Text style={styles.btnPrimaryText}>Enviar</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function formatTime(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.sm,
    padding: spacing.sm + 2,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.primaryBorder,
    backgroundColor: colors.primaryMuted,
  },
  playerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm + 2,
  },
  playBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.primaryBorder,
  },
  playerBody: {
    flex: 1,
    gap: 4,
  },
  progressTrack: {
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: colors.primary,
  },
  time: {
    color: colors.mutedForeground,
    fontFamily: typography.fontBody,
    fontSize: 12,
    fontVariant: ["tabular-nums"],
  },
  actions: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  btnSecondary: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs + 2,
    paddingVertical: spacing.sm + 4,
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
    paddingVertical: spacing.sm + 4,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
  },
  btnPrimaryText: {
    color: colors.primaryForeground,
    fontFamily: typography.fontBodySemiBold,
    fontSize: 14,
  },
});
