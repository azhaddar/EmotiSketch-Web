import { useState, useEffect, useMemo } from "react";
import { supabase } from "../lib/supabaseClient";
import {
  User, NotebookPen, ArrowRight, Loader2, Plus,
  Search, SlidersHorizontal, ArrowUpDown, X,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

interface Child {
  id: string;
  full_name: string;
  age: number;
  gender: string;
  total_sketches: number;
  status: string;
  therapist_id?: string | null;
}

type SortKey = "name_asc" | "name_desc" | "age_asc" | "age_desc" | "sketches_desc" | "sketches_asc";
type StatusFilter = "all" | "active" | "inactive" | "unassigned";
type GenderFilter = "all" | "Male" | "Female";

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: "name_asc",      label: "Name (A → Z)" },
  { value: "name_desc",     label: "Name (Z → A)" },
  { value: "age_asc",       label: "Age (Youngest)" },
  { value: "age_desc",      label: "Age (Oldest)" },
  { value: "sketches_desc", label: "Most Sketches" },
  { value: "sketches_asc",  label: "Fewest Sketches" },
];

const STATUS_FILTERS: { value: StatusFilter; label: string }[] = [
  { value: "all",        label: "All" },
  { value: "active",     label: "Active" },
  { value: "inactive",   label: "Inactive" },
  { value: "unassigned", label: "Unassigned" },
];

