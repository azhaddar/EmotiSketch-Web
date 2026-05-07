import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search,
  Filter,
  Loader2,
  Edit2,
  Trash2,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  UserPlus,
} from "lucide-react";
import { supabase } from "../lib/supabaseClient";

export default function UsersManagement() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  // Filter States (Matching Patients style)
  const [roleFilter, setRoleFilter] = useState("All");
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const navigate = useNavigate();

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 5;

  function handleEdit(user: any) {
    navigate(`/dashboard/users/edit/${user.id}`, {
      state: { user },
    });
  }
  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      fetchUsers();
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [searchTerm, roleFilter]);

  async function handleDelete(
    userId: string,
    userName: string,
    userRole: string
  ) {
    // 1. Customized Warning Message
    let warningMessage = `Are you sure you want to delete ${userName}?`;

    if (userRole === "user") {
      warningMessage += `\n\n⚠️ WARNING: This is a Parent account. Deleting them will PERMANENTLY DELETE all their registered children's data too.`;
    } else if (userRole === "therapist") {
      warningMessage += `\n\nℹ️ Note: This is a Therapist. Their patients will be set to "Unassigned" but will NOT be deleted.`;
    }

    const confirmed = window.confirm(warningMessage);
    if (!confirmed) return;

    try {
      setLoading(true);

      const { error } = await supabase.functions.invoke("delete-user", {
        body: { userId },
      });

      if (error) throw error;

      alert("User deleted successfully!");
      fetchUsers();
    } catch (error: any) {
      alert(`Error deleting user: ${error.message}`);
    } finally {
      setLoading(false);
    }
  }
  async function fetchUsers() {
    try {
      setLoading(true);
      let query = supabase
        .from("profiles")
        .select("*")
        .order("full_name", { ascending: true });

      if (searchTerm) {
        query = query.or(
          `full_name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%`
        );
      }

      if (roleFilter !== "All") {
        query = query.eq("role", roleFilter.toLowerCase());
      }

      const { data, error } = await query;
      if (error) throw error;
      setUsers(data || []);
      setCurrentPage(1);
    } catch (error: any) {
      console.error("Error fetching users:", error.message);
    } finally {
      setLoading(false);
    }
  }

  // Pagination Logic
  const totalPages = Math.ceil(users.length / ITEMS_PER_PAGE);
  const indexOfLastItem = currentPage * ITEMS_PER_PAGE;
  const indexOfFirstItem = indexOfLastItem - ITEMS_PER_PAGE;
  const currentItems = users.slice(indexOfFirstItem, indexOfLastItem);

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
    }
  };

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header Section - Matches Patients.tsx */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            User Management
          </h1>
          <p className="text-gray-600">
            Manage system access, roles, and administrative permissions.
          </p>
        </div>
        <button
          onClick={() => navigate("add")} // Navigates to /dashboard/users/add
          className="flex items-center justify-center gap-2 bg-[#e13d7d] text-white px-6 py-3 rounded-lg font-semibold hover:bg-[#c42f6a] transition-all shadow-sm active:scale-95"
        >
          <UserPlus size={20} />
          <span>Add New User</span>
        </button>
      </div>

      {/* Control Bar - Matches Patients.tsx */}
      <div className="relative bg-white p-4 rounded-xl shadow-sm border border-gray-200 mb-6 flex flex-col md:flex-row gap-4 justify-between items-center z-10">
        <div className="relative flex-1 max-w-md w-full">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            size={18}
          />
          <input
            type="text"
            placeholder="Search by name or email..."
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
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase mb-2 italic">
                    User Role
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {["All", "Admin", "Therapist", "User"].map((role) => (
                      <button
                        key={role}
                        onClick={() => setRoleFilter(role)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all
                          ${
                            roleFilter === role
                              ? "bg-[#e13d7d] text-white"
                              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                          }`}
                      >
                        {role}
                      </button>
                    ))}
                  </div>
                </div>
                <button
                  onClick={() => setRoleFilter("All")}
                  className="w-full text-center text-xs text-gray-400 hover:text-pink-500 underline mt-2 pt-2 border-t border-gray-50"
                >
                  Reset Filters
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Table Section - Matches Patients.tsx */}
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
                    <th className="px-6 py-4">Full Name</th>
                    <th className="px-6 py-4">Email</th>
                    <th className="px-6 py-4">Role</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {currentItems.length > 0 ? (
                    currentItems.map((user) => (
                      <tr
                        key={user.id}
                        className="hover:bg-gray-50 transition-colors"
                      >
                        <td className="px-6 py-4 font-medium text-gray-900">
                          {user.full_name}
                        </td>
                        <td className="px-6 py-4 text-gray-600">
                          {user.email}
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`inline-block px-2 py-1 rounded-full text-[10px] font-bold uppercase ${
                              user.role === "admin"
                                ? "bg-purple-100 text-purple-700"
                                : user.role === "therapist"
                                ? "bg-blue-100 text-blue-700"
                                : "bg-gray-100 text-gray-600"
                            }`}
                          >
                            {user.role}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleEdit(user)}
                              className="p-2 text-amber-600 hover:bg-amber-100 rounded-xl transition-all active:scale-95"
                            >
                              <Edit2 size={18} />
                            </button>
                            <button
                              onClick={() =>
                                handleDelete(user.id, user.full_name, user.role)
                              } // Pass role here
                              title="Delete User"
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
                        colSpan={4}
                        className="px-6 py-10 text-center text-gray-500 italic"
                      >
                        No users found matching your criteria.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination - Matches Patients.tsx */}
            {totalPages > 1 && (
              <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex items-center justify-between">
                <div className="text-sm text-gray-600">
                  Showing{" "}
                  <span className="font-semibold">{indexOfFirstItem + 1}</span>{" "}
                  to{" "}
                  <span className="font-semibold">
                    {Math.min(indexOfLastItem, users.length)}
                  </span>{" "}
                  of <span className="font-semibold">{users.length}</span> users
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
