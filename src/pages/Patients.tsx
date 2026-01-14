import React, { useState, useEffect } from "react";
import {
  Search,
  UserPlus,
  Filter,
  Loader2,
  Edit2,
  Trash2,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
} from "lucide-react";
import { supabase } from "../lib/supabaseClient";
import { useNavigate } from "react-router-dom";

export default function Patients() {
  const [patients, setPatients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const navigate = useNavigate();

  // New State for Role and Therapists List
  const [userRole, setUserRole] = useState("");
  const [therapists, setTherapists] = useState<any[]>([]);

  // Filter States
  const [statusFilter, setStatusFilter] = useState("All");
  const [genderFilter, setGenderFilter] = useState("All");
  const [ageFilter, setAgeFilter] = useState("All");
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 5;

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      fetchPatients();
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [searchTerm, statusFilter, genderFilter, ageFilter]);

  async function fetchPatients() {
    try {
      setLoading(true);

      // 1. Get the current logged-in user
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      // 2. Check if this user is an admin or therapist
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

      const role = profile?.role || "";
      setUserRole(role);

      // 2a. If Admin, fetch the list of therapists for the dropdown
      if (role === "admin") {
        const { data: therapistList } = await supabase
          .from("profiles")
          .select("id, full_name")
          .eq("role", "therapist")
          .order("full_name", { ascending: true });

        // Only update if we successfully got data
        if (therapistList) {
          setTherapists(therapistList);
        }
      }

      // 3. Build the query
      let query = supabase
        .from("patients")
        .select(
          `
        *,
        guardian:profiles!guardian_id (
          full_name
        )
      `
        )
        .order("full_name", { ascending: true });

      // 4. ROLE FILTER: Only restrict by therapist_id if the user is NOT an admin
      if (role !== "admin") {
        query = query.eq("therapist_id", user.id);
      }

      // 5. SEARCH FILTER
      if (searchTerm) {
        query = query.ilike("full_name", `%${searchTerm}%`);
      }

      // 6. STATUS FILTER
      if (statusFilter !== "All") {
        query = query.eq("status", statusFilter);
      }

      // 7. GENDER FILTER
      if (genderFilter !== "All") {
        query = query.eq("gender", genderFilter);
      }

      // 8. AGE RANGE FILTER
      if (ageFilter !== "All") {
        if (ageFilter === "5-7") {
          query = query.gte("age", 5).lte("age", 7);
        } else if (ageFilter === "8-10") {
          query = query.gte("age", 8).lte("age", 10);
        } else if (ageFilter === "11+") {
          query = query.gte("age", 11);
        }
      }

      // 9. Execute the final query
      const { data, error } = await query;

      if (error) throw error;
      setPatients(data || []);
      setCurrentPage(1);
    } catch (error: any) {
      console.error("Error fetching patients:", error.message);
    } finally {
      setLoading(false);
    }
  }

  // Edit Patient - Navigate with patient data
  function handleEdit(patient: any) {
    navigate(`/dashboard/patients/edit/${patient.id}`, {
      state: { patient },
    });
  }

  // Handle assigning a therapist (Admin Only)
  async function handleAssignTherapist(
    patientId: string,
    newTherapistId: string
  ) {
    try {
      const { error } = await supabase
        .from("patients")
        .update({ therapist_id: newTherapistId || null })
        .eq("id", patientId);

      if (error) throw error;

      // Optimistically update local state to avoid full reload
      setPatients((prev) =>
        prev.map((p) =>
          p.id === patientId ? { ...p, therapist_id: newTherapistId } : p
        )
      );

      alert("Therapist assigned successfully!");
    } catch (error: any) {
      alert(`Error updating therapist: ${error.message}`);
    }
  }

  // Delete Patient
  async function handleDelete(patientId: string, patientName: string) {
    const confirmed = window.confirm(
      `Are you sure you want to delete ${patientName}? This action cannot be undone.`
    );

    if (!confirmed) return;

    try {
      const { error } = await supabase
        .from("patients")
        .delete()
        .eq("id", patientId);

      if (error) throw error;

      alert("Patient deleted successfully!");
      fetchPatients(); // Refresh the list
    } catch (error: any) {
      alert(`Error deleting patient: ${error.message}`);
    }
  }

  // Pagination Logic
  const totalPages = Math.ceil(patients.length / ITEMS_PER_PAGE);
  const indexOfLastItem = currentPage * ITEMS_PER_PAGE;
  const indexOfFirstItem = indexOfLastItem - ITEMS_PER_PAGE;
  const currentItems = patients.slice(indexOfFirstItem, indexOfLastItem);

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
    }
  };

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Children Directory
          </h1>
          <p className="text-gray-600">
            Manage and monitor children's therapy progress.
          </p>
        </div>
        <button
          onClick={() => navigate("add")}
          className="flex items-center justify-center gap-2 bg-[#e13d7d] text-white px-6 py-3 rounded-lg font-semibold hover:bg-[#c42f6a] transition-all shadow-sm active:scale-95"
        >
          <UserPlus size={20} />
          <span>Add New Children</span>
        </button>
      </div>

      {/* Control Bar */}
      <div className="relative bg-white p-4 rounded-xl shadow-sm border border-gray-200 mb-6 flex flex-col md:flex-row gap-4 justify-between items-center z-10">
        <div className="relative flex-1 max-w-md w-full">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            size={18}
          />
          <input
            type="text"
            placeholder="Search by name..."
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-pink-500"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="relative w-full md:w-auto">
          <button
            onClick={() => setIsFilterOpen(!isFilterOpen)}
            className={`flex items-center justify-center gap-2 px-4 py-2 border rounded-lg text-sm font-medium transition-all w-full
              ${
                isFilterOpen
                  ? "bg-pink-50 border-pink-500 text-pink-600"
                  : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"
              }`}
          >
            <Filter size={16} />
            <span>Filter</span>
            <ChevronDown
              size={14}
              className={`transition-transform ${
                isFilterOpen ? "rotate-180" : ""
              }`}
            />
          </button>

          {isFilterOpen && (
            <div className="absolute right-0 mt-2 w-72 bg-white border border-gray-200 rounded-xl shadow-xl p-4 animate-in fade-in slide-in-from-top-2 duration-200 z-20">
              <div className="space-y-5">
                {/* Status Filter */}
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase mb-2 italic">
                    Children Status
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {["All", "Active", "Inactive"].map((status) => (
                      <button
                        key={status}
                        onClick={() => setStatusFilter(status)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all
                          ${
                            statusFilter === status
                              ? "bg-[#e13d7d] text-white"
                              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                          }`}
                      >
                        {status}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Age Range Filter */}
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase mb-2 italic">
                    Age Range
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {["All", "5-7", "8-10", "11+"].map((age) => (
                      <button
                        key={age}
                        onClick={() => setAgeFilter(age)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all
                          ${
                            ageFilter === age
                              ? "bg-[#e13d7d] text-white"
                              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                          }`}
                      >
                        {age}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Gender Filter */}
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase mb-2 italic">
                    Gender
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {["All", "Male", "Female"].map((gender) => (
                      <button
                        key={gender}
                        onClick={() => setGenderFilter(gender)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all
                          ${
                            genderFilter === gender
                              ? "bg-[#e13d7d] text-white"
                              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                          }`}
                      >
                        {gender}
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  onClick={() => {
                    setStatusFilter("All");
                    setGenderFilter("All");
                    setAgeFilter("All");
                  }}
                  className="w-full text-center text-xs text-gray-400 hover:text-pink-500 underline mt-2 pt-2 border-t border-gray-50"
                >
                  Reset All Filters
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Table Section */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="animate-spin text-[#e13d7d] mb-4" size={40} />
            <p className="text-gray-500 font-medium">Updating results...</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200 text-xs uppercase font-semibold text-gray-600">
                    <th className="px-6 py-4">Child Name</th>
                    <th className="px-6 py-4">Age</th>
                    <th className="px-6 py-4">Gender</th>
                    <th className="px-6 py-4">Total Sketch</th>
                    <th className="px-6 py-4">Personality</th>
                    <th className="px-6 py-4">Parent's Name</th>
                    <th className="px-6 py-4">Status</th>
                    {/* NEW: Admin Only Column Header */}
                    {userRole === "admin" && (
                      <th className="px-6 py-4">Assign Therapist</th>
                    )}
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {currentItems.length > 0 ? (
                    currentItems.map((patient) => (
                      <tr
                        key={patient.id}
                        className="hover:bg-gray-50 transition-colors"
                      >
                        <td className="px-6 py-4 font-medium text-gray-900">
                          {patient.full_name}
                        </td>
                        <td className="px-6 py-4 text-gray-600">
                          {patient.age} y/o
                        </td>
                        <td className="px-6 py-4 text-gray-600">
                          {patient.gender}
                        </td>
                        <td className="px-6 py-4 text-gray-600">
                          {patient.total_sketches || 0}
                        </td>
                        <td className="px-6 py-4 text-gray-600 max-w-xs truncate">
                          {patient.personality || "—"}
                        </td>
                        <td className="px-6 py-4 text-gray-600">
                          {patient.guardian?.full_name || "Not assigned"}
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`inline-block px-2 py-1 rounded-full text-[10px] font-bold uppercase ${
                              patient.status === "Active"
                                ? "bg-green-100 text-green-700"
                                : "bg-gray-100 text-gray-600"
                            }`}
                          >
                            {patient.status}
                          </span>
                        </td>
                        {/* NEW: Admin Only Dropdown */}
                        {userRole === "admin" && (
                          <td className="px-6 py-4">
                            <select
                              value={patient.therapist_id || ""}
                              onChange={(e) =>
                                handleAssignTherapist(
                                  patient.id,
                                  e.target.value
                                )
                              }
                              className="text-xs border border-gray-300 rounded px-2 py-1 bg-white focus:ring-2 focus:ring-pink-500 focus:outline-none w-40"
                            >
                              <option value="">Unassigned</option>
                              {therapists.map((t) => (
                                <option key={t.id} value={t.id}>
                                  {t.full_name}
                                </option>
                              ))}
                            </select>
                          </td>
                        )}
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleEdit(patient)}
                              title="Edit Patient"
                              className="p-2 text-amber-600 hover:bg-amber-100 rounded-xl transition-all active:scale-95"
                            >
                              <Edit2 size={18} />
                            </button>
                            <button
                              onClick={() =>
                                handleDelete(patient.id, patient.full_name)
                              }
                              title="Delete Patient"
                              className="p-2 text-red-600 hover:bg-red-100 rounded-xl transition-all active:scale-95"
                            >
                              <Trash2 size={18} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td
                        colSpan={userRole === "admin" ? 9 : 8}
                        className="px-6 py-10 text-center text-gray-500 italic"
                      >
                        No patients match the selected criteria.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex items-center justify-between">
                <div className="text-sm text-gray-600">
                  Showing{" "}
                  <span className="font-semibold">{indexOfFirstItem + 1}</span>{" "}
                  to{" "}
                  <span className="font-semibold">
                    {Math.min(indexOfLastItem, patients.length)}
                  </span>{" "}
                  of <span className="font-semibold">{patients.length}</span>{" "}
                  results
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="p-2 rounded-lg border border-gray-300 bg-white text-gray-600 disabled:opacity-50"
                  >
                    <ChevronLeft size={20} />
                  </button>
                  <button
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="p-2 rounded-lg border border-gray-300 bg-white text-gray-600 disabled:opacity-50"
                  >
                    <ChevronRight size={20} />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
