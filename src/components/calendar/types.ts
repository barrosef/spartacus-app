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
  isMine?: boolean;  // true if student is enrolled in this class
}

export const EVENT_COLORS: Record<EventType, string> = {
  class: "#2563EB",        // blue
  event: "#0D9488",        // teal
  championship: "#EA580C", // orange
};

export const FILTER_COLORS: Record<string, string> = {
  classes: "#2563EB",
  my_classes: "#8B5CF6",
  events: "#0D9488",
  championships: "#EA580C",
};

export type FilterKey = "classes" | "my_classes" | "events" | "championships";
