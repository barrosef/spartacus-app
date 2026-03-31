import React from "react";
import { View, Text, ScrollView, StyleSheet } from "react-native";
import { colors, typography, spacing, radius } from "../../theme/tokens";
import type { CalendarEvent } from "./types";
import { EVENT_COLORS } from "./types";

const SHORT_DAYS = ["dom.", "seg.", "ter.", "qua.", "qui.", "sex.", "sáb."];

interface AgendaViewProps {
  events: CalendarEvent[];
}

interface DayGroup {
  date: Date;
  events: CalendarEvent[];
}

function groupByDay(events: CalendarEvent[]): DayGroup[] {
  const map = new Map<string, CalendarEvent[]>();
  const sorted = [...events].sort(
    (a, b) => a.date.getTime() - b.date.getTime(),
  );
  for (const ev of sorted) {
    const key = ev.date.toISOString().slice(0, 10);
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(ev);
  }
  return Array.from(map.entries()).map(([, evs]) => ({
    date: evs[0].date,
    events: evs,
  }));
}

export function AgendaView({ events }: AgendaViewProps) {
  const groups = groupByDay(events);

  if (groups.length === 0) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>
          Nenhum evento neste mês.
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      showsVerticalScrollIndicator={false}
    >
      {groups.map((group) => {
        const d = group.date;
        const dayLabel = SHORT_DAYS[d.getDay()];
        const dayNum = d.getDate();

        return (
          <View key={d.toISOString()} style={styles.dayRow}>
            <View style={styles.dateCol}>
              <Text style={styles.dateWeekday}>{dayLabel}</Text>
              <Text style={styles.dateNumber}>{dayNum}</Text>
            </View>
            <View style={styles.eventsCol}>
              {group.events.map((ev) => (
                <View
                  key={ev.id}
                  style={[
                    styles.eventCard,
                    { backgroundColor: EVENT_COLORS[ev.type] },
                  ]}
                >
                  <Text style={styles.eventTitle}>{ev.title}</Text>
                  <Text style={styles.eventTime}>{ev.startTime}</Text>
                </View>
              ))}
            </View>
          </View>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.xs,
  },
  empty: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing.xxl,
  },
  emptyText: {
    color: colors.mutedForeground,
    fontFamily: typography.fontBody,
    fontSize: 14,
  },
  dayRow: {
    flexDirection: "row",
    gap: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingVertical: spacing.sm,
  },
  dateCol: {
    width: 48,
    alignItems: "center",
    paddingTop: spacing.xs,
  },
  dateWeekday: {
    color: colors.mutedForeground,
    fontFamily: typography.fontBodyMedium,
    fontSize: 10,
    textTransform: "lowercase",
  },
  dateNumber: {
    color: colors.foreground,
    fontFamily: typography.fontHeading,
    fontSize: 22,
  },
  eventsCol: {
    flex: 1,
    gap: spacing.xs,
  },
  eventCard: {
    borderRadius: radius.md,
    padding: spacing.sm + 4,
  },
  eventTitle: {
    color: "#fff",
    fontFamily: typography.fontBodySemiBold,
    fontSize: 14,
  },
  eventTime: {
    color: "rgba(255,255,255,0.8)",
    fontFamily: typography.fontBody,
    fontSize: 12,
  },
});
