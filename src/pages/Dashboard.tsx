import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import {
  Users, TrendingUp, AlertTriangle, ArrowRight,
  CalendarDays, Clock, ChevronRight, UserCheck, Activity,
  GraduationCap, Bell, Brain,
} from "lucide-react";
import { EmotionIcon } from "../components/EmotionIcon";
import CalendarWidget from "../components/CalendarWidget";

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
  const [profileIncomplete, setProfileIncomplete] = useState(false);
  const [incompleteTherapistCount, setIncompleteTherapistCount] = useState(0);
  const [myUserId, setMyUserId] = useState("");

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setMyUserId(user.id);

    const { data: prof } = await supabase
      .from("profiles").select("full_name, role").eq("id", user.id).single();
    const role = (prof?.role ?? "user").toLowerCase() as Role;
    setProfile({ full_name: prof?.full_name ?? "User", role });

    let pQuery = supabase.from("patients")
      .select("id, full_name, age, gender, total_sketches, status, therapist_id")
      .order("full_name");
    if (role === "therapist") pQuery = pQuery.eq("therapist_id", user.id);
    if (role === "user") pQuery = pQuery.eq("guardian_id", user.id);
    const { data: pData } = await pQuery;
    const pts: Patient[] = pData ?? [];
    setPatients(pts);

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

    if (role === "admin") {
      const { count } = await supabase.from("profiles").select("id", { count: "exact", head: true });
      setUserCount(count ?? 0);

      const { data: allTherapists } = await supabase
        .from("profiles").select("id").eq("role", "therapist");
      if (allTherapists && allTherapists.length > 0) {
        const ids = allTherapists.map(t => t.id);
        const { data: filled } = await supabase
          .from("therapist_profiles")
          .select("id")
          .in("id", ids)
          .not("professional_title", "is", null)
          .not("license_number", "is", null);
        setIncompleteTherapistCount(allTherapists.length - (filled?.length ?? 0));
      }
    }

    if (role === "therapist") {
      const { data: tp } = await supabase
        .from("therapist_profiles")
        .select("professional_title, license_number")
        .eq("id", user.id)
        .single();
      setProfileIncomplete(!tp?.professional_title || !tp?.license_number);
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
  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-10">

      {/* ── Profile incomplete notifications ───────────────── */}
      {role === "therapist" && profileIncomplete && (
        <div className="flex items-center gap-4 bg-amber-50 border border-amber-200 rounded-2xl px-5 py-4">
          <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
            <Bell size={18} className="text-amber-600" />
          </div>
          <div className="flex-1">
            <p className="font-semibold text-amber-800">Your therapist profile is incomplete</p>
            <p className="text-sm text-amber-600">Add your qualifications and licence number so parents can verify your credentials.</p>
          </div>
          <button
            onClick={() => navigate(`/dashboard/therapists/${myUserId}`)}
            className="flex items-center gap-1.5 px-4 py-2 bg-amber-500 text-white text-sm font-semibold rounded-xl hover:bg-amber-600 transition-colors flex-shrink-0"
          >
            <GraduationCap size={14} /> Complete Profile
          </button>
        </div>
      )}

      {role === "admin" && incompleteTherapistCount > 0 && (
        <div className="flex items-center gap-4 bg-amber-50 border border-amber-200 rounded-2xl px-5 py-4">
          <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
            <Bell size={18} className="text-amber-600" />
          </div>
          <div className="flex-1">
            <p className="font-semibold text-amber-800">
              {incompleteTherapistCount} therapist{incompleteTherapistCount > 1 ? "s have" : " has"} incomplete profiles
            </p>
            <p className="text-sm text-amber-600">Remind them to fill in their qualifications and licence number.</p>
          </div>
          <button
            onClick={() => navigate("/dashboard/therapists")}
            className="flex items-center gap-1.5 px-4 py-2 bg-amber-500 text-white text-sm font-semibold rounded-xl hover:bg-amber-600 transition-colors flex-shrink-0"
          >
            <GraduationCap size={14} /> View Therapists
          </button>
        </div>
      )}

      {/* ── Top section: welcome banner (left) + stat cards (right) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Welcome card — wide left column */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 shadow-sm p-7 flex flex-col justify-between min-h-[200px]">
          <div>
            <p className="text-gray-400 text-sm flex items-center gap-2 mb-3">
              <CalendarDays size={15} /> {dateStr}
            </p>
            <h1 className="text-3xl font-bold text-gray-900">
              Welcome back, {firstName}
            </h1>
            <p className="text-gray-500 mt-2 text-sm leading-relaxed">
              {role === "therapist" && `You have ${patients.length} ${patients.length === 1 ? "child" : "children"} assigned to you.`}
              {role === "admin" && `${userCount} registered users · ${patients.length} children in the system.`}
              {role === "user" && `${patients.length} ${patients.length === 1 ? "child" : "children"} · ${totalSketches} total sketches recorded.`}
            </p>
          </div>
          <div className="mt-6 flex items-center gap-3 flex-wrap">
            <button
              onClick={() => navigate("/dashboard/children")}
              className="px-5 py-2.5 bg-[#e13d7d] text-white text-sm font-semibold rounded-xl hover:bg-pink-600 transition-colors inline-flex items-center gap-2"
            >
              View Progress <ArrowRight size={15} />
            </button>
            <div className="flex items-center gap-2 text-sm text-gray-500 bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5">
              <Clock size={15} />
              {now.toLocaleTimeString("en-MY", { hour: "2-digit", minute: "2-digit" })}
            </div>
          </div>
        </div>

        {/* Stat cards — stacked in right column */}
        <div className="flex flex-col gap-3">
          {role === "admin" && (
            <>
              <StatCard label="Total Users" value={userCount} icon={<Users size={18} />} bg="bg-blue-50" text="text-blue-600" onClick={() => navigate("/dashboard/users")} />
              <StatCard label="Total Children" value={patients.length} icon={<UserCheck size={18} />} bg="bg-pink-50" text="text-pink-600" onClick={() => navigate("/dashboard/patients")} />
              <StatCard label="Total Sketches" value={totalSketches} icon={<Brain size={18} />} bg="bg-purple-50" text="text-purple-600" />
              <StatCard label="This Week" value={weekSketches} icon={<TrendingUp size={18} />} bg="bg-green-50" text="text-green-600" />
            </>
          )}
          {role === "therapist" && (
            <>
              <StatCard label="Assigned Children" value={patients.length} icon={<Users size={18} />} bg="bg-blue-50" text="text-blue-600" onClick={() => navigate("/dashboard/patients")} />
              <StatCard label="Total Sketches" value={totalSketches} icon={<Brain size={18} />} bg="bg-pink-50" text="text-pink-600" />
              <StatCard label="This Week" value={weekSketches} icon={<Activity size={18} />} bg="bg-green-50" text="text-green-600" />
              <StatCard label="Need Attention" value={atRisk.length} icon={<AlertTriangle size={18} />} bg="bg-red-50" text="text-red-600" onClick={() => navigate("/dashboard/analytics")} />
            </>
          )}
          {role === "user" && (
            <>
              <StatCard label="My Children" value={patients.length} icon={<Users size={18} />} bg="bg-blue-50" text="text-blue-600" onClick={() => navigate("/dashboard/patients")} />
              <StatCard label="Total Sketches" value={totalSketches} icon={<Brain size={18} />} bg="bg-pink-50" text="text-pink-600" />
              <StatCard label="This Week" value={weekSketches} icon={<Activity size={18} />} bg="bg-green-50" text="text-green-600" />
              <StatCard
                label="Top Emotion"
                value={dominantEmotion ? cap(dominantEmotion) : "—"}
                icon={dominantEmotion
                  ? <EmotionIcon emotion={dominantEmotion} size={18} />
                  : <TrendingUp size={18} />}
                bg="bg-purple-50"
                text="text-purple-600"
              />
            </>
          )}
        </div>
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

      {/* ── Bottom section: activity list (left) + widgets (right) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Children overview — wide left column */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-gray-100">
            <h2 className="text-lg font-bold text-gray-900">
              {role === "user" ? "My Children" : "Children Overview"}
            </h2>
            <button
              onClick={() => navigate("/dashboard/children")}
              className="text-sm text-[#e13d7d] font-medium hover:underline flex items-center gap-1"
            >
              See all <ArrowRight size={14} />
            </button>
          </div>

          {patients.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-gray-400">
              <Users size={40} className="mb-3 opacity-30" />
              <p className="text-sm">No children found</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-6">
              {patients.slice(0, 6).map(p => {
                const lastSketch = sketches.find(s => s.patient_id === p.id);
                const sketchCount = p.total_sketches ?? 0;
                return (
                  <div
                    key={p.id}
                    onClick={() => navigate(`/dashboard/children/${p.id}`)}
                    className="border border-gray-100 rounded-xl p-4 hover:shadow-md hover:border-gray-200 transition-all cursor-pointer"
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <div
                        className={`w-11 h-11 rounded-full flex items-center justify-center text-white font-bold text-base shrink-0 ${
                          p.gender === "Female" ? "bg-pink-400" : "bg-blue-400"
                        }`}
                      >
                        {p.full_name.charAt(0)}
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-gray-900 truncate">{p.full_name}</p>
                        <p className="text-xs text-gray-400">
                          {p.age} y/o · {sketchCount} {sketchCount === 1 ? "sketch" : "sketches"}
                        </p>
                      </div>
                    </div>

                    {lastSketch ? (
                      <div className="flex items-center gap-2 pt-2 border-t border-gray-50">
                        <EmotionIcon emotion={lastSketch.emotion} size={15} />
                        <span className="text-sm font-medium" style={{ color: ECOLORS[lastSketch.emotion] }}>
                          {cap(lastSketch.emotion)}
                        </span>
                        <span className="text-xs text-gray-400 ml-auto">{timeAgo(lastSketch.created_at)}</span>
                      </div>
                    ) : (
                      <p className="text-xs text-gray-400 pt-2 border-t border-gray-50">No sessions yet</p>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {patients.length > 6 && (
            <div className="px-6 pb-5">
              <button
                onClick={() => navigate("/dashboard/children")}
                className="w-full text-sm text-gray-500 hover:text-[#e13d7d] font-medium py-2.5 border border-dashed border-gray-200 rounded-xl hover:border-pink-300 transition-colors"
              >
                +{patients.length - 6} more — View all children
              </button>
            </div>
          )}
        </div>

        {/* Right column */}
        <div className="flex flex-col gap-6">

          {/* Calendar widget */}
          <CalendarWidget />

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
      className={`bg-white rounded-xl border border-gray-200 px-5 py-4 shadow-sm flex items-center gap-4 ${onClick ? "cursor-pointer hover:shadow-md transition-shadow" : ""}`}
    >
      <div className={`w-11 h-11 rounded-xl ${bg} ${text} flex items-center justify-center flex-shrink-0`}>
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-2xl font-bold text-gray-900 leading-tight">{value}</p>
        <p className="text-sm text-gray-500 mt-0.5">{label}</p>
      </div>
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
