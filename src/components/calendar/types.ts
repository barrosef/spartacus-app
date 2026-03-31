export type CalendarView = "month" | "agenda" | "day" | "week";

export type EventType = "class" | "event" | "championship";

export interface CalendarEvent {
  id: string;
  title: string;
  type: EventType;
  date: Date;
  startTime: string; // "19:00"
  endTime: string;   // "20:30"
  teacher?: string;
  location?: string;
}

export const EVENT_COLORS: Record<EventType, string> = {
  class: "#2563EB",        // blue
  event: "#0D9488",        // teal
  championship: "#EA580C", // orange
};

export const FILTER_COLORS: Record<string, string> = {
  classes: "#2563EB",
  events: "#0D9488",
  championships: "#EA580C",
};

export type FilterKey = "classes" | "events" | "championships";
