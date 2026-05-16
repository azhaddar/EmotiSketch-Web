import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line,
} from "recharts";
import { Users, Brain, TrendingUp, AlertTriangle } from "lucide-react";
import { EmotionIcon } from "../components/EmotionIcon";

type Emotion = "happy" | "sad" | "angry" | "anxious";

const ECOLORS: Record<Emotion, string> = {
  happy: "#F59E0B",
  sad: "#3B82F6",
  angry: "#EF4444",
  anxious: "#8B5CF6",
};

const EMOTIONS: Emotion[] = ["happy", "sad", "angry", "anxious"];

interface Patient {
  id: string;
  full_name: string;
  age: number;
  gender: string;
}

interface Sketch {
  id: string;
  patient_id: string;
  emotion: Emotion;
  created_at: string;
}

function zeroCounts() {
  return { happy: 0, sad: 0, angry: 0, anxious: 0 };
}

function cap(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export default function TherapistAnalytics() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [sketches, setSketches] = useState<Sketch[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    let q = supabase.from("patients").select("id, full_name, age, gender");
    if (profile?.role === "therapist") q = q.eq("therapist_id", user.id);

    const { data: pData } = await q;
    const pts: Patient[] = pData ?? [];
    setPatients(pts);

    if (pts.length > 0) {
      const ids = pts.map((p) => p.id);
      const { data: sData } = await supabase
        .from("sketches")
        .select("id, patient_id, emotion, created_at")
        .in("patient_id", ids)
        .order("created_at", { ascending: false });
      setSketches((sData ?? []) as Sketch[]);
    }

    setLoading(false);
  }

  // ── Chart data computations ───────────────────────────────

  // 1. Emotion by age group
  const ageGroupData = (() => {
    const groupKeys = ["4 – 5", "6 – 7", "8 – 9", "10 – 11", "12 – 13", "14+"];
    const groups: Record<string, ReturnType<typeof zeroCounts>> = {};
    groupKeys.forEach((k) => (groups[k] = zeroCounts()));

    function getGroup(age: number) {
      if (age <= 5) return "4 – 5";
      if (age <= 7) return "6 – 7";
      if (age <= 9) return "8 – 9";
      if (age <= 11) return "10 – 11";
      if (age <= 13) return "12 – 13";
      return "14+";
    }

    sketches.forEach((s) => {
      const p = patients.find((p) => p.id === s.patient_id);
      if (!p) return;
      groups[getGroup(p.age)][s.emotion]++;
    });
    return groupKeys.map((group) => ({ group, ...groups[group] }));
  })();

  // 2. Overall pie
  const pieData = (() => {
    const totals = zeroCounts();
    sketches.forEach((s) => totals[s.emotion]++);
    return EMOTIONS.map((e) => ({
      name: cap(e),
      value: totals[e],
      color: ECOLORS[e],
    }));
  })();

  const totalSketches = sketches.length;

  // 3. 6-month trend
  const monthlyData = (() => {
    const now = new Date();
    const ordered: string[] = [];
    const map: Record<string, ReturnType<typeof zeroCounts> & { month: string }> = {};
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = d.toLocaleString("default", { month: "short", year: "2-digit" });
      map[key] = { month: key, ...zeroCounts() };
      ordered.push(key);
    }
    sketches.forEach((s) => {
      const d = new Date(s.created_at);
      const key = d.toLocaleString("default", { month: "short", year: "2-digit" });
      if (map[key]) map[key][s.emotion]++;
    });
    return ordered.map((k) => map[k]);
  })();

  // 4. Emotion by gender
  const genderData = (() => {
    const byGender: Record<string, ReturnType<typeof zeroCounts>> = {};
    patients.forEach((p) => {
      if (p.gender && !byGender[p.gender]) byGender[p.gender] = zeroCounts();
    });
    sketches.forEach((s) => {
      const p = patients.find((p) => p.id === s.patient_id);
      if (!p || !byGender[p.gender]) return;
      byGender[p.gender][s.emotion]++;
    });
    return Object.entries(byGender).map(([gender, counts]) => ({
      gender,
      ...counts,
    }));
  })();

  // 5. At-risk children (3+ negative in last 5 sessions)
  const atRisk = patients
    .map((p) => {
      const recent = sketches.filter((s) => s.patient_id === p.id).slice(0, 5);
      const negCount = recent.filter((s) => s.emotion !== "happy").length;
      return { ...p, recent: recent.map((s) => s.emotion), negCount };
    })
    .filter((p) => p.negCount >= 3)
    .sort((a, b) => b.negCount - a.negCount);

  // Dominant emotion
  const emotionTotals = zeroCounts();
  sketches.forEach((s) => emotionTotals[s.emotion]++);
  const dominant =
    totalSketches > 0
      ? (EMOTIONS.reduce((a, b) =>
          emotionTotals[a] >= emotionTotals[b] ? a : b
        ) as Emotion)
      : null;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-pink-500" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-10">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Analytics Dashboard</h1>
        <p className="text-gray-500 mt-1">
          Emotional insights across your assigned children
        </p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Assigned Children"
          value={patients.length}
          icon={<Users size={20} />}
          bg="bg-blue-50"
          text="text-blue-600"
        />
        <StatCard
          label="Total Sketches"
          value={totalSketches}
          icon={<Brain size={20} />}
          bg="bg-pink-50"
          text="text-pink-600"
        />
        <StatCard
          label="Dominant Emotion"
          value={dominant ? cap(dominant) : "—"}
          icon={<TrendingUp size={20} />}
          bg="bg-purple-50"
          text="text-purple-600"
        />
        <StatCard
          label="Need Attention"
          value={atRisk.length}
          icon={<AlertTriangle size={20} />}
          bg="bg-red-50"
          text="text-red-600"
        />
      </div>

      {/* Row 1 — Age group bar + Pie */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <ChartHeader
            title="Emotion by Age Group"
            sub="Emotions by 2-year age bands (4–5, 6–7, 8–9, 10–11, 12–13, 14+)"
          />
          {totalSketches === 0 ? (
            <Empty />
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={ageGroupData} barCategoryGap="30%">
                <CartesianGrid strokeDasharray="3 3" stroke="#f5f5f5" />
                <XAxis dataKey="group" tick={{ fontSize: 13 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                <Tooltip />
                <Legend />
                {EMOTIONS.map((e) => (
                  <Bar
                    key={e}
                    dataKey={e}
                    name={cap(e)}
                    fill={ECOLORS[e]}
                    radius={[4, 4, 0, 0]}
                  />
                ))}
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <ChartHeader
            title="Overall Distribution"
            sub="All emotions across all children"
          />
          {totalSketches === 0 ? (
            <Empty />
          ) : (
            <>
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    dataKey="value"
                    paddingAngle={3}
                  >
                    {pieData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-2 mt-3">
                {pieData.map((d) => (
                  <div
                    key={d.name}
                    className="flex items-center justify-between text-sm"
                  >
                    <div className="flex items-center gap-2">
                      <EmotionIcon emotion={d.name.toLowerCase()} size={16} />
                      <span className="text-gray-600">{d.name}</span>
                    </div>
                    <span className="font-semibold text-gray-800">
                      {totalSketches > 0
                        ? Math.round((d.value / totalSketches) * 100)
                        : 0}
                      %
                    </span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Row 2 — Monthly trend + Gender */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <ChartHeader
            title="6-Month Emotion Trend"
            sub="Track how emotions change over time"
          />
          {totalSketches === 0 ? (
            <Empty />
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f5f5f5" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                <Tooltip />
                <Legend />
                {EMOTIONS.map((e) => (
                  <Line
                    key={e}
                    type="monotone"
                    dataKey={e}
                    name={cap(e)}
                    stroke={ECOLORS[e]}
                    strokeWidth={2}
                    dot={{ r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <ChartHeader
            title="Emotion by Gender"
            sub="Compare emotional patterns between genders"
          />
          {genderData.length === 0 ? (
            <Empty />
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={genderData} barCategoryGap="35%">
                <CartesianGrid strokeDasharray="3 3" stroke="#f5f5f5" />
                <XAxis dataKey="gender" tick={{ fontSize: 13 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                <Tooltip />
                <Legend />
                {EMOTIONS.map((e) => (
                  <Bar
                    key={e}
                    dataKey={e}
                    name={cap(e)}
                    fill={ECOLORS[e]}
                    radius={[4, 4, 0, 0]}
                  />
                ))}
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* At-risk table */}
      {atRisk.length > 0 && (
        <div className="bg-white rounded-xl border border-red-100 p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-1">
            <AlertTriangle size={18} className="text-red-500" />
            <h2 className="text-lg font-bold text-gray-900">
              Children Needing Attention
            </h2>
          </div>
          <p className="text-sm text-gray-400 mb-5">
            Children with 3 or more negative emotions in their last 5 sessions
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 border-b border-gray-100">
                  <th className="pb-3 font-semibold">Name</th>
                  <th className="pb-3 font-semibold">Age</th>
                  <th className="pb-3 font-semibold">Gender</th>
                  <th className="pb-3 font-semibold">Recent Emotions</th>
                  <th className="pb-3 font-semibold">Negative / 5</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {atRisk.map((p) => (
                  <tr key={p.id}>
                    <td className="py-3 font-medium text-gray-900">
                      {p.full_name}
                    </td>
                    <td className="py-3 text-gray-600">{p.age}</td>
                    <td className="py-3 text-gray-600">{p.gender}</td>
                    <td className="py-3">
                      <div className="flex flex-wrap gap-1">
                        {p.recent.map((e, i) => (
                          <span
                            key={i}
                            className="px-2 py-0.5 rounded-full text-white text-xs font-medium"
                            style={{ backgroundColor: ECOLORS[e] }}
                          >
                            {cap(e)}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="py-3">
                      <span className="px-2 py-1 bg-red-50 text-red-600 rounded-full text-xs font-bold">
                        {p.negCount} / 5
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({
  label, value, icon, bg, text,
}: {
  label: string; value: string | number;
  icon: React.ReactNode; bg: string; text: string;
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
      <div className={`inline-flex p-2 rounded-lg ${bg} ${text} mb-3`}>
        {icon}
      </div>
      <p className="text-sm text-gray-500 font-medium">{label}</p>
      <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
    </div>
  );
}

function ChartHeader({ title, sub }: { title: string; sub: string }) {
  return (
    <div className="mb-5">
      <h2 className="text-lg font-bold text-gray-900">{title}</h2>
      <p className="text-sm text-gray-400">{sub}</p>
    </div>
  );
}

function Empty() {
  return (
    <div className="flex items-center justify-center h-48 text-gray-400 text-sm">
      No sketch data yet
    </div>
  );
}
