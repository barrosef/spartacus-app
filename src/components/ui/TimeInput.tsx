import React, { useEffect, useRef, useState } from "react";
import {
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import {
  colors,
  inputHeight,
  radius,
  spacing,
  typography,
} from "../../theme/tokens";

interface TimeInputProps {
  label?: string;
  /** Value in HH:mm (24h). Empty string means no time selected. */
  value: string;
  onChange: (value: string) => void;
  error?: string;
  hint?: string;
}

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const MINUTES = Array.from({ length: 60 }, (_, i) => i);
const ITEM_HEIGHT = 40;
const VISIBLE = 5; // rows visible in the wheel
const WHEEL_HEIGHT = ITEM_HEIGHT * VISIBLE;

function parse(value: string): { h: number; m: number } {
  const match = value.match(/^(\d{1,2}):(\d{1,2})$/);
  if (!match) return { h: 0, m: 0 };
  const h = Math.max(0, Math.min(23, parseInt(match[1], 10) || 0));
  const m = Math.max(0, Math.min(59, parseInt(match[2], 10) || 0));
  return { h, m };
}

function format(h: number, m: number): string {
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export function TimeInput({
  label,
  value,
  onChange,
  error,
  hint,
}: TimeInputProps) {
  const [open, setOpen] = useState(false);
  const initial = value ? parse(value) : { h: 12, m: 0 };
  const [selected, setSelected] = useState(initial);

  function handleOpen() {
    setSelected(value ? parse(value) : { h: 12, m: 0 });
    setOpen(true);
  }

  function handleConfirm() {
    onChange(format(selected.h, selected.m));
    setOpen(false);
  }

  const isEmpty = !value;

  return (
    <View style={styles.container}>
      {label && <Text style={styles.label}>{label}</Text>}

      <TouchableOpacity
        style={[styles.inputWrapper, !!error && styles.inputWrapperError]}
        onPress={handleOpen}
        activeOpacity={0.8}
      >
        <Text style={[styles.value, isEmpty && styles.placeholder]}>
          {isEmpty ? "--:--" : value}
        </Text>
        <Text style={styles.icon}>🕒</Text>
      </TouchableOpacity>

      {!!error && <Text style={styles.error}>{error}</Text>}
      {!!hint && !error && <Text style={styles.hint}>{hint}</Text>}

      <Modal
        visible={open}
        transparent
        animationType="fade"
        onRequestClose={() => setOpen(false)}
      >
        <View style={modal.overlay}>
          <View style={modal.sheet}>
            <View style={modal.header}>
              <Text style={modal.title}>{label ?? "Horário"}</Text>
              <Text style={modal.preview}>
                {format(selected.h, selected.m)}
              </Text>
            </View>

            <View style={wheel.row}>
              <Wheel
                values={HOURS}
                selected={selected.h}
                onSelect={(h) => setSelected((s) => ({ ...s, h }))}
              />
              <Text style={wheel.separator}>:</Text>
              <Wheel
                values={MINUTES}
                selected={selected.m}
                onSelect={(m) => setSelected((s) => ({ ...s, m }))}
              />
            </View>

            <View style={modal.actions}>
              <TouchableOpacity
                style={modal.btnCancel}
                onPress={() => setOpen(false)}
                activeOpacity={0.8}
              >
                <Text style={modal.btnCancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={modal.btnConfirm}
                onPress={handleConfirm}
                activeOpacity={0.8}
              >
                <Text style={modal.btnConfirmText}>Confirmar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function Wheel({
  values,
  selected,
  onSelect,
}: {
  values: number[];
  selected: number;
  onSelect: (v: number) => void;
}) {
  const ref = useRef<ScrollView>(null);

  useEffect(() => {
    const idx = values.indexOf(selected);
    if (idx >= 0) {
      setTimeout(() => {
        ref.current?.scrollTo({
          y: idx * ITEM_HEIGHT,
          animated: false,
        });
      }, 50);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <View style={wheel.wheel}>
      {/* Selection indicator: two horizontal guides around the center row */}
      <View pointerEvents="none" style={wheel.indicator} />
      <ScrollView
        ref={ref}
        showsVerticalScrollIndicator={false}
        snapToInterval={ITEM_HEIGHT}
        decelerationRate="fast"
        contentContainerStyle={{
          paddingVertical: (WHEEL_HEIGHT - ITEM_HEIGHT) / 2,
        }}
        onMomentumScrollEnd={(e) => {
          const idx = Math.round(
            e.nativeEvent.contentOffset.y / ITEM_HEIGHT,
          );
          const clamped = Math.max(0, Math.min(values.length - 1, idx));
          onSelect(values[clamped]);
        }}
      >
        {values.map((v) => {
          const active = v === selected;
          return (
            <View key={v} style={wheel.item}>
              <Text style={[wheel.itemText, active && wheel.itemTextActive]}>
                {String(v).padStart(2, "0")}
              </Text>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

const wheel = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  wheel: {
    width: 80,
    height: WHEEL_HEIGHT,
    borderRadius: radius.md,
    backgroundColor: "rgba(26,28,38,0.5)",
    overflow: "hidden",
    position: "relative",
  },
  indicator: {
    position: "absolute",
    left: 0,
    right: 0,
    top: (WHEEL_HEIGHT - ITEM_HEIGHT) / 2,
    height: ITEM_HEIGHT,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.primaryBorder,
    backgroundColor: colors.primaryMuted,
    zIndex: 1,
  },
  item: {
    height: ITEM_HEIGHT,
    alignItems: "center",
    justifyContent: "center",
  },
  itemText: {
    fontSize: 20,
    fontFamily: typography.fontBody,
    color: colors.mutedForeground,
    fontVariant: ["tabular-nums"],
  },
  itemTextActive: {
    color: colors.foreground,
    fontFamily: typography.fontHeadingSemi,
  },
  separator: {
    fontSize: 24,
    color: colors.primary,
    fontFamily: typography.fontHeadingSemi,
  },
});

const styles = StyleSheet.create({
  container: { gap: spacing.xs },
  label: {
    fontSize: 14,
    fontFamily: typography.fontBodyMedium,
    color: colors.mutedForeground,
    marginLeft: 4,
  },
  inputWrapper: {
    height: inputHeight,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: "rgba(26,28,38,0.5)",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    justifyContent: "space-between",
  },
  inputWrapperError: { borderColor: colors.error },
  value: {
    fontSize: 16,
    color: colors.foreground,
    fontFamily: typography.fontBody,
  },
  placeholder: { color: colors.mutedForeground },
  icon: { fontSize: 18 },
  error: {
    fontSize: 12,
    color: colors.error,
    marginLeft: 4,
    fontFamily: typography.fontBody,
  },
  hint: {
    fontSize: 12,
    color: colors.mutedForeground,
    marginLeft: 4,
    fontFamily: typography.fontBody,
  },
});

const modal = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: colors.card,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    borderTopWidth: 1,
    borderColor: colors.border,
    paddingBottom: spacing.xl,
  },
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: {
    fontSize: 13,
    fontFamily: typography.fontBodySemiBold,
    color: colors.mutedForeground,
    textTransform: "uppercase",
    letterSpacing: 1.5,
  },
  preview: {
    fontSize: 22,
    fontFamily: typography.fontHeadingSemi,
    color: colors.primary,
    marginTop: 4,
  },
  actions: {
    flexDirection: "row",
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  btnCancel: {
    flex: 1,
    height: 52,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  btnCancelText: {
    fontSize: 15,
    fontFamily: typography.fontBodyMedium,
    color: colors.mutedForeground,
  },
  btnConfirm: {
    flex: 2,
    height: 52,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  btnConfirmText: {
    fontSize: 16,
    fontFamily: typography.fontHeadingSemi,
    color: colors.primaryForeground,
  },
});
