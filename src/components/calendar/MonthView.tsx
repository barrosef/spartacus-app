import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { colors, typography, spacing, radius } from "../../theme/tokens";
import type { CalendarEvent } from "./types";
import { EVENT_COLORS } from "./types";

const DAY_HEADERS = ["dom.", "seg.", "ter.", "qua.", "qui.", "sex.", "sáb."];

interface MonthViewProps {
  year: number;
  month: number; // 0-11
  events: CalendarEvent[];
  onDayPress?: (date: Date) => void;
}

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfWeek(year: number, month: number) {
  return new Date(year, month, 1).getDay();
}

export function MonthView({ year, month, events, onDayPress }: MonthViewProps) {
  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfWeek(year, month);
  const today = new Date();
  const isCurrentMonth = today.getFullYear() === year && today.getMonth() === month;

  // Build grid cells
  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  // Fill remaining
  while (cells.length % 7 !== 0) cells.push(null);

  // Group events by day
  const eventsByDay: Record<number, CalendarEvent[]> = {};
  events.forEach((e) => {
    if (e.date.getFullYear() === year && e.date.getMonth() === month) {
      const day = e.date.getDate();
      if (!eventsByDay[day]) eventsByDay[day] = [];
      eventsByDay[day].push(e);
    }
  });

  const rows: (number | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) {
    rows.push(cells.slice(i, i + 7));
  }

  return (
    <View style={styles.container}>
      {/* Day headers */}
      <View style={styles.headerRow}>
        {DAY_HEADERS.map((d, i) => (
          <View key={i} style={styles.headerCell}>
            <Text style={[
              styles.headerText,
              (i === 1) && styles.headerTextHighlight,
            ]}>
              {d}
            </Text>
          </View>
        ))}
      </View>

      {/* Weeks */}
      {rows.map((row, ri) => (
        <View key={ri} style={styles.weekRow}>
          {row.map((day, ci) => {
            const isToday = isCurrentMonth && day === today.getDate();
            const dayEvents = day ? (eventsByDay[day] ?? []) : [];

            return (
              <TouchableOpacity
                key={ci}
                style={styles.dayCell}
                activeOpacity={day ? 0.6 : 1}
                onPress={() => {
                  if (day && onDayPress) {
                    onDayPress(new Date(year, month, day));
                  }
                }}
              >
                {day && (
                  <>
                    <View style={[
                      styles.dayNumber,
                      isToday && styles.dayNumberToday,
                    ]}>
                      <Text style={[
                        styles.dayText,
                        isToday && styles.dayTextToday,
                      ]}>
                        {day}
                      </Text>
                    </View>
                    {dayEvents.slice(0, 1).map((ev, ei) => (
                      <View
                        key={ei}
                        style={[
                          styles.eventChip,
                          { backgroundColor: EVENT_COLORS[ev.type] },
                        ]}
                      >
                        <Text
                          style={styles.eventChipText}
                          numberOfLines={1}
                        >
                          {ev.title.length > 5
                            ? ev.title.slice(0, 5) + "..."
                            : ev.title}
                        </Text>
                      </View>
                    ))}
                  </>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing.sm,
  },
  headerRow: {
    flexDirection: "row",
    paddingBottom: spacing.sm,
  },
  headerCell: {
    flex: 1,
    alignItems: "center",
  },
  headerText: {
    color: colors.mutedForeground,
    fontFamily: typography.fontBodyMedium,
    fontSize: 11,
    textTransform: "lowercase",
  },
  headerTextHighlight: {
    color: colors.primary,
  },
  weekRow: {
    flexDirection: "row",
    minHeight: 72,
  },
  dayCell: {
    flex: 1,
    alignItems: "center",
    paddingVertical: spacing.xs,
    gap: 2,
  },
  dayNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  dayNumberToday: {
    backgroundColor: "rgba(198,163,78,0.3)",
  },
  dayText: {
    color: colors.foreground,
    fontFamily: typography.fontBody,
    fontSize: 13,
  },
  dayTextToday: {
    color: colors.primary,
    fontFamily: typography.fontBodySemiBold,
  },
  eventChip: {
    borderRadius: radius.sm,
    paddingHorizontal: 4,
    paddingVertical: 1,
    maxWidth: "100%",
  },
  eventChipText: {
    color: "#fff",
    fontFamily: typography.fontBodyMedium,
    fontSize: 9,
  },
});
