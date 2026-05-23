import { useState, useEffect } from "react";
import { supabase } from "../lib/supabaseClient";
import { X, Search, UserPlus, Trash2, MapPin, FileText, Check } from "lucide-react";
import { EVENT_TYPES, CalEvent, Guest } from "../lib/calendarTypes";

const STATUS_STYLE: Record<string, string> = {
  pending:  "bg-yellow-50 text-yellow-700 border-yellow-200",
  accepted: "bg-green-50  text-green-700  border-green-200",
  declined: "bg-red-50    text-red-700    border-red-200",
};

interface Props {
  open: boolean;
  onClose: () => void;
  initialDate: string | null;
  editEvent: CalEvent | null;
  myId: string;
  onSaved: () => void;
  onDeleted: () => void;
}

export default function EventModal({ open, onClose, initialDate, editEvent, myId, onSaved, onDeleted }: Props) {
  const isEdit  = !!editEvent;
  const isOwner = !editEvent || editEvent.created_by === myId;

  const baseDate  = initialDate ?? new Date().toISOString().split("T")[0];
  const baseStart = editEvent ? editEvent.start_at.slice(0, 16) : `${baseDate}T09:00`;
  const baseEnd   = editEvent ? editEvent.end_at.slice(0, 16)   : `${baseDate}T10:00`;

  const [title,       setTitle]       = useState(editEvent?.title       ?? "");
  const [description, setDescription] = useState(editEvent?.description ?? "");
  const [type,        setType]        = useState(editEvent?.type        ?? "general");
  const [startAt,     setStartAt]     = useState(baseStart);
  const [endAt,       setEndAt]       = useState(baseEnd);
  const [allDay,      setAllDay]      = useState(editEvent?.all_day     ?? false);
  const [location,    setLocation]    = useState(editEvent?.location    ?? "");

  const [guestSearch,    setGuestSearch]    = useState("");
  const [searchResults,  setSearchResults]  = useState<Guest[]>([]);
  const [guests,         setGuests]         = useState<Guest[]>([]);

  const [myStatus, setMyStatus] = useState<string | null>(null);

  const [saving,   setSaving]   = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error,    setError]    = useState("");

  const color = EVENT_TYPES[type]?.color ?? "#e13d7d";

  useEffect(() => {
    if (isEdit && editEvent) fetchGuests(editEvent.id);
  }, [editEvent]);

  async function fetchGuests(eventId: string) {
    const { data } = await supabase
      .from("event_invitations")
      .select("invitee_id, status, profiles:invitee_id(full_name, email, role)")
      .eq("event_id", eventId);

    const list = (data ?? []).map((inv: any) => ({
      id:        inv.invitee_id,
      full_name: inv.profiles?.full_name ?? "",
      email:     inv.profiles?.email     ?? "",
      role:      inv.profiles?.role      ?? "",
      status:    inv.status,
    }));
    setGuests(list);
    setMyStatus(list.find(g => g.id === myId)?.status ?? null);
  }

  useEffect(() => {
    const t = setTimeout(async () => {
      if (guestSearch.trim().length < 2) { setSearchResults([]); return; }
      const { data } = await supabase
        .from("profiles")
        .select("id, full_name, email, role")
        .ilike("full_name", `%${guestSearch}%`)
        .neq("id", myId)
        .limit(6);
      setSearchResults((data ?? []).filter(u => !guests.find(g => g.id === u.id)));
    }, 300);
    return () => clearTimeout(t);
  }, [guestSearch, guests, myId]);

  function addGuest(user: Guest) {
    setGuests(prev => [...prev, { ...user, status: "pending" }]);
    setGuestSearch("");
    setSearchResults([]);
  }

  function removeGuest(id: string) {
    setGuests(prev => prev.filter(g => g.id !== id));
  }

  async function handleSave() {
    if (!title.trim()) { setError("Title is required."); return; }
    if (new Date(endAt) <= new Date(startAt)) { setError("End must be after start."); return; }
    setSaving(true);
    setError("");

    const payload = {
      title:       title.trim(),
      description: description || null,
      type,
      color,
      start_at:    allDay ? `${startAt.split("T")[0]}T00:00:00` : new Date(startAt).toISOString(),
      end_at:      allDay ? `${endAt.split("T")[0]}T23:59:59`   : new Date(endAt).toISOString(),
      all_day:     allDay,
      location:    location || null,
      created_by:  myId,
    };

    let eventId = editEvent?.id;

    if (isEdit && eventId) {
      const { error: err } = await supabase.from("calendar_events").update(payload).eq("id", eventId);
      if (err) { setError(err.message); setSaving(false); return; }
    } else {
      const { data, error: err } = await supabase.from("calendar_events").insert(payload).select("id").single();
      if (err || !data) { setError(err?.message ?? "Failed to save."); setSaving(false); return; }
      eventId = data.id;
    }

    if (eventId) {
      if (isEdit) {
        const { data: existing } = await supabase
          .from("event_invitations").select("invitee_id").eq("event_id", eventId);
        const existingIds = new Set((existing ?? []).map((e: any) => e.invitee_id));
        const newIds      = new Set(guests.map(g => g.id));
        const toRemove    = [...existingIds].filter(id => !newIds.has(id));
        const toAdd       = guests.filter(g => !existingIds.has(g.id));
        if (toRemove.length)
          await supabase.from("event_invitations").delete().eq("event_id", eventId).in("invitee_id", toRemove);
        if (toAdd.length)
          await supabase.from("event_invitations").insert(toAdd.map(g => ({ event_id: eventId, invitee_id: g.id, status: "pending" })));
      } else if (guests.length) {
        await supabase.from("event_invitations").insert(
          guests.map(g => ({ event_id: eventId, invitee_id: g.id, status: "pending" }))
        );
      }
    }

    setSaving(false);
    onSaved();
  }

  async function handleDelete() {
    if (!editEvent || !window.confirm("Delete this event? This cannot be undone.")) return;
    setDeleting(true);
    await supabase.from("calendar_events").delete().eq("id", editEvent.id);
    setDeleting(false);
    onDeleted();
  }

  async function respondInvite(status: "accepted" | "declined") {
    if (!editEvent) return;
    await supabase.from("event_invitations")
      .update({ status, responded_at: new Date().toISOString() })
      .eq("event_id", editEvent.id)
      .eq("invitee_id", myId);

    // Update local state immediately so buttons hide without waiting for re-fetch
    setMyStatus(status);
    setGuests(prev => prev.map(g => g.id === myId ? { ...g, status } : g));

    // Push-notify the event creator on their mobile app
    try {
      const [{ data: me }, { data: evt }] = await Promise.all([
        supabase.from("profiles").select("full_name").eq("id", myId).single(),
        supabase.from("calendar_events").select("created_by, title").eq("id", editEvent.id).single(),
      ]);
      if (evt?.created_by) {
        const { data: creator } = await supabase
          .from("profiles").select("expo_push_token").eq("id", evt.created_by).single();
        const token = (creator as any)?.expo_push_token as string | null;
        if (token) {
          await fetch("https://exp.host/--/api/v2/push/send", {
            method: "POST",
            headers: { "Content-Type": "application/json", "Accept": "application/json" },
            body: JSON.stringify({
              to:    token,
              title: `${(me as any)?.full_name ?? "Someone"} ${status} your invitation`,
              body:  evt.title,
              data:  { screen: "calendar", selectedDate: editEvent.start_at.split("T")[0] },
              sound: "default",
            }),
          });
        }
      }
    } catch {}

    onSaved();
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white z-10">
          <div className="flex items-center gap-2.5">
            <div className="w-3.5 h-3.5 rounded-full" style={{ backgroundColor: color }} />
            <h2 className="text-lg font-bold text-gray-900">
              {isEdit ? (isOwner ? "Edit Event" : "Event Details") : "New Event"}
            </h2>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
            <X size={18} className="text-gray-500" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-2.5">{error}</p>
          )}

          {/* Title */}
          <div>
            <label className="text-xs font-bold text-gray-400 uppercase tracking-wide">Title *</label>
            <input
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="e.g. Therapy Session with Mita"
              disabled={!isOwner}
              className="w-full mt-1.5 px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-pink-400 disabled:bg-gray-50 disabled:text-gray-500"
            />
          </div>

          {/* Category / color coding */}
          <div>
            <label className="text-xs font-bold text-gray-400 uppercase tracking-wide">Category</label>
            <div className="flex flex-wrap gap-2 mt-2">
              {Object.entries(EVENT_TYPES).map(([key, val]) => (
                <button
                  key={key}
                  disabled={!isOwner}
                  onClick={() => setType(key)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all disabled:opacity-60 ${
                    type === key ? "text-white border-transparent shadow-sm" : "bg-white text-gray-600 border-gray-200 hover:border-gray-300"
                  }`}
                  style={type === key ? { backgroundColor: val.color, borderColor: val.color } : {}}
                >
                  <div
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: type === key ? "rgba(255,255,255,0.8)" : val.color }}
                  />
                  {val.label}
                </button>
              ))}
            </div>
          </div>

          {/* All day */}
          <div className="flex items-center gap-3">
            <button
              disabled={!isOwner}
              onClick={() => setAllDay(!allDay)}
              className={`relative w-10 h-5 rounded-full transition-colors disabled:opacity-60 ${allDay ? "bg-[#e13d7d]" : "bg-gray-200"}`}
            >
              <div className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${allDay ? "translate-x-5" : ""}`} />
            </button>
            <span className="text-sm text-gray-600 font-medium">All day event</span>
          </div>

          {/* Start / End */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wide">Start</label>
              <input
                type={allDay ? "date" : "datetime-local"}
                value={allDay ? startAt.split("T")[0] : startAt}
                onChange={e => setStartAt(e.target.value)}
                disabled={!isOwner}
                className="w-full mt-1.5 px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-pink-400 disabled:bg-gray-50"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wide">End</label>
              <input
                type={allDay ? "date" : "datetime-local"}
                value={allDay ? endAt.split("T")[0] : endAt}
                onChange={e => setEndAt(e.target.value)}
                disabled={!isOwner}
                className="w-full mt-1.5 px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-pink-400 disabled:bg-gray-50"
              />
            </div>
          </div>

          {/* Location */}
          <div>
            <label className="text-xs font-bold text-gray-400 uppercase tracking-wide flex items-center gap-1.5">
              <MapPin size={11} /> Location
            </label>
            <input
              value={location}
              onChange={e => setLocation(e.target.value)}
              placeholder="e.g. Room 3, Clinic Building A"
              disabled={!isOwner}
              className="w-full mt-1.5 px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-pink-400 disabled:bg-gray-50"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="text-xs font-bold text-gray-400 uppercase tracking-wide flex items-center gap-1.5">
              <FileText size={11} /> Notes
            </label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Optional agenda or notes..."
              rows={2}
              disabled={!isOwner}
              className="w-full mt-1.5 px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-pink-400 resize-none disabled:bg-gray-50"
            />
          </div>

          {/* Guest invitation (owner only) */}
          {isOwner && (
            <div>
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wide flex items-center gap-1.5">
                <UserPlus size={11} /> Invite Guests
              </label>
              <div className="relative mt-1.5">
                <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                <input
                  value={guestSearch}
                  onChange={e => setGuestSearch(e.target.value)}
                  placeholder="Search therapist or parent by name..."
                  className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-pink-400"
                />
                {searchResults.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1.5 bg-white border border-gray-200 rounded-xl shadow-xl z-20 overflow-hidden">
                    {searchResults.map(u => (
                      <button
                        key={u.id}
                        onClick={() => addGuest(u)}
                        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 text-left transition-colors"
                      >
                        <div className="w-8 h-8 rounded-full bg-pink-100 flex items-center justify-center text-[#e13d7d] font-bold text-xs flex-shrink-0">
                          {u.full_name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-gray-900">{u.full_name}</p>
                          <p className="text-xs text-gray-400 capitalize">{u.role}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {guests.length > 0 && (
                <div className="mt-2 space-y-2">
                  {guests.map(g => (
                    <div key={g.id} className="flex items-center gap-3 px-3 py-2.5 bg-gray-50 rounded-xl">
                      <div className="w-8 h-8 rounded-full bg-pink-100 flex items-center justify-center text-[#e13d7d] font-bold text-xs flex-shrink-0">
                        {g.full_name.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-900 truncate">{g.full_name}</p>
                        <p className="text-xs text-gray-400 capitalize">{g.role}</p>
                      </div>
                      {g.status && (
                        <span className={`text-[10px] px-2 py-0.5 rounded-full border font-bold ${STATUS_STYLE[g.status]}`}>
                          {g.status}
                        </span>
                      )}
                      <button onClick={() => removeGuest(g.id)} className="p-1 hover:bg-gray-200 rounded-lg transition-colors">
                        <X size={12} className="text-gray-500" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Read-only guests for non-owner */}
          {!isOwner && guests.length > 0 && (
            <div>
              <label className="text-xs font-bold text-gray-400 uppercase tracking-wide">Guests</label>
              <div className="mt-2 space-y-2">
                {guests.map(g => (
                  <div key={g.id} className="flex items-center gap-3 px-3 py-2.5 bg-gray-50 rounded-xl">
                    <div className="w-8 h-8 rounded-full bg-pink-100 flex items-center justify-center text-[#e13d7d] font-bold text-xs flex-shrink-0">
                      {g.full_name.charAt(0).toUpperCase()}
                    </div>
                    <p className="text-sm font-semibold text-gray-900 flex-1 truncate">{g.full_name}</p>
                    {g.status && (
                      <span className={`text-[10px] px-2 py-0.5 rounded-full border font-bold ${STATUS_STYLE[g.status]}`}>
                        {g.status}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 flex items-center gap-3 sticky bottom-0 bg-white">
          {isEdit && isOwner && (
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="flex items-center gap-1.5 px-3 py-2 text-red-500 hover:bg-red-50 rounded-xl text-sm font-semibold transition-colors"
            >
              <Trash2 size={14} /> {deleting ? "Deleting…" : "Delete"}
            </button>
          )}

          {/* Invite response — non-owner */}
          {isEdit && !isOwner && (
            myStatus === "accepted" || myStatus === "declined" ? (
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-gray-50 border border-gray-200">
                {myStatus === "accepted"
                  ? <><Check size={14} className="text-green-500 flex-shrink-0" /><span className="text-sm font-semibold text-green-700">You accepted</span></>
                  : <><X    size={14} className="text-red-400  flex-shrink-0" /><span className="text-sm font-semibold text-red-600">You declined</span></>
                }
                <button
                  onClick={() => respondInvite(myStatus === "accepted" ? "declined" : "accepted")}
                  className="ml-1 text-xs text-gray-400 hover:text-gray-600 underline"
                >
                  Change
                </button>
              </div>
            ) : (
              <div className="flex gap-2">
                <button
                  onClick={() => respondInvite("accepted")}
                  className="px-4 py-2 bg-green-500 text-white text-sm font-semibold rounded-xl hover:bg-green-600 transition-colors"
                >
                  Accept
                </button>
                <button
                  onClick={() => respondInvite("declined")}
                  className="px-4 py-2 bg-gray-100 text-gray-600 text-sm font-semibold rounded-xl hover:bg-gray-200 transition-colors"
                >
                  Decline
                </button>
              </div>
            )
          )}

          <div className="flex gap-2 ml-auto">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-600 text-sm font-medium hover:bg-gray-100 rounded-xl transition-colors"
            >
              Cancel
            </button>
            {isOwner && (
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-5 py-2 bg-[#e13d7d] text-white text-sm font-semibold rounded-xl hover:bg-pink-600 transition-colors disabled:opacity-60"
              >
                {saving ? "Saving…" : isEdit ? "Save Changes" : "Create Event"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
