export const EVENT_TYPES: Record<string, { label: string; color: string }> = {
  general:          { label: "General",          color: "#e13d7d" },
  therapy_session:  { label: "Therapy Session",  color: "#3B82F6" },
  assessment:       { label: "Assessment",        color: "#8B5CF6" },
  follow_up:        { label: "Follow-up",         color: "#10B981" },
  group_session:    { label: "Group Session",     color: "#F59E0B" },
  urgent:           { label: "Urgent",            color: "#EF4444" },
};

export interface CalEvent {
  id: string;
  title: string;
  start_at: string;
  end_at: string;
  all_day: boolean;
  type: string;
  color: string;
  description: string | null;
  location: string | null;
  created_by: string;
}

export interface Guest {
  id: string;
  full_name: string;
  email: string;
  role: string;
  status?: "pending" | "accepted" | "declined";
}
