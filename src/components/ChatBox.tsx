import { useEffect, useRef, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import {
  X, ChevronLeft, Send, MessageSquare, Paperclip,
  PenLine, BarChart2, TrendingUp, X as XIcon,
  AtSign, User, Users,
} from "lucide-react";

// ── Emotion config ──────────────────────────────────────────────────────────
const EMOTIONS: Record<string, { emoji: string; color: string; bar: string }> = {
  happy:   { emoji: "😊", color: "#f59e0b", bar: "bg-amber-400" },
  sad:     { emoji: "😢", color: "#3b82f6", bar: "bg-blue-400" },
  angry:   { emoji: "😠", color: "#ef4444", bar: "bg-red-400" },
  anxious: { emoji: "😰", color: "#a855f7", bar: "bg-purple-400" },
};
const EMOTION_ORDER = ["happy", "sad", "angry", "anxious"] as const;

function emojiFor(e?: string | null) { return EMOTIONS[e ?? ""]?.emoji ?? "🎨"; }

function computeScores(s: Record<string, unknown>): Record<string, number> | null {
  const sc = s.scores as Record<string, number> | null | undefined;
  if (!sc) return null;
  const h  = sc.happy   ?? 0;
  const sa = sc.sad     ?? 0;
  const an = sc.angry   ?? 0;
  const ax = sc.anxious ?? 0;
  if (h + sa + an + ax === 0) return null;
  const max = Math.max(h, sa, an, ax);
  const norm = (v: number) => max <= 1 ? Math.round(v * 100) : Math.round(v);
  return { happy: norm(h), sad: norm(sa), angry: norm(an), anxious: norm(ax) };
}

// ── Types ────────────────────────────────────────────────────────────────────
interface Attachment {
  type: "drawing" | "result" | "graph";
  id: string;
  title: string;
  imageUrl?: string | null;
  emotion?: string | null;
  date: string;
  patientName?: string;
  sessionNum?: number;
  scores?: Record<string, number> | null;
  timeline?: Array<{ emotion: string | null; date: string }>;
}

interface Contact {
  userId: string;
  name: string;
  professionalTitle: string;
  patientNames: string;
  patientIds: string[];
  patientIdMap: Record<string, string>;
  convId: string;
  lastMessage: string;
  lastAt: string;
  unread: number;
}

interface Message {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  created_at: string;
  read_at: string | null;
  attachment?: Attachment | null;
}

interface SketchRaw {
  id: string;
  image_url: string | null;
  emotion: string | null;
  scores?: Record<string, number> | null;
  happy?: number | null;
  sad?: number | null;
  angry?: number | null;
  anxious?: number | null;
  created_at: string;
  patient_id: string;
}

type PickerTab = "drawing" | "result" | "graph";

function makeConvId(therapistId: string, guardianId: string) {
  return `${therapistId}_${guardianId}`;
}

function timeLabel(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const diffH = (now.getTime() - d.getTime()) / 3600000;
  if (diffH < 24) return d.toLocaleTimeString("en-MY", { hour: "2-digit", minute: "2-digit" });
  return d.toLocaleDateString("en-MY", { day: "numeric", month: "short" });
}

function dateLabel(iso: string) {
  return new Date(iso).toLocaleDateString("en-MY", { day: "numeric", month: "short", year: "numeric" });
}

// ── Score bar (used in result attachment card) ───────────────────────────────
function ScoreBar({ label, emoji, pct, barClass }: { label: string; emoji: string; pct: number; barClass: string }) {
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="w-14 flex items-center gap-1 text-gray-700 font-medium flex-shrink-0">
        <span>{emoji}</span>
        <span className="capitalize truncate">{label}</span>
      </span>
      <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${barClass}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="w-8 text-right text-gray-500 flex-shrink-0">{pct}%</span>
    </div>
  );
}

// ── Props ────────────────────────────────────────────────────────────────────
interface Props {
  open: boolean;
  onClose: () => void;
  onUnreadChange: (count: number) => void;
}

