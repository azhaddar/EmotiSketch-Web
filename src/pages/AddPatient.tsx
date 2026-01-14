import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Save, Loader2 } from "lucide-react";
import { supabase } from "../lib/supabaseClient";

export default function AddPatient() {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // State for logic
  const [currentUserRole, setCurrentUserRole] = useState("");
  const [currentUserId, setCurrentUserId] = useState(""); // Track ID for default value
  const [guardians, setGuardians] = useState<any[]>([]);

  const [formData, setFormData] = useState({
    full_name: "",
    age: "",
    gender: "Male",
    personality: "",
    guardian_id: "",
  });

  useEffect(() => {
    checkUserRoleAndFetchData();
  }, []);

  async function checkUserRoleAndFetchData() {
    try {
      // 1. Get current user
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      setCurrentUserId(user.id);

      // 2. Get their profile/role
      const { data: profile } = await supabase
        .from("profiles")
        .select("role, full_name, email")
        .eq("id", user.id)
        .single();

      const role = profile?.role || "user";
      setCurrentUserRole(role);

      // 3. Logic Branch:
      if (role === "user") {
        // If Parent: Set their ID immediately and put them in the "list" so the dropdown has an option to show
        setFormData((prev) => ({ ...prev, guardian_id: user.id }));
        setGuardians([
          {
            id: user.id,
            full_name: profile.full_name || "Me",
            email: profile.email,
          },
        ]);
      } else {
        // If Therapist/Admin: Fetch all available parents
        fetchGuardians();
      }
    } catch (error) {
      console.error("Error checking role:", error);
    }
  }

  async function fetchGuardians() {
    const { data } = await supabase
      .from("profiles")
      .select("id, full_name, email")
      .eq("role", "user")
      .order("full_name", { ascending: true });
    setGuardians(data || []);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("No authenticated user found.");

      // Prepare payload
      const payload: any = {
        full_name: formData.full_name,
        age: parseInt(formData.age),
        gender: formData.gender,
        personality: formData.personality,
        guardian_id: formData.guardian_id,
        status: "Active",
        total_sketches: 0,
      };

      // Role logic for therapist_id
      if (currentUserRole === "therapist") {
        payload.therapist_id = user.id;
      } else {
        payload.therapist_id = null;
      }

      const { error } = await supabase.from("patients").insert([payload]);

      if (error) throw error;

      alert("Child profile added successfully!");

      // Redirect based on role
      if (currentUserRole === "user") {
        navigate("/dashboard/children");
      } else {
        navigate("/dashboard/patients");
      }
    } catch (error: any) {
      alert(error.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="max-w-3xl mx-auto p-4 flex flex-col h-full justify-center">
      <button
        onClick={() =>
          navigate(
            currentUserRole === "user"
              ? "/dashboard/children"
              : "/dashboard/patients"
          )
        }
        className="flex items-center gap-2 text-gray-500 hover:text-[#e13d7d] transition-colors mb-3 group w-fit"
      >
        <ArrowLeft
          size={18}
          className="group-hover:-translate-x-1 transition-transform"
        />
        <span className="text-sm font-medium">
          {currentUserRole === "user"
            ? "Back to My Children"
            : "Back to Directory"}
        </span>
      </button>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-5 border-b border-gray-100 bg-gray-50/50">
          <h1 className="text-xl font-bold text-gray-900 leading-tight">
            {currentUserRole === "user"
              ? "Add My Child"
              : "Register New Patient"}
          </h1>
          <p className="text-xs text-gray-500">
            {currentUserRole === "user"
              ? "Create a profile for your child to start their emotional journey."
              : "Fill in the details to start a new therapy profile."}
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
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-pink-500 outline-none transition-all text-sm"
                placeholder="Child's full name"
                value={formData.full_name}
                onChange={(e) =>
                  setFormData({ ...formData, full_name: e.target.value })
                }
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1">
                Age
              </label>
              <input
                required
                type="number"
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-pink-500 outline-none transition-all text-sm"
                placeholder="Years old"
                value={formData.age}
                onChange={(e) =>
                  setFormData({ ...formData, age: e.target.value })
                }
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1">
                Gender
              </label>
              <select
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-pink-500 outline-none bg-white text-sm"
                value={formData.gender}
                onChange={(e) =>
                  setFormData({ ...formData, gender: e.target.value })
                }
              >
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </div>

            {/* ASSIGN PARENT DROPDOWN */}
            {/* Logic: Always show, but disable if user is a parent */}
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1">
                Assign Parent (Guardian)
              </label>
              <select
                className={`w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-pink-500 outline-none bg-white text-sm ${
                  currentUserRole === "user" ? "bg-gray-100 text-gray-500" : ""
                }`}
                value={formData.guardian_id}
                onChange={(e) =>
                  setFormData({ ...formData, guardian_id: e.target.value })
                }
                disabled={currentUserRole === "user"} // DISABLE if parent
              >
                {/* If parent, show only their option. If admin/therapist, show placeholder */}
                {currentUserRole !== "user" && (
                  <option value="">-- Select a Parent (Optional) --</option>
                )}
                {guardians.map((guardian) => (
                  <option key={guardian.id} value={guardian.id}>
                    {guardian.full_name} ({guardian.email})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1">
              Personality Notes
            </label>
            <textarea
              rows={2}
              className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-pink-500 outline-none transition-all text-sm resize-none"
              placeholder="Brief behavior or therapy notes..."
              value={formData.personality}
              onChange={(e) =>
                setFormData({ ...formData, personality: e.target.value })
              }
            />
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
              {isSubmitting ? "Registering..." : "Save Child Profile"}
            </span>
          </button>
        </form>
      </div>
    </div>
  );
}
