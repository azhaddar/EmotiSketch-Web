import { useState, useEffect, useMemo } from "react";
import { supabase } from "../lib/supabaseClient";
import {
  User, NotebookPen, ArrowRight, Loader2, Plus,
  Search, SlidersHorizontal, X, Check, ChevronUp, ChevronDown,
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
  therapist?: { id: string; full_name: string } | null;
  guardian?: { full_name: string } | null;
}

type SortCol = "name" | "age" | "sketches" | "status";
type SortDir = "asc" | "desc";
type StatusFilter = "all" | "active" | "inactive" | "complete" | "unassigned";
type GenderFilter = "all" | "Male" | "Female";

const STATUS_FILTERS: { value: StatusFilter; label: string }[] = [
  { value: "all",        label: "All"        },
  { value: "active",     label: "Active"     },
  { value: "inactive",   label: "Inactive"   },
  { value: "complete",   label: "Complete"   },
  { value: "unassigned", label: "Unassigned" },
];

const STATUS_STYLE: Record<string, string> = {
  Unassigned: "bg-yellow-50 text-yellow-700 border border-yellow-200",
  Active:     "bg-green-50  text-green-700  border border-green-200",
  Inactive:   "bg-gray-100  text-gray-600   border border-gray-200",
  Complete:   "bg-teal-50   text-teal-700   border border-teal-200",
};

