import { useState, useEffect } from "react";
import { supabase } from "../lib/supabaseClient";
import { User, NotebookPen, ArrowRight, Loader2, Plus } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface Child {
  id: string;
  full_name: string;
  age: number;
  gender: string;
  total_sketches: number;
  status: string;
  therapist_id?: string | null; // Added to check assignment status
}

export default function ChildrenProgress() {
  const navigate = useNavigate();
  const [children, setChildren] = useState<Child[]>([]);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState("");

  useEffect(() => {
    fetchChildren();
  }, []);

  async function fetchChildren() {
    try {
      setLoading(true);
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;

      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

      const role = profile?.role?.toLowerCase() || "user";
      setUserRole(role);

      let query = supabase
        .from("patients")
        .select("*")
        .order("full_name", { ascending: true });

      // LOGIC UPDATE: Handle visibility based on role
      if (role === "admin") {
        // Admins see everyone
      } else if (role === "therapist") {
        // Therapists see patients assigned to them
        query = query.eq("therapist_id", user.id);
      } else {
        // Parents (Users) see their own children
        query = query.eq("guardian_id", user.id);
      }

      const { data, error } = await query;

      if (error) throw error;
      setChildren(data || []);
    } catch (error) {
      console.error("Error fetching children:", error);
    } finally {
      setLoading(false);
    }
  }

  // Helper: Determine visual status (matches Patients.tsx)
  const getDisplayStatus = (child: Child) => {
    if (!child.therapist_id) return "Unassigned";
    return child.status;
  };

  // Helper: Get color based on status
  const getStatusColor = (status: string) => {
    switch (status) {
      case "Unassigned":
        return "bg-yellow-100 text-yellow-700 border border-yellow-200";
      case "Active":
        return "bg-green-100 text-green-700 border border-green-200";
      case "Inactive":
        return "bg-gray-100 text-gray-600 border border-gray-200";
      default:
        return "bg-gray-100 text-gray-600";
    }
  };

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          {userRole === "admin"
            ? "All Children Progress"
            : "Children's Journey"}
        </h1>
        <p className="text-gray-600">
          Track emotional growth and sketch activity over time.
        </p>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="animate-spin text-pink-600" size={40} />
        </div>
      ) : children.length === 0 ? (
        <div className="bg-white p-10 rounded-xl shadow-sm text-center border border-gray-200">
          <div className="inline-flex p-4 bg-gray-50 rounded-full mb-4">
            <User size={32} className="text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900">
            No profiles found
          </h3>
          <p className="text-gray-500 mt-1 mb-6 max-w-md mx-auto">
            {userRole === "therapist"
              ? "You have no active patients assigned."
              : userRole === "admin"
              ? "No children registered in the system."
              : "You haven't been assigned to any children yet."}
          </p>

          {/* Re-included the Parent 'Add Child' button just in case */}
          {userRole === "user" && (
            <button
              onClick={() => navigate("/dashboard/patients/add")}
              className="inline-flex items-center gap-2 bg-[#e13d7d] text-white px-6 py-3 rounded-lg font-semibold hover:bg-[#c42f6a] transition-all shadow-sm active:scale-95"
            >
              <Plus size={20} />
              <span>Add Your First Child</span>
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {children.map((child) => {
            const displayStatus = getDisplayStatus(child);
            return (
              <div
                key={child.id}
                onClick={() => navigate(`/dashboard/children/${child.id}`)}
                className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow cursor-pointer group"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold text-white
                    ${
                      child.gender === "Female" ? "bg-pink-400" : "bg-blue-400"
                    }`}
                    >
                      {child.full_name.charAt(0)}
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">
                        {child.full_name}
                      </h3>
                      <p className="text-sm text-gray-500">
                        {child.age} years old
                      </p>
                    </div>
                  </div>
                  {/* Updated Status Badge */}
                  <span
                    className={`px-2 py-1 text-[10px] font-bold uppercase rounded-full 
                  ${getStatusColor(displayStatus)}`}
                  >
                    {displayStatus}
                  </span>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2 text-gray-600">
                      <NotebookPen size={16} /> Total Sketches
                    </span>
                    <span className="font-semibold text-gray-900">
                      {child.total_sketches || 0}
                    </span>
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-gray-100 flex items-center justify-between text-pink-600 text-sm font-medium group-hover:text-pink-700">
                  View Detailed Report
                  <ArrowRight
                    size={16}
                    className="transform group-hover:translate-x-1 transition-transform"
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
