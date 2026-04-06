import React from "react";
import { View, Text, ScrollView, StyleSheet } from "react-native";
import { colors, typography, spacing } from "../../theme/tokens";
import type { CalendarEvent } from "./types";
import { EVENT_COLORS } from "./types";

const DAY_LABELS = ["DOM", "SEG", "TER", "QUA", "QUI", "SEX", "SÁB"];
const HOURS = Array.from({ length: 24 }, (_, i) =>
  `${String(i).padStart(2, "0")}:00`,
);

interface WeekViewProps {
  date: Date; // any day in the week
  events: CalendarEvent[];
}

function getWeekDates(date: Date): Date[] {
  const d = new Date(date);
  const day = d.getDay();
  const start = new Date(d);
  start.setDate(d.getDate() - day);
  return Array.from({ length: 7 }, (_, i) => {
    const dd = new Date(start);
    dd.setDate(start.getDate() + i);
    return dd;
  });
}

export function WeekView({ date, events }: WeekViewProps) {
  const weekDates = getWeekDates(date);
  const today = new Date();

  return (
    <View style={styles.container}>
      {/* Day headers */}
      <View style={styles.headerRow}>
        <View style={styles.hourSpacer} />
        {weekDates.map((d, i) => {
          const isToday = d.toDateString() === today.toDateString();
          return (
            <View key={i} style={styles.headerCell}>
              <Text style={styles.headerLabel}>{DAY_LABELS[i]}</Text>
              <View style={[
                styles.headerCircle,
                isToday && styles.headerCircleToday,
              ]}>
                <Text style={[
                  styles.headerNum,
                  isToday && styles.headerNumToday,
                ]}>
                  {d.getDate()}
                </Text>
              </View>
            </View>
          );
        })}
      </View>

      {/* Hour grid */}
      <ScrollView showsVerticalScrollIndicator={false}>
        {HOURS.map((hour) => {
          const hourNum = parseInt(hour);
          return (
            <View key={hour} style={styles.hourRow}>
              <Text style={styles.hourLabel}>{hour}</Text>
              {weekDates.map((d, di) => {
                const dayEvents = events.filter(
                  (e) =>
                    e.date.toDateString() === d.toDateString()
                    && parseInt(e.startTime.split(":")[0]) === hourNum,
                );
                return (
                  <View key={di} style={styles.dayCol}>
                    {dayEvents.map((ev) => (
                      <View
                        key={ev.id}
                        style={[
                          styles.eventDot,
                          { backgroundColor: EVENT_COLORS[ev.type] },
                        ]}
                      />
                    ))}
                  </View>
                );
              })}
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingBottom: spacing.xs,
  },
  hourSpacer: {
    width: 52,
  },
  headerCell: {
    flex: 1,
    alignItems: "center",
    gap: 2,
  },
  headerLabel: {
    color: colors.mutedForeground,
    fontFamily: typography.fontBodySemiBold,
    fontSize: 10,
  },
  headerCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  headerCircleToday: {
    backgroundColor: "rgba(198,163,78,0.3)",
  },
  headerNum: {
    color: colors.foreground,
    fontFamily: typography.fontBodyMedium,
    fontSize: 13,
  },
  headerNumToday: {
    color: colors.primary,
    fontFamily: typography.fontBodySemiBold,
  },
  hourRow: {
    flexDirection: "row",
    minHeight: 48,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  hourLabel: {
    width: 52,
    color: colors.mutedForeground,
    fontFamily: typography.fontBody,
    fontSize: 11,
    paddingTop: 2,
    textAlign: "right",
    paddingRight: spacing.sm,
  },
  dayCol: {
    flex: 1,
    borderLeftWidth: StyleSheet.hairlineWidth,
    borderLeftColor: colors.border,
    paddingHorizontal: 1,
    paddingTop: 2,
    gap: 2,
  },
  eventDot: {
    height: 6,
    borderRadius: 3,
  },
});
