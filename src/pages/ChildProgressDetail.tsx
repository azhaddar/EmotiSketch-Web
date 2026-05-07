import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import {
  ArrowLeft,
  Calendar,
  NotebookPen,
  Flame,
  User,
  Loader2,
  Sparkles,
  Clock,
} from "lucide-react";

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
}

const EMOTIONS: Record<string, { label: string; color: string; bg: string; text: string; emoji: string; ring: string }> = {
  happy:   { label: "Happy",   color: "#F59E0B", bg: "bg-amber-100",  text: "text-amber-700",  emoji: "😊", ring: "ring-amber-300" },
  sad:     { label: "Sad",     color: "#3B82F6", bg: "bg-blue-100",   text: "text-blue-700",   emoji: "😢", ring: "ring-blue-300"  },
  angry:   { label: "Angry",   color: "#EF4444", bg: "bg-red-100",    text: "text-red-700",    emoji: "😠", ring: "ring-red-300"   },
  anxious: { label: "Anxious", color: "#8B5CF6", bg: "bg-purple-100", text: "text-purple-700", emoji: "😰", ring: "ring-purple-300"},
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
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${e.bg} ${e.text}`}>
      <span>{e.emoji}</span> {e.label}
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

  useEffect(() => {
    if (id) fetchData(id);
  }, [id]);

  async function fetchData(patientId: string) {
    try {
      setLoading(true);

      const { data: patientData, error: patientError } = await supabase
        .from("patients")
        .select(`*, guardian:profiles!guardian_id(full_name), therapist:profiles!therapist_id(full_name)`)
        .eq("id", patientId)
        .single();

      if (patientError) throw patientError;
      setPatient(patientData);

      const { data: sketchData } = await supabase
        .from("sketches")
        .select("id, patient_id, emotion, created_at, notes")
        .eq("patient_id", patientId)
        .order("created_at", { ascending: false });

      setSketches(sketchData || []);
    } catch (err) {
      console.error("Error loading child details:", err);
    } finally {
      setLoading(false);
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
            icon: <span className="text-lg">{dominantEmotion && dominantEmotion[1] > 0 ? EMOTIONS[dominantEmotion[0]]?.emoji : "—"}</span>,
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
                        <span className={`font-medium ${e.text}`}>{e.emoji} {e.label}</span>
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
                    <span className="w-2.5 h-2.5 rounded-sm inline-block" style={{ backgroundColor: e.color }} />
                    {e.label}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Emotion Timeline */}
      {sketches.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 mb-6">
          <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wide mb-4">
            Recent Emotion Timeline
            <span className="ml-2 text-gray-400 font-normal normal-case">(last {Math.min(sketches.length, 15)} sessions)</span>
          </h2>
          <div className="flex flex-wrap gap-2">
            {sketches.slice(0, 15).map((s, i) => {
              const e = EMOTIONS[s.emotion];
              return (
                <div
                  key={s.id}
                  title={`${e?.label} · ${new Date(s.created_at).toLocaleDateString("en-MY")}`}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold ${e?.bg} ${e?.text} ring-1 ${e?.ring} cursor-default`}
                >
                  <span>{e?.emoji}</span>
                  <span className="text-[10px] opacity-70">#{sketches.length - i}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Recent Sessions */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden mb-6">
        <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50">
          <h2 className="text-sm font-bold text-gray-700 uppercase tracking-wide">Recent Sessions</h2>
        </div>
        {sketches.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-gray-400">
            <NotebookPen size={32} className="mb-3 opacity-30" />
            <p className="font-medium text-gray-500">No sessions recorded yet</p>
            <p className="text-xs mt-1">Sessions will appear here once the child submits drawings.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {sketches.slice(0, 8).map((sketch, i) => (
              <div key={sketch.id} className="px-6 py-3 flex items-center gap-4 hover:bg-gray-50 transition-colors">
                <span className="text-xs text-gray-400 w-5 text-right">{i + 1}</span>
                <EmotionBadge emotion={sketch.emotion} />
                <span className="text-xs text-gray-400 ml-auto flex items-center gap-1">
                  <Calendar size={11} />
                  {new Date(sketch.created_at).toLocaleDateString("en-MY", {
                    day: "numeric", month: "short", year: "numeric",
                  })}
                </span>
                {sketch.notes && (
                  <p className="text-xs text-gray-500 truncate max-w-[200px]">{sketch.notes}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

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
