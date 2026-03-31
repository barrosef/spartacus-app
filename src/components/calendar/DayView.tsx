import React from "react";
import { View, Text, ScrollView, StyleSheet } from "react-native";
import { colors, typography, spacing, radius } from "../../theme/tokens";
import type { CalendarEvent } from "./types";
import { EVENT_COLORS } from "./types";

const SHORT_DAYS = ["dom.", "seg.", "ter.", "qua.", "qui.", "sex.", "sáb."];
const HOURS = Array.from({ length: 24 }, (_, i) =>
  `${String(i).padStart(2, "0")}:00`,
);

interface DayViewProps {
  date: Date;
  events: CalendarEvent[];
}

export function DayView({ date, events }: DayViewProps) {
  const dayLabel = SHORT_DAYS[date.getDay()].toUpperCase();
  const dayNum = date.getDate();
  const isToday =
    new Date().toDateString() === date.toDateString();

  const dayEvents = events.filter(
    (e) => e.date.toDateString() === date.toDateString(),
  );

  return (
    <View style={styles.container}>
      {/* Day header */}
      <View style={styles.dayHeader}>
        <Text style={styles.dayLabel}>{dayLabel}</Text>
        <View style={[
          styles.dayCircle,
          isToday && styles.dayCircleToday,
        ]}>
          <Text style={[
            styles.dayNum,
            isToday && styles.dayNumToday,
          ]}>
            {dayNum}
          </Text>
        </View>
      </View>

      {/* Hour grid */}
      <ScrollView showsVerticalScrollIndicator={false}>
        {HOURS.map((hour) => {
          const hourNum = parseInt(hour);
          const hourEvents = dayEvents.filter((e) => {
            const h = parseInt(e.startTime.split(":")[0]);
            return h === hourNum;
          });

          return (
            <View key={hour} style={styles.hourRow}>
              <Text style={styles.hourLabel}>{hour}</Text>
              <View style={styles.hourContent}>
                {hourEvents.map((ev) => (
                  <View
                    key={ev.id}
                    style={[
                      styles.eventBlock,
                      { backgroundColor: EVENT_COLORS[ev.type] },
                    ]}
                  >
                    <Text style={styles.eventTitle}>
                      {ev.title}
                    </Text>
                    <Text style={styles.eventTime}>
                      {ev.startTime} - {ev.endTime}
                    </Text>
                  </View>
                ))}
              </View>
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
  dayHeader: {
    alignItems: "center",
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  dayLabel: {
    color: colors.mutedForeground,
    fontFamily: typography.fontBodySemiBold,
    fontSize: 11,
  },
  dayCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  dayCircleToday: {
    backgroundColor: "rgba(198,163,78,0.3)",
  },
  dayNum: {
    color: colors.foreground,
    fontFamily: typography.fontHeadingSemi,
    fontSize: 18,
  },
  dayNumToday: {
    color: colors.primary,
  },
  hourRow: {
    flexDirection: "row",
    minHeight: 56,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  hourLabel: {
    width: 52,
    color: colors.mutedForeground,
    fontFamily: typography.fontBody,
    fontSize: 12,
    paddingTop: spacing.xs,
    textAlign: "right",
    paddingRight: spacing.sm,
  },
  hourContent: {
    flex: 1,
    paddingVertical: 2,
    paddingRight: spacing.sm,
  },
  eventBlock: {
    borderRadius: radius.sm,
    padding: spacing.xs + 2,
    marginBottom: 2,
  },
  eventTitle: {
    color: "#fff",
    fontFamily: typography.fontBodySemiBold,
    fontSize: 12,
  },
  eventTime: {
    color: "rgba(255,255,255,0.8)",
    fontFamily: typography.fontBody,
    fontSize: 10,
  },
});
