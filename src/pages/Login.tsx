import React, { useState } from "react";
import { useNavigate } from "react-router-dom"; // For redirection
import { supabase } from "../lib/supabaseClient"; // Ensure you have this client file

const Login: React.FC = () => {
  // 1. Define states for user inputs and UI behavior
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [keepLoggedIn, setKeepLoggedIn] = useState(false);

  const navigate = useNavigate(); // Hook for programmatic navigation

  // 2. The authentication function
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    // Call Supabase to sign in with password
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email,
      password: password,
    });

    if (error) {
      alert("Login failed: " + error.message);
      setLoading(false);
    } else {
      console.log("Success! User data:", data);
      // 3. Redirect to the dashboard upon successful login
      navigate("/dashboard");
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      <main className="flex-grow flex items-center justify-center px-4">
        <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md border border-gray-200">
          <div className="text-center mb-8">
            <h1 className="text-left text-4xl font-serif font-bold text-gray-900 mb-2">
              Log in
            </h1>
            <p className="text-gray-600 text-left">
              Need an account?{" "}
              <a href="#" className="text-teal-600 hover:underline">
                Create an account
              </a>
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-semibold text-gray-700 mb-1"
              >
                Email Address
              </label>
              <input
                type="email"
                id="email"
                required
                value={email} // Controlled component
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-teal-500 outline-none transition-colors"
                placeholder="name@uthm.edu.my"
              />
            </div>

            <div>
              <div className="flex justify-between items-center mb-1">
                <label
                  htmlFor="password"
                  name="password"
                  className="block text-sm font-semibold text-gray-700"
                >
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="text-teal-600 text-sm font-semibold hover:underline"
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
              <input
                type={showPassword ? "text" : "password"}
                id="password"
                required
                value={password} // Controlled component
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-teal-500 outline-none transition-colors"
              />
            </div>

            <div className="flex items-center">
              <input
                id="keep-logged-in"
                type="checkbox"
                checked={keepLoggedIn}
                onChange={() => setKeepLoggedIn(!keepLoggedIn)}
                className="h-5 w-5 text-teal-600 border-gray-300 rounded cursor-pointer"
              />
              <label
                htmlFor="keep-logged-in"
                className="ml-2 block text-sm font-semibold text-gray-700 cursor-pointer"
              >
                Keep me logged in
              </label>
            </div>

            <button
              type="submit"
              disabled={loading} // Prevent double submission
              className={`w-full py-3 px-4 bg-[#ff368c] hover:bg-[#e62e7a] text-white font-bold rounded-full text-lg transition-colors focus:ring-2 focus:ring-offset-2 focus:ring-[#ff368c] ${
                loading ? "opacity-50 cursor-not-allowed" : ""
              }`}
            >
              {loading ? "Logging in..." : "Log in"}
            </button>
          </form>
        </div>
      </main>

      <footer className="py-4 text-center text-xs text-gray-500">
        <p>©2025 EmotiSketch. All rights reserved.</p>
      </footer>
    </div>
  );
};

export default Login;
