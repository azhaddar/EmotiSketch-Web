import { Bell } from "lucide-react";

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function NotificationPanel({ open, onClose }: Props) {
  if (!open) return null;

  return (
    <div className="absolute top-14 right-0 w-80 bg-white rounded-2xl shadow-2xl border border-gray-200 z-50 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-gradient-to-r from-pink-50 to-purple-50">
        <p className="font-bold text-gray-900">Notifications</p>
        <button
          onClick={onClose}
          className="text-xs text-[#e13d7d] font-semibold hover:underline"
        >
          Mark all read
        </button>
      </div>

      {/* Empty state */}
      <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
        <Bell size={32} className="text-gray-300 mb-3" />
        <p className="text-sm font-medium text-gray-500">No notifications</p>
        <p className="text-xs text-gray-400 mt-1">You're all caught up!</p>
      </div>
    </div>
  );
}
