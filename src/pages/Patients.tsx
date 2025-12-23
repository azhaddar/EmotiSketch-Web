import React, { useState } from "react";
import { Users, Search, Plus, MoreVertical, Filter } from "lucide-react";

// Mock data for initial UI
const initialPatients = [
  {
    id: 1,
    name: "Ahmad Zaki",
    age: 8,
    lastSession: "2 hours ago",
    status: "Active",
    sketches: 12,
  },
  {
    id: 2,
    name: "Sarah Tan",
    age: 6,
    lastSession: "Yesterday",
    status: "Active",
    sketches: 8,
  },
  {
    id: 3,
    name: "Muthu Kumar",
    age: 7,
    lastSession: "3 days ago",
    status: "Inactive",
    sketches: 5,
  },
];

export default function Patients() {
  const [searchTerm, setSearchTerm] = useState("");

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
        <button className="flex items-center justify-center gap-2 bg-[#e13d7d] text-white px-6 py-3 rounded-lg font-semibold hover:bg-[#c42f6a] transition-all shadow-sm">
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

      {/* Patients Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
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
            {initialPatients.map((patient) => (
              <tr
                key={patient.id}
                className="hover:bg-gray-50 transition-colors"
              >
                <td className="px-6 py-4 font-medium text-gray-900">
                  {patient.name}
                </td>
                <td className="px-6 py-4 text-gray-600">{patient.age} y/o</td>
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
                  {patient.sketches}
                </td>
                <td className="px-6 py-4 text-gray-500 text-sm">
                  {patient.lastSession}
                </td>
                <td className="px-6 py-4 text-right">
                  <button className="p-2 hover:bg-gray-200 rounded-full transition-colors">
                    <MoreVertical size={16} className="text-gray-400" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
