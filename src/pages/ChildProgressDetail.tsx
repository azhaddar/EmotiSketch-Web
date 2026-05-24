import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import { jsPDF } from "jspdf";
import {
  ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine,
} from "recharts";
import {
  ArrowLeft,
  Calendar,
  NotebookPen,
  Flame,
  User,
  Loader2,
  Sparkles,
  Clock,
  Trash2,
  X,
  ZoomIn,
  Check,
  FileDown,
  CalendarPlus,
  Send,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { EmotionIcon } from "../components/EmotionIcon";

interface Patient {
  id: string;
  full_name: string;
  age: number;
  gender: string;
  personality: string;
  status: string;
  total_sketches: number;
  therapist_id: string | null;
  guardian_id: string;
  guardian?: { full_name: string };
  therapist?: { full_name: string };
}

interface Sketch {
  id: string;
  patient_id: string;
  emotion: "happy" | "sad" | "angry" | "anxious";
  created_at: string;
  notes?: string;
  therapist_notes?: string | null;
  image_url?: string | null;
  score?: number | null;
  analysis?: string | null;
  therapist_message?: string | null;
  htp_features?: Array<{
    category: string;
    observation: string;
    interpretation: string;
    severity: number;
  }> | null;
  happy?: number | null;
  sad?: number | null;
  angry?: number | null;
  anxious?: number | null;
  scores?: Record<string, number> | null;
  status?: 'submitted' | 'reviewing' | 'verified' | null;
  reviewed_at?: string | null;
  verified_at?: string | null;
  [key: string]: unknown;
}

interface ChildEvent {
  id: string;
  child_id: string;
  title: string;
  description?: string | null;
  event_type: string;
  scheduled_at: string;
}

const EMOTIONS: Record<string, { label: string; color: string; bg: string; text: string; ring: string }> = {
  happy:   { label: "Happy",   color: "#F59E0B", bg: "bg-amber-100",  text: "text-amber-700",  ring: "ring-amber-300"  },
  sad:     { label: "Sad",     color: "#3B82F6", bg: "bg-blue-100",   text: "text-blue-700",   ring: "ring-blue-300"   },
  angry:   { label: "Angry",   color: "#EF4444", bg: "bg-red-100",    text: "text-red-700",    ring: "ring-red-300"    },
  anxious: { label: "Anxious", color: "#8B5CF6", bg: "bg-purple-100", text: "text-purple-700", ring: "ring-purple-300" },
};

// ── Donut Chart ─────────────────────────────────────────────────────────────
function DonutChart({ counts }: { counts: Record<string, number> }) {
  const total = Object.values(counts).reduce((s, v) => s + v, 0);
  const r = 58;
  const cx = 80;
  const cy = 80;
  const circumference = 2 * Math.PI * r;

  let offsetFraction = 0;
  const segments = Object.entries(counts)
    .filter(([, v]) => v > 0)
    .map(([key, value]) => {
      const fraction = value / total;
      const seg = { key, value, fraction, offset: offsetFraction };
      offsetFraction += fraction;
      return seg;
    });

  return (
    <svg viewBox="0 0 160 160" className="w-44 h-44 drop-shadow-sm">
      {total === 0 ? (
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="#e5e7eb" strokeWidth={18} />
      ) : (
        segments.map((seg) => (
          <circle
            key={seg.key}
            cx={cx}
            cy={cy}
            r={r}
            fill="none"
            stroke={EMOTIONS[seg.key]?.color ?? "#d1d5db"}
            strokeWidth={18}
            strokeDasharray={`${seg.fraction * circumference} ${circumference}`}
            strokeDashoffset={-(seg.offset * circumference)}
            style={{ transform: "rotate(-90deg)", transformOrigin: `${cx}px ${cy}px` }}
          />
        ))
      )}
      <text x={cx} y={cy - 8} textAnchor="middle" style={{ fontSize: 28, fontWeight: 700, fill: "#111827" }}>
        {total}
      </text>
      <text x={cx} y={cy + 12} textAnchor="middle" style={{ fontSize: 11, fill: "#9ca3af" }}>
        sessions
      </text>
    </svg>
  );
}

// ── Weekly Bar Chart ─────────────────────────────────────────────────────────
function WeeklyBars({ sketches }: { sketches: Sketch[] }) {
  const WEEKS = 6;
  const now = new Date();

  const weekData = Array.from({ length: WEEKS }, (_, i) => {
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - (WEEKS - 1 - i) * 7 - now.getDay());
    weekStart.setHours(0, 0, 0, 0);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 999);

    const inWeek = sketches.filter((s) => {
      const d = new Date(s.created_at);
      return d >= weekStart && d <= weekEnd;
    });

    const label = `W${i + 1}`;
    const counts: Record<string, number> = { happy: 0, sad: 0, angry: 0, anxious: 0 };
    inWeek.forEach((s) => { if (counts[s.emotion] !== undefined) counts[s.emotion]++; });
    return { label, total: inWeek.length, counts };
  });

  const maxCount = Math.max(...weekData.map((w) => w.total), 1);
  const chartH = 80;
  const barW = 28;
  const gap = 16;
  const totalW = WEEKS * (barW + gap) - gap + 20;

  return (
    <svg viewBox={`0 0 ${totalW} ${chartH + 24}`} className="w-full max-w-xs">
      {weekData.map((week, i) => {
        const x = i * (barW + gap) + 10;
        let stackY = chartH;
        const emotions = Object.entries(week.counts).filter(([, v]) => v > 0);

        return (
          <g key={i}>
            {week.total === 0 ? (
              <rect x={x} y={chartH - 3} width={barW} height={3} rx={2} fill="#e5e7eb" />
            ) : (
              emotions.map(([emo, count]) => {
                const segH = Math.max((count / maxCount) * chartH, 4);
                stackY -= segH;
                return (
                  <rect
                    key={emo}
                    x={x}
                    y={stackY}
                    width={barW}
                    height={segH}
                    rx={3}
                    fill={EMOTIONS[emo]?.color ?? "#d1d5db"}
                  />
                );
              })
            )}
            <text
              x={x + barW / 2}
              y={chartH + 14}
              textAnchor="middle"
              style={{ fontSize: 9, fill: "#9ca3af" }}
            >
              {week.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

// ── Emotion Badge ────────────────────────────────────────────────────────────
function EmotionBadge({ emotion }: { emotion: string }) {
  const e = EMOTIONS[emotion];
  if (!e) return null;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold ${e.bg} ${e.text}`}>
      <EmotionIcon emotion={emotion} size={14} />
      {e.label}
    </span>
  );
}

// ── Insight Banner ────────────────────────────────────────────────────────────
function InsightBanner({ sketches }: { sketches: Sketch[] }) {
  if (sketches.length < 3) return null;

  const recent = sketches.slice(0, 5);
  const pick = (arr: string[]) => arr[sketches.length % arr.length];

  const happyCount   = recent.filter((s) => s.emotion === "happy").length;
  const sadCount     = recent.filter((s) => s.emotion === "sad").length;
  const angryCount   = recent.filter((s) => s.emotion === "angry").length;
  const anxiousCount = recent.filter((s) => s.emotion === "anxious").length;
  const negativeCount = angryCount + anxiousCount;

  // Trend: compare oldest 2 vs newest 2 in the recent window
  const oldest = recent.slice(3);
  const newest = recent.slice(0, 2);
  const positiveScore = (arr: Sketch[]) => arr.filter((s) => s.emotion === "happy").length;
  const isImproving = positiveScore(newest) > positiveScore(oldest);
  const isDeclining = positiveScore(newest) < positiveScore(oldest);

  let messages: string[] = [];
  let colorClass = "";

  if (happyCount === 5) {
    colorClass = "bg-amber-50 border-amber-200 text-amber-800";
    messages = [
      "Excellent! All recent sessions express happiness — this child is thriving.",
      "5 out of 5 happy sessions. A wonderful sign of emotional wellbeing.",
      "Consistent positive emotions across all recent sessions. Great to see!",
    ];
  } else if (happyCount >= 3 && isImproving) {
    colorClass = "bg-amber-50 border-amber-200 text-amber-800";
    messages = [
      "Positive trend detected — emotions are improving session by session.",
      "Recent sessions show a clear upward shift toward happiness. Keep it up!",
      "The child appears to be making great emotional progress lately.",
    ];
  } else if (happyCount >= 3) {
    colorClass = "bg-amber-50 border-amber-200 text-amber-800";
    messages = [
      "Recent sessions are mostly positive. A healthy emotional pattern.",
      "Happiness dominates the last few sessions — a good sign overall.",
      "More smiles than struggles recently. The child seems to be doing well.",
    ];
  } else if (sadCount >= 3) {
    colorClass = "bg-blue-50 border-blue-200 text-blue-700";
    messages = [
      "Sadness appears frequently in recent sessions. A gentle check-in may help.",
      "The child has expressed sadness in most recent sessions. Consider a follow-up.",
      "Recent drawings lean toward sadness. Worth noting in the next session.",
    ];
  } else if (angryCount >= 3) {
    colorClass = "bg-red-50 border-red-200 text-red-700";
    messages = [
      "Anger is the dominant emotion lately. A session focusing on emotional regulation may be beneficial.",
      "Multiple angry expressions recorded recently. Consider discussing frustration outlets.",
      "Recent sessions reflect strong anger. A follow-up conversation is recommended.",
    ];
  } else if (anxiousCount >= 3) {
    colorClass = "bg-purple-50 border-purple-200 text-purple-700";
    messages = [
      "Anxiety appears frequently in recent sessions. Consider calming strategies in the next visit.",
      "The child has shown anxious emotions consistently. Stress triggers may be worth exploring.",
      "High anxiety noted across recent sessions. A reassuring follow-up session is advised.",
    ];
  } else if (negativeCount >= 3) {
    colorClass = "bg-red-50 border-red-200 text-red-700";
    messages = [
      "Recent sessions show signs of distress. Consider scheduling a follow-up.",
      "Negative emotions are appearing frequently. The child may need additional support.",
      "Anger and anxiety are prominent lately. Early intervention is recommended.",
    ];
  } else if (isDeclining) {
    colorClass = "bg-orange-50 border-orange-200 text-orange-700";
    messages = [
      "Emotions appear to be declining compared to earlier sessions. Worth monitoring closely.",
      "A downward emotional trend is observed. Consider checking in with the child soon.",
      "Recent sessions are less positive than before. A gentle follow-up may be helpful.",
    ];
  } else if (sadCount >= 2 && anxiousCount >= 2) {
    colorClass = "bg-blue-50 border-blue-200 text-blue-700";
    messages = [
      "A mix of sadness and anxiety has appeared recently. Emotional support is encouraged.",
      "The child seems to be navigating both sadness and worry. Extra care is recommended.",
    ];
  } else {
    colorClass = "bg-blue-50 border-blue-200 text-blue-700";
    messages = [
      "Emotions are mixed in recent sessions — a balanced observation period is underway.",
      "No dominant pattern yet. More sessions will provide a clearer picture.",
      "A variety of emotions expressed recently — this is normal and worth tracking over time.",
      "Recent sessions show emotional variety. Continue monitoring for any emerging patterns.",
    ];
  }

  return (
    <div className={`flex items-start gap-3 px-4 py-3 rounded-xl border text-sm ${colorClass} mb-6`}>
      <Sparkles size={16} className="mt-0.5 flex-shrink-0" />
      <p>{pick(messages)}</p>
    </div>
  );
}

// ── Calendar view ─────────────────────────────────────────────────────────────
const MONTH_NAMES = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];
const CAL_EVENT_COLORS: Record<string, string> = {
  appointment: "#10B981",
  homework_prompt: "#F59E0B",
  check_in: "#3B82F6",
};
const CAL_EVENT_LABELS: Record<string, string> = {
  appointment: "Appointment",
  homework_prompt: "Homework",
  check_in: "Check-in",
};

function CalendarGridView({
  sketches,
  childEvents,
  calendarMonth,
  onMonthChange,
  selectedDay,
  onDaySelect,
  onSketchClick,
}: {
  sketches: Sketch[];
  childEvents: ChildEvent[];
  calendarMonth: { year: number; month: number };
  onMonthChange: (m: { year: number; month: number }) => void;
  selectedDay: string | null;
  onDaySelect: (day: string | null) => void;
  onSketchClick: (s: Sketch) => void;
}) {
  const { year, month } = calendarMonth;
  const today = new Date().toISOString().split("T")[0];

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const fmtDay = (d: number) =>
    `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;

  const prevMonth = () =>
    onMonthChange(month === 0 ? { year: year - 1, month: 11 } : { year, month: month - 1 });
  const nextMonth = () =>
    onMonthChange(month === 11 ? { year: year + 1, month: 0 } : { year, month: month + 1 });

  const dayMarks: Record<string, { emotions: string[]; hasEvent: boolean }> = {};
  sketches.forEach(s => {
    const d = s.created_at.slice(0, 10);
    if (!dayMarks[d]) dayMarks[d] = { emotions: [], hasEvent: false };
    if (!dayMarks[d].emotions.includes(s.emotion)) dayMarks[d].emotions.push(s.emotion);
  });
  childEvents.forEach(ev => {
    const d = ev.scheduled_at.slice(0, 10);
    if (!dayMarks[d]) dayMarks[d] = { emotions: [], hasEvent: false };
    dayMarks[d].hasEvent = true;
  });

  const daySketchList = selectedDay ? sketches.filter(s => s.created_at.slice(0, 10) === selectedDay) : [];
  const dayEventList  = selectedDay ? childEvents.filter(ev => ev.scheduled_at.slice(0, 10) === selectedDay) : [];
  const selectedDateLabel = selectedDay
    ? new Date(selectedDay + "T00:00:00").toLocaleDateString("en-MY", {
        weekday: "long", day: "numeric", month: "long", year: "numeric",
      })
    : null;

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 mb-6">
      {/* Month nav */}
      <div className="flex items-center justify-between mb-5">
        <button onClick={prevMonth} className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors">
          <ChevronLeft size={16} />
        </button>
        <h2 className="text-sm font-bold text-gray-800">{MONTH_NAMES[month]} {year}</h2>
        <button onClick={nextMonth} className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors">
          <ChevronRight size={16} />
        </button>
      </div>

      {/* Weekday headers */}
      <div className="grid grid-cols-7 mb-1">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(d => (
          <div key={d} className="text-center text-[11px] text-gray-400 font-semibold py-1">{d}</div>
        ))}
      </div>

      {/* Day cells */}
      <div className="grid grid-cols-7 gap-0.5">
        {cells.map((day, i) => {
          if (!day) return <div key={i} />;
          const ds = fmtDay(day);
          const mark = dayMarks[ds];
          const isToday = ds === today;
          const isSelected = ds === selectedDay;
          return (
            <button
              key={i}
              onClick={() => onDaySelect(isSelected ? null : ds)}
              className={`min-h-[44px] flex flex-col items-center justify-start pt-1.5 pb-1 rounded-xl text-xs font-semibold transition-all ${
                isSelected
                  ? "bg-[#1A1F3C] text-white"
                  : isToday
                  ? "bg-pink-50 text-[#e13d7d] ring-1 ring-[#e13d7d]"
                  : "text-gray-700 hover:bg-gray-50"
              }`}
            >
              {day}
              {mark && (
                <div className="flex gap-0.5 mt-1 flex-wrap justify-center">
                  {mark.emotions.slice(0, 3).map(e => (
                    <span
                      key={e}
                      className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                      style={{ backgroundColor: EMOTIONS[e]?.color ?? "#d1d5db" }}
                    />
                  ))}
                  {mark.hasEvent && (
                    <span className="w-1.5 h-1.5 rounded-full flex-shrink-0 bg-emerald-500" />
                  )}
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-4 mt-4 pt-4 border-t border-gray-100">
        {Object.entries(EMOTIONS).map(([key, e]) => (
          <div key={key} className="flex items-center gap-1.5 text-xs text-gray-500">
            <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: e.color }} />
            {e.label}
          </div>
        ))}
        <div className="flex items-center gap-1.5 text-xs text-gray-500">
          <span className="w-2 h-2 rounded-full flex-shrink-0 bg-emerald-500" />
          Scheduled Event
        </div>
      </div>

      {/* Day detail */}
      {selectedDay && (
        <div className="mt-5 border-t border-gray-100 pt-5">
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-3">{selectedDateLabel}</p>
          {daySketchList.length === 0 && dayEventList.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-3">Nothing recorded on this day</p>
          ) : (
            <div className="space-y-2">
              {dayEventList.map(ev => (
                <div key={ev.id} className="flex items-start gap-3 p-3 rounded-xl border border-gray-100 bg-gray-50">
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: (CAL_EVENT_COLORS[ev.event_type] ?? "#10B981") + "22" }}
                  >
                    <Calendar size={14} style={{ color: CAL_EVENT_COLORS[ev.event_type] ?? "#10B981" }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-800">{ev.title}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {CAL_EVENT_LABELS[ev.event_type] ?? ev.event_type}
                      {" · "}
                      {new Date(ev.scheduled_at).toLocaleTimeString("en-MY", { hour: "2-digit", minute: "2-digit" })}
                    </p>
                    {ev.description && <p className="text-xs text-gray-400 mt-1">{ev.description}</p>}
                  </div>
                </div>
              ))}
              {daySketchList.map(sk => {
                const e = EMOTIONS[sk.emotion];
                return (
                  <button
                    key={sk.id}
                    onClick={() => onSketchClick(sk)}
                    className="w-full flex items-center gap-3 p-3 rounded-xl border border-gray-100 bg-gray-50 hover:bg-gray-100 transition-colors text-left"
                  >
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: (e?.color ?? "#d1d5db") + "22" }}
                    >
                      <EmotionIcon emotion={sk.emotion} size={16} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-800">Drawing session</p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        <span style={{ color: e?.color }}>{e?.label}</span>
                        {" · "}
                        {new Date(sk.created_at).toLocaleTimeString("en-MY", { hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </div>
                    {sk.image_url && (
                      <img
                        src={sk.image_url}
                        alt={e?.label}
                        className="w-10 h-10 rounded-lg object-cover flex-shrink-0 border border-gray-200"
                      />
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function ChildProgressDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [patient, setPatient] = useState<Patient | null>(null);
  const [sketches, setSketches] = useState<Sketch[]>([]);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState<string>("");
  const [deletingId, setDeletingId]         = useState<string | null>(null);
  const [showAllSessions, setShowAllSessions] = useState(false);
  const [selectedSketch, setSelectedSketch] = useState<Sketch | null>(null);
  const [noteText, setNoteText] = useState<string>("");
  const [savingNote, setSavingNote] = useState(false);
  const [noteSaved, setNoteSaved] = useState(false);
  const [therapists, setTherapists] = useState<{ id: string; full_name: string }[]>([]);
  const [assigningTherapist, setAssigningTherapist] = useState(false);
  const [therapistSaved, setTherapistSaved] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [statusSaved, setStatusSaved] = useState(false);
  const [verifying, setVerifying] = useState(false);

  // ── Analytics / Calendar toggle ───────────────────────────────────────────
  const [analyticsView, setAnalyticsView] = useState<"analytics" | "calendar">("analytics");
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const d = new Date();
    return { year: d.getFullYear(), month: d.getMonth() };
  });
  const [calendarSelectedDay, setCalendarSelectedDay] = useState<string | null>(null);
  const [childEvents, setChildEvents] = useState<ChildEvent[]>([]);

  // ── Schedule event modal ───────────────────────────────────────────────────
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [schedulingEvent, setSchedulingEvent]     = useState(false);
  const [scheduleForm, setScheduleForm] = useState({
    title: '',
    event_type: 'appointment' as 'appointment' | 'homework_prompt' | 'check_in',
    date: new Date().toISOString().split('T')[0],
    time: '10:00',
    description: '',
    send_notification: true,
  });
  const [scheduleSuccess, setScheduleSuccess] = useState(false);

  useEffect(() => {
    if (id) fetchData(id);
  }, [id]);

  useEffect(() => {
    setNoteText(selectedSketch?.therapist_notes ?? "");
    setNoteSaved(false);
  }, [selectedSketch?.id]);

  async function fetchData(patientId: string) {
    try {
      setLoading(true);

      const { data: { user } } = await supabase.auth.getUser();
      let resolvedRole = "";
      if (user) {
        const { data: prof } = await supabase
          .from("profiles").select("role").eq("id", user.id).single();
        resolvedRole = (prof?.role ?? "").toLowerCase();
        setRole(resolvedRole);
      }

      if (resolvedRole === "admin") {
        const { data: therapistData } = await supabase
          .from("profiles")
          .select("id, full_name")
          .eq("role", "therapist")
          .order("full_name");
        setTherapists(therapistData || []);
      }

      const { data: patientData, error: patientError } = await supabase
        .from("patients")
        .select(`*, guardian:profiles!guardian_id(full_name), therapist:profiles!therapist_id(full_name)`)
        .eq("id", patientId)
        .single();

      if (patientError) throw patientError;
      setPatient(patientData);

      const { data: sketchData } = await supabase
        .from("sketches")
        .select("*")
        .eq("patient_id", patientId)
        .order("created_at", { ascending: false });

      setSketches(sketchData || []);

      const { data: eventsData } = await supabase
        .from("child_events")
        .select("id, child_id, title, description, event_type, scheduled_at")
        .eq("child_id", patientId)
        .order("scheduled_at", { ascending: true });
      setChildEvents(eventsData || []);
    } catch (err) {
      console.error("Error loading child details:", err);
    } finally {
      setLoading(false);
    }
  }

  async function deleteSketch(sketch: Sketch) {
    if (!window.confirm(`Delete this ${sketch.emotion} session from ${new Date(sketch.created_at).toLocaleDateString("en-MY")}? This cannot be undone.`)) return;

    setDeletingId(sketch.id);
    try {
      // Remove image from storage if exists
      if (sketch.image_url) {
        const parts = sketch.image_url.split("/sketch-images/");
        if (parts.length === 2) {
          await supabase.storage.from("sketch-images").remove([parts[1]]);
        }
      }
      // Delete DB record
      const { error } = await supabase.from("sketches").delete().eq("id", sketch.id);
      if (error) throw error;

      setSketches(prev => prev.filter(s => s.id !== sketch.id));
      setPatient(prev => prev ? { ...prev, total_sketches: Math.max(0, (prev.total_sketches ?? 1) - 1) } : prev);
    } catch (err) {
      console.error("Delete failed:", err);
      alert("Failed to delete sketch. Please try again.");
    } finally {
      setDeletingId(null);
    }
  }

  async function updateStatus(newStatus: string) {
    if (!patient) return;
    setUpdatingStatus(true);
    try {
      const { error } = await supabase
        .from("patients")
        .update({ status: newStatus })
        .eq("id", patient.id);
      if (error) throw error;
      setPatient(prev => prev ? { ...prev, status: newStatus } : prev);
      setStatusSaved(true);
      setTimeout(() => setStatusSaved(false), 3000);
    } catch (err) {
      console.error("Failed to update status:", err);
      alert("Failed to update status. Please try again.");
    } finally {
      setUpdatingStatus(false);
    }
  }

  async function assignTherapist(therapistId: string | null) {
    if (!patient) return;
    setAssigningTherapist(true);
    try {
      const { error } = await supabase
        .from("patients")
        .update({ therapist_id: therapistId })
        .eq("id", patient.id);
      if (error) throw error;
      const matched = therapistId ? therapists.find(t => t.id === therapistId) : null;
      setPatient(prev => prev ? {
        ...prev,
        therapist_id: therapistId,
        therapist: matched ? { full_name: matched.full_name } : undefined,
      } : prev);
      setTherapistSaved(true);
      setTimeout(() => setTherapistSaved(false), 3000);
    } catch (err) {
      console.error("Failed to assign therapist:", err);
      alert("Failed to assign therapist. Please try again.");
    } finally {
      setAssigningTherapist(false);
    }
  }

  async function updateSketchStatus(newStatus: "reviewing" | "verified") {
    if (!selectedSketch) return;
    setVerifying(true);
    try {
      const now = new Date().toISOString();
      const extra = newStatus === "reviewing"
        ? { reviewed_at: now }
        : { verified_at: now };
      const { error } = await supabase
        .from("sketches")
        .update({ status: newStatus, ...extra })
        .eq("id", selectedSketch.id);
      if (error) throw error;
      const patch = { status: newStatus, ...extra };
      setSketches(prev => prev.map(s => s.id === selectedSketch.id ? { ...s, ...patch } : s));
      setSelectedSketch(prev => prev ? { ...prev, ...patch } : prev);
    } catch (err) {
      console.error("Failed to update status:", err);
      alert("Failed to update status. Please try again.");
    } finally {
      setVerifying(false);
    }
  }

  async function saveNote() {
    if (!selectedSketch) return;
    setSavingNote(true);
    try {
      const { error } = await supabase
        .from("sketches")
        .update({ therapist_notes: noteText.trim() || null })
        .eq("id", selectedSketch.id);
      if (error) throw error;
      const saved = noteText.trim() || null;
      setSketches(prev => prev.map(s => s.id === selectedSketch.id ? { ...s, therapist_notes: saved } : s));
      setSelectedSketch(prev => prev ? { ...prev, therapist_notes: saved } : prev);
      setNoteSaved(true);
      setTimeout(() => setNoteSaved(false), 3000);
    } catch (err) {
      console.error("Failed to save note:", err);
      alert("Failed to save note. Please try again.");
    } finally {
      setSavingNote(false);
    }
  }

  async function createEvent() {
    if (!patient || !scheduleForm.title.trim()) return;
    setSchedulingEvent(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const scheduled_at = new Date(`${scheduleForm.date}T${scheduleForm.time}`).toISOString();
      const { error } = await supabase.from("child_events").insert({
        child_id:     patient.id,
        therapist_id: user.id,
        title:        scheduleForm.title.trim(),
        description:  scheduleForm.description.trim() || null,
        event_type:   scheduleForm.event_type,
        scheduled_at,
      });
      if (error) throw error;

      if (scheduleForm.send_notification) {
        const { data: guardianProfile } = await supabase
          .from("profiles")
          .select("expo_push_token")
          .eq("id", patient.guardian_id)
          .single();

        const token = (guardianProfile as any)?.expo_push_token as string | null;
        if (token) {
          const dateLabel = new Date(scheduled_at).toLocaleDateString("en-MY", {
            weekday: "short", day: "numeric", month: "short",
          });
          await fetch("https://exp.host/--/api/v2/push/send", {
            method: "POST",
            headers: { "Content-Type": "application/json", "Accept": "application/json" },
            body: JSON.stringify({
              to:    token,
              title: `New event for ${patient.full_name.split(" ")[0]}`,
              body:  `${scheduleForm.title.trim()} on ${dateLabel}`,
              data:  { screen: "calendar", selectedDate: scheduleForm.date, childId: patient.id },
              sound: "default",
            }),
          });
        }
      }

      setScheduleSuccess(true);
      setTimeout(() => {
        setShowScheduleModal(false);
        setScheduleSuccess(false);
        setScheduleForm(f => ({ ...f, title: '', description: '', send_notification: true }));
      }, 1500);
    } catch (err) {
      console.error("Failed to create event:", err);
      alert("Failed to create event. Please try again.");
    } finally {
      setSchedulingEvent(false);
    }
  }

  // ── Derived stats ──────────────────────────────────────────────────────────
  const emotionCounts: Record<string, number> = { happy: 0, sad: 0, angry: 0, anxious: 0 };
  sketches.forEach((s) => { if (emotionCounts[s.emotion] !== undefined) emotionCounts[s.emotion]++; });

  const dominantEmotion = Object.entries(emotionCounts).sort((a, b) => b[1] - a[1])[0];

  const lastSession = sketches[0]
    ? new Date(sketches[0].created_at).toLocaleDateString("en-MY", { day: "numeric", month: "short", year: "numeric" })
    : "No sessions yet";

  const activeDays = new Set(sketches.map((s) => new Date(s.created_at).toDateString())).size;

  // ── PDF Export ────────────────────────────────────────────────────────────
  function exportPDF() {
    if (!patient) return;
    const doc = new jsPDF({ unit: "mm", format: "a4" });
    const W = 210;
    const pink: [number, number, number] = [225, 61, 125];
    const dark: [number, number, number] = [17, 24, 39];
    const gray: [number, number, number] = [107, 114, 128];
    const light: [number, number, number] = [249, 250, 251];

    // Header bar
    doc.setFillColor(...pink);
    doc.rect(0, 0, W, 28, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(20);
    doc.setFont("helvetica", "bold");
    doc.text("EmotiSketch", 14, 12);
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text("Patient Progress Report", 14, 20);
    doc.text(`Generated: ${new Date().toLocaleDateString("en-MY", { day: "numeric", month: "long", year: "numeric" })}`, W - 14, 20, { align: "right" });

    let y = 38;

    // Patient info section
    doc.setFillColor(...light);
    doc.roundedRect(14, y, W - 28, 34, 3, 3, "F");
    doc.setTextColor(...dark);
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text(patient.full_name, 22, y + 9);
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...gray);
    doc.text(`Age: ${patient.age}  ·  Gender: ${patient.gender}  ·  Status: ${patient.status ?? "N/A"}`, 22, y + 17);
    if (patient.guardian?.full_name) doc.text(`Parent / Guardian: ${patient.guardian.full_name}`, 22, y + 24);
    if (patient.therapist?.full_name) doc.text(`Assigned Therapist: ${patient.therapist.full_name}`, 22, y + 31);
    y += 42;

    // Emotion summary
    doc.setTextColor(...dark);
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text("Emotion Summary", 14, y);
    y += 6;

    const total = sketches.length;
    const emoColors: Record<string, [number, number, number]> = {
      happy:   [245, 158, 11],
      sad:     [59, 130, 246],
      angry:   [239, 68, 68],
      anxious: [139, 92, 246],
    };

    Object.entries(emotionCounts).forEach(([emo, count]) => {
      const pct = total > 0 ? Math.round((count / total) * 100) : 0;
      const barW = total > 0 ? ((count / total) * 100) : 0;
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(...gray);
      doc.text(`${emo.charAt(0).toUpperCase() + emo.slice(1)}`, 22, y + 4);
      doc.setFillColor(229, 231, 235);
      doc.roundedRect(50, y, 100, 5, 2, 2, "F");
      if (barW > 0) {
        doc.setFillColor(...(emoColors[emo] ?? [156, 163, 175]));
        doc.roundedRect(50, y, barW, 5, 2, 2, "F");
      }
      doc.setTextColor(...dark);
      doc.text(`${count} (${pct}%)`, 155, y + 4);
      y += 9;
    });

    y += 4;

    // Sessions table
    doc.setTextColor(...dark);
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text("Session History", 14, y);
    y += 6;

    // Table header
    doc.setFillColor(...pink);
    doc.rect(14, y, W - 28, 7, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.text("#", 17, y + 5);
    doc.text("Date & Time", 26, y + 5);
    doc.text("Emotion", 78, y + 5);
    doc.text("Parent Note", 110, y + 5);
    doc.text("Therapist Note", 158, y + 5);
    y += 7;

    const rows = sketches.slice(0, 30);
    rows.forEach((s, i) => {
      if (y > 270) {
        doc.addPage();
        y = 20;
      }
      const rowBg: [number, number, number] = i % 2 === 0 ? [255, 255, 255] : [249, 250, 251];
      doc.setFillColor(...rowBg);
      doc.rect(14, y, W - 28, 8, "F");
      doc.setTextColor(...gray);
      doc.setFontSize(7.5);
      doc.setFont("helvetica", "normal");
      const dateStr = new Date(s.created_at).toLocaleDateString("en-MY", { day: "numeric", month: "short", year: "numeric" });
      const timeStr = new Date(s.created_at).toLocaleTimeString("en-MY", { hour: "2-digit", minute: "2-digit" });
      doc.text(`${total - i}`, 17, y + 5.5);
      doc.text(`${dateStr} ${timeStr}`, 26, y + 5.5);
      doc.setTextColor(...(emoColors[s.emotion] ?? dark));
      doc.setFont("helvetica", "bold");
      doc.text(s.emotion.charAt(0).toUpperCase() + s.emotion.slice(1), 78, y + 5.5);
      doc.setTextColor(...gray);
      doc.setFont("helvetica", "normal");
      const parentNote = s.notes ? doc.splitTextToSize(s.notes, 38)[0] : "—";
      const therapistNote = s.therapist_notes ? doc.splitTextToSize(s.therapist_notes, 38)[0] : "—";
      doc.text(parentNote, 110, y + 5.5);
      doc.text(therapistNote, 158, y + 5.5);
      y += 8;
    });

    if (sketches.length > 30) {
      doc.setFontSize(8);
      doc.setTextColor(...gray);
      doc.text(`... and ${sketches.length - 30} more sessions`, 14, y + 5);
    }

    // Footer
    const pageCount = doc.getNumberOfPages();
    for (let p = 1; p <= pageCount; p++) {
      doc.setPage(p);
      doc.setFontSize(7);
      doc.setTextColor(...gray);
      doc.text("EmotiSketch — Confidential Patient Report", 14, 292);
      doc.text(`Page ${p} of ${pageCount}`, W - 14, 292, { align: "right" });
    }

    doc.save(`EmotiSketch_${patient.full_name.replace(/\s+/g, "_")}_Report.pdf`);
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="animate-spin text-pink-500" size={36} />
      </div>
    );
  }

  if (!patient) {
    return (
      <div className="text-center py-20 text-gray-500">
        <p>Child not found.</p>
        <button onClick={() => navigate(-1)} className="mt-4 text-pink-500 underline text-sm">Go back</button>
      </div>
    );
  }

  const displayStatus = !patient.therapist_id ? "Unassigned" : patient.status;

  return (
    <div className="max-w-5xl mx-auto pb-10">
      {/* Back */}
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-gray-500 hover:text-[#e13d7d] transition-colors mb-5 group w-fit"
      >
        <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
        <span className="text-sm font-medium">Back to Children</span>
      </button>

      {/* Hero Card */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 mb-6 flex flex-col md:flex-row items-start md:items-center gap-5">
        <div
          className={`w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-bold text-white flex-shrink-0 ${
            patient.gender === "Female"
              ? "bg-gradient-to-br from-pink-400 to-rose-500"
              : "bg-gradient-to-br from-blue-400 to-indigo-500"
          }`}
        >
          {patient.full_name.charAt(0)}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <h1 className="text-2xl font-bold text-gray-900">{patient.full_name}</h1>
            {(role === "therapist" || role === "admin") && patient.therapist_id ? (
              <div className="flex items-center gap-1.5">
                <select
                  value={patient.status}
                  onChange={e => updateStatus(e.target.value)}
                  disabled={updatingStatus}
                  className={`text-[10px] font-bold uppercase rounded-full border px-2 py-0.5 focus:outline-none focus:ring-2 focus:ring-pink-300 cursor-pointer disabled:opacity-50 ${
                    patient.status === "Active"
                      ? "bg-green-100 text-green-700 border-green-200"
                      : patient.status === "Complete"
                      ? "bg-teal-100 text-teal-700 border-teal-200"
                      : "bg-gray-100 text-gray-500 border-gray-200"
                  }`}
                >
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                  <option value="Complete">Complete</option>
                </select>
                {updatingStatus && <Loader2 size={12} className="animate-spin text-pink-500" />}
                {statusSaved && <Check size={12} className="text-green-500" />}
              </div>
            ) : (
              <span
                className={`px-2 py-0.5 text-[10px] font-bold uppercase rounded-full border ${
                  displayStatus === "Active"
                    ? "bg-green-100 text-green-700 border-green-200"
                    : displayStatus === "Unassigned"
                    ? "bg-yellow-100 text-yellow-700 border-yellow-200"
                    : displayStatus === "Complete"
                    ? "bg-teal-100 text-teal-700 border-teal-200"
                    : "bg-gray-100 text-gray-500 border-gray-200"
                }`}
              >
                {displayStatus}
              </span>
            )}
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-500">
            <span className="flex items-center gap-1"><User size={13} /> {patient.age} years old · {patient.gender}</span>
            {patient.guardian?.full_name && (
              <span className="flex items-center gap-1">
                <span className="text-gray-300">|</span> Parent: <span className="text-gray-700 font-medium">{patient.guardian.full_name}</span>
              </span>
            )}
            {role === "admin" ? (
              <span className="flex items-center gap-2 flex-wrap">
                <span className="text-gray-300">|</span>
                <span>Therapist:</span>
                <select
                  value={patient.therapist_id || ""}
                  onChange={e => assignTherapist(e.target.value || null)}
                  disabled={assigningTherapist}
                  className="text-sm font-medium text-gray-700 border border-gray-200 rounded-lg px-2 py-0.5 focus:outline-none focus:ring-2 focus:ring-pink-300 cursor-pointer disabled:opacity-50 bg-white"
                >
                  <option value="">— Unassigned —</option>
                  {therapists.map(t => (
                    <option key={t.id} value={t.id}>{t.full_name}</option>
                  ))}
                </select>
                {assigningTherapist && <Loader2 size={13} className="animate-spin text-pink-500" />}
                {therapistSaved && (
                  <span className="text-[11px] text-green-600 font-semibold flex items-center gap-1">
                    <Check size={11} /> Assigned
                  </span>
                )}
              </span>
            ) : patient.therapist?.full_name ? (
              <span className="flex items-center gap-1">
                <span className="text-gray-300">|</span> Therapist: <span className="text-gray-700 font-medium">{patient.therapist.full_name}</span>
              </span>
            ) : null}
          </div>
        </div>

        <div className="flex flex-col items-end gap-3 flex-shrink-0">
          <div className="text-right">
            <p className="text-3xl font-bold text-gray-900">{patient.total_sketches ?? 0}</p>
            <p className="text-xs text-gray-400 uppercase tracking-wide">Total Sketches</p>
          </div>
          <div className="flex flex-col gap-2">
            <button
              onClick={exportPDF}
              className="flex items-center gap-2 px-4 py-2 bg-[#e13d7d] hover:bg-pink-600 text-white text-sm font-semibold rounded-xl transition-colors"
            >
              <FileDown size={15} />
              Export PDF
            </button>
            {(role === "therapist" || role === "admin") && (
              <button
                onClick={() => setShowScheduleModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl transition-colors"
              >
                <CalendarPlus size={15} />
                Schedule Event
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Insight Banner */}
      <InsightBanner sketches={sketches} />

      {/* Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          {
            icon: <NotebookPen size={18} className="text-pink-500" />,
            label: "Total Sessions",
            value: sketches.length.toString(),
            sub: "all time",
            bg: "bg-pink-50",
          },
          {
            icon: dominantEmotion && dominantEmotion[1] > 0
              ? <span className="w-5 h-5 rounded-full inline-block" style={{ backgroundColor: EMOTIONS[dominantEmotion[0]]?.color }} />
              : <span className="w-5 h-5 rounded-full inline-block bg-gray-300" />,
            label: "Top Emotion",
            value: dominantEmotion && dominantEmotion[1] > 0 ? EMOTIONS[dominantEmotion[0]]?.label : "N/A",
            sub: dominantEmotion && dominantEmotion[1] > 0 ? `${dominantEmotion[1]} times` : "no data",
            bg: "bg-amber-50",
          },
          {
            icon: <Clock size={18} className="text-indigo-500" />,
            label: "Last Session",
            value: lastSession,
            sub: "",
            bg: "bg-indigo-50",
          },
          {
            icon: <Flame size={18} className="text-orange-500" />,
            label: "Active Days",
            value: activeDays.toString(),
            sub: "days with sessions",
            bg: "bg-orange-50",
          },
        ].map((stat, i) => (
          <div key={i} className={`${stat.bg} rounded-xl p-4 border border-white shadow-sm`}>
            <div className="flex items-center gap-2 mb-2">{stat.icon}<span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{stat.label}</span></div>
            <p className="text-lg font-bold text-gray-900 leading-tight">{stat.value}</p>
            {stat.sub && <p className="text-xs text-gray-400 mt-0.5">{stat.sub}</p>}
          </div>
        ))}
      </div>

      {/* View Toggle */}
      <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-xl w-fit mb-5">
        {(["analytics", "calendar"] as const).map((v) => (
          <button
            key={v}
            onClick={() => setAnalyticsView(v)}
            className={`px-4 py-1.5 rounded-lg text-sm font-semibold capitalize transition-all ${
              analyticsView === v
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {v}
          </button>
        ))}
      </div>

      {analyticsView === "calendar" && (
        <CalendarGridView
          sketches={sketches}
          childEvents={childEvents}
          calendarMonth={calendarMonth}
          onMonthChange={setCalendarMonth}
          selectedDay={calendarSelectedDay}
          onDaySelect={setCalendarSelectedDay}
          onSketchClick={setSelectedSketch}
        />
      )}

      {analyticsView === "analytics" && (
      <>
      {/* Charts Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        {/* Donut Chart */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wide mb-4">Emotion Distribution</h2>
          {sketches.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-gray-400">
              <NotebookPen size={28} className="mb-2 opacity-40" />
              <p className="text-sm">No sessions recorded yet</p>
            </div>
          ) : (
            <div className="flex items-center gap-6">
              <DonutChart counts={emotionCounts} />
              <div className="space-y-2.5 flex-1">
                {Object.entries(EMOTIONS).map(([key, e]) => {
                  const count = emotionCounts[key] ?? 0;
                  const pct = sketches.length > 0 ? Math.round((count / sketches.length) * 100) : 0;
                  return (
                    <div key={key}>
                      <div className="flex justify-between text-xs mb-1">
                        <span className={`font-medium ${e.text} flex items-center gap-1.5`}>
                          <EmotionIcon emotion={key} size={14} />
                          {e.label}
                        </span>
                        <span className="text-gray-500">{count} ({pct}%)</span>
                      </div>
                      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{ width: `${pct}%`, backgroundColor: e.color }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Weekly Bar Chart */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wide mb-1">Weekly Activity</h2>
          <p className="text-xs text-gray-400 mb-4">Last 6 weeks · stacked by emotion</p>
          {sketches.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-gray-400">
              <Calendar size={28} className="mb-2 opacity-40" />
              <p className="text-sm">No activity to display</p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-4">
              <WeeklyBars sketches={sketches} />
              {/* Legend */}
              <div className="flex flex-wrap gap-3 justify-center">
                {Object.entries(EMOTIONS).map(([key, e]) => (
                  <div key={key} className="flex items-center gap-1.5 text-xs text-gray-500">
                    <EmotionIcon emotion={key} size={14} />
                    {e.label}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Emotion Timeline — Line Chart */}
      {sketches.length > 0 && (() => {
        const EMOTION_VALUE: Record<string, number> = {
          happy: 3, sad: 2, angry: 1, anxious: 0,
        };
        const EMOTION_LABEL: Record<number, string> = {
          3: "Happy", 2: "Sad", 1: "Angry", 0: "Anxious",
        };
        const count = Math.min(sketches.length, 20);
        const chartData = sketches.slice(0, count).reverse().map((s, j) => ({
          session: sketches.length - count + 1 + j,
          value: EMOTION_VALUE[s.emotion] ?? 0,
          emotion: s.emotion,
          label: EMOTIONS[s.emotion]?.label ?? s.emotion,
          color: EMOTIONS[s.emotion]?.color ?? "#d1d5db",
          date: new Date(s.created_at).toLocaleDateString("en-MY", { day: "numeric", month: "short" }),
        }));

        const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: Array<{ payload: typeof chartData[0] }> }) => {
          if (!active || !payload?.length) return null;
          const d = payload[0].payload;
          const e = EMOTIONS[d.emotion];
          return (
            <div className="bg-white border border-gray-200 rounded-xl px-3 py-2 shadow-lg text-xs">
              <p className="font-bold text-gray-800 mb-0.5">Session #{d.session}</p>
              <p style={{ color: e?.color }} className="font-semibold flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ backgroundColor: e?.color }} />
                {e?.label}
              </p>
              <p className="text-gray-400">{d.date}</p>
            </div>
          );
        };

        return (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wide">
                Emotion Timeline
              </h2>
              <span className="text-xs text-gray-400">last {count} sessions · oldest → newest</span>
            </div>

            <ResponsiveContainer width="100%" height={200}>
              <ScatterChart margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 10, fill: "#9ca3af" }}
                  interval="preserveStartEnd"
                />
                <YAxis
                  dataKey="value"
                  domain={[-0.4, 3.4]}
                  ticks={[0, 1, 2, 3]}
                  tickFormatter={(v: number) => EMOTION_LABEL[v] ?? ""}
                  tick={{ fontSize: 11, fill: "#6b7280" }}
                  width={80}
                />
                {[0, 1, 2, 3].map((v) => (
                  <ReferenceLine
                    key={v}
                    y={v}
                    stroke={Object.values(EMOTIONS)[3 - v]?.color + "40"}
                    strokeDasharray="4 4"
                  />
                ))}
                <Tooltip content={<CustomTooltip />} />
                <Scatter
                  data={chartData}
                  shape={(props: { cx?: number; cy?: number; payload?: typeof chartData[0] }) => {
                    const { cx, cy, payload } = props;
                    if (cx == null || cy == null || !payload) return <g />;
                    return (
                      <circle
                        cx={cx} cy={cy} r={8}
                        fill={payload.color}
                        stroke="#fff"
                        strokeWidth={2.5}
                      />
                    );
                  }}
                />
              </ScatterChart>
            </ResponsiveContainer>

            {/* Legend */}
            <div className="flex flex-wrap gap-4 justify-center mt-4">
              {Object.entries(EMOTIONS).map(([key, em]) => (
                <div key={key} className="flex items-center gap-1.5 text-xs text-gray-500">
                  <EmotionIcon emotion={key} size={15} />
                  {em.label}
                </div>
              ))}
            </div>
          </div>
        );
      })()}

      </>
      )}

      {/* All Sessions — Photo Gallery */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden mb-6">
        <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
          <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wide">
            {showAllSessions ? "All Sessions" : "Recent Sessions"}
            <span className="ml-2 font-normal text-gray-400 normal-case">({sketches.length})</span>
          </h2>
          <div className="flex items-center gap-3">
            {role === "admin" && (
              <span className="text-xs text-red-400 font-medium flex items-center gap-1">
                <Trash2 size={12} /> Admin can delete
              </span>
            )}
            {sketches.length > 3 && (
              <button
                onClick={() => setShowAllSessions(v => !v)}
                className="text-xs font-bold text-[#e13d7d] hover:underline"
              >
                {showAllSessions ? "Show Less" : `See All (${sketches.length})`}
              </button>
            )}
          </div>
        </div>

        {sketches.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-gray-400">
            <NotebookPen size={32} className="mb-3 opacity-30" />
            <p className="font-medium text-gray-500">No sessions recorded yet</p>
            <p className="text-xs mt-1">Sessions will appear here once the child submits drawings.</p>
          </div>
        ) : (
          <>
          <div className="p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {(showAllSessions ? sketches : sketches.slice(0, 3)).map((sketch) => {
              const e = EMOTIONS[sketch.emotion];
              const sessionNum = sketches.length - sketches.indexOf(sketch);
              const fallbackDesc = `A ${e?.label.toLowerCase()} emotion was detected in this drawing session. Tap to see the full breakdown.`;
              return (
                <div
                  key={sketch.id}
                  onClick={() => setSelectedSketch(sketch)}
                  className="group bg-white rounded-2xl overflow-hidden border border-gray-200 shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer flex flex-col"
                >
                  {/* Image */}
                  <div className="relative aspect-[16/10] bg-gray-100 overflow-hidden flex-shrink-0">
                    {sketch.image_url ? (
                      <img
                        src={sketch.image_url}
                        alt={e?.label}
                        className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-300"
                      />
                    ) : (
                      <div
                        className="w-full h-full flex items-center justify-center"
                        style={{ backgroundColor: e?.color + "18" }}
                      >
                        <span
                          className="w-14 h-14 rounded-2xl flex items-center justify-center text-xl font-black text-white"
                          style={{ backgroundColor: e?.color }}
                        >
                          {e?.label.charAt(0)}
                        </span>
                      </div>
                    )}
                    {/* Session # badge */}
                    <span className="absolute top-2 left-2 text-[10px] font-bold bg-black/40 text-white px-2 py-0.5 rounded-full">
                      #{sessionNum}
                    </span>
                    {/* Admin delete */}
                    {role === "admin" && (
                      <button
                        onClick={(ev) => { ev.stopPropagation(); deleteSketch(sketch); }}
                        disabled={deletingId === sketch.id}
                        className="absolute top-2 right-2 p-1.5 rounded-full bg-red-500 text-white opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-50 shadow"
                        title="Delete"
                      >
                        {deletingId === sketch.id
                          ? <Loader2 size={10} className="animate-spin" />
                          : <Trash2 size={10} />}
                      </button>
                    )}
                  </div>

                  {/* Content */}
                  <div className="p-4 flex flex-col flex-1">
                    {/* Emotion tag */}
                    <span
                      className="text-[11px] font-black uppercase tracking-widest mb-2"
                      style={{ color: e?.color }}
                    >
                      {e?.label}
                    </span>

                    {/* Session title */}
                    <h3 className="text-sm font-bold text-gray-900 mb-1.5 leading-snug">
                      Drawing Session #{sessionNum}
                    </h3>

                    {/* Description */}
                    <p className="text-xs text-gray-500 leading-relaxed line-clamp-2 flex-1">
                      {sketch.therapist_message || fallbackDesc}
                    </p>

                    {/* Footer */}
                    <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
                      <div className="flex items-center gap-2">
                        <span
                          className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black text-white flex-shrink-0"
                          style={{ backgroundColor: e?.color }}
                        >
                          {e?.label.charAt(0)}
                        </span>
                        <span className="text-xs text-gray-400">
                          {new Date(sketch.created_at).toLocaleDateString("en-MY", {
                            day: "numeric", month: "short", year: "numeric",
                          })}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        {sketch.status === "verified" && (
                          <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                            <Check size={9} /> Verified
                          </span>
                        )}
                        <span className="text-[11px] font-bold text-gray-500 group-hover:text-[#e13d7d] transition-colors flex items-center gap-1">
                          <ZoomIn size={12} /> View
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          {!showAllSessions && sketches.length > 3 && (
            <div className="px-5 pb-5">
              <button
                onClick={() => setShowAllSessions(true)}
                className="w-full py-3 rounded-xl border border-gray-200 text-sm font-semibold text-gray-500 hover:border-[#e13d7d] hover:text-[#e13d7d] transition-colors bg-gray-50 hover:bg-pink-50"
              >
                See All {sketches.length} Sessions
              </button>
            </div>
          )}
          </>
        )}
      </div>

      {/* Lightbox */}
      {selectedSketch && (() => {
        const e = EMOTIONS[selectedSketch.emotion];
        const idx = sketches.findIndex(s => s.id === selectedSketch.id);
        const sessionNum = sketches.length - idx;

        const rawScores: Record<string, number | null | undefined> = {
          happy:   selectedSketch.scores?.happy   ?? selectedSketch.happy,
          sad:     selectedSketch.scores?.sad     ?? selectedSketch.sad,
          angry:   selectedSketch.scores?.angry   ?? selectedSketch.angry,
          anxious: selectedSketch.scores?.anxious ?? selectedSketch.anxious,
        };
        const hasBreakdown = Object.values(rawScores).some(v => v != null && v > 0);
        const maxVal = Math.max(...Object.values(rawScores).map(v => v ?? 0), 1);
        const fallbackPct = selectedSketch.score != null
          ? (selectedSketch.score <= 1 ? Math.round((selectedSketch.score as number) * 100) : Math.round(selectedSketch.score as number))
          : 100;

        return (
          <div
            className="fixed inset-0 bg-black/75 z-50 flex items-center justify-center p-4 backdrop-blur-sm"
            onClick={() => setSelectedSketch(null)}
          >
            <div
              className="bg-white rounded-3xl overflow-hidden w-full max-w-4xl shadow-2xl flex max-h-[90vh]"
              onClick={ev => ev.stopPropagation()}
            >
              {/* ── Left: Drawing Panel ── */}
              <div className="relative w-2/5 flex-shrink-0 bg-gray-950 flex items-center justify-center overflow-hidden">
                {selectedSketch.image_url ? (
                  <img
                    src={selectedSketch.image_url}
                    alt={e?.label}
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <div
                    className="w-full h-full flex flex-col items-center justify-center gap-4"
                    style={{ backgroundColor: e?.color + "22" }}
                  >
                    <span
                      className="w-24 h-24 rounded-3xl flex items-center justify-center text-4xl font-black text-white shadow-lg"
                      style={{ backgroundColor: e?.color }}
                    >
                      {e?.label.charAt(0)}
                    </span>
                    <span className="text-sm text-gray-400">No drawing saved</span>
                  </div>
                )}

                {/* Gradient overlay at bottom */}
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent px-5 py-4">
                  <EmotionBadge emotion={selectedSketch.emotion} />
                  <p className="text-white/70 text-xs mt-1">Session #{sessionNum}</p>
                </div>

                {/* Session # badge top-left */}
                <span className="absolute top-3 left-3 text-[10px] font-bold bg-black/40 text-white px-2 py-1 rounded-full backdrop-blur-sm">
                  #{sessionNum}
                </span>

                {/* Admin delete top-right */}
                {role === "admin" && (
                  <button
                    onClick={() => { setSelectedSketch(null); deleteSketch(selectedSketch); }}
                    disabled={deletingId === selectedSketch.id}
                    className="absolute top-3 right-3 p-2 rounded-full bg-red-500 text-white disabled:opacity-50 shadow-lg hover:bg-red-600 transition-colors"
                    title="Delete session"
                  >
                    {deletingId === selectedSketch.id
                      ? <Loader2 size={13} className="animate-spin" />
                      : <Trash2 size={13} />}
                  </button>
                )}
              </div>

              {/* ── Right: Content Panel ── */}
              <div className="flex-1 flex flex-col min-h-0">
                {/* Header */}
                <div className="flex items-start justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0">
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">Drawing Session #{sessionNum}</h3>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {new Date(selectedSketch.created_at).toLocaleDateString("en-MY", {
                        weekday: "long", day: "numeric", month: "long", year: "numeric",
                      })}
                      {" · "}
                      {new Date(selectedSketch.created_at).toLocaleTimeString("en-MY", { hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                  <button
                    onClick={() => setSelectedSketch(null)}
                    className="p-1.5 rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors flex-shrink-0 ml-4"
                  >
                    <X size={18} />
                  </button>
                </div>

                {/* Scrollable body */}
                <div className="overflow-y-auto flex-1 px-6 py-5 space-y-6">

                  {/* Session Result */}
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-widest text-gray-400 mb-3">Signal Intensity</p>
                    {hasBreakdown ? (
                      <div className="space-y-3">
                        {Object.entries(EMOTIONS).map(([key, em]) => {
                          const raw = rawScores[key] ?? 0;
                          const barPct = Math.round(((raw as number) / maxVal) * 100);
                          const isDominant = key === selectedSketch.emotion;
                          return (
                            <div key={key}>
                              <div className="flex items-center justify-between mb-1">
                                <span
                                  className="text-sm flex items-center gap-1.5"
                                  style={{ color: isDominant ? em.color : undefined, fontWeight: isDominant ? 700 : 400 }}
                                >
                                  <EmotionIcon emotion={key} size={16} />
                                  {em.label}
                                  {isDominant && (
                                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full text-white" style={{ backgroundColor: em.color }}>
                                      top
                                    </span>
                                  )}
                                </span>
                                <span className="text-sm font-bold" style={{ color: isDominant ? em.color : "#6b7280" }}>
                                  {raw ?? 0} pts
                                </span>
                              </div>
                              <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                                <div
                                  className="h-full rounded-full transition-all duration-700"
                                  style={{ width: `${barPct}%`, backgroundColor: em.color, opacity: isDominant ? 1 : 0.55 }}
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div
                        className="rounded-2xl p-5 flex items-center gap-4"
                        style={{ background: `linear-gradient(135deg, ${e?.color}18, ${e?.color}35)`, border: `1.5px solid ${e?.color}40` }}
                      >
                        <div
                          className="w-14 h-14 rounded-2xl flex items-center justify-center text-xl font-black text-white flex-shrink-0"
                          style={{ backgroundColor: e?.color }}
                        >
                          {e?.label.charAt(0)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[10px] font-bold uppercase tracking-widest mb-0.5" style={{ color: e?.color }}>Detected Emotion</p>
                          <p className="text-2xl font-black text-gray-900">{e?.label}</p>
                          <div className="mt-1.5">
                            <div className="flex justify-between text-xs mb-1">
                              <span className="text-gray-500">Confidence</span>
                              <span className="font-bold" style={{ color: e?.color }}>{fallbackPct}%</span>
                            </div>
                            <div className="h-1.5 bg-white/60 rounded-full overflow-hidden">
                              <div className="h-full rounded-full" style={{ width: `${fallbackPct}%`, backgroundColor: e?.color }} />
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Therapist Notes */}
                  <div className="border-t border-gray-100 pt-5">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-[11px] font-bold uppercase tracking-widest text-gray-400 flex items-center gap-1.5">
                        <NotebookPen size={12} />
                        Therapist Notes
                      </p>
                      {noteSaved && (
                        <span className="text-[11px] text-green-600 font-semibold flex items-center gap-1">
                          <Check size={11} /> Saved
                        </span>
                      )}
                    </div>
                    {(role === "therapist" || role === "admin") ? (
                      <>
                        <textarea
                          value={noteText}
                          onChange={ev => { setNoteText(ev.target.value); setNoteSaved(false); }}
                          placeholder="Add your clinical observations about this session..."
                          rows={4}
                          className="w-full text-sm text-gray-700 border border-gray-200 rounded-xl px-3 py-2.5 resize-none focus:outline-none focus:ring-2 focus:ring-pink-300 placeholder:text-gray-300 leading-relaxed"
                        />
                        <button
                          onClick={saveNote}
                          disabled={savingNote}
                          className="mt-2 w-full py-2.5 rounded-xl text-sm font-semibold bg-[#e13d7d] text-white hover:bg-pink-600 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
                        >
                          {savingNote
                            ? <><Loader2 size={14} className="animate-spin" /> Saving...</>
                            : <><Check size={14} /> Save Note</>}
                        </button>

                        {/* Status progression button */}
                        {selectedSketch.status === "verified" ? (
                          <div className="mt-2 w-full py-2.5 rounded-xl text-sm font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center justify-center gap-2 cursor-default">
                            <Check size={14} /> Verified
                          </div>
                        ) : selectedSketch.status === "reviewing" ? (
                          <button
                            onClick={() => updateSketchStatus("verified")}
                            disabled={verifying}
                            className="mt-2 w-full py-2.5 rounded-xl text-sm font-semibold bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
                          >
                            {verifying
                              ? <><Loader2 size={14} className="animate-spin" /> Updating...</>
                              : <><Check size={14} /> Mark as Verified</>}
                          </button>
                        ) : (
                          <button
                            onClick={() => updateSketchStatus("reviewing")}
                            disabled={verifying}
                            className="mt-2 w-full py-2.5 rounded-xl text-sm font-semibold bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
                          >
                            {verifying
                              ? <><Loader2 size={14} className="animate-spin" /> Updating...</>
                              : <><Check size={14} /> Set to In Review</>}
                          </button>
                        )}
                      </>
                    ) : selectedSketch.therapist_notes ? (
                      <p className="text-sm text-gray-700 leading-relaxed">{selectedSketch.therapist_notes}</p>
                    ) : (
                      <p className="text-sm text-gray-400 italic">No notes added yet.</p>
                    )}
                  </div>

                  {/* HTP Clinical Observations — therapist & admin only */}
                  {(role === "therapist" || role === "admin") &&
                    selectedSketch.htp_features &&
                    selectedSketch.htp_features.length > 0 && (
                    <div className="border-t border-gray-100 pt-5">
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-2 h-2 rounded-full bg-purple-500" />
                        <p className="text-[11px] font-bold uppercase tracking-widest text-gray-400">
                          Clinical Observations (HTP/DAP)
                        </p>
                      </div>
                      <div className="space-y-2">
                        {selectedSketch.htp_features.map((f, i) => {
                          const severityColor =
                            f.severity >= 7
                              ? { dot: "bg-red-500", badge: "bg-red-50 text-red-700 border-red-200" }
                              : f.severity >= 4
                              ? { dot: "bg-amber-400", badge: "bg-amber-50 text-amber-700 border-amber-200" }
                              : { dot: "bg-green-500", badge: "bg-green-50 text-green-700 border-green-200" };
                          return (
                            <div key={i} className="rounded-xl border border-gray-100 bg-gray-50 p-3">
                              <div className="flex items-center justify-between mb-1.5">
                                <div className="flex items-center gap-1.5">
                                  <span className={`w-2 h-2 rounded-full flex-shrink-0 ${severityColor.dot}`} />
                                  <span className="text-[11px] font-bold text-gray-600 uppercase tracking-wide">{f.category}</span>
                                </div>
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${severityColor.badge}`}>
                                  {f.severity}/10
                                </span>
                              </div>
                              <p className="text-xs font-semibold text-gray-800 mb-0.5">{f.observation}</p>
                              <p className="text-xs text-gray-400 italic leading-relaxed">{f.interpretation}</p>
                            </div>
                          );
                        })}
                      </div>
                      <p className="text-[10px] text-gray-300 mt-3 text-center italic">
                        For clinical reference only · Not a diagnosis
                      </p>
                    </div>
                  )}

                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Personality Notes */}
      {patient.personality && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wide mb-3">Therapy Notes</h2>
          <p className="text-sm text-gray-600 leading-relaxed">{patient.personality}</p>
        </div>
      )}

      {/* ── Schedule Event Modal ── */}
      {showScheduleModal && (
        <div
          className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm"
          onClick={() => setShowScheduleModal(false)}
        >
          <div
            className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            {/* Modal header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-indigo-50">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-indigo-600 flex items-center justify-center">
                  <CalendarPlus size={16} className="text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 text-sm">Schedule Event</h3>
                  <p className="text-xs text-gray-500">for {patient.full_name.split(" ")[0]}</p>
                </div>
              </div>
              <button
                onClick={() => setShowScheduleModal(false)}
                className="p-1.5 rounded-full hover:bg-gray-100 text-gray-400 transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            {/* Form */}
            <div className="px-6 py-5 space-y-4">
              {/* Title */}
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">
                  Event Title *
                </label>
                <input
                  type="text"
                  value={scheduleForm.title}
                  onChange={e => setScheduleForm(f => ({ ...f, title: e.target.value }))}
                  placeholder="e.g. Weekly therapy session"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-300 placeholder:text-gray-300"
                />
              </div>

              {/* Event Type */}
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">
                  Event Type
                </label>
                <select
                  value={scheduleForm.event_type}
                  onChange={e => setScheduleForm(f => ({ ...f, event_type: e.target.value as any }))}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white"
                >
                  <option value="appointment">Appointment</option>
                  <option value="homework_prompt">Homework</option>
                  <option value="check_in">Check-in</option>
                </select>
              </div>

              {/* Date & Time row */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">
                    Date
                  </label>
                  <input
                    type="date"
                    value={scheduleForm.date}
                    onChange={e => setScheduleForm(f => ({ ...f, date: e.target.value }))}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-300"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">
                    Time
                  </label>
                  <input
                    type="time"
                    value={scheduleForm.time}
                    onChange={e => setScheduleForm(f => ({ ...f, time: e.target.value }))}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-300"
                  />
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">
                  Description <span className="normal-case font-normal">(optional)</span>
                </label>
                <textarea
                  value={scheduleForm.description}
                  onChange={e => setScheduleForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="Add any notes for the parent..."
                  rows={3}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-800 resize-none focus:outline-none focus:ring-2 focus:ring-indigo-300 placeholder:text-gray-300 leading-relaxed"
                />
              </div>

              {/* Send notification toggle */}
              <label className="flex items-center gap-3 cursor-pointer p-3 rounded-xl bg-indigo-50 border border-indigo-100">
                <input
                  type="checkbox"
                  checked={scheduleForm.send_notification}
                  onChange={e => setScheduleForm(f => ({ ...f, send_notification: e.target.checked }))}
                  className="w-4 h-4 rounded accent-indigo-600 cursor-pointer"
                />
                <div>
                  <p className="text-sm font-semibold text-gray-800">Send push notification to parent</p>
                  <p className="text-xs text-gray-500 mt-0.5">Parent will receive a notification on their phone</p>
                </div>
              </label>
            </div>

            {/* Footer */}
            <div className="px-6 pb-6">
              {scheduleSuccess ? (
                <div className="w-full py-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm font-semibold flex items-center justify-center gap-2">
                  <Check size={16} /> Event scheduled!
                </div>
              ) : (
                <button
                  onClick={createEvent}
                  disabled={schedulingEvent || !scheduleForm.title.trim()}
                  className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {schedulingEvent
                    ? <><Loader2 size={15} className="animate-spin" /> Scheduling...</>
                    : <><Send size={15} /> Schedule Event</>}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
