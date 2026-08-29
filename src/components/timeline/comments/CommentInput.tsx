import React, { useRef, useState } from "react";
import {
  View,
  TextInput,
  TouchableOpacity,
  Text,
  StyleSheet,
  Keyboard,
  Dimensions,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { colors, typography, spacing, radius } from "../../../theme/tokens";
import { MentionAutocomplete } from "./MentionAutocomplete";
import { useFeedScrollBy } from "./keyboardScroll";
import type { Mentionable } from "./types";

// Folga entre o campo e o topo do teclado, para não ficar colado.
const KEYBOARD_GAP = 12;

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
  const inputRef = useRef<TextInput>(null);
  const scrollBy = useFeedScrollBy();

  /**
   * O campo vive inline no card, no meio do feed: ao focar, o teclado sobe e
   * cobre justamente a linha onde a pessoa está digitando. Aqui medimos onde o
   * campo ficou na tela e pedimos ao feed a rolagem exata que falta.
   *
   * O teclado pode já estar aberto (respondendo a outro comentário) — nesse
   * caso `Keyboard.metrics()` já responde e não vem evento novo.
   */
  const nudgeAboveKeyboard = (keyboardHeight: number) => {
    if (!scrollBy || !keyboardHeight) return;
    const keyboardTop = Dimensions.get("window").height - keyboardHeight;
    inputRef.current?.measureInWindow((_x, y, _w, h) => {
      const overlap = y + h + KEYBOARD_GAP - keyboardTop;
      if (overlap > 0) scrollBy(overlap);
    });
  };

  const onFocus = () => {
    const metrics = Keyboard.metrics();
    if (metrics?.height) {
      nudgeAboveKeyboard(metrics.height);
      return;
    }
    const sub = Keyboard.addListener("keyboardDidShow", (e) => {
      sub.remove();
      nudgeAboveKeyboard(e.endCoordinates.height);
    });
  };

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
    if (!clean) return;
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
        <TextInput ref={inputRef} onFocus={onFocus}
          style={styles.input} value={text} onChangeText={onChange}
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
  // Sem padding horizontal — o card em volta já aplica padding: spacing.md.
  row: { flexDirection: "row", alignItems: "flex-end", gap: spacing.sm,
    paddingVertical: spacing.sm },
  input: { flex: 1, minHeight: 40, maxHeight: 120, color: colors.foreground,
    fontFamily: typography.fontBody, fontSize: 15, backgroundColor: colors.card,
    borderRadius: radius.md, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  send: { padding: spacing.sm },
  replyBar: { flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    paddingHorizontal: spacing.sm, paddingVertical: 6, backgroundColor: colors.primaryMuted,
    borderRadius: radius.sm },
  replyTxt: { color: colors.primary, fontFamily: typography.fontBody, fontSize: 12 },
});
