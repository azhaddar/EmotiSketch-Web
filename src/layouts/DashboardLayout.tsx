import { useEffect, useRef, useState } from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";
import { Bell, Menu, Send } from "lucide-react";
import ChatBox from "../components/ChatBox";
import NotificationPanel from "../components/NotificationPanel";

export default function DashboardLayout() {
  const [sidebarOpen, setSidebarOpen]       = useState(true);
  const [chatOpen, setChatOpen]             = useState(false);
  const [notifOpen, setNotifOpen]           = useState(false);
  const [unreadCount, setUnreadCount]       = useState(0);

  const chatRef  = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);

  // Close panels when clicking outside
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (chatRef.current && !chatRef.current.contains(e.target as Node))  setChatOpen(false);
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setNotifOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  function toggleChat() {
    setChatOpen(v => !v);
    setNotifOpen(false);
  }

  function toggleNotif() {
    setNotifOpen(v => !v);
    setChatOpen(false);
  }

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Overlay for mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Header */}
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 lg:px-8 shadow-sm relative z-40">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              aria-label="Toggle sidebar"
            >
              <Menu size={24} />
            </button>

            <div>
              <h2 className="font-semibold text-gray-900 text-lg">EmotiSketch Panel</h2>
              <p className="text-xs text-gray-500 hidden sm:block">Manage your emotional sketches</p>
            </div>
          </div>

          {/* Right-side icons */}
          <div className="flex items-center gap-1">

            {/* Notification Bell */}
            <div ref={notifRef} className="relative">
              <button
                onClick={toggleNotif}
                className="relative p-2.5 hover:bg-gray-100 rounded-xl transition-colors"
                aria-label="Notifications"
              >
                <Bell size={20} className="text-gray-600" />
              </button>
              <NotificationPanel open={notifOpen} onClose={() => setNotifOpen(false)} />
            </div>

            {/* Chat Icon */}
            <div ref={chatRef} className="relative">
              <button
                onClick={toggleChat}
                className="relative p-2.5 hover:bg-gray-100 rounded-xl transition-colors"
                aria-label="Messages"
              >
                <Send size={20} className="text-gray-600" />
                {unreadCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-[#e13d7d] text-white text-[9px] font-bold flex items-center justify-center leading-none">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </button>
              <ChatBox
                open={chatOpen}
                onClose={() => setChatOpen(false)}
                onUnreadChange={setUnreadCount}
              />
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