export default function ChatBox({ open, onClose, onUnreadChange }: Props) {
  const [myId, setMyId]         = useState("");
  const [myRole, setMyRole]     = useState("");
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [active, setActive]     = useState<Contact | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput]       = useState("");
  const [sending, setSending]   = useState(false);
  const [loadingC, setLoadingC] = useState(false);
  const [loadingM, setLoadingM] = useState(false);

  // Picker
  const [showPicker, setShowPicker]               = useState(false);
  const [pickerTab, setPickerTab]                 = useState<PickerTab>("drawing");
  const [loadingPicker, setLoadingPicker]         = useState(false);
  const [pickerSketches, setPickerSketches]       = useState<SketchRaw[]>([]);
  const [pickerSessions, setPickerSessions]       = useState<(SketchRaw & { sessionNum: number })[]>([]);
  const [pickerTimeline, setPickerTimeline]       = useState<Record<string, SketchRaw[]>>({}); // patientId → sketches
  const [pendingAttachment, setPendingAttachment] = useState<Attachment | null>(null);

  const bottomRef    = useRef<HTMLDivElement>(null);
  const channelRef   = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const bgChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const inputRef     = useRef<HTMLInputElement>(null);

  // ── Init ────────────────────────────────────────────────────────────────────
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      setMyId(user.id);
      supabase.from("profiles").select("role").eq("id", user.id).single()
        .then(({ data }) => setMyRole((data?.role ?? "").toLowerCase()));
    });
  }, []);

  // ── Background unread badge ─────────────────────────────────────────────────
  useEffect(() => {
    if (!myId) return;
    async function fetchTotalUnread() {
      const { count } = await supabase
        .from("messages").select("id", { count: "exact", head: true })
        .eq("receiver_id", myId).is("read_at", null);
      onUnreadChange(count ?? 0);
    }
    fetchTotalUnread();
    bgChannelRef.current?.unsubscribe();
    bgChannelRef.current = supabase
      .channel("global-unread")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: `receiver_id=eq.${myId}` },
        () => { fetchTotalUnread(); })
      .subscribe();
    return () => { bgChannelRef.current?.unsubscribe(); };
  }, [myId]);

  useEffect(() => { if (open && myId && myRole) loadContacts(); }, [open, myId, myRole]);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);
  useEffect(() => { if (active) setTimeout(() => inputRef.current?.focus(), 100); }, [active]);
  useEffect(() => () => { channelRef.current?.unsubscribe(); }, []);
  useEffect(() => { if (!active) { setShowPicker(false); setPendingAttachment(null); } }, [active]);

  // ── Contacts ────────────────────────────────────────────────────────────────
  async function loadContacts() {
    setLoadingC(true);
    const built: Contact[] = [];

    if (myRole === "therapist") {
      const { data: patients } = await supabase
        .from("patients").select("id, full_name, guardian_id").eq("therapist_id", myId);

      if (patients?.length) {
        const guardianIds = [...new Set(patients.map(p => p.guardian_id).filter(Boolean))];
        const { data: guardians } = await supabase
          .from("profiles").select("id, full_name").in("id", guardianIds);
        const gMap: Record<string, string> = {};
        (guardians ?? []).forEach(g => { gMap[g.id] = g.full_name; });

        const groups: Record<string, { guardianId: string; patients: typeof patients }> = {};
        for (const p of patients) {
          if (!p.guardian_id) continue;
          if (!groups[p.guardian_id]) groups[p.guardian_id] = { guardianId: p.guardian_id, patients: [] };
          groups[p.guardian_id].patients.push(p);
        }

        for (const { guardianId, patients: grp } of Object.values(groups)) {
          const convId = makeConvId(myId, guardianId);
          const { data: last } = await supabase
            .from("messages").select("content, created_at").eq("conversation_id", convId)
            .order("created_at", { ascending: false }).limit(1).maybeSingle();
          const { count: unread } = await supabase
            .from("messages").select("id", { count: "exact", head: true })
            .eq("conversation_id", convId).eq("receiver_id", myId).is("read_at", null);

          built.push({
            userId: guardianId, name: gMap[guardianId] ?? "Parent", professionalTitle: "",
            patientNames: grp.map(p => p.full_name).join(", "),
            patientIds: grp.map(p => p.id),
            patientIdMap: Object.fromEntries(grp.map(p => [p.id, p.full_name])),
            convId, lastMessage: last?.content ?? "", lastAt: last?.created_at ?? "", unread: unread ?? 0,
          });
        }
      }

    } else if (myRole === "user") {
      const { data: patients } = await supabase
        .from("patients").select("id, full_name, therapist_id")
        .eq("guardian_id", myId).not("therapist_id", "is", null);

      if (patients?.length) {
        const therapistIds = [...new Set(patients.map(p => p.therapist_id).filter(Boolean))] as string[];
        const { data: therapists } = await supabase
          .from("profiles").select("id, full_name").in("id", therapistIds);
        const tMap: Record<string, string> = {};
        (therapists ?? []).forEach(t => { tMap[t.id] = t.full_name; });

        const { data: tpData } = await supabase
          .from("therapist_profiles").select("id, professional_title").in("id", therapistIds);
        const tpMap: Record<string, string> = {};
        (tpData ?? []).forEach(tp => { tpMap[tp.id] = tp.professional_title ?? ""; });

        const groups: Record<string, { therapistId: string; patients: typeof patients }> = {};
        for (const p of patients) {
          if (!p.therapist_id) continue;
          if (!groups[p.therapist_id]) groups[p.therapist_id] = { therapistId: p.therapist_id, patients: [] };
          groups[p.therapist_id].patients.push(p);
        }

        for (const { therapistId, patients: grp } of Object.values(groups)) {
          const convId = makeConvId(therapistId, myId);
          const { data: last } = await supabase
            .from("messages").select("content, created_at").eq("conversation_id", convId)
            .order("created_at", { ascending: false }).limit(1).maybeSingle();
          const { count: unread } = await supabase
            .from("messages").select("id", { count: "exact", head: true })
            .eq("conversation_id", convId).eq("receiver_id", myId).is("read_at", null);

          built.push({
            userId: therapistId, name: tMap[therapistId] ?? "Therapist",
            professionalTitle: tpMap[therapistId] ?? "",
            patientNames: grp.map(p => p.full_name).join(", "),
            patientIds: grp.map(p => p.id),
            patientIdMap: Object.fromEntries(grp.map(p => [p.id, p.full_name])),
            convId, lastMessage: last?.content ?? "", lastAt: last?.created_at ?? "", unread: unread ?? 0,
          });
        }
      }
    }

    setContacts(built);
    onUnreadChange(built.reduce((sum, c) => sum + c.unread, 0));
    setLoadingC(false);
  }

  // ── Conversation ────────────────────────────────────────────────────────────
  async function openConversation(contact: Contact) {
    setActive(contact);
    setLoadingM(true);
    setMessages([]);

    const { data } = await supabase
      .from("messages")
      .select("id, sender_id, receiver_id, content, created_at, read_at, attachment")
      .eq("conversation_id", contact.convId)
      .order("created_at", { ascending: true });

    setMessages(data ?? []);
    setLoadingM(false);

    await supabase.from("messages")
      .update({ read_at: new Date().toISOString() })
      .eq("conversation_id", contact.convId).eq("receiver_id", myId).is("read_at", null);

    setContacts(prev => prev.map(c =>
      c.convId === contact.convId ? { ...c, unread: 0 } : c
    ));
    onUnreadChange(contacts.reduce((sum, c) =>
      sum + (c.convId === contact.convId ? 0 : c.unread), 0
    ));

    channelRef.current?.unsubscribe();
    channelRef.current = supabase
      .channel(`chat-${contact.convId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: `conversation_id=eq.${contact.convId}` },
        payload => {
          const msg = payload.new as Message;
          setMessages(prev => [...prev, msg]);
          if (msg.receiver_id === myId) {
            supabase.from("messages").update({ read_at: new Date().toISOString() })
              .eq("id", msg.id).then(() => {});
          }
        })
      .subscribe();
  }

  async function sendMessage() {
    if ((!input.trim() && !pendingAttachment) || !active || sending) return;
    const text = input.trim();
    const attachment = pendingAttachment;
    setInput("");
    setPendingAttachment(null);
    setSending(true);

    await supabase.from("messages").insert({
      conversation_id: active.convId,
      sender_id: myId,
      receiver_id: active.userId,
      content: text || "",
      ...(attachment ? { attachment } : {}),
    });

    setContacts(prev => prev.map(c =>
      c.convId === active.convId
        ? { ...c, lastMessage: text || `📎 ${attachment?.title ?? "Attachment"}`, lastAt: new Date().toISOString() }
        : c
    ));
    setSending(false);
  }

  function goBack() {
    channelRef.current?.unsubscribe();
    setActive(null);
    setMessages([]);
    loadContacts();
  }

  // ── Picker ──────────────────────────────────────────────────────────────────
  async function openPicker() {
    if (!active) return;
    setShowPicker(true);
    await switchPickerTab("drawing");
  }

  async function switchPickerTab(tab: PickerTab) {
    setPickerTab(tab);
    setLoadingPicker(true);
    if (!active) return;

    if (tab === "drawing") {
      const { data } = await supabase
        .from("sketches").select("id, image_url, emotion, created_at, patient_id")
        .in("patient_id", active.patientIds)
        .order("created_at", { ascending: false }).limit(30);
      setPickerSketches((data ?? []) as SketchRaw[]);

    } else if (tab === "result") {
      const { data } = await supabase
        .from("sketches")
        .select("id, image_url, emotion, scores, created_at, patient_id")
        .in("patient_id", active.patientIds)
        .order("created_at", { ascending: true });
      const withNum = ((data ?? []) as SketchRaw[]).map((s, i) => ({ ...s, sessionNum: i + 1 })).reverse();
      setPickerSessions(withNum);

    } else if (tab === "graph") {
      const { data } = await supabase
        .from("sketches").select("id, emotion, created_at, patient_id")
        .in("patient_id", active.patientIds)
        .order("created_at", { ascending: true }).limit(50);
      const byPatient: Record<string, SketchRaw[]> = {};
      for (const pid of active.patientIds) byPatient[pid] = [];
      for (const s of (data ?? []) as SketchRaw[]) {
        if (byPatient[s.patient_id]) byPatient[s.patient_id].push(s);
      }
      setPickerTimeline(byPatient);
    }

    setLoadingPicker(false);
  }

  function selectDrawing(sketch: SketchRaw) {
    if (!active) return;
    const pName = active.patientIdMap[sketch.patient_id] ?? "";
    setPendingAttachment({
      type: "drawing", id: sketch.id,
      title: `${emojiFor(sketch.emotion)} ${sketch.emotion ?? "Drawing"} · ${pName}`,
      imageUrl: sketch.image_url, emotion: sketch.emotion,
      date: sketch.created_at, patientName: pName,
    });
    setShowPicker(false);
  }

  function selectResult(s: SketchRaw & { sessionNum: number }) {
    if (!active) return;
    const pName = active.patientIdMap[s.patient_id] ?? "";
    const scores = computeScores(s as Record<string, unknown>);
    setPendingAttachment({
      type: "result", id: s.id,
      title: `Drawing Session #${s.sessionNum}`,
      emotion: s.emotion, date: s.created_at,
      patientName: pName, sessionNum: s.sessionNum, scores,
    });
    setShowPicker(false);
  }

  function selectGraph(patientId: string) {
    if (!active) return;
    const pName = active.patientIdMap[patientId] ?? "";
    const pts = pickerTimeline[patientId] ?? [];
    setPendingAttachment({
      type: "graph", id: patientId,
      title: `Emotion Timeline · ${pName}`,
      date: new Date().toISOString(), patientName: pName,
      timeline: pts.map(s => ({ emotion: s.emotion, date: s.created_at })),
    });
    setShowPicker(false);
  }

  if (!open) return null;

  const PICKER_TABS: { key: PickerTab; label: string; icon: typeof PenLine }[] = [
    { key: "drawing", label: "Drawing", icon: PenLine },
    { key: "result",  label: "Result",  icon: BarChart2 },
    { key: "graph",   label: "Graph",   icon: TrendingUp },
  ];

  return (
    <div
      className="absolute top-14 right-0 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border border-gray-200 z-50 flex flex-col overflow-hidden"
      style={{ height: 480 }}
    >
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 bg-gradient-to-r from-pink-50 to-purple-50 flex-shrink-0">
        {active && (
          <button onClick={showPicker ? () => setShowPicker(false) : goBack}
            className="p-1 hover:bg-white/60 rounded-lg transition-colors">
            <ChevronLeft size={18} className="text-gray-600" />
          </button>
        )}
        <div className="flex-1 min-w-0">
          {showPicker ? (
            <p className="font-bold text-gray-900 text-sm">Mention something</p>
          ) : active ? (
            <>
              <p className="font-bold text-gray-900 text-sm truncate">{active.name}</p>
              <p className="text-[11px] text-gray-500 truncate">Re: {active.patientNames}</p>
            </>
          ) : (
            <p className="font-bold text-gray-900">Messages</p>
          )}
        </div>
        <button onClick={onClose} className="p-1 hover:bg-white/60 rounded-lg transition-colors">
          <X size={16} className="text-gray-500" />
        </button>
      </div>

      {/* ── Body ────────────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto min-h-0">

        {/* ── Picker ────────────────────────────────────────────────────── */}
        {showPicker && (
          <div className="flex flex-col h-full">
            {/* Tabs */}
            <div className="flex border-b border-gray-100 bg-gray-50 flex-shrink-0">
              {PICKER_TABS.map(t => {
                const Icon = t.icon;
                return (
                  <button key={t.key}
                    onClick={() => switchPickerTab(t.key)}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-semibold transition-colors border-b-2 ${
                      pickerTab === t.key
                        ? "border-[#e13d7d] text-[#e13d7d]"
                        : "border-transparent text-gray-400 hover:text-gray-600"
                    }`}
                  >
                    <Icon size={13} />{t.label}
                  </button>
                );
              })}
            </div>

            {/* Tab body */}
            <div className="flex-1 overflow-y-auto">
              {loadingPicker ? (
                <div className="flex items-center justify-center h-full">
                  <div className="animate-spin rounded-full h-7 w-7 border-b-2 border-pink-400" />
                </div>
              ) : pickerTab === "drawing" ? (
                pickerSketches.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-40 text-gray-400 text-center px-6">
                    <PenLine size={28} className="mb-2 opacity-30" />
                    <p className="text-xs">No drawings yet</p>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-50">
                    {pickerSketches.map(s => {
                      const pName = active?.patientIdMap[s.patient_id] ?? "";
                      return (
                        <button key={s.id} onClick={() => selectDrawing(s)}
                          className="w-full flex items-center gap-3 px-4 py-3 hover:bg-pink-50 transition-colors text-left">
                          <div className="w-12 h-12 rounded-xl bg-gray-100 flex-shrink-0 overflow-hidden flex items-center justify-center">
                            {s.image_url
                              ? <img src={s.image_url} alt="" className="w-full h-full object-cover" />
                              : <span className="text-2xl">{emojiFor(s.emotion)}</span>
                            }
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-gray-800 truncate">
                              {emojiFor(s.emotion)} {s.emotion
                                ? s.emotion.charAt(0).toUpperCase() + s.emotion.slice(1)
                                : "Drawing"}
                            </p>
                            <p className="text-xs text-purple-500 font-medium">{pName}</p>
                            <p className="text-[11px] text-gray-400">{timeLabel(s.created_at)}</p>
                          </div>
                          <span className="flex items-center gap-1 text-[10px] font-bold text-[#e13d7d] border border-[#e13d7d] rounded-full px-2 py-0.5 flex-shrink-0">
                            <AtSign size={10} />Mention
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )

              ) : pickerTab === "result" ? (
                pickerSessions.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-40 text-gray-400 text-center px-6">
                    <BarChart2 size={28} className="mb-2 opacity-30" />
                    <p className="text-xs font-medium">No session results yet</p>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-50">
                    {pickerSessions.map(s => {
                      const pName = active?.patientIdMap[s.patient_id] ?? "";
                      const scores = computeScores(s as unknown as Record<string, unknown>);
                      const topEmo = scores
                        ? EMOTION_ORDER.reduce((a, b) => (scores[a] ?? 0) > (scores[b] ?? 0) ? a : b)
                        : s.emotion ?? "happy";
                      const topPct = scores?.[topEmo] ?? 0;
                      const cfg = EMOTIONS[topEmo];
                      return (
                        <button key={s.id} onClick={() => selectResult(s)}
                          className="w-full flex items-center gap-3 px-4 py-3 hover:bg-pink-50 transition-colors text-left">
                          <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 text-xl"
                            style={{ backgroundColor: cfg?.color + "22" }}>
                            {cfg?.emoji ?? "📊"}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-semibold text-gray-800">
                                Drawing Session #{s.sessionNum}
                              </p>
                              {scores && (
                                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full text-white flex-shrink-0"
                                  style={{ backgroundColor: cfg?.color }}>
                                  {topPct}%
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-purple-500 font-medium">{pName}</p>
                            <p className="text-[11px] text-gray-400">{dateLabel(s.created_at)}</p>
                          </div>
                          <span className="flex items-center gap-1 text-[10px] font-bold text-[#e13d7d] border border-[#e13d7d] rounded-full px-2 py-0.5 flex-shrink-0">
                            <AtSign size={10} />Mention
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )

              ) : /* graph */ (
                Object.keys(pickerTimeline).length === 0 || Object.values(pickerTimeline).every(v => v.length === 0) ? (
                  <div className="flex flex-col items-center justify-center h-40 text-gray-400 text-center px-6">
                    <TrendingUp size={28} className="mb-2 opacity-30" />
                    <p className="text-xs font-medium">No data yet</p>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-50">
                    {active && active.patientIds.map(pid => {
                      const pts = pickerTimeline[pid] ?? [];
                      const pName = active.patientIdMap[pid] ?? "";
                      if (pts.length === 0) return null;
                      const last8 = pts.slice(-8);
                      return (
                        <button key={pid} onClick={() => selectGraph(pid)}
                          className="w-full flex items-center gap-3 px-4 py-3 hover:bg-pink-50 transition-colors text-left">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-gray-800 mb-1">{pName}</p>
                            <div className="flex items-center gap-1 mb-1">
                              {last8.map((s, i) => (
                                <span key={i} className="w-7 h-7 rounded-full flex items-center justify-center text-base flex-shrink-0"
                                  style={{ backgroundColor: (EMOTIONS[s.emotion ?? ""]?.color ?? "#ccc") + "22" }}>
                                  {emojiFor(s.emotion)}
                                </span>
                              ))}
                            </div>
                            <p className="text-[11px] text-gray-400">{pts.length} sessions</p>
                          </div>
                          <span className="flex items-center gap-1 text-[10px] font-bold text-[#e13d7d] border border-[#e13d7d] rounded-full px-2 py-0.5 flex-shrink-0">
                            <Send size={10} />Share
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )
              )}
            </div>
          </div>
        )}

        {/* ── Contact list ──────────────────────────────────────────────── */}
        {!showPicker && !active && (
          loadingC ? (
            <div className="flex items-center justify-center h-full">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pink-400" />
            </div>
          ) : contacts.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-400 px-6 text-center">
              <MessageSquare size={36} className="mb-3 opacity-30" />
              <p className="font-medium text-gray-500 text-sm">No conversations yet</p>
              <p className="text-xs mt-1">
                {myRole === "therapist"
                  ? "Assign yourself to a patient to start chatting with their guardian."
                  : "Your therapist will be available here once assigned to your child."}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {contacts.map(c => (
                <button key={c.convId} onClick={() => openConversation(c)}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors text-left">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-pink-400 to-purple-500 flex items-center justify-center flex-shrink-0">
                    <User size={18} className="text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <p className={`text-sm font-semibold truncate ${c.unread > 0 ? "text-gray-900" : "text-gray-700"}`}>
                          {c.name}
                        </p>
                        <span className="flex-shrink-0 text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-purple-100 text-purple-600">
                          {myRole === "therapist" ? "Parent" : "Therapist"}
                        </span>
                      </div>
                      {c.lastAt && (
                        <span className="text-[10px] text-gray-400 flex-shrink-0 ml-2">{timeLabel(c.lastAt)}</span>
                      )}
                    </div>
                    {c.professionalTitle && (
                      <p className="text-[11px] text-gray-500 truncate">{c.professionalTitle}</p>
                    )}
                    <p className="text-[11px] text-purple-500 font-medium truncate">Re: {c.patientNames}</p>
                    <p className={`text-xs truncate ${c.unread > 0 ? "text-gray-800 font-medium" : "text-gray-400"}`}>
                      {c.lastMessage || "No messages yet"}
                    </p>
                  </div>
                  {c.unread > 0 && (
                    <span className="w-5 h-5 rounded-full bg-[#e13d7d] text-white text-[10px] font-bold flex items-center justify-center flex-shrink-0">
                      {c.unread > 9 ? "9+" : c.unread}
                    </span>
                  )}
                </button>
              ))}
            </div>
          )
        )}

        {/* ── Message thread ────────────────────────────────────────────── */}
        {!showPicker && active && (
          loadingM ? (
            <div className="flex items-center justify-center h-full">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pink-400" />
            </div>
          ) : (
            <div className="flex flex-col gap-2 px-4 py-3">
              {messages.length === 0 && (
                <p className="text-xs text-gray-400 text-center py-6">No messages yet. Say hello!</p>
              )}
              {messages.map(m => {
                const isMine = m.sender_id === myId;
                const att = m.attachment as Attachment | null | undefined;
                return (
                  <div key={m.id} className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[82%] flex flex-col gap-1 ${isMine ? "items-end" : "items-start"}`}>

                      {/* Drawing attachment card */}
                      {att?.type === "drawing" && (
                        <div className={`w-full rounded-2xl overflow-hidden border ${
                          isMine ? "border-pink-200 bg-pink-50 rounded-br-sm" : "border-gray-200 bg-gray-50 rounded-bl-sm"
                        }`}>
                          <div className="flex items-center gap-2 p-2.5">
                            <div className="w-12 h-12 rounded-xl overflow-hidden bg-gray-200 flex-shrink-0 flex items-center justify-center">
                              {att.imageUrl
                                ? <img src={att.imageUrl} alt="" className="w-full h-full object-cover" />
                                : <span className="text-xl">{emojiFor(att.emotion)}</span>
                              }
                            </div>
                            <div className="min-w-0">
                              <p className="text-[9px] font-bold text-[#e13d7d] uppercase tracking-wide">Drawing</p>
                              <p className="text-xs font-semibold text-gray-800 truncate">{att.title}</p>
                              <p className="text-[10px] text-gray-400">{dateLabel(att.date)}</p>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Result attachment card */}
                      {att?.type === "result" && (
                        <div className={`w-full rounded-2xl overflow-hidden border ${
                          isMine ? "border-amber-200 bg-amber-50 rounded-br-sm" : "border-gray-200 bg-gray-50 rounded-bl-sm"
                        }`}>
                          <div className="px-3 py-2 border-b border-gray-100">
                            <p className="text-[9px] font-bold text-amber-500 uppercase tracking-wide">Session Result</p>
                            <p className="text-xs font-bold text-gray-800">{att.title}</p>
                            <p className="text-[10px] text-gray-400">{att.patientName} · {dateLabel(att.date)}</p>
                          </div>
                          {att.scores ? (
                            <div className="px-3 py-2 flex flex-col gap-1.5">
                              {EMOTION_ORDER.map(emo => (
                                <ScoreBar
                                  key={emo} label={emo}
                                  emoji={EMOTIONS[emo]?.emoji ?? ""} pct={att.scores![emo] ?? 0}
                                  barClass={EMOTIONS[emo]?.bar ?? "bg-gray-300"}
                                />
                              ))}
                            </div>
                          ) : (
                            <div className="px-3 py-2">
                              <p className="text-xs text-gray-400">
                                {emojiFor(att.emotion)} {att.emotion ?? "No score data"}
                              </p>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Graph attachment card */}
                      {att?.type === "graph" && (
                        <div className={`w-full rounded-2xl overflow-hidden border ${
                          isMine ? "border-purple-200 bg-purple-50 rounded-br-sm" : "border-gray-200 bg-gray-50 rounded-bl-sm"
                        }`}>
                          <div className="px-3 pt-2.5 pb-1">
                            <p className="text-[9px] font-bold text-purple-500 uppercase tracking-wide">Emotion Timeline</p>
                            <p className="text-xs font-bold text-gray-800">{att.patientName}</p>
                          </div>
                          <div className="flex items-center gap-1 px-3 py-2 flex-wrap">
                            {(att.timeline ?? []).slice(-12).map((pt, i) => (
                              <span key={i} className="w-7 h-7 rounded-full flex items-center justify-center text-sm flex-shrink-0"
                                style={{ backgroundColor: (EMOTIONS[pt.emotion ?? ""]?.color ?? "#ccc") + "22" }}>
                                {emojiFor(pt.emotion)}
                              </span>
                            ))}
                          </div>
                          <p className="text-[10px] text-gray-400 px-3 pb-2">
                            {att.timeline?.length ?? 0} sessions · {dateLabel(att.date)}
                          </p>
                        </div>
                      )}

                      {/* Text bubble */}
                      {m.content && (
                        <div className={`px-3 py-2 rounded-2xl text-sm leading-relaxed ${
                          isMine ? "bg-[#e13d7d] text-white rounded-br-sm" : "bg-gray-100 text-gray-800 rounded-bl-sm"
                        }`}>
                          <p>{m.content}</p>
                          <div className="flex items-center justify-end gap-1 mt-0.5">
                            <span className={`text-[10px] ${isMine ? "text-pink-200" : "text-gray-400"}`}>
                              {timeLabel(m.created_at)}
                            </span>
                            {isMine && (
                              <span className={`text-[10px] font-bold leading-none ${m.read_at ? "text-blue-300" : "text-pink-200/60"}`}>
                                {m.read_at ? "✓✓" : "✓"}
                              </span>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Timestamp for attachment-only messages */}
                      {att && !m.content && (
                        <div className="flex items-center justify-end gap-1">
                          <span className="text-[10px] text-gray-400">{timeLabel(m.created_at)}</span>
                          {isMine && (
                            <span className={`text-[10px] font-bold leading-none ${m.read_at ? "text-blue-400" : "text-gray-300"}`}>
                              {m.read_at ? "✓✓" : "✓"}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
              <div ref={bottomRef} />
            </div>
          )
        )}
      </div>

      {/* ── Pending attachment preview ───────────────────────────────────── */}
      {pendingAttachment && !showPicker && (
        <div className="px-3 pt-2 flex-shrink-0">
          <div className="flex items-center gap-2 bg-pink-50 border border-pink-200 rounded-xl px-3 py-1.5">
            <span className="text-base flex-shrink-0">{
              pendingAttachment.type === "graph" ? "📈" :
              pendingAttachment.type === "result" ? "📊" :
              emojiFor(pendingAttachment.emotion)
            }</span>
            <div className="flex-1 min-w-0">
              <p className="text-[9px] font-bold text-[#e13d7d] uppercase tracking-wide">{pendingAttachment.type}</p>
              <p className="text-xs text-gray-700 truncate">{pendingAttachment.title}</p>
            </div>
            <button onClick={() => setPendingAttachment(null)}>
              <XIcon size={16} className="text-gray-400 hover:text-gray-600" />
            </button>
          </div>
        </div>
      )}

      {/* ── Input ───────────────────────────────────────────────────────── */}
      {active && !showPicker && (
        <div className="flex items-center gap-2 px-3 py-3 border-t border-gray-100 flex-shrink-0">
          <button onClick={openPicker}
            className="w-9 h-9 rounded-xl border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-50 hover:border-pink-300 hover:text-[#e13d7d] transition-colors flex-shrink-0">
            <Paperclip size={16} />
          </button>
          <input
            ref={inputRef} type="text" value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === "Enter" && !e.shiftKey && sendMessage()}
            placeholder="Type a message…"
            className="flex-1 text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-pink-300 placeholder:text-gray-400"
          />
          <button onClick={sendMessage}
            disabled={(!input.trim() && !pendingAttachment) || sending}
            className="w-9 h-9 rounded-xl bg-[#e13d7d] flex items-center justify-center text-white hover:bg-pink-600 transition-colors disabled:opacity-40 flex-shrink-0">
            <Send size={15} />
          </button>
        </div>
      )}
    </div>
  );
}
