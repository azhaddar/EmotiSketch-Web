import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import {
  Users, Brain, TrendingUp, AlertTriangle, ArrowRight,
  CalendarDays, Clock, ChevronRight, UserCheck, Activity,
} from "lucide-react";
import { EmotionIcon } from "../components/EmotionIcon";

type Emotion = "happy" | "sad" | "angry" | "anxious";
type Role = "admin" | "therapist" | "user";

const ECOLORS: Record<Emotion, string> = {
  happy: "#F59E0B",
  sad: "#3B82F6",
  angry: "#EF4444",
  anxious: "#8B5CF6",
};

const EMOTIONS: Emotion[] = ["happy", "sad", "angry", "anxious"];

interface Patient {
  id: string; full_name: string; age: number;
  gender: string; total_sketches: number; therapist_id: string | null;
}
interface Sketch {
  id: string; patient_id: string; emotion: Emotion;
  created_at: string; image_url: string | null;
  patient_name?: string;
}
interface Profile { full_name: string; role: Role }

function cap(s: string) { return s.charAt(0).toUpperCase() + s.slice(1); }

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function thisWeekCount(sketches: Sketch[]) {
  const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;
  return sketches.filter(s => new Date(s.created_at).getTime() >= cutoff).length;
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [sketches, setSketches] = useState<Sketch[]>([]);
  const [userCount, setUserCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: prof } = await supabase
      .from("profiles").select("full_name, role").eq("id", user.id).single();
    const role = (prof?.role ?? "user").toLowerCase() as Role;
    setProfile({ full_name: prof?.full_name ?? "User", role });

    // Fetch patients based on role
    let pQuery = supabase.from("patients")
      .select("id, full_name, age, gender, total_sketches, status, therapist_id")
      .order("full_name");
    if (role === "therapist") pQuery = pQuery.eq("therapist_id", user.id);
    if (role === "user") pQuery = pQuery.eq("guardian_id", user.id);
    const { data: pData } = await pQuery;
    const pts: Patient[] = pData ?? [];
    setPatients(pts);

    // Fetch sketches with patient names
    if (pts.length > 0) {
      const ids = pts.map(p => p.id);
      const { data: sData } = await supabase
        .from("sketches")
        .select("id, patient_id, emotion, created_at, image_url")
        .in("patient_id", ids)
        .order("created_at", { ascending: false })
        .limit(50);

      const nameMap: Record<string, string> = {};
      pts.forEach(p => { nameMap[p.id] = p.full_name; });
      setSketches(
        (sData ?? []).map(s => ({ ...s, patient_name: nameMap[s.patient_id] })) as Sketch[]
      );
    }

    // Admin: get total user count
    if (role === "admin") {
      const { count } = await supabase.from("profiles").select("id", { count: "exact", head: true });
      setUserCount(count ?? 0);
    }

    setLoading(false);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-pink-500" />
      </div>
    );
  }

  const role = profile?.role ?? "user";
  const firstName = profile?.full_name?.split(" ")[0] ?? "there";
  const now = new Date();
  const dateStr = now.toLocaleDateString("en-MY", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

  // Computed values
  const totalSketches = sketches.length;
  const weekSketches = thisWeekCount(sketches);
  const emotionCounts: Record<Emotion, number> = { happy: 0, sad: 0, angry: 0, anxious: 0 };
  sketches.forEach(s => emotionCounts[s.emotion]++);
  const dominantEmotion = totalSketches > 0
    ? EMOTIONS.reduce((a, b) => emotionCounts[a] >= emotionCounts[b] ? a : b)
    : null;
  const atRisk = patients.filter(p => {
    const recent = sketches.filter(s => s.patient_id === p.id).slice(0, 3);
    return recent.length === 3 && recent.every(s => s.emotion !== "happy");
  });
  const recentSketches = sketches.slice(0, 8);

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-10">

      {/* ── Welcome header ─────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Welcome back, {firstName}
          </h1>
          <p className="text-gray-500 mt-1 flex items-center gap-2">
            <CalendarDays size={15} />
            {dateStr}
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-500 bg-white border border-gray-200 rounded-xl px-4 py-2 shadow-sm">
          <Clock size={15} />
          {now.toLocaleTimeString("en-MY", { hour: "2-digit", minute: "2-digit" })}
        </div>
      </div>

      {/* ── Stat cards ─────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {role === "admin" && (
          <>
            <StatCard label="Total Users" value={userCount} icon={<Users size={20} />} bg="bg-blue-50" text="text-blue-600" onClick={() => navigate("/dashboard/users")} />
            <StatCard label="Total Children" value={patients.length} icon={<UserCheck size={20} />} bg="bg-pink-50" text="text-pink-600" onClick={() => navigate("/dashboard/patients")} />
            <StatCard label="Total Sketches" value={totalSketches} icon={<Brain size={20} />} bg="bg-purple-50" text="text-purple-600" />
            <StatCard label="This Week" value={weekSketches} icon={<TrendingUp size={20} />} bg="bg-green-50" text="text-green-600" />
          </>
        )}
        {role === "therapist" && (
          <>
            <StatCard label="Assigned Children" value={patients.length} icon={<Users size={20} />} bg="bg-blue-50" text="text-blue-600" onClick={() => navigate("/dashboard/patients")} />
            <StatCard label="Total Sketches" value={totalSketches} icon={<Brain size={20} />} bg="bg-pink-50" text="text-pink-600" />
            <StatCard label="This Week" value={weekSketches} icon={<Activity size={20} />} bg="bg-green-50" text="text-green-600" />
            <StatCard label="Need Attention" value={atRisk.length} icon={<AlertTriangle size={20} />} bg="bg-red-50" text="text-red-600" onClick={() => navigate("/dashboard/analytics")} />
          </>
        )}
        {role === "user" && (
          <>
            <StatCard label="My Children" value={patients.length} icon={<Users size={20} />} bg="bg-blue-50" text="text-blue-600" onClick={() => navigate("/dashboard/patients")} />
            <StatCard label="Total Sketches" value={totalSketches} icon={<Brain size={20} />} bg="bg-pink-50" text="text-pink-600" />
            <StatCard label="This Week" value={weekSketches} icon={<Activity size={20} />} bg="bg-green-50" text="text-green-600" />
            <StatCard
              label="Top Emotion"
              value={dominantEmotion ? cap(dominantEmotion) : "—"}
              icon={dominantEmotion
                ? <EmotionIcon emotion={dominantEmotion} size={20} />
                : <TrendingUp size={20} />}
              bg="bg-purple-50"
              text="text-purple-600"
            />
          </>
        )}
      </div>

      {/* ── At-risk alert (therapist/admin) ────────────────── */}
      {(role === "therapist" || role === "admin") && atRisk.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-5 flex items-start gap-4">
          <div className="p-2 bg-red-100 rounded-lg mt-0.5">
            <AlertTriangle size={20} className="text-red-600" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-red-800">
              {atRisk.length} {atRisk.length === 1 ? "child needs" : "children need"} attention
            </h3>
            <p className="text-sm text-red-600 mt-0.5">
              {atRisk.map(p => p.full_name).join(", ")} — last 3 sessions all negative emotions
            </p>
          </div>
          <button
            onClick={() => navigate("/dashboard/analytics")}
            className="text-sm font-semibold text-red-700 hover:text-red-900 flex items-center gap-1 shrink-0"
          >
            View <ChevronRight size={16} />
          </button>
        </div>
      )}

      {/* ── Main content grid ───────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Recent activity — wide column */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-gray-100">
            <h2 className="text-lg font-bold text-gray-900">Recent Activity</h2>
            <button
              onClick={() => navigate("/dashboard/children")}
              className="text-sm text-[#e13d7d] font-medium hover:underline flex items-center gap-1"
            >
              View all <ArrowRight size={14} />
            </button>
          </div>

          {recentSketches.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-gray-400">
              <Brain size={40} className="mb-3 opacity-30" />
              <p className="text-sm">No sketches yet</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {recentSketches.map(s => (
                <div key={s.id} className="flex items-center gap-4 px-6 py-4 hover:bg-gray-50 transition-colors">
                  {/* Emotion avatar or image */}
                  {s.image_url ? (
                    <img
                      src={s.image_url}
                      alt="sketch"
                      className="w-12 h-12 rounded-lg object-cover shrink-0"
                    />
                  ) : (
                    <div
                      className="w-12 h-12 rounded-lg flex items-center justify-center shrink-0 text-base font-black text-white"
                      style={{ backgroundColor: ECOLORS[s.emotion] }}
                    >
                      {cap(s.emotion).charAt(0)}
                    </div>
                  )}

                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 truncate">
                      {s.patient_name ?? "Unknown"}
                    </p>
                    <p className="text-sm text-gray-400 mt-0.5">
                      {new Date(s.created_at).toLocaleDateString("en-MY", {
                        day: "numeric", month: "short", year: "numeric",
                      })}
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    <span
                      className="px-3 py-1 rounded-full text-xs font-semibold text-white shrink-0"
                      style={{ backgroundColor: ECOLORS[s.emotion] }}
                    >
                      {cap(s.emotion)}
                    </span>
                    <span className="text-xs text-gray-400 shrink-0">{timeAgo(s.created_at)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right column */}
        <div className="flex flex-col gap-6">

          {/* Emotion breakdown */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Emotion Breakdown</h2>
            {totalSketches === 0 ? (
              <p className="text-sm text-gray-400 text-center py-6">No data yet</p>
            ) : (
              <div className="space-y-3">
                {EMOTIONS.map(e => {
                  const count = emotionCounts[e];
                  const pct = Math.round((count / totalSketches) * 100);
                  return (
                    <div key={e}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm text-gray-600 flex items-center gap-2">
                          <EmotionIcon emotion={e} size={16} />
                          {cap(e)}
                        </span>
                        <span className="text-sm font-semibold text-gray-800">
                          {count} <span className="font-normal text-gray-400">({pct}%)</span>
                        </span>
                      </div>
                      <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{ width: `${pct}%`, backgroundColor: ECOLORS[e] }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Children quick list */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-900">
                {role === "user" ? "My Children" : "Children"}
              </h2>
              <button
                onClick={() => navigate("/dashboard/children")}
                className="text-sm text-[#e13d7d] font-medium hover:underline"
              >
                See all
              </button>
            </div>

            {patients.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-8">No children found</p>
            ) : (
              <div className="divide-y divide-gray-50">
                {patients.slice(0, 5).map(p => {
                  const lastSketch = sketches.find(s => s.patient_id === p.id);
                  return (
                    <button
                      key={p.id}
                      onClick={() => navigate(`/dashboard/children/${p.id}`)}
                      className="w-full flex items-center gap-3 px-5 py-3 hover:bg-gray-50 transition-colors text-left"
                    >
                      <div
                        className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold text-white shrink-0 ${
                          p.gender === "Female" ? "bg-pink-400" : "bg-blue-400"
                        }`}
                      >
                        {p.full_name.charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{p.full_name}</p>
                        <p className="text-xs text-gray-400">{p.age} y/o · {p.total_sketches ?? 0} sketches</p>
                      </div>
                      {lastSketch && (
                        <EmotionIcon emotion={lastSketch.emotion} size={22} />
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Quick links */}
          <div className="bg-gradient-to-br from-pink-500 to-purple-600 rounded-xl p-5 text-white">
            <h3 className="font-bold text-lg mb-1">Quick Actions</h3>
            <p className="text-white/80 text-sm mb-4">Jump to what matters</p>
            <div className="flex flex-col gap-2">
              <QuickLink label="Children Progress" onClick={() => navigate("/dashboard/children")} />
              {(role === "therapist" || role === "admin") && (
                <QuickLink label="Analytics Dashboard" onClick={() => navigate("/dashboard/analytics")} />
              )}
              {role === "admin" && (
                <QuickLink label="Manage Users" onClick={() => navigate("/dashboard/users")} />
              )}
              {(role === "therapist" || role === "admin") && (
                <QuickLink label="All Children" onClick={() => navigate("/dashboard/patients")} />
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

function StatCard({
  label, value, icon, bg, text, onClick,
}: {
  label: string; value: string | number;
  icon: React.ReactNode; bg: string; text: string;
  onClick?: () => void;
}) {
  return (
    <div
      onClick={onClick}
      className={`bg-white rounded-xl border border-gray-200 p-5 shadow-sm ${onClick ? "cursor-pointer hover:shadow-md transition-shadow" : ""}`}
    >
      <div className={`inline-flex p-2 rounded-lg ${bg} ${text} mb-3`}>{icon}</div>
      <p className="text-sm text-gray-500 font-medium">{label}</p>
      <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
    </div>
  );
}

function QuickLink({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center justify-between w-full bg-white/15 hover:bg-white/25 transition-colors rounded-lg px-4 py-2.5 text-sm font-medium text-white"
    >
      {label}
      <ChevronRight size={16} />
    </button>
  );
}
