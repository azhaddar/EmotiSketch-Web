import React from "react";
import {
  Search,
  Bell,
  Calendar,
  TrendingUp,
  DollarSign,
  Star,
  Users,
  BarChart3,
  MessageSquare,
  CreditCard,
  RefreshCw,
  GraduationCap,
  LayoutDashboard,
} from "lucide-react";

const Dashboard = () => {
  const standingsData = [
    {
      rank: 1,
      team: "Juventus",
      mp: 8,
      w: 6,
      d: 1,
      l: 1,
      g: "13:5",
      pts: 19,
      highlight: true,
    },
    { rank: 2, team: "Atalanta", mp: 8, w: 5, d: 1, l: 3, g: "10:2", pts: 16 },
    { rank: 3, team: "Inter", mp: 8, w: 5, d: 0, l: 3, g: "10:3", pts: 15 },
    { rank: 4, team: "Napoli", mp: 8, w: 4, d: 1, l: 3, g: "14:6", pts: 13 },
    { rank: 5, team: "Milan", mp: 8, w: 4, d: 1, l: 3, g: "8:4", pts: 13 },
    { rank: 6, team: "Roma", mp: 8, w: 4, d: 0, l: 4, g: "7:3", pts: 12 },
  ];

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-teal-50 via-blue-50 to-purple-100">
      {/* Sidebar */}
      <aside className="w-64 bg-[#FFFBF5] shadow-lg p-6 flex flex-col">
        <div className="mb-12">
          <h1 className="text-2xl font-bold text-gray-800">CoachPro</h1>
        </div>

        <nav className="space-y-2 flex-1">
          <a
            href="#"
            className="flex items-center gap-3 px-4 py-3 rounded-xl bg-teal-600 text-white font-medium transition-all"
          >
            <LayoutDashboard size={20} />
            <span>Dashboard</span>
          </a>
          <a
            href="#"
            className="flex items-center gap-3 px-4 py-3 rounded-xl text-gray-600 hover:bg-gray-100 transition-all"
          >
            <Users size={20} />
            <span>Squad</span>
          </a>
          <a
            href="#"
            className="flex items-center gap-3 px-4 py-3 rounded-xl text-gray-600 hover:bg-gray-100 transition-all"
          >
            <MessageSquare size={20} />
            <span>Messenger</span>
          </a>
          <a
            href="#"
            className="flex items-center gap-3 px-4 py-3 rounded-xl text-gray-600 hover:bg-gray-100 transition-all"
          >
            <BarChart3 size={20} />
            <span>Statistic</span>
          </a>
          <a
            href="#"
            className="flex items-center gap-3 px-4 py-3 rounded-xl text-gray-600 hover:bg-gray-100 transition-all"
          >
            <Calendar size={20} />
            <span>Calendar</span>
          </a>
          <a
            href="#"
            className="flex items-center gap-3 px-4 py-3 rounded-xl text-gray-600 hover:bg-gray-100 transition-all"
          >
            <CreditCard size={20} />
            <span>Finance</span>
          </a>
          <a
            href="#"
            className="flex items-center gap-3 px-4 py-3 rounded-xl text-gray-600 hover:bg-gray-100 transition-all"
          >
            <RefreshCw size={20} />
            <span>Transfers</span>
          </a>
          <a
            href="#"
            className="flex items-center gap-3 px-4 py-3 rounded-xl text-gray-600 hover:bg-gray-100 transition-all"
          >
            <GraduationCap size={20} />
            <span>Youth academy</span>
          </a>
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-8">
        {/* Header */}
        <header className="flex items-center justify-between mb-8">
          <div>
            <p className="text-teal-600 font-medium mb-1">
              Welcome back, Andrea👋
            </p>
            <h1 className="text-4xl font-bold text-gray-800">Dashboard</h1>
          </div>

          <div className="flex items-center gap-4">
            <div className="relative">
              <Search
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                size={20}
              />
              <input
                type="text"
                placeholder="Search..."
                className="pl-10 pr-4 py-2 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white"
              />
            </div>
            <button className="relative p-2 rounded-xl hover:bg-gray-100 transition-all">
              <Bell size={24} className="text-gray-600" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-teal-500 rounded-full"></span>
            </button>
            <div className="flex items-center gap-3 pl-4">
              <img
                src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop"
                alt="Andrea Pirlo"
                className="w-10 h-10 rounded-full object-cover"
              />
              <span className="font-medium text-gray-800">Andrea Pirlo</span>
            </div>
          </div>
        </header>

        {/* Dashboard Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Next Game Card */}
          <div className="bg-[#FFFBF5] rounded-3xl shadow-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-800">Next game</h2>
              <a
                href="#"
                className="text-teal-600 text-sm font-medium hover:underline"
              >
                View calendar
              </a>
            </div>

            <div className="mb-4">
              <p className="text-sm text-gray-600 flex items-center gap-2">
                <Users size={16} />
                Serie A • 21:00, 11 November, 2020
              </p>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <span className="font-semibold text-gray-800">Juventus</span>
                <div className="w-12 h-12 bg-white rounded-xl shadow flex items-center justify-center">
                  <div className="w-10 h-10 bg-black rounded-lg"></div>
                </div>
              </div>

              <div className="w-12 h-12 bg-pink-400 rounded-full flex items-center justify-center text-white font-bold">
                VS
              </div>

              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-white rounded-xl shadow flex items-center justify-center">
                  <div className="w-10 h-10 bg-green-700 rounded-lg"></div>
                </div>
                <span className="font-semibold text-gray-800">Sassuolo</span>
              </div>
            </div>
          </div>

          {/* Games Statistic Card */}
          <div className="bg-[#FFFBF5] rounded-3xl shadow-lg p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-800">
                Games statistic
              </h2>
              <a
                href="#"
                className="text-teal-600 text-sm font-medium hover:underline"
              >
                View all statistic
              </a>
            </div>

            <div className="mb-4">
              <div className="h-3 bg-gray-200 rounded-full overflow-hidden flex">
                <div
                  className="bg-teal-600 h-full"
                  style={{ width: "75%" }}
                ></div>
                <div
                  className="bg-gray-400 h-full"
                  style={{ width: "12.5%" }}
                ></div>
                <div
                  className="bg-pink-400 h-full"
                  style={{ width: "12.5%" }}
                ></div>
              </div>
            </div>

            <div className="grid grid-cols-4 gap-4">
              <div>
                <p className="text-xs text-gray-500 uppercase mb-1">PL</p>
                <p className="text-2xl font-bold text-gray-800">8</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase mb-1">
                  Victories
                </p>
                <p className="text-2xl font-bold text-gray-800">6</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase mb-1">Draws</p>
                <p className="text-2xl font-bold text-gray-800">1</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase mb-1">Lost</p>
                <p className="text-2xl font-bold text-gray-800">1</p>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Standings Table */}
          <div className="lg:col-span-2 bg-[#FFFBF5] rounded-3xl shadow-lg p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-800">Standings</h2>
              <a
                href="#"
                className="text-teal-600 text-sm font-medium hover:underline"
              >
                View all
              </a>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-left text-xs text-gray-500 uppercase">
                    <th className="pb-4">#</th>
                    <th className="pb-4">Team</th>
                    <th className="pb-4 text-center">MP</th>
                    <th className="pb-4 text-center">W</th>
                    <th className="pb-4 text-center">D</th>
                    <th className="pb-4 text-center">L</th>
                    <th className="pb-4 text-center">G</th>
                    <th className="pb-4 text-center">PTS</th>
                  </tr>
                </thead>
                <tbody>
                  {standingsData.map((row) => (
                    <tr
                      key={row.rank}
                      className={`${
                        row.highlight ? "bg-teal-50" : ""
                      } border-t border-gray-100`}
                    >
                      <td className="py-4 text-gray-600">{row.rank}</td>
                      <td className="py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-6 h-6 bg-gray-200 rounded"></div>
                          <span className="font-medium text-gray-800">
                            {row.team}
                          </span>
                        </div>
                      </td>
                      <td className="py-4 text-center text-gray-600">
                        {row.mp}
                      </td>
                      <td className="py-4 text-center text-gray-600">
                        {row.w}
                      </td>
                      <td className="py-4 text-center text-gray-600">
                        {row.d}
                      </td>
                      <td className="py-4 text-center text-gray-600">
                        {row.l}
                      </td>
                      <td className="py-4 text-center text-gray-600">
                        {row.g}
                      </td>
                      <td className="py-4 text-center font-bold text-gray-800">
                        {row.pts}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Right Column Stats and Banner */}
          <div className="space-y-6">
            {/* Stat Grid */}
            <div className="grid grid-cols-2 gap-4">
              {/* Possession */}
              <div className="bg-[#FFFBF5] rounded-3xl shadow-lg p-5">
                <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center mb-3">
                  <TrendingUp className="text-purple-600" size={20} />
                </div>
                <p className="text-xs text-gray-500 uppercase mb-1">
                  Possession
                </p>
                <p className="text-3xl font-bold text-gray-800">65%</p>
              </div>

              {/* Overall Price */}
              <div className="bg-[#FFFBF5] rounded-3xl shadow-lg p-5">
                <div className="w-10 h-10 bg-pink-100 rounded-full flex items-center justify-center mb-3">
                  <DollarSign className="text-pink-600" size={20} />
                </div>
                <p className="text-xs text-gray-500 uppercase mb-1">
                  Overall Price
                </p>
                <p className="text-2xl font-bold text-gray-800">
                  $690.2<span className="text-lg">m</span>
                </p>
              </div>

              {/* Transfer Budget */}
              <div className="bg-[#FFFBF5] rounded-3xl shadow-lg p-5">
                <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center mb-3">
                  <DollarSign className="text-orange-600" size={20} />
                </div>
                <p className="text-xs text-gray-500 uppercase mb-1">
                  Transfer Budget
                </p>
                <p className="text-2xl font-bold text-gray-800">
                  $240.6<span className="text-lg">m</span>
                </p>
              </div>

              {/* Average Score */}
              <div className="bg-[#FFFBF5] rounded-3xl shadow-lg p-5">
                <div className="w-10 h-10 bg-teal-100 rounded-full flex items-center justify-center mb-3">
                  <Star className="text-teal-600" size={20} />
                </div>
                <p className="text-xs text-gray-500 uppercase mb-1">
                  Average Score
                </p>
                <p className="text-3xl font-bold text-gray-800">7.2</p>
              </div>
            </div>

            {/* Training Banner */}
            <div className="bg-gradient-to-br from-teal-600 to-teal-700 rounded-3xl shadow-lg p-6 relative overflow-hidden">
              <div className="relative z-10">
                <p className="text-xs text-teal-100 uppercase mb-2">
                  Don't forget
                </p>
                <h3 className="text-2xl font-bold text-white mb-4">
                  Setup training
                  <br />
                  for next week
                </h3>
                <button className="bg-white text-teal-700 px-6 py-2 rounded-xl font-medium hover:bg-teal-50 transition-all">
                  Go to training center
                </button>
              </div>

              {/* Decorative Elements */}
              <div className="absolute right-4 bottom-4 w-32 h-32 opacity-20">
                <div className="absolute top-0 right-0 w-16 h-16 bg-white rounded-full"></div>
                <div className="absolute bottom-0 left-0 w-12 h-12 bg-yellow-300 rounded-lg transform rotate-45"></div>
                <div className="absolute bottom-8 right-8 w-10 h-10 bg-pink-400 rounded-full"></div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
