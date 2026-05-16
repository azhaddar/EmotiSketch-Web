import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import {
  GraduationCap, User, ChevronRight, AlertCircle,
  CheckCircle2, Search, X,
} from "lucide-react";

interface TherapistRow {
  id: string;
  full_name: string;
  email: string;
  profile: {
    professional_title: string | null;
    license_number: string | null;
    years_of_experience: number | null;
  } | null;
}

type ProfileFilter = "all" | "verified" | "incomplete";

const FILTERS: { value: ProfileFilter; label: string }[] = [
  { value: "all",        label: "All" },
  { value: "verified",   label: "Verified" },
  { value: "incomplete", label: "Incomplete" },
];

export default function TherapistList() {
  const navigate = useNavigate();
  const [therapists, setTherapists] = useState<TherapistRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [profileFilter, setProfileFilter] = useState<ProfileFilter>("all");

  useEffect(() => { fetchData(); }, []);

  async function fetchData() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from("profiles")
      .select("id, full_name, email")
      .eq("role", "therapist")
      .order("full_name");

    if (!data) { setLoading(false); return; }

    const ids = data.map(t => t.id);
    const { data: tpData } = await supabase
      .from("therapist_profiles")
      .select("id, professional_title, license_number, years_of_experience")
      .in("id", ids);

    const profileMap: Record<string, TherapistRow["profile"]> = {};
    (tpData ?? []).forEach(tp => { profileMap[tp.id] = tp; });

    setTherapists(data.map(t => ({ ...t, profile: profileMap[t.id] ?? null })));
    setLoading(false);
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return therapists.filter(t => {
      const matchSearch = !q
        || t.full_name.toLowerCase().includes(q)
        || t.email.toLowerCase().includes(q)
        || (t.profile?.professional_title ?? "").toLowerCase().includes(q);

      const complete = !!(t.profile?.professional_title && t.profile?.license_number);
      const matchFilter =
        profileFilter === "all" ||
        (profileFilter === "verified" && complete) ||
        (profileFilter === "incomplete" && !complete);

      return matchSearch && matchFilter;
    });
  }, [therapists, search, profileFilter]);

  const verifiedCount   = therapists.filter(t => t.profile?.professional_title && t.profile?.license_number).length;
  const incompleteCount = therapists.length - verifiedCount;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-pink-500" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">

      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-pink-100 to-purple-100 flex items-center justify-center">
          <GraduationCap size={20} className="text-[#e13d7d]" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Therapists</h1>
          <p className="text-sm text-gray-500">
            {therapists.length} total · {verifiedCount} verified · {incompleteCount} incomplete
          </p>
        </div>
      </div>

      {/* Search + Filter bar */}
      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        {/* Search */}
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search by name, email or title…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-8 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-300 bg-white placeholder:text-gray-400"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Profile status filter pills */}
        <div className="flex items-center gap-2 bg-gray-100 rounded-xl p-1 flex-shrink-0">
          {FILTERS.map(f => (
            <button
              key={f.value}
              onClick={() => setProfileFilter(f.value)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                profileFilter === f.value
                  ? "bg-white text-[#e13d7d] shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {f.label}
              {f.value === "verified" && (
                <span className="ml-1 text-green-500">{verifiedCount}</span>
              )}
              {f.value === "incomplete" && (
                <span className="ml-1 text-amber-500">{incompleteCount}</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Results */}
      {therapists.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <GraduationCap size={48} className="mx-auto mb-4 opacity-30" />
          <p className="font-medium">No therapist accounts found.</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <Search size={36} className="mx-auto mb-3 opacity-30" />
          <p className="font-medium text-gray-500">No results found</p>
          <p className="text-sm mt-1">Try a different name or filter</p>
          <button
            onClick={() => { setSearch(""); setProfileFilter("all"); }}
            className="mt-4 text-sm text-[#e13d7d] font-semibold hover:underline"
          >
            Clear filters
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(t => {
            const complete = !!(t.profile?.professional_title && t.profile?.license_number);
            return (
              <button
                key={t.id}
                onClick={() => navigate(`/dashboard/therapists/${t.id}`)}
                className="w-full flex items-center gap-4 bg-white border border-gray-200 rounded-2xl px-5 py-4 hover:border-pink-200 hover:shadow-md transition-all text-left"
              >
                {/* Avatar */}
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-pink-400 to-purple-500 flex items-center justify-center flex-shrink-0">
                  <User size={20} className="text-white" />
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-gray-900">{t.full_name}</p>
                  <p className="text-sm text-gray-500 truncate">
                    {t.profile?.professional_title ?? (
                      <span className="italic text-gray-400">No title added</span>
                    )}
                  </p>
                  {t.profile?.license_number ? (
                    <p className="text-xs text-purple-600 font-semibold mt-0.5">
                      {t.profile.license_number} · {t.profile.years_of_experience ?? "–"} yrs exp
                    </p>
                  ) : (
                    <p className="text-xs text-gray-400 mt-0.5">{t.email}</p>
                  )}
                </div>

                {/* Status badge */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  {complete ? (
                    <span className="flex items-center gap-1 text-xs font-semibold text-green-600 bg-green-50 px-2.5 py-1 rounded-full">
                      <CheckCircle2 size={12} /> Verified
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-xs font-semibold text-amber-600 bg-amber-50 px-2.5 py-1 rounded-full">
                      <AlertCircle size={12} /> Incomplete
                    </span>
                  )}
                  <ChevronRight size={16} className="text-gray-300" />
                </div>
              </button>
            );
          })}

          {/* Result count */}
          {(search || profileFilter !== "all") && (
            <p className="text-center text-xs text-gray-400 pt-2">
              Showing {filtered.length} of {therapists.length} therapists
            </p>
          )}
        </div>
      )}
    </div>
  );
}
