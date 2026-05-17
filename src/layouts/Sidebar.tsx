import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  Home,
  ChartNoAxesCombined,
  Settings,
  LogOut,
  User,
  ShieldUser,
  UserPlus,
  Users,
  BarChart3,
  GraduationCap,
} from "lucide-react";
import { supabase } from "../lib/supabaseClient";
import { useEffect, useState } from "react";

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const [full_name, setFullName] = useState<string>("User");
  const [email, setUserEmail] = useState<string>("");
  const [role, setRole] = useState<string>(""); // Default to empty string

  useEffect(() => {
    const getProfileName = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        setUserEmail(user.email ?? "");

        const { data } = await supabase
          .from("profiles")
          .select("full_name, email, role")
          .eq("id", user.id)
          .single();

        if (data) {
          console.log("Detected Role:", data.role); // Debugging
          setFullName(data.full_name || "User");
          // Store role in lowercase to avoid "User" vs "user" bugs
          setRole((data.role || "").toLowerCase());
        }
      }
    };

    getProfileName();
  }, []);

  const menuItems = [
    {
      name: "Dashboard",
      path: "/dashboard",
      icon: <Home size={20} />,
      visible: true,
    },
    {
      name: "Children",
      path: "/dashboard/patients",
      icon: <Users size={20} />,
      // Visible to therapist and admin
      visible: role === "therapist" || role === "admin",
    },
    {
      name: "Add Child",
      path: "/dashboard/patients/add", // Reusing the existing page
      icon: <UserPlus size={20} />,
      visible: role === "user", // Only visible to Parents
    },
    {
      name: "Children Progress", // This is the "Patient Progress" you mentioned
      path: "/dashboard/children",
      icon: <ChartNoAxesCombined size={20} />,
      // FIX: Now visible to User (Parent), Therapist, AND Admin
      visible: role === "user" || role === "therapist" || role === "admin",
    },
    {
      name: "Analytics",
      path: "/dashboard/analytics",
      icon: <BarChart3 size={20} />,
      visible: role === "therapist" || role === "admin",
    },
    {
      name: "Therapists",
      path: "/dashboard/therapists",
      icon: <GraduationCap size={20} />,
      visible: role === "admin" || role === "therapist" || role === "user",
    },
    {
      name: "Users",
      path: "/dashboard/users",
      icon: <ShieldUser size={20} />,
      visible: role === "admin",
    },
    {
      name: "Settings",
      path: "/dashboard/settings",
      icon: <Settings size={20} />,
      visible: true,
    },
  ];

  const handleLogout = async () => {
    if (window.confirm("Are you sure you want to log out?")) {
      await supabase.auth.signOut();
      navigate("/");
    }
  };

  const handleLinkClick = () => {
    if (window.innerWidth < 1024) {
      onClose();
    }
  };

  if (!isOpen) {
    return null;
  }

  return (
    <aside className="w-64 bg-white border-r border-gray-200 flex flex-col h-full shadow-lg flex-shrink-0">
      <div className="p-6 border-b border-gray-100">
        <h1 className="text-2xl font-bold text-gray-900">EmotiSketch</h1>
        <p className="text-xs text-gray-500 mt-1">Express Your Emotions</p>
      </div>

      <div className="p-4 border-b border-gray-100">
        <div className="flex items-center gap-3 p-3 rounded-lg bg-gray-50">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-pink-400 to-purple-500 flex items-center justify-center">
            <User size={20} className="text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-gray-900 truncate">
              {full_name}
            </p>
            <p className="text-xs text-gray-500 truncate">{email}</p>
            <p className="text-[10px] uppercase font-bold text-pink-500">
              {role || "..."}
            </p>
          </div>
        </div>
      </div>

      <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto">
        {menuItems
          .filter((item) => item.visible)
          .map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={handleLinkClick}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all ${
                  isActive
                    ? "bg-gradient-to-r from-pink-50 to-purple-50 text-[#e13d7d] shadow-sm"
                    : "text-gray-600 hover:bg-gray-50"
                }`}
              >
                <span className={isActive ? "text-[#e13d7d]" : "text-gray-400"}>
                  {item.icon}
                </span>
                <span>{item.name}</span>
              </Link>
            );
          })}
      </nav>

      <div className="p-4 border-t border-gray-200">
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-gray-600 hover:bg-red-50 hover:text-red-600 transition-all"
        >
          <LogOut size={20} />
          <span>Log out</span>
        </button>
        <p className="text-xs text-gray-400 text-center mt-4">
          © 2026 EmotiSketch
        </p>
      </div>
    </aside>
  );
}
