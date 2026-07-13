import React, { useState } from "react";
import { View, TextInput, TouchableOpacity, Text, StyleSheet } from "react-native";
import { Feather } from "@expo/vector-icons";
import { colors, typography, spacing, radius } from "../../../theme/tokens";
import { MentionAutocomplete } from "./MentionAutocomplete";
import type { Mentionable } from "./types";

interface Props {
  entryId: string;
  replyingTo?: { commentId: string; display: string } | null;
  onSubmit: (text: string, parentId: string | null, mentions: string[]) => Promise<void>;
  onCancelReply?: () => void;
}

export function CommentInput({ entryId, replyingTo, onSubmit, onCancelReply }: Props) {
  const [text, setText] = useState("");
  const [mentions, setMentions] = useState<{ display: string; uid: string }[]>([]);
  const [query, setQuery] = useState<string>("");   // "" = autocomplete escondido
  const [sending, setSending] = useState(false);

  const onChange = (t: string) => {
    setText(t);
    const m = t.match(/@(\w*)$/);   // token de menção em edição no fim
    setQuery(m ? m[1] : "");
  };

  const pick = (mn: Mentionable) => {
    const replaced = text.replace(/@(\w*)$/, `@${mn.display} `);
    setText(replaced);
    setMentions((prev) => [...prev, { display: mn.display, uid: mn.uid }]);
    setQuery("");
  };

  const submit = async () => {
    const clean = text.trim();
    if (!clean) return;
    // só menções cujo @display ainda está presente no texto
    const used = mentions.filter((mm) => clean.includes(`@${mm.display}`)).map((mm) => mm.uid);
    setSending(true);
    try {
      await onSubmit(clean, replyingTo?.commentId ?? null, [...new Set(used)]);
      setText(""); setMentions([]); setQuery("");
    } finally { setSending(false); }
  };

  return (
    <View>
      {query ? <MentionAutocomplete entryId={entryId} query={query} onPick={pick} /> : null}
      {replyingTo ? (
        <View style={styles.replyBar}>
          <Text style={styles.replyTxt}>Respondendo {replyingTo.display}</Text>
          <TouchableOpacity onPress={onCancelReply}><Feather name="x" size={16} color={colors.mutedForeground} /></TouchableOpacity>
        </View>
      ) : null}
      <View style={styles.row}>
        <TextInput style={styles.input} value={text} onChangeText={onChange}
          placeholder="Escreva um comentário… use @ para mencionar"
          placeholderTextColor={colors.mutedForeground} multiline />
        <TouchableOpacity style={styles.send} onPress={submit} disabled={sending || !text.trim()}>
          <Feather name="send" size={18} color={text.trim() ? colors.primary : colors.mutedForeground} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "flex-end", gap: spacing.sm,
    padding: spacing.sm, borderTopWidth: 1, borderTopColor: colors.border },
  input: { flex: 1, minHeight: 40, maxHeight: 120, color: colors.foreground,
    fontFamily: typography.fontBody, fontSize: 15, backgroundColor: colors.card,
    borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  send: { padding: spacing.sm },
  replyBar: { flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    paddingHorizontal: spacing.md, paddingVertical: 6, backgroundColor: colors.primaryMuted },
  replyTxt: { color: colors.primary, fontFamily: typography.fontBody, fontSize: 12 },
});
