import React, { useState, useEffect } from "react";
import { useNavigate, useLocation, useParams } from "react-router-dom";
import { ArrowLeft, Save, Loader2 } from "lucide-react";
import { supabase } from "../lib/supabaseClient";

export default function EditPatient() {
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    full_name: "",
    age: "",
    gender: "Male",
    personality: "",
    status: "Active",
  });

  useEffect(() => {
    // Get patient data from navigation state
    if (location.state?.patient) {
      const patient = location.state.patient;
      setFormData({
        full_name: patient.full_name || "",
        age: patient.age?.toString() || "",
        gender: patient.gender || "Male",
        personality: patient.personality || "",
        status: patient.status || "Active",
      });
    } else {
      // If no state, fetch from database
      fetchPatient();
    }
  }, [id]);

  async function fetchPatient() {
    try {
      const { data, error } = await supabase
        .from("patients")
        .select("*")
        .eq("id", id)
        .single();

      if (error) throw error;

      setFormData({
        full_name: data.full_name || "",
        age: data.age?.toString() || "",
        gender: data.gender || "Male",
        personality: data.personality || "",
        status: data.status || "Active",
      });
    } catch (error: any) {
      alert("Error loading patient data: " + error.message);
      navigate("/dashboard/patients");
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const { error } = await supabase
        .from("patients")
        .update({
          full_name: formData.full_name,
          age: parseInt(formData.age),
          gender: formData.gender,
          personality: formData.personality,
          status: formData.status,
        })
        .eq("id", id);

      if (error) throw error;

      alert("Patient updated successfully!");
      navigate("/dashboard/patients");
    } catch (error: any) {
      alert(error.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="max-w-3xl mx-auto p-4 flex flex-col h-full justify-center">
      <button
        onClick={() => navigate("/dashboard/patients")}
        className="flex items-center gap-2 text-gray-500 hover:text-[#e13d7d] transition-colors mb-3 group w-fit"
      >
        <ArrowLeft
          size={18}
          className="group-hover:-translate-x-1 transition-transform"
        />
        <span className="text-sm font-medium">Back to Directory</span>
      </button>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-5 border-b border-gray-100 bg-gray-50/50">
          <h1 className="text-xl font-bold text-gray-900 leading-tight">
            Edit Child Profile
          </h1>
          <p className="text-xs text-gray-500">
            Update the child's information below.
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

            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1">
                Status
              </label>
              <select
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-pink-500 outline-none bg-white text-sm"
                value={formData.status}
                onChange={(e) =>
                  setFormData({ ...formData, status: e.target.value })
                }
              >
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
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
              {isSubmitting ? "Updating..." : "Update Patient Profile"}
            </span>
          </button>
        </form>
      </div>
    </div>
  );
}
