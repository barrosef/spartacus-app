import React, { useEffect, useRef, useState } from "react";
import {
  Image,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Audio, type AVPlaybackStatus } from "expo-av";
import { Feather } from "@expo/vector-icons";
import { colors, radius, spacing, typography } from "../../theme/tokens";
import type { TimelineAttachment } from "./types";

interface AttachmentListProps {
  attachments: TimelineAttachment[];
}

/**
 * Renders a list of attachments with per-type UI:
 *  - image: `<Image>`
 *  - voice/audio: inline player with play/pause + time
 *  - file/other: icon + filename
 */
export function AttachmentList({ attachments }: AttachmentListProps) {
  if (!attachments?.length) return null;
  return (
    <View style={styles.list}>
      {attachments.map((att, i) => {
        const key = `${att.url}-${i}`;
        if (att.type === "image") {
          return (
            <Image
              key={key}
              source={{ uri: att.url }}
              style={styles.image}
              resizeMode="cover"
            />
          );
        }
        if (att.type === "voice" || att.type.startsWith("audio")) {
          return <AudioAttachment key={key} attachment={att} />;
        }
        return <FileAttachment key={key} attachment={att} />;
      })}
    </View>
  );
}

function AudioAttachment({ attachment }: { attachment: TimelineAttachment }) {
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
          { uri: attachment.url },
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
    <View style={styles.audioBox}>
      <TouchableOpacity
        style={styles.playBtn}
        onPress={handleToggle}
        activeOpacity={0.7}
        disabled={loading}
      >
        <Feather
          name={loading ? "loader" : playing ? "pause" : "play"}
          size={18}
          color={colors.primary}
        />
      </TouchableOpacity>
      <View style={styles.audioBody}>
        <View style={styles.progressTrack}>
          <View
            style={[
              styles.progressFill,
              { width: `${Math.round(progress * 100)}%` },
            ]}
          />
        </View>
        <Text style={styles.audioTime}>
          {formatTime(positionMs)}
          {durationMs != null ? ` / ${formatTime(durationMs)}` : ""}
        </Text>
      </View>
    </View>
  );
}

function FileAttachment({ attachment }: { attachment: TimelineAttachment }) {
  const handleOpen = () => {
    if (Platform.OS === "web" && typeof window !== "undefined") {
      window.open(attachment.url, "_blank");
    }
    // On native, TouchableOpacity won't trigger a download — users can
    // long-press or the app can add Linking.openURL here later.
  };
  return (
    <TouchableOpacity
      style={styles.fileBox}
      onPress={handleOpen}
      activeOpacity={0.7}
    >
      <Feather name="paperclip" size={16} color={colors.primary} />
      <Text style={styles.fileName} numberOfLines={1}>
        {attachment.name || "Arquivo"}
      </Text>
    </TouchableOpacity>
  );
}

function formatTime(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

const styles = StyleSheet.create({
  list: {
    gap: spacing.sm,
  },
  image: {
    width: "100%",
    height: 200,
    borderRadius: radius.sm,
  },
  audioBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm + 2,
    padding: spacing.sm,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.primaryMuted,
  },
  playBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.primaryBorder,
  },
  audioBody: {
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
  audioTime: {
    color: colors.mutedForeground,
    fontFamily: typography.fontBody,
    fontSize: 11,
    fontVariant: ["tabular-nums"],
  },
  fileBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs + 2,
    padding: spacing.sm,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  fileName: {
    flex: 1,
    color: colors.foreground,
    fontFamily: typography.fontBody,
    fontSize: 13,
  },
});
