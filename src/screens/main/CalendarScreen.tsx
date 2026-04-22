import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  PanResponder,
  Animated,
  Dimensions,
} from "react-native";
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

const SWIPE_THRESHOLD = 60;
const SCREEN_WIDTH = Dimensions.get("window").width;

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
  startDate: string;
  endDate?: string;
  location?: string;
}

interface MyClassOut {
  class_id: string;
}

export function CalendarScreen() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [selectedDate, setSelectedDate] = useState(now);
  const [view, setView] = useState<CalendarView>("month");
  const [showMonthPicker, setShowMonthPicker] = useState(false);
  const [showSidebar, setShowSidebar] = useState(false);
  const [filters, setFilters] = useState<Set<FilterKey>>(
    new Set(["my_classes"]),
  );
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [myClassIds, setMyClassIds] = useState<Set<string>>(new Set());

  const projectId = getProjectId();

  // Fetch user's enrolled classes
  const fetchMyClasses = useCallback(async () => {
    try {
      const data = await api.get<{ enrollments: MyClassOut[] }>(
        `/projects/${projectId}/my-classes`,
      );
      setMyClassIds(new Set(data.enrollments.map((e) => e.class_id)));
    } catch {
      // graceful — user may not be enrolled in any class
    }
  }, [projectId]);

  useEffect(() => { fetchMyClasses(); }, [fetchMyClasses]);

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

      if (classesRes.status === "fulfilled") {
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        for (const cls of classesRes.value.classes) {
          const isMine = myClassIds.has(cls.id);
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
                  isMine,
                });
              }
            }
          }
        }
      }

      if (eventsRes.status === "fulfilled") {
        for (const ev of eventsRes.value.events) {
          const type = ev.type === "championship"
            ? "championship" : "event";
          const d = new Date(ev.startDate);
          result.push({
            id: ev.id,
            title: ev.title,
            type,
            date: d,
            startTime: d.toTimeString().slice(0, 5),
            endTime: ev.endDate
              ? new Date(ev.endDate).toTimeString().slice(0, 5)
              : "",
            location: ev.location,
          });
        }
      }

      setEvents(result);
    } catch {
      // graceful
    }
  }, [year, month, projectId, myClassIds]);

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

  // Navigation helpers for swipe
  const goNext = useCallback(() => {
    if (view === "month" || view === "agenda") {
      if (month === 11) {
        setMonth(0);
        setYear((y) => y + 1);
      } else {
        setMonth((m) => m + 1);
      }
    } else if (view === "day") {
      setSelectedDate((prev) => {
        const next = new Date(prev);
        next.setDate(next.getDate() + 1);
        if (next.getMonth() !== month) {
          setMonth(next.getMonth());
          setYear(next.getFullYear());
        }
        return next;
      });
    } else if (view === "week") {
      setSelectedDate((prev) => {
        const next = new Date(prev);
        next.setDate(next.getDate() + 7);
        if (next.getMonth() !== month) {
          setMonth(next.getMonth());
          setYear(next.getFullYear());
        }
        return next;
      });
    }
  }, [view, month]);

  const goPrev = useCallback(() => {
    if (view === "month" || view === "agenda") {
      if (month === 0) {
        setMonth(11);
        setYear((y) => y - 1);
      } else {
        setMonth((m) => m - 1);
      }
    } else if (view === "day") {
      setSelectedDate((prev) => {
        const next = new Date(prev);
        next.setDate(next.getDate() - 1);
        if (next.getMonth() !== month) {
          setMonth(next.getMonth());
          setYear(next.getFullYear());
        }
        return next;
      });
    } else if (view === "week") {
      setSelectedDate((prev) => {
        const next = new Date(prev);
        next.setDate(next.getDate() - 7);
        if (next.getMonth() !== month) {
          setMonth(next.getMonth());
          setYear(next.getFullYear());
        }
        return next;
      });
    }
  }, [view, month]);

  // Keep latest nav callbacks in refs so PanResponder always calls current version
  const goNextRef = useRef(goNext);
  const goPrevRef = useRef(goPrev);
  useEffect(() => { goNextRef.current = goNext; }, [goNext]);
  useEffect(() => { goPrevRef.current = goPrev; }, [goPrev]);

  const translateX = useRef(new Animated.Value(0)).current;
  const isAnimatingRef = useRef(false);

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gs) =>
        !isAnimatingRef.current &&
        Math.abs(gs.dx) > 15 && Math.abs(gs.dy) < 30,
      onPanResponderMove: (_, gs) => {
        translateX.setValue(gs.dx);
      },
      onPanResponderRelease: (_, gs) => {
        const goNext = gs.dx < -SWIPE_THRESHOLD;
        const goPrev = gs.dx > SWIPE_THRESHOLD;

        if (goNext || goPrev) {
          isAnimatingRef.current = true;
          const exitTo = goNext ? -SCREEN_WIDTH : SCREEN_WIDTH;
          Animated.timing(translateX, {
            toValue: exitTo,
            duration: 200,
            useNativeDriver: true,
          }).start(() => {
            if (goNext) goNextRef.current();
            else goPrevRef.current();
            translateX.setValue(-exitTo);
            Animated.timing(translateX, {
              toValue: 0,
              duration: 200,
              useNativeDriver: true,
            }).start(() => {
              isAnimatingRef.current = false;
            });
          });
        } else {
          Animated.spring(translateX, {
            toValue: 0,
            damping: 18,
            stiffness: 220,
            useNativeDriver: true,
          }).start();
        }
      },
      onPanResponderTerminate: () => {
        Animated.spring(translateX, {
          toValue: 0,
          damping: 18,
          stiffness: 220,
          useNativeDriver: true,
        }).start();
      },
    }),
  ).current;

  // Apply filters to events
  const filteredEvents = events.filter((e) => {
    if (e.type === "class") {
      const showAll = filters.has("classes");
      const showMine = filters.has("my_classes");
      if (showMine && e.isMine) return true;
      if (showAll && !showMine) return true;
      if (showAll && showMine) return !e.isMine; // show non-mine when both active
      return false;
    }
    if (e.type === "event" && !filters.has("events")) return false;
    if (e.type === "championship" && !filters.has("championships")) return false;
    return true;
  });

  const monthEvents = filteredEvents.filter(
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
          <DayView date={selectedDate} events={filteredEvents} />
        );
      case "week":
        return (
          <WeekView date={selectedDate} events={filteredEvents} />
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
            {MONTH_NAMES[month]} {year !== now.getFullYear() ? year : ""}
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

      {/* Active view with swipe */}
      <View style={styles.content} {...panResponder.panHandlers}>
        <Animated.View
          style={[styles.animated, { transform: [{ translateX }] }]}
        >
          {renderView()}
        </Animated.View>
      </View>

      {/* Sidebar */}
      <CalendarSidebar
        visible={showSidebar}
        onClose={() => setShowSidebar(false)}
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
    overflow: "hidden",
  },
  animated: {
    flex: 1,
  },
});
