import { useState, useEffect, useRef } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import listPlugin from "@fullcalendar/list";
import { supabase } from "../lib/supabaseClient";
import { Plus, X, CalendarDays, Clock, User, FileText, Palette } from "lucide-react";
import EventModal from "../components/EventModal";
import { EVENT_TYPES, CalEvent } from "../lib/calendarTypes";
import { useNavigate } from "react-router-dom";
import { logActivity } from "../lib/activityLog";

const CHILD_EVENT_COLORS: Record<string, string> = {
  appointment:      "#10B981",
  homework_prompt:  "#F59E0B",
  check_in:         "#3B82F6",
  drawing_schedule: "#7C3AED",
};
const CHILD_EVENT_LABELS: Record<string, string> = {
  appointment:      "Appointment",
  homework_prompt:  "Homework",
  check_in:         "Check-in",
  drawing_schedule: "Drawing Session",
};
const PARENT_STATUS_BADGE: Record<string, { label: string; cls: string }> = {
  pending:  { label: "Pending",  cls: "bg-amber-50 text-amber-700 border border-amber-200" },
  accepted: { label: "Accepted", cls: "bg-emerald-50 text-emerald-700 border border-emerald-200" },
  rejected: { label: "Rejected", cls: "bg-red-50 text-red-700 border border-red-200" },
};

interface ChildEventItem {
  id: string;
  title: string;
  description: string | null;
  event_type: string;
  scheduled_at: string;
  parent_status: string;
  child_id: string;
  childName: string;
}

