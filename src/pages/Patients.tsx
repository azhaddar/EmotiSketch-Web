import React, { useState, useEffect } from "react";
import {
  Users,
  Search,
  Plus,
  MoreVertical,
  Filter,
  Loader2,
} from "lucide-react";
import { supabase } from "../lib/supabaseClient";

export default function Patients() {
  const [patients, setPatients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  // Fetch data from Supabase on component mount
  useEffect(() => {
    fetchPatients();
  }, []);

  async function fetchPatients() {
    try {
      setLoading(true);
      // Selects all columns from your 'patients' table
      const { data, error } = await supabase
        .from("patients")
        .select("*")
        .order("full_name", { ascending: true });

      if (error) throw error;
      setPatients(data || []);
    } catch (error: any) {
      console.error("Error fetching patients:", error.message);
    } finally {
      setLoading(false);
    }
  }

  // Logic to filter the list based on search input
  const filteredPatients = patients.filter((patient) =>
    patient.full_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Patient Directory
          </h1>
          <p className="text-gray-600">
            Manage and monitor children's therapy progress.
          </p>
        </div>
        <button className="flex items-center justify-center gap-2 bg-[#e13d7d] text-white px-6 py-3 rounded-lg font-semibold hover:bg-[#c42f6a] transition-all shadow-sm active:scale-95">
          <Plus size={20} />
          <span>Add New Patient</span>
        </button>
      </div>

      {/* Filters & Search */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 mb-6 flex flex-col md:flex-row gap-4 justify-between">
        <div className="relative flex-1 max-w-md">
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
        <div className="flex gap-2">
          <button className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50">
            <Filter size={16} />
            Filter
          </button>
        </div>
      </div>

      {/* Patients Table Container */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="animate-spin text-[#e13d7d] mb-4" size={40} />
            <p className="text-gray-500 font-medium">
              Fetching patient data...
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 text-xs uppercase font-semibold text-gray-600">
                  <th className="px-6 py-4">Patient Name</th>
                  <th className="px-6 py-4">Age</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Sketches</th>
                  <th className="px-6 py-4">Last Session</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredPatients.length > 0 ? (
                  filteredPatients.map((patient) => (
                    <tr
                      key={patient.id}
                      className="hover:bg-gray-50 transition-colors"
                    >
                      <td className="px-6 py-4 font-medium text-gray-900">
                        {patient.full_name} {/* Using DB field name */}
                      </td>
                      <td className="px-6 py-4 text-gray-600">
                        {patient.age} y/o
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
                      <td className="px-6 py-4 text-gray-600 font-medium">
                        {patient.total_sketches || 0}{" "}
                        {/* Using DB field name */}
                      </td>
                      <td className="px-6 py-4 text-gray-500 text-sm">
                        {patient.last_session_at
                          ? new Date(
                              patient.last_session_at
                            ).toLocaleDateString()
                          : "No sessions yet"}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button className="p-2 hover:bg-gray-200 rounded-full transition-colors">
                          <MoreVertical size={16} className="text-gray-400" />
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-6 py-10 text-center text-gray-500 italic"
                    >
                      No matching patients found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
