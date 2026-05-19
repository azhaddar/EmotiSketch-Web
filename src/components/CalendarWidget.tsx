import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import { ChevronLeft, ChevronRight, Plus, ExternalLink } from "lucide-react";
import { EVENT_TYPES, CalEvent } from "../lib/calendarTypes";
import EventModal from "./EventModal";

const DAYS   = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];

export default function CalendarWidget() {
  const navigate = useNavigate();
  const today    = new Date();

  const [current,    setCurrent]    = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [events,     setEvents]     = useState<CalEvent[]>([]);
  const [myId,       setMyId]       = useState("");
  const [selected,   setSelected]   = useState<Date>(today);
  const [modalOpen,  setModalOpen]  = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) { setMyId(user.id); fetchEvents(user.id); }
    });
  }, []);

  useEffect(() => {
    if (myId) fetchEvents(myId);
  }, [current, myId]);

  async function fetchEvents(uid: string) {
    const y = current.getFullYear();
    const m = current.getMonth();
    const monthStart = new Date(y, m, 1).toISOString();
    const monthEnd   = new Date(y, m + 1, 0, 23, 59, 59).toISOString();

    const { data: own } = await supabase
      .from("calendar_events").select("*")
      .eq("created_by", uid)
      .gte("start_at", monthStart).lte("start_at", monthEnd);

    const { data: invs } = await supabase
      .from("event_invitations")
      .select("event_id, calendar_events(*)")
      .eq("invitee_id", uid).neq("status", "declined");

    const invited = (invs ?? [])
      .map((inv: any) => inv.calendar_events).filter(Boolean)
      .filter((e: CalEvent) => e.start_at >= monthStart && e.start_at <= monthEnd);

    const all  = [...(own ?? []), ...invited];
    const seen = new Set<string>();
    setEvents(all.filter(e => { if (seen.has(e.id)) return false; seen.add(e.id); return true; }));
  }

  const year     = current.getFullYear();
  const month    = current.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const lastDay  = new Date(year, month + 1, 0).getDate();

  const cells: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: lastDay }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  function eventsOn(day: number): CalEvent[] {
    return events.filter(e => {
      const d = new Date(e.start_at);
      return d.getFullYear() === year && d.getMonth() === month && d.getDate() === day;
    });
  }

  const isToday    = (d: number) => d === today.getDate()    && month === today.getMonth()    && year === today.getFullYear();
  const isSelected = (d: number) => d === selected.getDate() && month === selected.getMonth() && year === selected.getFullYear();

  const selectedEvents = (month === selected.getMonth() && year === selected.getFullYear())
    ? eventsOn(selected.getDate())
    : [];

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-5 pb-2">
        <h2 className="text-base font-bold text-gray-900">Calendar</h2>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setModalOpen(true)}
            title="New event"
            className="p-1.5 text-[#e13d7d] hover:bg-pink-50 rounded-lg transition-colors"
          >
            <Plus size={16} />
          </button>
          <button
            onClick={() => navigate("/dashboard/calendar")}
            title="Open full calendar"
            className="p-1.5 text-gray-400 hover:bg-gray-50 rounded-lg transition-colors"
          >
            <ExternalLink size={14} />
          </button>
        </div>
      </div>

      {/* Month navigation */}
      <div className="flex items-center justify-between px-5 pb-3">
        <button onClick={() => setCurrent(new Date(year, month - 1, 1))} className="p-1 hover:bg-gray-100 rounded-lg transition-colors">
          <ChevronLeft size={14} className="text-gray-500" />
        </button>
        <span className="text-sm font-semibold text-gray-700">{MONTHS[month]} {year}</span>
        <button onClick={() => setCurrent(new Date(year, month + 1, 1))} className="p-1 hover:bg-gray-100 rounded-lg transition-colors">
          <ChevronRight size={14} className="text-gray-500" />
        </button>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 px-3 mb-1">
        {DAYS.map(d => (
          <div key={d} className="text-center text-[10px] font-bold text-gray-400 py-1">{d}</div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 px-3 pb-3 gap-y-1">
        {cells.map((day, i) => {
          if (!day) return <div key={i} />;
          const dayEvents = eventsOn(day);
          const sel  = isSelected(day);
          const tod  = isToday(day);
          return (
            <button
              key={i}
              onClick={() => setSelected(new Date(year, month, day))}
              className={`flex flex-col items-center py-1 rounded-lg transition-all ${
                sel ? "bg-[#e13d7d]" : tod ? "bg-pink-50" : "hover:bg-gray-50"
              }`}
            >
              <span className={`text-xs font-semibold leading-5 ${
                sel ? "text-white" : tod ? "text-[#e13d7d]" : "text-gray-700"
              }`}>
                {day}
              </span>
              {dayEvents.length > 0 && (
                <div className="flex gap-0.5 mt-0.5">
                  {dayEvents.slice(0, 3).map((e, j) => (
                    <div
                      key={j}
                      className="w-1 h-1 rounded-full"
                      style={{ backgroundColor: sel ? "rgba(255,255,255,0.8)" : (EVENT_TYPES[e.type]?.color ?? "#e13d7d") }}
                    />
                  ))}
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Selected day event list */}
      <div className="border-t border-gray-100 px-5 py-3">
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-2">
          {selected.toLocaleDateString("en-MY", { weekday: "long", day: "numeric", month: "short" })}
        </p>
        {selectedEvents.length === 0 ? (
          <p className="text-xs text-gray-400">No events</p>
        ) : (
          <div className="space-y-2">
            {selectedEvents.map(e => (
              <div
                key={e.id}
                onClick={() => navigate("/dashboard/calendar")}
                className="flex items-center gap-2 cursor-pointer group"
              >
                <div
                  className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                  style={{ backgroundColor: EVENT_TYPES[e.type]?.color ?? "#e13d7d" }}
                />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold text-gray-800 truncate group-hover:text-[#e13d7d] transition-colors">{e.title}</p>
                  {!e.all_day && (
                    <p className="text-[10px] text-gray-400">
                      {new Date(e.start_at).toLocaleTimeString("en-MY", { hour: "2-digit", minute: "2-digit" })}
                    </p>
                  )}
                </div>
                <div
                  className="text-[9px] font-bold px-1.5 py-0.5 rounded text-white flex-shrink-0"
                  style={{ backgroundColor: EVENT_TYPES[e.type]?.color ?? "#e13d7d" }}
                >
                  {EVENT_TYPES[e.type]?.label ?? e.type}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {modalOpen && myId && (
        <EventModal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          initialDate={selected.toISOString().split("T")[0]}
          editEvent={null}
          myId={myId}
          onSaved={() => { fetchEvents(myId); setModalOpen(false); }}
          onDeleted={() => { fetchEvents(myId); setModalOpen(false); }}
        />
      )}
    </div>
  );
}
