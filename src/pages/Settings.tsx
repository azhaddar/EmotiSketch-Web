import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import {
  User, Lock, Shield, LogOut, Save, Eye, EyeOff,
  CheckCircle2, AlertCircle, Loader2, Mail, BadgeCheck,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

interface Profile {
  full_name: string;
  email: string;
  role: string;
  created_at?: string;
}

function Toast({ msg, type }: { msg: string; type: "success" | "error" }) {
  return (
    <div
      className={`flex items-center gap-2.5 px-4 py-3 rounded-xl text-sm font-medium shadow-lg border animate-in fade-in slide-in-from-top-2 duration-300 ${
        type === "success"
          ? "bg-green-50 border-green-200 text-green-800"
          : "bg-red-50 border-red-200 text-red-700"
      }`}
    >
      {type === "success"
        ? <CheckCircle2 size={16} className="text-green-500 flex-shrink-0" />
        : <AlertCircle size={16} className="text-red-500 flex-shrink-0" />}
      {msg}
    </div>
  );
}

function SectionCard({ title, icon, children }: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-pink-50 flex items-center justify-center text-pink-500">
          {icon}
        </div>
        <h2 className="text-sm font-bold text-gray-800 uppercase tracking-wide">{title}</h2>
      </div>
      <div className="p-6">{children}</div>
    </div>
  );
}

