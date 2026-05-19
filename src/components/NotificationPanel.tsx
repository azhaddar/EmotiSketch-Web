import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import { Bell, MessageSquare, PenLine, AlertCircle, UserCheck, CalendarDays } from "lucide-react";

interface NotifItem {
  id: string;
  type: "message" | "drawing" | "profile" | "assigned" | "calendar_event";
  title: string;
  desc: string;
  time: string;
  isNew: boolean;
  link?: string;
}

const TYPE_CONFIG = {
  message:        { icon: MessageSquare, color: "text-[#e13d7d]", bg: "bg-pink-100"   },
  drawing:        { icon: PenLine,       color: "text-purple-600", bg: "bg-purple-100" },
  profile:        { icon: AlertCircle,   color: "text-amber-600",  bg: "bg-amber-100"  },
  assigned:       { icon: UserCheck,     color: "text-green-600",  bg: "bg-green-100"  },
  calendar_event: { icon: CalendarDays,  color: "text-blue-600",   bg: "bg-blue-100"   },
};

function relativeTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1)  return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)  return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

interface Props {
  open: boolean;
  onClose: () => void;
  onCountChange: (n: number) => void;
}

export default function NotificationPanel({ open, onClose, onCountChange }: Props) {
  const navigate = useNavigate();
  const [myId, setMyId]     = useState("");
  const [myRole, setMyRole] = useState("");
  const [items, setItems]   = useState<NotifItem[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      setMyId(user.id);
      supabase.from("profiles").select("role").eq("id", user.id).single()
        .then(({ data }) => setMyRole((data?.role ?? "").toLowerCase()));
    });
  }, []);

  // Fetch on mount once user is known, and re-fetch each time panel opens
  useEffect(() => {
    if (myId && myRole) fetchNotifications();
  }, [myId, myRole]);

  useEffect(() => {
    if (open && myId && myRole) fetchNotifications();
  }, [open]);

  async function fetchNotifications() {
    setLoading(true);
    const notifs: NotifItem[] = [];
    const seenIds = new Set<string>(JSON.parse(localStorage.getItem("notif_seen_ids") ?? "[]"));

    // ── 1. Unread chat messages (all roles) ─────────────────────────────────
    const { data: msgs } = await supabase
      .from("messages")
      .select("id, content, created_at, sender_id")
      .eq("receiver_id", myId)
      .is("read_at", null)
      .order("created_at", { ascending: false })
      .limit(10);

    if (msgs?.length) {
      const senderIds = [...new Set(msgs.map(m => m.sender_id))];
      const { data: senders } = await supabase
        .from("profiles").select("id, full_name").in("id", senderIds);
      const sMap: Record<string, string> = {};
      (senders ?? []).forEach(s => { sMap[s.id] = s.full_name; });

      const seen = new Set<string>();
      for (const msg of msgs) {
        if (seen.has(msg.sender_id)) continue;
        seen.add(msg.sender_id);
        const senderMsgs = msgs.filter(m => m.sender_id === msg.sender_id);
        notifs.push({
          id: `msg-${msg.sender_id}`,
          type: "message",
          title: `New message from ${sMap[msg.sender_id] ?? "Someone"}`,
          desc: senderMsgs.length > 1
            ? `${senderMsgs.length} unread messages`
            : (msg.content.length > 55 ? msg.content.slice(0, 55) + "…" : msg.content),
          time: msg.created_at,
          isNew: !seenIds.has(`msg-${msg.sender_id}`),
        });
      }
    }

    // ── 2. New drawings submitted — for assigned therapist ──────────────────
    if (myRole === "therapist") {
      const since7d = new Date(Date.now() - 7 * 24 * 3600000).toISOString();

      const { data: patients } = await supabase
        .from("patients").select("id, full_name").eq("therapist_id", myId);

      if (patients?.length) {
        const pMap: Record<string, string> = {};
        patients.forEach(p => { pMap[p.id] = p.full_name; });

        const { data: sketches } = await supabase
          .from("sketches")
          .select("id, emotion, created_at, patient_id")
          .in("patient_id", patients.map(p => p.id))
          .gte("created_at", since7d)
          .order("created_at", { ascending: false })
          .limit(15);

        for (const s of sketches ?? []) {
          const emo = s.emotion.charAt(0).toUpperCase() + s.emotion.slice(1);
          notifs.push({
            id: `sketch-${s.id}`,
            type: "drawing",
            title: `${pMap[s.patient_id] ?? "A child"} submitted a drawing`,
            desc: `Detected emotion: ${emo}`,
            time: s.created_at,
            isNew: !seenIds.has(`sketch-${s.id}`),
            link: `/dashboard/children`,
          });
        }
      }

      // ── 3. Incomplete therapist profile ────────────────────────────────────
      const { data: tp } = await supabase
        .from("therapist_profiles")
        .select("professional_title, license_number")
        .eq("id", myId)
        .maybeSingle();

      if (!tp || !tp.professional_title || !tp.license_number) {
        notifs.push({
          id: "profile-incomplete",
          type: "profile",
          title: "Complete your therapist profile",
          desc: "Add your qualifications to build trust with parents.",
          time: new Date(0).toISOString(),
          isNew: !seenIds.has("profile-incomplete"),
          link: `/dashboard/therapists/${myId}`,
        });
      }
    }

    // ── 3. Incomplete profiles — for admin ──────────────────────────────────
    if (myRole === "admin") {
      const { data: therapists } = await supabase
        .from("profiles").select("id").eq("role", "therapist");

      if (therapists?.length) {
        const ids = therapists.map(t => t.id);
        const { data: tps } = await supabase
          .from("therapist_profiles")
          .select("id, professional_title, license_number")
          .in("id", ids);
        const complete = new Set(
          (tps ?? []).filter(tp => tp.professional_title && tp.license_number).map(tp => tp.id)
        );
        const count = therapists.filter(t => !complete.has(t.id)).length;
        if (count > 0) {
          notifs.push({
            id: "admin-incomplete",
            type: "profile",
            title: `${count} therapist${count > 1 ? "s" : ""} with incomplete profiles`,
            desc: "Remind therapists to fill in their qualifications.",
            time: new Date(0).toISOString(),
            isNew: !seenIds.has("admin-incomplete"),
            link: `/dashboard/therapists`,
          });
        }
      }
    }

    // ── 4. Therapist assigned to child — for parent ─────────────────────────
    if (myRole === "user") {
      const since7d = new Date(Date.now() - 7 * 24 * 3600000).toISOString();

      const { data: patients } = await supabase
        .from("patients")
        .select("id, full_name, therapist_id, updated_at")
        .eq("guardian_id", myId)
        .not("therapist_id", "is", null)
        .gte("updated_at", since7d);

      if (patients?.length) {
        const therapistIds = [...new Set(patients.map(p => p.therapist_id).filter(Boolean))] as string[];
        const { data: therapists } = await supabase
          .from("profiles").select("id, full_name").in("id", therapistIds);
        const tMap: Record<string, string> = {};
        (therapists ?? []).forEach(t => { tMap[t.id] = t.full_name; });

        for (const p of patients) {
          if (!p.therapist_id) continue;
          notifs.push({
            id: `assigned-${p.id}`,
            type: "assigned",
            title: `Therapist assigned to ${p.full_name}`,
            desc: `${tMap[p.therapist_id] ?? "A therapist"} is now handling your child's sessions.`,
            time: p.updated_at,
            isNew: !seenIds.has(`assigned-${p.id}`),
            link: `/dashboard/children/${p.id}`,
          });
        }
      }
    }

    // ── 5. Calendar event reminders (today + tomorrow) ─────────────────────
    const now2       = new Date();
    const in48h      = new Date(now2.getTime() + 48 * 3600 * 1000).toISOString();

    const { data: ownEvts } = await supabase
      .from("calendar_events")
      .select("id, title, start_at, all_day, type")
      .eq("created_by", myId)
      .gte("start_at", now2.toISOString())
      .lte("start_at", in48h)
      .order("start_at");

    const { data: invEvts } = await supabase
      .from("event_invitations")
      .select("event_id, calendar_events(id, title, start_at, all_day, type)")
      .eq("invitee_id", myId)
      .neq("status", "declined");

    const invitedUpcoming = (invEvts ?? [])
      .map((inv: any) => inv.calendar_events)
      .filter(Boolean)
      .filter((e: any) => e.start_at >= now2.toISOString() && e.start_at <= in48h);

    const allUpcoming = [...(ownEvts ?? []), ...invitedUpcoming];
    const seenEvt     = new Set<string>();

    for (const evt of allUpcoming) {
      if (seenEvt.has(evt.id)) continue;
      seenEvt.add(evt.id);
      const evtDate = new Date(evt.start_at);
      const isToday = evtDate.toDateString() === now2.toDateString();
      const timeStr = evt.all_day
        ? "All day"
        : evtDate.toLocaleTimeString("en-MY", { hour: "2-digit", minute: "2-digit" });

      notifs.unshift({
        id:    `event-${evt.id}`,
        type:  "calendar_event",
        title: isToday ? `Today: ${evt.title}` : `Tomorrow: ${evt.title}`,
        desc:  timeStr,
        time:  evt.start_at,
        isNew: !seenIds.has(`event-${evt.id}`),
        link:  "/dashboard/calendar",
      });
    }

    // Sort newest first, keep profile reminders at bottom
    notifs.sort((a, b) => {
      if (a.id.startsWith("profile") || a.id.startsWith("admin")) return 1;
      if (b.id.startsWith("profile") || b.id.startsWith("admin")) return -1;
      return b.time.localeCompare(a.time);
    });

    setItems(notifs);
    onCountChange(notifs.filter(n => n.isNew).length);
    setLoading(false);
  }

  function markOneRead(id: string) {
    const stored = new Set<string>(JSON.parse(localStorage.getItem("notif_seen_ids") ?? "[]"));
    stored.add(id);
    localStorage.setItem("notif_seen_ids", JSON.stringify([...stored]));
    setItems(prev => {
      const updated = prev.map(n => n.id === id ? { ...n, isNew: false } : n);
      onCountChange(updated.filter(n => n.isNew).length);
      return updated;
    });
  }

  function markAllRead() {
    const stored = new Set<string>(JSON.parse(localStorage.getItem("notif_seen_ids") ?? "[]"));
    items.forEach(n => stored.add(n.id));
    localStorage.setItem("notif_seen_ids", JSON.stringify([...stored]));
    setItems(prev => prev.map(n => ({ ...n, isNew: false })));
    onCountChange(0);
  }

  if (!open) return null;

  return (
    <div className="absolute top-14 right-0 w-80 bg-white rounded-2xl shadow-2xl border border-gray-200 z-50 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-gradient-to-r from-pink-50 to-purple-50">
        <p className="font-bold text-gray-900">Notifications</p>
        {items.some(n => n.isNew) && (
          <button onClick={markAllRead}
            className="text-xs text-[#e13d7d] font-semibold hover:underline">
            Mark all read
          </button>
        )}
      </div>

      {/* Body */}
      {loading ? (
        <div className="flex items-center justify-center py-10">
          <div className="animate-spin rounded-full h-7 w-7 border-b-2 border-pink-400" />
        </div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
          <Bell size={32} className="text-gray-300 mb-3" />
          <p className="text-sm font-medium text-gray-500">No notifications</p>
          <p className="text-xs text-gray-400 mt-1">You're all caught up!</p>
        </div>
      ) : (
        <div className="divide-y divide-gray-50 max-h-96 overflow-y-auto">
          {items.map(item => {
            const cfg = TYPE_CONFIG[item.type];
            const Icon = cfg.icon;
            return (
              <button
                key={item.id}
                onClick={() => { markOneRead(item.id); if (item.link) { navigate(item.link); onClose(); } }}
                className={`w-full flex items-start gap-3 px-4 py-3 transition-colors text-left ${
                  item.link ? "hover:bg-gray-50 cursor-pointer" : "cursor-default"
                }`}
              >
                <div className={`w-9 h-9 rounded-xl ${cfg.bg} flex items-center justify-center flex-shrink-0 mt-0.5`}>
                  <Icon size={16} className={cfg.color} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-semibold leading-snug ${item.isNew ? "text-gray-900" : "text-gray-500"}`}>
                    {item.title}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5 line-clamp-2">{item.desc}</p>
                  {item.time > new Date(1000).toISOString() && (
                    <p className="text-[10px] text-gray-300 mt-1">{relativeTime(item.time)}</p>
                  )}
                </div>
                {item.isNew && (
                  <div className="w-2 h-2 rounded-full bg-[#e13d7d] flex-shrink-0 mt-2" />
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
