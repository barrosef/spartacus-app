import React, { useState } from "react";
import {
  View,
  TextInput,
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
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

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
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
    const replaced = text.replace(/@(\w*)$/, () => `@${mn.display} `);
    setText(replaced);
    setMentions((prev) => [...prev, { display: mn.display, uid: mn.uid }]);
    setQuery("");
  };

  const submit = async () => {
    const clean = text.trim();
    if (!clean || sending) return;
    // só menções cujo @display ainda está presente no texto — casa da mais longa
    // para a mais curta e "consome" o trecho encontrado, evitando falso positivo
    // quando um display é prefixo de outro (ex.: "Ana" vs "Ana Silva").
    const used: string[] = [];
    let working = clean;
    const sortedMentions = [...mentions].sort((a, b) => b.display.length - a.display.length);
    for (const mm of sortedMentions) {
      const pattern = new RegExp(`(^|\\s)@${escapeRegExp(mm.display)}(?=$|\\s)`);
      const match = pattern.exec(working);
      if (!match) continue;
      used.push(mm.uid);
      const atStart = match.index + match[1].length;
      const span = `@${mm.display}`.length;
      working = working.slice(0, atStart) + " ".repeat(span) + working.slice(atStart + span);
    }

    // Esvazia o campo já no toque. Sem isto nada muda na tela enquanto o envio
    // corre — o texto continua lá, a seta continua acesa — e a pessoa toca de
    // novo achando que o primeiro toque se perdeu.
    const keptMentions = mentions;
    setText(""); setMentions([]); setQuery("");
    setSending(true);
    try {
      await onSubmit(clean, replyingTo?.commentId ?? null, [...new Set(used)]);
    } catch {
      // Falhou: devolve o que a pessoa escreveu em vez de descartar.
      // Quem mostra o erro é o CommentsSection.
      setText(clean); setMentions(keptMentions);
    } finally { setSending(false); }
  };

  const canSend = !sending && !!text.trim();

  return (
    <View>
      {query ? <MentionAutocomplete entryId={entryId} query={query} onPick={pick} /> : null}
      {replyingTo ? (
        <View style={styles.replyBar}>
          <Text style={styles.replyTxt}>Respondendo {replyingTo.display}</Text>
          <TouchableOpacity onPress={onCancelReply} hitSlop={HIT_SLOP}>
            <Feather name="x" size={16} color={colors.mutedForeground} />
          </TouchableOpacity>
        </View>
      ) : null}
      <View style={styles.row}>
        <TextInput
          style={styles.input} value={text} onChangeText={onChange}
          placeholder="Escreva um comentário… use @ para mencionar"
          placeholderTextColor={colors.mutedForeground} multiline />
        <TouchableOpacity style={styles.send} onPress={submit} disabled={!canSend}>
          {sending ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <Feather name="send" size={18}
              color={text.trim() ? colors.primary : colors.mutedForeground} />
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const HIT_SLOP = { top: 8, bottom: 8, left: 8, right: 8 };

const styles = StyleSheet.create({
  // Sem padding horizontal — o card em volta já aplica padding: spacing.md.
  row: { flexDirection: "row", alignItems: "flex-end", gap: spacing.sm,
    paddingVertical: spacing.sm },
  input: { flex: 1, minHeight: 40, maxHeight: 120, color: colors.foreground,
    fontFamily: typography.fontBody, fontSize: 15, backgroundColor: colors.card,
    borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  // 48x48: mínimo de alvo de toque do Android. Com os 8dp de padding de antes
  // dava ~34dp, colado na borda direita da tela — errar o primeiro toque era
  // rotina, e parecia que o envio tinha sido ignorado.
  send: { width: 48, height: 48, alignItems: "center", justifyContent: "center" },
  replyBar: { flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    paddingHorizontal: spacing.sm, paddingVertical: 6, backgroundColor: colors.primaryMuted,
    borderRadius: radius.sm },
  replyTxt: { color: colors.primary, fontFamily: typography.fontBody, fontSize: 12 },
});
