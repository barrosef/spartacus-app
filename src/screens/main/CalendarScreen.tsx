import React, { useState, useEffect, useCallback } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Feather } from "@expo/vector-icons";
import { colors, typography, spacing } from "../../theme/tokens";
import { api, getProjectId } from "../../lib/api";
import type {
  CalendarView,
  CalendarEvent,
  FilterKey,
} from "../../components/calendar/types";
import { MonthSelector } from "../../components/calendar/MonthSelector";
import { CalendarSidebar } from "../../components/calendar/CalendarSidebar";
import { MonthView } from "../../components/calendar/MonthView";
import { AgendaView } from "../../components/calendar/AgendaView";
import { DayView } from "../../components/calendar/DayView";
import { WeekView } from "../../components/calendar/WeekView";

const MONTH_NAMES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

const DAY_MAP: Record<string, number> = {
  sun: 0, mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6,
};

interface ClassOut {
  id: string;
  name: string;
  modality_name: string;
  schedule_items: {
    day: string;
    start_time: string;
    end_time: string;
  }[];
  teacher?: string;
  location?: string;
}

interface EventOut {
  id: string;
  title: string;
  type: "event" | "championship";
  start_date: string;
  end_date?: string;
  location?: string;
}

export function CalendarScreen() {
  const now = new Date();
  const [year] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [selectedDate, setSelectedDate] = useState(now);
  const [view, setView] = useState<CalendarView>("month");
  const [showMonthPicker, setShowMonthPicker] = useState(false);
  const [showSidebar, setShowSidebar] = useState(false);
  const [filters, setFilters] = useState<Set<FilterKey>>(
    new Set(["classes", "events", "championships"]),
  );
  const [events, setEvents] = useState<CalendarEvent[]>([]);

  const projectId = getProjectId();

  const fetchEvents = useCallback(async () => {
    const monthStr = `${year}-${String(month + 1).padStart(2, "0")}`;
    try {
      const [classesRes, eventsRes] = await Promise.allSettled([
        api.get<{ classes: ClassOut[] }>(
          `/projects/${projectId}/classes`,
        ),
        api.get<{ events: EventOut[] }>(
          `/projects/${projectId}/events?month=${monthStr}`,
        ),
      ]);

      const result: CalendarEvent[] = [];

      // Generate recurring class events for the month
      if (
        classesRes.status === "fulfilled"
        && filters.has("classes")
      ) {
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        for (const cls of classesRes.value.classes) {
          for (const item of cls.schedule_items) {
            const targetDay = DAY_MAP[item.day];
            if (targetDay === undefined) continue;
            for (let d = 1; d <= daysInMonth; d++) {
              const date = new Date(year, month, d);
              if (date.getDay() === targetDay) {
                result.push({
                  id: `${cls.id}_${d}`,
                  title: `${cls.modality_name}`,
                  type: "class",
                  date,
                  startTime: item.start_time,
                  endTime: item.end_time,
                  teacher: cls.teacher,
                  location: cls.location,
                });
              }
            }
          }
        }
      }

      // Add one-time events
      if (eventsRes.status === "fulfilled") {
        for (const ev of eventsRes.value.events) {
          const type = ev.type === "championship"
            ? "championship" : "event";
          if (
            (type === "event" && !filters.has("events"))
            || (type === "championship" && !filters.has("championships"))
          ) continue;

          const d = new Date(ev.start_date);
          result.push({
            id: ev.id,
            title: ev.title,
            type,
            date: d,
            startTime: d.toTimeString().slice(0, 5),
            endTime: ev.end_date
              ? new Date(ev.end_date).toTimeString().slice(0, 5)
              : "",
            location: ev.location,
          });
        }
      }

      setEvents(result);
    } catch {
      // graceful
    }
  }, [year, month, projectId, filters]);

  useEffect(() => { fetchEvents(); }, [fetchEvents]);

  const handleMonthSelect = (m: number) => {
    setMonth(m);
    setShowMonthPicker(false);
  };

  const toggleFilter = (f: FilterKey) => {
    setFilters((prev) => {
      const next = new Set(prev);
      if (next.has(f)) next.delete(f);
      else next.add(f);
      return next;
    });
  };

  const handleDayPress = (date: Date) => {
    setSelectedDate(date);
    setView("day");
  };

  // Filter events for the selected month
  const monthEvents = events.filter(
    (e) =>
      e.date.getFullYear() === year && e.date.getMonth() === month,
  );

  const renderView = () => {
    switch (view) {
      case "month":
        return (
          <MonthView
            year={year}
            month={month}
            events={monthEvents}
            onDayPress={handleDayPress}
          />
        );
      case "agenda":
        return <AgendaView events={monthEvents} />;
      case "day":
        return (
          <DayView date={selectedDate} events={events} />
        );
      case "week":
        return (
          <WeekView date={selectedDate} events={events} />
        );
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.monthBtn}
          activeOpacity={0.7}
          onPress={() => setShowMonthPicker((v) => !v)}
        >
          <Text style={styles.monthText}>
            {MONTH_NAMES[month]}
          </Text>
          <Feather
            name={showMonthPicker ? "chevron-up" : "chevron-down"}
            size={18}
            color={colors.foreground}
          />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setShowSidebar(true)}
          hitSlop={8}
        >
          <Feather
            name="menu"
            size={22}
            color={colors.foreground}
          />
        </TouchableOpacity>
      </View>

      {/* Month picker */}
      {showMonthPicker && (
        <MonthSelector
          selectedMonth={month}
          onSelect={handleMonthSelect}
        />
      )}

      {/* Active view */}
      <View style={styles.content}>{renderView()}</View>

      {/* Sidebar */}
      <CalendarSidebar
        visible={showSidebar}
        onClose={() => setShowSidebar(false)}
        userName="Usuário"
        userInitials="US"
        activeView={view}
        onViewChange={setView}
        filters={filters}
        onFilterToggle={toggleFilter}
        onRefresh={fetchEvents}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  monthBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  monthText: {
    color: colors.foreground,
    fontFamily: typography.fontHeadingSemi,
    fontSize: 18,
  },
  content: {
    flex: 1,
  },
});
