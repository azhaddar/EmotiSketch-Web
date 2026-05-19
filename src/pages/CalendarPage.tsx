import { useState, useEffect, useRef } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import listPlugin from "@fullcalendar/list";
import { supabase } from "../lib/supabaseClient";
import { Plus } from "lucide-react";
import EventModal from "../components/EventModal";
import { EVENT_TYPES, CalEvent } from "../lib/calendarTypes";

export default function CalendarPage() {
  const calRef = useRef<InstanceType<typeof FullCalendar>>(null);
  const [events, setEvents] = useState<CalEvent[]>([]);
  const [myId, setMyId] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [editEvent, setEditEvent] = useState<CalEvent | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) { setMyId(user.id); fetchEvents(user.id); }
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

  function toFCEvents() {
    return events.map(e => ({
      id: e.id,
      title: e.title,
      start: e.start_at,
      end: e.end_at,
      allDay: e.all_day,
      backgroundColor: EVENT_TYPES[e.type]?.color ?? e.color ?? "#e13d7d",
      borderColor: EVENT_TYPES[e.type]?.color ?? e.color ?? "#e13d7d",
      extendedProps: e,
    }));
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
      </div>

      {/* Calendar */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 fc-wrapper">
        <FullCalendar
          ref={calRef}
          plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin, listPlugin]}
          initialView="dayGridMonth"
          headerToolbar={{
            left: "prev,next today",
            center: "title",
            right: "dayGridMonth,timeGridWeek,timeGridDay,listWeek",
          }}
          buttonText={{
            today: "Today",
            month: "Month",
            week: "Week",
            day: "Day",
            list: "Agenda",
          }}
          events={toFCEvents()}
          selectable
          dateClick={(info) => openCreate(info.dateStr)}
          eventClick={(info) => openEdit(info.event.extendedProps as CalEvent)}
          height="auto"
          dayMaxEvents={3}
          eventDisplay="block"
          eventTimeFormat={{ hour: "2-digit", minute: "2-digit", meridiem: "short" }}
        />
      </div>

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
    </div>
  );
}
