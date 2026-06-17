import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import { Lock, Eye, EyeOff, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";

export default function ResetPassword() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);       // true once Supabase session is recovered
  const [invalid, setInvalid] = useState(false);   // true if the link is expired/bad
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");
  const readyRef = React.useRef(false);

  useEffect(() => {
    const markReady = () => {
      readyRef.current = true;
      setReady(true);
    };

    // Supabase fires PASSWORD_RECOVERY when the reset link is opened
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") markReady();
    });

    // Also check for an existing session (user already had the token exchanged)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) markReady();
    });

    // If no event fires within 8s, the link is likely expired
    const timeout = setTimeout(() => {
      if (!readyRef.current) setInvalid(true);
    }, 8000);

    return () => {
      subscription.unsubscribe();
      clearTimeout(timeout);
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (newPassword.length < 8) {
      setError("Password must be at least 8 characters."); return;
    }
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match."); return;
    }

    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) {
      setError(error.message);
    } else {
      setDone(true);
      setTimeout(() => navigate("/"), 3000);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-[400px]">

          {/* Success */}
          {done && (
            <div className="text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto">
                <CheckCircle2 size={32} className="text-green-500" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900">Password updated!</h1>
              <p className="text-sm text-gray-500">Redirecting you to login…</p>
            </div>
          )}

          {/* Invalid / expired link */}
          {!done && invalid && (
            <div className="text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto">
                <AlertCircle size={32} className="text-red-500" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900">Link expired</h1>
              <p className="text-sm text-gray-500">
                This reset link is invalid or has expired. Please request a new one.
              </p>
              <button
                onClick={() => navigate("/")}
                className="text-sm text-blue-600 hover:underline"
              >
                Back to login
              </button>
            </div>
          )}

          {/* Loading — waiting for Supabase session */}
          {!done && !invalid && !ready && (
            <div className="flex flex-col items-center gap-4">
              <Loader2 size={32} className="animate-spin text-pink-500" />
              <p className="text-sm text-gray-500">Verifying reset link…</p>
            </div>
          )}

          {/* Set new password form */}
          {!done && !invalid && ready && (
            <>
              <div className="w-12 h-12 rounded-xl bg-pink-50 flex items-center justify-center mb-6">
                <Lock size={22} className="text-[#e13d7d]" />
              </div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Set new password</h1>
              <p className="text-sm text-gray-500 mb-8">Choose a strong password for your account.</p>

              <form onSubmit={handleSubmit} className="space-y-4">
                {[
                  { label: "New Password", value: newPassword, set: setNewPassword, show: showNew, toggle: () => setShowNew(p => !p) },
                  { label: "Confirm Password", value: confirmPassword, set: setConfirmPassword, show: showConfirm, toggle: () => setShowConfirm(p => !p) },
                ].map(({ label, value, set, show, toggle }) => (
                  <div key={label} className="bg-gray-200 rounded-lg p-3">
                    <label className="block text-xs font-medium text-gray-600 uppercase mb-1">{label}</label>
                    <div className="flex items-center gap-2">
                      <input
                        type={show ? "text" : "password"}
                        required
                        value={value}
                        onChange={e => set(e.target.value)}
                        className="flex-1 bg-transparent border-none outline-none text-sm text-gray-900 placeholder-gray-400"
                        placeholder="••••••••"
                      />
                      <button type="button" onClick={toggle} className="text-gray-400 hover:text-gray-600 transition flex-shrink-0">
                        {show ? <EyeOff size={15} /> : <Eye size={15} />}
                      </button>
                    </div>
                  </div>
                ))}

                {error && (
                  <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>
                )}

                <p className="text-xs text-gray-400">Minimum 8 characters.</p>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-[#e13d7d] text-white rounded-lg py-3 font-medium hover:bg-[#c42f6a] transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
                >
                  {loading ? <Loader2 size={15} className="animate-spin" /> : <Lock size={15} />}
                  {loading ? "Updating…" : "Update password"}
                </button>
              </form>
            </>
          )}

        </div>
      </div>
    </div>
  );
}