export default function Settings() {
  const navigate = useNavigate();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  // Profile form
  const [fullName, setFullName] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);

  // Password form
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  // Toast
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);

  function showToast(msg: string, type: "success" | "error") {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  }

  useEffect(() => {
    loadProfile();
  }, []);

  async function loadProfile() {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { navigate("/"); return; }

    const { data } = await supabase
      .from("profiles")
      .select("full_name, email, role, created_at")
      .eq("id", user.id)
      .maybeSingle();

    const meta = user.user_metadata ?? {};
    const resolvedName = data?.full_name || meta.full_name || "";
    const resolvedRole = data?.role || meta.role || "user";

    setProfile({
      full_name: resolvedName,
      email: user.email ?? data?.email ?? "",
      role: resolvedRole,
      created_at: data?.created_at,
    });
    setFullName(resolvedName);
    setLoading(false);
  }

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    if (!fullName.trim()) { showToast("Name cannot be empty.", "error"); return; }
    setSavingProfile(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from("profiles")
      .update({ full_name: fullName.trim() })
      .eq("id", user.id);

    if (error) {
      showToast("Failed to update profile. Please try again.", "error");
    } else {
      setProfile(prev => prev ? { ...prev, full_name: fullName.trim() } : prev);
      showToast("Profile updated successfully!", "success");
    }
    setSavingProfile(false);
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    if (!newPassword || !confirmPassword) {
      showToast("Please fill in all password fields.", "error"); return;
    }
    if (newPassword.length < 8) {
      showToast("New password must be at least 8 characters.", "error"); return;
    }
    if (newPassword !== confirmPassword) {
      showToast("New passwords do not match.", "error"); return;
    }

    setSavingPassword(true);

    // Re-authenticate with current password first
    const { data: { user } } = await supabase.auth.getUser();
    if (!user?.email) { showToast("Could not verify your account.", "error"); setSavingPassword(false); return; }

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: currentPassword,
    });

    if (signInError) {
      showToast("Current password is incorrect.", "error");
      setSavingPassword(false);
      return;
    }

    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) {
      showToast("Failed to update password. Please try again.", "error");
    } else {
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      showToast("Password changed successfully!", "success");
    }
    setSavingPassword(false);
  }

  async function handleSignOut() {
    if (!window.confirm("Are you sure you want to sign out?")) return;
    await supabase.auth.signOut();
    navigate("/");
  }

  const roleLabel: Record<string, string> = {
    admin: "Administrator",
    therapist: "Therapist",
    user: "Parent / Guardian",
  };

  const roleBg: Record<string, string> = {
    admin: "bg-purple-100 text-purple-700 border-purple-200",
    therapist: "bg-blue-100 text-blue-700 border-blue-200",
    user: "bg-green-100 text-green-700 border-green-200",
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="animate-spin text-pink-500" size={32} />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto pb-12 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-500 mt-1 text-sm">Manage your account and preferences</p>
      </div>

      {/* Toast */}
      {toast && (
        <div className="sticky top-4 z-40">
          <Toast msg={toast.msg} type={toast.type} />
        </div>
      )}

      {/* Account Overview */}
      <SectionCard title="Account Overview" icon={<Shield size={16} />}>
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-pink-400 to-purple-500 flex items-center justify-center text-white text-2xl font-black flex-shrink-0">
            {profile?.full_name?.charAt(0) ?? "?"}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-lg font-bold text-gray-900">{profile?.full_name}</p>
            <p className="text-sm text-gray-500 flex items-center gap-1.5 mt-0.5">
              <Mail size={13} />
              {profile?.email}
            </p>
            <div className="flex items-center gap-2 mt-2">
              <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${roleBg[profile?.role ?? "user"] ?? "bg-gray-100 text-gray-600 border-gray-200"}`}>
                {roleLabel[profile?.role ?? ""] ?? profile?.role}
              </span>
              {profile?.created_at && (
                <span className="text-xs text-gray-400 flex items-center gap-1">
                  <BadgeCheck size={12} />
                  Joined {new Date(profile.created_at).toLocaleDateString("en-MY", { month: "long", year: "numeric" })}
                </span>
              )}
            </div>
          </div>
        </div>
      </SectionCard>

      {/* Edit Profile */}
      <SectionCard title="Edit Profile" icon={<User size={16} />}>
        <form onSubmit={handleSaveProfile} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">
              Full Name
            </label>
            <input
              type="text"
              value={fullName}
              onChange={e => setFullName(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-pink-300 focus:border-pink-400 transition"
              placeholder="Your full name"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">
              Email Address
            </label>
            <input
              type="email"
              value={profile?.email ?? ""}
              disabled
              className="w-full border border-gray-100 rounded-xl px-4 py-2.5 text-sm text-gray-400 bg-gray-50 cursor-not-allowed"
            />
            <p className="text-xs text-gray-400 mt-1.5">Email cannot be changed. Contact an admin if needed.</p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">
              Role
            </label>
            <input
              type="text"
              value={roleLabel[profile?.role ?? ""] ?? profile?.role ?? ""}
              disabled
              className="w-full border border-gray-100 rounded-xl px-4 py-2.5 text-sm text-gray-400 bg-gray-50 cursor-not-allowed"
            />
            <p className="text-xs text-gray-400 mt-1.5">Role is assigned by an administrator.</p>
          </div>

          <div className="flex justify-end pt-1">
            <button
              type="submit"
              disabled={savingProfile}
              className="flex items-center gap-2 px-5 py-2.5 bg-[#e13d7d] hover:bg-[#c73570] text-white text-sm font-semibold rounded-xl transition disabled:opacity-60"
            >
              {savingProfile ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
              {savingProfile ? "Saving…" : "Save Changes"}
            </button>
          </div>
        </form>
      </SectionCard>

      {/* Change Password */}
      <SectionCard title="Change Password" icon={<Lock size={16} />}>
        <form onSubmit={handleChangePassword} className="space-y-4">
          {[
            { label: "Current Password", value: currentPassword, set: setCurrentPassword, show: showCurrent, toggle: () => setShowCurrent(p => !p) },
            { label: "New Password", value: newPassword, set: setNewPassword, show: showNew, toggle: () => setShowNew(p => !p) },
            { label: "Confirm New Password", value: confirmPassword, set: setConfirmPassword, show: showConfirm, toggle: () => setShowConfirm(p => !p) },
          ].map(({ label, value, set, show, toggle }) => (
            <div key={label}>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">
                {label}
              </label>
              <div className="relative">
                <input
                  type={show ? "text" : "password"}
                  value={value}
                  onChange={e => set(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 pr-10 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-pink-300 focus:border-pink-400 transition"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={toggle}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition"
                >
                  {show ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>
          ))}

          <p className="text-xs text-gray-400">Password must be at least 8 characters.</p>

          <div className="flex justify-end pt-1">
            <button
              type="submit"
              disabled={savingPassword}
              className="flex items-center gap-2 px-5 py-2.5 bg-[#e13d7d] hover:bg-[#c73570] text-white text-sm font-semibold rounded-xl transition disabled:opacity-60"
            >
              {savingPassword ? <Loader2 size={15} className="animate-spin" /> : <Lock size={15} />}
              {savingPassword ? "Updating…" : "Update Password"}
            </button>
          </div>
        </form>
      </SectionCard>

      {/* Sign Out */}
      <SectionCard title="Session" icon={<LogOut size={16} />}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-800">Sign out of EmotiSketch</p>
            <p className="text-xs text-gray-400 mt-0.5">You will be returned to the login screen.</p>
          </div>
          <button
            onClick={handleSignOut}
            className="flex items-center gap-2 px-4 py-2.5 border border-red-200 text-red-600 hover:bg-red-50 text-sm font-semibold rounded-xl transition"
          >
            <LogOut size={15} />
            Sign Out
          </button>
        </div>
      </SectionCard>
    </div>
  );
}