export default function CalendarPage() {
  const navigate = useNavigate();
  const calRef = useRef<InstanceType<typeof FullCalendar>>(null);
  const [events, setEvents]           = useState<CalEvent[]>([]);
  const [childEvents, setChildEvents] = useState<ChildEventItem[]>([]);
  const [myId, setMyId]               = useState("");
  const [myRole, setMyRole]           = useState("");
  const [modalOpen, setModalOpen]     = useState(false);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [editEvent, setEditEvent]     = useState<CalEvent | null>(null);
  const [childPopup, setChildPopup]   = useState<ChildEventItem | null>(null);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return;
      setMyId(user.id);
      const { data: profile } = await supabase
        .from("profiles").select("role").eq("id", user.id).single();
      const role = (profile?.role ?? "").toLowerCase();
      setMyRole(role);
      fetchEvents(user.id);
      fetchChildEvents(user.id, role);
    });
  }, []);

  async function fetchEvents(uid: string) {
    const { data: own } = await supabase
      .from("calendar_events")
      .select("*")
      .eq("created_by", uid);

    const { data: invs } = await supabase
      .from("event_invitations")
      .select("event_id, status, calendar_events(*)")
      .eq("invitee_id", uid)
      .neq("status", "declined");

    const invited = (invs ?? [])
      .map((inv: any) => inv.calendar_events)
      .filter(Boolean);

    const all = [...(own ?? []), ...invited];
    const seen = new Set<string>();
    setEvents(all.filter(e => { if (seen.has(e.id)) return false; seen.add(e.id); return true; }));
  }

  async function fetchChildEvents(uid: string, role: string) {
    if (role !== "therapist" && role !== "user") return;

    const column = role === "therapist" ? "therapist_id" : "guardian_id";
    const { data: patients } = await supabase
      .from("patients")
      .select("id, full_name")
      .eq(column, uid);

    if (!patients?.length) return;

    const childMap: Record<string, string> = {};
    patients.forEach(p => { childMap[p.id] = p.full_name; });

    const { data: evts } = await supabase
      .from("child_events")
      .select("id, title, description, event_type, scheduled_at, parent_status, child_id")
      .in("child_id", patients.map(p => p.id))
      .order("scheduled_at", { ascending: true });

    setChildEvents(
      (evts ?? []).map(ev => ({ ...ev, childName: childMap[ev.child_id] ?? "Unknown" }))
    );
  }

  function toFCEvents() {
    const calendarFCEvents = events.map(e => ({
      id: e.id,
      title: e.title,
      start: e.start_at,
      end: e.end_at,
      allDay: e.all_day,
      backgroundColor: EVENT_TYPES[e.type]?.color ?? e.color ?? "#e13d7d",
      borderColor:     EVENT_TYPES[e.type]?.color ?? e.color ?? "#e13d7d",
      extendedProps: { _isChildEvent: false, ...e },
    }));

    const childFCEvents = childEvents.map(ev => {
      const color = CHILD_EVENT_COLORS[ev.event_type] ?? "#7C3AED";
      const childFirst = ev.childName.split(" ")[0];
      return {
        id: `child-${ev.id}`,
        title: `${childFirst}: ${ev.title}`,
        start: ev.scheduled_at,
        allDay: false,
        backgroundColor: color,
        borderColor:     color,
        extendedProps: { _isChildEvent: true, ...ev },
      };
    });

    return [...calendarFCEvents, ...childFCEvents];
  }

  function openCreate(dateStr?: string) {
    setEditEvent(null);
    setSelectedDate(dateStr ?? null);
    setModalOpen(true);
  }

  function openEdit(event: CalEvent) {
    setEditEvent(event);
    setSelectedDate(null);
    setModalOpen(true);
  }

  async function respondToDrawingSession(eventId: string, status: "accepted" | "rejected") {
    setUpdatingStatus(true);
    try {
      const { error } = await supabase
        .from("child_events")
        .update({ parent_status: status })
        .eq("id", eventId);
      if (error) throw error;
      setChildEvents(prev =>
        prev.map(ev => ev.id === eventId ? { ...ev, parent_status: status } : ev)
      );
      setChildPopup(prev => prev ? { ...prev, parent_status: status } : prev);
      const ev = childEvents.find(e => e.id === eventId);
      await logActivity({
        action: status === 'accepted' ? 'session.accepted' : 'session.rejected',
        entity_type: 'child_event',
        entity_id: eventId,
        entity_label: ev?.title ?? 'Drawing session',
        meta: { child_id: ev?.child_id, child_name: ev?.childName },
      });
    } catch {
      alert("Failed to update. Please try again.");
    } finally {
      setUpdatingStatus(false);
    }
  }

  return (
    <div className="max-w-7xl mx-auto pb-10 space-y-5">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Calendar</h1>
          <p className="text-sm text-gray-500 mt-0.5">Manage sessions, appointments and events</p>
        </div>
        <button
          onClick={() => openCreate()}
          className="flex items-center gap-2 px-4 py-2.5 bg-[#e13d7d] text-white text-sm font-semibold rounded-xl hover:bg-pink-600 transition-colors"
        >
          <Plus size={16} /> New Event
        </button>
      </div>

      {/* Color legend */}
      <div className="flex flex-wrap gap-3">
        {Object.entries(EVENT_TYPES).map(([key, val]) => (
          <div key={key} className="flex items-center gap-1.5 text-xs text-gray-600 bg-white border border-gray-200 rounded-lg px-3 py-1.5">
            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: val.color }} />
            {val.label}
          </div>
        ))}
        {/* Child event type legend */}
        {childEvents.length > 0 && (
          <>
            <div className="w-px h-5 bg-gray-200 self-center" />
            {Object.entries(CHILD_EVENT_LABELS).map(([key, label]) => {
              const used = childEvents.some(ev => ev.event_type === key);
              if (!used) return null;
              return (
                <div key={key} className="flex items-center gap-1.5 text-xs text-gray-600 bg-white border border-gray-200 rounded-lg px-3 py-1.5">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: CHILD_EVENT_COLORS[key] }} />
                  {label}
                </div>
              );
            })}
          </>
        )}
      </div>

      {/* Calendar */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 fc-wrapper">
        <FullCalendar
          ref={calRef}
          plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin, listPlugin]}
          initialView="dayGridMonth"
          headerToolbar={{
            left:   "prev,next today",
            center: "title",
            right:  "dayGridMonth,timeGridWeek,timeGridDay,listWeek",
          }}
          buttonText={{
            today: "Today",
            month: "Month",
            week:  "Week",
            day:   "Day",
            list:  "Agenda",
          }}
          events={toFCEvents()}
          selectable
          dateClick={(info) => openCreate(info.dateStr)}
          eventClick={(info) => {
            const props = info.event.extendedProps;
            if (props._isChildEvent) {
              setChildPopup(props as ChildEventItem);
            } else {
              openEdit(props as CalEvent);
            }
          }}
          height="auto"
          dayMaxEvents={3}
          eventDisplay="block"
          eventTimeFormat={{ hour: "2-digit", minute: "2-digit", meridiem: "short" }}
        />
      </div>

      {/* EventModal for calendar_events */}
      {modalOpen && (
        <EventModal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          initialDate={selectedDate}
          editEvent={editEvent}
          myId={myId}
          onSaved={() => { fetchEvents(myId); setModalOpen(false); }}
          onDeleted={() => { fetchEvents(myId); setModalOpen(false); }}
        />
      )}

      {/* Child event detail popup */}
      {childPopup && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm"
          onClick={() => setChildPopup(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div
              className="px-5 py-4 flex items-center justify-between"
              style={{ backgroundColor: (CHILD_EVENT_COLORS[childPopup.event_type] ?? "#7C3AED") + "18" }}
            >
              <div className="flex items-center gap-2.5">
                <div
                  className="w-8 h-8 rounded-xl flex items-center justify-center"
                  style={{ backgroundColor: CHILD_EVENT_COLORS[childPopup.event_type] ?? "#7C3AED" }}
                >
                  {childPopup.event_type === "drawing_schedule"
                    ? <Palette size={15} className="text-white" />
                    : <CalendarDays size={15} className="text-white" />}
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-wide" style={{ color: CHILD_EVENT_COLORS[childPopup.event_type] ?? "#7C3AED" }}>
                    {CHILD_EVENT_LABELS[childPopup.event_type] ?? childPopup.event_type}
                  </p>
                  <p className="text-sm font-bold text-gray-900 leading-tight">{childPopup.title}</p>
                </div>
              </div>
              <button onClick={() => setChildPopup(null)} className="p-1 rounded-lg hover:bg-black/5 text-gray-400">
                <X size={16} />
              </button>
            </div>

            {/* Body */}
            <div className="px-5 py-4 space-y-3">
              <div className="flex items-center gap-2.5 text-sm text-gray-700">
                <User size={15} className="text-gray-400 flex-shrink-0" />
                <span className="font-medium">{childPopup.childName}</span>
              </div>
              <div className="flex items-center gap-2.5 text-sm text-gray-700">
                <CalendarDays size={15} className="text-gray-400 flex-shrink-0" />
                <span>
                  {new Date(childPopup.scheduled_at).toLocaleDateString("en-MY", {
                    weekday: "long", day: "numeric", month: "long", year: "numeric",
                  })}
                </span>
              </div>
              <div className="flex items-center gap-2.5 text-sm text-gray-700">
                <Clock size={15} className="text-gray-400 flex-shrink-0" />
                <span>
                  {new Date(childPopup.scheduled_at).toLocaleTimeString("en-MY", {
                    hour: "2-digit", minute: "2-digit",
                  })}
                </span>
              </div>
              {childPopup.description && (
                <div className="flex items-start gap-2.5 text-sm text-gray-700">
                  <FileText size={15} className="text-gray-400 flex-shrink-0 mt-0.5" />
                  <span className="leading-relaxed">{childPopup.description}</span>
                </div>
              )}

              {/* Parent status badge for drawing_schedule */}
              {childPopup.event_type === "drawing_schedule" && (() => {
                const badge = PARENT_STATUS_BADGE[childPopup.parent_status ?? "pending"];
                return (
                  <div className={`inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full ${badge.cls}`}>
                    {childPopup.parent_status === "accepted" && "✓ "}
                    {childPopup.parent_status === "rejected" && "✗ "}
                    {badge.label}
                  </div>
                );
              })()}
            </div>

            {/* Footer */}
            <div className="px-5 pb-5 flex flex-col gap-2">
              {/* Parent: accept/reject buttons for pending drawing sessions */}
              {myRole === "user" && childPopup.event_type === "drawing_schedule" && childPopup.parent_status === "pending" && (
                <div className="flex gap-2">
                  <button
                    onClick={() => respondToDrawingSession(childPopup.id, "rejected")}
                    disabled={updatingStatus}
                    className="flex-1 py-2.5 rounded-xl border-2 border-violet-600 text-violet-600 text-sm font-bold hover:bg-violet-50 transition-colors disabled:opacity-50"
                  >
                    Reject
                  </button>
                  <button
                    onClick={() => respondToDrawingSession(childPopup.id, "accepted")}
                    disabled={updatingStatus}
                    className="flex-1 py-2.5 rounded-xl bg-violet-600 text-white text-sm font-bold hover:bg-violet-700 transition-colors disabled:opacity-50"
                  >
                    Accept
                  </button>
                </div>
              )}

              {/* Therapist: link to child progress page */}
              {myRole === "therapist" && (
                <button
                  onClick={() => { setChildPopup(null); navigate(`/dashboard/children/${childPopup.child_id}`); }}
                  className="w-full py-2.5 rounded-xl bg-gray-900 text-white text-sm font-bold hover:bg-gray-800 transition-colors"
                >
                  View Child Progress
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
