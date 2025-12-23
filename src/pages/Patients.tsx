import React, { useState, useEffect } from "react";
import {
  Search,
  Plus,
  Filter,
  Loader2,
  Edit2,
  Trash2,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { supabase } from "../lib/supabaseClient";

export default function Patients() {
  const [patients, setPatients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 5;

  useEffect(() => {
    fetchPatients();
  }, []);

  // Reset to first page when searching
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  async function fetchPatients() {
    try {
      setLoading(true);
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

  // Filter logic
  const filteredPatients = patients.filter((patient) =>
    patient.full_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Pagination Logic
  const totalPages = Math.ceil(filteredPatients.length / ITEMS_PER_PAGE);
  const indexOfLastItem = currentPage * ITEMS_PER_PAGE;
  const indexOfFirstItem = indexOfLastItem - ITEMS_PER_PAGE;
  const currentItems = filteredPatients.slice(
    indexOfFirstItem,
    indexOfLastItem
  );

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
          <>
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
                          {patient.total_sketches || 0}
                        </td>
                        <td className="px-6 py-4 text-gray-500 text-sm">
                          {patient.last_session_at
                            ? new Date(
                                patient.last_session_at
                              ).toLocaleDateString()
                            : "No sessions yet"}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              title="Edit Patient"
                              className="p-2 text-amber-600 hover:bg-amber-100 rounded-xl transition-all active:scale-95"
                            >
                              <Edit2 size={18} />
                            </button>
                            <button
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

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex items-center justify-between">
                <div className="text-sm text-gray-600">
                  Showing{" "}
                  <span className="font-semibold">{indexOfFirstItem + 1}</span>{" "}
                  to{" "}
                  <span className="font-semibold">
                    {Math.min(indexOfLastItem, filteredPatients.length)}
                  </span>{" "}
                  of{" "}
                  <span className="font-semibold">
                    {filteredPatients.length}
                  </span>{" "}
                  results
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="p-2 rounded-lg border border-gray-300 bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronLeft size={20} />
                  </button>
                  <div className="flex items-center gap-1">
                    {[...Array(totalPages)].map((_, i) => (
                      <button
                        key={i + 1}
                        onClick={() => handlePageChange(i + 1)}
                        className={`w-10 h-10 rounded-lg text-sm font-semibold transition-colors ${
                          currentPage === i + 1
                            ? "bg-[#e13d7d] text-white"
                            : "bg-white text-gray-600 border border-gray-300 hover:bg-gray-50"
                        }`}
                      >
                        {i + 1}
                      </button>
                    ))}
                  </div>
                  <button
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="p-2 rounded-lg border border-gray-300 bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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
