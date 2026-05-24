import { useState, useEffect } from "react";
import { supabase } from "../lib/supabaseClient";
import {
  Activity, UserPlus, Users, PenLine, CheckCircle, ShieldCheck,
  Trash2, CalendarPlus, ThumbsUp, ThumbsDown, RefreshCw, ChevronLeft, ChevronRight,
} from "lucide-react";

interface LogEntry {
  id: string;
  actor_name: string;
  action: string;
  entity_type: string;
  entity_label: string | null;
  meta: Record<string, unknown>;
  created_at: string;
}

const ACTION_CONFIG: Record<string, {
  label: string;
  icon: React.ReactNode;
  bg: string;
  color: string;
  category: string;
}> = {
  "patient.created":            { label: "Child added",             icon: <UserPlus size={14} />,     bg: "bg-blue-100",    color: "text-blue-600",    category: "patient"  },
  "patient.therapist_assigned": { label: "Therapist assigned",      icon: <Users size={14} />,        bg: "bg-indigo-100",  color: "text-indigo-600",  category: "patient"  },
  "patient.status_changed":     { label: "Status changed",          icon: <Activity size={14} />,     bg: "bg-gray-100",    color: "text-gray-600",    category: "patient"  },
  "sketch.submitted":           { label: "Drawing submitted",       icon: <PenLine size={14} />,      bg: "bg-purple-100",  color: "text-purple-600",  category: "clinical" },
  "sketch.reviewed":            { label: "Drawing marked reviewing",icon: <CheckCircle size={14} />,  bg: "bg-amber-100",   color: "text-amber-600",   category: "clinical" },
  "sketch.verified":            { label: "Drawing verified",        icon: <ShieldCheck size={14} />,  bg: "bg-emerald-100", color: "text-emerald-600", category: "clinical" },
  "sketch.deleted":             { label: "Drawing deleted",         icon: <Trash2 size={14} />,       bg: "bg-red-100",     color: "text-red-600",     category: "clinical" },
  "session.created":            { label: "Session scheduled",       icon: <CalendarPlus size={14} />, bg: "bg-violet-100",  color: "text-violet-600",  category: "schedule" },
  "session.accepted":           { label: "Session accepted",        icon: <ThumbsUp size={14} />,     bg: "bg-green-100",   color: "text-green-600",   category: "schedule" },
  "session.rejected":           { label: "Session rejected",        icon: <ThumbsDown size={14} />,   bg: "bg-red-100",     color: "text-red-600",     category: "schedule" },
  "user.created":               { label: "User created",            icon: <UserPlus size={14} />,     bg: "bg-pink-100",    color: "text-pink-600",    category: "user"     },
};

const CATEGORY_LABELS: Record<string, string> = {
  all: "All", clinical: "Clinical", schedule: "Schedule", patient: "Patient", user: "User",
};

const PAGE_SIZE = 20;

function relTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1)  return "Just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  if (h < 48) return "Yesterday";
  return new Date(iso).toLocaleDateString("en-MY", { day: "numeric", month: "short", year: "numeric" });
}