export default function ChildrenProgress() {
  const navigate = useNavigate();
  const [children, setChildren]           = useState<Child[]>([]);
  const [loading, setLoading]             = useState(true);
  const [userRole, setUserRole]           = useState("");
  const [userId, setUserId]               = useState("");
  const [therapists, setTherapists]       = useState<{ id: string; full_name: string }[]>([]);
  const [assigningId, setAssigningId]     = useState<string | null>(null);
  const [savedId, setSavedId]             = useState<string | null>(null);
  const [updatingId, setUpdatingId]       = useState<string | null>(null);
  const [statusSavedId, setStatusSavedId] = useState<string | null>(null);

  const [search, setSearch]               = useState("");
  const [statusFilter, setStatusFilter]   = useState<StatusFilter>("all");
  const [genderFilter, setGenderFilter]   = useState<GenderFilter>("all");
  const [showFilters, setShowFilters]     = useState(false);
  const [sortCol, setSortCol]             = useState<SortCol>("name");
  const [sortDir, setSortDir]             = useState<SortDir>("asc");

  useEffect(() => { fetchChildren(); }, []);

  async function fetchChildren() {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setUserId(user.id);

      const { data: profile } = await supabase
        .from("profiles").select("role").eq("id", user.id).single();
      const role = profile?.role?.toLowerCase() || "user";
      setUserRole(role);

      if (role === "admin") {
        const { data: tData } = await supabase
          .from("profiles").select("id, full_name").eq("role", "therapist").order("full_name");
        setTherapists(tData || []);
      }

      let query = supabase
        .from("patients")
        .select("*, therapist:profiles!therapist_id(id, full_name), guardian:profiles!guardian_id(full_name)");

      if (role === "therapist") {
        query = query.or(`therapist_id.eq.${user.id},therapist_id.is.null`);
      } else if (role === "user") {
        query = query.eq("guardian_id", user.id);
      }

      const { data, error } = await query;
      if (error) throw error;
      setChildren(data || []);
    } catch (err) {
      console.error("Error fetching children:", err);
    } finally {
      setLoading(false);
    }
  }

  async function claimPatient(childId: string, childName: string) {
    if (!window.confirm(`Claim ${childName} as your patient?\n\nThis will assign you as their therapist and set their status to Active.`)) return;
    setAssigningId(childId);
    try {
      const { error } = await supabase.from("patients").update({ therapist_id: userId, status: "Active" }).eq("id", childId);
      if (error) throw error;
      setChildren(prev => prev.map(c => c.id === childId ? { ...c, therapist_id: userId, status: "Active" } : c));
      setSavedId(childId); setTimeout(() => setSavedId(null), 2500);
    } catch { alert("Failed to claim patient. Please try again."); }
    finally { setAssigningId(null); }
  }

  async function assignTherapist(childId: string, therapistId: string | null) {
    setAssigningId(childId);
    try {
      const { error } = await supabase.from("patients").update({ therapist_id: therapistId }).eq("id", childId);
      if (error) throw error;
      const matched = therapistId ? therapists.find(t => t.id === therapistId) : null;
      setChildren(prev => prev.map(c => c.id === childId ? {
        ...c, therapist_id: therapistId,
        therapist: matched ? { id: matched.id, full_name: matched.full_name } : null,
      } : c));
      setSavedId(childId); setTimeout(() => setSavedId(null), 2500);
    } catch { alert("Failed to assign therapist."); }
    finally { setAssigningId(null); }
  }

  async function updateChildStatus(childId: string, newStatus: string) {
    setUpdatingId(childId);
    try {
      const { error } = await supabase.from("patients").update({ status: newStatus }).eq("id", childId);
      if (error) throw error;
      setChildren(prev => prev.map(c => c.id === childId ? { ...c, status: newStatus } : c));
      setStatusSavedId(childId); setTimeout(() => setStatusSavedId(null), 2500);
    } catch { alert("Failed to update status."); }
    finally { setUpdatingId(null); }
  }

  const getDisplayStatus = (c: Child) => !c.therapist_id ? "Unassigned" : c.status;

  function toggleSort(col: SortCol) {
    if (sortCol === col) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortCol(col); setSortDir("asc"); }
  }

  const filtered = useMemo(() => {
    let list = [...children];
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(c =>
        c.full_name.toLowerCase().includes(q) ||
        c.therapist?.full_name?.toLowerCase().includes(q) ||
        c.guardian?.full_name?.toLowerCase().includes(q)
      );
    }
    if (statusFilter !== "all") list = list.filter(c => getDisplayStatus(c).toLowerCase() === statusFilter);
    if (genderFilter !== "all") list = list.filter(c => c.gender === genderFilter);
    list.sort((a, b) => {
      let cmp = 0;
      if (sortCol === "name")    cmp = a.full_name.localeCompare(b.full_name);
      if (sortCol === "age")     cmp = a.age - b.age;
      if (sortCol === "sketches") cmp = (a.total_sketches || 0) - (b.total_sketches || 0);
      if (sortCol === "status")  cmp = getDisplayStatus(a).localeCompare(getDisplayStatus(b));
      return sortDir === "asc" ? cmp : -cmp;
    });
    return list;
  }, [children, search, statusFilter, genderFilter, sortCol, sortDir]);

  const hasActiveFilters = search || statusFilter !== "all" || genderFilter !== "all";

  function SortIcon({ col }: { col: SortCol }) {
    if (sortCol !== col) return <ChevronUp size={12} className="text-gray-300" />;
    return sortDir === "asc"
      ? <ChevronUp size={12} className="text-pink-500" />
      : <ChevronDown size={12} className="text-pink-500" />;
  }

  function ThCol({ col, label, className = "" }: { col: SortCol; label: string; className?: string }) {
    return (
      <th
        onClick={() => toggleSort(col)}
        className={`px-4 py-3 text-left text-[11px] font-bold text-gray-500 uppercase tracking-wider cursor-pointer select-none hover:text-gray-800 transition-colors ${className}`}
      >
        <span className="flex items-center gap-1">{label}<SortIcon col={col} /></span>
      </th>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {userRole === "admin" ? "All Children Progress" : "Children's Journey"}
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">Track emotional growth and sketch activity over time.</p>
        </div>
        {userRole === "user" && (
          <button
            onClick={() => navigate("/dashboard/patients/add")}
            className="flex items-center gap-2 px-4 py-2.5 bg-[#e13d7d] text-white text-sm font-semibold rounded-xl hover:bg-pink-600 transition-colors"
          >
            <Plus size={15} /> Add Child
          </button>
        )}
      </div>

      {/* Search + filters */}
      {!loading && children.length > 0 && (
        <div className="mb-4 space-y-3">
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search by name, therapist or parent…"
                className="w-full pl-9 pr-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-pink-300 bg-white"
              />
              {search && (
                <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  <X size={14} />
                </button>
              )}
            </div>
            <button
              onClick={() => setShowFilters(p => !p)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-xl border transition ${
                showFilters ? "bg-pink-50 border-pink-300 text-pink-600" : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"
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
          </div>

          {showFilters && (
            <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm space-y-3">
              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Status</p>
                <div className="flex flex-wrap gap-2">
                  {STATUS_FILTERS.map(f => (
                    <button key={f.value} onClick={() => setStatusFilter(f.value)}
                      className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition ${
                        statusFilter === f.value ? "bg-pink-500 text-white border-pink-500" : "bg-white text-gray-600 border-gray-200 hover:border-pink-300 hover:text-pink-600"
                      }`}
                    >{f.label}</button>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Gender</p>
                <div className="flex flex-wrap gap-2">
                  {(["all", "Male", "Female"] as GenderFilter[]).map(g => (
                    <button key={g} onClick={() => setGenderFilter(g)}
                      className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition ${
                        genderFilter === g ? "bg-pink-500 text-white border-pink-500" : "bg-white text-gray-600 border-gray-200 hover:border-pink-300 hover:text-pink-600"
                      }`}
                    >{g === "all" ? "All" : g}</button>
                  ))}
                </div>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between text-xs text-gray-400">
            <span>Showing <span className="font-semibold text-gray-700">{filtered.length}</span> of {children.length} children</span>
            {hasActiveFilters && (
              <button onClick={() => { setSearch(""); setStatusFilter("all"); setGenderFilter("all"); }}
                className="flex items-center gap-1 text-pink-500 hover:text-pink-700 font-semibold">
                <X size={12} /> Clear all
              </button>
            )}
          </div>
        </div>
      )}

      {/* States */}
      {loading ? (
        <div className="flex justify-center py-24">
          <Loader2 className="animate-spin text-pink-500" size={36} />
        </div>
      ) : children.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-14 text-center">
          <div className="inline-flex p-4 bg-gray-50 rounded-full mb-4">
            <User size={32} className="text-gray-300" />
          </div>
          <h3 className="text-base font-semibold text-gray-800">No children found</h3>
          <p className="text-sm text-gray-400 mt-1 mb-6">
            {userRole === "therapist" ? "No patients assigned to you yet."
              : userRole === "admin" ? "No children registered in the system."
              : "You haven't added any children yet."}
          </p>
          {userRole === "user" && (
            <button onClick={() => navigate("/dashboard/patients/add")}
              className="inline-flex items-center gap-2 bg-[#e13d7d] text-white px-6 py-2.5 rounded-xl text-sm font-semibold hover:bg-pink-600 transition-colors">
              <Plus size={16} /> Add Your First Child
            </button>
          )}
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-14 text-center">
          <Search size={28} className="mx-auto text-gray-300 mb-3" />
          <h3 className="text-base font-semibold text-gray-700">No results match your filters</h3>
          <button onClick={() => { setSearch(""); setStatusFilter("all"); setGenderFilter("all"); }}
            className="mt-3 text-sm text-pink-500 font-semibold hover:text-pink-700">
            Clear all filters
          </button>
        </div>
      ) : (
        /* ── Table ── */
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <ThCol col="name"    label="Child" className="pl-5" />
                <ThCol col="age"     label="Age"   />
                <ThCol col="status"  label="Status" />
                <th className="px-4 py-3 text-left text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                  {userRole === "user" ? "Therapist" : "Parent"}
                </th>
                {userRole !== "user" && (
                  <th className="px-4 py-3 text-left text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                    {userRole === "admin" ? "Assigned Therapist" : "Therapist"}
                  </th>
                )}
                <ThCol col="sketches" label="Sketches" />
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map(child => {
                const displayStatus = getDisplayStatus(child);
                const isUnassigned  = !child.therapist_id;
                const isOwnPatient  = child.therapist_id === userId;

                return (
                  <tr
                    key={child.id}
                    onClick={() => !isUnassigned && navigate(`/dashboard/children/${child.id}`)}
                    className={`group transition-colors ${
                      isUnassigned && userRole === "therapist"
                        ? "cursor-default bg-white"
                        : "cursor-pointer hover:bg-pink-50/40"
                    }`}
                  >
                    {/* Child */}
                    <td className="pl-5 pr-4 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold text-white flex-shrink-0 ${
                          child.gender === "Female" ? "bg-pink-400" : "bg-blue-400"
                        }`}>
                          {child.full_name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-gray-900 leading-tight">{child.full_name}</p>
                          <p className="text-xs text-gray-400">{child.gender}</p>
                        </div>
                      </div>
                    </td>

                    {/* Age */}
                    <td className="px-4 py-3.5">
                      <span className="text-sm text-gray-700">{child.age} yrs</span>
                    </td>

                    {/* Status */}
                    <td className="px-4 py-3.5" onClick={e => e.stopPropagation()}>
                      {userRole === "therapist" && isOwnPatient ? (
                        <div className="flex items-center gap-1.5">
                          <select
                            value={child.status}
                            onChange={e => updateChildStatus(child.id, e.target.value)}
                            disabled={updatingId === child.id}
                            className={`text-xs font-semibold border rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-pink-300 cursor-pointer disabled:opacity-50 ${
                              child.status === "Active"   ? "bg-green-50 text-green-700 border-green-200"
                              : child.status === "Complete" ? "bg-teal-50 text-teal-700 border-teal-200"
                              : "bg-gray-50 text-gray-500 border-gray-200"
                            }`}
                          >
                            <option value="Active">Active</option>
                            <option value="Inactive">Inactive</option>
                            <option value="Complete">Complete</option>
                          </select>
                          {updatingId === child.id   && <Loader2 size={12} className="animate-spin text-pink-400" />}
                          {statusSavedId === child.id && <Check size={12} className="text-green-500" />}
                        </div>
                      ) : (
                        <span className={`inline-flex px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${STATUS_STYLE[displayStatus] ?? "bg-gray-100 text-gray-500"}`}>
                          {displayStatus}
                        </span>
                      )}
                    </td>

                    {/* Parent or Therapist (simple display column) */}
                    <td className="px-4 py-3.5">
                      <span className="text-sm text-gray-600">
                        {userRole === "user"
                          ? (child.therapist?.full_name ?? <span className="text-gray-300 italic">Unassigned</span>)
                          : (child.guardian?.full_name  ?? <span className="text-gray-300 italic">—</span>)
                        }
                      </span>
                    </td>

                    {/* Assigned Therapist column — admin dropdown / therapist label */}
                    {userRole !== "user" && (
                      <td className="px-4 py-3.5" onClick={e => e.stopPropagation()}>
                        {userRole === "admin" ? (
                          <div className="flex items-center gap-1.5">
                            <select
                              value={child.therapist_id || ""}
                              onChange={e => assignTherapist(child.id, e.target.value || null)}
                              disabled={assigningId === child.id}
                              className="text-sm text-gray-700 border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-pink-300 bg-white disabled:opacity-50 cursor-pointer max-w-[160px]"
                            >
                              <option value="">— Unassigned —</option>
                              {therapists.map(t => <option key={t.id} value={t.id}>{t.full_name}</option>)}
                            </select>
                            {assigningId === child.id && <Loader2 size={12} className="animate-spin text-pink-400" />}
                            {savedId     === child.id && <Check    size={12} className="text-green-500" />}
                          </div>
                        ) : (
                          <span className="text-sm text-gray-600">
                            {child.therapist?.full_name ?? <span className="text-gray-300 italic">Unassigned</span>}
                          </span>
                        )}
                      </td>
                    )}

                    {/* Sketches */}
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-1.5 text-sm text-gray-700">
                        <NotebookPen size={13} className="text-gray-400" />
                        {child.total_sketches || 0}
                      </div>
                    </td>

                    {/* Action */}
                    <td className="pl-2 pr-5 py-3.5" onClick={e => e.stopPropagation()}>
                      {userRole === "therapist" && isUnassigned ? (
                        <button
                          onClick={() => claimPatient(child.id, child.full_name)}
                          disabled={assigningId === child.id}
                          className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#e13d7d] text-white hover:bg-pink-600 disabled:opacity-50 transition-colors flex items-center gap-1.5 whitespace-nowrap"
                        >
                          {assigningId === child.id ? <><Loader2 size={11} className="animate-spin" /> Claiming…</>
                           : savedId === child.id   ? <><Check size={11} /> Claimed!</>
                           : "Claim Patient"}
                        </button>
                      ) : (
                        <button
                          onClick={() => navigate(`/dashboard/children/${child.id}`)}
                          className="flex items-center gap-1 text-xs font-semibold text-pink-500 hover:text-pink-700 transition-colors group-hover:underline whitespace-nowrap"
                        >
                          View Report <ArrowRight size={13} className="group-hover:translate-x-0.5 transition-transform" />
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
