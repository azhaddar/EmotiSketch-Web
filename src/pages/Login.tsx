import React, { useState } from "react";

const Login: React.FC = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [keepLoggedIn, setKeepLoggedIn] = useState(false);

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      {/* Main Content */}
      <main className="flex-grow flex items-center justify-center px-4">
        <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md border border-gray-200">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-serif font-bold text-gray-900 mb-2 text-left">
              Log in
            </h1>
            <p className="text-left text-gray-600">
              Need a Mailchimp account?{" "}
              <a href="#" className="text-teal-600 hover:underline">
                Create an account
              </a>
            </p>
          </div>

          <form className="space-y-5">
            <div>
              <label
                htmlFor="username"
                className="block text-sm font-semibold text-gray-700 mb-1"
              >
                Username or Email
              </label>
              <input
                type="text"
                id="username"
                className="w-full px-4 py-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition-colors"
              />
            </div>

            <div>
              <div className="flex justify-between items-center mb-1">
                <label
                  htmlFor="password"
                  className="block text-sm font-semibold text-gray-700"
                >
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="text-teal-600 text-sm font-semibold hover:underline focus:outline-none"
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
              <input
                type={showPassword ? "text" : "password"}
                id="password"
                className="w-full px-4 py-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition-colors"
              />
            </div>

            <div className="flex items-center">
              <input
                id="keep-logged-in"
                type="checkbox"
                checked={keepLoggedIn}
                onChange={() => setKeepLoggedIn(!keepLoggedIn)}
                className="h-5 w-5 text-teal-600 focus:ring-teal-500 border-gray-300 rounded"
              />
              <label
                htmlFor="keep-logged-in"
                className="ml-2 block text-sm font-semibold text-gray-700 select-none cursor-pointer"
              >
                Keep me logged in
              </label>
            </div>

            <button
              type="submit"
              className="w-full py-3 px-4 bg-[#ff368c] hover:bg-[#e62e7a] text-white font-bold rounded-full text-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#ff368c]"
            >
              Log in
            </button>

            <div className="flex flex-col items-center space-y-3 mt-6 text-sm font-semibold text-teal-600">
              <div className="flex space-x-4">
                <a href="#" className="hover:underline">
                  Forgot username?
                </a>
                <a href="#" className="hover:underline">
                  Forgot password?
                </a>
              </div>
              <a href="#" className="hover:underline">
                Can't log in?
              </a>
            </div>
          </form>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-4 text-center text-xs text-gray-500">
        <p>
          ©2024 Intuit Inc. All rights reserved. Mailchimp® is a registered
          trademark of The Rocket Science Group.{" "}
          <a href="#" className="underline">
            Cookie Preferences
          </a>
          ,{" "}
          <a href="#" className="underline">
            Privacy
          </a>
          , and{" "}
          <a href="#" className="underline">
            Terms
          </a>
          .
        </p>
      </footer>
    </div>
  );
};

export default Login;
