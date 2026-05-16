import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import {
  GraduationCap, ArrowLeft, Pencil, Check, X,
  Award, Briefcase, BookOpen, User, ShieldCheck, Clock,
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

export default function TherapistProfile() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [myId, setMyId] = useState("");
  const [myRole, setMyRole] = useState("");
  const [targetName, setTargetName] = useState("");
  const [targetEmail, setTargetEmail] = useState("");
  const [data, setData] = useState<TherapistProfileData>(EMPTY);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<TherapistProfileData>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);

  const canEdit = myRole === "admin" || myId === id;

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

  function startEdit() {
    setDraft({ ...data });
    setEditing(true);
    setSaved(false);
  }

  function cancelEdit() {
    setEditing(false);
  }

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

  const isComplete = !!(data.professional_title && data.license_number && data.academic_qualifications);

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">

      {/* Back */}
      <button
        onClick={() => navigate("/dashboard/therapists")}
        className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-800 mb-6 transition-colors"
      >
        <ArrowLeft size={16} /> Back to Therapists
      </button>

      {/* Profile hero */}
      <div className="bg-gradient-to-br from-pink-50 to-purple-50 rounded-2xl p-6 mb-6 border border-pink-100 flex items-center gap-5">
        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-pink-400 to-purple-500 flex items-center justify-center flex-shrink-0 shadow-md">
          <User size={34} className="text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold text-gray-900">{targetName}</h1>
          <p className="text-sm text-gray-500">{targetEmail}</p>
          {data.professional_title && (
            <p className="text-sm font-semibold text-[#e13d7d] mt-1">{data.professional_title}</p>
          )}
          <div className="mt-2">
            {isComplete ? (
              <span className="inline-flex items-center gap-1.5 text-xs font-bold text-green-700 bg-green-100 px-3 py-1 rounded-full">
                <ShieldCheck size={12} /> Profile Verified
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-700 bg-amber-100 px-3 py-1 rounded-full">
                Profile Incomplete
              </span>
            )}
          </div>
        </div>

        {/* Edit / Save / Cancel buttons */}
        {canEdit && !editing && (
          <button
            onClick={startEdit}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-semibold text-gray-700 hover:border-pink-300 hover:text-[#e13d7d] transition-all shadow-sm"
          >
            <Pencil size={14} /> Edit
          </button>
        )}
        {editing && (
          <div className="flex gap-2">
            <button
              onClick={cancelEdit}
              className="flex items-center gap-1.5 px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm font-semibold text-gray-500 hover:bg-gray-50 transition-all"
            >
              <X size={14} /> Cancel
            </button>
            <button
              onClick={saveEdit}
              disabled={saving}
              className="flex items-center gap-1.5 px-4 py-2 bg-[#e13d7d] text-white rounded-xl text-sm font-semibold hover:bg-pink-600 transition-all disabled:opacity-50"
            >
              {saving ? "Saving…" : <><Check size={14} /> Save</>}
            </button>
          </div>
        )}
      </div>

      {saved && (
        <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 border border-green-200 rounded-xl px-4 py-3 mb-4">
          <Check size={15} /> Profile saved successfully.
        </div>
      )}

      {/* Fields */}
      <div className="space-y-4">
        <Field
          icon={<Briefcase size={16} className="text-[#e13d7d]" />}
          label="Professional Title"
          value={data.professional_title}
          editing={editing}
          draftValue={String(draft.professional_title)}
          onChange={v => setDraft(d => ({ ...d, professional_title: v }))}
          placeholder="e.g. Counselling Psychologist"
        />
        <Field
          icon={<BookOpen size={16} className="text-purple-500" />}
          label="Academic Qualifications"
          value={data.academic_qualifications}
          editing={editing}
          draftValue={String(draft.academic_qualifications)}
          onChange={v => setDraft(d => ({ ...d, academic_qualifications: v }))}
          placeholder="e.g. Master of Counselling, Universiti Kebangsaan Malaysia"
          multiline
        />
        <Field
          icon={<Clock size={16} className="text-blue-500" />}
          label="Years of Experience"
          value={data.years_of_experience !== "" ? `${data.years_of_experience} year${Number(data.years_of_experience) !== 1 ? "s" : ""}` : ""}
          editing={editing}
          draftValue={String(draft.years_of_experience)}
          onChange={v => setDraft(d => ({ ...d, years_of_experience: v === "" ? "" : Number(v) }))}
          placeholder="e.g. 5"
          inputType="number"
        />
        <Field
          icon={<Award size={16} className="text-amber-500" />}
          label="Registered Body"
          value={data.registered_body}
          editing={editing}
          draftValue={String(draft.registered_body)}
          onChange={v => setDraft(d => ({ ...d, registered_body: v }))}
          placeholder="e.g. Malaysian Board of Counsellors"
        />
        <Field
          icon={<ShieldCheck size={16} className="text-green-600" />}
          label="License Number"
          value={data.license_number}
          editing={editing}
          draftValue={String(draft.license_number)}
          onChange={v => setDraft(d => ({ ...d, license_number: v }))}
          placeholder="e.g. KB12211"
        />
        <Field
          icon={<GraduationCap size={16} className="text-gray-500" />}
          label="Bio"
          value={data.bio}
          editing={editing}
          draftValue={String(draft.bio)}
          onChange={v => setDraft(d => ({ ...d, bio: v }))}
          placeholder="Brief professional biography..."
          multiline
        />
      </div>
    </div>
  );
}

// ── Field component ───────────────────────────────────────────────────────────
function Field({
  icon, label, value, editing, draftValue, onChange, placeholder, multiline, inputType,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  editing: boolean;
  draftValue: string;
  onChange: (v: string) => void;
  placeholder?: string;
  multiline?: boolean;
  inputType?: string;
}) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 px-5 py-4 shadow-sm">
      <div className="flex items-center gap-2 mb-2">
        {icon}
        <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">{label}</span>
      </div>
      {editing ? (
        multiline ? (
          <textarea
            value={draftValue}
            onChange={e => onChange(e.target.value)}
            placeholder={placeholder}
            rows={3}
            className="w-full text-sm text-gray-800 border border-gray-200 rounded-xl px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-pink-300 placeholder:text-gray-300"
          />
        ) : (
          <input
            type={inputType ?? "text"}
            value={draftValue}
            onChange={e => onChange(e.target.value)}
            placeholder={placeholder}
            className="w-full text-sm text-gray-800 border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-pink-300 placeholder:text-gray-300"
          />
        )
      ) : (
        <p className={`text-sm leading-relaxed ${value ? "text-gray-800" : "text-gray-400 italic"}`}>
          {value || "Not filled in yet"}
        </p>
      )}
    </div>
  );
}
