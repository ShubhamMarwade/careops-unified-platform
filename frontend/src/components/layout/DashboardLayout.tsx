'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/auth';
import Sidebar from './Sidebar';
import { Bell, Search } from 'lucide-react';
import { dashboardAPI } from '@/lib/api';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { user, loadFromStorage, isAuthenticated } = useAuthStore();
  const [alerts, setAlerts] = useState<any[]>([]);
  const [showAlerts, setShowAlerts] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadFromStorage();
  }, []);

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }
    if (isAuthenticated && user && !user.workspace_id) {
      router.push('/onboarding');
      return;
    }
    setLoading(false);
    fetchAlerts();
  }, [isAuthenticated, user]);

  const fetchAlerts = async () => {
    try {
      const { data } = await dashboardAPI.get();
      setAlerts(data.alerts || []);
    } catch {}
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#0f1117] via-[#0d1015] to-black">
        <div className="relative">
          <div className="w-10 h-10 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin" />
          <div className="absolute inset-0 rounded-full blur-xl bg-indigo-500/20" />
        </div>
      </div>
    );
  }

  return (
  <div className="flex min-h-screen bg-gradient-to-br from-[#0f1117] via-[#0d1015] to-black text-gray-200">

    <Sidebar />

    <div className="flex-1 flex flex-col min-w-0">

      {/* Top bar */}
      <header className="sticky top-0 z-40 backdrop-blur-xl bg-white/5 border-b border-white/10 px-8 py-4 flex items-center justify-between">

        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            type="text"
            placeholder="Search contacts, bookings..."
            className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-gray-200 placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500/40 transition"
          />
        </div>

        {/* Right Section */}
        <div className="flex items-center gap-4 ml-6">

          {/* Notification */}
          <div className="relative">
            <button
              onClick={() => setShowAlerts(!showAlerts)}
              className="relative p-2.5 text-gray-400 hover:text-white hover:bg-white/5 rounded-xl transition"
            >
              <Bell className="w-5 h-5" />
              {alerts.length > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-red-500 text-white text-[10px] font-semibold rounded-full flex items-center justify-center shadow-lg shadow-red-500/30">
                  {alerts.length}
                </span>
              )}
            </button>

            {showAlerts && (
              <div className="absolute right-0 top-14 w-80 bg-[#111319] backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl shadow-black/40 z-50 max-h-96 overflow-y-auto">

                <div className="p-4 border-b border-white/10 flex items-center justify-between">
                  <h3 className="font-semibold text-sm text-white">
                    Notifications
                  </h3>

                  {alerts.length > 0 && (
                    <button
                      onClick={async () => {
                        await dashboardAPI.markAllRead();
                        setAlerts([]);
                      }}
                      className="text-xs text-indigo-400 hover:text-indigo-300 transition"
                    >
                      Mark all read
                    </button>
                  )}
                </div>

                {alerts.length === 0 ? (
                  <div className="p-6 text-center text-gray-500 text-sm">
                    No new notifications
                  </div>
                ) : (
                  alerts.map((alert) => (
                    <button
                      key={alert.id}
                      onClick={() => {
                        dashboardAPI.markAlertRead(alert.id);
                        if (alert.link) router.push(alert.link);
                        setShowAlerts(false);
                      }}
                      className="w-full text-left p-4 hover:bg-white/5 border-b border-white/5 last:border-0 transition"
                    >
                      <div className="flex items-start gap-3">

                        <div
                          className={cn(
                            "w-2 h-2 rounded-full mt-2",
                            alert.severity === "critical"
                              ? "bg-red-400"
                              : alert.severity === "warning"
                              ? "bg-yellow-400"
                              : "bg-blue-400"
                          )}
                        />

                        <div>
                          <p className="text-sm font-medium text-white">
                            {alert.title}
                          </p>
                          <p className="text-xs text-gray-400 mt-1">
                            {alert.message}
                          </p>
                        </div>

                      </div>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>

        </div>
      </header>

      {/* Content */}
      <main className="flex-1 p-8">
        {children}
      </main>

    </div>
  </div>
);
}

function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(' ');
}