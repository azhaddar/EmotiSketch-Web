import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";

const Register: React.FC = () => {
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    // This logic sends the 'full_name' to Supabase Auth Metadata
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName, // This triggers the 'teleportation' in SQL
        },
      },
    });

    if (error) {
      alert(error.message);
      setLoading(false);
    } else {
      alert(
        "Registration successful! Please check your email for verification."
      );
      navigate("/"); // Redirect to login
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      <main className="flex-grow flex items-center justify-center px-4">
        <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md border border-gray-200">
          <div className="text-center mb-8">
            <h1 className="text-left text-4xl font-serif font-bold text-gray-900 mb-2">
              Create Account
            </h1>
            <p className="text-gray-600 text-left">
              Already have an account?{" "}
              <Link to="/" className="text-teal-600 hover:underline">
                Log in
              </Link>
            </p>
          </div>

          <form onSubmit={handleRegister} className="space-y-5">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Full Name
              </label>
              <input
                type="text"
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-teal-500 outline-none"
                placeholder="Name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Email Address
              </label>
              <input
                type="email"
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-teal-500 outline-none"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Password
              </label>
              <input
                type="password"
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-teal-500 outline-none"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className={`w-full py-3 px-4 bg-[#ff368c] hover:bg-[#e62e7a] text-white font-bold rounded-full text-lg transition-colors ${
                loading ? "opacity-50" : ""
              }`}
            >
              {loading ? "Creating account..." : "Sign up"}
            </button>
          </form>
        </div>
      </main>
    </div>
  );
};

export default Register;
