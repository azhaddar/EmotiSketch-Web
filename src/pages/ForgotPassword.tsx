import React, { useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import { ArrowLeft, Mail, Send, CheckCircle2 } from "lucide-react";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    if (error) {
      setError(error.message);
    } else {
      setSent(true);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-[400px]">
          <Link
            to="/"
            className="flex items-center gap-2 text-gray-500 hover:text-gray-800 transition-colors mb-8 group w-fit"
          >
            <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
            <span className="text-sm font-medium">Back to login</span>
          </Link>

          {sent ? (
            <div className="text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto">
                <CheckCircle2 size={32} className="text-green-500" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900">Check your email</h1>
              <p className="text-sm text-gray-500">
                We sent a password reset link to <strong>{email}</strong>. Open it on this device to set a new password.
              </p>
              <p className="text-xs text-gray-400">
                Didn't receive it? Check your spam folder or{" "}
                <button
                  onClick={() => setSent(false)}
                  className="text-blue-600 hover:underline"
                >
                  try again
                </button>
                .
              </p>
            </div>
          ) : (
            <>
              <div className="w-12 h-12 rounded-xl bg-pink-50 flex items-center justify-center mb-6">
                <Mail size={22} className="text-[#e13d7d]" />
              </div>

              <h1 className="text-3xl font-bold text-gray-900 mb-2">Reset password</h1>
              <p className="text-sm text-gray-500 mb-8">
                Enter your account email and we'll send you a reset link.
              </p>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="bg-gray-200 rounded-lg p-3">
                  <label htmlFor="email" className="block text-xs font-medium text-gray-600 uppercase mb-1">
                    Email
                  </label>
                  <input
                    id="email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-transparent border-none outline-none text-sm text-gray-900 placeholder-gray-400"
                    placeholder="your@email.com"
                  />
                </div>

                {error && (
                  <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-[#e13d7d] text-white rounded-lg py-3 font-medium hover:bg-[#c42f6a] transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
                >
                  {loading ? (
                    "Sending…"
                  ) : (
                    <>
                      <Send size={15} />
                      Send reset link
                    </>
                  )}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
