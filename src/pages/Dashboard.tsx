import { Image, Heart, TrendingUp, Clock } from "lucide-react";

export default function Dashboard() {
  const stats = [
    {
      title: "Total Sketches",
      value: "12",
      icon: <Image size={24} />,
      color: "bg-blue-500",
      textColor: "text-blue-600",
      bgColor: "bg-blue-50",
    },
    {
      title: "Favorites",
      value: "8",
      icon: <Heart size={24} />,
      color: "bg-pink-500",
      textColor: "text-pink-600",
      bgColor: "bg-pink-50",
    },
    {
      title: "This Week",
      value: "3",
      icon: <TrendingUp size={24} />,
      color: "bg-green-500",
      textColor: "text-green-600",
      bgColor: "bg-green-50",
    },
    {
      title: "Hours Spent",
      value: "24",
      icon: <Clock size={24} />,
      color: "bg-purple-500",
      textColor: "text-purple-600",
      bgColor: "bg-purple-50",
    },
  ];

  const recentSketches = [
    {
      id: 1,
      title: "Happy Moment",
      emotion: "Joy",
      date: "2 hours ago",
      thumbnail:
        "https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?w=300&h=300&fit=crop",
    },
    {
      id: 2,
      title: "Peaceful Evening",
      emotion: "Calm",
      date: "Yesterday",
      thumbnail:
        "https://images.unsplash.com/photo-1513364776144-60967b0f800f?w=300&h=300&fit=crop",
    },
    {
      id: 3,
      title: "Rainy Day",
      emotion: "Melancholy",
      date: "2 days ago",
      thumbnail:
        "https://images.unsplash.com/photo-1470252649378-9c29740c9fa8?w=300&h=300&fit=crop",
    },
  ];

  return (
    <div className="max-w-7xl mx-auto">
      {/* Welcome Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Welcome back! 👋
        </h1>
        <p className="text-gray-600">
          Here's what's happening with your emotional journey today.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {stats.map((stat, index) => (
          <div
            key={index}
            className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow"
          >
            <div className="flex items-center justify-between mb-4">
              <div className={`p-3 rounded-lg ${stat.bgColor}`}>
                <div className={stat.textColor}>{stat.icon}</div>
              </div>
            </div>
            <h3 className="text-gray-600 text-sm font-medium mb-1">
              {stat.title}
            </h3>
            <p className={`text-3xl font-bold ${stat.textColor}`}>
              {stat.value}
            </p>
          </div>
        ))}
      </div>

      {/* Recent Sketches */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-900">Recent Sketches</h2>
          <button className="text-sm text-[#e13d7d] hover:underline font-medium">
            View All
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {recentSketches.map((sketch) => (
            <div key={sketch.id} className="group cursor-pointer">
              <div className="relative overflow-hidden rounded-lg mb-3 aspect-square">
                <img
                  src={sketch.thumbnail}
                  alt={sketch.title}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="absolute bottom-0 left-0 right-0 p-4">
                    <span className="inline-block px-3 py-1 bg-white/90 rounded-full text-xs font-semibold text-gray-900">
                      {sketch.emotion}
                    </span>
                  </div>
                </div>
              </div>
              <h3 className="font-semibold text-gray-900 mb-1">
                {sketch.title}
              </h3>
              <p className="text-sm text-gray-500">{sketch.date}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="mt-8 bg-gradient-to-r from-pink-500 to-purple-500 rounded-xl shadow-sm p-8 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold mb-2">
              Ready to create something new?
            </h2>
            <p className="text-white/90 mb-4">
              Express your emotions through art and sketching.
            </p>
            <button className="bg-white text-pink-600 px-6 py-3 rounded-lg font-semibold hover:bg-gray-100 transition-colors">
              Start New Sketch
            </button>
          </div>
          <div className="hidden lg:block">
            <Image size={80} className="text-white/20" />
          </div>
        </div>
      </div>
    </div>
  );
}