export default function ActivityLog() {
  const [logs, setLogs]           = useState<LogEntry[]>([]);
  const [loading, setLoading]     = useState(true);
  const [category, setCategory]   = useState("all");
  const [page, setPage]           = useState(0);
  const [total, setTotal]         = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => { fetchLogs(); }, [category, page]);

  async function fetchLogs(isRefresh = false) {
    if (isRefresh) setRefreshing(true); else setLoading(true);

    let query = supabase
      .from("activity_logs")
      .select("id, actor_name, action, entity_type, entity_label, meta, created_at", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1);

    if (category !== "all") {
      const actionsInCategory = Object.entries(ACTION_CONFIG)
        .filter(([, v]) => v.category === category)
        .map(([k]) => k);
      query = query.in("action", actionsInCategory);
    }

    const { data, count } = await query;
    setLogs(data ?? []);
    setTotal(count ?? 0);
    if (isRefresh) setRefreshing(false); else setLoading(false);
  }

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="max-w-6xl mx-auto pb-10 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Activity Log</h1>
          <p className="text-sm text-gray-500 mt-0.5">Audit trail of all system actions</p>
        </div>
        <button
          onClick={() => { setPage(0); fetchLogs(true); }}
          disabled={refreshing}
          className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors disabled:opacity-50"
        >
          <RefreshCw size={14} className={refreshing ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

      {/* Category filter */}
      <div className="flex items-center gap-2 flex-wrap">
        {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
          <button
            key={key}
            onClick={() => { setCategory(key); setPage(0); }}
            className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors ${
              category === key
                ? "bg-gray-900 text-white"
                : "bg-white text-gray-500 border border-gray-200 hover:border-gray-400"
            }`}
          >
            {label}
          </button>
        ))}
        <span className="ml-auto text-xs text-gray-400">{total} entries</span>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
          </div>
        ) : logs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-400">
            <Activity size={36} className="mb-3 opacity-30" />
            <p className="font-medium">No activity yet</p>
            <p className="text-xs mt-1">Actions will appear here as users interact with the system.</p>
          </div>
        ) : (
          <>
            {/* Column headers */}
            <div className="grid grid-cols-[2fr_2fr_2fr_1fr] gap-4 px-5 py-2.5 bg-gray-50 border-b border-gray-100 text-[11px] font-bold text-gray-400 uppercase tracking-wider">
              <span>Action</span>
              <span>Subject</span>
              <span>Actor</span>
              <span>Time</span>
            </div>

            <div className="divide-y divide-gray-50">
              {logs.map(log => {
                const cfg = ACTION_CONFIG[log.action];
                return (
                  <div key={log.id} className="grid grid-cols-[2fr_2fr_2fr_1fr] gap-4 px-5 py-3.5 items-center hover:bg-gray-50/60 transition-colors">
                    {/* Action */}
                    <div className="flex items-center gap-2.5">
                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${cfg?.bg ?? "bg-gray-100"}`}>
                        <span className={cfg?.color ?? "text-gray-500"}>{cfg?.icon ?? <Activity size={14} />}</span>
                      </div>
                      <span className="text-sm font-semibold text-gray-800">{cfg?.label ?? log.action}</span>
                    </div>

                    {/* Subject */}
                    <div className="min-w-0">
                      <p className="text-sm text-gray-700 truncate">{log.entity_label ?? "—"}</p>
                      {log.meta && Object.keys(log.meta).length > 0 && (() => {
                        const hints: string[] = [];
                        if (log.meta.therapist_name) hints.push(`→ ${log.meta.therapist_name}`);
                        if (log.meta.event_type)     hints.push(String(log.meta.event_type).replace(/_/g, " "));
                        if (log.meta.emotion)        hints.push(String(log.meta.emotion));
                        if (log.meta.role)           hints.push(String(log.meta.role));
                        return hints.length > 0
                          ? <p className="text-xs text-gray-400 mt-0.5 truncate">{hints.join(" · ")}</p>
                          : null;
                      })()}
                    </div>

                    {/* Actor */}
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-gradient-to-br from-pink-400 to-purple-500 flex items-center justify-center flex-shrink-0">
                        <span className="text-[9px] font-bold text-white">
                          {(log.actor_name ?? "?").charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <span className="text-sm text-gray-600 truncate">{log.actor_name}</span>
                    </div>

                    {/* Time */}
                    <p className="text-xs text-gray-400 whitespace-nowrap">{relTime(log.created_at)}</p>
                  </div>
                );
              })}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-5 py-3.5 border-t border-gray-100 bg-gray-50">
                <p className="text-xs text-gray-400">
                  Page {page + 1} of {totalPages} · {total} total
                </p>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setPage(p => Math.max(0, p - 1))}
                    disabled={page === 0}
                    className="p-1.5 rounded-lg hover:bg-gray-200 disabled:opacity-30 transition-colors"
                  >
                    <ChevronLeft size={15} />
                  </button>
                  <button
                    onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                    disabled={page >= totalPages - 1}
                    className="p-1.5 rounded-lg hover:bg-gray-200 disabled:opacity-30 transition-colors"
                  >
                    <ChevronRight size={15} />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
