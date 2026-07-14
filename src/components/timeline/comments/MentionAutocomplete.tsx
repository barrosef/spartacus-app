import React, { useEffect, useRef, useState } from "react";
import { View, Text, TouchableOpacity, Image, StyleSheet } from "react-native";
import { api } from "../../../lib/api";
import { colors, typography, spacing, radius } from "../../../theme/tokens";
import type { Mentionable } from "./types";

interface Props {
  entryId: string;
  query: string;           // texto após o '@' em edição; "" = escondido
  onPick: (m: Mentionable) => void;
}

export function MentionAutocomplete({ entryId, query, onPick }: Props) {
  const [items, setItems] = useState<Mentionable[]>([]);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (query == null) { setItems([]); return; }
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      try {
        const res = await api.get<Mentionable[]>(
          `/timeline/${entryId}/mentionable?q=${encodeURIComponent(query)}`);
        setItems(res ?? []);
      } catch { setItems([]); }   // leitura: falha silenciosa, não trava input
    }, 200);
    return () => { if (timer.current) clearTimeout(timer.current); };
  }, [entryId, query]);

  if (!items.length) return null;
  return (
    <View style={styles.box}>
      {items.slice(0, 6).map((m) => (
        <TouchableOpacity key={m.uid} style={styles.row} onPress={() => onPick(m)}>
          {m.photoUrl
            ? <Image source={{ uri: m.photoUrl }} style={styles.avatar} />
            : <View style={styles.initials}><Text style={styles.initialsTxt}>{m.initials}</Text></View>}
          <View style={{ flex: 1 }}>
            <Text style={styles.display}>{m.display}</Text>
            {m.subtitle ? <Text style={styles.subtitle}>{m.subtitle}</Text> : null}
          </View>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  box: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border,
    borderRadius: radius.md, overflow: "hidden", maxHeight: 240 },
  row: { flexDirection: "row", alignItems: "center", gap: spacing.sm,
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  avatar: { width: 32, height: 32, borderRadius: 16 },
  initials: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.primaryMuted,
    alignItems: "center", justifyContent: "center" },
  initialsTxt: { color: colors.primary, fontFamily: typography.fontBodySemiBold, fontSize: 12 },
  display: { color: colors.foreground, fontFamily: typography.fontBodyMedium, fontSize: 14 },
  subtitle: { color: colors.mutedForeground, fontFamily: typography.fontBody, fontSize: 12 },
});
