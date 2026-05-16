import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import {
  ArrowLeft, Pencil, Check, X,
  Mail, ShieldCheck, Clock, User,
} from "lucide-react";

interface TherapistProfileData {
  professional_title: string;
  academic_qualifications: string;
  years_of_experience: number | "";
  registered_body: string;
  license_number: string;
  bio: string;
}

const EMPTY: TherapistProfileData = {
  professional_title: "",
  academic_qualifications: "",
  years_of_experience: "",
  registered_body: "Malaysian Board of Counsellors",
  license_number: "",
  bio: "",
};

// Split multi-line qualifications into individual entries
function parseQualifications(raw: string): string[] {
  return raw.split("\n").map(s => s.trim()).filter(Boolean);
}

export default function TherapistProfile() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [myId, setMyId]         = useState("");
  const [myRole, setMyRole]     = useState("");
  const [targetName, setTargetName]   = useState("");
  const [targetEmail, setTargetEmail] = useState("");
  const [data, setData]         = useState<TherapistProfileData>(EMPTY);
  const [editing, setEditing]   = useState(false);
  const [draft, setDraft]       = useState<TherapistProfileData>(EMPTY);
  const [saving, setSaving]     = useState(false);
  const [saved, setSaved]       = useState(false);
  const [loading, setLoading]   = useState(true);

  const canEdit = myRole === "admin" || myId === id;
  const isComplete = !!(data.professional_title && data.license_number && data.academic_qualifications);

  useEffect(() => { fetchAll(); }, [id]);

  async function fetchAll() {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setMyId(user.id);

    const { data: prof } = await supabase.from("profiles").select("role").eq("id", user.id).single();
    setMyRole((prof?.role ?? "").toLowerCase());

    const { data: target } = await supabase
      .from("profiles").select("full_name, email").eq("id", id!).single();
    setTargetName(target?.full_name ?? "Therapist");
    setTargetEmail(target?.email ?? "");

    const { data: tp } = await supabase
      .from("therapist_profiles").select("*").eq("id", id!).single();

    const filled: TherapistProfileData = {
      professional_title:      tp?.professional_title      ?? "",
      academic_qualifications: tp?.academic_qualifications ?? "",
      years_of_experience:     tp?.years_of_experience     ?? "",
      registered_body:         tp?.registered_body         ?? "Malaysian Board of Counsellors",
      license_number:          tp?.license_number          ?? "",
      bio:                     tp?.bio                     ?? "",
    };
    setData(filled);
    setLoading(false);
  }

  function startEdit() { setDraft({ ...data }); setEditing(true); setSaved(false); }
  function cancelEdit() { setEditing(false); }

  async function saveEdit() {
    if (!id) return;
    setSaving(true);
    const payload = {
      id,
      professional_title:      draft.professional_title.trim()      || null,
      academic_qualifications: draft.academic_qualifications.trim() || null,
      years_of_experience:     draft.years_of_experience !== "" ? Number(draft.years_of_experience) : null,
      registered_body:         draft.registered_body.trim()         || null,
      license_number:          draft.license_number.trim()          || null,
      bio:                     draft.bio.trim()                     || null,
      updated_at:              new Date().toISOString(),
    };
    const { error } = await supabase.from("therapist_profiles").upsert(payload);
    setSaving(false);
    if (error) { alert("Failed to save: " + error.message); return; }
    setData({ ...draft });
    setEditing(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-pink-500" />
      </div>
    );
  }

  const qualifications = parseQualifications(data.academic_qualifications);

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">

      {/* Back + actions */}
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={() => navigate("/dashboard/therapists")}
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-800 transition-colors"
        >
          <ArrowLeft size={16} /> Back to Therapists
        </button>

        {canEdit && !editing && (
          <button
            onClick={startEdit}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-semibold text-gray-700 hover:border-pink-300 hover:text-[#e13d7d] transition-all shadow-sm"
          >
            <Pencil size={14} /> Edit Profile
          </button>
        )}
        {editing && (
          <div className="flex gap-2">
            <button onClick={cancelEdit}
              className="flex items-center gap-1.5 px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm font-semibold text-gray-500 hover:bg-gray-50 transition-all">
              <X size={14} /> Cancel
            </button>
            <button onClick={saveEdit} disabled={saving}
              className="flex items-center gap-1.5 px-4 py-2 bg-[#e13d7d] text-white rounded-xl text-sm font-semibold hover:bg-pink-600 transition-all disabled:opacity-50">
              {saving ? "Saving…" : <><Check size={14} /> Save</>}
            </button>
          </div>
        )}
      </div>

      {saved && (
        <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 border border-green-200 rounded-xl px-4 py-3 mb-5">
          <Check size={15} /> Profile saved successfully.
        </div>
      )}

      {/* ── Header card ─────────────────────────────────────────────────────── */}
      <div className="bg-white border border-gray-200 rounded-2xl p-6 mb-6 shadow-sm">
        <div className="flex items-start justify-between gap-6">

          {/* Left: identity info */}
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-black text-gray-900 uppercase tracking-wide leading-tight">
              {targetName}
            </h1>

            {/* Status badge */}
            <div className="mt-2 mb-4">
              {isComplete ? (
                <span className="inline-flex items-center gap-1.5 text-xs font-bold text-green-700 bg-green-100 px-3 py-1 rounded-full">
                  <ShieldCheck size={11} /> Verified
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-700 bg-amber-100 px-3 py-1 rounded-full">
                  Profile Incomplete
                </span>
              )}
            </div>

            {data.professional_title && (
              <div className="mb-1">
                <p className="text-sm font-bold text-gray-800">{data.professional_title}</p>
              </div>
            )}
            {data.registered_body && (
              <p className="text-sm text-gray-500 mb-4">{data.registered_body}</p>
            )}

            {/* Contact details */}
            <div className="border-t border-gray-100 pt-4 space-y-2">
              <p className="text-xs font-black uppercase tracking-widest text-gray-400 mb-2">Contact Details</p>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Mail size={14} className="text-[#e13d7d] flex-shrink-0" />
                <span>{targetEmail}</span>
              </div>
              {data.license_number && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <ShieldCheck size={14} className="text-green-500 flex-shrink-0" />
                  <span>{data.license_number}</span>
                </div>
              )}
              {data.years_of_experience !== "" && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Clock size={14} className="text-blue-400 flex-shrink-0" />
                  <span>{data.years_of_experience} year{Number(data.years_of_experience) !== 1 ? "s" : ""} of experience</span>
                </div>
              )}
            </div>
          </div>

          {/* Right: avatar */}
          <div className="w-24 h-28 rounded-xl bg-gradient-to-br from-pink-400 to-purple-500 flex items-center justify-center flex-shrink-0 shadow-md">
            <User size={40} className="text-white" />
          </div>
        </div>
      </div>

      {/* ── Edit form (when editing) ─────────────────────────────────────────── */}
      {editing && (
        <div className="bg-white border border-gray-200 rounded-2xl p-6 mb-6 shadow-sm space-y-4">
          <p className="text-xs font-black uppercase tracking-widest text-gray-400 mb-2">Edit Profile</p>

          <div>
            <label className="block text-xs font-bold text-gray-500 mb-1">Professional Title</label>
            <input type="text" value={draft.professional_title}
              onChange={e => setDraft(d => ({ ...d, professional_title: e.target.value }))}
              placeholder="e.g. Counselling Psychologist"
              className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-pink-300" />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-500 mb-1">
              Academic Qualifications
              <span className="font-normal text-gray-400 ml-1">(one per line)</span>
            </label>
            <textarea value={draft.academic_qualifications}
              onChange={e => setDraft(d => ({ ...d, academic_qualifications: e.target.value }))}
              placeholder={"Master of Counselling, Universiti Kebangsaan Malaysia\nBachelor of Psychology, Universiti Malaya"}
              rows={4}
              className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-pink-300" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1">Years of Experience</label>
              <input type="number" value={String(draft.years_of_experience)}
                onChange={e => setDraft(d => ({ ...d, years_of_experience: e.target.value === "" ? "" : Number(e.target.value) }))}
                placeholder="e.g. 5"
                className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-pink-300" />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 mb-1">License Number</label>
              <input type="text" value={draft.license_number}
                onChange={e => setDraft(d => ({ ...d, license_number: e.target.value }))}
                placeholder="e.g. KB12211"
                className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-pink-300" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-500 mb-1">Registered Body</label>
            <input type="text" value={draft.registered_body}
              onChange={e => setDraft(d => ({ ...d, registered_body: e.target.value }))}
              placeholder="e.g. Malaysian Board of Counsellors"
              className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-pink-300" />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-500 mb-1">Bio</label>
            <textarea value={draft.bio}
              onChange={e => setDraft(d => ({ ...d, bio: e.target.value }))}
              placeholder="Brief professional biography..."
              rows={3}
              className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-pink-300" />
          </div>
        </div>
      )}

      {/* ── Professional Appointment ─────────────────────────────────────────── */}
      <Section title="Professional Appointment">
        {data.professional_title ? (
          <p className="text-sm text-gray-700">
            {data.professional_title}
            {data.years_of_experience !== "" && (
              <span className="text-gray-400 ml-2">· {data.years_of_experience} yrs experience</span>
            )}
          </p>
        ) : (
          <p className="text-sm text-gray-400 italic">Not filled in yet</p>
        )}
      </Section>

      {/* ── Academic Qualifications ──────────────────────────────────────────── */}
      <Section title="Academic Qualification">
        {qualifications.length > 0 ? (
          <div className="space-y-2">
            {qualifications.map((q, i) => (
              <div key={i} className="bg-gray-50 border border-gray-100 rounded-xl px-4 py-2.5">
                <p className="text-sm font-medium text-gray-700 uppercase tracking-wide">{q}</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-400 italic">Not filled in yet</p>
        )}
      </Section>

      {/* ── Registered Body & License ────────────────────────────────────────── */}
      <Section title="Professional Registration">
        {data.registered_body || data.license_number ? (
          <div className="bg-gray-50 border border-gray-100 rounded-xl px-4 py-2.5 flex items-center justify-between">
            <p className="text-sm font-medium text-gray-700 uppercase tracking-wide">
              {data.registered_body || "—"}
            </p>
            {data.license_number && (
              <span className="text-xs font-bold text-green-700 bg-green-100 px-2.5 py-1 rounded-full">
                {data.license_number}
              </span>
            )}
          </div>
        ) : (
          <p className="text-sm text-gray-400 italic">Not filled in yet</p>
        )}
      </Section>

      {/* ── Bio ─────────────────────────────────────────────────────────────── */}
      {(data.bio || editing) && (
        <Section title="About">
          <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">
            {data.bio || <span className="text-gray-400 italic">Not filled in yet</span>}
          </p>
        </Section>
      )}
    </div>
  );
}

// ── Section wrapper ───────────────────────────────────────────────────────────
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-6">
      <div className="flex items-center gap-3 mb-3">
        <h2 className="text-xs font-black uppercase tracking-widest text-gray-800 whitespace-nowrap">
          {title}
        </h2>
        <div className="flex-1 h-px bg-gray-200" />
      </div>
      {children}
    </div>
  );
}
