import React, { useState, useEffect } from "react";
import { useNavigate, useLocation, useParams } from "react-router-dom";
import { ArrowLeft, Save, Loader2 } from "lucide-react";
import { supabase } from "../lib/supabaseClient";

export default function EditUser() {
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Initialize with state from navigation or empty defaults
  const [formData, setFormData] = useState({
    full_name: "",
    email: "",
    role: "user",
  });

  useEffect(() => {
    // If user data was passed via navigate state, use it
    if (location.state?.user) {
      setFormData({
        full_name: location.state.user.full_name || "",
        email: location.state.user.email || "",
        role: location.state.user.role || "user",
      });
    } else {
      // Fallback: Fetch user if state is missing (e.g., page refresh)
      fetchUserData();
    }
  }, [id, location.state]);

  async function fetchUserData() {
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", id)
      .single();

    if (data) {
      setFormData({
        full_name: data.full_name,
        email: data.email,
        role: data.role,
      });
    }
  }

  // src/pages/EditUser.tsx

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const { data, error } = await supabase
        .from("profiles")
        .update({
          full_name: formData.full_name,
          role: formData.role,
        })
        .eq("id", id)
        .select(); // Add .select() to get the updated row back

      if (error) throw error;

      // Check if any row was actually updated
      if (!data || data.length === 0) {
        throw new Error(
          "Update failed: You might not have permission to edit this user or the user does not exist."
        );
      }

      alert("User updated successfully!");
      navigate("/dashboard/users");
    } catch (error: any) {
      alert(error.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="max-w-3xl mx-auto p-4 flex flex-col h-full justify-center">
      <button
        onClick={() => navigate("/dashboard/users")}
        className="flex items-center gap-2 text-gray-500 hover:text-[#e13d7d] transition-colors mb-3 group w-fit"
      >
        <ArrowLeft
          size={18}
          className="group-hover:-translate-x-1 transition-transform"
        />
        <span className="text-sm font-medium">Back to User Management</span>
      </button>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-5 border-b border-gray-100 bg-gray-50/50">
          <h1 className="text-xl font-bold text-gray-900 leading-tight">
            Edit User Account
          </h1>
          <p className="text-xs text-gray-500">
            Modify user profile details and access levels.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1">
                Full Name
              </label>
              <input
                required
                type="text"
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-pink-500 outline-none text-sm"
                value={formData.full_name}
                onChange={(e) =>
                  setFormData({ ...formData, full_name: e.target.value })
                }
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1">
                Email (Read Only)
              </label>
              <input
                disabled
                type="email"
                className="w-full px-4 py-2 border border-gray-100 bg-gray-50 rounded-lg text-sm text-gray-500 cursor-not-allowed"
                value={formData.email}
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1">
                System Role
              </label>
              <select
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-pink-500 outline-none bg-white text-sm"
                value={formData.role}
                onChange={(e) =>
                  setFormData({ ...formData, role: e.target.value })
                }
              >
                <option value="user">User/Parent</option>
                <option value="therapist">Therapist</option>
                <option value="admin">Administrator</option>
              </select>
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-[#e13d7d] text-white py-3 rounded-xl font-bold hover:bg-[#c42f6a] transition-all flex justify-center items-center gap-2 shadow-md active:scale-[0.98] disabled:opacity-70 mt-2"
          >
            {isSubmitting ? (
              <Loader2 className="animate-spin" size={18} />
            ) : (
              <Save size={18} />
            )}
            <span className="text-sm">
              {isSubmitting ? "Saving Changes..." : "Update User Profile"}
            </span>
          </button>
        </form>
      </div>
    </div>
  );
}