export default function ChildrenProgress() {
  const navigate = useNavigate();
  const [children, setChildren] = useState<Child[]>([]);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState("");

  // Controls
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [genderFilter, setGenderFilter] = useState<GenderFilter>("all");
  const [sortKey, setSortKey] = useState<SortKey>("name_asc");
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => { fetchChildren(); }, []);

  async function fetchChildren() {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from("profiles").select("role").eq("id", user.id).single();

      const role = profile?.role?.toLowerCase() || "user";
      setUserRole(role);

      let query = supabase.from("patients").select("*");

      if (role === "therapist") {
        query = query.eq("therapist_id", user.id);
      } else if (role === "user") {
        query = query.eq("guardian_id", user.id);
      }

      const { data, error } = await query;
      if (error) throw error;
      setChildren(data || []);
    } catch (error) {
      console.error("Error fetching children:", error);
    } finally {
      setLoading(false);
    }
  }

  const getDisplayStatus = (child: Child) =>
    !child.therapist_id ? "Unassigned" : child.status;

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Unassigned": return "bg-yellow-100 text-yellow-700 border border-yellow-200";
      case "Active":     return "bg-green-100 text-green-700 border border-green-200";
      case "Inactive":   return "bg-gray-100 text-gray-600 border border-gray-200";
      default:           return "bg-gray-100 text-gray-600";
    }
  };

  // ── Derived list: filter + sort ──────────────────────────────────────────────
  const filtered = useMemo(() => {
    let list = [...children];

    // Search
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(c => c.full_name.toLowerCase().includes(q));
    }

    // Status
    if (statusFilter !== "all") {
      list = list.filter(c => {
        const s = getDisplayStatus(c).toLowerCase();
        return s === statusFilter;
      });
    }

    // Gender
    if (genderFilter !== "all") {
      list = list.filter(c => c.gender === genderFilter);
    }

    // Sort
    list.sort((a, b) => {
      switch (sortKey) {
        case "name_asc":      return a.full_name.localeCompare(b.full_name);
        case "name_desc":     return b.full_name.localeCompare(a.full_name);
        case "age_asc":       return a.age - b.age;
        case "age_desc":      return b.age - a.age;
        case "sketches_desc": return (b.total_sketches || 0) - (a.total_sketches || 0);
        case "sketches_asc":  return (a.total_sketches || 0) - (b.total_sketches || 0);
        default:              return 0;
      }
    });

    return list;
  }, [children, search, statusFilter, genderFilter, sortKey]);

  const hasActiveFilters = search || statusFilter !== "all" || genderFilter !== "all" || sortKey !== "name_asc";

  function clearAll() {
    setSearch("");
    setStatusFilter("all");
    setGenderFilter("all");
    setSortKey("name_asc");
  }

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-1">
          {userRole === "admin" ? "All Children Progress" : "Children's Journey"}
        </h1>
        <p className="text-gray-500 text-sm">
          Track emotional growth and sketch activity over time.
        </p>
      </div>

      {!loading && children.length > 0 && (
        <div className="mb-6 space-y-3">
          {/* Search + toggle row */}
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search by name…"
                className="w-full pl-9 pr-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-300 focus:border-pink-400 transition bg-white"
              />
              {search && (
                <button
                  onClick={() => setSearch("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            <button
              onClick={() => setShowFilters(p => !p)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-xl border transition ${
                showFilters
                  ? "bg-pink-50 border-pink-300 text-pink-600"
                  : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"
              }`}
            >
              <SlidersHorizontal size={15} />
              Filter
              {(statusFilter !== "all" || genderFilter !== "all") && (
                <span className="w-5 h-5 rounded-full bg-pink-500 text-white text-[10px] font-black flex items-center justify-center">
                  {(statusFilter !== "all" ? 1 : 0) + (genderFilter !== "all" ? 1 : 0)}
                </span>
              )}
            </button>

            {/* Sort dropdown */}
            <div className="relative">
              <div className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-xl border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 transition">
                <ArrowUpDown size={15} />
                <select
                  value={sortKey}
                  onChange={e => setSortKey(e.target.value as SortKey)}
                  className="bg-transparent focus:outline-none cursor-pointer text-sm font-semibold text-gray-600 pr-1"
                >
                  {SORT_OPTIONS.map(o => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Expanded filter panel */}
          {showFilters && (
            <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm space-y-4">
              {/* Status */}
              <div>
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Status</p>
                <div className="flex flex-wrap gap-2">
                  {STATUS_FILTERS.map(f => (
                    <button
                      key={f.value}
                      onClick={() => setStatusFilter(f.value)}
                      className={`px-3.5 py-1.5 rounded-full text-xs font-semibold border transition ${
                        statusFilter === f.value
                          ? "bg-pink-500 text-white border-pink-500"
                          : "bg-white text-gray-600 border-gray-200 hover:border-pink-300 hover:text-pink-600"
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Gender */}
              <div>
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Gender</p>
                <div className="flex flex-wrap gap-2">
                  {(["all", "Male", "Female"] as GenderFilter[]).map(g => (
                    <button
                      key={g}
                      onClick={() => setGenderFilter(g)}
                      className={`px-3.5 py-1.5 rounded-full text-xs font-semibold border transition ${
                        genderFilter === g
                          ? "bg-pink-500 text-white border-pink-500"
                          : "bg-white text-gray-600 border-gray-200 hover:border-pink-300 hover:text-pink-600"
                      }`}
                    >
                      {g === "all" ? "All" : g}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Result count + clear */}
          <div className="flex items-center justify-between text-xs text-gray-400">
            <span>
              Showing <span className="font-semibold text-gray-700">{filtered.length}</span> of {children.length} children
            </span>
            {hasActiveFilters && (
              <button
                onClick={clearAll}
                className="flex items-center gap-1 text-pink-500 hover:text-pink-700 font-semibold transition"
              >
                <X size={12} /> Clear all
              </button>
            )}
          </div>
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="animate-spin text-pink-600" size={40} />
        </div>
      ) : children.length === 0 ? (
        <div className="bg-white p-10 rounded-xl shadow-sm text-center border border-gray-200">
          <div className="inline-flex p-4 bg-gray-50 rounded-full mb-4">
            <User size={32} className="text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900">No profiles found</h3>
          <p className="text-gray-500 mt-1 mb-6 max-w-md mx-auto">
            {userRole === "therapist"
              ? "You have no active patients assigned."
              : userRole === "admin"
              ? "No children registered in the system."
              : "You haven't been assigned to any children yet."}
          </p>
          {userRole === "user" && (
            <button
              onClick={() => navigate("/dashboard/patients/add")}
              className="inline-flex items-center gap-2 bg-[#e13d7d] text-white px-6 py-3 rounded-lg font-semibold hover:bg-[#c42f6a] transition-all shadow-sm active:scale-95"
            >
              <Plus size={20} />
              Add Your First Child
            </button>
          )}
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white p-10 rounded-xl shadow-sm text-center border border-gray-200">
          <div className="inline-flex p-4 bg-gray-50 rounded-full mb-4">
            <Search size={28} className="text-gray-400" />
          </div>
          <h3 className="text-base font-semibold text-gray-800">No children match your filters</h3>
          <p className="text-gray-400 text-sm mt-1 mb-4">Try adjusting the search or filter criteria.</p>
          <button
            onClick={clearAll}
            className="text-sm text-pink-500 hover:text-pink-700 font-semibold transition"
          >
            Clear all filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((child) => {
            const displayStatus = getDisplayStatus(child);
            return (
              <div
                key={child.id}
                onClick={() => navigate(`/dashboard/children/${child.id}`)}
                className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow cursor-pointer group"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold text-white ${
                      child.gender === "Female" ? "bg-pink-400" : "bg-blue-400"
                    }`}>
                      {child.full_name.charAt(0)}
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">{child.full_name}</h3>
                      <p className="text-sm text-gray-500">{child.age} years old · {child.gender}</p>
                    </div>
                  </div>
                  <span className={`px-2 py-1 text-[10px] font-bold uppercase rounded-full ${getStatusColor(displayStatus)}`}>
                    {displayStatus}
                  </span>
                </div>

                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2 text-gray-600">
                    <NotebookPen size={16} /> Total Sketches
                  </span>
                  <span className="font-semibold text-gray-900">{child.total_sketches || 0}</span>
                </div>

                <div className="mt-6 pt-4 border-t border-gray-100 flex items-center justify-between text-pink-600 text-sm font-medium group-hover:text-pink-700">
                  View Detailed Report
                  <ArrowRight size={16} className="transform group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
