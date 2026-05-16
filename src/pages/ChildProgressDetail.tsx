import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
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
  [key: string]: unknown;
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

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function ChildProgressDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [patient, setPatient] = useState<Patient | null>(null);
  const [sketches, setSketches] = useState<Sketch[]>([]);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState<string>("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [selectedSketch, setSelectedSketch] = useState<Sketch | null>(null);

  useEffect(() => {
    if (id) fetchData(id);
  }, [id]);

  async function fetchData(patientId: string) {
    try {
      setLoading(true);

      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: prof } = await supabase
          .from("profiles").select("role").eq("id", user.id).single();
        setRole((prof?.role ?? "").toLowerCase());
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

  // ── Derived stats ──────────────────────────────────────────────────────────
  const emotionCounts: Record<string, number> = { happy: 0, sad: 0, angry: 0, anxious: 0 };
  sketches.forEach((s) => { if (emotionCounts[s.emotion] !== undefined) emotionCounts[s.emotion]++; });

  const dominantEmotion = Object.entries(emotionCounts).sort((a, b) => b[1] - a[1])[0];

  const lastSession = sketches[0]
    ? new Date(sketches[0].created_at).toLocaleDateString("en-MY", { day: "numeric", month: "short", year: "numeric" })
    : "No sessions yet";

  const activeDays = new Set(sketches.map((s) => new Date(s.created_at).toDateString())).size;

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
            <span
              className={`px-2 py-0.5 text-[10px] font-bold uppercase rounded-full border ${
                displayStatus === "Active"
                  ? "bg-green-100 text-green-700 border-green-200"
                  : displayStatus === "Unassigned"
                  ? "bg-yellow-100 text-yellow-700 border-yellow-200"
                  : "bg-gray-100 text-gray-500 border-gray-200"
              }`}
            >
              {displayStatus}
            </span>
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-500">
            <span className="flex items-center gap-1"><User size={13} /> {patient.age} years old · {patient.gender}</span>
            {patient.guardian?.full_name && (
              <span className="flex items-center gap-1">
                <span className="text-gray-300">|</span> Parent: <span className="text-gray-700 font-medium">{patient.guardian.full_name}</span>
              </span>
            )}
            {patient.therapist?.full_name && (
              <span className="flex items-center gap-1">
                <span className="text-gray-300">|</span> Therapist: <span className="text-gray-700 font-medium">{patient.therapist.full_name}</span>
              </span>
            )}
          </div>
        </div>

        <div className="text-right flex-shrink-0">
          <p className="text-3xl font-bold text-gray-900">{patient.total_sketches ?? 0}</p>
          <p className="text-xs text-gray-400 uppercase tracking-wide">Total Sketches</p>
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

      {/* All Sessions — Photo Gallery */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden mb-6">
        <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
          <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wide">
            All Sessions
            <span className="ml-2 font-normal text-gray-400 normal-case">({sketches.length})</span>
          </h2>
          {role === "admin" && (
            <span className="text-xs text-red-400 font-medium flex items-center gap-1">
              <Trash2 size={12} /> Admin can delete
            </span>
          )}
        </div>

        {sketches.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-gray-400">
            <NotebookPen size={32} className="mb-3 opacity-30" />
            <p className="font-medium text-gray-500">No sessions recorded yet</p>
            <p className="text-xs mt-1">Sessions will appear here once the child submits drawings.</p>
          </div>
        ) : (
          <div className="p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {sketches.map((sketch, i) => {
              const e = EMOTIONS[sketch.emotion];
              const sessionNum = sketches.length - i;
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
                      <span className="text-[11px] font-bold text-gray-500 group-hover:text-[#e13d7d] transition-colors flex items-center gap-1">
                        <ZoomIn size={12} /> View
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Lightbox */}
      {selectedSketch && (() => {
        const e = EMOTIONS[selectedSketch.emotion];
        const idx = sketches.findIndex(s => s.id === selectedSketch.id);
        const sessionNum = sketches.length - idx;

        return (
          <div
            className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
            onClick={() => setSelectedSketch(null)}
          >
            <div
              className="bg-white rounded-3xl overflow-hidden w-full max-w-sm shadow-2xl max-h-[90vh] overflow-y-auto"
              onClick={ev => ev.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 sticky top-0 bg-white z-10">
                <div className="flex items-center gap-2">
                  <EmotionBadge emotion={selectedSketch.emotion} />
                  <span className="text-xs text-gray-400">· Session #{sessionNum}</span>
                </div>
                <button
                  onClick={() => setSelectedSketch(null)}
                  className="p-1.5 rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Drawing */}
              <div className="bg-gray-50 aspect-square">
                {selectedSketch.image_url ? (
                  <img
                    src={selectedSketch.image_url}
                    alt={e?.label}
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <div
                    className="w-full h-full flex flex-col items-center justify-center gap-3"
                    style={{ backgroundColor: e?.color + "12" }}
                  >
                    <span
                      className="w-20 h-20 rounded-3xl flex items-center justify-center text-3xl font-black text-white shadow-sm"
                      style={{ backgroundColor: e?.color }}
                    >
                      {e?.label.charAt(0)}
                    </span>
                    <span className="text-xs text-gray-400">No drawing saved</span>
                  </div>
                )}
              </div>

              {/* Date row */}
              <div className="px-5 py-2.5 border-b border-gray-100 flex items-center justify-between">
                <span className="text-xs text-gray-500">
                  {new Date(selectedSketch.created_at).toLocaleDateString("en-MY", {
                    weekday: "long", day: "numeric", month: "long", year: "numeric",
                  })}
                </span>
                <span className="text-xs text-gray-400">
                  {new Date(selectedSketch.created_at).toLocaleTimeString("en-MY", { hour: "2-digit", minute: "2-digit" })}
                </span>
              </div>

              {/* Session Emotion Result */}
              <div className="px-5 pb-4">
                <p className="text-[10px] font-bold uppercase tracking-wide text-gray-400 mb-3">
                  Session Result
                </p>
                {(() => {
                  // Resolve per-emotion percentages from whichever format the mobile app stored
                  const rawScores: Record<string, number | null | undefined> = {
                    happy:   selectedSketch.scores?.happy   ?? selectedSketch.happy,
                    sad:     selectedSketch.scores?.sad     ?? selectedSketch.sad,
                    angry:   selectedSketch.scores?.angry   ?? selectedSketch.angry,
                    anxious: selectedSketch.scores?.anxious ?? selectedSketch.anxious,
                  };
                  const hasBreakdown = Object.values(rawScores).some(v => v != null && v > 0);

                  if (hasBreakdown) {
                    // Normalize: values could be 0–1 or 0–100
                    const maxVal = Math.max(...Object.values(rawScores).map(v => v ?? 0));
                    const normalize = (v: number) => maxVal <= 1 ? Math.round(v * 100) : Math.round(v);
                    return (
                      <div className="space-y-3">
                        {Object.entries(EMOTIONS).map(([key, em]) => {
                          const raw = rawScores[key] ?? 0;
                          const pct = normalize(raw as number);
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
                                  {pct}%
                                </span>
                              </div>
                              <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                                <div
                                  className="h-full rounded-full transition-all duration-700"
                                  style={{ width: `${pct}%`, backgroundColor: em.color, opacity: isDominant ? 1 : 0.55 }}
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    );
                  }

                  // Fallback: no individual scores stored — show dominant emotion only
                  const fallbackPct = selectedSketch.score != null
                    ? (selectedSketch.score <= 1 ? Math.round((selectedSketch.score as number) * 100) : Math.round(selectedSketch.score as number))
                    : 100;
                  return (
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
                  );
                })()}
              </div>

              {/* Therapist notes */}
              {selectedSketch.notes && (
                <div className="px-5 pb-4 pt-3 border-t border-gray-100">
                  <p className="text-xs text-gray-400 font-semibold uppercase mb-1">Therapist Notes</p>
                  <p className="text-sm text-gray-700 leading-relaxed">{selectedSketch.notes}</p>
                </div>
              )}

              {/* HTP Clinical Observations — therapist & admin only */}
              {(role === "therapist" || role === "admin") &&
                selectedSketch.htp_features &&
                selectedSketch.htp_features.length > 0 && (
                <div className="px-5 pb-5 pt-3 border-t border-gray-100">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-2 h-2 rounded-full bg-purple-500" />
                    <p className="text-xs font-bold uppercase tracking-wide text-gray-500">
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
                              <span className="text-[11px] font-bold text-gray-600 uppercase tracking-wide">
                                {f.category}
                              </span>
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

              {/* Admin delete */}
              {role === "admin" && (
                <div className="px-5 py-3 border-t border-gray-100">
                  <button
                    onClick={() => { setSelectedSketch(null); deleteSketch(selectedSketch); }}
                    disabled={deletingId === selectedSketch.id}
                    className="flex items-center gap-2 text-sm text-red-500 hover:text-red-700 font-medium disabled:opacity-50 transition-colors"
                  >
                    <Trash2 size={14} /> Delete this session
                  </button>
                </div>
              )}
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
    </div>
  );
}
