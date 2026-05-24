import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    document.title = "Sign In | EmotiSketch";
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      alert(error.message);
      setLoading(false);
    } else {
      navigate("/dashboard");
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Logo */}

      {/* Login Form Container */}
      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-[400px]">
          {/* Header */}
          <h1 className="text-3xl font-bold text-gray-900 mb-8 text-center">
            Sign in to EmotiSketch
          </h1>

          {/* Google Button */}
          <button className="w-full bg-white border border-gray-300 rounded-lg py-3 px-4 flex items-center justify-center gap-3 hover:bg-gray-50 transition-colors mb-6">
            <svg
              width="18"
              height="18"
              viewBox="0 0 18 18"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z"
                fill="#4285F4"
              />
              <path
                d="M9.003 18c2.43 0 4.467-.806 5.956-2.184l-2.909-2.258c-.806.54-1.837.86-3.047.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9.003 18z"
                fill="#34A853"
              />
              <path
                d="M3.964 10.71c-.18-.54-.282-1.117-.282-1.71s.102-1.17.282-1.71V4.958H.957C.347 6.173 0 7.548 0 9.001c0 1.452.348 2.827.957 4.041l3.007-2.332z"
                fill="#FBBC05"
              />
              <path
                d="M9.003 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.464.891 11.426 0 9.002 0 5.481 0 2.438 2.017.957 4.958L3.964 7.29c.708-2.127 2.692-3.71 5.036-3.71z"
                fill="#EA4335"
              />
            </svg>
            <span className="text-sm font-medium text-gray-700">
              Continue with Google
            </span>
          </button>

          {/* Divider */}
          <div className="flex items-center gap-4 mb-6">
            <div className="flex-1 h-px bg-gray-300"></div>
            <span className="text-sm text-gray-500">or</span>
            <div className="flex-1 h-px bg-gray-300"></div>
          </div>

          {/* Input Fields */}
          <form onSubmit={handleLogin} className="space-y-4">
            {/* Email Input */}
            <div className="bg-gray-200 rounded-lg p-3">
              <label
                htmlFor="email"
                className="block text-xs font-medium text-gray-600 uppercase mb-1"
              >
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-transparent border-none outline-none text-sm text-gray-900 placeholder-gray-400"
                //placeholder="Email"
              />
            </div>
            {/* Password Input */}
            <div className="bg-gray-200 rounded-lg p-3">
              <label
                htmlFor="password"
                className="block text-xs font-medium text-gray-600 uppercase mb-1"
              >
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-transparent border-none outline-none text-sm text-gray-900 placeholder-gray-400"
                //placeholder="Password"
              />
            </div>
            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#e13d7d] text-white rounded-lg py-3 font-medium hover:bg-[#c42f6a] transition-colors"
            >
              {loading ? "Authenticating..." : "Log in"}
            </button>
          </form>

          {/* Links */}
          <div className="mt-6 space-y-3 text-center">
            <div>
              {/*<a href="#" className="text-sm text-blue-600 hover:underline">
                Use single sign-on
              </a>*/}
            </div>
            <div>
              <Link to="/forgot-password" className="text-sm text-blue-600 hover:underline">
                Reset password
              </Link>
            </div>
            <p className="text-sm text-gray-600">
              No account?{" "}
              <Link
                to="/register"
                className="text-sm text-blue-600 hover:underline"
              >
                Create one
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
