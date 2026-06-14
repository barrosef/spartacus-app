export type CalendarView = "month" | "agenda" | "day" | "week";

export type EventType =
  | "class"
  | "event"
  | "championship"
  | "own"
  | "external"
  | "guest_class";

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
  class: "#2563EB",        // aula (azul)
  event: "#0D9488",        // legado → próprio (teal)
  championship: "#EA580C", // legado → terceiro (laranja)
  own: "#0D9488",          // evento próprio (teal)
  external: "#EA580C",     // evento de terceiro (laranja)
  guest_class: "#7C3AED",  // aulão substituto (roxo)
};

export const FILTER_COLORS: Record<string, string> = {
  classes: "#2563EB",
  my_classes: "#8B5CF6",
  events: "#0D9488",
  championships: "#EA580C",
};

export type FilterKey = "classes" | "my_classes" | "events" | "championships";
