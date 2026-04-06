import React from "react";
import { View, Text, Image, TouchableOpacity, StyleSheet } from "react-native";
import { Feather } from "@expo/vector-icons";
import { colors, typography, spacing } from "../../theme/tokens";

interface AvatarHeaderProps {
  name: string;
  roles: string[];
  photoUrl?: string | null;
  onAvatarPress: () => void;
}

const ROLE_LABELS: Record<string, string> = {
  student: "Aluno",
  teacher: "Professor",
  instructor: "Instrutor",
  guardian: "Responsável",
  supporter: "Apoiador",
  sponsor: "Patrocinador",
  owner: "Controlador",
  assistant: "Assistente",
};

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

export function AvatarHeader({
  name,
  roles,
  photoUrl,
  onAvatarPress,
}: AvatarHeaderProps) {
  const rolesText = roles
    .map((r) => ROLE_LABELS[r] ?? r)
    .join(", ");

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.avatarWrap}
        activeOpacity={0.8}
        onPress={onAvatarPress}
      >
        {photoUrl ? (
          <Image source={{ uri: photoUrl }} style={styles.photo} />
        ) : (
          <View style={styles.initialsCircle}>
            <Text style={styles.initials}>{getInitials(name)}</Text>
          </View>
        )}
        <View style={styles.cameraBadge}>
          <Feather name="camera" size={12} color={colors.white} />
        </View>
      </TouchableOpacity>

      <Text style={styles.name}>{name}</Text>
      {rolesText ? (
        <Text style={styles.roles}>{rolesText}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    paddingVertical: spacing.lg,
  },
  avatarWrap: {
    position: "relative",
    marginBottom: spacing.sm + 4,
  },
  photo: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 1,
    borderColor: "rgba(198,163,78,0.2)",
  },
  initialsCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "rgba(198,163,78,0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  initials: {
    color: colors.primary,
    fontFamily: typography.fontHeadingSemi,
    fontSize: 28,
  },
  cameraBadge: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: colors.background,
  },
  name: {
    color: colors.foreground,
    fontFamily: typography.fontHeadingSemi,
    fontSize: 20,
  },
  roles: {
    color: colors.mutedForeground,
    fontFamily: typography.fontBody,
    fontSize: 14,
    marginTop: 4,
  },
});
