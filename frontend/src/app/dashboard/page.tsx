'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { dashboardAPI } from '@/lib/api';
import {
  Calendar, MessageSquare, FileText, Package,
  AlertTriangle, ArrowRight, Clock, Users, TrendingUp,
  CheckCircle, XCircle, Eye
} from 'lucide-react';

export default function DashboardPage() {
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboard();
    const interval = setInterval(fetchDashboard, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, []);

  const fetchDashboard = async () => {
    try {
      const { data } = await dashboardAPI.get();
      setData(data);
    } catch (err) {
      console.error('Dashboard fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-3 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
      </div>
    );
  }

  if (!data) return <div className="text-center text-gray-400 py-20">Failed to load dashboard</div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white tracking-tight">
          Dashboard
        </h1>
        <p className="text-gray-400 mt-1">
          Real-time snapshot of your business intelligence
        </p>
      </div>


      {/* Key Alerts */}
      {data.alerts.length > 0 && (
        <div className="space-y-2">
          {data.alerts.slice(0, 3).map((alert: any) => (
            <button
              key={alert.id}
              onClick={() => alert.link && router.push(alert.link)}
              className={`w-full flex items-center gap-3 p-4 rounded-2xl border text-left transition-all backdrop-blur ${alert.severity === 'critical'
                  ? 'bg-red-500/10 border-red-500/30 hover:bg-red-500/15'
                  : alert.severity === 'warning'
                    ? 'bg-yellow-500/10 border-yellow-500/30 hover:bg-yellow-500/15'
                    : 'bg-blue-500/10 border-blue-500/30 hover:bg-blue-500/15'
                }`}

            >
              <AlertTriangle className={`w-5 h-5 flex-shrink-0 ${
                alert.severity === 'critical' ? 'text-red-400' :
                  alert.severity === 'warning' ? 'text-yellow-400' :
                    'text-blue-400'

              }`} />
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm">{alert.title}</p>
                <p className="text-xs text-gray-400 truncate">{alert.message}</p>
              </div>
              <ArrowRight className="w-4 h-4 text-gray-400" />
            </button>
          ))}
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Bookings */}
        <div className="card p-6 cursor-pointer hover:border-indigo-500/40 hover:shadow-lg hover:shadow-indigo-500/10 transition-all">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 bg-blue-500/15 rounded-xl flex items-center justify-center">
              <Calendar className="w-5 h-5 text-blue-400" />
            </div>
            <ArrowRight
              onClick={() => router.push('/dashboard/bookings')}
              className="w-4 h-4 text-gray-400 cursor-pointer hover:text-indigo-400 transition"
            />
          </div>
          <p className="text-2xl font-bold">{data.bookings.today}</p>
          <p className="text-sm text-gray-400">Today's Bookings</p>
          <div className="mt-3 flex items-center gap-4 text-xs">
            <span className="text-blue-400">{data.bookings.upcoming} upcoming</span>
            <span className="text-green-400">{data.bookings.completed} completed</span>
            {data.bookings.no_show > 0 && <span className="text-red-400">{data.bookings.no_show} no-show</span>}
          </div>
        </div>

        {/* Leads */}
        <div className="card p-6 cursor-pointer hover:border-indigo-500/40 hover:shadow-lg hover:shadow-indigo-500/10 transition-all">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 bg-purple-500/15 rounded-xl flex items-center justify-center">
              <MessageSquare className="w-5 h-5 text-purple-400" />
            </div>
            <ArrowRight
              onClick={() => router.push('/dashboard/inbox')}
              className="w-4 h-4 text-gray-400 cursor-pointer hover:text-indigo-400 transition"
            />
          </div>
          <p className="text-2xl font-bold">{data.leads.open_conversations}</p>
          <p className="text-sm text-gray-400">Open Conversations</p>
          <div className="mt-3 flex items-center gap-4 text-xs">
            <span className="text-purple-400">{data.leads.new_today} new today</span>
            <span className="text-orange-400">{data.leads.unanswered} unanswered</span>
          </div>
        </div>

        {/* Forms */}
        <div className="card p-6 cursor-pointer hover:border-indigo-500/40 hover:shadow-lg hover:shadow-indigo-500/10 transition-all">
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 bg-green-500/15 rounded-xl flex items-center justify-center">
              <FileText className="w-5 h-5 text-green-400" />
            </div>
            <ArrowRight
              onClick={() => router.push('/dashboard/forms')}
              className="w-4 h-4 text-gray-400 cursor-pointer hover:text-indigo-400 transition"
            />
          </div>
          <p className="text-2xl font-bold">{data.forms.pending}</p>
          <p className="text-sm text-gray-400">Pending Forms</p>
          <div className="mt-3 flex items-center gap-4 text-xs">
            <span className="text-green-400">{data.forms.completed} completed</span>
            {data.forms.overdue > 0 && <span className="text-red-400">{data.forms.overdue} overdue</span>}
          </div>
        </div>

        {/* Inventory */}
        <div className="card p-6 cursor-pointer hover:border-indigo-500/40 hover:shadow-lg hover:shadow-indigo-500/10 transition-all">
          <div className="flex items-center justify-between mb-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
              data.inventory.low_stock_count > 0 ? 'bg-red-500/15' : 'bg-orange-100'
            }`}>
              <Package className={`w-5 h-5 ${
                data.inventory.low_stock_count > 0 ? 'text-red-400' : 'text-orange-600'
              }`} />
            </div>
            <ArrowRight
              onClick={() => router.push('/dashboard/inventory')}
              className="w-4 h-4 text-gray-400 cursor-pointer hover:text-indigo-400 transition"
            />
          </div>
          <p className="text-2xl font-bold">{data.inventory.low_stock_count}</p>
          <p className="text-sm text-gray-400">Low Stock Alerts</p>
          {data.inventory.low_stock_items.length > 0 && (
            <div className="mt-3 text-xs text-red-400">
              {data.inventory.low_stock_items.slice(0, 2).map((i: any) => i.name).join(', ')}
            </div>
          )}
        </div>
      </div>

      {/* Today's Schedule & Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Schedule */}
        <div className="lg:col-span-2 card">
          <div className="p-5 border-b flex items-center justify-between">
            <h2 className="font-semibold flex items-center gap-2">
              <Clock className="w-5 h-5 text-primary-500" /> Today's Schedule
            </h2>
            <button onClick={() => router.push('/dashboard/bookings')} className="text-sm text-primary-600 hover:text-primary-700 flex items-center gap-1">
              View All <ArrowRight className="w-3 h-3" />
            </button>
          </div>
          <div className="p-5">
            {data.todays_schedule.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                <Calendar className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No bookings today</p>
              </div>
            ) : (
              <div className="space-y-3">
                {data.todays_schedule.map((item: any) => (
                  <div key={item.id} className="flex items-center gap-4 p-3 rounded-lg hover:bg-white/5 transition-colors">
                    <div className="w-1 h-12 rounded-full" style={{ backgroundColor: item.service_color }} />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm">{item.contact_name}</p>
                      <p className="text-xs text-gray-400">{item.service_name}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium">{item.time}</p>
                      <p className="text-xs text-gray-400">{item.end_time}</p>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      item.status === 'completed' ? 'bg-green-500/15 text-green-400 border border-green-500/30' :
                      item.status === 'confirmed' ? 'bg-blue-500/15 text-blue-400 border border-blue-500/30' :
                      item.status === 'no_show' ? 'bg-red-500/15 text-red-400 border border-red-500/30' :
                      'bg-gray-500/15 text-gray-400 border border-gray-500/30'
                    }`}>
                      {item.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Quick Stats */}
        <div className="card">
          <div className="p-5 border-b">
            <h2 className="font-semibold flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-primary-500" /> Quick Overview
            </h2>
          </div>
          <div className="p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Users className="w-4 h-4" /> Total Contacts
              </div>
              <span className="font-semibold">{data.leads.total_contacts}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <CheckCircle className="w-4 h-4 text-green-500" /> Completed Bookings
              </div>
              <span className="font-semibold">{data.bookings.completed}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <XCircle className="w-4 h-4 text-red-500" /> No-Shows
              </div>
              <span className="font-semibold">{data.bookings.no_show}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <FileText className="w-4 h-4 text-green-500" /> Completed Forms
              </div>
              <span className="font-semibold">{data.forms.completed}</span>
            </div>

            <div className="h-px bg-white/10" />

            {/* Inventory alerts in sidebar */}
            {data.inventory.low_stock_items.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase mb-2">Inventory Warnings</p>
                {data.inventory.low_stock_items.map((item: any) => (
                  <div key={item.id} className="flex items-center justify-between text-sm py-1">
                    <span className={item.is_critical ? 'text-red-400 font-medium' : 'text-yellow-400'}>
                      {item.name}
                    </span>
                    <span className="text-gray-400">{item.quantity} {item.unit}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}